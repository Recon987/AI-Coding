// B2b 실제 앱: 사업·AX·기록·근거 N:M·안전한 위치 보기·보존·암호 백업.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { goTo } = require("./nav.cjs");
const store = require("../desktop/store.cjs");
const { newWork } = require("../shared/work.mjs");
const { READER_VERSION, briefing, calendarItems } = require("../shared/model.mjs");
const root = path.resolve(__dirname, "..");
const now = "2026-10-20T03:00:00.000Z";

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-projects-"));
  const profile = path.join(dir, "profile"), file = path.join(profile, "workdesk.json");
  const evidenceFile = path.join(dir, "가상 근거.txt"); fs.writeFileSync(evidenceFile, "가상 자료");
  const data = store.empty();
  data.notes.push({ id: "n", title: "가상 사업 메모", body: "원본 메모 내용", future: { value: "유지" } });
  data.calls.push({ id: "c", title: "가상 사업 전화", body: "회신 내용", phone: "000", done: false });
  data.meetings.push({ id: "m", title: "가상 사업 회의", body: "결정", at: now, attendees: "가상 담당", createdAt: now, updatedAt: now });
  data.workItems.push(newWork({ id: "w", title: "가상 기존 작업", body: "보존", now }));
  data.links.push({ id: "l", from: { type: "note", id: "n" }, to: { type: "workItem", id: "w" }, role: "followUp", createdAt: now });
  data.axProjects.push({ id: "a", title: "가상 기존 AX", zone: "west", stage: "contract", budgetTotal: 1000, budgetExecuted: 250, manager: "가상", partner: "협력", nextMilestone: "점검", nextMilestoneDate: "2026-10-20", risks: "", notes: "AX 메모", updatedAt: now, future: "보존" });
  store.write(file, data);
  let app;
  const launch = async (selectedProfile = profile) => {
    app = await electron.launch({ executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"), args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []), "--user-data-dir=" + selectedProfile, ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root])], env: { ...process.env, TZ: "Asia/Seoul", PARK_TEST_PROTECTOR: "fake:B2-test", XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000 });
    const page = await app.firstWindow(); page.setDefaultTimeout(10000); return page;
  };
  try {
    let page = await launch();
    const errors = [], external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (/^https?:/.test(r.url())) external.push(r.url()); });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const load = () => page.evaluate(() => window.workdesk.load());
    const choose = async (title) => { await page.getByRole("button", { name: `사업 선택 · ${title}`, exact: true }).click(); await page.getByRole("region", { name: "선택한 사업" }).getByRole("heading", { name: title, exact: true }).waitFor(); };
    const saveDialog = async () => { const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "저장", exact: true }).click(); await dialog.waitFor({ state: "hidden" }); };
    const showProject = async (title) => { await goTo(page, "사업 공간"); await choose(title); };

    // 실제 저장 봉투를 켠 프로필에서 모든 새 UI·IPC를 실행한다(Windows 패키지는 실제 DPAPI).
    await page.evaluate(async () => { const key = await window.workdesk.securityPrepare(); await window.workdesk.securityEnable(key.recoveryKey); });
    assert.ok(JSON.parse(fs.readFileSync(file, "utf8")).sealed);
    await goTo(page, "사업 공간");
    await page.getByRole("button", { name: "사업 등록", exact: true }).click();
    await page.getByLabel("사업명", { exact: true }).fill("가상 시설 사업");
    await page.getByLabel("사업 분야", { exact: true }).selectOption("facility");
    // 저장 실패 때 봉한 원본과 초안을 보존하고 같은 입력으로 재시도한다.
    const beforeFailedSave = fs.readFileSync(file);
    await app.evaluate(({ ipcMain }) => {
      globalThis.__b2OriginalSave = ipcMain._invokeHandlers.get("save");
      ipcMain.removeHandler("save");
      ipcMain.handle("save", async () => { throw new Error("가상 사업 저장 실패"); });
    });
    await page.getByRole("dialog").getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("dialog").getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("사업명", { exact: true }).inputValue(), "가상 시설 사업");
    assert.deepEqual(fs.readFileSync(file), beforeFailedSave);
    await app.evaluate(({ ipcMain }) => { ipcMain.removeHandler("save"); ipcMain.handle("save", globalThis.__b2OriginalSave); });
    await saveDialog();
    const p1 = (await load()).projects.find((p) => p.title === "가상 시설 사업").id;

    // 좁은 창·125%에서 새 화면이 가로로 잘리지 않고 주요 행동에 접근한다.
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setContentSize(960, 720); win.webContents.setZoomFactor(1.25); });
    await page.waitForFunction(() => document.documentElement.clientWidth < 900);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
    await page.getByRole("region", { name: "선택한 사업" }).getByRole("button", { name: "작업 등록", exact: true }).scrollIntoViewIfNeeded();
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.webContents.setZoomFactor(1); win.setContentSize(1280, 900); });

    // 선택한 사업에서 작업 등록, 기한 강제 없음.
    await page.getByRole("region", { name: "선택한 사업" }).getByRole("button", { name: "작업 등록", exact: true }).click();
    await page.getByLabel("작업 제목").fill("가상 사업 후속 작업");
    assert.equal(await page.getByLabel("사업", { exact: true }).inputValue(), p1);
    assert.equal(await page.getByLabel("기한 방식").inputValue(), "none");
    await saveDialog();
    assert.equal((await load()).workItems.find((w) => w.title === "가상 사업 후속 작업").projectId, p1);
    await showProject("가상 시설 사업");
    await page.getByRole("region", { name: "선택한 사업" }).getByRole("button", { name: "기록 연결", exact: true }).click();
    let linker = page.getByRole("dialog", { name: "기록 연결", exact: true });
    await linker.getByRole("button", { name: "연결 · 가상 기존 작업", exact: true }).click();
    await linker.getByRole("button", { name: "연결 해제 · 가상 기존 작업", exact: true }).waitFor();
    for (const [kind, title] of [["notes", "가상 사업 메모"], ["calls", "가상 사업 전화"], ["meetings", "가상 사업 회의"]]) {
      await linker.getByLabel("연결할 기록 종류").selectOption(kind);
      await linker.getByRole("button", { name: `연결 · ${title}`, exact: true }).click();
      await linker.getByRole("button", { name: `연결 해제 · ${title}`, exact: true }).waitFor();
    }
    await linker.getByRole("button", { name: "닫기", exact: true }).click();
    assert.equal((await load()).calls[0].done, false);
    assert.deepEqual((await load()).notes[0].future, { value: "유지" });

    // 근거 등록 후 사업에 연결. 파일은 경로로 저장하고 main은 ID에서 다시 조회한다.
    await page.getByRole("button", { name: "근거 연결·등록", exact: true }).click();
    await page.getByRole("button", { name: "근거 자료 등록", exact: true }).click();
    await page.getByLabel("근거 이름").fill("가상 공문 근거"); await page.getByLabel("문서번호").fill("가상-2026-001");
    await saveDialog();
    await page.getByRole("button", { name: "이 사업에 연결 · 가상 공문 근거", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "연결했습니다" }).waitFor();
    const r1 = (await load()).references.find((r) => r.title === "가상 공문 근거").id;
    await app.evaluate(({ dialog, shell }, picked) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picked] }); globalThis.__b2Reveals = []; shell.showItemInFolder = (p) => globalThis.__b2Reveals.push(p); }, evidenceFile);
    await page.getByRole("button", { name: "근거 자료 등록", exact: true }).click();
    await page.getByLabel("근거 이름").fill("가상 파일 근거"); await page.getByLabel("근거 종류").selectOption("file");
    await page.getByRole("button", { name: "파일 선택", exact: true }).click();
    await page.waitForFunction((value) => [...document.querySelectorAll("input")].some((input) => input.value === value), evidenceFile);
    assert.equal(await page.getByLabel("파일 경로").inputValue(), evidenceFile);
    await saveDialog();
    const fileCard = page.locator(".reference-card").filter({ has: page.getByText("가상 파일 근거", { exact: true }) });
    await fileCard.getByRole("button", { name: "위치 보기", exact: true }).click();
    assert.deepEqual(await app.evaluate(() => globalThis.__b2Reveals), [evidenceFile]);
    const rf = (await load()).references.find((r) => r.title === "가상 파일 근거").id;
    fs.unlinkSync(evidenceFile);
    await fileCard.getByRole("button", { name: "위치 다시 확인", exact: true }).click();
    await fileCard.getByRole("status").filter({ hasText: "파일·폴더가 없습니다" }).waitFor();
    assert.equal(await fileCard.getByRole("button", { name: "위치 보기", exact: true }).isDisabled(), true);
    const invalidPath = await page.evaluate(async (id) => window.workdesk.revealReference(id).then(() => "opened", (e) => e.message), evidenceFile);
    assert.notEqual(invalidPath, "opened");
    const missingFile = await page.evaluate(async (id) => window.workdesk.revealReference(id).then(() => "opened", (e) => e.message), rf);
    assert.match(missingFile, /없습니다/);
    assert.deepEqual(await app.evaluate(() => globalThis.__b2Reveals), [evidenceFile]);
    await page.getByRole("button", { name: "사업 공간으로", exact: true }).click();

    // 하나의 근거를 두 사업과 작업에 재사용한다.
    await page.getByRole("button", { name: "사업 등록", exact: true }).click();
    await page.getByLabel("사업명").fill("가상 행정 사업"); await page.getByLabel("사업 분야", { exact: true }).selectOption("admin"); await saveDialog();
    const p2 = (await load()).projects.find((p) => p.title === "가상 행정 사업").id;
    await page.getByRole("button", { name: "근거 연결·등록", exact: true }).click();
    await page.getByRole("button", { name: "이 사업에 연결 · 가상 공문 근거", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "연결했습니다" }).waitFor();
    await page.getByRole("button", { name: "사업 공간으로", exact: true }).click();
    await goTo(page, "작업");
    const workRow = page.locator(".list-row").filter({ has: page.getByRole("heading", { name: "가상 기존 작업", exact: true }) });
    await workRow.getByRole("button", { name: /^수정 ·/ }).click();
    await page.getByLabel("근거 선택 · 가상 공문 근거", { exact: true }).check();
    await saveDialog();
    let current = await load();
    assert.ok(current.projects.find((p) => p.id === p1).referenceIds.includes(r1));
    assert.ok(current.projects.find((p) => p.id === p2).referenceIds.includes(r1));
    assert.ok(current.workItems.find((w) => w.id === "w").referenceIds.includes(r1));
    assert.equal(current.references.filter((r) => r.id === r1).length, 1);

    // AX 공통 편집·확장 표시. 모듈 숨김 때 AX 단계·예산 원본을 재작성하지 않는다.
    await showProject("가상 기존 AX");
    const detail = page.getByRole("region", { name: "선택한 사업" });
    await detail.getByText("25%", { exact: true }).waitFor();
    const beforeAX = (await load()).axProjects[0];
    const beforeBriefing = briefing(await load(), "2026-10-20");
    const beforeCalendar = calendarItems(await load(), { startDate: "2026-10-20", endDate: "2026-10-20" }).filter((r) => r.category === "AX");
    await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("button", { name: "모듈 관리", exact: true }).click();
    const modules = page.getByRole("dialog", { name: "모듈 관리", exact: true });
    await modules.getByRole("switch", { name: /^AX 사업 관리/ }).click();
    await modules.getByRole("status").filter({ hasText: "숨겼습니다" }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await detail.getByText("사업비 / 집행액", { exact: true }).count(), 0);
    await detail.getByRole("button", { name: "사업 수정", exact: true }).click();
    await page.getByLabel("사업 메모").fill("AX 메모 수정"); await saveDialog();
    current = await load();
    assert.equal(current.axProjects[0].stage, beforeAX.stage);
    assert.equal(current.axProjects[0].budgetTotal, beforeAX.budgetTotal);
    assert.equal(current.axProjects[0].budgetExecuted, beforeAX.budgetExecuted);
    assert.equal(current.axProjects[0].future, "보존");
    assert.equal(briefing(current, "2026-10-20"), beforeBriefing);
    assert.deepEqual(calendarItems(current, { startDate: "2026-10-20", endDate: "2026-10-20" }).filter((r) => r.category === "AX"), beforeCalendar);

    // 사업을 지워도 작업·메모·회의·근거·B1 링크는 남는다.
    await showProject("가상 시설 사업");
    const originals = await load();
    await page.getByRole("button", { name: "사업 삭제", exact: true }).click();
    await page.getByRole("alertdialog").getByText(/연결된 작업·메모·회의/).waitFor();
    await page.getByRole("alertdialog").getByRole("button", { name: "사업 삭제", exact: true }).click();
    await page.getByRole("button", { name: "사업 선택 · 가상 시설 사업", exact: true }).waitFor({ state: "hidden" });
    current = await load();
    for (const collection of ["workItems", "notes", "calls", "meetings", "references", "links"]) assert.deepEqual(current[collection], originals[collection]);
    await goTo(page, "작업");
    await page.locator(".list-row").filter({ has: page.getByRole("heading", { name: "가상 기존 작업", exact: true }) }).locator("summary").click();
    await workRow.getByText("사업 없음(삭제됨)", { exact: true }).waitFor();

    // 암호 백업·복원·재실행은 새 자료와 기존 자료를 함께 보존한다.
    const snapshot = await load(), backup = path.join(dir, "backup.json"), password = "가상 사업 공간 백업 암호 2026";
    await app.evaluate(({ dialog }, picked) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: picked }); dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picked] }); dialog.showMessageBox = async () => ({ response: 1 }); }, backup);
    await page.evaluate((password) => window.workdesk.backup(password), password);
    assert.deepEqual(await store.readBackup(backup, password), snapshot);
    await page.evaluate(async () => { const d = await window.workdesk.load(); d.projects = []; await window.workdesk.save(d); const pending = await window.workdesk.restore(); if (!pending.needsPassword) throw new Error("암호 확인 누락"); });
    await page.evaluate((password) => window.workdesk.restorePassword(password), password);
    assert.deepEqual(await load(), snapshot);
    assert.ok(JSON.parse(fs.readFileSync(file, "utf8")).sealed);
    if (process.env.PARK_PROJECT_SHOTS) {
      await showProject("가상 행정 사업");
      await page.screenshot({ path: path.join(process.env.PARK_PROJECT_SHOTS, "project-space.png"), fullPage: true });
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    await app.close(); app = undefined;
    page = await launch(); await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.deepEqual(await load(), snapshot);
    await app.close(); app = undefined;
    const newerProfile = path.join(dir, "newer"); fs.mkdirSync(newerProfile);
    const newerFile = path.join(newerProfile, "workdesk.json"), raw = JSON.stringify({ ...snapshot, minReader: READER_VERSION + 1 }); fs.writeFileSync(newerFile, raw);
    page = await launch(newerProfile); await page.locator('.save-indicator[data-state="read-only"]').waitFor();
    await goTo(page, "사업 공간"); assert.equal(await page.getByRole("button", { name: "사업 등록", exact: true }).isDisabled(), true);
    assert.equal(fs.readFileSync(newerFile, "utf8"), raw);
    console.log("PASS: B2b 저장 실패 초안/원본 보존·960px/125%·사업·AX 통합·기록 연결·근거 N:M·ID 기반 위치 보기/파일 없음·모듈 숨김·삭제 보존·봉함 저장·암호 백업/복원·재실행·읽기 전용·외부 요청 0");
  } finally { if (app) await app.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
