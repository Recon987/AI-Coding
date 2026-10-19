// Regression for TASK-CONFIRM-01: closing a dirty editor with 취소 or Esc while a
// native window.confirm was shown crashed Electron. Every choice is now clicked by hand
// in the in-app dialog; no native JS dialog may appear and the app must stay alive.
// Build first: npm run build && node tests/desktop-confirm-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-confirm-smoke-"));
  let app;
  let exited = null;
  let closing = false;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + path.join(dir, "profile"),
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, XDG_CONFIG_HOME: path.join(dir, "config") },
      timeout: 30000,
    });
    app.process().on("exit", (code, signal) => {
      if (!closing) exited = signal || code;
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    let nativeDialogs = 0;
    page.on("dialog", (dialog) => {
      nativeDialogs++;
      dialog.dismiss().catch(() => {});
    });
    await page.locator("main h1").waitFor();
    const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true });
    const sheet = page.locator(".sheet[open]");
    const confirmBox = page.getByRole("alertdialog");
    const openDraft = async () => {
      await nav("제출 기한").click();
      await page.getByRole("button", { name: "제출 기한 추가", exact: true }).click();
      await page.getByLabel("업무 제목").fill("작성 중 초안");
    };
    // TASK-EDITOR-01: editors have no separate "닫기 ×"; 취소 and Esc close them.
    await openDraft();
    assert.equal(await sheet.getByRole("button", { name: /닫기/ }).count(), 0);
    assert.equal(await sheet.locator(".editor-header-actions .primary").getAttribute("aria-keyshortcuts"), "Control+Enter");
    const headerBox = await sheet.locator(".sheet-header").boundingBox();
    const actionsBox = await sheet.locator(".editor-header-actions").boundingBox();
    assert.ok(Math.abs(actionsBox.y - headerBox.y) < 2 && actionsBox.height <= headerBox.height + 1, "저장·취소가 머리 줄에 있음");
    await page.keyboard.press("Escape");
    await confirmBox.getByRole("button", { name: "변경 버리기", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    const closers = {
      Esc: () => page.keyboard.press("Escape"),
      취소: () => sheet.getByRole("button", { name: "취소", exact: true }).click(),
    };
    for (const [name, close] of Object.entries(closers)) {
      await openDraft();
      await close();
      await confirmBox.waitFor();
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "계속 작성",
        `${name}: 안전한 선택이 기본 포커스`,
      );
      await confirmBox.getByRole("button", { name: "계속 작성", exact: true }).click();
      assert.equal(await page.getByLabel("업무 제목").inputValue(), "작성 중 초안", `${name}: 초안 유지`);
      await close();
      await confirmBox.getByRole("button", { name: "변경 버리기", exact: true }).click();
      await sheet.waitFor({ state: "hidden" });
    }
    // Esc inside the confirmation closes only the confirmation.
    await openDraft();
    await closers.취소();
    await confirmBox.waitFor();
    await page.keyboard.press("Escape");
    await confirmBox.waitFor({ state: "hidden" });
    assert.equal(await page.getByLabel("업무 제목").inputValue(), "작성 중 초안");
    await closers.취소();
    await confirmBox.getByRole("button", { name: "변경 버리기", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await nav("업무 메모").click();
    await page.getByRole("heading", { name: "업무 메모", exact: true }).waitFor();
    // Ctrl+Enter saves from inside a textarea too.
    await page.getByRole("button", { name: "메모 추가" }).click();
    await page.getByLabel("제목", { exact: true }).fill("단축키 저장 메모");
    await page.getByLabel("내용", { exact: true }).fill("Ctrl+Enter");
    await page.keyboard.press("Control+Enter");
    await sheet.waitFor({ state: "hidden" });
    assert.ok((await page.evaluate(() => window.workdesk.load())).notes.some((n) => n.title === "단축키 저장 메모"));
    // Delete: cancel keeps the record, confirm removes it.
    await page.getByRole("button", { name: "메모 추가" }).click();
    await page.getByLabel("제목", { exact: true }).fill("삭제 확인 메모");
    await page.getByLabel("내용", { exact: true }).fill("가상 자료");
    await sheet.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("heading", { name: "삭제 확인 메모" }).waitFor();
    await page.getByRole("button", { name: "삭제 · 삭제 확인 메모", exact: true }).click();
    await confirmBox.getByRole("button", { name: "취소", exact: true }).click();
    assert.equal((await page.evaluate(() => window.workdesk.load())).notes.filter((n) => n.title === "삭제 확인 메모").length, 1);
    await page.getByRole("button", { name: "삭제 · 삭제 확인 메모", exact: true }).click();
    await confirmBox.getByRole("button", { name: "삭제", exact: true }).click();
    await page.getByRole("heading", { name: "삭제 확인 메모" }).waitFor({ state: "detached" });
    assert.equal((await page.evaluate(() => window.workdesk.load())).notes.filter((n) => n.title === "삭제 확인 메모").length, 0);
    assert.equal(nativeDialogs, 0, "브라우저 확인창이 나타나면 안 됨");
    assert.equal(exited, null, "앱이 종료되면 안 됨");
    console.log("PASS: 머리 한 줄(저장·취소)·Ctrl+Enter 저장·Esc·취소·삭제 확인창(계속 작성/버리기/취소/삭제), 기본 포커스, 브라우저 확인창 0, 비정상 종료 0");
  } finally {
    closing = true;
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
