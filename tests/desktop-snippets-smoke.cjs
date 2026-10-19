// TASK-AXDESK-02: GIS·AI 스니펫 in the real app — examples only on request and never refilled,
// copy gives back exactly what was saved (한글·따옴표·탭·개행·HTML 글자·큰 본문), copy failure
// is explained, text is never interpreted as HTML, tag limits, filters, search and restart.
// Build first: npm run build && node tests/desktop-snippets-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const L = require("../shared/labels.mjs");
const { AX_EXAMPLE_SNIPPETS } = require("../shared/ax.mjs");

const root = path.resolve(__dirname, "..");
async function launch(dir, profile) {
  const app = await electron.launch({
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
  await page.locator("main h1").waitFor();
  return { app, page };
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-snippets-smoke-"));
  const profile = path.join(dir, "profile");
  const file = path.join(profile, "workdesk.json");
  const saved = () => JSON.parse(fs.readFileSync(file, "utf8"));
  const raw = () => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
  let app;
  try {
    let page;
    ({ app, page } = await launch(dir, profile));
    const sheet = page.locator(".sheet[open]");
    const rows = () => page.locator(".ax-snippet");
    const status = page.locator(".ax-snippets .list-count");
    const clipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());

    // 1. Opening the screen writes nothing; examples come only from the button.
    const before = raw();
    await goTo(page, "GIS·AI 스니펫");
    await page.getByRole("navigation", { name: "AX 사업 관리 보기" }).waitFor();
    assert.equal(raw(), before, "화면을 열기만 해서는 파일을 쓰지 않음");
    await page.getByRole("button", { name: "예제 3개 넣기", exact: true }).click();
    await status.filter({ hasText: "예제 스니펫 3개를 넣었습니다." }).waitFor();
    let data = saved();
    assert.deepEqual(data.axSnippets.map((s) => [s.id, s.example]), AX_EXAMPLE_SNIPPETS.map((s) => [s.id, true]));
    assert.equal(data.modules.customConfigs["ax-desk"].examplesAdded, true);
    assert.equal(await rows().locator(".tag", { hasText: "예제" }).count(), 3);
    // Examples are not the user's records: the home start guide stays.
    await goTo(page, "업무 브리핑");
    await page.getByRole("region", { name: "업무 시작 안내" }).waitFor();
    await goTo(page, "GIS·AI 스니펫");

    // 2. Copy an example: the clipboard holds exactly the stored text.
    const gee = AX_EXAMPLE_SNIPPETS[0];
    await page.getByRole("button", { name: `복사 · ${gee.title}`, exact: true }).click();
    await status.filter({ hasText: `'${gee.title}' 본문을 복사했습니다(${gee.snippet.length.toLocaleString("ko-KR")}자).` }).waitFor();
    assert.equal(await clipboard(), gee.snippet);

    // 3. Own snippet with characters that break naive handling; tags over the limit are refused first.
    const tricky = '한글 "큰따옴표" \'작은따옴표\' `백틱`\n\t탭 들여쓰기\n<script>document.title="x"</script> <b>굵게</b> &amp;\n\n끝 줄';
    await page.getByRole("button", { name: L.addLabel(L.TARGET.axSnippet), exact: true }).click();
    await sheet.getByLabel("제목", { exact: true }).fill("가상 버퍼 분석");
    await sheet.getByLabel("분류", { exact: true }).selectOption({ label: "Python" });
    await sheet.getByLabel("태그", { exact: true }).fill(Array.from({ length: 21 }, (_, i) => `태그${i}`).join(", "));
    await sheet.getByLabel("설명", { exact: true }).fill("가상 설명");
    await sheet.getByLabel("본문", { exact: true }).fill(tricky);
    await sheet.getByRole("button", { name: L.SAVE, exact: true }).click();
    await sheet.getByText("태그는 20개까지 입력할 수 있습니다.").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
    assert.equal(saved().axSnippets.length, 3, "태그 오류면 저장하지 않음");
    await sheet.getByLabel("태그", { exact: true }).fill("NDVI, 버퍼, NDVI");
    await page.keyboard.press("Control+Enter");
    await sheet.waitFor({ state: "hidden" });
    data = saved();
    const mine = data.axSnippets.find((s) => s.title === "가상 버퍼 분석");
    assert.equal(mine.snippet, tricky);
    assert.deepEqual(mine.tags, ["NDVI", "버퍼"], "같은 태그는 한 번만");
    assert.equal(mine.example, undefined);
    const row = rows().filter({ hasText: "가상 버퍼 분석" });
    await row.locator("summary").click();
    // Shown as text: the markup is visible characters, not elements, and nothing ran.
    assert.equal(await row.locator(".snippet-code code").textContent(), tricky);
    assert.equal(await row.locator(".snippet-code code *").count(), 0);
    assert.notEqual(await page.title(), "x");
    await page.getByRole("button", { name: "복사 · 가상 버퍼 분석", exact: true }).click();
    await status.filter({ hasText: "'가상 버퍼 분석' 본문을 복사했습니다" }).waitFor();
    assert.equal(await clipboard(), tricky);

    // 4. A 100,000-character body saves and copies unchanged.
    const big = ("가나다 abc \"q\"\t\n").repeat(10000).slice(0, 100000);
    await page.getByRole("button", { name: L.addLabel(L.TARGET.axSnippet), exact: true }).click();
    await sheet.getByLabel("제목", { exact: true }).fill("가상 큰 본문");
    // Pasted, as people do with long code (Playwright's fill types far too slowly at this size).
    await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), big);
    await sheet.getByLabel("본문", { exact: true }).focus();
    await page.keyboard.press("Control+V");
    await page.waitForFunction(() => document.querySelector(".sheet[open] .snippet-input").value.length === 100000);
    await sheet.getByRole("button", { name: L.SAVE, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    assert.equal(saved().axSnippets.find((s) => s.title === "가상 큰 본문").snippet, big);
    await page.getByRole("button", { name: "복사 · 가상 큰 본문", exact: true }).click();
    await status.filter({ hasText: "(100,000자)" }).waitFor();
    assert.equal(await clipboard(), big);

    // 5. Copy failure is explained and nothing changes.
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error("가상 실패"));
    });
    await page.getByRole("button", { name: "복사 · 가상 버퍼 분석", exact: true }).click();
    await status.filter({ hasText: "'가상 버퍼 분석' 본문을 복사하지 못했습니다. 행을 펼쳐 본문을 직접 선택해 복사하세요." }).waitFor();
    assert.equal(await clipboard(), big, "실패하면 클립보드를 바꾸지 않음");

    // 6. Category filter and search (tags, body).
    const categories = page.getByRole("group", { name: "분류" });
    await categories.getByRole("button", { name: "Python 2", exact: true }).click();
    assert.equal(await categories.getByRole("button", { name: "Python 2", exact: true }).getAttribute("aria-pressed"), "true");
    assert.deepEqual((await rows().locator("h3").allTextContents()).sort(), ["가상 버퍼 분석", AX_EXAMPLE_SNIPPETS[1].title].sort());
    await categories.getByRole("button", { name: "전체 5", exact: true }).click();
    await page.getByLabel("스니펫 검색").fill("버퍼");
    assert.deepEqual(await rows().locator("h3").allTextContents(), ["가상 버퍼 분석"]);
    await page.getByLabel("스니펫 검색").fill("S2_SR_HARMONIZED");
    assert.deepEqual(await rows().locator("h3").allTextContents(), [gee.title]);
    await page.getByLabel("스니펫 검색").fill("");

    // 7. Global search opens the snippet; editing an example makes it the user's own.
    await page.keyboard.press("Control+k");
    await page.getByLabel("기록 통합 검색", { exact: true }).fill("도분초");
    await page.locator(".search-result").first().click();
    await page.getByRole("heading", { name: L.editLabel(L.TARGET.axSnippet), exact: true }).waitFor();
    await sheet.getByText("예제를 고쳐 저장하면 예제 표시가 빠지고 내 스니펫이 됩니다.", { exact: false }).waitFor();
    await sheet.getByLabel("설명", { exact: true }).fill("가상 고친 설명");
    await sheet.getByRole("button", { name: L.SAVE, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    assert.equal(saved().axSnippets.find((s) => s.id === "example-dd-dms").example, undefined);

    // 8. Delete everything: the examples are not offered again, also after a restart.
    for (const title of (await rows().locator("h3").allTextContents())) {
      await page.getByRole("button", { name: `삭제 · ${title}`, exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
      await rows().filter({ hasText: title }).waitFor({ state: "detached" });
    }
    await page.getByText("보관한 스니펫이 없습니다. 자주 쓰는 코드나 문구를 등록하세요.").waitFor();
    assert.equal(await page.getByRole("button", { name: "예제 3개 넣기" }).count(), 0);
    await app.close();
    app = undefined;
    ({ app, page } = await launch(dir, profile));
    await goTo(page, "GIS·AI 스니펫");
    await page.getByText("보관한 스니펫이 없습니다. 자주 쓰는 코드나 문구를 등록하세요.").waitFor();
    assert.equal(await page.getByRole("button", { name: "예제 3개 넣기" }).count(), 0);
    data = saved();
    assert.deepEqual([data.axSnippets.length, data.modules.customConfigs["ax-desk"].examplesAdded], [0, true]);
    console.log("PASS: 스니펫 화면 열기만으로 무저장, 예제 3개 요청 시 1회·홈 첫 사용 안내 유지·지운 뒤·재실행 후 재생성 없음, 복사 동일(한글·따옴표·탭·개행·HTML 글자·100,000자)·실패 안내, HTML 미해석, 태그 한도·중복 정리, 분류·검색·통합 검색, 예제 수정 시 내 스니펫");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
