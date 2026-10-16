// Actual Electron and file storage; native path dialogs are deterministic test doubles.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty } = require("../shared/model.mjs");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-desktop-test-"));
  const root = path.resolve(__dirname, "..");
  let app;
  let failed = false;
  const launch = () =>
    electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux"
          ? ["--no-sandbox", "--ozone-platform=headless"]
          : []),
        "--user-data-dir=" + path.join(dir, "profile"),
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      timeout: 30000,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: path.join(dir, "config"),
        XDG_CACHE_HOME: path.join(dir, "cache"),
      },
    });
  try {
    app = await launch();
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const acceptDialogs = async (dialog) => {
      try {
        await dialog.accept();
      } catch (error) {
        if (!String(error).includes("No dialog is showing"))
          errors.push(String(error));
      }
    };
    page.on("dialog", acceptDialogs);
    // The in-app confirmation dialog really renders; this only presses its button
    // (confirm by default, cancel when __parkConfirmAnswer is false) and counts prompts.
    const autoConfirm = () => {
      window.__parkConfirmAnswer = true;
      window.__parkConfirmCount = 0;
      new MutationObserver(() => {
        const dialog = document.querySelector("dialog.confirm-dialog[open]");
        if (!dialog || dialog.dataset.parkAnswered || window.__parkConfirmManual) return;
        dialog.dataset.parkAnswered = "1";
        window.__parkConfirmCount++;
        const [cancel, accept] = dialog.querySelectorAll(".confirm-actions button");
        setTimeout(() => (window.__parkConfirmAnswer ? accept : cancel).click());
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    };
    await page.addInitScript(autoConfirm);
    await page.evaluate(autoConfirm);
    const nav = async (name) => {
      const editor = page.locator(".sheet[open]");
      if (await editor.count())
        await editor.getByRole("button", { name: "취소", exact: true }).click();
      await page
        .locator("nav")
        .getByRole("button", { name, exact: true })
        .click();
    };
    const add = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const search = async (query) => {
      await page.keyboard.press("Control+k");
      await page.getByLabel("기록 통합 검색", { exact: true }).fill(query);
    };
    const manage = async (name) => {
      await page.locator(".data-menu > summary").click();
      await page
        .locator(".data-menu")
        .getByRole("button", { name, exact: true })
        .click();
    };
    await page
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    assert.ok(await page.evaluate(() => !!window.workdesk));
    // First use must offer working actions; merely visiting it never adds sample data.
    const firstUse = page.getByRole("region", { name: "업무 시작 안내", exact: true });
    await firstUse.waitFor();
    assert.equal(await firstUse.getByRole("button").count(), 3);
    for (const [action, title] of [["일정 등록", "일정 등록"], ["전화메모 작성", "전화메모 등록"]]) {
      await firstUse.getByRole("button", { name: action, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: title, exact: true });
      await dialog.waitFor();
      assert.equal(await dialog.evaluate((element) => element instanceof HTMLDialogElement && element.open && element.contains(document.activeElement)), true);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await nav("업무 브리핑");
    }
    await firstUse.getByRole("button", { name: "근무현황판 준비", exact: true }).click();
    await page.getByRole("heading", { name: "사무소 근무현황판을 준비하세요", exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.workdesk.load()), empty());
    const oneNote = empty();
    oneNote.notes.push({ id: "first-use-note", title: "기존 메모", body: "보존" });
    const oneCompleted = empty();
    oneCompleted.events.push({ id: "first-use-event", title: "완료한 일정", at: "2030-01-01T00:00:00+09:00", done: true });
    const oneStaff = empty();
    oneStaff.organizations.push({ id: "first-use-org", code: "TEST", name: "가상 조직", parentId: null });
    oneStaff.employees.push({ id: "first-use-staff", code: "T001", name: "가상 직원", organizationId: "first-use-org", position: "", active: true });
    for (const partial of [oneNote, oneCompleted, oneStaff]) {
      await page.evaluate((value) => window.workdesk.save(value), partial);
      const before = await page.evaluate(() => window.workdesk.load());
      await page.reload();
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      assert.equal(await firstUse.count(), 0);
      assert.deepEqual(await page.evaluate(() => window.workdesk.load()), before);
    }
    await page.evaluate((value) => window.workdesk.save(value), empty());
    await page.reload();
    await firstUse.waitFor();
    await nav("업무 메모");
    await add("메모 추가");
    assert.equal(
      await page
        .getByLabel("제목", { exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.getByLabel("제목", { exact: true }).fill("저장 전 초안");
    await page
      .getByLabel("내용", { exact: true })
      .fill("검색 후에도 유지할 내용");
    assert.equal(
      await page.locator(".save-indicator").getAttribute("data-state"),
      "unsaved",
    );
    await search("검색 결과 없음");
    await page.keyboard.press("Escape");
    assert.equal(
      await page.getByLabel("제목", { exact: true }).inputValue(),
      "저장 전 초안",
    );
    assert.equal(
      await page.getByLabel("내용", { exact: true }).inputValue(),
      "검색 후에도 유지할 내용",
    );
    // Choose "계속 작성" in the real confirmation dialog; the draft must stay.
    await page.evaluate(() => {
      window.__parkConfirmCount = 0;
      window.__parkConfirmAnswer = false;
    });
    await page
      .locator(".sheet[open]")
      .getByRole("button", { name: "취소", exact: true })
      .click();
    await page.waitForFunction(() => window.__parkConfirmCount === 1);
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    await page.evaluate(() => {
      window.__parkConfirmAnswer = true;
    });
    assert.equal(
      await page.getByLabel("제목", { exact: true }).inputValue(),
      "저장 전 초안",
    );
    // A failed IPC save must leave the draft and a visible inline error intact.
    await app.evaluate(({ ipcMain }) => {
      globalThis.__parkOriginalSaveHandler =
        ipcMain._invokeHandlers.get("save");
      if (typeof globalThis.__parkOriginalSaveHandler !== "function")
        throw new Error("실제 저장 핸들러가 없습니다.");
      ipcMain.removeHandler("save");
      ipcMain.handle("save", () => {
        throw new Error("가상 저장 오류");
      });
    });
    await page
      .locator(".sheet[open]")
      .getByRole("button", { name: "저장", exact: true })
      .click();
    await page.locator(".sheet[open]").getByRole("alert").waitFor();
    assert.equal(
      await page.getByLabel("제목", { exact: true }).inputValue(),
      "저장 전 초안",
    );
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("save");
      ipcMain.handle("save", globalThis.__parkOriginalSaveHandler);
      delete globalThis.__parkOriginalSaveHandler;
    });
    await page
      .locator(".sheet[open]")
      .getByRole("button", { name: "취소", exact: true })
      .click();
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).notes.length,
      0,
    );
    await add("메모 추가");
    await page.getByLabel("제목", { exact: true }).fill("보존할 업무 메모");
    await page.getByLabel("내용", { exact: true }).fill("새 버전에서도 유지");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("heading", { name: "보존할 업무 메모" }).waitFor();
    await nav("전화메모");
    await add("전화메모 추가");
    await page.getByLabel("제목", { exact: true }).fill("안내 전화");
    await page.getByLabel("전화번호").fill("000-0000");
    await page.getByLabel("전달 내용").fill("문의 처리 기록");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("button", { name: "처리 완료", exact: true }).click();
    await page
      .getByRole("button", { name: "미처리로 변경", exact: true })
      .waitFor();
    await nav("현장 순찰");
    await add("순찰 기록 추가");
    await page.getByLabel("기록 제목").fill("오전 탐방로 순찰");
    await page.getByLabel("순찰 구간").fill("안내소 → 전망대");
    await page.getByLabel("기록자").fill("시험 담당");
    await page.getByLabel("확인 사항").fill("안내판 추가 확인");
    await page.getByLabel("현장 조치").fill("통행 상태 확인");
    await page.getByLabel("확인 등급").selectOption("attention");
    await page.locator(".coordinate-details > summary").click();
    // DD input: partial, malformed and out-of-range values block saving.
    await page.getByLabel("위도 (DD)", { exact: true }).fill("37.5");
    assert.equal(
      await page
        .getByRole("button", { name: "순찰 저장", exact: true })
        .isEnabled(),
      false,
    );
    await page.getByLabel("경도 (DD)", { exact: true }).fill("181");
    assert.equal(
      await page
        .getByRole("button", { name: "순찰 저장", exact: true })
        .isEnabled(),
      false,
    );
    await page.getByLabel("경도 (DD)", { exact: true }).fill("0x7f");
    assert.equal(
      await page
        .getByRole("button", { name: "순찰 저장", exact: true })
        .isEnabled(),
      false,
    );
    await page.getByLabel("경도 (DD)", { exact: true }).fill("127.25");
    assert.equal(
      await page.getByLabel("DMS 변환 결과").textContent(),
      "N 37° 30′ 0″, E 127° 15′ 0″",
    );
    await page.getByLabel("좌표 입력 형식").selectOption("dms");
    assert.equal(
      await page.getByLabel("DD 변환 결과").textContent(),
      "위도 37.5°, 경도 127.25°",
    );
    await page.getByLabel("좌표 입력 형식").selectOption("dd");
    await page.getByRole("button", { name: "순찰 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "오전 탐방로 순찰", exact: true })
      .waitFor();
    assert.deepEqual(
      (await page.evaluate(() => window.workdesk.load())).patrols[0]
        .coordinates,
      { latitude: 37.5, longitude: 127.25 },
    );
    assert.equal(await page.locator(".sheet[open]").count(), 0);
    // Navigation remains accessible when pending counts are displayed.
    await page.keyboard.press("Control+k");
    assert.equal(
      await page
        .getByLabel("기록 통합 검색")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    await page.getByLabel("순찰 검색").fill("127.25");
    assert.equal(await page.locator(".record").count(), 1);
    await page.getByLabel("순찰 검색").fill("W 127°");
    assert.equal(await page.locator(".record").count(), 0);
    await page.getByLabel("순찰 검색").fill("N 37° 30′");
    assert.equal(await page.locator(".record").count(), 1);
    await page.getByLabel("순찰 검색").fill("");
    await search("127.25");
    await page.locator(".search-result").click();
    await page
      .getByRole("heading", { name: "순찰 기록 수정", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("위도 (DD)", { exact: true }).inputValue(),
      "37.5",
    );
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await page
      .getByRole("button", { name: "인수인계로 연결", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "업무 수정", exact: true })
      .waitFor();
    await page.getByLabel("업무 제목").fill("안내판 후속 확인");
    await page.getByLabel("담당자", { exact: true }).fill("시설 담당");
    await page.getByLabel("마감 일시").fill("2030-10-16T09:00");
    await page.getByRole("button", { name: "변경 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "안내판 후속 확인", exact: true })
      .waitFor();
    // Returning to the same patrol must open the existing outstanding task.
    await nav("현장 순찰");
    await page.getByRole("button", { name: "후속 조치 보기" }).click();
    await page.getByRole("heading", { name: "업무 수정" }).waitFor();
    assert.equal(
      await page.getByLabel("업무 제목").inputValue(),
      "안내판 후속 확인",
    );
    await nav("인수인계");
    await page
      .getByRole("heading", { name: "이어받을 업무", exact: true })
      .waitFor();
    await nav("제출 기한");
    await add("제출 기한 추가");
    await page.getByLabel("업무 제목").fill("주간 실적 제출");
    await page.getByLabel("담당자", { exact: true }).fill("서무 담당");
    await page.getByLabel("제출처").fill("관리부");
    await page.getByLabel("마감 일시").fill("2030-10-16T17:00");
    await page.getByRole("button", { name: "업무 등록", exact: true }).click();
    await page.getByRole("heading", { name: "주간 실적 제출" }).waitFor();
    await nav("월간 일정");
    await add("일정 추가");
    await page.getByLabel("일정 제목").fill("현장 회의");
    await page.getByLabel("일정 일시").fill("2030-10-16T10:00");
    await page.getByRole("button", { name: "일정 저장", exact: true }).click();
    const selectedDay = page.locator('.calendar-day[aria-pressed="true"]');
    await page.waitForFunction(() => document.querySelector('.calendar-day[aria-pressed="true"]')?.getAttribute("aria-label")?.includes("현장 회의"));
    const selectedName = await selectedDay.getAttribute("aria-label");
    for (const value of ["2030. 10. 16.", "3건", "현장 회의", "일정", "10:00", "안내판 후속 확인", "09:00", "주간 실적 제출", "17:00"])
      assert.ok(selectedName.includes(value), `달력 접근 이름에서 ${value} 누락: ${selectedName}`);
    await page.getByRole("checkbox", { name: "현장 회의 완료" }).click();
    await page.waitForFunction(
      () => document.querySelector('[aria-label="현장 회의 완료"]').checked,
    );
    await search("안내판 후속");
    await page.locator(".search-result").click();
    await page.getByRole("heading", { name: "업무 수정" }).waitFor();
    await page
      .locator(".sheet[open]")
      .getByRole("button", { name: "취소", exact: true })
      .click();
    await page.getByRole("button", { name: "조치 완료", exact: true }).click();
    await page.getByRole("button", { name: "완료", exact: true }).click();
    await page
      .getByRole("button", { name: "다시 진행", exact: true })
      .waitFor();
    // Assert all records using the actual preload read path.
    let data = await page.evaluate(() => window.workdesk.load());
    assert.equal(data.tasks.length, 2);
    assert.equal(data.tasks[0].done, true);
    assert.ok(data.tasks[0].completedAt);
    assert.equal(data.tasks[0].patrolId, data.patrols[0].id);
    assert.equal(data.events.length, 1);
    const backup = path.join(dir, "backup.json");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, backup);
    await manage("백업");
    for (let n = 0; !fs.existsSync(backup) && n < 100; n++)
      await new Promise((r) => setTimeout(r, 50));
    data = JSON.parse(fs.readFileSync(backup, "utf8"));
    assert.equal(data.version, 3);
    assert.equal(data.patrols[0].route, "안내소 → 전망대");
    assert.deepEqual(data.patrols[0].coordinates, {
      latitude: 37.5,
      longitude: 127.25,
    });
    assert.equal(data.calls[0].done, true);
    data.notes[0].title = "복원 확인 메모";
    fs.writeFileSync(backup, JSON.stringify(data));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, backup);
    await manage("복원");
    await page
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    await nav("업무 메모");
    await page.getByRole("heading", { name: "복원 확인 메모" }).waitFor();
    // Broken references must be rejected before overwriting current data.
    fs.writeFileSync(backup, JSON.stringify({ ...data, patrols: [] }));
    await manage("복원");
    await page.getByRole("alert").waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).patrols.length,
      1,
    );
    await nav("현장 순찰");
    await page.getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("기록 제목").fill("오전 탐방로 순찰 수정");
    assert.equal(
      await page.getByLabel("경도 (DD)", { exact: true }).inputValue(),
      "127.25",
    );
    await page.getByLabel("좌표 입력 형식").selectOption("dms");
    await page.getByLabel("위도 분", { exact: true }).fill("60");
    assert.equal(
      await page
        .getByRole("button", { name: "변경 저장", exact: true })
        .isEnabled(),
      false,
    );
    await page.getByLabel("위도 분", { exact: true }).fill("45");
    await page.getByLabel("위도 방향").selectOption("S");
    await page.getByLabel("경도 방향").selectOption("W");
    assert.equal(
      await page.getByLabel("DD 변환 결과").textContent(),
      "위도 -37.75°, 경도 -127.25°",
    );
    await page.getByRole("button", { name: "변경 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "오전 탐방로 순찰 수정" })
      .waitFor();
    await nav("업무 브리핑");
    await page
      .locator(".timeline-row")
      .filter({ hasText: "위도 -37.75°, 경도 -127.25°" })
      .waitFor();
    await page
      .getByRole("button", { name: "브리핑 미리보기", exact: true })
      .click();
    assert.match(
      await page.locator(".report-preview pre").textContent(),
      /S 37° 45′ 0″, W 127° 15′ 0″/,
    );
    const report = path.join(dir, "briefing.txt");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, report);
    await page.getByRole("button", { name: "텍스트로 내보내기" }).click();
    await page.getByText("브리핑을 텍스트 파일로 저장했습니다.").waitFor();
    assert.match(fs.readFileSync(report, "utf8"), /오전 탐방로 순찰 수정/);
    assert.match(
      fs.readFileSync(report, "utf8"),
      /위도 -37.75°, 경도 -127.25°/,
    );
    assert.match(
      fs.readFileSync(report, "utf8"),
      /S 37° 45′ 0″, W 127° 15′ 0″/,
    );
    if (process.env.PARK_SCREENSHOT_PATH) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: process.env.PARK_SCREENSHOT_PATH,
        fullPage: true,
      });
    }
    // Optional coordinates: legacy-shaped record, valid zero pair, explicit clearing.
    await nav("현장 순찰");
    await add("순찰 기록 추가");
    await page.getByLabel("기록 제목").fill("좌표 없는 순찰");
    await page.getByLabel("순찰 구간").fill("관리 거점");
    await page.getByLabel("기록자").fill("시험 담당");
    await page.getByRole("button", { name: "순찰 저장", exact: true }).click();
    const optional = page.locator(".record").filter({
      has: page.getByRole("heading", { name: "좌표 없는 순찰", exact: true }),
    });
    await optional.waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).patrols[1]
        .coordinates,
      undefined,
    );
    await optional.getByRole("button", { name: "수정", exact: true }).click();
    await page.locator(".coordinate-details > summary").click();
    await page.getByLabel("위도 (DD)", { exact: true }).fill("0");
    await page.getByLabel("경도 (DD)", { exact: true }).fill("0");
    await page.getByRole("button", { name: "변경 저장", exact: true }).click();
    await optional.locator(".record-details > summary").click();
    await optional.getByText("위도 0°, 경도 0°", { exact: false }).waitFor();
    assert.deepEqual(
      (await page.evaluate(() => window.workdesk.load())).patrols[1]
        .coordinates,
      { latitude: 0, longitude: 0 },
    );
    await optional.getByRole("button", { name: "수정", exact: true }).click();
    await page
      .getByRole("button", { name: "좌표 지우기", exact: true })
      .click();
    await page.getByRole("button", { name: "변경 저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).patrols[1]
        .coordinates,
      null,
    );
    assert.equal(await optional.locator(".coordinate-summary").count(), 0);
    assert.deepEqual(
      (await page.evaluate(() => window.workdesk.load())).patrols[0]
        .coordinates,
      { latitude: -37.75, longitude: -127.25 },
    );
    // Office setup and roster: no assumptions about unregistered staff.
    await nav("사무소 현황");
    await page
      .getByRole("heading", {
        name: "사무소 근무현황판을 준비하세요",
        exact: true,
      })
      .waitFor();
    await page.getByRole("tab", { name: "조직 관리", exact: false }).click();
    await add("조직 추가");
    await page.getByLabel("조직 코드", { exact: true }).fill("PARK");
    await page.getByLabel("조직 이름", { exact: true }).fill("시험 사무소");
    await page.getByRole("button", { name: "조직 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "시험 사무소", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "직원 관리", exact: false }).click();
    await add("직원 추가");
    await page.getByLabel("직원번호", { exact: true }).fill("E001");
    await page.getByLabel("직원 이름", { exact: true }).fill("시험 직원");
    await page.getByLabel("직위·담당", { exact: true }).fill("시설 담당");
    await page.getByRole("button", { name: "직원 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "시험 직원", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "거점 관리", exact: false }).click();
    await add("거점 추가");
    await page.getByLabel("거점 코드", { exact: true }).fill("B01");
    await page.getByLabel("거점 이름", { exact: true }).fill("시험 탐방센터");
    await page.getByRole("button", { name: "거점 저장", exact: true }).click();
    await page
      .getByRole("heading", { name: "시험 탐방센터", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "근무현황", exact: true }).click();
    await page
      .getByRole("button", { name: "시험 직원 근무 등록", exact: true })
      .click();
    await page.getByLabel("기본 근무", { exact: true }).selectOption("base");
    await page.getByLabel("당직 구분", { exact: true }).selectOption("night");
    const officeData = await page.evaluate(() => window.workdesk.load());
    await page
      .getByLabel("근무 거점", { exact: true })
      .selectOption(officeData.bases[0].id);
    await page.getByLabel("근무 비고", { exact: true }).fill("야간 교대 인계");
    await page.getByRole("button", { name: "근무 저장", exact: true }).click();
    await page
      .getByRole("button", { name: "시험 직원 근무 수정", exact: true })
      .waitFor();
    const officeRow = page
      .locator(".roster-table tbody tr")
      .filter({ hasText: "시험 직원" });
    assert.match(await officeRow.textContent(), /거점근무/);
    assert.match(await officeRow.textContent(), /숙직/);
    assert.match(await officeRow.textContent(), /시험 탐방센터/);
    await page
      .getByRole("button", { name: "주간 근무표", exact: true })
      .click();
    const officeDate = await page
      .getByLabel("근무현황 날짜", { exact: true })
      .inputValue();
    await page
      .getByRole("button", {
        name: `시험 직원 ${officeDate} 근무 편집`,
        exact: true,
      })
      .click();
    assert.equal(
      await page.getByLabel("당직 구분", { exact: true }).inputValue(),
      "night",
    );
    await page
      .getByLabel("근무 비고", { exact: true })
      .fill("수정된 교대 인계");
    await page.getByRole("button", { name: "근무 저장", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    // CSV file preview must not mutate storage until explicitly applied.
    await page.getByRole("tab", { name: "파일 반입", exact: true }).click();
    await page
      .getByLabel("반입 종류", { exact: true })
      .selectOption("employees");
    await page.getByLabel("CSV 파일", { exact: true }).setInputFiles({
      name: "staff.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "code,name,organizationCode,position,active\nE002,반입 직원,PARK,현장 담당,true",
        "utf8",
      ),
    });
    await page.waitForFunction(() =>
      document
        .querySelector('textarea[placeholder^="CSV 파일"]')
        .value.includes("E002"),
    );
    await page
      .getByRole("button", { name: "반입 미리보기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "확인 후 반입 적용", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).employees.length,
      1,
    );
    await page
      .getByRole("button", { name: "확인 후 반입 적용", exact: true })
      .click();
    await page
      .getByText("직원 1건을 확인하고 반입했습니다.", { exact: true })
      .waitFor();
    await page
      .getByLabel("반입 CSV", { exact: true })
      .fill(
        "code,name,organizationCode,position,active\nE003,거부 직원,MISSING,담당,true",
      );
    await page
      .getByRole("button", { name: "반입 미리보기", exact: true })
      .click();
    await page.locator(".import-workspace").getByRole("alert").waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.load())).employees.length,
      2,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "확인 후 반입 적용", exact: true })
        .count(),
      0,
    );
    await page.getByRole("tab", { name: "근무현황", exact: true }).click();
    await page.getByRole("button", { name: "일별 현황", exact: true }).click();
    await page
      .getByRole("button", { name: "반입 직원 근무 등록", exact: true })
      .click();
    await page.getByLabel("기본 근무", { exact: true }).selectOption("off");
    await page.getByRole("button", { name: "근무 저장", exact: true }).click();
    await page
      .getByRole("button", { name: "반입 직원 근무 수정", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "직원 관리", exact: false }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "시험 직원 삭제", exact: true })
        .isEnabled(),
      false,
    );
    // Office data participates in the same backup and restore, retaining assignment IDs.
    const finalBackup = path.join(dir, "office-backup.json");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, finalBackup);
    await manage("백업");
    for (let n = 0; !fs.existsSync(finalBackup) && n < 100; n++)
      await new Promise((r) => setTimeout(r, 50));
    const officeBackup = JSON.parse(fs.readFileSync(finalBackup, "utf8"));
    assert.equal(officeBackup.employees.length, 2);
    assert.equal(officeBackup.assignments.length, 2);
    assert.equal(officeBackup.assignments[0].note, "수정된 교대 인계");
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, finalBackup);
    await manage("복원");
    await page
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    assert.deepEqual(
      (await page.evaluate(() => window.workdesk.load())).assignments,
      officeBackup.assignments,
    );
    // Verify actual process restart, not only a renderer reload.
    const saved = await page.evaluate(() => window.workdesk.load());
    await app.close();
    app = await launch();
    const reopened = await app.firstWindow();
    await reopened
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    assert.deepEqual(
      await reopened.evaluate(() => window.workdesk.load()),
      saved,
    );
    await reopened
      .locator("nav")
      .getByRole("button", { name: "바로가기", exact: true })
      .click();
    await app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [folder],
      });
    }, dir);
    await reopened
      .getByRole("button", { name: "폴더 선택", exact: true })
      .click();
    await reopened.getByText(dir, { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await app.close();
    app = null;
    await require("./desktop-tray-smoke.cjs")();
    console.log(
      "PASS: 조직·직원·거점·일/주간 근무표·CSV 반입·백업·복원, DD/DMS 좌표 입력·검증·수정·검색·지우기·브리핑, 순찰→인수인계, 제출·달력 연계, 검색, 완료 기록, 백업·복원/잘못된 백업 거부, 브리핑 출력, 재실행 보존, 폴더 등록",
    );
  } catch (error) {
    failed = true;
    console.error(error);
    throw error;
  } finally {
    if (app) {
      if (failed) await app.evaluate(({ app }) => app.exit(1)).catch(() => {});
      else await app.close();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
