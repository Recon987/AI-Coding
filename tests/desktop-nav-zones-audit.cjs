// TASK-REVIEW-POSTMERGE-01: NAV-02·LOCATION-01 독립 실제 앱 경계 감사.
// npm run build 후 node tests/desktop-nav-zones-audit.cjs. 임시 가상 자료만 사용한다.
const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const store = require('../desktop/store.cjs');
const root = path.resolve(__dirname, '..');
const report = { reviewedSource: '519b7cc6bb782fd057949d5f1bddb06ca27664cc', cases: [] };
async function audit(id, run, newer = false) {
  const result = { id, passed: false };
  report.cases.push(result);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'park-nav-zones-audit-'));
  const profile = path.join(dir, 'profile');
  const file = path.join(profile, 'workdesk.json');
  store.write(file, store.empty());
  if (newer) fs.writeFileSync(file, JSON.stringify({ ...store.empty(), minReader: 3,
    zones: [{ id: 'z1', code: '3-1', name: '가상 읽기전용 구역', route: '', active: true }] }));
  const before = fs.readFileSync(file, 'utf8');
  let app;
  try {
    app = await electron.launch({ executablePath: require('electron'),
      args: ['--no-sandbox', '--ozone-platform=headless', '--user-data-dir=' + profile, root],
      env: { ...process.env, TZ: 'Asia/Seoul', XDG_CONFIG_HOME: path.join(dir, 'config') } });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator(`.save-indicator[data-state="${newer ? 'read-only' : 'ready'}"]`).waitFor();
    await run({ app, page, file, before, result });
    result.unhandledErrors = errors;
    assert.deepEqual(errors, []);
    result.passed = true;
  } catch (error) { result.failure = error.message; }
  finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
