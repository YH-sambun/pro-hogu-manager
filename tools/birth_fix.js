// 출생연도 보충(2026-11-25): birth.js가 못 정한 카드 중
// 1) KBO 자료 후보가 그 카드 연도에 17~46세이면서 같은 포지션(투수/타자) 후보가 딱 1명이면 그 해로(이적한 베테랑 등)
// 2) data/birth_sheet*.txt(SJ 입력: 이름|구단|연도|출생연도)
// 사용: node tools/birth_fix.js data/birth_raw.txt data/cards.json  (hand.js 전에 실행)
const fs=require('fs'),path=require('path');const [raw,cf]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));
const R={};for(const line of fs.readFileSync(raw,'utf8').split('\n')){const i=line.indexOf('=');if(i<0)continue;
  R[line.slice(0,i)]=line.slice(i+1).split(';').map(x=>x.match(/^(\d\d)([PB])/)).filter(Boolean).map(m=>({by:+m[1]>30?1900+ +m[1]:2000+ +m[1],k:m[2]}))}
let a=0,s=0;
for(const c of J.cards){if(c.b)continue;const L=(R[c.n.replace(/#\d+$/,'')]||[]).filter(x=>c.y-x.by>=17&&c.y-x.by<=46);const t=L.filter(x=>x.k===c.k),u=[...new Set((t.length?t:L).map(x=>x.by))];
  if(u.length===1&&(t.length||L.length===1)){c.b=u[0];a++}}
const dir=path.dirname(cf);for(const sf of fs.readdirSync(dir).filter(x=>/^birth_sheet.*\.txt$/.test(x)).sort())for(const ln of fs.readFileSync(path.join(dir,sf),'utf8').split('\n')){
  if(!ln||ln[0]==='#')continue;const [nm,tm,yr,bb]=ln.split('|');if(!/^\d{4}$/.test((bb||'').trim()))continue;const [y0,y1=y0]=yr.split('~').map(Number);
  for(const c of J.cards)if(c.n===nm&&c.t===tm&&c.y>=y0&&c.y<=y1&&!c.b){c.b=+bb;s++}}
fs.writeFileSync(cf+'.tmp',JSON.stringify(J));fs.renameSync(cf+'.tmp',cf);console.log({후보1명:a,시트:s,남은기본:J.cards.filter(c=>!c.v&&!c.b).length})
