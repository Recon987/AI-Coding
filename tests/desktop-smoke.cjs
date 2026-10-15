// Actual Electron and file storage; native path dialogs are deterministic test doubles.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-desktop-test-"));
  const root = path.resolve(__dirname, "..");
  let app;
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
    page.on("dialog", (d) => d.accept());
    const nav = (name) =>
      page.locator("nav").getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    assert.ok(await page.evaluate(() => !!window.workdesk));
    await nav("업무 메모");
    await page.getByLabel("제목", { exact: true }).fill("보존할 업무 메모");
    await page.getByLabel("내용", { exact: true }).fill("새 버전에서도 유지");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("heading", { name: "보존할 업무 메모" }).waitFor();
    await nav("전화메모");
    await page.getByLabel("제목", { exact: true }).fill("안내 전화");
    await page.getByLabel("전화번호").fill("000-0000");
    await page.getByLabel("전달 내용").fill("문의 처리 기록");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("button", { name: "처리 완료", exact: true }).click();
    await page
      .getByRole("button", { name: "미처리로 변경", exact: true })
      .waitFor();
    await nav("현장 순찰");
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
    assert.equal(
      await page.getByLabel("위도 (DD)", { exact: true }).inputValue(),
      "",
    );
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
    await page.getByLabel("기록 통합 검색").fill("127.25");
    await page.locator(".search-result").click();
    await page
      .getByRole("heading", { name: "순찰 기록 수정", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("위도 (DD)", { exact: true }).inputValue(),
      "37.5",
    );
    await page.getByRole("button", { name: "수정 취소", exact: true }).click();
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
    await page.getByLabel("업무 제목").fill("주간 실적 제출");
    await page.getByLabel("담당자", { exact: true }).fill("서무 담당");
    await page.getByLabel("제출처").fill("관리부");
    await page.getByLabel("마감 일시").fill("2030-10-16T17:00");
    await page.getByRole("button", { name: "업무 등록", exact: true }).click();
    await page.getByRole("heading", { name: "주간 실적 제출" }).waitFor();
    await nav("월간 일정");
    await page.getByLabel("일정 제목").fill("현장 회의");
    await page.getByLabel("일정 일시").fill("2030-10-16T10:00");
    await page.getByRole("button", { name: "일정 저장", exact: true }).click();
    await page
      .getByRole("button", { name: "2030-10-16 3건", exact: true })
      .waitFor();
    await page.getByRole("checkbox", { name: "현장 회의 완료" }).click();
    await page.waitForFunction(
      () => document.querySelector('[aria-label="현장 회의 완료"]').checked,
    );
    await page.getByLabel("기록 통합 검색").fill("안내판 후속");
    await page.locator(".search-result").click();
    await page.getByRole("heading", { name: "업무 수정" }).waitFor();
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
    await page.getByRole("button", { name: "백업", exact: true }).click();
    await page.getByRole("button", { name: "백업", exact: true }).isEnabled();
    for (let n = 0; !fs.existsSync(backup) && n < 100; n++)
      await new Promise((r) => setTimeout(r, 50));
    data = JSON.parse(fs.readFileSync(backup, "utf8"));
    assert.equal(data.version, 2);
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
    await page.getByRole("button", { name: "복원", exact: true }).click();
    await page
      .getByRole("heading", { name: "업무 브리핑", exact: true })
      .waitFor();
    await nav("업무 메모");
    await page.getByRole("heading", { name: "복원 확인 메모" }).waitFor();
    // Broken references must be rejected before overwriting current data.
    fs.writeFileSync(backup, JSON.stringify({ ...data, patrols: [] }));
    await page.getByRole("button", { name: "복원", exact: true }).click();
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
    await page
      .getByRole("heading", { name: "순찰 기록 등록", exact: true })
      .waitFor();
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
    console.log(
      "PASS: DD/DMS 좌표 입력·검증·수정·검색·지우기·브리핑, 순찰→인수인계, 제출·달력 연계, 검색, 완료 기록, 백업·복원/잘못된 백업 거부, 브리핑 출력, 재실행 보존, 폴더 등록",
    );
  } finally {
    if (app) await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
