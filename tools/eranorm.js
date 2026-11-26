// 시대 보정(SJ 2026-11-26): 옛 시대 선수 능력치를 요즘 기준으로 다시 매김.
// 같은 시대(±2년) 주전급 안에서의 순위(백분위)를 2015~2026 주전급 분포의 같은 백분위 값으로 옮김.
// 예) 80년대 탈삼진 1위 투수 → 요즘 탈삼진 1위 수준의 구속·변화구. 코스트는 그대로(클래식 기록 기준), OVR은 다시 계산.
// 투수 체력(이닝 소화)은 시대 차이가 실제 특징이라 보정하지 않음. 번트도 제외.
// 다시 돌려도 같은 결과: 보정량을 c.rn에 저장해 두고, 돌릴 때 먼저 되돌린 뒤 새로 계산.
// 사용: node tools/eranorm.js data/cards.json   (adv.js 다음에 실행)
const fs=require('fs');const cp=process.argv[2];const D=JSON.parse(fs.readFileSync(cp));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const OV=c=>{const r=c.r;return Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)))};
// 1) 이전 보정 되돌리기
for(const c of D.cards)if(c.rn){const o0=OV(c);c.r=c.r.map((v,i)=>v-(c.rn[i]||0));if(c.r0)c.r0=c.r0.map((v,i)=>v-(c.rn[i]||0));c.o+=OV(c)-o0;if(c.o0!=null)c.o0+=OV(c)-o0;delete c.rn}
const KEYS={B:[0,1,2,4,5,6],P:[0,1,2,3,5]},REF=[2015,2026],WIN=2;
const base=D.cards.filter(c=>!c.v&&c.l!=='국가대표');
const reg=c=>c.k==='B'?(c.x&&c.x[0]>=250):(c.s&&c.s[6]>=50);
const R=base.filter(reg);
const sorted=a=>a.slice().sort((x,y)=>x-y),q=(a,p)=>{const i=p*(a.length-1),lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)};
const pct=(a,v)=>{let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m}let e=lo;while(e<a.length&&a[e]===v)e++;return cl(((lo+e)/2)/a.length,0,1)};
const ref={},win={};
for(const k of ['B','P'])for(const i of KEYS[k]){ref[k+i]=sorted(R.filter(c=>c.k===k&&c.y>=REF[0]&&c.y<=REF[1]).map(c=>c.r[i]))}
const DEL={},key=c=>c.n+'|'+c.y+'|'+c.t+'|'+c.k;let stat={};
for(const c of base){if(c.y>=REF[0])continue;const k=c.k,wk=k+Math.floor(c.y);
  if(!win[wk]){win[wk]={};for(const i of KEYS[k])win[wk][i]=sorted(R.filter(x=>x.k===k&&Math.abs(x.y-c.y)<=WIN).map(x=>x.r[i]))}
  const d=Array(c.r.length).fill(0);
  for(const i of KEYS[k]){const W=win[wk][i];if(!W||W.length<20)continue;const p=pct(W,c.r[i]);d[i]=Math.round(q(ref[k+i],p)-c.r[i])}
  // 1~2년 차 시대는 경계가 갑자기 바뀌지 않게 2010~2014는 절반씩 줄여서 적용
  const f=c.y>=2010?(REF[0]-c.y)/6:1;
  DEL[key(c)]=d.map(v=>Math.round(v*f))}
let ch=0;const od={};
for(const c of D.cards){const d=DEL[key(c)];if(!d||!d.some(Boolean))continue;const o0=OV(c);const cap=c.v?120:99;
  const nr=c.r.map((v,i)=>cl(v+d[i],25,cap)),rn=nr.map((v,i)=>v-c.r[i]);c.r=nr;if(c.r0)c.r0=c.r0.map((v,i)=>v+rn[i]);c.rn=rn;
  const dO=OV(c)-o0;c.o+=dO;if(c.o0!=null)c.o0+=dO;ch++;if(!c.v){const dec=Math.floor(c.y/10)*10;(od[dec]=od[dec]||[]).push(dO)}}
fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
const avg=a=>(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2);
console.log({changed:ch,ovrDeltaByDecade:Object.fromEntries(Object.entries(od).map(([k,v])=>[k,avg(v)]))});
