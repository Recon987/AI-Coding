const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {empty,validate,read,write,due}=require('../desktop/store.cjs');
test('메모·일정·전화 기록의 저장과 재실행 읽기',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workdesk-'));const file=path.join(dir,'data.json');
 try {const data=empty();data.notes.push({id:'n1',title:'순찰 인수인계',body:'탐방로 확인'});data.events.push({id:'e1',title:'회의',at:'2026-10-15T09:00:00+09:00',done:false});data.calls.push({id:'c1',title:'전화 회신',body:'연락 요청',phone:'000',done:false});write(file,data);assert.deepEqual(read(file),data);data.notes[0].body='수정';write(file,data);assert.equal(read(file).notes[0].body,'수정');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('잘못된 백업·중복 ID·잘못된 날짜를 거부',()=>{
 assert.throws(()=>validate({version:2}));
 const d=empty();d.events.push({id:'e',title:'회의',at:'invalid',done:false});assert.throws(()=>validate(d));
 const n={id:'n',title:'메모',body:''};assert.throws(()=>validate({...empty(),notes:[n,n]}));
 assert.throws(()=>validate({...empty(),folders:[{id:'f',title:'폴더',path:'relative'}]}));
});
test('잘못된 저장은 기존 파일을 보존',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workdesk-'));try{const file=path.join(dir,'data.json');write(file,empty());assert.throws(()=>write(file,{version:9}));assert.deepEqual(read(file),empty());}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('알림은 해당 시간의 미완료 일정만 한 번 선택',()=>{
 const now=Date.parse('2026-10-15T10:00:00Z');const e={id:'1',title:'회의',at:new Date(now-15000).toISOString(),done:false};
 const list=[e,{...e,id:'2',done:true},{...e,id:'3',at:new Date(now+1000).toISOString()},{...e,id:'4',at:new Date(now-60000).toISOString()}];
 assert.deepEqual(due(list,now,new Set()),[e]);assert.deepEqual(due(list,now,new Set([e.id+e.at])),[]);
});
