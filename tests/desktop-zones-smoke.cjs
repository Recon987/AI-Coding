// TASK-LOCATION-01: 담당구역 목록 in the real app — CSV paste with a bad row rejected whole,
// preview then apply, update by code, delete with confirm (patrols keep their zone), and the
// patrol editor's zone/route suggestions (route filled from the zone, free text still allowed).
// Build first: npm run build && node tests/desktop-zones-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const L = require("../shared/labels.mjs");

const root = path.resolve(__dirname, "..");
const shots = process.env.PARK_ZONES_SHOTS;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-zones-smoke-"));
  const profile = path.join(dir, "profile");
  fs.mkdirSync(profile, { recursive: true });
  const file = path.join(profile, "workdesk.json");
  const data = store.empty();
  data.patrols.push({
    id: "p0", title: "가상 지난 순찰", at: "2026-10-19T09:00:00", route: "가상 최근 구간", observer: "가상 직원",
    findings: "", action: "", risk: "normal", zone: "3-1",
  });
  store.write(file, data);
  const saved = () => JSON.parse(fs.readFileSync(file, "utf8"));
  let app;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + profile,
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const open = async () => {
      await page.locator(".data-menu > summary").click();
      await page.getByRole("button", { name: "담당구역 목록", exact: true }).click();
      const sheet = page.getByRole("dialog", { name: "담당구역 목록" });
      await sheet.waitFor();
      return sheet;
    };
    let sheet = await open();
    const csv = sheet.getByLabel("반입 CSV", { exact: true });

    // 1. A bad row rejects the whole file with its line number; nothing is written.
    const before = fs.readFileSync(file, "utf8");
    await csv.fill("code,name,route,active\n3-1,가상 계곡 구역,계곡안내소 → 쉼터,true\n3-2,가상 능선 구역,,아니오");
    await sheet.getByRole("button", { name: "반입 미리보기", exact: true }).click();
    await sheet.getByRole("alert").filter({ hasText: "3행: active는 true, false 또는 빈칸으로 입력하세요." }).waitFor();
    assert.equal(fs.readFileSync(file, "utf8"), before);

    // 2. Preview, then apply.
    await csv.fill("code,name,route,active\n3-1,가상 계곡 구역,계곡안내소 → 쉼터,true\n3-2,가상 능선 구역,,\n3-9,가상 폐쇄 구역,,false");
    await sheet.getByRole("button", { name: "반입 미리보기", exact: true }).click();
    const preview = sheet.getByRole("region", { name: "반입 미리보기" });
    await preview.getByText("추가 3 · 수정 0 · 유지 0건").waitFor();
    assert.equal(fs.readFileSync(file, "utf8"), before, "미리보기만으로는 쓰지 않음");
    if (shots) await page.screenshot({ path: path.join(shots, "zones-preview.png") });
    await preview.getByRole("button", { name: "확인 후 반입 적용", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "담당구역 3건을 확인하고 반입했습니다(추가 3 · 수정 0 · 유지 0)." }).waitFor();
    assert.deepEqual(saved().zones.map((z) => [z.code, z.route, z.active]), [
      ["3-1", "계곡안내소 → 쉼터", true],
      ["3-2", "", true],
      ["3-9", "", false],
    ]);
    // Same code updates in place (id kept).
    const firstId = saved().zones[0].id;
    await csv.fill("code,name,route,active\n3-1,가상 계곡 구역,계곡안내소 → 폭포,true");
    await sheet.getByRole("button", { name: "반입 미리보기", exact: true }).click();
    await preview.getByText("추가 0 · 수정 1 · 유지 0건").waitFor();
    await preview.getByRole("button", { name: "확인 후 반입 적용", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "수정 1" }).waitFor();
    assert.deepEqual([saved().zones[0].id, saved().zones[0].route, saved().zones.length], [firstId, "계곡안내소 → 폭포", 3]);
    assert.equal(await sheet.locator(".zone-table tbody tr").count(), 3);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "hidden" });

    // 3. Patrol editor: listed zones suggested (active only), route filled from the zone, recent routes offered.
    await goTo(page, "현장 순찰");
    await page.getByRole("button", { name: L.addLabel(L.TARGET.patrol), exact: true }).click();
    const editor = page.locator(".sheet[open]");
    const zoneInput = editor.getByLabel("담당구역 번호", { exact: true });
    const routeInput = editor.getByLabel("순찰 구간", { exact: true });
    const options = (input) =>
      input.evaluate((el) => [...(el.list?.options ?? [])].map((o) => [o.value, o.textContent]));
    assert.deepEqual(await options(zoneInput), [["3-1", "가상 계곡 구역"], ["3-2", "가상 능선 구역"]], "사용 안 함 구역은 제안하지 않음");
    // The new draft copies the last patrol's zone (3-1); clear both and choose again.
    await routeInput.fill("");
    await zoneInput.fill("");
    await zoneInput.fill("3-1");
    assert.equal(await routeInput.inputValue(), "계곡안내소 → 폭포");
    await editor.getByText("담당구역 3-1의 대표 구간을 채웠습니다. 다르면 고치세요.").waitFor();
    await editor.locator(".field-hint", { hasText: /^가상 계곡 구역$/ }).waitFor();
    assert.deepEqual((await options(routeInput)).map(([v]) => v), ["계곡안내소 → 폭포", "가상 최근 구간"]);
    if (shots) await page.screenshot({ path: path.join(shots, "zones-patrol.png") });
    // A route already typed is never overwritten; an unknown number is allowed with a note.
    await routeInput.fill("직접 쓴 구간");
    await zoneInput.fill("7-7");
    assert.equal(await routeInput.inputValue(), "직접 쓴 구간");
    await editor.getByText("목록에 없는 번호입니다. 그대로 저장할 수 있습니다.").waitFor();
    // Title left empty: the app makes one from the zone and time.
    await editor.getByRole("button", { name: L.SAVE, exact: true }).click();
    await editor.waitFor({ state: "hidden" });
    const added = saved().patrols.find((p) => p.id !== "p0");
    assert.deepEqual([added.zone, added.route], ["7-7", "직접 쓴 구간"]);

    // 4. Deleting a zone asks first and leaves patrols untouched.
    sheet = await open();
    await sheet.getByRole("button", { name: "삭제 · 담당구역 3-1", exact: true }).click();
    await page.getByRole("alertdialog").getByText("이 번호로 적은 순찰 기록은 그대로 남습니다.").waitFor();
    await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "담당구역 3-1을(를) 지웠습니다." }).waitFor();
    assert.deepEqual(saved().zones.map((z) => z.code), ["3-2", "3-9"]);
    assert.equal(saved().patrols.find((p) => p.id === "p0").zone, "3-1");
    console.log("PASS: 담당구역 CSV 반입(틀린 행 전체 거부·미리보기 무저장·적용·같은 번호 갱신), 순찰 입력 제안(사용 중 구역·대표 구간 채움·최근 구간·입력한 구간 보존·목록 밖 번호 허용), 삭제 확인·순찰 기록 보존");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
