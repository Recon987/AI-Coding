const fs = require("node:fs");
const path = require("node:path");

// Opens workdesk.json at startup. A damaged file is copied aside before anything
// else is written, and is never deleted. Returns false when the app should quit.
// notify(text) receives warnings the renderer should show once it has loaded.
const SEED_FAILED = "마지막 정상본(자동 보호본)을 만들지 못했습니다. 업무 자료는 정상이며 다음 저장 때 다시 시도합니다. 저장 공간과 권한을 확인하고 수동 백업을 만드세요.";
// Returns false (quit), true (normal) or "read-only" (a newer app's file, TASK-SCHEMA-01).
async function openDataFile({ file, store, dialog, now = Date.now, logger = console, notify = () => {} }) {
  // One read path: a file held by another program is not damaged, so it gets a
  // retry prompt instead of the recovery flow.
  for (;;) {
    try {
      if (!fs.existsSync(file) && fs.existsSync(store.lastGoodFile(file)))
        throw new Error("업무 자료 파일이 없지만 마지막 정상본이 남아 있습니다.");
      const data = store.read(file, { allowNewer: true });
      // A newer app's file is healthy: no corrupt copy, no conversion, no protection copy.
      if (store.isNewerData(data)) return "read-only";
      const migrated = store.migrateFile(file);
      if (migrated?.warning) notify(migrated.warning);
      break;
    } catch (error) {
      if (error?.code === "NEWER_DATA") {
        // Not damaged either, and the recovery flow could overwrite it with an older copy.
        dialog.showErrorBox(
          "새 버전 자료",
          `${error.message}\n업무 자료 파일은 바꾸지 않았습니다.`,
        );
        return false;
      }
      if (!store.isTransientLock(error))
        return recover({ file, store, dialog, now, notify, reason: error });
      const { response } = await dialog.showMessageBox({
        type: "warning",
        buttons: ["다시 시도", "종료"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        message: "업무 자료 파일을 다른 프로그램이 사용 중입니다.",
        detail: `백신 검사·동기화(OneDrive 등)가 끝난 뒤 다시 시도하세요. 계속 실패하면 폴더 권한과 읽기 전용 속성을 확인하세요. 파일은 바꾸지 않았습니다.\n원인: ${error.message}`,
      });
      if (response !== 0) return false;
    }
  }
  // Failure to seed an auxiliary copy does not make a healthy primary corrupt.
  try {
    if (fs.existsSync(file) && !fs.existsSync(store.lastGoodFile(file)))
      store.write(store.lastGoodFile(file), store.read(file, { required: true }));
  } catch (error) {
    logger.warn("자동 보호본 준비 실패:", error.message);
    notify(`${SEED_FAILED} (${error.message})`);
  }
  return true;
}

function preserveDamaged(file, now) {
  if (!fs.existsSync(file)) return null;
  const stamp = new Date(now()).toISOString().replace(/[:.]/g, "-");
  let target = `${file}.corrupt-${stamp}.json`;
  for (let n = 2; fs.existsSync(target); n++)
    target = `${file}.corrupt-${stamp}-${n}.json`;
  fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
  return target;
}

function readLastGood(store, file) {
  try {
    return fs.existsSync(store.lastGoodFile(file))
      ? store.read(store.lastGoodFile(file), { required: true })
      : null;
  } catch {
    return null;
  }
}

async function recover({ file, store, dialog, now, notify, reason }) {
  let preserved;
  try {
    preserved = preserveDamaged(file, now);
  } catch (error) {
    // Without a safe copy nothing may overwrite the original.
    dialog.showErrorBox(
      "데이터 보존 실패",
      `손상된 업무 자료를 따로 보관하지 못해 시작을 중단합니다. 저장 공간과 권한을 확인하세요.\n${error.message}`,
    );
    return false;
  }
  const lastGood = readLastGood(store, file);
  const options = [
    ...(lastGood ? [{ id: "last-good", label: "마지막 정상본으로 시작" }] : []),
    { id: "backup", label: "백업 파일에서 복원" },
    { id: "quit", label: "종료" },
  ];
  let notice = "";
  for (;;) {
    const { response } = await dialog.showMessageBox({
      type: "warning",
      buttons: options.map((o) => o.label),
      defaultId: 0,
      cancelId: options.length - 1,
      noLink: true,
      message: "업무 자료를 읽지 못했습니다.",
      detail: [
        notice,
        `원인: ${reason?.message ?? "알 수 없음"}`,
        preserved
          ? `손상된 파일은 지우지 않고 ${path.basename(preserved)}(으)로 보관했습니다.`
          : "",
        lastGood
          ? "마지막 정상본은 가장 최근에 정상 저장된 자료입니다."
          : "마지막 정상본이 없습니다. 백업 파일을 선택하거나 종료한 뒤 파일을 확인하세요.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    const choice = options[response]?.id ?? "quit";
    if (choice === "quit") return false;
    if (choice === "last-good") {
      try {
        const saved = store.write(file, lastGood, { keepLastGood: true });
        if (saved?.warning) notify(saved.warning);
        return true;
      } catch (error) {
        notice = `마지막 정상본으로 복구하지 못했습니다: ${error.message}`;
        continue;
      }
    }
    const picked = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (picked.canceled || !picked.filePaths?.[0]) {
      notice = "백업 파일을 선택하지 않았습니다.";
      continue;
    }
    try {
      const data = store.read(picked.filePaths[0], { required: true });
      const saved = store.write(file, data, { keepLastGood: true });
      if (saved?.warning) notify(saved.warning);
      return true;
    } catch (error) {
      notice = `선택한 백업을 사용할 수 없습니다: ${error.message}`;
    }
  }
}

module.exports = { openDataFile, preserveDamaged };
