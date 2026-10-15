// Linux cloud smoke test: temporary profile; no sandbox flag is only for this isolated test.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'park-desktop-test-'));
 const root=path.resolve(__dirname,'..');let app;
 try {
  app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless']:[]),'--user-data-dir='+path.join(dir,'profile'),root],timeout:30000,env:{...process.env,XDG_CONFIG_HOME:path.join(dir,'config'),XDG_CACHE_HOME:path.join(dir,'cache')}});
  const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('heading',{name:'오늘도, 안전한 공원의 하루'}).waitFor();
  assert.ok(await page.evaluate(()=>!!window.workdesk));
  await page.locator('nav').getByRole('button',{name:'메모지',exact:true}).click();
  await page.getByLabel('제목',{exact:true}).fill('데스크톱 저장 확인');await page.getByLabel('내용',{exact:true}).fill('IPC 저장 검증');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('heading',{name:'데스크톱 저장 확인'}).waitFor();
  await page.reload();await page.locator('nav').getByRole('button',{name:'메모지',exact:true}).click();await page.getByRole('heading',{name:'데스크톱 저장 확인'}).waitFor();
  await page.locator('nav').getByRole('button',{name:'달력 · 일정',exact:true}).click();await page.getByLabel('제목',{exact:true}).fill('순찰 회의');await page.getByLabel('일시',{exact:true}).fill('2030-10-16T09:00');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('checkbox',{name:'순찰 회의 완료'}).check();
  await page.locator('nav').getByRole('button',{name:'전화메모',exact:true}).click();await page.getByLabel('제목',{exact:true}).fill('방문 문의');await page.getByLabel('전달 내용').fill('회신 요청');await page.getByLabel('전화번호').fill('000-0000');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:'처리 완료',exact:true}).click();await page.getByRole('button',{name:'미처리로 변경',exact:true}).waitFor();
  // Select paths deterministically; IPC/file operations remain the real implementation.
  const backup=path.join(dir,'backup.json');
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},backup);
  await page.getByRole('button',{name:'백업 내보내기'}).click();
  for(let n=0;!fs.existsSync(backup)&&n<100;n++)await new Promise(r=>setTimeout(r,50));
  const data=JSON.parse(fs.readFileSync(backup,'utf8'));assert.equal(data.notes[0].title,'데스크톱 저장 확인');assert.equal(data.events[0].done,true);assert.equal(data.calls[0].done,true);
  data.notes[0].title='백업 복원 확인';fs.writeFileSync(backup,JSON.stringify(data));
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showMessageBox=async()=>({response:1});},backup);
  await page.getByRole('button',{name:'복원',exact:true}).click();
  await page.locator('nav').getByRole('button',{name:'메모지',exact:true}).click();await page.getByRole('heading',{name:'백업 복원 확인'}).waitFor();
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},dir);
  await page.locator('nav').getByRole('button',{name:'폴더 바로가기',exact:true}).click();await page.getByRole('button',{name:'+ 폴더 선택'}).click();await page.getByText(dir,{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: 데스크톱 IPC, 저장·재읽기, 일정 완료, 전화 처리, 백업·복원, 폴더 등록');
 } finally {if(app)await app.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1)});
