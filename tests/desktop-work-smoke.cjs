// B1: 실제 앱에서 등록·1:N 출처·상태 독립·기한·재실행·복원·실패 보호를 확인한다.
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { calendarItems, reminderItems, READER_VERSION } = require("../shared/model.mjs");
const { newWork } = require("../shared/work.mjs");
const root = path.resolve(__dirname, "..");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-work-b1-"));
  const profile = path.join(dir, "profile");
  const file = path.join(profile, "workdesk.json");
  const data = store.empty();
  data.notes.push({ id: "n1", title: "가상 검토 메모", body: "삭제 뒤에도 보존할 후속 본문" });
  data.calls.push({ id: "c1", title: "가상 회신 전화", body: "회신할 내용", phone: "000", done: false });
  data.tasks.push({ id: "t1", title: "가상 인수인계", body: "기존 기록", kind: "handover", at: "2026-10-20T09:00:00+09:00", assignee: "", destination: "", priority: "normal", remindMinutes: 60, patrolId: null, done: false, completedAt: null });
  data.tasks.push({ ...data.tasks[0], id: "t2", title: "가상 제출", kind: "submission" });
  store.write(file, data);
  const saved = () => store.read(file);
  let app;
  const launch = async (selectedProfile = profile) => {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []), "--user-data-dir=" + selectedProfile, ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root])],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.clock.install({ time: new Date("2026-10-20T03:00:00Z") });
    return page;
  };
  try {
    let page = await launch();
    const errors = [], requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const row = (title) => page.locator(".list-row").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    const dialog = () => page.getByRole("dialog", { name: /작업 (등록|수정)/ });
    const save = async () => { await dialog().getByRole("button", { name: "저장", exact: true }).click(); await dialog().waitFor({ state: "hidden" }); };

    // 사업·기한 없는 일반 작업. 기존 인수인계·제출과 같은 오늘 목록에 표시된다.
    await page.getByLabel("새 작업 제목", { exact: true }).fill("가상 독립 작업");
    await page.getByRole("form", { name: "작업 빠른 등록" }).getByRole("button", { name: "작업 등록", exact: true }).click();
    await page.locator(".work-line strong", { hasText: "가상 독립 작업" }).waitFor();
    assert.equal(saved().workItems[0].due, null);
    assert.equal(calendarItems(saved()).filter((i) => i.page === "work").length, 0);
    assert.equal(await page.locator(".work-line").count(), 3);
    await page.getByRole("button", { name: "완료 · 가상 독립 작업", exact: true }).click();
    await page.locator(".work-line strong", { hasText: "가상 독립 작업" }).waitFor({ state: "hidden" });

    // 하나의 전화에서 기한 없음 + 날짜만 기한 2건. 새 작업은 기한을 채우지 않는다.
    for (const [title, date] of [["가상 전화 후속 무기한", null], ["가상 전화 후속 오늘", "2026-10-20"]]) {
      await goTo(page, "전화메모");
      await row("가상 회신 전화").getByRole("button", { name: /^\+ 후속 작업 ·/ }).click();
      assert.equal(await dialog().getByLabel("기한 방식", { exact: true }).inputValue(), "none");
      await dialog().getByLabel("작업 제목", { exact: true }).fill(title);
      if (date) { await dialog().getByLabel("기한 방식").selectOption("date"); await dialog().getByLabel("마감 날짜").fill(date); }
      await save();
    }
    await row("가상 전화 후속 무기한").getByRole("button", { name: /^완료 ·/ }).click();
    assert.equal(saved().calls[0].done, false);
    await goTo(page, "전화메모");
    await row("가상 회신 전화").locator("summary .source").getByText("후속 작업 완료 1 / 전체 2", { exact: true }).waitFor();
    await row("가상 회신 전화").getByText("미처리", { exact: true }).waitFor();

    // 원본 상세 → 후속 → 원본 양방향 이동.
    await row("가상 회신 전화").locator("summary").click();
    await row("가상 회신 전화").getByRole("button", { name: /^가상 전화 후속 오늘 ·/ }).click();
    await dialog().getByRole("button", { name: "출처: 전화메모 · 가상 회신 전화", exact: true }).click();
    await page.getByRole("dialog", { name: "전화메모 수정", exact: true }).waitFor();
    await page.keyboard.press("Escape");

    // 날짜만 기한 어제·내일과 메모 출처 삭제. 본문과 링크를 보존한다.
    for (const [title, date] of [["가상 메모 후속 어제", "2026-10-19"], ["가상 메모 후속 내일", "2026-10-21"]]) {
      await goTo(page, "업무 메모");
      await row("가상 검토 메모").getByRole("button", { name: /^\+ 후속 작업 ·/ }).click();
      await dialog().getByLabel("작업 제목").fill(title);
      await dialog().getByLabel("기한 방식").selectOption("date");
      await dialog().getByLabel("마감 날짜").fill(date);
      await save();
    }
    await goTo(page, "작업");
    await row("가상 메모 후속 어제").getByText("기한 경과", { exact: true }).waitFor();
    await row("가상 전화 후속 오늘").getByText("오늘 마감", { exact: true }).waitFor();
    assert.doesNotMatch(await row("가상 전화 후속 오늘").locator(".row-when").textContent(), /00:00/);
    assert.equal(reminderItems(saved()).filter((r) => r.id.startsWith("work:")).length, 0);
    await goTo(page, "업무 메모");
    await row("가상 검토 메모").getByRole("button", { name: /^삭제 ·/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
    await row("가상 검토 메모").waitFor({ state: "hidden" });
    await goTo(page, "작업");
    await row("가상 메모 후속 어제").getByRole("button", { name: /^수정 ·/ }).click();
    await dialog().getByText("출처: 삭제된 메모", { exact: true }).waitFor();
    assert.equal(await dialog().getByLabel("작업 내용").inputValue(), "삭제 뒤에도 보존할 후속 본문");
    assert.equal(await dialog().getByRole("button", { name: /^출처:/ }).count(), 0);
    await page.keyboard.press("Escape");

    // 기존 업무 화면에서도 전체 유형 선택으로 세 유형을 함께 관리한다.
    await goTo(page, "인수인계");
    await page.getByLabel("업무 유형").selectOption("all");
    for (const title of ["가상 인수인계", "가상 제출", "가상 전화 후속 오늘"]) await row(title).waitFor();
    await row("가상 제출").getByRole("button", { name: /^수정 ·/ }).click();
    await page.getByRole("dialog", { name: "제출 기한 수정", exact: true }).waitFor();
    await page.keyboard.press("Escape");

    // 최소 회의 기록과 회의 후속 작업.
    await goTo(page, "회의 기록");
    await page.getByRole("button", { name: "회의 기록 등록", exact: true }).click();
    await page.getByLabel("회의 제목").fill("가상 주간 회의");
    await page.getByLabel("회의 내용").fill("결정 사항");
    await page.getByRole("dialog").getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await row("가상 주간 회의").getByRole("button", { name: /^\+ 후속 작업 ·/ }).click();
    await save();
    assert.equal(saved().meetings.length, 1);
    assert.equal(saved().links.filter((l) => l.from.type === "meeting").length, 1);

    // 저장 실패: 파일 불변·입력 유지·재시도. 가상 IPC 오류는 테스트에서만 주입.
    await app.evaluate(({ ipcMain }) => {
      globalThis.__b1Save = ipcMain._invokeHandlers.get("save");
      ipcMain.removeHandler("save"); ipcMain.handle("save", async () => { throw new Error("가상 저장 실패"); });
    });
    const beforeFail = fs.readFileSync(file, "utf8");
    await page.getByRole("button", { name: "작업 등록", exact: true }).click();
    await dialog().getByLabel("작업 제목").fill("가상 실패 후 재시도");
    await dialog().getByRole("button", { name: "저장", exact: true }).click();
    await dialog().getByRole("alert").waitFor();
    assert.equal(await dialog().getByLabel("작업 제목").inputValue(), "가상 실패 후 재시도");
    assert.equal(fs.readFileSync(file, "utf8"), beforeFail);
    await app.evaluate(({ ipcMain }) => { ipcMain.removeHandler("save"); ipcMain.handle("save", globalThis.__b1Save); });
    await save();

    // 실제 백업·복원 IPC 왕복: 새 컬렉션과 기존 기록 모두 보존.
    const snapshot = saved();
    const backup = path.join(dir, "backup.json");
    await app.evaluate(({ dialog }, backup) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: backup });
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backup] });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, backup);
    await page.evaluate(() => window.workdesk.backup());
    assert.deepEqual(store.read(backup), snapshot);
    await page.evaluate((data) => window.workdesk.save(data), { ...snapshot, workItems: [...snapshot.workItems, newWork({ id: "temporary", title: "복원 전 임시 작업" })] });
    await page.evaluate(() => window.workdesk.restore());
    assert.deepEqual(saved(), snapshot);
    assert.ok(store.restoreCopies(file).length > 0);

    if (process.env.PARK_WORK_SHOTS) {
      await page.reload(); await page.locator('.save-indicator[data-state="ready"]').waitFor();
      await goTo(page, "업무 브리핑");
      await page.screenshot({ path: path.join(process.env.PARK_WORK_SHOTS, "b1-today.png"), fullPage: true });
      await goTo(page, "작업");
      await page.screenshot({ path: path.join(process.env.PARK_WORK_SHOTS, "b1-work.png"), fullPage: true });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    await app.close(); app = undefined;
    page = await launch();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.deepEqual(await page.evaluate(() => window.workdesk.load()), snapshot);
    assert.equal(snapshot.workItems.find((w) => w.title === "가상 독립 작업").status, "done");
    await app.close(); app = undefined;

    // 미래 읽기 버전의 B1 기록: 새 입력 불가, 디스크 바이트 불변.
    const newer = path.join(dir, "newer"); fs.mkdirSync(newer);
    const newerFile = path.join(newer, "workdesk.json");
    const raw = JSON.stringify({ ...snapshot, minReader: READER_VERSION + 1 }); fs.writeFileSync(newerFile, raw);
    page = await launch(newer);
    await page.locator('.save-indicator[data-state="read-only"]').waitFor();
    await goTo(page, "작업");
    assert.equal(await page.getByRole("button", { name: "작업 등록", exact: true }).isDisabled(), true);
    assert.equal(fs.readFileSync(newerFile, "utf8"), raw);
    console.log("PASS: B1 일반 작업·1:N 출처·상태 독립·날짜 기한·양방향 이동·삭제 보존·회의·저장 실패·백업/복원·재실행·읽기 전용·외부 요청 0");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
