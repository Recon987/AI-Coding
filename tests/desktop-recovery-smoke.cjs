// Starts the real Electron app on a damaged workdesk.json and chooses the last-good copy.
// Build first: npm run build && node tests/desktop-recovery-smoke.cjs
// Development Electron only: the packaged executable has no -r preload option.
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-recovery-smoke-"));
  const profile = path.join(dir, "profile");
  const file = path.join(profile, "workdesk.json");
  const log = path.join(dir, "dialog.log");
  const data = store.empty();
  data.notes.push({ id: "n1", title: "정상본 메모", body: "가상 자료" });
  store.write(file, data, { keepLastGood: true });
  fs.writeFileSync(file, '{"version":3,"notes":[');
  let app;
  try {
    app = await electron.launch({
      executablePath: require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + profile,
        // Electron's development launcher preloads the stub into the main process.
        "-r",
        path.join(__dirname, "recovery-dialog-stub.cjs"),
        root,
      ],
      env: {
        ...process.env,
        PARK_TEST_RECOVERY_ANSWER: "마지막 정상본으로 시작",
        PARK_TEST_RECOVERY_LOG: log,
        XDG_CONFIG_HOME: path.join(dir, "config"),
      },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    await page.getByRole("heading", { name: "업무 브리핑", exact: true }).waitFor();
    const shown = fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(shown.length, 1);
    assert.deepEqual(shown[0].buttons, ["마지막 정상본으로 시작", "백업 파일에서 복원", "종료"]);
    assert.match(shown[0].detail, /지우지 않고/);
    assert.deepEqual(store.read(file), data);
    const copies = fs.readdirSync(profile).filter((f) => f.includes(".corrupt-"));
    assert.equal(copies.length, 1);
    assert.equal(fs.readFileSync(path.join(profile, copies[0]), "utf8"), '{"version":3,"notes":[');
    await goTo(page, "업무 메모");
    await page.getByRole("heading", { name: "정상본 메모" }).waitFor();
    console.log("PASS: 손상 파일 보관·복구 대화상자·마지막 정상본 시작·자료 표시");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
