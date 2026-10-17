// Task board for multi-agent work: reads docs/tasks/*.md front matter,
// validates the coordination rules and prints the current board.
// Usage: node scripts/board.mjs [--check] [--next <owner>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATUSES = ["backlog", "ready", "in-progress", "review", "blocked", "done"];
export const ROLES = ["orchestrator", "builder", "verifier", "domain", "design"];
export const OWNERS = ["codex", "gemini", "claude", "user", "none"];
export const PRIORITIES = ["P0", "P1", "P2", "P3"];
const REQUIRED = ["id", "title", "status", "role", "owner", "verifier", "branch", "depends", "priority", "updated"];

export function parseCard(text, file = "card") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${file}: 머리말(---)이 없습니다.`);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const at = line.indexOf(":");
    if (at < 1) throw new Error(`${file}: 머리말 줄 형식을 확인하세요: ${line}`);
    fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { ...fields, body: match[2], file };
}

export function validateCards(cards) {
  const errors = [];
  const ids = new Map(cards.map((c) => [c.id, c]));
  if (ids.size !== cards.length) errors.push("카드 ID가 중복됩니다.");
  const active = new Map();
  for (const c of cards) {
    const where = c.file;
    for (const key of REQUIRED)
      if (c[key] === undefined) errors.push(`${where}: '${key}' 필드가 없습니다.`);
    if (path.basename(where, ".md") !== c.id) errors.push(`${where}: 파일명과 id가 다릅니다.`);
    if (!/^TASK-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(c.id ?? "")) errors.push(`${where}: id 형식은 TASK-ABC-01 입니다.`);
    if (!STATUSES.includes(c.status)) errors.push(`${where}: status '${c.status}'`);
    if (!ROLES.includes(c.role)) errors.push(`${where}: role '${c.role}'`);
    if (!OWNERS.includes(c.owner)) errors.push(`${where}: owner '${c.owner}'`);
    if (!OWNERS.includes(c.verifier)) errors.push(`${where}: verifier '${c.verifier}'`);
    if (!PRIORITIES.includes(c.priority)) errors.push(`${where}: priority '${c.priority}'`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.updated ?? "")) errors.push(`${where}: updated는 YYYY-MM-DD`);
    // Cloud agents may be pinned to a session branch (claude/..., codex/...).
    if (
      c.branch !== `task/${(c.id ?? "").toLowerCase()}` &&
      !/^(claude|codex|gemini)\/[\w.-]+$/.test(c.branch ?? "")
    )
      errors.push(`${where}: branch는 task/${(c.id ?? "").toLowerCase()} 또는 에이전트 세션 브랜치여야 합니다.`);
    if (c.owner !== "none" && c.owner !== "user" && c.owner === c.verifier)
      errors.push(`${where}: 구현자와 검증자가 같습니다 (${c.owner}).`);
    const deps = (c.depends ?? "").split(",").map((d) => d.trim()).filter(Boolean);
    for (const d of deps) if (!ids.has(d)) errors.push(`${where}: 없는 의존 카드 ${d}`);
    if (["in-progress", "review"].includes(c.status)) {
      if (c.owner === "none") errors.push(`${where}: ${c.status} 카드에는 owner가 필요합니다.`);
      if (!/##\s*재개 위치/.test(c.body)) errors.push(`${where}: '## 재개 위치' 절이 필요합니다.`);
      for (const d of deps)
        if (ids.get(d) && ids.get(d).status !== "done")
          errors.push(`${where}: 의존 카드 ${d}가 아직 done이 아닙니다.`);
    }
    if (c.status === "in-progress") {
      if (active.has(c.owner))
        errors.push(`${where}: ${c.owner}는 이미 ${active.get(c.owner)}를 진행 중입니다 (동시에 1개).`);
      active.set(c.owner, c.id);
    }
    if (c.status === "done" && !/##\s*검증 기록[\s\S]*?(통과|승인)/.test(c.body))
      errors.push(`${where}: done 카드에는 검증 기록(통과/승인)이 필요합니다.`);
  }
  return errors;
}

export function loadCards(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^TASK-.*\.md$/.test(f))
    .sort()
    .map((f) => parseCard(fs.readFileSync(path.join(dir, f), "utf8"), path.join(dir, f)));
}

const rank = (c) => PRIORITIES.indexOf(c.priority);
export function nextFor(cards, owner) {
  const mine = cards.find((c) => c.owner === owner && c.status === "in-progress");
  if (mine) return mine;
  const done = new Set(cards.filter((c) => c.status === "done").map((c) => c.id));
  return cards
    .filter((c) => c.status === "ready" && (c.owner === owner || c.owner === "none"))
    .filter((c) => c.depends.split(",").map((d) => d.trim()).filter(Boolean).every((d) => done.has(d)))
    .sort((a, b) => rank(a) - rank(b))[0];
}

function resumeLine(card) {
  const m = /##\s*재개 위치\s*\r?\n+([^\n]+)/.exec(card.body);
  return m ? m[1].trim() : "";
}

function render(cards) {
  const lines = [];
  for (const status of STATUSES) {
    const rows = cards.filter((c) => c.status === status).sort((a, b) => rank(a) - rank(b));
    if (!rows.length) continue;
    lines.push(`\n[${status}] ${rows.length}`);
    for (const c of rows) {
      lines.push(`  ${c.priority} ${c.id.padEnd(22)} ${c.role.padEnd(12)} ${c.owner.padEnd(6)}→${c.verifier.padEnd(6)} ${c.title}`);
      if (["in-progress", "review", "blocked"].includes(status) && resumeLine(c))
        lines.push(`       재개: ${resumeLine(c)}`);
    }
  }
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../docs/tasks");
  const cards = loadCards(dir);
  const errors = validateCards(cards);
  const args = process.argv.slice(2);
  if (args.includes("--next")) {
    const owner = args[args.indexOf("--next") + 1];
    const card = nextFor(cards, owner);
    console.log(card ? `${card.id} (${card.status}) ${card.title}\n${card.file}` : `${owner}: 지금 할 수 있는 카드가 없습니다.`);
  } else if (!args.includes("--check")) console.log(render(cards));
  if (errors.length) {
    console.error(`\n카드 규칙 위반 ${errors.length}건:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
}
