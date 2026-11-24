// 등번호 c.no: KBO 선수 조회의 현재 등록 번호(2026-11 기준)를 2026년 카드 중 같은 구단·같은 출생연도인 카드에만 넣음.
// 과거 연도는 연도별 등번호 공식 자료가 없어 비워 둠(UI는 포지션으로 대체). 사용: node tools/number.js data/cards.json data/no_kbo2026.txt
const fs=require('fs');const [cf,nf]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));const M={};
for(const t of fs.readFileSync(nf,'utf8').trim().split(/\s+/)){const m=t.match(/^(.+?)(\d\d)(.+)=(\d+)$/);if(m)(M[m[1]+'|'+m[3]]=M[m[1]+'|'+m[3]]||[]).push([+m[2],+m[4]])}
let n=0;for(const c of J.cards){delete c.no;if(c.y!==2026)continue;const L=M[c.n.replace(/#\d+$/,'')+'|'+c.t];if(!L)continue;const m=c.b?L.filter(x=>x[0]===c.b%100):L;if(m.length===1){c.no=m[0][1];n++}}
// 나무위키 역대 등번호(data/no_namu.bin: 카드 인덱스별 1바이트, 0=없음, 값-1=번호). KBO 2026 번호가 우선. 카드 수가 다르면 건너뜀
const NB=require('path').join(__dirname,'../data/no_namu.bin');let k=0;if(fs.existsSync(NB)){const B=fs.readFileSync(NB);if(B.length===J.cards.length)J.cards.forEach((c,i)=>{if(c.no==null&&B[i]){c.no=B[i]-1;k++}});else console.log('no_namu.bin 카드 수 불일치, 건너뜀',B.length,J.cards.length)}console.log('나무위키 등번호',k);
fs.writeFileSync(cf+'.tmp',JSON.stringify(J));fs.renameSync(cf+'.tmp',cf);console.log('등번호',n,'/ 2026 카드',J.cards.filter(c=>c.y===2026).length)
