// 시대 비율 보정(SJ 2026-11-26): "그해 리그 평균 대비 몇 배였나"로 능력치를 매김.
// convert.js는 리그 평균과의 '차이'를 고정 폭으로 나눠서, 삼진·홈런·볼넷이 적던 시대(80년대 등)는 같은 '리그 대비 1.5배' 성적도 점수가 작게 나왔음.
// 그래서 능력치의 70(리그 평균)으로부터의 거리를 (기준 시대 리그값 ÷ 그해 리그값)만큼 늘이거나 줄임. 기준 시대 = 2015~2026 평균.
//  타자: 교타=타율, 장타=순장타율(ISO), 선구=볼넷률.  투수: 구속·변화구=탈삼진률, 구위=피안타·피홈런률 평균, 제구=볼넷률
//  주력(이미 비율식), 수비, 정신력, 번트, 체력은 그대로. 배수는 0.75~1.4로 제한
// 코스트는 그대로, OVR만 다시 계산. 같은 연도·팀·선수의 특수 카드(올스타·GG·EX 등)에도 같은 변화량
// 여러 번 돌려도 같은 결과: 바꾼 양을 c.rq에 저장해 두고 먼저 되돌린 뒤 새로 계산
// 사용: node tools/eraratio.js data/cards.json data/kbo_raw_1982_2026.json   (adv.js 다음에 실행)
const fs=require('fs'),[,,cp,rp]=process.argv,D=JSON.parse(fs.readFileSync(cp)),raw=JSON.parse(fs.readFileSync(rp));
const num=v=>{if(v==null||v==='-'||v==='')return 0;v=String(v).replace(/,/g,'');const m=v.match(/^(\d+)\s+(\d)\/3$/);if(m)return +m[1]+m[2]/3;const f=v.match(/^(\d)\/3$/);if(f)return f[1]/3;return +v||0};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const OV=c=>{const r=c.r;return Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)))};
const LG={};
for(const y in raw){const B={pa:0,ab:0,h:0,d:0,t:0,hr:0,bb:0},Q={tbf:0,h:0,hr:0,bb:0,so:0};
  for(const t in raw[y]){for(const r of raw[y][t].H||[]){B.pa+=num(r[4]);B.ab+=num(r[5]);B.h+=num(r[6]);B.d+=num(r[7]);B.t+=num(r[8]);B.hr+=num(r[9]);B.bb+=num(r[13])}
    for(const r of raw[y][t].P||[]){Q.tbf+=num(r[11]);Q.h+=num(r[13]);Q.hr+=num(r[14]);Q.bb+=num(r[15]);Q.so+=num(r[17])}}
  if(!B.ab||!Q.tbf)continue;
  LG[y]={avg:B.h/B.ab,iso:(B.d+2*B.t+3*B.hr)/B.ab,bb:B.bb/B.pa,pk:Q.so/Q.tbf,ph:Q.h/Q.tbf,phr:Q.hr/Q.tbf,pbb:Q.bb/Q.tbf}}
const RY=Object.keys(LG).filter(y=>y>=2015&&y<=2026),REF={};for(const k of Object.keys(LG[RY[0]]))REF[k]=RY.reduce((s,y)=>s+LG[y][k],0)/RY.length;
const F=(y,k)=>cl(REF[k]/LG[y][k],.75,1.4);
// 능력치 인덱스별 배수. 타자 r=[con,pow,eye,bun,spd,def,men], 투수 r=[vel,stu,brk,ctl,sta,men]
const FAC=(c)=>{const y=c.y;if(!LG[y])return null;return c.k==='B'?{0:F(y,'avg'),1:F(y,'iso'),2:F(y,'bb')}:{0:F(y,'pk'),1:(F(y,'ph')+F(y,'phr'))/2,2:F(y,'pk'),3:F(y,'pbb')}};
// 1) 이전 보정 되돌리기
for(const c of D.cards)if(c.rq){const o0=OV(c);c.r=c.r.map((v,i)=>v-(c.rq[i]||0));if(c.r0)c.r0=c.r0.map((v,i)=>v-(c.rq[i]||0));const dO=OV(c)-o0;c.o+=dO;if(c.o0!=null)c.o0+=dO;delete c.rq}
// 2) 기본 카드 기준으로 변화량 계산
const key=c=>c.n+'|'+c.y+'|'+c.t+'|'+c.k,DEL={};
for(const c of D.cards){if(c.v||c.l==='국가대표')continue;const f=FAC(c);if(!f)continue;const d=c.r.map((v,i)=>f[i]?Math.round((v-70)*(f[i]-1)):0);if(d.some(Boolean))DEL[key(c)]=d}
// 3) 적용(특수 카드 포함)
let ch=0;const od={};
for(const c of D.cards){const d=DEL[key(c)];if(!d)continue;const o0=OV(c),cap=c.v?120:99;
  const nr=c.r.map((v,i)=>cl(v+(d[i]||0),25,cap)),rq=nr.map((v,i)=>v-c.r[i]);if(!rq.some(Boolean))continue;c.r=nr;if(c.r0)c.r0=c.r0.map((v,i)=>v+rq[i]);c.rq=rq;
  const dO=OV(c)-o0;c.o+=dO;if(c.o0!=null)c.o0+=dO;ch++;if(!c.v){const dec=Math.floor(c.y/10)*10;(od[dec]=od[dec]||[]).push(dO)}}
fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
const avg=a=>(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),fx=y=>LG[y]?['avg','iso','bb','pk','ph','phr','pbb'].map(k=>k+F(y,k).toFixed(2)).join(' '):'';
console.log({changed:ch,ovrDeltaByDecade:Object.fromEntries(Object.entries(od).map(([k,v])=>[k,avg(v)+' (최대 '+Math.max(...v)+', 최소 '+Math.min(...v)+')']))});
for(const y of [1982,1986,1990,1995,2000,2005,2010,2014,2018,2024])console.log(y,fx(y));
