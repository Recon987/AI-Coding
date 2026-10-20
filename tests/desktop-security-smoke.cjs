// TASK-SECURITY-02: storage encryption in the real app — turning it on with the recovery key
// typed back, sealed files on disk, automatic reopening, the recovery-key window on another
// "PC" or with the key file gone, a wrong key and quitting leave every file unchanged.
// Unpackaged runs use the test protector (PARK_TEST_PROTECTOR); a packaged app
// (PARK_TEST_EXECUTABLE, Windows Actions) ignores it and uses real safeStorage/DPAPI.
// Build first: npm run build && node tests/desktop-security-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");

const root = path.resolve(__dirname, "..");
const shots = process.env.PARK_SECURITY_SHOTS;
const packaged = Boolean(process.env.PARK_TEST_EXECUTABLE);
const SECRET = "가상 비밀 메모 설악";

function launch(dir, profile, protector) {
  return electron.launch({
    executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
    args: [
      ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
      "--user-data-dir=" + profile,
      ...(packaged ? [] : [root]),
    ],
    env: {
      ...process.env,
      TZ: "Asia/Seoul",
      XDG_CONFIG_HOME: path.join(dir, "config"),
      ...(protector ? { PARK_TEST_PROTECTOR: protector } : {}),
    },
    timeout: 30000,
  });
}
const files = (profile) =>
  Object.fromEntries(
    fs.readdirSync(profile)
      .filter((n) => n.startsWith("workdesk"))
      .map((n) => [n, fs.readFileSync(path.join(profile, n), "utf8")]),
  );
