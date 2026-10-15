// Repeatable visual review; all storage lives in a disposable Electron profile.
// Build first: npm run build && node tests/ui-review.cjs
// PARK_REVIEW_DIR=/tmp/review PARK_REVIEW_STAGE=after PARK_REVIEW_STRICT=1 node tests/ui-review.cjs
const { _electron: electron } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty } = require("../shared/model.mjs");
const { REVIEW_DATE, reviewFixture } = require("./review-fixture.cjs");

const root = path.resolve(__dirname, "..");
const date = process.env.PARK_REVIEW_DATE || REVIEW_DATE;
const stage = process.env.PARK_REVIEW_STAGE || "review";
if (!/^[a-zA-Z0-9_-]+$/.test(stage)) throw new Error("PARK_REVIEW_STAGE must be a simple directory name.");
const output = path.resolve(process.env.PARK_REVIEW_DIR || path.join(os.tmpdir(), "park-workdesk-review"), stage);
const profiles = fs.mkdtempSync(path.join(os.tmpdir(), "park-ui-review-profile-"));
fs.mkdirSync(output, { recursive: true });

const viewports = [
  { width: 1280, height: 800, zoom: 1 },
  { width: 1360, height: 900, zoom: 1 },
  { width: 960, height: 680, zoom: 1 },
  ...(process.env.PARK_REVIEW_ZOOM === "1" ? [{ width: 1280, height: 800, zoom: 1.25 }] : []),
];
const report = {
  stage,
  date,
  fixture: { fictional: true, employees: 14, unregisteredOnReferenceDay: 2, organizations: 2, bases: 2 },
  note: "All names, records and organizations are fictional. Screenshots use a temporary profile; table-internal horizontal scrolling is allowed. Layout measurements are a review aid, not an aesthetic score.",
  runs: [],
  errors: [],
  externalRequests: [],
};

async function stabilize(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    for (const element of document.querySelectorAll("main,.content,.table-scroll")) element.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function geometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { x: Math.round(value.x), top: Math.round(value.top), right: Math.round(value.right), bottom: Math.round(value.bottom), width: Math.round(value.width), height: Math.round(value.height) };
    };
    const visible = (element) => {
      const value = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return value.width > 0 && value.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const rows = [...document.querySelectorAll(".roster-table tbody tr,.week-table tbody tr")];
    const visibleRows = rows.filter((row) => {
      const box = row.getBoundingClientRect();
      const scroll = row.closest(".table-scroll");
      const limit = scroll ? Math.min(scroll.getBoundingClientRect().bottom, innerHeight) : innerHeight;
      return visible(row) && box.top >= 0 && box.bottom <= limit;
    });
    const workLine = [...document.querySelectorAll(".work-line,.timeline-row")].find(visible);
    const header = document.querySelector(".roster-table thead,.week-table thead");
    const forms = [...document.querySelectorAll("main form")].filter((form) => visible(form) && !form.closest("dialog"));
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      heading: document.querySelector("main h1")?.textContent?.trim(),
      pageHorizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth, document.body.scrollWidth - document.body.clientWidth),
      firstWorkRow: rect(workLine),
      tableHeader: rect(header),
      employeeRows: rows.length,
      visibleEmployeeRows: visibleRows.length,
      rowHeights: rows.slice(0, 10).map((row) => Math.round(row.getBoundingClientRect().height)),
      defaultVisibleForms: forms.map((form) => ({ fields: form.querySelectorAll("input,textarea,select").length, rect: rect(form) })),
      openDialogs: [...document.querySelectorAll("dialog[open]")].map((dialog) => ({ label: dialog.getAttribute("aria-label"), rect: rect(dialog), focusedInside: dialog.contains(document.activeElement) })),
      recordCount: document.querySelectorAll(".record").length,
      tableScrollAreas: [...document.querySelectorAll(".table-scroll")].map((element) => ({ rect: rect(element), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
    };
  });
}

