// 실제 Electron에서 접힌 오류 칸과 지연/실패 저장의 초안 보존을 검증한다.
const { _electron: electron } = require("playwright");
const { goTo, menuButton } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
// Button wording comes from the app (TASK-LABELS-01 U6).
const L = require("../shared/labels.mjs");
const root = path.resolve(__dirname, "..");

async function withApp(check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-editor-smoke-"));
  let app;
  let failed = false;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + path.join(dir, "profile"),
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await check(app, page);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (app) {
      // 실패한 검사에서 미저장 확인창을 기다리며 멈추지 않도록 테스트만 종료한다.
      if (failed) await app.evaluate(({ app }) => app.exit(1)).catch(() => {});
      else await app.close();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function collapsedError(observation) {
  await withApp(async (app, page) => {
    await goTo(page, "현장 순찰");
    await page.getByRole("button", { name: L.addLabel(L.TARGET.patrol), exact: true }).click();
    await page.getByLabel("순찰 구간", { exact: true }).fill("가상 탐방로");
    await page.getByLabel("기록자", { exact: true }).fill("가상 직원");
    if (observation) {
      await page.getByRole("button", { name: "+ 단속·확인 건 추가", exact: true }).click();
      await page.locator(".observation-type input").fill("가상 단속 유형");
    }
    const details = page.locator(observation ? ".observation-location" : ".coordinate-details");
    const summary = details.locator(":scope > summary");
    await summary.click();
    await details.getByLabel("위도 (DD)", { exact: true }).fill("91");
    await details.getByLabel("경도 (DD)", { exact: true }).fill("127");
    await summary.click();
    assert.equal(await details.evaluate((el) => el.open), false);
    await page.getByRole("button", { name: L.SAVE, exact: true }).click();
    await page.locator(".editor-dialog .notice.error").waitFor();
    const latitude = details.getByLabel("위도 (DD)", { exact: true });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
    assert.equal(await details.evaluate((el) => el.open), true, "접힌 오류 영역을 펼친다");
    assert.equal(await latitude.evaluate((el) => document.activeElement === el), true, "첫 오류 입력으로 이동");
    const described = await latitude.getAttribute("aria-describedby");
    assert.ok(described && await page.locator(`[id="${described}"]`).isVisible(), "오류 설명이 보이며 입력과 연결됨");
    assert.equal((await page.evaluate(() => window.workdesk.load())).patrols.length, 0, "잘못된 자료는 저장하지 않음");
    assert.equal(await page.getByLabel("순찰 구간", { exact: true }).inputValue(), "가상 탐방로", "다른 초안 보존");
    await details.getByRole("button", { name: "좌표 지우기", exact: true }).click();
    await page.getByRole("button", { name: L.SAVE, exact: true }).click();
    await page.locator(".editor-dialog").waitFor({ state: "hidden" });
    const saved = (await page.evaluate(() => window.workdesk.load())).patrols;
    assert.equal(saved.length, 1, "오류 정정 후 저장 가능");
    if (observation) assert.equal(saved[0].observations[0].type, "가상 단속 유형");
  });
}

async function pendingImport() {
  await withApp(async (app, page) => {
    await goTo(page, "사무소 현황");
    const importTab = page.getByRole("tab", { name: "파일 반입", exact: true });
    const boardTab = page.getByRole("tab", { name: "근무현황", exact: true });
    await importTab.click();
    const csv = "code,name,parentCode\nTEST,가상 조직,";
    await page.getByLabel("반입 CSV", { exact: true }).fill(csv);
    await page.getByRole("button", { name: "반입 미리보기", exact: true }).click();
    await app.evaluate(({ ipcMain }) => {
      globalThis.__editorOriginalSave = ipcMain._invokeHandlers.get("save");
      globalThis.__editorSaveCalls = 0;
      ipcMain.removeHandler("save");
      ipcMain.handle("save", async () => {
        globalThis.__editorSaveCalls++;
        await new Promise((resolve) => { globalThis.__editorRelease = resolve; });
        throw new Error("가상 반입 저장 실패");
      });
    });
    await page.getByRole("button", { name: "확인 후 반입 적용", exact: true }).click();
    await page.locator('.save-indicator[data-state="busy"]').waitFor();
    // aria-disabled는 조작을 자동으로 막지 않으므로 실제 DOM 클릭으로 가드를 확인한다.
    await boardTab.evaluate((el) => el.click());
    assert.equal(await importTab.getAttribute("aria-selected"), "true", "저장 중 클릭으로 탭 전환하지 않음");
    await importTab.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await importTab.getAttribute("aria-selected"), "true", "저장 중 방향키로 탭 전환하지 않음");
    assert.equal(await importTab.evaluate((el) => document.activeElement === el), true);
    assert.equal(await importTab.evaluate((el) => el.disabled), false, "native disabled 없이 포커스 유지");
    assert.equal(await importTab.getAttribute("aria-disabled"), "true");
    await menuButton(page, "월간 일정").evaluate((el) => el.click());
    assert.equal(await page.getByRole("heading", { name: "사무소 현황", exact: true }).count(), 1, "상위 메뉴도 대기 중 이동 금지");
    assert.equal(await app.evaluate(() => globalThis.__editorSaveCalls), 1);
    await app.evaluate(() => globalThis.__editorRelease());
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await page.getByRole("alert").filter({ hasText: "가상 반입 저장 실패" }).waitFor();
    assert.equal(await page.getByLabel("반입 CSV", { exact: true }).inputValue(), csv, "실패 후 CSV 입력 보존");
    assert.equal(await page.getByRole("button", { name: "확인 후 반입 적용", exact: true }).count(), 1, "미리보기 보존");
    assert.equal((await page.evaluate(() => window.workdesk.load())).organizations.length, 0, "실패한 자료 미저장");
    assert.equal(await importTab.evaluate((el) => document.activeElement === el), true, "실패 후에도 탭 포커스 유지");
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("save");
      ipcMain.handle("save", globalThis.__editorOriginalSave);
    });
    await page.getByRole("button", { name: "확인 후 반입 적용", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "조직 1건을 확인하고 반입했습니다" }).waitFor();
    assert.equal((await page.evaluate(() => window.workdesk.load())).organizations[0].code, "TEST");
    await importTab.focus();
    await page.keyboard.press("Home");
    assert.equal(await boardTab.getAttribute("aria-selected"), "true", "저장 후 정상 탭 이동");
  });
}

(async () => {
  const checks = [
    ["접힌 순찰 좌표 오류 펼침·포커스·정정 저장", () => collapsedError(false)],
    ["접힌 단속 건 좌표 오류 펼침·포커스·정정 저장", () => collapsedError(true)],
    ["CSV 지연 저장 중 탭/메뉴 가드·포커스·실패 후 초안/미리보기 보존·재시도", pendingImport],
  ];
  let failures = 0;
  for (const [name, check] of checks) {
    try { await check(); console.log("PASS: " + name); }
    catch (error) { failures++; console.error("FAIL: " + name, error); }
  }
  if (failures) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
