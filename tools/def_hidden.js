// 2026-11-28 수비 히든 스텟(포구 F·송구 A·범위 R) — KBO 공식 수비 기록(2001~) 통산(선수명+팀) 집계
// node tools/def_hidden.js <cards.json> notes/batted_data/kbo_def_career.txt <out.json>
// 카드 dh=[F,A,R](점). 2001년 이후 카드(같은 팀 1998~2000 포함)에 적용. 보이는 포지션 수비 ps[pos] += 포지션 가중합
const fs=require('fs');const [,,inp,kd,out]=process.argv;const J=JSON.parse(fs.readFileSync(inp));
const TM={a:'LG',b:'SK',c:'롯데',d:'KIA',e:'한화',f:'삼성',g:'현대',h:'두산',i:'우리',j:'히어로즈',k:'넥센',l:'NC',m:'KT',n:'키움',o:'SSG'};
const W={C:[.4,.6,0],'1B':[.7,0,.3],'2B':[.3,.2,.5],SS:[.25,.3,.45],'3B':[.35,.4,.25],LF:[.3,.25,.45],CF:[.2,.2,.6],RF:[.2,.45,.35]};
const D={};for(const ln of fs.readFileSync(kd,'utf8').split('\n')){if(ln.startsWith('#'))continue;for(const e of ln.split(';')){const m=e.match(/^(.+?)([a-o])(-?\d+),(-?\d+),(-?\d+)$/);if(m)D[m[1]+'|'+TM[m[2]]]=[+m[3],+m[4],+m[5]]}}
let n=0,ch=0;for(const c of J.cards){if(c.k!=='B'||c.y<1998)continue;delete c.dh;const d=D[c.n.replace(/#\d+/,'')+'|'+c.t];if(!d)continue;c.dh=d;n++;
 if(c.ps)for(const pos in c.ps){const w=W[pos];if(w){const v=Math.round(c.ps[pos]+w[0]*d[0]+w[1]*d[1]+w[2]*d[2]);if(v!==c.ps[pos])ch++;c.ps[pos]=v}}}
fs.writeFileSync(out,JSON.stringify(J));console.log('dh',n,'players',Object.keys(D).length,'ps changed',ch);
