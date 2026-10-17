const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const load = () => import("../scripts/board.mjs");
const card = (fields, body = "## 재개 위치\n다음 단계\n") =>
  `---\n${Object.entries({
    id: "TASK-A-01",
    title: "예시",
    status: "ready",
    role: "builder",
    owner: "codex",
    verifier: "claude",
    branch: "task/task-a-01",
    depends: "",
    priority: "P1",
    updated: "2026-10-16",
    ...fields,
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n${body}`;

test("저장소의 과제 카드가 협업 규칙을 지킨다", async () => {
  const { loadCards, validateCards } = await load();
  const cards = loadCards(path.join(__dirname, "../docs/tasks"));
  assert.ok(cards.length > 0);
  assert.deepEqual(validateCards(cards), []);
});

test("한 에이전트의 동시 진행·자기 검증·미완료 의존·검증 없는 완료를 거부한다", async () => {
  const { parseCard, validateCards } = await load();
  const parse = (text, id) => parseCard(text, `docs/tasks/${id}.md`);
  const base = parse(card({ status: "in-progress" }), "TASK-A-01");
  const second = parse(card({ id: "TASK-A-02", branch: "task/task-a-02", status: "in-progress" }), "TASK-A-02");
  assert.match(validateCards([base, second]).join("\n"), /동시에 1개/);
  const self = parse(card({ verifier: "codex" }), "TASK-A-01");
  assert.match(validateCards([self]).join("\n"), /구현자와 검증자가 같습니다/);
  const dep = parse(card({ id: "TASK-A-02", branch: "task/task-a-02", status: "in-progress", depends: "TASK-A-01" }), "TASK-A-02");
  assert.match(validateCards([parse(card({}), "TASK-A-01"), dep]).join("\n"), /아직 done이 아닙니다/);
  const done = parse(card({ status: "done" }, "## 검증 기록\n미실행\n"), "TASK-A-01");
  assert.match(validateCards([done]).join("\n"), /검증 기록/);
  const noResume = parse(card({ status: "review" }, "본문\n"), "TASK-A-01");
  assert.match(validateCards([noResume]).join("\n"), /재개 위치/);
});

test("다음 카드는 진행 중 카드를 먼저, 그다음 의존이 끝난 높은 우선순위를 고른다", async () => {
  const { parseCard, nextFor } = await load();
  const p = (f, id) => parseCard(card({ id, branch: `task/${id.toLowerCase()}`, ...f }), `docs/tasks/${id}.md`);
  const cards = [
    p({ priority: "P2", owner: "none" }, "TASK-A-01"),
    p({ priority: "P0", owner: "none", depends: "TASK-A-03" }, "TASK-A-02"),
    p({ priority: "P1", owner: "none", status: "backlog" }, "TASK-A-03"),
  ];
  assert.equal(nextFor(cards, "codex").id, "TASK-A-01");
  cards.push(p({ status: "in-progress", owner: "codex" }, "TASK-A-04"));
  assert.equal(nextFor(cards, "codex").id, "TASK-A-04");
});
