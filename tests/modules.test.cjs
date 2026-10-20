// TASK-MODULES-01 (Step A): module registry, optional modules/axProjects/axSnippets and the
// one-time pre-modular backup. Spec: docs/specs/modular-ax/implementation.md 3·4·6장.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { normalize, empty, collections, READER_VERSION } = require("../shared/model.mjs");
const { visibleModules, moduleOrder, withModules, validateModules, MODULE_APPLETS, CORE_APPLETS } = require("../shared/applets.mjs");
const { validateAxProjects, validateAxSnippets, executionRate, MAX_AX_RECORDS } = require("../shared/ax.mjs");
store.retry.wait = () => {};

function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-modules-"));
  try {
    return run(dir, path.join(dir, "workdesk.json"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const backups = (dir) => fs.readdirSync(dir).filter((f) => f.includes(".pre-modular-backup-")).sort();
const project = (over = {}) => ({
  id: "p1", title: "가상 환경변화 모니터링", zone: "hq", stage: "execution", budgetTotal: 120000, budgetExecuted: 30000,
  manager: "가상 담당", partner: "가상 업체", nextMilestone: "현장 실증", nextMilestoneDate: "2026-10-31",
  risks: "", notes: "", updatedAt: "2026-10-19T10:00:00+09:00", ...over,
});
const snippet = (over = {}) => ({
  id: "s1", title: "가상 Sentinel-2 불러오기", category: "gee", tags: ["위성영상", "NDVI"],
  snippet: "var s2 = ee.ImageCollection('COPERNICUS/S2_SR');\n// \"따옴표\"·한글", description: "", updatedAt: "2026-10-19T10:00:00+09:00", ...over,
});
// The v3 file as the previous release wrote it: no modular keys at all.
const legacyV3 = () => {
  const { axProjects, axSnippets, ...rest } = empty();
  rest.notes.push({ id: "n1", title: "기존 메모", body: "보존" });
  return rest;
};

test("① 레지스트리: 코어 4종은 끌 수 없고 모듈은 순찰·사무소·AX, 메뉴 정의는 자료에 저장하지 않는다", () => {
  assert.deepEqual(CORE_APPLETS.map((a) => a.id), ["briefing", "calendar", "tasks", "memos"]);
  assert.deepEqual(MODULE_APPLETS.map((a) => a.id), ["patrols", "office", "ax-desk"]);
  // Every existing page is reachable from exactly one applet (except folders/about, kept at the bottom).
  const pages = [...CORE_APPLETS, ...MODULE_APPLETS].flatMap((a) => a.pages);
  for (const page of ["briefing", "calendar", "handover", "submission", "notes", "calls", "patrol", "controls", "office"])
    assert.equal(pages.filter((p) => p === page).length, 1, page);
  assert.equal(collections.includes("modules"), false, "설정 객체는 배열 컬렉션에 섞지 않음");
  assert.equal(Object.hasOwn(empty(), "modules"), false);
  assert.ok(collections.includes("axProjects") && collections.includes("axSnippets"));
});

test("② 기본 표시: 신규는 순찰·AX, 사무소 자료가 있으면 사무소도. 저장된 순서를 따르고 모르는 ID는 숨기기만", () => {
  assert.deepEqual(visibleModules(empty()), ["patrols", "ax-desk"]);
  const withOffice = { ...empty(), employees: [{ id: "e1" }] };
  assert.deepEqual(visibleModules(withOffice), ["patrols", "office", "ax-desk"]);
  const saved = { ...empty(), modules: { enabledModuleIds: ["future-gis", "ax-desk", "office"], moduleOrder: ["ax-desk", "future-gis", "office"], customConfigs: {} } };
  assert.deepEqual(visibleModules(saved), ["ax-desk", "office"]);
  assert.deepEqual(moduleOrder(saved), ["ax-desk", "office", "patrols"]);
  // Changing the choice keeps the unknown module's ID, order and settings.
  const next = withModules({ ...saved, modules: { ...saved.modules, customConfigs: { "future-gis": { layer: 3 } } } }, ["office"]);
  assert.deepEqual(next.enabledModuleIds, ["office", "future-gis"]);
  assert.deepEqual(next.moduleOrder, ["office", "ax-desk", "patrols", "future-gis"]);
  assert.deepEqual(next.customConfigs, { "future-gis": { layer: 3 } });
  assert.deepEqual(visibleModules({ ...empty(), modules: withModules(empty(), []) }), [], "모두 꺼도 됨(코어는 항상 표시)");
});

test("③ modules 검증: 형식·중복·ID·개수·예약 키·설정 크기/깊이/JSON 아닌 값 거부", () => {
  const ok = { enabledModuleIds: ["patrols"], moduleOrder: ["patrols"], customConfigs: {} };
  assert.equal(validateModules(ok), ok);
  const bad = [
    null, [], { ...ok, enabledModuleIds: "patrols" }, { ...ok, enabledModuleIds: ["patrols", "patrols"] },
    { ...ok, moduleOrder: ["Patrols"] }, { ...ok, moduleOrder: ["a".repeat(65)] },
    { ...ok, enabledModuleIds: Array.from({ length: 101 }, (_, i) => `m${i}`) },
    { ...ok, customConfigs: [] }, { ...ok, customConfigs: { "Bad ID": {} } },
    { ...ok, customConfigs: { patrols: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } } } },
    { ...ok, customConfigs: { patrols: { big: "x".repeat(70000) } } },
    { ...ok, customConfigs: { patrols: { n: Number.NaN } } },
    { ...ok, customConfigs: { patrols: { when: new Date() } } },
    JSON.parse('{"enabledModuleIds":[],"moduleOrder":[],"customConfigs":{"patrols":{"__proto__":{"x":1}}}}'),
  ];
  for (const value of bad) assert.throws(() => normalize({ ...empty(), modules: value }), /모듈/, JSON.stringify(value)?.slice(0, 60));
  // A newer version's extra key inside modules is kept.
  const future = { ...ok, pinned: ["ax-desk"] };
  assert.deepEqual(normalize({ ...empty(), modules: future }).modules, future);
});

test("④ 기존 v3·minReader·모르는 최상위 항목과 함께 왕복해도 그대로", () => {
  const data = { ...legacyV3(), minReader: READER_VERSION, futureKey: { a: 1 }, modules: withModules(empty(), ["office"]) };
  const out = normalize(data);
  assert.equal(out.minReader, READER_VERSION, "minReader를 낮추거나 올리지 않음");
  assert.deepEqual(out.futureKey, { a: 1 });
  assert.deepEqual(out.modules, data.modules);
  assert.deepEqual(out.notes, data.notes);
  assert.deepEqual(out.axProjects, []);
  assert.equal(Object.hasOwn(normalize(legacyV3()), "modules"), false, "modules는 사용자가 바꾸기 전에는 쓰지 않음");
});

test("⑤ 개편 전 보호본: 열기만 하면 쓰지 않고, 첫 저장 때 한 번 바이트 그대로, 다음 저장부터는 만들지 않음", () =>
  sandbox((dir, file) => {
    fs.writeFileSync(file, JSON.stringify(legacyV3(), null, 1));
    const original = fs.readFileSync(file);
    store.read(file);
    assert.deepEqual(backups(dir), [], "읽기만으로는 보호본도 저장도 없음");
    assert.deepEqual(fs.readFileSync(file), original);
    store.write(file, store.read(file), { keepLastGood: true });
    const [copy] = backups(dir);
    assert.ok(copy, "첫 저장 때 보호본");
    assert.deepEqual(fs.readFileSync(path.join(dir, copy)), original, "바이트 그대로");
    assert.ok(Object.hasOwn(JSON.parse(fs.readFileSync(file, "utf8")), "axProjects"));
    store.write(file, store.read(file), { keepLastGood: true });
    assert.equal(backups(dir).length, 1, "한 번만");
    // Restore-copy pruning never treats it as a restore copy.
    for (let i = 0; i < 7; i++) fs.writeFileSync(`${file}.before-restore-${i + 1}.json`, "{}");
    store.pruneRestoreCopies(file);
    assert.equal(backups(dir).length, 1);
  }));

test("⑤ 보호본을 못 만들면 원본을 바꾸지 않고, 같은 시각 이름은 피한다", () =>
  sandbox((dir, file) => {
    fs.writeFileSync(file, JSON.stringify(legacyV3()));
    const original = fs.readFileSync(file);
    fs.writeFileSync(`${file}.pre-modular-backup-1000.json`, "다른 파일");
    const copy = store.preModularBackup(file, 1000);
    assert.equal(path.basename(copy), "workdesk.json.pre-modular-backup-1001.json");
    assert.equal(fs.readFileSync(`${file}.pre-modular-backup-1000.json`, "utf8"), "다른 파일", "기존 파일을 덮지 않음");
    const other = path.join(dir, "other.json");
    fs.writeFileSync(other, JSON.stringify(legacyV3()));
    const otherBytes = fs.readFileSync(other);
    const copyFile = fs.copyFileSync;
    fs.copyFileSync = () => {
      const error = new Error("가상 ENOSPC");
      error.code = "ENOSPC";
      throw error;
    };
    try {
      assert.throws(() => store.write(other, store.read(other), { keepLastGood: true }), /ENOSPC/);
    } finally {
      fs.copyFileSync = copyFile;
    }
    assert.deepEqual(fs.readFileSync(other), otherBytes, "원본 불변");
    assert.deepEqual(fs.readFileSync(file), original);
  }));

test("⑤ v1/v2 전환은 기존 원본 백업만 남기고 개편 전 보호본을 따로 만들지 않는다", () =>
  sandbox((dir, file) => {
    fs.writeFileSync(file, JSON.stringify({ version: 2, notes: [{ id: "n", title: "v2 메모", body: "" }], calls: [], events: [], folders: [], patrols: [], tasks: [] }));
    store.migrateFile(file);
    assert.deepEqual(backups(dir), []);
    assert.ok(fs.existsSync(`${file}.v2-backup.json`));
    const out = store.read(file);
    assert.equal(out.notes[0].title, "v2 메모");
    assert.deepEqual(out.axSnippets, []);
  }));

test("⑦ AX 사업 검증: 필수·권역·단계·ID 중복·날짜, 입력 객체를 바꾸지 않음", () => {
  const list = [project()];
  const frozen = JSON.stringify(list);
  assert.equal(validateAxProjects(list), list);
  assert.equal(JSON.stringify(list), frozen);
  for (const bad of [
    { title: " " }, { title: "가".repeat(201) }, { zone: "본사" }, { stage: "기획" }, { nextMilestoneDate: "2026-02-30" },
    { nextMilestoneDate: "2026/10/31" }, { updatedAt: "어제" }, { notes: "x".repeat(4001) }, { manager: 3 },
  ])
    assert.throws(() => validateAxProjects([project(bad)]), undefined, JSON.stringify(bad));
  assert.throws(() => validateAxProjects([project(), project()]), /ID/);
  assert.doesNotThrow(() => validateAxProjects([project({ nextMilestoneDate: null, nextMilestone: "" })]));
});

test("⑧ 금액: 0·음수·NaN·무한대·초과 집행 — 초과 집행은 그대로 두고 집행률은 1을 넘는다", () => {
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, "1000", null, 1e10])
    assert.throws(() => validateAxProjects([project({ budgetTotal: bad })]), /사업비/, String(bad));
  const over = project({ budgetTotal: 100, budgetExecuted: 130 });
  assert.equal(validateAxProjects([over])[0].budgetExecuted, 130, "임의로 100%로 줄이지 않음");
  assert.equal(executionRate(over), 1.3);
  assert.equal(executionRate(project({ budgetTotal: 0, budgetExecuted: 0 })), null, "예산 미등록은 나누지 않음");
  assert.equal(executionRate(project({ budgetTotal: 0, budgetExecuted: 5 })), null);
});

