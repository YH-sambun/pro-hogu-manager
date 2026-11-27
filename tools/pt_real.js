// 구종 2.0 (SJ 2026-11-27): 카드 구종을 실제 트래킹 데이터(야구나라, 2016~)로 교체
// - 같은 선수(이름+출생연도) 데이터가 있으면: 그 해(없으면 가장 가까운 해) 구종 구성 + 구종별 상대 등급, 카드 전체 세기는 기존 기록 기반 등급 평균에 맞춤
// - pu: 실제 우타자/좌타자 상대 구종 구사율(%) [vsR, vsL] → 엔진이 투수별 좌우 구종 선택에 사용
// - 데이터 없는 옛날 선수: 시대별 클래식 구종만(직구·커브·슬라이더·포크·체인지업, 언더·사이드는 싱커), 등급은 기존 값 유지
// - 팜볼·너클볼: 기사로 확인된 선수만 (박철순, 옥스프링, 마일영, 김경태(LG), 윤석민 팜볼). 피어밴드·채병용·노경은은 트래킹에 너클볼이 잡힘
// 사용: node tools/pt_real.js data/cards.json notes/pitch_data/yagoonara_compact.txt [out.json]
const fs=require('fs');
const [,,CF,YF,OUT]=process.argv;
const D=JSON.parse(fs.readFileSync(CF,'utf8'));
const CODE={F:'직구',S:'슬라이더',K:'커브',H:'체인지업',T:'투심',C:'커터',P:'포크',N:'너클볼',I:'싱커',W:'스위퍼'};
const GV={S:95,A:87,B:78,C:68,D:58};
const GR=s=>s>=92?'S':s>=84?'A':s>=74?'B':s>=64?'C':'D';
const YG={};
for(const l of fs.readFileSync(YF,'utf8').split('\n')){if(!l.trim())continue;const [n,b,h,segs,pl]=l.split('|');
  const S=segs.split('/').filter(Boolean).map(s=>{const [hd,k]=s.split(':');const [yy,n]=hd.split(',');const [y1,y2]=yy.split('-').map(Number);
    const ps=[];for(let i=0;i<k.length;i+=2)ps.push([k[i],k[i+1]]);return {y1:2000+y1,y2:2000+(y2||y1),n:+n,ps}});
  const P={};for(const x of (pl||'').split(',').filter(Boolean)){const m=x.match(/^([A-Z])(\d+)\.(\d+)$/);if(m)P[m[1]]=[+m[2],+m[3]]}
  (YG[n]=YG[n]||[]).push({b:+b,h,S,P})}
// 시대별 클래식 구종 가중치 [~1994, 1995~2007, 2008~2015]
const CL={'슬라이더':[.34,.34,.33],'커브':[.32,.24,.19],'포크':[.12,.18,.21],'체인지업':[.10,.14,.17],'싱커':[.06,.05,.04],'커터':[0,.03,.04],'스플리터':[0,.02,.02]};
function srand(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return ((h>>>0)%100000)/100000}}
const SIDE=new Set(['정대현','박종훈','고영표','우규민','이재곤','양현','김대우','이강철','박충식','박정현','한희민','김병현','임창용','권오준','심창민','신재영','오현택','한현희']);
// 확인된 팜볼·너클볼 (기사: 경향신문 2020-12-28 "KBO의 너클볼 투수들", thewiki 팜볼 항목)
const SPECIAL=c=>{
  if(c.n==='박철순')return {'팜볼':'A','너클볼':'C'};
  if(c.n==='옥스프링'&&c.y>=2008)return {'너클볼':c.y>=2013?'B':'C'};
  if(c.n==='마일영')return {'너클볼':'C'};
  if(c.n==='김경태'&&c.b===1975&&c.y===2009)return {'너클볼':'D'};
  if(c.n==='윤석민'&&c.y>=2009)return {'팜볼':'C'};
  return null};