(async () => {
  let app;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        `--user-data-dir=${path.join(profiles, "profile")}`,
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(profiles, "config"), XDG_CACHE_HOME: path.join(profiles, "cache") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => report.errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    page.context().on("request", (request) => {
      if (/^https?:/i.test(request.url())) report.externalRequests.push(request.url());
    });
    await page.clock.install({ time: new Date(`${date}T09:30:00+09:00`) });
    await page.locator("main h1").waitFor();
    const fixture = reviewFixture(date);
    const seed = async (data) => {
      await page.evaluate(async (value) => {
        if (!window.workdesk) throw new Error("Desktop preload API was not available.");
        await window.workdesk.save(value);
      }, data);
      await page.reload();
      await page.locator("main h1").waitFor();
      await page.waitForFunction(() => {
        const indicator = document.querySelector(".save-indicator");
        if (!indicator) return false;
        const state = indicator.getAttribute("data-state");
        return state ? state === "ready" : /내 PC 저장|이 PC에 저장/.test(indicator.textContent || "");
      });
    };
    const nav = async (name) => {
      await page.locator("nav").getByRole("button", { name, exact: true }).click();
      await page.locator("main h1").waitFor();
    };
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await app.evaluate(({ BrowserWindow }, zoom) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(zoom), viewport.zoom);
      await seed(fixture);
      const run = { viewport, pages: {}, checks: [] };
      report.runs.push(run);
      const check = (name, passed, details) => run.checks.push({ name, passed: Boolean(passed), details });
      const capture = async (name) => {
        await stabilize(page);
        run.pages[name] = await geometry(page);
        const filename = `${viewport.width}x${viewport.height}${viewport.zoom !== 1 ? "-zoom125" : ""}-${name}.png`;
        await page.screenshot({ path: path.join(output, filename), animations: "disabled", fullPage: false });
        check(`${name}: page has no horizontal overflow`, run.pages[name].pageHorizontalOverflow <= 1, run.pages[name].pageHorizontalOverflow);
        return run.pages[name];
      };
      const home = await capture("home");
      if (viewport.width === 1280 && viewport.zoom === 1) check("home: first real work row starts at or above 300px", home.firstWorkRow && home.firstWorkRow.top <= 300, home.firstWorkRow);
      await nav("사무소 현황");
      await page.getByLabel("근무현황 날짜", { exact: true }).fill(date);
      const day = await capture("office-day");
      if (viewport.width === 1280 && viewport.zoom === 1) {
        check("office: table header starts at or above 330px", day.tableHeader && day.tableHeader.top <= 330, day.tableHeader);
        check("office: at least eight full employee rows visible", day.visibleEmployeeRows >= 8, day.visibleEmployeeRows);
      }
      check("office: all fictional staff retained", day.employeeRows === 14, day.employeeRows);
      await page.getByRole("button", { name: "주간 근무표", exact: true }).click();
      await page.locator(".week-table").waitFor();
      await capture("office-week");
      await page.getByRole("tab", { name: "직원 관리", exact: false }).click();
      const office = await capture("office-directory");
      check("office directory: registration form hidden by default", office.defaultVisibleForms.length === 0 && office.openDialogs.length === 0, office.defaultVisibleForms);
      for (const [label, name, add] of [
        ["현장 순찰", "patrol", "순찰 기록 추가"],
        ["업무 메모", "notes", "메모 추가"],
        ["월간 일정", "calendar", "일정 추가"],
      ]) {
        await nav(label);
        const metrics = await capture(name);
        check(`${name}: registration form hidden by default`, metrics.defaultVisibleForms.length === 0 && metrics.openDialogs.length === 0, metrics.defaultVisibleForms);
        const button = page.getByRole("button", { name: add, exact: true });
        const exists = await button.count();
        check(`${name}: dedicated add action exists`, exists === 1, exists);
        if (exists === 1) {
          await button.click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          await stabilize(page);
          const opened = await geometry(page);
          check(`${name}: add action opens a focused dialog`, opened.openDialogs.length === 1 && opened.openDialogs[0].focusedInside, opened.openDialogs);
          await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}${viewport.zoom !== 1 ? "-zoom125" : ""}-${name}-new.png`), animations: "disabled" });
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "hidden" });
        }
      }
      await seed(empty());
      await capture("empty-home");
      await nav("사무소 현황");
      await capture("empty-office");
    }
  } catch (error) {
    report.errors.push(error.stack || String(error));
  } finally {
    if (app) await app.close().catch((error) => report.errors.push(String(error)));
    fs.rmSync(profiles, { recursive: true, force: true });
    report.externalRequests = [...new Set(report.externalRequests)];
    report.summary = {
      screenshotsDirectory: output,
      checks: report.runs.flatMap((run) => run.checks).length,
      failures: report.runs.flatMap((run) => run.checks.filter((check) => !check.passed).map((check) => ({ viewport: run.viewport, ...check }))),
      errors: report.errors.length,
      externalRequests: report.externalRequests.length,
    };
    fs.writeFileSync(path.join(output, "review.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report.summary, null, 2));
    if (report.errors.length || report.externalRequests.length || (process.env.PARK_REVIEW_STRICT === "1" && report.summary.failures.length)) process.exitCode = 1;
  }
})();
