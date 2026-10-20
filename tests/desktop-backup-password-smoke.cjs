// TASK-SECURITY-03: backup password in the real app — password rules on the sheet, the
// sealed file on disk, restore asking for the password (a wrong one changes nothing and may
// be retried), cancel, plain backups still restoring, and (development Electron only) the
// startup recovery flow opening a password backup in its own window.
// Build first: npm run build && node tests/desktop-backup-password-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { goTo } = require("./nav.cjs");

const root = path.resolve(__dirname, "..");
const shots = process.env.PARK_BACKUP_SHOTS;
const packaged = Boolean(process.env.PARK_TEST_EXECUTABLE);
const SECRET = "가상 백업 메모 오대산";
const PASSWORD = "가상 이동 백업 암호 2026!";

function launch(dir, profile, { stub = false, env = {} } = {}) {
  return electron.launch({
    executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
    args: [
      ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
      "--user-data-dir=" + profile,
      ...(stub ? ["-r", path.join(__dirname, "recovery-dialog-stub.cjs")] : []),
      ...(packaged ? [] : [root]),
    ],
    env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config"), ...env },
    timeout: 30000,
  });
}
const listing = (profile) => fs.readdirSync(profile).filter((n) => n.startsWith("workdesk")).sort();
const titles = (page) => page.evaluate(async () => (await window.workdesk.load()).notes.map((n) => n.title));
async function manage(page, name) {
  await page.locator(".data-menu > summary").click();
  await page.locator(".data-menu").getByRole("button", { name, exact: true }).click();
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-backup-password-"));
  const profile = path.join(dir, "profile");
  fs.mkdirSync(profile, { recursive: true });
  const file = path.join(profile, "workdesk.json");
  const backup = path.join(dir, "이동 백업.json");
  const data = store.empty();
  data.notes.push({ id: "n1", title: SECRET, body: "가상 자료" });
  store.write(file, data, { keepLastGood: true });
  let app;
  try {
    app = await launch(dir, profile);
    let page = await app.firstWindow();
    page.setDefaultTimeout(10000);
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await app.evaluate(({ dialog }, target) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
    }, backup);

    // 1. Rules on the sheet: too short, repeated, mismatch — nothing is written.
    await manage(page, "백업");
    let sheet = page.getByRole("dialog", { name: "암호로 백업" });
    await sheet.waitFor();
    const first = sheet.getByLabel("백업 암호", { exact: true });
    const second = sheet.getByLabel("백업 암호 다시 입력", { exact: true });
    const save = sheet.getByRole("button", { name: "암호로 백업 저장", exact: true });
    for (const weak of ["짧은암호", "aaaaaaaaaaaa"]) {
      await first.fill(weak);
      await second.fill(weak);
      assert.equal(await save.isDisabled(), true, weak);
    }
    await first.fill(PASSWORD);
    await second.fill(PASSWORD + "x");
    await sheet.getByText("두 번 입력한 백업 암호가 다릅니다.").waitFor();
    assert.equal(await save.isDisabled(), true);
    // The main process checks the rule again; a renderer cannot skip it.
    await assert.rejects(page.evaluate(() => window.workdesk.backup("짧은암호")), /10자 이상/);
    assert.equal(fs.existsSync(backup), false);
    await second.fill(PASSWORD);
    await sheet.getByText("강도: 보통").or(sheet.getByText("강도: 강함")).waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, "backup-password.png") });
    await save.click();
    await sheet.waitFor({ state: "hidden", timeout: 15000 });
    await page.getByText("백업을 암호로 잠가 저장했습니다.").first().waitFor();
    const sealed = fs.readFileSync(backup, "utf8");
    assert.ok(!sealed.includes(SECRET) && !sealed.includes(PASSWORD));
    assert.equal(JSON.parse(sealed).backupSealed.N, 2 ** 17);
    assert.deepEqual((await store.readBackup(backup, PASSWORD)).notes, data.notes);

    // 2. Restore: change the data, pick the password backup.
    await page.evaluate(async () => {
      const current = await window.workdesk.load();
      current.notes = [{ id: "n9", title: "가상 바뀐 메모", body: "" }];
      await window.workdesk.save(current);
    });
    await app.evaluate(({ dialog }, target) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, backup);
    const beforeRestore = { files: listing(profile), main: fs.readFileSync(file, "utf8") };
    // Cancel first: nothing changes and the picked file is forgotten.
    await manage(page, "복원");
    sheet = page.getByRole("dialog", { name: "암호 백업 복원" });
    await sheet.getByText("이동 백업.json은(는) 백업 암호로 잠겨 있습니다.", { exact: false }).waitFor();
    await sheet.getByRole("button", { name: "취소", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await assert.rejects(page.evaluate(() => window.workdesk.restorePassword("아무 암호나 넣어 봄")), /다시 선택/);
    // Wrong password: shown in the sheet, nothing written, retry allowed.
    await manage(page, "복원");
    await sheet.getByLabel("백업 암호", { exact: true }).fill("틀린 백업 암호입니다 2026");
    await sheet.getByRole("button", { name: "암호 확인 후 복원", exact: true }).click();
    await sheet.getByRole("alert").filter({ hasText: "백업 암호가 맞지 않거나" }).waitFor({ timeout: 15000 });
    if (shots) await page.screenshot({ path: path.join(shots, "restore-wrong-password.png") });
    assert.deepEqual({ files: listing(profile), main: fs.readFileSync(file, "utf8") }, beforeRestore);
    await sheet.getByLabel("백업 암호", { exact: true }).fill(PASSWORD);
    await sheet.getByRole("button", { name: "암호 확인 후 복원", exact: true }).click();
    await sheet.waitFor({ state: "hidden", timeout: 15000 });
    await page.getByText("백업 자료를 복원했습니다.").first().waitFor();
    assert.deepEqual(await titles(page), [SECRET]);
    // The restore-copy rule is unchanged: the replaced data is kept first.
    const copies = store.restoreCopies(file);
    assert.equal(copies.length, 1);
    assert.equal(store.read(copies[0].file).notes[0].title, "가상 바뀐 메모");

    // 3. A plain backup (older app) still restores without a password.
    const plain = path.join(dir, "평문 백업.json");
    const older = store.empty();
    older.notes.push({ id: "n2", title: "가상 평문 백업 메모", body: "" });
    store.write(plain, older);
    await app.evaluate(({ dialog }, target) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] });
    }, plain);
    await manage(page, "복원");
    await page.getByText("백업 자료를 복원했습니다.").first().waitFor();
    await page.waitForFunction(async () => (await window.workdesk.load()).notes[0]?.title === "가상 평문 백업 메모");
    assert.equal(await page.getByRole("dialog", { name: "암호 백업 복원" }).count(), 0);
    // A tampered password backup is refused like a wrong password; the data stays.
    const tampered = JSON.parse(sealed);
    tampered.backupSealed.tag = Buffer.alloc(16).toString("base64");
    const broken = path.join(dir, "변조 백업.json");
    fs.writeFileSync(broken, JSON.stringify(tampered));
    await app.evaluate(({ dialog }, target) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] });
    }, broken);
    const beforeTamper = fs.readFileSync(file, "utf8");
    await manage(page, "복원");
    await sheet.getByLabel("백업 암호", { exact: true }).fill(PASSWORD);
    await sheet.getByRole("button", { name: "암호 확인 후 복원", exact: true }).click();
    await sheet.getByRole("alert").filter({ hasText: "손상되었습니다" }).waitFor({ timeout: 15000 });
    assert.equal(fs.readFileSync(file, "utf8"), beforeTamper);
    await sheet.getByRole("button", { name: "취소", exact: true }).click();
    await app.close();
    app = null;

    if (!packaged) {
      // 4. Startup recovery (damaged file, no last-good): the picked password backup opens
      //    in its own window; 취소 returns to the choices, the right password restores.
      const recoverProfile = path.join(dir, "recover");
      fs.mkdirSync(recoverProfile);
      const damaged = path.join(recoverProfile, "workdesk.json");
      fs.writeFileSync(damaged, '{"version":3,"notes":[');
      const log = path.join(dir, "dialog.log");
      app = await launch(dir, recoverProfile, {
        stub: true,
        env: {
          PARK_TEST_RECOVERY_ANSWERS: JSON.stringify(["백업 파일에서 복원", "백업 파일에서 복원"]),
          PARK_TEST_RECOVERY_ANSWER: "종료",
          PARK_TEST_RECOVERY_PICK: backup,
          PARK_TEST_RECOVERY_LOG: log,
        },
      });
      let secret = await app.firstWindow();
      secret.setDefaultTimeout(15000);
      await secret.getByRole("heading", { name: "암호 백업 열기" }).waitFor();
      await secret.getByText("이동 백업.json은(는) 백업 암호로 잠겨 있습니다.", { exact: false }).waitFor();
      if (shots) await secret.screenshot({ path: path.join(shots, "recovery-backup-password.png") });
      await secret.getByLabel("백업 암호", { exact: true }).fill("틀린 백업 암호입니다 2026");
      await secret.getByRole("button", { name: "열기", exact: true }).click();
      await secret.getByRole("alert").filter({ hasText: "백업 암호가 맞지 않거나" }).waitFor();
      assert.equal(fs.readFileSync(damaged, "utf8"), '{"version":3,"notes":[');
      const again = app.waitForEvent("window");
      await secret.getByRole("button", { name: "취소", exact: true }).click();
      secret = await again;
      secret.setDefaultTimeout(15000);
      await secret.getByRole("heading", { name: "암호 백업 열기" }).waitFor();
      const shown = fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
      assert.equal(shown.length, 2);
      assert.match(shown[1].detail, /백업 암호를 입력하지 않아 복원하지 않았습니다/);
      const mainWindow = app.waitForEvent("window");
      await secret.getByLabel("백업 암호", { exact: true }).fill(PASSWORD);
      await secret.getByRole("button", { name: "열기", exact: true }).click();
      page = await mainWindow;
      page.setDefaultTimeout(15000);
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      assert.deepEqual(await titles(page), [SECRET]);
      assert.equal(fs.readdirSync(recoverProfile).filter((n) => n.includes(".corrupt-")).length, 1, "손상 파일 보관");
      await goTo(page, "업무 메모");
      await page.getByRole("heading", { name: SECRET }).waitFor();
      await app.close();
      app = null;
    }
    console.log(
      "PASS: 백업 암호 — 규칙(짧음·반복·불일치·main 재확인), 봉한 백업(scrypt N=2^17, 평문·암호 없음), 복원 암호 입력(취소·틀린 암호 무변경·재시도·맞는 암호·복원 보호본 유지), 평문 백업 복원, 변조 백업 거부" +
        (packaged ? "" : ", 시작 복구 흐름의 암호 백업 창(틀린 암호·취소 후 다시 선택·복원)"),
    );
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
