// Core field-work tasks measured on the real Electron app with fictional data.
// Counts the shortest designed path (clicks, fields, typed characters, page moves,
// off-screen targets). It is a review aid, not a usability test with people.
// Build first: npm run build && node tests/task-flows.cjs
const { _electron: electron } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { REVIEW_DATE, reviewFixture } = require("./review-fixture.cjs");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.PARK_FLOW_OUT || path.join(os.tmpdir(), "park-workdesk-flows.json"));
const profiles = fs.mkdtempSync(path.join(os.tmpdir(), "park-flow-profile-"));

function counter(page) {
  const c = { clicks: 0, fields: 0, typed: 0, pageMoves: 0, offscreen: 0 };
  const heading = () => page.locator("main h1").first().textContent();
  const offscreen = async (locator) => {
    const box = await locator.boundingBox();
    const height = await page.evaluate(() => innerHeight);
    if (box && (box.y < 0 || box.y + box.height > height)) c.offscreen++;
  };
  return {
    c,
    async click(locator) {
      await locator.waitFor();
      await offscreen(locator);
      const before = await heading();
      await locator.click();
      c.clicks++;
      const after = await heading();
      if (after !== before) c.pageMoves++;
    },
    async fill(locator, text) {
      await offscreen(locator);
      await locator.fill(text);
      c.fields++;
      c.typed += [...text].length;
    },
    async select(locator, value) {
      await offscreen(locator);
      await locator.selectOption(value);
      c.clicks += 2;
      c.fields++;
    },
  };
}