async function ready(page) {
  page.setDefaultTimeout(10000);
  await page.locator('.save-indicator[data-state="ready"]').waitFor();
}
async function openSheet(page) {
  await page.locator(".data-menu > summary").click();
  await page.getByRole("button", { name: "저장 암호화", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "저장 암호화" });
  await sheet.waitFor();
  return sheet;
}
// The unlock window is the first window; after the right key the main window opens.
async function unlockWindow(app) {
  const page = await app.firstWindow();
  page.setDefaultTimeout(10000);
  await page.getByRole("heading", { name: "암호화된 업무 자료 열기" }).waitFor();
  return page;
}
const loadTitles = (page) => page.evaluate(async () => (await window.workdesk.load()).notes.map((n) => n.title));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-security-smoke-"));
  const profile = path.join(dir, "profile");
  fs.mkdirSync(profile, { recursive: true });
  const file = path.join(profile, "workdesk.json");
  const keyFile = path.join(profile, "workdesk.key.json");
  const data = store.empty();
  data.notes.push({ id: "n1", title: SECRET, body: "가상 자료" });
  store.write(file, data, { keepLastGood: true });
  const pcA = packaged ? null : "fake:PC-A";
  let app;
  try {
    // 1. Off by default; the recovery key must be typed back before anything changes.
    app = await launch(dir, profile, pcA);
    let page = await app.firstWindow();
    await ready(page);
    let sheet = await openSheet(page);
    await sheet.getByRole("status").filter({ hasText: "꺼짐" }).waitFor();
    await sheet.getByRole("button", { name: "복구 키 만들기", exact: true }).click();
    const recoveryKey = (await sheet.getByLabel("복구 키", { exact: true }).textContent()).trim();
    assert.match(recoveryKey, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){5}$/);
    for (const warning of ["한 번만 보여 줍니다", "공용 프린터", "동기화(OneDrive 등)", "공용 PC"])
      await sheet.getByText(warning, { exact: false }).first().waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, "security-recovery-key.png") });
    const before = files(profile);
    const input = sheet.getByLabel("복구 키 다시 입력", { exact: true });
    await input.fill("0000-0000-0000-0000-0000-0000");
    await sheet.getByRole("button", { name: "확인하고 암호화 켜기", exact: true }).click();
    await sheet.getByRole("alert").filter({ hasText: "보여 준 키와 다릅니다" }).waitFor();
    assert.deepEqual(files(profile), before, "틀리게 다시 입력하면 아무것도 바뀌지 않음");
    await input.fill(recoveryKey.toLowerCase().replace(/-/g, " "));
    await sheet.getByRole("button", { name: "확인하고 암호화 켜기", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "켜짐" }).waitFor();
    await sheet.getByText("저장 암호화를 켰습니다.", { exact: false }).waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, "security-on.png") });
    const sealed = files(profile);
    for (const name of ["workdesk.json", "workdesk.json.last-good"]) {
      assert.ok(!sealed[name].includes(SECRET), `${name}: 평문 없음`);
      assert.equal(JSON.parse(sealed[name]).minReader, 3);
    }
    assert.ok(sealed["workdesk.key.json"] && !sealed["workdesk.key.json"].includes(recoveryKey.replace(/-/g, "")));
    assert.deepEqual(Object.keys(sealed).filter((n) => n.endsWith(".tmp")), []);
    await page.keyboard.press("Escape");
    // A save from the screen stays sealed.
    await page.evaluate(async () => {
      const current = await window.workdesk.load();
      current.notes.push({ id: "n2", title: "가상 둘째 메모", body: "" });
      await window.workdesk.save(current);
    });
    assert.ok(!fs.readFileSync(file, "utf8").includes("가상 둘째 메모"));
    await app.close();

    // 2. Same PC: opens by itself.
    app = await launch(dir, profile, pcA);
    page = await app.firstWindow();
    await ready(page);
    assert.deepEqual(await loadTitles(page), [SECRET, "가상 둘째 메모"]);
    sheet = await openSheet(page);
    await sheet.getByRole("status").filter({ hasText: "켜짐" }).waitFor();
    await app.close();

    // 3. Key file gone: the recovery-key window; a wrong key and 종료 change nothing.
    const keyBytes = fs.readFileSync(keyFile);
    fs.rmSync(keyFile);
    const locked = files(profile);
    app = await launch(dir, profile, pcA);
    let unlock = await unlockWindow(app);
    await unlock.getByText("암호화 키 파일(workdesk.key.json)이 없습니다").waitFor();
    if (shots) await unlock.screenshot({ path: path.join(shots, "security-unlock.png") });
    await unlock.getByLabel("복구 키", { exact: true }).fill("ABCD-ABCD-ABCD-ABCD-ABCD-ABCD");
    await unlock.getByRole("button", { name: "열기", exact: true }).click();
    await unlock.getByRole("alert").filter({ hasText: "복구 키가 맞지 않습니다" }).waitFor();
    assert.deepEqual(files(profile), locked);
    const exited = new Promise((resolve) => app.process().once("exit", resolve));
    await unlock.getByRole("button", { name: "종료", exact: true }).click();
    await exited;
    app = null;
    assert.deepEqual(files(profile), locked, "종료해도 파일 무변경");

    // ...and the right key opens it and writes a new key file for this PC.
    app = await launch(dir, profile, pcA);
    unlock = await unlockWindow(app);
    const mainWindow = app.waitForEvent("window");
    await unlock.getByLabel("복구 키", { exact: true }).fill(recoveryKey);
    await unlock.getByRole("button", { name: "열기", exact: true }).click();
    page = await mainWindow;
    await ready(page);
    assert.deepEqual(await loadTitles(page), [SECRET, "가상 둘째 메모"]);
    assert.ok(fs.existsSync(keyFile));
    assert.notDeepEqual(fs.readFileSync(keyFile), keyBytes, "새로 감싼 키 파일");
    await app.close();
    app = await launch(dir, profile, pcA);
    page = await app.firstWindow();
    await ready(page);
    await app.close();

    if (!packaged) {
      // 4. Another Windows account/PC (another protector): recovery key, then it opens there by itself.
      app = await launch(dir, profile, "fake:PC-B");
      unlock = await unlockWindow(app);
      await unlock.getByText("복구 키를 입력하세요").first().waitFor();
      const next = app.waitForEvent("window");
      await unlock.getByLabel("복구 키", { exact: true }).fill(recoveryKey);
      await unlock.getByRole("button", { name: "열기", exact: true }).click();
      page = await next;
      await ready(page);
      assert.deepEqual(await loadTitles(page), [SECRET, "가상 둘째 메모"]);
      await app.close();
      app = await launch(dir, profile, "fake:PC-B");
      page = await app.firstWindow();
      await ready(page);
      await app.close();

      // 5. No protector on this PC: not offered, plaintext as before, reason shown.
      const plainProfile = path.join(dir, "plain");
      fs.mkdirSync(plainProfile);
      store.write(path.join(plainProfile, "workdesk.json"), data, { keepLastGood: true });
      app = await launch(dir, plainProfile, "unavailable");
      page = await app.firstWindow();
      await ready(page);
      sheet = await openSheet(page);
      await sheet.getByRole("status").filter({ hasText: "사용할 수 없음 — 시험용: 보호기 없음" }).waitFor();
      assert.equal(await sheet.getByRole("button", { name: "복구 키 만들기" }).count(), 0);
      await app.close();
      app = null;
      assert.ok(fs.readFileSync(path.join(plainProfile, "workdesk.json"), "utf8").includes(SECRET));
    }
    console.log(
      `PASS: 저장 암호화(${packaged ? "safeStorage 실제" : "시험용 보호기"}) — 복구 키 다시 입력 후 켜기·틀린 입력 무변경, 주 파일·last-good 봉투(minReader 3)·화면 저장 봉함, 같은 PC 자동 열기, 키 파일 없음 → 복구 키 창(틀린 키·종료 무변경, 맞는 키로 열고 키 파일 재작성)` +
        (packaged ? "" : ", 다른 PC 보호기 → 복구 키 후 자동, 보호기 없음 → 켜지 않고 이유 표시"),
    );
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
