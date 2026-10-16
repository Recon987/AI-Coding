const fs = require("node:fs");
const { atomicWrite } = require("./settings.cjs");
const NORMAL_WINDOW_MS = 60000;
const CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_RECEIPTS = 50000;
const receiptKey = (item) => JSON.stringify([item.id, Date.parse(item.at)]);

function pruneReceipts(receipts, now) {
  return new Map(
    [...receipts]
      .filter(([, at]) => Number.isFinite(at) && at > now - CATCHUP_WINDOW_MS)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RECEIPTS),
  );
}
function selectDue(
  items,
  now,
  receipts = new Map(),
  reason = "timer",
  pending = new Map(),
) {
  const selected = new Set();
  return items
    .filter((item) => {
      const at = Date.parse(item.at);
      const key = receiptKey(item);
      const window =
        reason === "resume" || pending.has(key)
          ? CATCHUP_WINDOW_MS
          : NORMAL_WINDOW_MS;
      if (
        item.done ||
        !Number.isFinite(at) ||
        at > now ||
        at <= now - window ||
        receipts.has(key) ||
        selected.has(key)
      )
        return false;
      selected.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
function readReceipts(file) {
  if (!fs.existsSync(file)) return new Map();
  if (fs.statSync(file).size > 8 * 1024 * 1024)
    throw new Error("알림 이력 파일이 너무 큽니다.");
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    value?.version !== 1 ||
    !Array.isArray(value.receipts) ||
    value.receipts.length > MAX_RECEIPTS ||
    value.receipts.some(
      (entry) =>
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        entry[0].length > 500 ||
        !Number.isFinite(entry[1]),
    )
  )
    throw new Error("알림 이력 형식을 확인하세요.");
  return new Map(value.receipts);
}
function writeReceipts(file, receipts, now) {
  atomicWrite(file, {
    version: 1,
    receipts: [...pruneReceipts(receipts, now)],
  });
}

// The adapter reports a show() request, not guaranteed OS delivery. No business data is changed.
function createNotifier({
  readItems,
  show,
  supported = () => true,
  clock = Date.now,
  file,
  logger = console,
}) {
  let pending = new Map();
  const attempts = new Map();
  let receipts;
  try {
    receipts = readReceipts(file);
  } catch (error) {
    logger.error("알림 이력 읽기 실패:", error.message);
    receipts = new Map();
  }
  function persist(now) {
    try {
      writeReceipts(file, receipts, now);
    } catch (error) {
      logger.error("알림 이력 저장 실패:", error.message);
    }
  }
  function check(reason = "timer") {
    const now = clock();
    const previousSize = receipts.size;
    receipts = pruneReceipts(receipts, now);
    pending = pruneReceipts(pending, now);
    if (receipts.size !== previousSize) persist(now);
    let items;
    try {
      if (!supported()) return [];
      const current = readItems(now);
      const valid = new Set(
        current
          .filter(
            (item) =>
              !item.done &&
              Number.isFinite(Date.parse(item.at)) &&
              Date.parse(item.at) <= now &&
              Date.parse(item.at) > now - CATCHUP_WINDOW_MS,
          )
          .map(receiptKey),
      );
      // Retries always recheck the original records, so completed/deleted/rescheduled items disappear.
      for (const key of pending.keys())
        if (!valid.has(key)) pending.delete(key);
      for (const key of attempts.keys())
        if (!valid.has(key)) attempts.delete(key);
      items = selectDue(current, now, receipts, reason, pending);
    } catch (error) {
      logger.error("일정 알림 확인 실패:", error.message);
      return [];
    }
    const batches = items.length > 3 ? [items] : items.map((item) => [item]);
    const delivered = [];
    for (const batch of batches) {
      const keys = batch.map(receiptKey);
      const token = Symbol("notification-attempt");
      let failed = false;
      const forget = () => {
        failed = true;
        let changed = false;
        for (const item of batch) {
          const key = receiptKey(item);
          // An old OS callback must never erase the receipt from a newer successful attempt.
          if (attempts.get(key) !== token) continue;
          attempts.delete(key);
          receipts.delete(key);
          pending.set(key, Date.parse(item.at));
          changed = true;
        }
        pending = pruneReceipts(pending, clock());
        if (changed) persist(clock());
      };
      try {
        // Set before show: a synchronous failure callback can safely remove these receipts.
        batch.forEach((item) => {
          const key = receiptKey(item);
          receipts.set(key, Date.parse(item.at));
          attempts.set(key, token);
        });
        while (attempts.size > MAX_RECEIPTS)
          attempts.delete(attempts.keys().next().value);
        show(
          {
            title:
              reason === "resume"
                ? "공원 업무 수첩 · 복귀 후 알림"
                : "공원 업무 수첩 · 일정 알림",
            body:
              batch.length === 1
                ? batch[0].title
                : `확인할 알림 ${batch.length}건 · ${batch
                    .slice(0, 3)
                    .map((item) => item.title)
                    .join(" / ")}`,
          },
          forget,
        );
        if (!failed) {
          keys.forEach((key) => pending.delete(key));
          delivered.push(...batch);
        }
      } catch (error) {
        forget();
        logger.error("일정 알림 표시 실패:", error.message);
      }
    }
    if (batches.length) persist(now);
    return delivered;
  }
  return { check };
}
module.exports = {
  NORMAL_WINDOW_MS,
  CATCHUP_WINDOW_MS,
  MAX_RECEIPTS,
  receiptKey,
  pruneReceipts,
  selectDue,
  readReceipts,
  writeReceipts,
  createNotifier,
};
