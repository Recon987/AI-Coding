// 수치 목표를 통과 결과로 꾸미지 않고 같은 가상 자료·환경의 실측을 JSON으로 출력한다.
const { performance } = require("node:perf_hooks");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { _electron: electron } = require("playwright");
const { mixedWorkFixture } = require("./work-fixture.cjs");
const { normalize, calendarItems, collections } = require("../shared/model.mjs");
const { searchRecords } = require("../shared/search.mjs");
const { unifiedWork } = require("../shared/work.mjs");
const store = require("../desktop/store.cjs");
const { goTo } = require("./nav.cjs");
const summary = (a) => { const s = [...a].sort((x, y) => x - y); return { n: s.length, medianMs: +s[Math.floor(s.length / 2)].toFixed(2), p95Ms: +s[Math.ceil(s.length * .95) - 1].toFixed(2), maxMs: +s.at(-1).toFixed(2) }; };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-work-perf-"));
  let app;
  try {
    const data = normalize(mixedWorkFixture());
    const count = Object.fromEntries(collections.filter((k) => data[k].length).map((k) => [k, data[k].length]));
    assert.equal(Object.values(count).reduce((a, b) => a + b, 0), 10000);
    const profile = path.join(dir, "profile"), file = path.join(profile, "workdesk.json");
    store.write(file, data);
    const plain = fs.readFileSync(file, "utf8");
    const result = { environment: { node: process.version, platform: process.platform, arch: process.arch, cpus: os.cpus().length, cpu: os.cpus()[0]?.model }, count, totalRecords: 10000, bytes: Buffer.byteLength(plain), metrics: {}, limits: "측정은 가상 자료·이 Linux 환경 기준. Windows 실기기 성능과 다름. 저장은 정상본 보호까지 포함." };
    const queries = ["가상 작업 3399", "존재하지 않는 검색어", "검토", "협의", "가상 회의 499"];
    const operations = {
      readAndNormalize: () => store.read(file),
      search: (i) => searchRecords(data, queries[i % queries.length]),
      unifiedList: () => unifiedWork(data, new Date("2026-10-20T03:00:00Z")),
      weekCalendar: () => calendarItems(data, { startDate: "2026-10-19", endDate: "2026-10-25" }),
      atomicSaveWithProtection: () => store.write(file, data, { keepLastGood: true }),
    };
    for (const [name, run] of Object.entries(operations)) {
      for (let i = 0; i < 3; i++) run(i);
      const times = [];
      for (let i = 0; i < 30; i++) { const start = performance.now(); run(i); times.push(performance.now() - start); }
      result.metrics[name] = summary(times);
    }
    const starts = [], searches = [], saves = [];
    for (let n = 0; n < 3; n++) {
      const start = performance.now();
      app = await electron.launch({ executablePath: require("electron"), args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []), "--user-data-dir=" + profile, path.resolve(__dirname, "..")], env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000 });
      const page = await app.firstWindow(); page.setDefaultTimeout(15000);
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      await page.locator(".work-line").first().waitFor();
      starts.push(performance.now() - start);
      await page.getByRole("button", { name: "통합 검색 열기", exact: true }).click();
      const search = page.getByRole("dialog", { name: "통합 검색 창", exact: true });
      const input = search.getByRole("textbox");
      for (const query of ["가상 작업 3399", "가상 회의 499", "가상 작업 3399", "가상 회의 499"]) {
        const start = performance.now(); await input.fill(query);
        await search.getByRole("button").filter({ hasText: query }).waitFor();
        searches.push(performance.now() - start);
      }
      await page.keyboard.press("Escape");
      await goTo(page, "작업");
      assert.equal(await page.locator(".list-row").count(), 100, "긴 목록은 100건씩 표시");
      // 자동화 타이핑 시간을 제외하고 저장 클릭→디스크 반영+화면 종료까지 측정.
      await page.getByRole("button", { name: "작업 등록", exact: true }).click();
      const editor = page.getByRole("dialog", { name: "작업 등록", exact: true });
      await editor.getByLabel("작업 제목").fill(`성능 측정 등록 ${n}`);
      const saveStart = performance.now(); await editor.getByRole("button", { name: "저장", exact: true }).click(); await editor.waitFor({ state: "hidden" }); saves.push(performance.now() - saveStart);
      await app.close(); app = undefined;
      store.write(file, data);
    }
    result.metrics.electronStartToToday = summary(starts);
    result.metrics.electronSearchToVisibleResult = summary(searches);
    result.metrics.electronSaveToClosedEditor = summary(saves);
    console.log(JSON.stringify(result, null, 2));
  } finally { if (app) await app.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