(async () => {
  const report = { date: REVIEW_DATE, viewport: "1280x800", note: "Shortest designed path on fictional data. Typed characters use realistic short Korean entries.", tasks: [], errors: [] };
  let app;
  let closing = false;
  try {
    app = await electron.launch({
      executablePath: require("electron"),
      args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []), `--user-data-dir=${path.join(profiles, "profile")}`, root],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(profiles, "config"), XDG_CACHE_HOME: path.join(profiles, "cache") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    app.process().on("exit", (code, signal) => closing || report.errors.push(`Electron exited (${code}, ${signal})`));
    page.on("console", (m) => m.type() === "error" && report.errors.push(`console: ${m.text()}`));
    page.setDefaultTimeout(8000);
    await page.setViewportSize({ width: 1280, height: 800 });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    await page.clock.install({ time: new Date(`${REVIEW_DATE}T09:30:00+09:00`) });
    await page.locator("main h1").waitFor();
    await page.evaluate((v) => window.workdesk.save(v), reviewFixture(REVIEW_DATE));
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();

    const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true });
    const sheet = () => page.locator(".sheet[open]");
    const home = async () => {
      await page.keyboard.press("Escape");
      await nav("업무 브리핑").click();
      await page.getByRole("heading", { name: "업무 브리핑", exact: true }).waitFor();
    };

    const only = process.env.PARK_FLOW_ONLY?.split(",");
    async function task(id, name, run) {
      if (only && !only.includes(id)) return;
      await home();
      const t = counter(page);
      const started = Date.now();
      let result = "완료";
      let note = "";
      try {
        note = (await run(t)) || "";
      } catch (error) {
        result = "실패";
        note = error.message.split("\n")[0];
      }
      report.tasks.push({ id, name, result, ...t.c, ms: Date.now() - started, note });
    }

    await task("T1", "출근 확인: 기한 경과·오늘 마감과 오늘 당직자 확인", async () => {
      const strip = page.getByLabel("오늘 상태");
      await strip.getByRole("button", { name: /^기한 경과/ }).waitFor();
      await strip.getByRole("button", { name: /^오늘 당직 (주간당직|숙직) / }).waitFor();
      return "홈 상단 상태 띠(기한 경과·오늘 마감·오늘 통제·오늘 당직)에서 클릭 없이 확인";
    });

    await task("T2", "현장 복귀 후 순찰 기록(주의 등급, 구간·확인·조치)", async (t) => {
      await t.click(nav("현장 순찰"));
      await t.click(page.getByRole("button", { name: "순찰 기록 추가", exact: true }));
      await t.fill(page.getByLabel("기록 제목"), "오후 계곡 순찰");
      await t.fill(page.getByLabel("순찰 구간"), "계곡안내소 → 쉼터");
      await t.fill(page.getByLabel("기록자"), "홍길동");
      await t.select(page.getByLabel("확인 등급"), "attention");
      await t.fill(page.getByLabel("확인 사항"), "샛길 출입 2명 계도");
      await t.fill(page.getByLabel("현장 조치"), "출입금지 안내");
      await t.click(sheet().getByRole("button", { name: "순찰 저장", exact: true }));
      await page.getByRole("heading", { name: "오후 계곡 순찰", exact: true }).waitFor();
      return "구간·기록자를 매번 직접 입력. 순찰 종류·위반 유형 선택지가 없어 '샛길 계도'는 자유 텍스트로만 남음";
    });

    await task("T3", "방금 순찰에서 인수인계 만들기(담당·마감)", async (t) => {
      await t.click(nav("현장 순찰"));
      const record = page.locator(".record").filter({ has: page.getByRole("heading", { name: "오후 계곡 순찰", exact: true }) });
      await t.click(record.getByRole("button", { name: /^인수인계로 연결 · / }));
      await t.fill(page.getByLabel("담당자", { exact: true }), "김담당");
      await t.fill(page.getByLabel("마감 일시"), "2026-10-16T09:00");
      await t.click(sheet().getByRole("button", { name: /^(변경 저장|업무 등록)$/ }));
      await sheet().waitFor({ state: "hidden" });
      return "순찰 내용이 본문으로 이어져 재입력은 없음";
    });

    await task("T4", "제출 기한 등록(제출처·마감)", async (t) => {
      await t.click(nav("제출 기한"));
      await t.click(page.getByRole("button", { name: "제출 기한 추가", exact: true }));
      await t.fill(page.getByLabel("업무 제목"), "주간 순찰 실적 제출");
      await t.fill(page.getByLabel("제출처"), "자원보전부");
      await t.fill(page.getByLabel("마감 일시"), "2026-10-17T17:00");
      await t.click(sheet().getByRole("button", { name: "업무 등록", exact: true }));
      await sheet().waitFor({ state: "hidden" });
    });

    await task("T2b", "순찰 기록에 단속 건 추가(종류·담당구역·유형·건수·위경도)", async (t) => {
      await t.click(nav("현장 순찰"));
      const record = page.locator(".record").filter({ has: page.getByRole("heading", { name: "오후 계곡 순찰", exact: true }) });
      await t.click(record.getByRole("button", { name: /^수정 · / }));
      await t.select(page.getByLabel("순찰 종류"), "enforcement");
      await t.fill(page.getByLabel("담당구역 번호"), "3-2");
      await t.click(page.getByRole("button", { name: "+ 단속·확인 건 추가" }));
      const row = page.getByRole("group", { name: "단속·확인 1" });
      await t.fill(row.getByLabel("유형"), "샛길·출입금지구역 출입");
      await t.fill(row.getByLabel("건수"), "2");
      await t.click(row.locator(".observation-location > summary"));
      await t.fill(row.getByLabel("위도 (DD)", { exact: true }), "37.6512");
      await t.fill(row.getByLabel("경도 (DD)", { exact: true }), "126.9771");
      await t.click(sheet().getByRole("button", { name: "변경 저장", exact: true }));
      await sheet().waitFor({ state: "hidden" });
      return "유형은 제안 목록에서 고를 수 있음(datalist). 조치 기본값은 계도";
    });

    await task("T5", "이번 주 샛길 출입 단속 건수 집계", async (t) => {
      await t.click(nav("현장 순찰"));
      const row = page.locator(".summary-table tbody tr").filter({ hasText: "샛길·출입금지구역 출입" });
      const count = await row.locator("td").first().textContent();
      if (count !== "2") throw new Error(`집계 값이 2가 아님: ${count}`);
      return "현장 순찰 화면 상단 '단속·확인 집계'(이번 주)에서 바로 보임";
    });

    await task("T6a", "기상특보 통제 등록(구간·사유·시작일, 종료일 비움)", async (t) => {
      await t.click(nav("탐방로 통제"));
      await t.click(page.getByRole("button", { name: "통제 등록", exact: true }));
      await t.fill(page.getByLabel("통제 구간·대상"), "계곡 탐방로 전 구간");
      await t.select(page.getByLabel("통제 사유"), "weather");
      await t.click(sheet().getByRole("button", { name: "통제 저장", exact: true }));
      await sheet().waitFor({ state: "hidden" });
      return "시작일 기본값 오늘, 종료일 비우면 해제 시까지";
    });

    await task("T6", "오늘 통제 중인 탐방로 구간 확인", async (t) => {
      const line = page.getByRole("button", { name: /오늘 통제 1곳/ });
      await line.waitFor();
      await page.locator(".timeline-row").filter({ hasText: "계곡 탐방로 전 구간" }).waitFor();
      return "홈 상단 '오늘 통제 N곳'과 오늘의 기록(종일)에 바로 보임 — 클릭 0";
    });

    await task("T7", "전화 메모 회신 처리", async (t) => {
      await t.click(nav("전화메모"));
      await t.click(page.getByRole("button", { name: /^처리 완료 · / }).first());
    });

    await task("T8", "퇴근 전 오늘 브리핑 미리보기", async (t) => {
      await t.click(page.getByRole("button", { name: "브리핑 미리보기", exact: true }));
      await page.locator(".report-preview pre").waitFor();
      return "TXT 내보내기는 +1클릭과 저장 대화상자";
    });
  } catch (error) {
    report.errors.push(error.message);
  } finally {
    closing = true;
    if (app) await app.close().catch(() => {});
    fs.rmSync(profiles, { recursive: true, force: true });
  }
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.table(report.tasks.map(({ id, result, clicks, fields, typed, pageMoves, offscreen }) => ({ id, result, clicks, fields, typed, pageMoves, offscreen })));
  for (const t of report.tasks) console.log(`${t.id} ${t.name}: ${t.note}`);
  if (report.errors.length) {
    console.error(report.errors);
    process.exitCode = 1;
  }
})();