(async () => {
  await audit('NAV-02: 깨진 설정·다른 도구 화면·유효 설정 및 읽기 실패 무저장', async ({ page, file, before, result }) => {
    const key = 'park-workdesk-last-page';
    const menu = page.getByRole('navigation', { name: '주 메뉴' });
    result.settings = [];
    for (const [raw, expected] of [
      ['{깨진JSON', '인수인계'],
      ['["submission"]', '인수인계'],
      ['{"tasks":"ax-report"}', '인수인계'],
      ['{"tasks":"submission"}', '제출 기한'],
    ]) {
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
      await page.reload();
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      await menu.getByRole('button', { name: '인수인계·제출 기한', exact: true }).click();
      await page.getByRole('heading', { level: 1, name: expected, exact: true }).waitFor();
      assert.equal(fs.readFileSync(file, 'utf8'), before);
      result.settings.push({ raw, expected, originalUnchanged: true });
    }
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('가상 설정 읽기 실패'); };
      Storage.prototype.setItem = () => { throw new Error('가상 설정 쓰기 실패'); };
    });
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await menu.getByRole('button', { name: '인수인계·제출 기한', exact: true }).click();
    await page.getByRole('heading', { level: 1, name: '인수인계', exact: true }).waitFor();
    await page.getByRole('navigation', { name: '인수인계·제출 기한 보기' }).getByRole('button', { name: '제출 기한', exact: true }).click();
    await menu.getByRole('button', { name: '업무 브리핑', exact: true }).click();
    await menu.getByRole('button', { name: '인수인계·제출 기한', exact: true }).click();
    await page.getByRole('heading', { level: 1, name: '제출 기한', exact: true }).waitFor();
    assert.equal(fs.readFileSync(file, 'utf8'), before);
    result.storageFailureHandled = true;
  });
  await audit('LOCATION-01: 실제 UTF-8 파일 반입·입력 변경·저장 실패 시 원본/초안 보존', async ({ app, page, file, result }) => {
    await page.locator('.data-menu > summary').click();
    await page.getByRole('button', { name: '담당구역 목록', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: '담당구역 목록' });
    const csv = sheet.getByLabel('반입 CSV', { exact: true });
    const source = 'code,name,route,active\n3-1,가상 한글 파일,"가상 쉼표, 구간",true';
    await sheet.getByLabel('CSV 파일', { exact: true }).setInputFiles({ name: 'valid.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
    await page.waitForFunction(text => document.querySelector('.zone-manager textarea').value === text, source);
    await sheet.getByRole('button', { name: '반입 미리보기', exact: true }).click();
    const apply = sheet.getByRole('button', { name: '확인 후 반입 적용', exact: true });
    await apply.click();
    await sheet.getByRole('status').filter({ hasText: '반입했습니다' }).waitFor();
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).zones.map(z => [z.code, z.route]), [['3-1', '가상 쉼표, 구간']]);
    result.validFileImported = true;
    await csv.fill('code,name,route,active\n3-2,가상 다음 파일,,true');
    await sheet.getByRole('button', { name: '반입 미리보기', exact: true }).click();
    await apply.waitFor();
    await csv.fill('code,name,route,active\n3-3,가상 수정 파일,,true');
    await apply.waitFor({ state: 'hidden' });
    result.editedSourceInvalidatesPreview = true;
    await sheet.getByRole('button', { name: '반입 미리보기', exact: true }).click();
    const beforeFailedSave = fs.readFileSync(file, 'utf8');
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('save');
      ipcMain.handle('save', () => { throw new Error('가상 담당구역 ENOSPC'); });
    });
    await apply.click();
    await page.waitForFunction(() => document.body.textContent.includes('가상 담당구역 ENOSPC'));
    assert.equal(fs.readFileSync(file, 'utf8'), beforeFailedSave);
    assert.equal(await csv.inputValue(), 'code,name,route,active\n3-3,가상 수정 파일,,true');
    assert.equal(await apply.isVisible(), true);
    result.failedSavePreservesOriginalAndPreview = true;
  });
  await audit('LOCATION-01: 미래 자료 읽기 전용에서 반입·삭제 잠금 및 원본 불변', async ({ page, file, before, result }) => {
    await page.locator('.data-menu > summary').click();
    await page.getByRole('button', { name: '담당구역 목록', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: '담당구역 목록' });
    for (const locator of [sheet.getByLabel('CSV 파일', { exact: true }), sheet.getByLabel('반입 CSV', { exact: true }), sheet.getByRole('button', { name: '반입 미리보기', exact: true })])
      assert.equal(await locator.isDisabled(), true);
    const remove = sheet.getByRole('button', { name: '삭제 · 담당구역 3-1', exact: true });
    assert.equal(await remove.getAttribute('aria-disabled'), 'true');
    await remove.evaluate(button => button.click());
    assert.equal(await page.getByRole('alertdialog').count(), 0);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
    result.originalUnchanged = true;
  }, true);
  for (const kind of ['invalid-utf8', 'over-2mb']) {
    await audit(`LOC-01: ${kind} 파일 거부 뒤 이전 미리보기 무효화`, async ({ page, file, before, result }) => {
      await page.locator('.data-menu > summary').click();
      await page.getByRole('button', { name: '담당구역 목록', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: '담당구역 목록' });
      const csv = sheet.getByLabel('반입 CSV', { exact: true });
      await csv.fill('code,name,route,active\n3-1,가상 이전 선택 파일,가상 이전 구간,true');
      await sheet.getByRole('button', { name: '반입 미리보기', exact: true }).click();
      const apply = sheet.getByRole('button', { name: '확인 후 반입 적용', exact: true });
      await apply.waitFor();
      assert.equal(fs.readFileSync(file, 'utf8'), before);
      await sheet.getByLabel('CSV 파일', { exact: true }).setInputFiles({
        name: `${kind}.csv`, mimeType: 'text/csv',
        buffer: kind === 'invalid-utf8' ? Buffer.from([0xff, 0xfe, 0xff]) : Buffer.alloc(2 * 1024 * 1024 + 1, 120),
      });
      await sheet.getByRole('alert').filter({ hasText: kind === 'invalid-utf8' ? 'UTF-8 CSV로 저장한 파일을 선택하세요.' : '2MB 이하의 CSV 파일을 선택하세요.' }).waitFor();
      result.sourceAfterReject = await csv.inputValue();
      result.applyStillVisible = await apply.isVisible();
      result.originalUnchangedBeforeApply = fs.readFileSync(file, 'utf8') === before;
      // 오류 뒤에도 남은 적용 단추가 실제로 이전 파일 자료를 저장하는지 확인한다.
      if (result.applyStillVisible) {
        await apply.click();
        await sheet.getByRole('status').filter({ hasText: '반입했습니다' }).waitFor();
      }
      result.savedCodes = JSON.parse(fs.readFileSync(file, 'utf8')).zones.map(z => z.code);
      result.originalUnchangedAfterApply = fs.readFileSync(file, 'utf8') === before;
      assert.equal(result.applyStillVisible, false, '다른 CSV 파일이 거부되면 이전 파일 미리보기·적용을 무효화해야 함');
      assert.equal(result.originalUnchangedAfterApply, true);
    });
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.cases.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