test("⑨ 스니펫: 분류·태그·한글/따옴표/개행 그대로·크기 한도", () => {
  const s = snippet();
  const round = normalize({ ...empty(), axSnippets: [s] }).axSnippets[0];
  assert.equal(round.snippet, s.snippet);
  assert.doesNotThrow(() => validateAxSnippets([snippet({ snippet: "가".repeat(100000), example: true })]));
  for (const bad of [
    { category: "GEE" }, { tags: ["a", "a"] }, { tags: [""] }, { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
    { snippet: "x".repeat(100001) }, { title: "" }, { example: false }, { description: 1 },
  ])
    assert.throws(() => validateAxSnippets([snippet(bad)]), undefined, JSON.stringify(bad).slice(0, 60));
});

test("⑩ 각 AX 목록 10,000건 한도", () => {
  assert.equal(MAX_AX_RECORDS, 10000);
  const many = Array.from({ length: 10001 }, (_, i) => project({ id: `p${i}` }));
  assert.throws(() => validateAxProjects(many), /10,000건/);
  assert.doesNotThrow(() => validateAxProjects(many.slice(1)));
});

// MOD-01 (Codex 2026-10-19): the 64KB limit counts UTF-8 bytes, not characters.
test("MOD-01: 모듈 설정 64KB는 UTF-8 바이트 기준(정확히 한도는 허용, 1바이트 초과는 거부)", () => {
  const { validateModules, jsonBytes } = require("../shared/applets.mjs");
  const LIMIT = 64 * 1024;
  const settings = (text) => ({ enabledModuleIds: [], moduleOrder: [], customConfigs: { patrols: { text } } });
  // {"patrols":{"text":"…"}} wraps the text in 23 bytes.
  const frame = jsonBytes({ patrols: { text: "" } });
  assert.equal(frame, 23);
  assert.doesNotThrow(() => validateModules(settings("x".repeat(LIMIT - frame))), "ASCII 정확히 64KB");
  assert.throws(() => validateModules(settings("x".repeat(LIMIT - frame + 1))), /64KB/);
  // 한글 is 3 bytes: 65536 - 23 = 65,513 = 21,837 × 3 + 2, so 21,837 characters + 2 ASCII bytes is exactly 64KB.
  const korean = "가".repeat(21837) + "xx";
  assert.equal(jsonBytes({ patrols: { text: korean } }), LIMIT);
  assert.doesNotThrow(() => validateModules(settings(korean)), "한글 정확히 64KB");
  assert.throws(() => validateModules(settings(korean + "x")), /64KB/);
  // Codex reproduction: 30,000 characters but 90,023 bytes.
  assert.equal(jsonBytes({ patrols: { text: "가".repeat(30000) } }), 90023);
  assert.throws(() => validateModules(settings("가".repeat(30000))), /64KB/);
});

test("MOD-01: 한도를 넘는 설정이 든 기존 파일은 원본 그대로 보관하고 이유를 알린 뒤 사용자가 고른다", async () => {
  const { openDataFile } = require("../desktop/recovery.cjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-mod01-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const big = { ...store.empty(), modules: { enabledModuleIds: ["patrols"], moduleOrder: ["patrols"], customConfigs: { patrols: { text: "가".repeat(30000) } } } };
    fs.writeFileSync(file, JSON.stringify(big));
    const raw = fs.readFileSync(file);
    const seen = [];
    const dialog = {
      async showMessageBox(options) {
        seen.push(options);
        return { response: options.cancelId };
      },
      async showOpenDialog() {
        return { canceled: true, filePaths: [] };
      },
      showErrorBox() {},
    };
    assert.equal(await openDataFile({ file, store, dialog, now: () => Date.parse("2026-10-19T00:00:00Z") }), false);
    assert.deepEqual(fs.readFileSync(file), raw, "종료를 고르면 원본을 바꾸지 않음");
    const copies = fs.readdirSync(dir).filter((name) => name.includes(".corrupt-"));
    assert.equal(copies.length, 1);
    assert.deepEqual(fs.readFileSync(path.join(dir, copies[0])), raw, "바이트 그대로 보관");
    assert.match(seen[0].detail, /모듈 설정은 64KB 이하여야 합니다/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
