// TASK-SECURITY-01 design measurement (not part of the app). Uses only Node's built-in crypto
// on fictional data: how long AES-256-GCM takes on a 20MB data file and how long passphrase
// key derivation (scrypt) takes. Run: node scripts/security-bench.cjs
const crypto = require("node:crypto");

const MB = 1024 * 1024;
function fictionalJson(targetBytes) {
  const notes = [];
  let size = 0;
  for (let i = 0; size < targetBytes; i++) {
    const note = { id: `n${i}`, title: `가상 메모 ${i}`, body: "가상 순찰 구간 확인 내용 ".repeat(20) };
    notes.push(note);
    size += Buffer.byteLength(JSON.stringify(note)) + 1;
  }
  return Buffer.from(JSON.stringify({ version: 3, notes }));
}
const time = (fn, rounds = 5) => {
  fn(); // warm up
  const samples = [];
  for (let i = 0; i < rounds; i++) {
    const t = process.hrtime.bigint();
    fn();
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  samples.sort((a, b) => a - b);
  return { medianMs: +samples[Math.floor(samples.length / 2)].toFixed(1), maxMs: +samples.at(-1).toFixed(1) };
};

const result = { node: process.version, platform: `${process.platform}-${process.arch}`, cpu: require("node:os").cpus()[0]?.model, aesGcm: {}, scrypt: {} };
for (const size of [1 * MB, 5 * MB, 20 * MB]) {
  const plain = fictionalJson(size);
  const key = crypto.randomBytes(32);
  let sealed;
  const enc = time(() => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", key, iv);
    sealed = { iv, body: Buffer.concat([c.update(plain), c.final()]), tag: c.getAuthTag() };
  });
  const dec = time(() => {
    const d = crypto.createDecipheriv("aes-256-gcm", key, sealed.iv);
    d.setAuthTag(sealed.tag);
    const out = Buffer.concat([d.update(sealed.body), d.final()]);
    if (out.length !== plain.length) throw new Error("round trip");
  });
  // Tampering one byte must fail authentication.
  const tampered = Buffer.from(sealed.body);
  tampered[0] ^= 1;
  let rejected = false;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key, sealed.iv);
    d.setAuthTag(sealed.tag);
    Buffer.concat([d.update(tampered), d.final()]);
  } catch {
    rejected = true;
  }
  result.aesGcm[`${size / MB}MB`] = { bytes: plain.length, encrypt: enc, decrypt: dec, tamperRejected: rejected };
}
for (const [label, N] of [["N=2^15", 2 ** 15], ["N=2^16", 2 ** 16], ["N=2^17", 2 ** 17]]) {
  const salt = crypto.randomBytes(16);
  result.scrypt[label] = {
    memoryMB: (128 * N * 8) / MB,
    ...time(() => crypto.scryptSync("가상 백업 암호문 예시", salt, 32, { N, r: 8, p: 1, maxmem: 512 * MB }), 3),
  };
}
console.log(JSON.stringify(result, null, 2));
