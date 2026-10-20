// TASK-REVIEW-POSTMERGE-01: 가상 자료만 사용하는 사후 독립 경계 검사.
// 실행: npm run build 후 node tests/postmerge-boundary-audit.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { _electron: electron } = require('playwright');
const store = require('../desktop/store.cjs');
const { validateModules } = require('../shared/applets.mjs');
const { AX_EXAMPLE_SNIPPETS } = require('../shared/ax.mjs');
const { goTo } = require('./nav.cjs');
const root = path.resolve(__dirname, '..');
const cases = [];
async function audit(id, run) {
  const result = { id, passed: false };
  cases.push(result);
  try { await run(result); result.passed = true; }
  catch (error) { result.failure = error.message; }
}
(async () => {
  await audit('MOD-01: 다국어·이모지 정확히 65536바이트 허용·1바이트 초과 거부', result => {
    const configs = text => ({ patrols: { text } });
    const wrap = customConfigs => ({ enabledModuleIds: [], moduleOrder: [], customConfigs });
    const prefix = '가😀'.repeat(9000);
    const padding = 65536 - Buffer.byteLength(JSON.stringify(configs(prefix)));
    const exact = configs(prefix + 'x'.repeat(padding));
    result.exactBytes = Buffer.byteLength(JSON.stringify(exact));
    assert.equal(result.exactBytes, 65536);
    assert.doesNotThrow(() => validateModules(wrap(exact)));
    assert.throws(() => validateModules(wrap(configs(prefix + 'x'.repeat(padding + 1)))), /64KB/);
  });
  await audit('스니펫 저장 실패·보고서 파일 쓰기 실패: 원본·초안 보존 및 안내', async result => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'park-postmerge-'));
    const profile = path.join(dir, 'profile');
    const file = path.join(profile, 'workdesk.json');
    const data = store.empty();
    data.axProjects.push({ id: 'a1', title: '가상 사후검증 사업', zone: 'hq', stage: 'planning',
      budgetTotal: 0, budgetExecuted: 0, manager: '', partner: '', nextMilestone: '',
      nextMilestoneDate: null, risks: '', notes: '', updatedAt: '2026-10-20T00:00:00Z' });
    store.write(file, data);
    const before = fs.readFileSync(file, 'utf8');
    let app;
    try {
      app = await electron.launch({ executablePath: require('electron'),
        args: ['--no-sandbox', '--ozone-platform=headless', '--user-data-dir=' + profile, root],
        env: { ...process.env, TZ: 'Asia/Seoul', XDG_CONFIG_HOME: path.join(dir, 'config') } });
      const page = await app.firstWindow();
      page.setDefaultTimeout(8000);
      const errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.context().on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      await goTo(page, 'GIS·AI 스니펫');
      await page.getByRole('button', { name: '스니펫 등록', exact: true }).click();
      const sheet = page.locator('.sheet[open]');
      await sheet.getByLabel('제목', { exact: true }).fill('가상 저장 실패 초안');
      await sheet.getByLabel('본문', { exact: true }).fill('가상 본문\n<script>실행하지 않음</script>');
      await app.evaluate(({ ipcMain }) => {
        ipcMain.removeHandler('save');
        ipcMain.handle('save', () => { throw new Error('가상 ENOSPC 사후 검증'); });
      });
      await sheet.getByRole('button', { name: '저장', exact: true }).click();
      await sheet.getByText('저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.', { exact: true }).waitFor();
      assert.equal(await sheet.getByLabel('제목', { exact: true }).inputValue(), '가상 저장 실패 초안');
      assert.equal(await sheet.getByLabel('본문', { exact: true }).inputValue(), '가상 본문\n<script>실행하지 않음</script>');
      assert.equal(fs.readFileSync(file, 'utf8'), before);
      // 초안 버리기를 명시적으로 확인한 뒤 보고서 출력에서 실제 파일 오류를 만든다.
      await sheet.getByRole('button', { name: '취소', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '변경 버리기', exact: true }).click();
      await sheet.waitFor({ state: 'hidden' });
      await goTo(page, '보고서 초안');
      const preview = await page.locator('.report-preview').textContent();
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
      }, dir);
      await page.getByRole('button', { name: '파일로 저장', exact: true }).click();
      await page.locator('.ax-report [role="status"]').filter({ hasText: /EISDIR|illegal operation/i }).waitFor();
      assert.equal(await page.locator('.report-preview').textContent(), preview);
      assert.equal(fs.readFileSync(file, 'utf8'), before);
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
      result.unhandledErrors = errors;
      result.externalRequests = requests;
      result.originalUnchanged = true;
    } finally {
      if (app) await app.close().catch(() => {});
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  await audit('SNIP-01: 제공된 DD↔DMS 예제의 음수 1도 미만 왕복', result => {
    const source = AX_EXAMPLE_SNIPPETS.find(s => s.id === 'example-dd-dms').snippet;
    const run = spawnSync('python3', ['-c', source + '\nimport json\nx=-0.5\ndms=dd_to_dms(x)\nprint(json.dumps({"source": x, "dms": dms, "roundtrip": dms_to_dd(*dms)}))'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    Object.assign(result, JSON.parse(run.stdout.trim().split('\n').at(-1)));
    assert.equal(result.roundtrip, result.source, '예제의 좌표 반구(부호)가 왕복 과정에서 바뀌면 안 됨');
  });
  console.log(JSON.stringify({ reviewedSource: 'a70d9aae70bdfd96c303b97080a76e9a04500496', cases }, null, 2));
  if (cases.some(c => !c.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
