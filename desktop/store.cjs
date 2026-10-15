const fs = require('node:fs');
const path = require('node:path');
const empty = () => ({version: 1, notes: [], events: [], calls: [], folders: []});
const text = (v, max=20000) => typeof v === 'string' && v.length <= max;
function validate(data) {
  if (!data || data.version !== 1) throw new Error('지원하지 않는 데이터 형식입니다.');
  for (const key of ['notes','events','calls','folders']) {
    if (!Array.isArray(data[key]) || data[key].length > 10000) throw new Error('데이터 크기 또는 형식을 확인하세요.');
    const ids = new Set();
    for (const row of data[key]) {
      if (!row || !text(row.id,100) || ids.has(row.id) || !text(row.title,500) || !row.title.trim()) throw new Error('항목을 확인하세요.');
      ids.add(row.id);
      if (key === 'notes' && !text(row.body)) throw new Error('메모를 확인하세요.');
      if (key === 'events' && (!text(row.at,100) || !Number.isFinite(Date.parse(row.at)) || typeof row.done !== 'boolean')) throw new Error('일정 형식을 확인하세요.');
      if (key === 'calls' && (!text(row.body) || !text(row.phone,100) || typeof row.done !== 'boolean')) throw new Error('전화메모를 확인하세요.');
      if (key === 'folders' && (!text(row.path,4096) || !path.isAbsolute(row.path))) throw new Error('폴더 경로를 확인하세요.');
    }
  }
  return data;
}
function read(file) { return fs.existsSync(file) ? validate(JSON.parse(fs.readFileSync(file,'utf8'))) : empty(); }
function write(file, data) {
  validate(data); fs.mkdirSync(path.dirname(file), {recursive:true});
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(data,null,2), {mode:0o600}); fs.renameSync(temporary,file);
}
function due(events, now, seen) {
  return events.filter(e => !e.done && !seen.has(e.id+e.at) && Date.parse(e.at) <= now && Date.parse(e.at) > now - 60000);
}
module.exports = {empty, validate, read, write, due};
