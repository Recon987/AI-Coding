const fs = require("node:fs");
const path = require("node:path");

// Opens workdesk.json at startup. A damaged file is copied aside before anything
// else is written, and is never deleted. Returns false when the app should quit.
async function openDataFile({ file, store, dialog, now = Date.now }) {
  try {
    store.read(file);
    store.migrateFile(file);
    // First run after this feature: seed the last-good copy from a healthy file.
    if (fs.existsSync(file) && !fs.existsSync(store.lastGoodFile(file)))
      store.write(store.lastGoodFile(file), store.read(file));
    return true;
  } catch (error) {
    return recover({ file, store, dialog, now, reason: error });
  }
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
      ? store.read(store.lastGoodFile(file))
      : null;
  } catch {
    return null;
  }
}

async function recover({ file, store, dialog, now, reason }) {
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
      store.write(file, lastGood, { keepLastGood: true });
      return true;
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
      const data = store.read(picked.filePaths[0]);
      store.write(file, data, { keepLastGood: true });
      return true;
    } catch (error) {
      notice = `선택한 백업을 사용할 수 없습니다: ${error.message}`;
    }
  }
}

module.exports = { openDataFile, preserveDamaged };
