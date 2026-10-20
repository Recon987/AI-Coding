// B1 구판·보안 계약 검사. git archive로 만든 가상 사본에만 접근한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { mixedWorkFixture } = require('./work-fixture.cjs');
const { normalize } = require('../shared/model.mjs');
const [legacyBase, securityBase] = process.argv.slice(2);
if (!legacyBase || !securityBase) throw new Error('사용법: node tests/work-compatibility.cjs <구판 사본 경로> <보안 사본 경로>');
const old = require(path.resolve(legacyBase, 'shared/model.mjs'));
const s = require(path.resolve(securityBase, 'desktop/store.cjs'));
const seal = require(path.resolve(securityBase, 'desktop/seal.cjs'));
const { testProtector } = require(path.resolve(securityBase, 'desktop/protector.cjs'));
const { ringOf } = require(path.resolve(securityBase, 'desktop/keystore.cjs'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'park-b1-compat-'));
(async()=>{
 try {
  const data=normalize(mixedWorkFixture());
  const legacyRoundtrip=normalize(old.normalize(JSON.parse(JSON.stringify(data))));
  assert.deepEqual(legacyRoundtrip,data);
  const protector=testProtector('fake:virtual-b1');
  const made=seal.createKeyring(protector);
  const ring=ringOf(made.keyFile,made.dataKey);
  s.setSealer(ring);
  const file=path.join(dir,'workdesk.json');
  s.write(file,data,{keepLastGood:true});
  assert.ok(JSON.parse(fs.readFileSync(file,'utf8')).sealed);
  assert.deepEqual(normalize(s.read(file)),data);
  assert.deepEqual(normalize(s.read(s.lastGoodFile(file))),data);
  const bytes=fs.readFileSync(file,'utf8');
  const invalid={...data,workItems:[{...data.workItems[0],status:'bad'}]};
  // 보안 구판은 새 컬렉션을 알지 못하므로 B1의 normalize가 저장 전 검증을 맡는다.
  assert.throws(()=>normalize(invalid));
  assert.equal(fs.readFileSync(file,'utf8'),bytes);
  const backup=path.join(dir,'backup.json');
  const password='Virtual-B1-Backup-2026!';
  const start=performance.now();
  await s.writeBackup(backup,data,password);
  const writeMs=performance.now()-start;
  assert.ok(JSON.parse(fs.readFileSync(backup,'utf8')).backupSealed);
  const readStart=performance.now();
  assert.deepEqual(normalize(await s.readBackup(backup,password)),data);
  const readMs=performance.now()-readStart;
  await assert.rejects(()=>s.readBackup(backup,'wrong'),/암호/);
  assert.equal(fs.readFileSync(file,'utf8'),bytes);
  const plain=Buffer.from(JSON.stringify(data));
  const decrypt=[];
  for(let i=0;i<30;i++){
   const box=seal.seal(ring,plain);
   const start=performance.now();
   normalize(JSON.parse(seal.open(ring,box).toString('utf8')));
   decrypt.push(performance.now()-start);
  }
  decrypt.sort((a,b)=>a-b);
  console.log(JSON.stringify({base:'ea3105e 구판 및 270cf7a 보안 코드 (별도 가상 사본, 제품 병합 아님)',result:'PASS',checks:['구판 normalize 후 새 컬렉션 무손실','봉투 저장/자동 정상본 왕복','암호 백업/복원 왕복','잘못된 암호 및 B1 검증 거부 때 원본 불변'],dataBytes:plain.length,backupWriteMs:+writeMs.toFixed(2),backupReadMs:+readMs.toFixed(2),decryptParseNormalize:{n:30,medianMs:+decrypt[15].toFixed(2),p95Ms:+decrypt[28].toFixed(2)},limitations:'시험용 보호기 사용. Windows DPAPI·보안 UI 통합 미검증. 보안 구판은 B1 필드 자체를 검사하지 않으므로 병합 때 현재 모델 유지 필수.'},null,2));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
