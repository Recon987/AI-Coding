// renderer는 ID만 보낸다. 경로는 저장된 근거/폴더에서 다시 조회한다. 실행 기능 없음.
const fs = require("node:fs");
const { referenceView } = require("../shared/projects.mjs");
function referenceLocation(data, id) {
  if (typeof id !== "string" || !id.trim() || id.length > 100) throw new Error("근거 자료 ID를 확인하세요.");
  const view = referenceView(data, id);
  if (!view.exists) return { state: "missing", message: "삭제된 자료입니다." };
  if (view.targetMissing) return { state: "missing", message: "연결된 원본이 없습니다." };
  if (!view.path) return { state: "none", message: "위치를 볼 수 있는 파일·폴더 근거가 아닙니다." };
  try {
    fs.statSync(view.path);
    return { state: "ready", path: view.path };
  } catch (error) {
    return { state: error.code === "ENOENT" || error.code === "ENOTDIR" ? "missing" : "unavailable", message: error.code === "ENOENT" || error.code === "ENOTDIR" ? "파일·폴더가 없습니다. 경로를 다시 지정하세요." : "파일 위치를 확인할 수 없습니다. 경로·권한을 확인하세요." };
  }
}
module.exports = { referenceLocation };
