const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// TASK-DESIGN-TOKENS-01: raw colors live only in :root, sizes come from the 5-step ramp.
const css = fs.readFileSync(path.join(__dirname, "../src/style.css"), "utf8");
const rootEnd = css.indexOf("}", css.indexOf(":root")) + 1;
const rules = css.slice(rootEnd);

test("색은 :root 토큰으로만 쓰고 규칙에 직접 적지 않는다", () => {
  const raw = rules.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(white|black)\b(?=\s*[;}])/g) ?? [];
  assert.deepEqual(raw, []);
});

test("글자 크기는 다섯 단계 토큰만 쓴다", () => {
  const sizes = [...rules.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const allowed = new Set(["var(--fs-xs)", "var(--fs-sm)", "var(--fs-md)", "var(--fs-lg)", "var(--fs-xl)", "inherit"]);
  assert.deepEqual(sizes.filter((size) => !allowed.has(size)), []);
  assert.deepEqual([...css.slice(0, rootEnd).matchAll(/--fs-\w+:\s*(\d+)px/g)].map((m) => +m[1]), [12, 14, 16, 20, 28]);
});

test("상태·분류·근무 색은 서로 다른 의미 토큰을 쓴다", () => {
  for (const token of ["--status-danger", "--status-warning", "--cat-patrol", "--cat-task", "--work-trip", "--work-duty", "--work-base"])
    assert.match(css.slice(0, rootEnd), new RegExp(`${token}:`));
  assert.doesNotMatch(rules, /\.work-status\.trip[^}]*--(warning|amber|status-warning)/);
  assert.doesNotMatch(rules, /\.calendar-chip\.task[^}]*--(warning|amber|status-warning)/);
});