const FAMOUS={'선동열':['슬라이더'],'최동원':['커브'],'구대성':['슬라이더','체인지업'],'손민한':['싱커','슬라이더'],'이상훈':['슬라이더'],'송진우':['슬라이더','체인지업'],'정민태':['슬라이더','커브'],'김시진':['커브'],'조계현':['커브','슬라이더'],'이강철':['커브','싱커'],'한희민':['싱커','커브']};
const st={match:0,exact:0,near:0,classic:0,special:0,sweeper:0};
function pick(c){const nm=c.n.replace(/#\d+$/,''),L=YG[nm];if(!L)return null;let m=L.filter(x=>x.b===c.b);
  if(!m.length&&L.length===1&&L[0].S.some(s=>c.y>=s.y1-1&&c.y<=s.y2+1))m=L; // 출생연도 오기 대비: 같은 이름 1명이고 그 해 데이터가 있으면
  if(m.length!==1)return null;return m[0]}
for(const c of D.cards){if(c.k!=='P')continue;
  const old=c.pt||{'직구':'C'},oldF=GV[old['직구']]||68,oldB=Object.entries(old).filter(([k])=>k!=='직구').map(([,g])=>GV[g]||68).sort((a,b)=>b-a);
  const oldMB=oldB.length?oldB.reduce((a,b)=>a+b,0)/oldB.length:68;
  const Y=pick(c);let pt=null;
  if(Y){const segs=Y.S.map(s=>({s,d:c.y<s.y1?s.y1-c.y:c.y>s.y2?c.y-s.y2:0}));
    segs.sort((a,b)=>(a.d-b.d)||((b.s.n>=150)-(a.s.n>=150))||(b.s.n-a.s.n));
    const best=segs.find(x=>x.s.n>=150&&x.d<=segs[0].d+1)||segs[0],seg=best.s,exact=best.d===0;
    const far=best.d>5; // 5년 넘게 떨어진 해면 그 시절에 없었을 가능성이 큰 신구종(투심·커터·스위퍼)은 뺌
    const ps=seg.ps.map(([k,g])=>{let t=CODE[k]||'커브';if(t==='스위퍼'&&c.y<2022)t='슬라이더';return [t,GV[g]]}).filter(([t])=>!(far&&(t==='투심'||t==='커터'||t==='스위퍼')));
    const m={};for(const [t,v] of ps)if(!(t in m))m[t]=v;else m[t]=Math.max(m[t],v);
    if(!('직구' in m)&&!('투심' in m))m['직구']=68;
    const fbD=Math.max(m['직구']||0,m['투심']||0)||68,brk=Object.keys(m).filter(t=>t!=='직구'&&t!=='투심').slice(0,4);
    const dMB=brk.length?brk.reduce((s,t)=>s+m[t],0)/brk.length:68,fbV=oldF+(exact?.5:0)*(fbD-oldF);
    pt={'직구':GR('직구' in m?fbV+.8*(m['직구']-fbD):fbV-4)}; // 투심이 주력이면 직구는 한 단계 아래로 두고 투심을 주력 등급으로
    if('투심' in m)pt['투심']=GR(fbV+.8*(m['투심']-fbD));
    for(const t of brk)pt[t]=GR(oldMB+.8*(m[t]-dMB)+(exact?.4:0)*(dMB-oldMB));
    st.match++;exact?st.exact++:st.near++;if('스위퍼' in pt)st.sweeper++;
    const pu={};const back={};for(const [k,t] of Object.entries(CODE))back[k]=(t==='스위퍼'&&c.y<2022)?'슬라이더':t;
    for(const [k,[r,l]] of Object.entries(Y.P)){const t=back[k]==='직구'||back[k]==='투심'?back[k]:back[k];if(!(t in pt))continue;const o=pu[t]||[0,0];pu[t]=[o[0]+r,o[1]+l]}
    if(Object.keys(pu).length>=2)c.pu=pu;else delete c.pu;
  }else{const r=srand(c.n+c.y+'pt2'),era=c.y<1995?0:c.y<2008?1:2,side=SIDE.has(c.n);
    const pool=Object.entries(CL).map(([t,w])=>[t,w[era]*(t==='싱커'&&side?5:1)]).filter(x=>x[1]>0);
    pt={'직구':old['직구']||'C'};const n=Math.max(2,Math.min(4,oldB.length||2));let i0=0;
    for(const t of FAMOUS[c.n]||[]){pt[t]=GR(oldB[i0++]||68);const j=pool.findIndex(x=>x[0]===t);if(j>=0)pool.splice(j,1)} // 잘 알려진 주무기는 꼭 넣음(등급은 기존 상위 값)
    for(let i=i0;i<n;i++){const W=pool.reduce((s,x)=>s+x[1],0);let x=r()*W,j=0;while(j<pool.length-1&&(x-=pool[j][1])>0)j++;pt[pool[j][0]]=GR(oldB[i]||68);pool.splice(j,1)}
    delete c.pu;st.classic++}
  const sp=SPECIAL(c);if(sp){Object.assign(pt,sp);st.special++}
  c.pt=pt}
fs.writeFileSync(OUT||CF,JSON.stringify(D));
console.log(JSON.stringify(st));
