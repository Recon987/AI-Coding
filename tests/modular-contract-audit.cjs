// TASK-REVIEW-MODULAR-01 독립 경계 감사. npm test와 분리해 미해결 결함을 재현한다.
// 실행: node tests/modular-contract-audit.cjs
// 계약을 만족하지 못한 사례가 있으면 종료 코드 1. 실제 사용자 자료에는 접근하지 않는다.
const assert = require('node:assert/strict');
const { validateModules } = require('../shared/applets.mjs');
const { validateAxProjects, milestoneItems } = require('../shared/ax.mjs');
const cases = [];
function audit(id, run) {
  const result = { id, passed: false };
  cases.push(result);
  try { run(result); result.passed = true; }
  catch (error) { result.failure = error.message; }
}
audit('MOD-01: 설정 64KB는 UTF-8 바이트 한도', result => {
  const settings = text => ({ enabledModuleIds: [], moduleOrder: [], customConfigs: { patrols: { text } } });
  const small = settings('가'.repeat(1000));
  assert.doesNotThrow(() => validateModules(small));
  assert.throws(() => validateModules(settings('x'.repeat(70000))), /64KB/);
  const over = settings('가'.repeat(30000));
  result.characters = JSON.stringify(over.customConfigs).length;
  result.utf8Bytes = Buffer.byteLength(JSON.stringify(over.customConfigs), 'utf8');
  assert.ok(result.utf8Bytes > 64 * 1024);
  assert.throws(() => validateModules(over), /64KB/, '한글을 포함한 64KB 초과 설정도 거부해야 함');
});
audit('AX-DATE-01: 허용된 마일스톤 연도를 그대로 유지', result => {
  result.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  result.dates = ['0001-10-21', '0099-10-21', '0100-10-21', '2026-10-21'].map(date => {
    const project = { id: date, title: '가상 날짜 검증', zone: 'hq', stage: 'planning', budgetTotal: 0, budgetExecuted: 0,
      manager: '', partner: '', nextMilestone: '', nextMilestoneDate: date, risks: '', notes: '', updatedAt: '2026-10-19T00:00:00Z' };
    validateAxProjects([project]);
    const [item] = milestoneItems([project], { startDate: date, endDate: date });
    const at = new Date(item.at);
    const derived = [String(at.getFullYear()).padStart(4, '0'), String(at.getMonth() + 1).padStart(2, '0'), String(at.getDate()).padStart(2, '0')].join('-');
    return { source: date, derived };
  });
  assert.ok(result.dates.every(d => d.source === d.derived), '저장 원본 날짜와 달력 파생 날짜가 같아야 함');
});
console.log(JSON.stringify({ cases }, null, 2));
if (cases.some(c => !c.passed)) process.exitCode = 1;
