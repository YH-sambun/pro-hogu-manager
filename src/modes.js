// ===== 게임 모드: 주간 승급 리그 · 연도별 리그 =====
// 주간 리그(2026-11-26 SJ: 3일 주기): KST 0시 기준 3일마다 한 시즌. 1~2일차 정규시즌 27경기, 3일차 상위 4팀 포스트시즌(준결승·결승 3전 2선승). 포스트시즌 우승하면 다음 시즌 한 단계 승급(10단계).
// 연도별 리그: 그해 실제 구단들 사이에 내 구단이 들어가 정규시즌(팀당 3번씩) + 포스트시즌. 한국시리즈 우승이 목표.
const TIERS=[
  {n:'주전자',m:[50,57],c:[1,2]},{n:'동호회',m:[53,60],c:[2,3]},{n:'대학',m:[56,63]},{n:'실업',m:[59,66]},{n:'퓨처스',m:[62,70]},{n:'프로',m:[66,75]},
  {n:'올스타',r:[0,.4],c:[1,2]},{n:'챔피언',r:[.3,.7],c:[2,3,4]},{n:'레전드',r:[.4,.8],c:[2,3]},{n:'명예의 전당',r:[.5,.85],c:[3,4]}];
const TIER_DESC=['여러 시대 하위권 선수로 꾸린 혼성팀 · 컨디션 나쁨','혼성팀 · 주전급 일부 · 컨디션 보통 이하','혼성팀 · 주전급','혼성팀 · 주전급 다수','혼성팀 · 주전과 스타','혼성팀 · 스타 다수',
  '실제 연도·구단 팀(하위권) · 컨디션 나쁨 · 작전 카드','실제 연도·구단 팀(중위권) · 컨디션 보통 · 작전·서포트 카드','실제 연도·구단 팀(중상위권) · 작전·서포트 카드·스킬 블록 2개씩','실제 연도·구단 강팀 · 컨디션 좋음 · 작전·서포트 카드·스킬 블록 4개씩'];
const MIX_REG=['서울','부산','대구','광주','대전','인천','수원','울산','창원','청주','전주','포항','춘천','제주','목포','안동'],
  MIX_NICK=['번개','파도','독수리','범','늑대','불꽃','별','곰','매','고래','천둥','바람','들소','여우','해오름','달빛'],
  MIX_COL=['#4f7cac','#a1553f','#5f8f5a','#8a6bb0','#b08a3c','#3f8f8f','#a64d79','#6b7a8f','#c0703a','#4a6a3a'];
const tierName=t=>TIERS[t-1].n+' 리그';
// --- 보상: 양은 econ.js(ECON, 포인트와 뽑기 경제 스레드)가 정한다. ECON이 없으면 예전 코인 보상 ---
const EC=()=>typeof ECON!=='undefined'?ECON:null;
// cap=true: 반복 보상(연도 리그 경기·재우승·2~3위, 단판 반복)은 하루 상한(ECON.capped)을 거친다
function give(rw,coins,cap){const E=EC();if(E){if(cap&&E.capped)rw=E.capped(S,rw);E.grant(S,rw);const t=E.rwText(rw);return rw.capped?(t?t+' · ':'')+'오늘 반복 보상 상한 도달':t}S.coins=(S.coins||0)+coins;return coins?coins.toLocaleString()+' 코인':''}
// --- 주(KST 월요일 0시) ---
const H9=9*36e5;
function wkStart(t){const d=new Date((t||Date.now())+H9),day=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day)-H9}
const md=t=>{const d=new Date(t+H9);return `${d.getUTCMonth()+1}/${d.getUTCDate()}`};
const wkLabel=w=>`${md(w)}~${md(w+2*864e5)} (정규 ${md(w)}~${md(w+864e5)} · 포스트시즌 ${md(w+2*864e5)})`;
// 3일 주기: 2026-11-23(월) KST 0시부터 3일 단위
const CY_D=3,CY0=Date.UTC(2026,10,23)-H9,cyStart=t=>{t=t||Date.now();return CY0+Math.floor((t-CY0)/(CY_D*864e5))*CY_D*864e5},poOpen=s=>Date.now()>=s.wk+2*864e5;
// --- 공통: 리그 표·대진 ---
const teamOf=(i,L)=>i===0?userT(L||S.season):(L||S.season).teams[i];
const tname=(i,L)=>i===0?S.team.name:(L||S.season).teams[i].name;
function lgStand(L){return L.st.map((x,i)=>({i,...x,g:x.w+x.l+x.d,pct:x.w+x.l?x.w/(x.w+x.l):0})).sort((a,b)=>b.pct-a.pct||b.w-a.w||(b.rs-b.ra)-(a.rs-a.ra))}
function standings(){return lgStand(S.season)}
function lgRec(L,a,h,g){const st=L.st;st[a].rs+=g.sc[0];st[a].ra+=g.sc[1];st[h].rs+=g.sc[1];st[h].ra+=g.sc[0];if(g.res<0){st[a].d++;st[h].d++}else{st[g.res?h:a].w++;st[g.res?a:h].l++}}
function record(a,h,g){lgRec(S.season,a,h,g)}
const condMap=T=>{const m={};for(const id of [...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen])m[id]=T.cv;return m};
const fatOf=(L,i)=>{L.fat=L.fat||{};return L.fat[i]=L.fat[i]||{}};
// 투수 피로도: 경기가 끝나면 두 팀 투수에 쌓고(fatAdd), 라운드(하루)가 끝나면 모든 팀이 회복(fatRest)
function fatGame(L,pr,g){fatAdd(fatOf(L,pr[0]),g,0);fatAdd(fatOf(L,pr[1]),g,1)}
function fatDay(L){for(const k in L.fat||{})fatRest(L.fat[k])}
// 요일(SJ 2026-11-27): 실제 리그처럼 화~일 6경기 뒤 월요일은 휴식일(경기 없이 피로만 하루 더 회복). L.day = 지금까지 치른 경기일 수
const WDAY='화수목금토일',wdayOf=L=>WDAY[((L&&L.day)||0)%6]+'요일';
function dayEnd(L){fatDay(L);L.day=(L.day||0)+1;if(L.day%6===0)fatDay(L)}
// 리그 중 선발 교체 대책(SJ 2026-11-26): 시즌 중 새로 선발 로테이션에 들어온 투수는 피로도 75로 합류(약 3~4경기 등판 대기). 덱을 바꿔 쉰 에이스만 돌려 쓰는 걸 막음
const ROT_JOIN=75;
function rotJoin(L,T){const F=fatOf(L,0),R=(T.rot||[]).filter(Boolean);if(L.rot0)for(const id of R)if(!L.rot0.includes(id))F[id]=Math.max(F[id]||0,ROT_JOIN);L.rot0=R.slice()}
function fatPrev(L,i,T){const F=fatOf(L,i);if(i!==0||!L.rot0)return F;const G={...F};for(const id of (T.rot||[]).filter(Boolean))if(!L.rot0.includes(id))G[id]=Math.max(G[id]||0,ROT_JOIN);return G} // 미리보기용(저장 안 함)
function simT(L,i){if(i===0){const T=userT(L);rotJoin(L,T);return simTeam(T,S.cond,fatOf(L,0))}const T=L.teams[i],U=T.kb?{...T,blocks:aiBlocks(T)}:T;return simTeam(U,T.cv?condMap(T):undefined,fatOf(L,i))}
const sched3=n=>{const base=rr(n%2?n+1:n);return [...base,...base.map(r=>r.map(p=>[p[1],p[0]])),...base]};
const newSt=n=>Array.from({length:n},()=>({w:0,l:0,d:0,rs:0,ra:0}));
function curPair(L){
  if(L.po){if(!poOpen(L))return null;const x=lgPoSer(L);if(!x)return null;const k=x.w[0]+x.w[1]+(x.d||0);return k%2===0?[x.b,x.a]:[x.a,x.b]}
  if(L.regDone)return null;
  if(L.post){const c=L.post.cur;if(!c||(c.lo!==0&&c.hi!==0))return null;const k=c.w[0]+c.w[1]+(c.d||0);return [0,1,4,5,6].includes(k)?[c.lo,c.hi]:[c.hi,c.lo]}
  if(L.round>=L.sched.length)return null;return L.sched[L.round].find(p=>p.includes(0)&&p[0]<L.teams.length&&p[1]<L.teams.length)||null}
// 한 라운드 진행. g가 있으면 내 경기는 그 결과(직접 지휘)를 쓰고, 없으면 내 경기도 시뮬레이션한다.
function lgPlay(L,g){let res=null;const out=[];
  for(const p of L.sched[L.round]){if(p[0]>=L.teams.length||p[1]>=L.teams.length)continue;
    const mine=p.includes(0),gg=mine&&g?g:simAll(mkGame(simT(L,p[0]),simT(L,p[1])));
    if(mine){const me=p.indexOf(0);res=gg.res<0?'d':gg.res===me?'w':'l';L.hl=hlOf(gg,p);recGame(L,gg,p);predDo(L,gg,me)}
    lgRec(L,p[0],p[1],gg);accStats(L,p,gg);fatGame(L,p,gg);out.push({a:p[0],h:p[1],sc:gg.sc,me:mine})}
  L.last=out.sort((x,y)=>y.me-x.me);L.teams.forEach((t,i)=>{if(i)t.rotIdx=(t.rotIdx||0)+1});dayEnd(L);L.round++;return res}
// 리그 경기(주간·연도)에서는 작전 카드 1장 소모, 서포트 카드 남은 경기 1 감소. 단판 도전은 이 함수를 부르지 않는다(서포트 미적용·작전 무소모).
function useCards(){const T=S.team,ts=T.tsel;if(ts&&(S.tq||{})[ts]>0){S.tq[ts]--;if(!S.tq[ts])T.tsel=null}T.sup=(T.sup||[]).map(x=>({...x,left:x.left-1})).filter(x=>x.left>0)}
// --- 경기 예측: 목표 7개 중 1개를 직접 고름(L.pk, 다음 경기에도 유지). 달성하면 보너스(ECON.predSettle). 연도 리그는 하루 상한 적용 ---
let PM='';
function predList(L){const E=EC();if(!E||!E.PRED)return null;const m=L.year?1:E.tierMul(L.tier||1);return E.PRED.map(x=>[x[0],x[1],Math.round(x[3]*m/10)*10])}
function predGet(L){const A=predList(L);if(!A)return null;const o=A.find(x=>x[0]===(L.pk||'r'))||A[0];return [o]}
function predDo(L,gg,me){const E=EC();if(!E||!E.predSettle||L.noPred)return;const o=predGet(L);if(!o)return;
  const bx=Object.values(gg.bx[me]),box={r:gg.sc[me],ra:gg.sc[1-me],h:gg.hits[me],hr:bx.reduce((s,b)=>s+b.hr,0),sb:bx.reduce((s,b)=>s+b.sb,0),k:gg.px[me].reduce((s,p)=>s+p.k,0)};
  const r=E.predSettle(o,box,gg.res===me);L.predLast={o,hit:r.hit};if(r.pt){let rw={pt:r.pt};if(L.year&&E.predCapped)rw=E.predCapped(S,rw); // 연도 리그 예측은 경기 보상과 별도인 예측 전용 하루 상한
  if(rw.capped&&!rw.pt){PM+=` · 예측 달성 ${r.hit.join('·')} (오늘 예측 보상 상한)`;return}const t=give(rw,0,false)+(rw.capped?' (예측 상한 도달)':'');PM+=` · 예측 달성 ${r.hit.join('·')}${t?' '+t:''}`}}
const predHTML=L=>{const A=predList(L);if(!A)return '';const k=(predGet(L)[0]||[])[0];return `<div class="btns pred" aria-label="경기 예측 고르기"><small>경기 예측</small>${A.map(x=>`<button data-a="m-pred" data-k="${x[0]}" class="${x[0]===k?'big':'ghost'}" aria-pressed="${x[0]===k}" >${esc(x[1].replace(' 이상','+'))} ${x[2]}P</button>`).join('')}</div>`};
function userReward(res,mode,tier){if(!res)return '';const E=EC(),r=E?(mode==='yl'&&E.yearGame?E.yearGame(res):E.leagueGame(mode==='yl'?1:tier,res)):null,pay=give(r,{w:400,d:200,l:150}[res],mode==='yl');
  if(E){E.mission(S,'g3');if(mode==='lg'&&res==='w')E.mission(S,'w1')}
  for(const c of regCards(S.team))S.gp[c.id]=(S.gp[c.id]||0)+1;S.team.rotIdx++;
  useCards();
  let msg=`${res==='w'?'승리':res==='l'?'패배':'무승부'}${pay?' · '+pay:''}`+PM;PM='';if(res==='w'&&Math.random()<.5){const b=gainBlock();msg+=` · 스킬 블록(${b.g}) 획득`}return msg}
// --- 리그 개인 기록·타이틀 (정규시즌만) ---
const TITLE_N={avg:'타율',hr:'홈런',rbi:'타점',sb:'도루',w:'다승',era:'평균자책',so:'탈삼진',sv:'세이브'};
function accStats(L,pr,g){const P=L.ps=L.ps||{},rec=(t,c)=>P[t+'|'+c.id]=P[t+'|'+c.id]||{t,id:c.id,ab:0,h:0,hr:0,rbi:0,bb:0,sb:0,outs:0,er:0,so:0,w:0,sv:0};
  for(const s of [0,1]){const t=pr[s];for(const k in g.bx[s]){const b=g.bx[s][k],r=rec(t,b.c);r.pos=r.pos||{};r.pos[b.pos]=(r.pos[b.pos]||0)+1;r.ab+=b.ab;r.h+=b.h;r.hr+=b.hr;r.rbi+=b.rbi;r.bb+=b.bb;r.sb+=b.sb;r.e=(r.e||0)+(b.e||0);r.a=(r.a||0)+(b.a||0)}
    for(const x of g.px[s]){const r=rec(t,x.c);r.outs+=x.outs;r.er+=x.r;r.so+=x.k}}
  if(g.res<0)return;const ws=g.res,wp=g.px[ws],lead=g.sc[ws]-g.sc[1-ws];if(!wp.length)return;
  const st=wp[0],pr0=g.wrec&&g.wrec[ws]||st,win=pr0===st&&st.outs<15?(wp.slice(1).sort((a,b)=>b.outs-a.outs)[0]||st):pr0;rec(pr[ws],win.c).w++; // 2026-11-28 SJ: 승리 투수 = 리드를 마지막으로 잡을 때 투수(선발은 5이닝 이상), 아니면 가장 오래 던진 구원
  const last=wp[wp.length-1],e=last.ent!=null?last.ent:lead;if(last!==win&&e>=1&&((e<=3&&last.outs>=3)||last.outs>=9))rec(pr[ws],last.c).sv++}
function titles(L){const P=Object.values(L.ps||{}),gp=L.st.map(x=>x.w+x.l+x.d),out={};
  const lead=(f,ok,low)=>{const Q=P.filter(ok);if(!Q.length)return null;const v=Q.map(f),best=low?Math.min(...v):Math.max(...v);if(!low&&best<=0)return null;return {v:best,who:Q.filter((_,i)=>v[i]===best)}};
  out.avg=lead(r=>r.ab?r.h/r.ab:0,r=>r.ab+r.bb>=gp[r.t]*3.1);out.hr=lead(r=>r.hr,()=>1);out.rbi=lead(r=>r.rbi,()=>1);out.sb=lead(r=>r.sb,()=>1);
  out.w=lead(r=>r.w,()=>1);out.era=lead(r=>r.er*27/r.outs,r=>r.outs>=gp[r.t]*3&&r.outs>0,1);out.so=lead(r=>r.so,()=>1);out.sv=lead(r=>r.sv,()=>1);
  const val=r=>(r.h+r.bb+r.hr*2+r.rbi*.5+r.sb*.5-r.ab*.3)+(r.outs/3*.6+r.so*.2-r.er+r.w*2+r.sv*1.5),Q=P.filter(r=>r.ab+r.bb+r.outs>0);
  let m=Q[0];for(const r of Q)if(val(r)>val(m))m=r;out.mvp=m?{v:0,who:[m]}:null;
  // 골든글러브(포지션별 1명, 외야 3명): KBO처럼 타격 위주. 수비상(df, 야수 포지션별 1명): 수비값·보살·실책 위주(출장 많을수록 유리)·올스타(포지션별 2명, 외야 6명). 타자는 가장 많이 나선 포지션, 그 포지션 경기수가 팀 경기 절반 이상
  const bv=r=>r.h+r.bb+r.hr*2+r.rbi*.5+r.sb*.5-r.ab*.3,pv=r=>r.outs/3*.6+r.so*.2-r.er+r.w*2+r.sv*1.5;
  const mainPos=r=>{let b=null;for(const k in r.pos||{})if(!b||r.pos[k]>r.pos[b])b=k;return b&&['LF','CF','RF'].includes(b)?'OF':b};
  const G=[],A=[],D=[];for(const [ps,n] of [['C',1],['1B',1],['2B',1],['3B',1],['SS',1],['OF',3],['DH',1]]){
    const dv=r=>{const c=byId[baseId(r.id)];if(!c||ps==='DH')return 90;const k=ps==='OF'?['LF','CF','RF']:[ps];return Math.max(...k.map(p=>c.ps&&c.ps[p]!=null?c.ps[p]:c.r.def))},gv=r=>(r.h+r.bb)*.1+(dv(r)-90)*gp[r.t]/10+(r.a||0)*3-(r.e||0)*3;
    const Q2=P.filter(r=>r.ab&&mainPos(r)===ps&&Object.entries(r.pos||{}).filter(([k])=>(ps==='OF'?['LF','CF','RF'].includes(k):k===ps)).reduce((s,[,v])=>s+v,0)>=gp[r.t]*.5);const Qb=[...Q2].sort((a,b)=>bv(b)-bv(a));Q2.sort((a,b)=>gv(b)-gv(a));
    G.push(...Qb.slice(0,n).map(r=>({r,ps})));if(ps!=='DH')D.push(...Q2.slice(0,n).map(r=>({r,ps})));A.push(...Qb.slice(0,n*2).map(r=>({r,ps})))}
  const QP=P.filter(r=>r.outs>=gp[r.t]*3).sort((a,b)=>pv(b)-pv(a));G.push(...QP.slice(0,1).map(r=>({r,ps:'P'})));A.push(...QP.slice(0,2).map(r=>({r,ps:'P'})));
  out.gg=G;out.as=A;out.df=D;return out}
function titleClose(L,mode,tier){const T=L.titles=titles(L),mine=Object.keys(TITLE_N).filter(k=>T[k]&&T[k].who.some(r=>r.t===0)),mvp=!!(T.mvp&&T.mvp.who[0].t===0),
    gg=T.gg.filter(x=>x.r.t===0).length,df=(T.df||[]).filter(x=>x.r.t===0).length,as=L.asSel?0:T.as.filter(x=>x.r.t===0).length;
  if(!mine.length&&!mvp&&!gg&&!as&&!df)return '';const E=EC(),md=mode==='yl'?'year':'league',m=mode==='yl'?1:1+.25*(tier-1);
  const aw=E&&E.seasonAwards?E.seasonAwards(md,tier,{titles:mine,mvp,gg,as,df},mode==='yl'&&!!(S.ylWon||{})[L.year]):{pt:0,lines:[...mine.map(k=>[TITLE_N[k]+' 1위',300*m]),...(mvp?[['MVP',1000*m]]:[]),...(gg?[[`골든글러브 ${gg}명`,gg*200*m]]:[]),...(as?[[`올스타 ${as}명`,as*80*m]]:[]),...(df?[[`수비상 ${df}명`,df*150*m]]:[])]};
  L.awLines=aw.lines;const g=give({pt:aw.pt},E?0:Math.round(aw.lines.reduce((s,x)=>s+x[1],0)),false);
  return ` · 시즌 시상 ${aw.lines.map(x=>x[0]).join('·')}${g?' '+g:''}`}
// 연도별 리그 전반기 종료(정규시즌 절반) 때 올스타 선정: 포지션별 상위 2명(외야 6명). 내 선수 수만큼 보너스
function midAS(L){if(!L.year||L.asSel||L.round<Math.floor(L.sched.length/2))return '';const A=titles(L).as;L.asSel=A.map(x=>({ps:x.ps,id:x.r.id,t:x.r.t}));
  const n=A.filter(x=>x.r.t===0).length;if(!n)return ' · 올스타 선정 발표(내 선수 없음)';const E=EC(),rewin=!!(S.ylWon||{})[L.year];
  const aw=E&&E.seasonAwards?E.seasonAwards('year',0,{as:n},rewin):{pt:n*80,lines:[[`올스타 ${n}명`,n*80]]};L.asLines=aw.lines;
  const g=give({pt:aw.pt},E?0:aw.pt,false);return ` · 올스타 ${n}명 선정${g?' '+g:''}`}
function asHTML(L){if(!L.asSel)return '';return `<section class="band"><h3>올스타 <small>전반기 성적으로 선정 · 포지션별 2명</small></h3><p class="mini">${L.asSel.map(x=>`<span style="${x.t===0?'color:#e07a45;font-weight:700':''}">${x.ps} ${esc((byId[baseId(x.id)]||{}).name||'?')} <small>${esc(tname(x.t,L))}</small></span>`).join(' · ')}</p>${L.asLines?`<p><b>내 구단 올스타 보너스</b> ${L.asLines.map(x=>`${esc(x[0])} +${Math.round(x[1]).toLocaleString()}`).join(' · ')}</p>`:''}</section>`}
function titleHTML(L){const T=L.titles;if(!T)return '';const fmt=(k,v)=>k==='avg'?v.toFixed(3).replace(/^0/,''):k==='era'?v.toFixed(2):v;
  const nm=r=>`${esc((byId[baseId(r.id)]||{}).name||'?')} <small>${esc(tname(r.t,L))}</small>`;
  const aw=k=>T[k].map(x=>`<span class="${x.r.t===0?'me':''}" style="${x.r.t===0?'color:#e07a45;font-weight:700':''}">${x.ps} ${esc((byId[baseId(x.r.id)]||{}).name||'?')}</span>`).join(' · ');
  return `<section class="band"><h3>개인 타이틀 <small>정규시즌 · 타율 규정타석 경기수×3.1 · 평균자책 규정이닝 경기수×1</small></h3><div class="scroll"><table class="tbl"><tbody>
  ${[...Object.keys(TITLE_N),'mvp'].filter(k=>T[k]).map(k=>`<tr class="${T[k].who.some(r=>r.t===0)?'me':''}"><td class="l">${k==='mvp'?'MVP':TITLE_N[k]}</td><td class="l">${(w=>{const me=w.filter(r=>r.t===0),ot=w.filter(r=>r.t!==0),sh=[...me,...ot].slice(0,Math.max(3,me.length));return sh.map(nm).join(', ')+(w.length>sh.length?` 외 ${w.length-sh.length}명`:'')})(T[k].who)}</td><td>${k==='mvp'?'':fmt(k,T[k].v)}</td></tr>`).join('')}</tbody></table></div>
  ${T.gg?`<p class="mini"><b>골든글러브</b> ${aw('gg')}</p>${T.df?`<p class="mini"><b>수비상</b> ${aw('df')}</p>`:''}${L.asSel?'':`<p class="mini"><b>올스타</b> ${aw('as')}</p>`}`:''}
  ${L.awLines&&L.awLines.length?`<p><b>내 구단 시상 보너스</b> ${L.awLines.map(x=>`${esc(x[0])} +${Math.round(x[1]).toLocaleString()}`).join(' · ')}</p>`:''}</section>`}
// --- 주간 리그 상대 ---
let RANKED=null,YOVR=null;
function ranked(){if(RANKED)return RANKED;YOVR={};const L=Object.keys(TEAMYEARS).filter(k=>TEAMYEARS[k].length>=20).map(k=>{const o=teamOvr(teamYear(k));YOVR[k]=o;return [k,o]});
  return RANKED=L.sort((a,b)=>a[1]-b[1]).map(x=>x[0])}
const MIXPOOL={};
function mixTeam(t,name,color){const [lo,hi]=TIERS[t-1].m,P=MIXPOOL[t]||(MIXPOOL[t]=CARDS.filter(c=>!c.v&&c.ovr>=lo&&c.ovr<=hi));
  for(let tries=0;tries<20;tries++){const used=new Set(),ids=[];
    const take=(f,n)=>{let L=P.filter(f);if(!L.length)L=CARDS.filter(c=>!c.v&&f(c));if(!L.length)return;if(!L.length)return;for(let i=0;i<n;i++){let c,k=0;do c=pick(L);while(used.has(c.pk)&&k++<50);if(!used.has(c.pk)){ids.push(c.id);used.add(c.pk)}}};
    for(const p of ['C','1B','2B','3B','SS','LF','CF','RF'])take(c=>c.type==='B'&&c.ps&&c.ps[p]!=null,2);take(c=>c.type==='B',6);take(c=>c.pos==='SP',6);take(c=>c.pos==='RP',7);
    const T={name,full:name,color,mix:1,...bestLineup(ids),rotIdx:0};if(T.lineup.length===9&&T.rot.length>=5&&T.pen.length)return T}
  return null}
function lgTeams(t){const T=TIERS[t-1],out=[];
  if(T.m){const reg=[...MIX_REG].sort(()=>Math.random()-.5),nick=[...MIX_NICK].sort(()=>Math.random()-.5);
    for(let i=0;out.length<9;i++){const x=mixTeam(t,reg[i%reg.length]+' '+nick[i%nick.length],MIX_COL[i%MIX_COL.length]);if(x){if(T.c)x.cv=pick(T.c);out.push(x)}}}
  else{const R=ranked(),pool=R.slice(Math.floor(T.r[0]*R.length),Math.ceil(T.r[1]*R.length)),ks=[];while(ks.length<9){const k=pick(pool);if(!ks.includes(k))ks.push(k)}
    for(const k of ks)out.push({...teamYear(k),cv:pick(T.c)})}
  for(const x of out)aiKit(x,t);return out}
// 상위 단계 AI 무장(SJ 2026-11-26): 단계가 오를수록 하나씩 추가. 7 작전 카드(특수·황금) · 8 +서포트 카드(강화판 2장) · 9 +스킬 블록 2개씩 · 10 +스킬 블록 4개씩(C급). B·A급이면 같은 무장을 한 최강 덱도 10단계 우승 10% 안팎이라 C로
// 시뮬(2026-11-26, 코스트 150 최강 덱 + A급 블록 4개씩·장비·서포트·황금 작전): 포스트시즌 우승률 7단계 100% · 8단계 75% · 9단계 62% · 10단계 31~37%
const AI_KIT={7:{tc:1},8:{tc:1,sup:1},9:{tc:1,sup:1,blk:'C',nb:2},10:{tc:1,sup:1,blk:'C',nb:4}};
function aiKit(T,t){const k=AI_KIT[t];if(!k)return T;const ids=[...T.lineup.map(x=>x.id),...(T.rot||[]),...(T.pen||[])].filter(Boolean),cs=ids.map(id=>byId[id]).filter(Boolean);
  if(k.tc)T.tsel=pick(TCARDS.filter(x=>x[3]!=='일반'))[0];
  if(k.sup){const top=cs.slice().sort((a,b)=>b.ovr-a.ovr);T.sup=[];for(const c of top){const sp=SUPS.filter(x=>x[0].endsWith('+')&&(x[2]==='all'||x[2]===c.type));if(T.sup.length>=SUP_MAX)break;T.sup.push({id:pick(sp)[0],cid:c.id,left:999})}}
  if(k.blk){T.kb=k.blk;T.nb=k.nb} // 블록은 저장하지 않고(세이브·Firestore 용량) 경기 때 만들어 메모리에만 둠
  return T}
const AI_BLK=new WeakMap();
function aiBlocks(T){if(!T.kb)return T.blocks;let b=AI_BLK.get(T);if(!b){b=[];for(const id of [...T.lineup.map(x=>x.id),...(T.rot||[]),...(T.pen||[])].filter(Boolean)){const c=byId[id];if(c)for(let i=0;i<(T.nb||4);i++){const x=mkBlock(c.type,T.kb);x.on=c.id;b.push(x)}}AI_BLK.set(T,b)}return b}
function newSeason(tier){const prev=S.season;tier=tier||(prev&&prev.tier)||1;
  const teams=[{user:true},...lgTeams(tier)];
  S.season={n:prev?prev.n+1:1,tier,wk:cyStart(),teams,sched:sched3(10),round:0,st:newSt(10),over:false,last:[]};S.last=[];S.lgBest=Math.max(S.lgBest||1,tier);save()}
// 정규시즌 마감: 순위 보너스(leagueEnd)·시즌 시상은 그대로 여기서. 그다음 상위 4팀 포스트시즌 대진(3일차 0시에 열림)
function lgClose(s){if(s.regDone)return '';s.regDone=1;const R=lgStand(s).map(x=>x.i),rk=R.indexOf(0)+1,first=rk===1&&!(S.lgFirst||{})[s.tier];s.rank=rk;
  const E=EC(),bonus=give(E?E.leagueEnd(s.tier,rk,first):null,[0,6000,4000,3000,2000,1500][rk]||800);if(rk===1)S.lgFirst={...(S.lgFirst||{}),[s.tier]:1};
  s.po={st:'준결승',R:R.slice(0,4),ser:[{a:R[0],b:R[3],w:[0,0],d:0},{a:R[1],b:R[2],w:[0,0],d:0}],log:[]};
  return ` · ${tierName(s.tier)} 정규시즌 ${rk}위${bonus?' · 보너스 '+bonus:''}`+titleClose(s,'lg',s.tier)+(rk<=4?` · 포스트시즌 진출 (${md(s.wk+2*864e5)} 0시 시작)`:' · 포스트시즌 진출 실패')}
const PO_NEED=2,PO_MAX=5;
const lgPoSer=s=>s.po&&s.po.ser.find(x=>!x.done&&(x.a===0||x.b===0));
// 포스트시즌 한 경기. x=시리즈, g=내가 직접 본 경기(없으면 시뮬). 무승부는 승수에 안 들어가고 5경기 안에 안 끝나면 상위 시드 진출
function lgPoGame(s,x,g){const k=x.w[0]+x.w[1]+(x.d||0),pr=k%2===0?[x.b,x.a]:[x.a,x.b],mine=pr.includes(0);
  const gg=g||simAll(mkGame(simT(s,pr[0]),simT(s,pr[1])));s.teams.forEach((t,i)=>{if(i&&pr.includes(i))t.rotIdx=(t.rotIdx||0)+1});fatGame(s,pr,gg);dayEnd(s);
  s.last=[{a:pr[0],h:pr[1],sc:gg.sc,me:mine}];if(mine){s.hl=hlOf(gg,pr);recGame(s,gg,pr,s.po.st);predDo(s,gg,pr.indexOf(0))}
  let res=null;if(gg.res<0){x.d=(x.d||0)+1;res=mine?'d':null}else{const win=pr[gg.res];x.w[win===x.a?0:1]++;res=mine?(win===0?'w':'l'):null}
  if(x.w[0]>=PO_NEED||x.w[1]>=PO_NEED||x.w[0]+x.w[1]+x.d>=PO_MAX){x.done=1;x.win=x.w[1]>x.w[0]?x.b:x.a;
    s.po.log.push(`${s.po.st}: ${tname(x.win,s)} ${Math.max(...x.w)}승 ${Math.min(...x.w)}패${x.d?' '+x.d+'무':''}로 ${tname(x.win===x.a?x.b:x.a,s)}에 승리`)}
  return res}
// 내 경기가 아닌 시리즈는 한 번에 처리하고 다음 단계로. all=true면 내 시리즈도 결과만(주기 끝)
function lgPoTick(s,all){let msg='';for(let k=0;k<4&&s.po&&!s.over;k++){
  for(const x of s.po.ser)if(!x.done&&(all||(x.a!==0&&x.b!==0)))while(!x.done)lgPoGame(s,x,null);
  if(!s.po.ser.every(x=>x.done))break;
  if(s.po.st==='준결승'){const [w1,w2]=s.po.ser.map(x=>x.win),R=s.po.R,a=R.indexOf(w1)<=R.indexOf(w2)?w1:w2,b=a===w1?w2:w1;
    if(s.po.ser.some(x=>(x.a===0||x.b===0)&&x.win!==0))msg+=' · 준결승 탈락';if(a===0||b===0)msg+=' · 결승 진출';
    s.po={...s.po,st:'결승',ser:[{a,b,w:[0,0],d:0}]};continue}
  const x=s.po.ser[0];s.over=true;s.champ=x.win;
  {const E=EC(),inF=x.a===0||x.b===0,inP=s.po.R&&s.po.R.indexOf(0)>=0&&s.po.R.indexOf(0)<4,place=x.win===0?1:inF?2:inP?3:0; // 포스트시즌 보상(경제: ECON.leaguePost)
   if(place&&E&&E.leaguePost){if(!S.lgChamp)S.lgChamp={...(S.lgFirst||{})};const first=place===1&&!S.lgChamp[s.tier];if(place===1)S.lgChamp={...S.lgChamp,[s.tier]:1};const g=give(E.leaguePost(s.tier,place,first),0);if(g)msg+=` · ${['','우승','준우승','4강'][place]} 보상 ${g}`}}
  if(x.win===0){msg+=` · ${tierName(s.tier)} 포스트시즌 우승!${s.tier<10?` 다음 시즌 ${tierName(s.tier+1)}로 승급`:''}`;
    const E=EC();if(E&&E.missionLeague){const T=userT(s),cs=[...(T.lineup||[]).map(x=>x.id),...(T.bench||[]),...(T.rot||[]),...(T.pen||[])].filter(Boolean).map(id=>byId[baseId(id)]).filter(Boolean);
      const out=E.missionLeague(S,s.tier,cs)||[];if(out.length)msg+=' · 미션 달성: '+out.map(o=>`${o.ch} ${o.what}${o.rw&&E.rwText?' ('+E.rwText(o.rw)+')':''}`).join(', ')}}
  else{if(x.a===0||x.b===0)msg+=' · 결승 패배';msg+=` · 우승은 ${tname(x.win,s)}`}}
  return msg}
// 시간이 지나면: 2일차 24시에 정규 마감(남은 경기 결과만·보상 없음), 3일차 포스트시즌 진행, 주기가 끝나면 남은 경기 결과만 처리 후 새 시즌
function weekTick(){const s=S&&S.season;if(!s)return false;if(!s.tier){s.tier=1;s.wk=cyStart();return false}
  let msg='';const sim=f=>{s.noPred=1;f();delete s.noPred;PM=''};
  if(!s.regDone&&Date.now()>=s.wk+2*864e5){sim(()=>{while(s.round<s.sched.length)lgPlay(s,null)});msg+=lgClose(s)}
  if(s.wk>=cyStart()){if(s.regDone&&!s.over&&poOpen(s))msg+=lgPoTick(s);if(msg){S.toast=msg.replace(/^ · /,'');save()}return false}
  if(!s.over)sim(()=>{msg+=lgPoTick(s,true)});
  S.lgHist=[...(S.lgHist||[]),{wk:s.wk,tier:s.tier,rank:s.rank,won:s.champ===0}].slice(-30);
  const nt=s.champ===0&&s.tier<10?s.tier+1:s.tier;newSeason(nt);
  S.toast=`지난 시즌 ${tierName(s.tier)} 정규 ${s.rank}위${s.champ===0?' · 포스트시즌 우승':''} 마감${msg?' ('+msg.replace(/^ · /,'')+')':''} · 이번 시즌은 ${tierName(nt)}예요`;return true}
function startGame(auto,mode){mode=mode||'lg';useMode(mode==='yl'?'yl':'lg');const e=validate();if(e.length){S.msg='⚠ 경기 전에 고쳐 주세요: '+e.slice(0,4).join(' / ')+(e.length>4?' 외':'');location.hash='lineup';render();return}
  if(mode==='lg'&&weekTick()){render();return}
  const L=mode==='yl'?S.yl:S.season;if(!L||L.over||L.done)return;
  const pr=curPair(L);
  if(!pr){if(mode==='yl'){ylBye(L);return}return}
  G=mkGame(simT(L,pr[0]),simT(L,pr[1]));G.pair=pr;G.me=pr.indexOf(0);G.ctrl=null;G.mode=mode;
  simAll(G);if(auto)endGame();else{G.hl=1;location.hash='game';render()}}
const go=h=>{if(location.hash!=='#'+h)location.hash=h;else render()};
function endGame(){if(G.mode==='yl')ylFinish();else finishRound()}
function finishRound(){const s=S.season;let msg;
  if(s.po){const x=lgPoSer(s),res=x?lgPoGame(s,x,G):null;msg=userReward(res,'lg',s.tier)+lgPoTick(s)}
  else{const res=lgPlay(s,G);msg=userReward(res,'lg',s.tier);if(s.round>=s.sched.length)msg+=lgClose(s)+(poOpen(s)?lgPoTick(s):'')}
  S.last=s.last;S.toast=msg;rollCond();G=null;save();go('season')}
// --- 연도별 리그 ---
const YL_YEARS=()=>[...new Set(Object.keys(TEAMYEARS).filter(k=>TEAMYEARS[k].length>=20).map(k=>+k.split(' ')[0]))].sort((a,b)=>a-b);
const yearKeys=y=>Object.keys(TEAMYEARS).filter(k=>k.split(' ')[0]===String(y)&&TEAMYEARS[k].length>=20);
// 연도별 리그는 실제 시간으로 진행: 팀당 약 144경기. 참가 즉시 1라운드, 이후 매일 08:00~23:00(KST) 15분마다 1라운드(포스트시즌은 1경기씩).
// 접속하지 않은 동안의 라운드는 다음 접속 때 한꺼번에 처리.
const YL_GAMES=144,YL_FROM=8*60,YL_TO=23*60,YL_STEP=15,YL_PER=Math.floor((YL_TO-YL_FROM)/YL_STEP)+1,HLK=['r','hr','c','e'];
// t까지 지난 진행 시각(슬롯) 수
function ylSlots(t){const k=t+H9,d=Math.floor(k/864e5),m=Math.floor((k-d*864e5)/6e4);return d*YL_PER+Math.max(0,Math.min(YL_PER,Math.floor((m-YL_FROM)/YL_STEP)+1))}
function ylNextAt(t){const k=t+H9,d=Math.floor(k/864e5),m=(k-d*864e5)/6e4;let nm=m<YL_FROM?YL_FROM:YL_FROM+(Math.floor((m-YL_FROM)/YL_STEP)+1)*YL_STEP,dd=d;if(nm>YL_TO){dd++;nm=YL_FROM}return dd*864e5+nm*6e4-H9}
function schedYL(n){const m=n%2?n+1:n,base=rr(m),reps=Math.max(1,Math.round(YL_GAMES/(n-1))),out=[];for(let r=0;r<reps;r++)out.push(...(r%2?base.map(x=>x.map(p=>[p[1],p[0]])):base));return out}
// 내 경기 기록 보관(최근 20경기): 라인스코어·박스스코어·하이라이트
function recGame(L,g,pr,tag){const B=s=>Object.values(g.bx[s]).map(b=>[b.c.name,b.pos,b.ab,b.h,b.hr,b.rbi,b.r,b.bb,b.k,b.sb,b.a||0,b.e||0]),P=s=>g.px[s].map(p=>[p.c.name,p.outs,p.h,p.r,p.bb,p.k]);
  L.gl=[...(L.gl||[]),{n:tag||L.round+1,a:pr[0],h:pr[1],sc:g.sc,ln:g.line,ht:g.hits,bx:[B(0),B(1)],px:[P(0),P(1)],hl:hlOf(g,pr).log}].slice(-20)}
function gamesHTML(L){const G=(L.gl||[]).slice().reverse();if(!G.length)return '';const ip=o=>`${Math.floor(o/3)}.${o%3}`;
  return `<section class="band"><h3>내 경기 기록 <small>최근 ${G.length}경기 · 눌러서 세부 기록</small></h3>${G.map(x=>{const me=x.a===0?0:1,w=x.sc[me]>x.sc[1-me]?'승':x.sc[me]<x.sc[1-me]?'패':'무',n=Math.max(9,x.ln[0].length);
   return `<details class="gl"><summary class="glr"><b class="wl ${w==='승'?'w':w==='패'?'l':'d'}">${w}</b><span class="gn">${typeof x.n==='number'?x.n+'경기':esc(x.n)}</span><span class="ta${me===0?' me':''}">${esc(tname(x.a,L))}</span><span class="gs"><i class="${x.sc[0]>x.sc[1]?'hi':''}">${x.sc[0]}</i><em>:</em><i class="${x.sc[1]>x.sc[0]?'hi':''}">${x.sc[1]}</i></span><span class="th${me===1?' me':''}">${esc(tname(x.h,L))}</span><small class="ha">${me?'홈':'원정'}</small></summary>
   <div class="scroll"><table class="tbl ls"><thead><tr><th class="l"></th>${Array.from({length:n},(_,i)=>`<th>${i+1}</th>`).join('')}<th>R</th><th>H</th></tr></thead><tbody>${[0,1].map(s=>`<tr><td class="l">${esc(tname(s?x.h:x.a,L))}</td>${Array.from({length:n},(_,i)=>`<td>${x.ln[s][i]??''}</td>`).join('')}<td><b>${x.sc[s]}</b></td><td>${x.ht[s]}</td></tr>`).join('')}</tbody></table></div>
   ${[0,1].map(s=>`<div class="scroll"><table class="tbl"><thead><tr><th class="l">${esc(tname(s?x.h:x.a,L))}</th><th>타수</th><th>안타</th><th>홈런</th><th>타점</th><th>득점</th><th>볼넷</th><th>삼진</th><th>도루</th><th>보살</th><th>실책</th></tr></thead><tbody>${x.bx[s].map(b=>`<tr><td class="l">${esc(b[0])} <small>${PK[b[1]]||b[1]}</small></td>${b.slice(2).map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
   <table class="tbl"><thead><tr><th class="l">투수</th><th>이닝</th><th>피안타</th><th>실점</th><th>볼넷</th><th>삼진</th></tr></thead><tbody>${x.px[s].map(p=>`<tr><td class="l">${esc(p[0])}</td><td>${ip(p[1])}</td>${p.slice(2).map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}
   ${x.hl.length?`<ol class="glog">${x.hl.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}</details>`}).join('')}</section>`}
// 내 선수 시즌 누적 기록(정규시즌, L.ps)
function statsHTML(L){const P=Object.values(L.ps||{}).filter(r=>r.t===0);if(!P.length)return '';const nm=r=>esc((byId[baseId(r.id)]||{}).name||'?'),f3=v=>v.toFixed(3).replace(/^0/,'');
  const Bt=P.filter(r=>r.ab+r.bb>0).sort((a,b)=>(b.ab+b.bb)-(a.ab+a.bb)),Pt=P.filter(r=>r.outs>0).sort((a,b)=>b.outs-a.outs);
  return `<section class="band"><details><summary><b>내 선수 시즌 기록</b></summary><div class="scroll"><table class="tbl"><thead><tr><th class="l">타자</th><th>타율</th><th>출루율</th><th>타수</th><th>안타</th><th>홈런</th><th>타점</th><th>도루</th><th>볼넷</th><th>보살</th><th>실책</th></tr></thead><tbody>
  ${Bt.map(r=>`<tr><td class="l">${nm(r)}</td><td>${r.ab?f3(r.h/r.ab):'-'}</td><td>${f3((r.h+r.bb)/Math.max(1,r.ab+r.bb))}</td><td>${r.ab}</td><td>${r.h}</td><td>${r.hr}</td><td>${r.rbi}</td><td>${r.sb}</td><td>${r.bb}</td><td>${r.a||0}</td><td>${r.e||0}</td></tr>`).join('')}</tbody></table>
  <table class="tbl"><thead><tr><th class="l">투수</th><th>평균자책</th><th>이닝</th><th>승</th><th>세이브</th><th>탈삼진</th><th>실점</th></tr></thead><tbody>
  ${Pt.map(r=>`<tr><td class="l">${nm(r)}</td><td>${(r.er*27/r.outs).toFixed(2)}</td><td>${Math.floor(r.outs/3)}.${r.outs%3}</td><td>${r.w}</td><td>${r.sv}</td><td>${r.so}</td><td>${r.er}</td></tr>`).join('')}</tbody></table></div></details></section>`}
const hlOf=(g,pr)=>({a:pr[0],h:pr[1],sc:g.sc,log:(gameMVP(g)?['경기 MVP · '+gameMVP(g)]:[]).concat(g.log.filter(x=>HLK.includes(x.k)||/보살|실책|저지/.test(x.txt)).map(x=>`${x.inn}회${x.half?'말':'초'} ${x.txt}`).slice(-14))});
function ylStep(L){let res=null,msg='';
  if(!L.post){res=lgPlay(L,null);msg+=midAS(L);if(L.round>=L.sched.length){const inP=ylStartPost(L);msg+=` · 정규시즌 ${L.rank}위${L.titleMsg||''}${inP?' · 포스트시즌 진출':' · 포스트시즌 진출 실패'}`+ylAdvance(L)}}
  else{res=seriesGame(L,null);msg+=ylAdvance(L)}
  const r=res?userReward(res,'yl'):'';if(res)rollCond();return {res,msg,r}}
function ylTick(){const L=S&&S.yl;if(!L||L.done)return;if(!L.t0){L.t0=Date.now();L.steps=0}
  const due=ylSlots(Date.now())-ylSlots(L.t0)+1+(L.man||0);if((L.steps||0)>=due)return;const c={w:0,l:0,d:0},ev=[];let n=0;
  while((L.steps||0)<due&&!L.done&&n<500){const x=ylStep(L);L.steps=(L.steps||0)+1;n++;if(x.res)c[x.res]++;if(x.msg)ev.push(x.msg.replace(/^ · /,''));if(x.res&&n===1&&due-L.steps===0)ev.unshift(x.r)}
  const g=c.w+c.l+c.d;S.toast=`${L.year} 리그 ${n}라운드 진행${g?` · 내 경기 ${c.w}승 ${c.l}패${c.d?' '+c.d+'무':''}`:''}${ev.length?' · '+ev.join(' · '):''}`;save()}
function ylNew(y){const teams=[{user:true},...yearKeys(y).map(teamYear)];
  S.yl={year:y,teams,sched:schedYL(teams.length),round:0,st:newSt(teams.length),last:[],post:null,done:false,log:[],t0:Date.now(),steps:0};ylTick()}
function ylBye(L){L.man=(L.man||0)+1;L.steps=(L.steps||0)+1;if(L.post){S.toast=(seriesGame(L,null),ylAdvance(L)).replace(/^ · /,'')||'진행 완료';save();render();return}lgPlay(L,null);let msg='휴식 라운드 완료'+midAS(L);if(L.round>=L.sched.length){ylStartPost(L);msg+=(L.titleMsg||'')+ylAdvance(L)}S.toast=msg;save();render()}
function ylStartPost(L){const R=lgStand(L).map(x=>x.i);L.rank=R.indexOf(0)+1;L.titleMsg=titleClose(L,'yl',1);
  if(L.teams.length>=8)L.post={cur:{nm:'준플레이오프',lo:R[3],hi:R[2],need:2,w:[0,0]},q:[{nm:'플레이오프',hi:R[1],need:3},{nm:'한국시리즈',hi:R[0],need:4}]};
  else L.post={cur:{nm:'한국시리즈',lo:R[1],hi:R[0],need:4,w:[0,0]},q:[]};
  const inP=[L.post.cur.lo,L.post.cur.hi,...L.post.q.map(x=>x.hi)].includes(0);
  return inP}
function seriesGame(L,g){const c=L.post,s=c.cur,k=s.w[0]+s.w[1]+(s.d||0),pr=[0,1,4,5,6].includes(k)?[s.lo,s.hi]:[s.hi,s.lo];
  const gg=g||simAll(mkGame(simT(L,pr[0]),simT(L,pr[1])));L.teams.forEach((t,i)=>{if(i&&pr.includes(i))t.rotIdx=(t.rotIdx||0)+1});fatGame(L,pr,gg);dayEnd(L);
  L.last=[{a:pr[0],h:pr[1],sc:gg.sc,me:pr.includes(0)}];if(pr.includes(0)){L.hl=hlOf(gg,pr);recGame(L,gg,pr,L.post.cur.nm);predDo(L,gg,pr.indexOf(0))}
  if(gg.res<0){s.d=(s.d||0)+1;return pr.includes(0)?'d':null}const win=pr[gg.res];s.w[win===s.lo?0:1]++;return pr.includes(0)?(win===0?'w':'l'):null}
function ylAdvance(L){let msg='';
  for(let guard=0;guard<60&&!L.done;guard++){const s=L.post.cur;
    if(s.w[0]>=s.need||s.w[1]>=s.need){const wi=s.w[0]>=s.need?s.lo:s.hi,lo=wi===s.lo?s.hi:s.lo,wn=Math.max(...s.w),ln=Math.min(...s.w);
      L.log.push(`${s.nm}: ${tname(wi,L)} ${wn}승 ${ln}패${s.d?' '+s.d+'무':''}로 ${tname(lo,L)}에 승리`);
      if(lo===0){msg+=` · ${s.nm} 탈락`;L.place=s.nm==='한국시리즈'?2:Math.max(3,L.rank)}
      if(L.post.q.length){const nx=L.post.q.shift();L.post.cur={...nx,lo:wi,w:[0,0]};if(wi===0)msg+=` · ${nx.nm} 진출`}
      else{L.done=true;L.champ=wi;
        const E=EC();if(wi===0){const first=!(S.ylWon||{})[L.year];S.ylWon={...(S.ylWon||{}),[L.year]:((S.ylWon||{})[L.year]||0)+1};L.place=1;msg+=` · ${L.year} 한국시리즈 우승! ${give(E?E.yearLeague(1,first):null,10000,!first)}`;if(E&&E.missionLeague){const T=userT(L),cs=[...(T.lineup||[]).map(x=>x.id),...(T.bench||[]),...(T.rot||[]),...(T.pen||[])].filter(Boolean).map(id=>byId[baseId(id)]).filter(Boolean);const out=E.missionLeague(S,1,cs)||[];if(out.length)msg+=' · 미션 달성: '+out.map(o=>`${o.ch} ${o.what}`).join(', ')}}
        else{const pl=L.place||Math.max(3,L.rank);L.place=pl;const g=E?give(E.yearLeague(pl,false),0,true):'';msg+=` · ${L.year} 우승은 ${tname(wi,L)}${g?' · '+g:''}`}
        S.ylHist=[...(S.ylHist||[]),{year:L.year,rank:L.rank,champ:wi===0?S.team.name:tname(wi,L),won:wi===0,t:Date.now()}].slice(-40)}
      continue}
    if(s.lo===0||s.hi===0)break;seriesGame(L,null)}
  return msg}
function ylFinish(){const L=S.yl;let res,msg;L.man=(L.man||0)+1;L.steps=(L.steps||0)+1;
  if(L.post){res=seriesGame(L,G);msg=userReward(res,'yl')+ylAdvance(L)}
  else{res=lgPlay(L,G);msg=userReward(res,'yl')+midAS(L);if(L.round>=L.sched.length){const inP=ylStartPost(L);msg+=` · 정규시즌 ${L.rank}위${L.titleMsg||''}${inP?' · 포스트시즌 진출':' · 포스트시즌 진출 실패'}`+ylAdvance(L)}}
  S.toast=msg;rollCond();G=null;save();go('years')}
// 다음 휴식일까지 자동(SJ 2026-11-26): 내 경기가 없는 라운드·포스트시즌 진입·시즌 종료 직전에 멈춤. 반복 보상은 ECON 일일 상한 그대로
const YL_RUN_MAX=10;
function ylToRest(){useMode('yl');if(validate().length){location.hash='lineup';render();return}let n=0,w=0,l=0,t=0;const msgs=[];
  while(n<YL_RUN_MAX){const L=S.yl;if(!L||L.done||L.post)break;const pr=curPair(L);if(!pr)break;
    G=mkGame(simT(L,pr[0]),simT(L,pr[1]));G.pair=pr;G.me=pr.indexOf(0);G.ctrl=null;G.mode='yl';simAll(G);ylFinish();n++;msgs.push(S.toast||'');
    const h=S.yl&&S.yl.hl;if(h){const my=h.a===0?h.sc[0]:h.sc[1],op=h.a===0?h.sc[1]:h.sc[0];if(my>op)w++;else if(my<op)l++;else t++}}
  if(n){S.toast=`${n}경기 자동 진행 · ${w}승 ${l}패${t?` ${t}무`:''}`+(msgs.some(m=>/상한/.test(m))?' · 오늘 반복 보상 상한 도달':'')+(S.yl&&S.yl.post?' · 포스트시즌 진출':'');save()}render()}
// --- 화면 ---
function tableHTML(L,title){L=L||S.season;const R=lgStand(L),top=R[0],me=R.findIndex(x=>x.i===0)+1;
  if(!S.showStand)return `<div class="standbar"><button data-a="m-stand" aria-expanded="false">${title||'순위표'} 보기 · 현재 ${me}위</button></div>`;
  return `<section class="band"><div class="tools"><h3 style="margin:0;margin-right:auto">${title||'순위표'}</h3><button class="ghost" data-a="m-stand" aria-expanded="true">접기</button></div><div class="scroll"><table class="tbl"><thead><tr><th>순위</th><th class="l">구단</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>게임차</th><th>득점</th><th>실점</th></tr></thead><tbody>
  ${R.map((x,k)=>`<tr class="${x.i===0?'me':''}"><td>${k+1}</td><td class="l"><i class="dot" style="background:${x.i===0?'#e07a45':L.teams[x.i].color}"></i>${tvLink(x.i,L)}</td><td>${x.g}</td><td>${x.w}</td><td>${x.l}</td><td>${x.d}</td><td>${x.pct.toFixed(3).replace(/^0/,'')}</td><td>${k?(((top.w-x.w)+(x.l-top.l))/2).toFixed(1):'-'}</td><td>${x.rs}</td><td>${x.ra}</td></tr>`).join('')}</tbody></table></div></section>`}
function lastHTML(L){return lastRes(L)+gamesHTML(L)+statsHTML(L)}
function lastRes(L){return L.last&&L.last.length?`<section class="band"><h3>지난 경기</h3><div class="res">${L.last.map(x=>`<div class="${x.me?'me':''}"><span class="${x.sc[0]>x.sc[1]?'win':'lose'}">${esc(tname(x.a,L))}</span><b><i class="${x.sc[0]>x.sc[1]?'hi':''}">${x.sc[0]}</i> : <i class="${x.sc[1]>x.sc[0]?'hi':''}">${x.sc[1]}</i></b><span class="${x.sc[1]>x.sc[0]?'win':'lose'}">${esc(tname(x.h,L))}</span></div>`).join('')}</div></section>`:''}
// 내 투수 피로도 표시: 피로가 남은 투수만. 선발은 15 미만이어야 등판, 불펜은 55 이상이면 그날 휴식
function fatHTML(L){const T=teamOf(0,L),F=fatPrev(L,0,T),P=[...(T.rot||[]).map(id=>[id,'선발']),...(T.pen||[]).map(id=>[id,'불펜'])].filter(([id])=>id&&(F[id]||0)>0).sort((a,b)=>F[b[0]]-F[a[0]]);
 if(!P.length)return '<p class="note fat" style="margin:6px 0 0">투수 피로 없음</p>';
 return `<p class="note fat" style="margin:6px 0 0" title="던진 만큼 피로가 쌓이고 체력에 비례해 하루마다 회복. 선발은 피로 15 미만일 때 등판(아니면 다음 순번), 피로 20을 넘으면 구위·제구가 떨어지고, 불펜은 55 이상이면 그날 휴식. 시즌 중 새로 로테이션에 넣은 선발은 피로 75로 합류해 몇 경기 쉬어요">투수 피로 ${P.map(([id,r])=>{const v=F[id],out=r==='선발'?v>=FAT.spOk:v>=FAT.rpOut;return `<span style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px;margin-right:10px${out?';color:#ff8a7a':''}">${esc(byId[id].name)} ${fatBar(v,r==='선발')}${out?(r==='선발'?' 등판 대기':' 휴식'):''}</span>`}).join('')}</p>`}
function muHTML(L,pr,label,aS,aA){const T=S.team,e=validate(),A=teamOf(pr[0],L),H=teamOf(pr[1],L);
  const spA=byId[fatSP(A,fatPrev(L,pr[0],A))],spH=byId[fatSP(H,fatPrev(L,pr[1],H))],sp=t=>t===A?spA:spH,cost=regCards(T).reduce((x,c)=>x+c.cost,0);
  return `<div class="mu"><div class="side"><small>원정 · 평균 ${teamOvr(A)}</small><h2>${esc(tname(pr[0],L))}</h2>${sp(A)?cardHTML(sp(A),{cond:pr[0]===0?S.cond[sp(A).id]:0}):''}</div>
   <div class="vs"><small class="mlab">${label}</small><b>VS</b><div class="btns fixbtn"><button class="big" data-a="${aS}" ${e.length?'disabled':''}>하이라이트 보기</button><button data-a="${aA}" ${e.length?'disabled':''}>결과만 보기</button></div>${predHTML(L)}${fatHTML(L)}
   ${e.length?`<p class="warn">${esc(e[0])} · <a href="#lineup">라인업 수정</a></p>`:''}</div>
   <div class="side"><small>홈 · 평균 ${teamOvr(H)}</small><h2>${esc(tname(pr[1],L))}</h2>${sp(H)?cardHTML(sp(H),{cond:pr[1]===0?S.cond[sp(H).id]:0}):''}</div></div>`}
function ladderHTML(s){return `<div class="btns" style="flex-wrap:wrap;margin-top:8px" aria-label="리그 단계">${TIERS.map((t,i)=>`<span class="chip lad ${i+1===s.tier?'cur':i+1<=(S.lgBest||1)?'done':'todo'}">${i+1<s.tier||(i+1!==s.tier&&i+1<=(S.lgBest||1))?'✓ ':''}${i+1}. ${t.n}</span>`).join('')}</div>`}
// 리그 화면 탭(SJ 2026-11-26): 감독실 판 + 상세는 탭으로 나눠 한 화면에 하나씩
// 팀 기록(SJ 2026-11-26, OOTP 참고): 리그 모든 팀 공격·수비 기록 + 항목별 우리 팀 순위
function teamStatsHTML(L){const N=L.teams.length,T=Array.from({length:N},(_,i)=>({i,ab:0,h:0,hr:0,bb:0,sb:0,outs:0,er:0,so:0,sv:0,e:0}));
 for(const r of Object.values(L.ps||{})){const t=T[r.t];if(!t)continue;t.ab+=r.ab;t.h+=r.h;t.hr+=r.hr;t.bb+=r.bb;t.sb+=r.sb;t.outs+=r.outs;t.er+=r.er;t.so+=r.so;t.sv+=r.sv;t.e+=r.e||0}
 if(!T.some(t=>t.ab))return '';const f3=v=>v.toFixed(3).replace(/^0/,'');
 for(const t of T){const st=L.st[t.i]||{};t.g=(st.w||0)+(st.l||0)+(st.d||0);t.rs=st.rs||0;t.ra=st.ra||0;t.avg=t.ab?t.h/t.ab:0;t.obp=t.ab+t.bb?(t.h+t.bb)/(t.ab+t.bb):0;t.era=t.outs?t.er*27/t.outs:0}
 const OF=[['avg','타율',f3,1],['obp','출루율',f3,1],['hr','홈런',v=>v,1],['rs','득점',v=>v,1],['sb','도루',v=>v,1]],DF=[['era','평균자책',v=>v.toFixed(2),0],['ra','실점',v=>v,0],['so','탈삼진',v=>v,1],['sv','세이브',v=>v,1],['e','실책',v=>v,0]];
 const rk=(k,hi)=>{const me=T[0][k];return 1+T.filter(t=>hi?t[k]>me:t[k]<me).length};
 const chips=(C)=>C.map(([k,n,f,hi])=>{const r=rk(k,hi);return `<span class="tsr${r<=3?' top':r>N-3?' low':''}">${n} <b>${r}위</b> <small>${f(T[0][k])}</small></span>`}).join('');
 const K=S.tsK||'o',C=K==='o'?OF:DF,sk=S.tsS&&C.find(c=>c[0]===S.tsS)||C[0],R=T.slice().sort((a,b)=>sk[3]?b[sk[0]]-a[sk[0]]:a[sk[0]]-b[sk[0]]);
 return `<section class="band tstat"><div class="tools"><h3 style="margin:0;margin-right:auto">팀 기록 <small class="note">리그 ${N}팀 중 우리 팀 순위</small></h3></div>
 <div class="tsrow"><b>공격</b>${chips(OF)}</div><div class="tsrow"><b>수비</b>${chips(DF)}</div>
 <div class="tabs" style="margin:10px 0 6px">${[['o','공격'],['d','수비']].map(([k,n])=>`<button class="${K===k?'on':''}" data-a="tsk" data-k="${k}">${n}</button>`).join('')}</div>
 <div class="scroll"><table class="tbl"><thead><tr><th></th><th class="l">구단</th><th>경기</th>${C.map(([k,n])=>`<th><button class="thb${sk[0]===k?' on':''}" data-a="tss" data-k="${k}">${n}${sk[0]===k?' ▾':''}</button></th>`).join('')}</tr></thead><tbody>${R.map((t,j)=>`<tr class="${t.i===0?'me':''}"><td>${j+1}</td><td class="l"><i class="dot" style="background:${t.i===0?'#e07a45':L.teams[t.i].color}"></i>${tvLink(t.i,L)}</td><td>${t.g}</td>${C.map(([k,,f])=>`<td>${f(t[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}
// 다른 팀 보기(SJ 2026-11-26): 순위표·팀 기록의 구단 이름을 누르면 그 팀 라인업·투수진·시즌 기록
const tvLink=(i,L)=>`<button class="tvl" data-a="tview" data-g="${MODEK(L)}" data-i="${i}">${esc(tname(i,L))}</button>`;
// 다른 팀 라인업 보드(읽기 전용): 내 라인업 화면처럼 카드 줄로
function tvBoard(T){const cell=(id,lab)=>{const c=byId[id];return c?`<div class="tvc">${card(c,{stats:0,nocond:1})}<span class="tvlab">${lab}</span></div>`:''};
 const B=(T.lineup||[]).map((x,k)=>cell(x.id,`${k+1}번 · ${x.pos}`)).join(''),Bn=(T.bench||[]).map(id=>cell(id,'벤치')).join(''),Rt=(T.rot||[]).map((id,k)=>cell(id,`선발 ${k+1}`)).join(''),Pn=(T.pen||[]).map((id,k)=>cell(id,k===(T.pen||[]).length-1?'마무리':'불펜')).join('');
 return `<div class="tvb"><div class="tvr"><b class="tvh">야수</b><div class="tvs">${B}<i class="tvsep"></i>${Bn}</div></div><div class="tvr"><b class="tvh">투수</b><div class="tvs">${Rt}<i class="tvsep"></i>${Pn}</div></div></div>`}
function teamViewHTML(L,i){const T=teamOf(i,L);if(!T)return '';const R=lgStand(L),rk=R.findIndex(x=>x.i===i)+1,st=R.find(x=>x.i===i)||{},P=L.ps||{},ps=id=>P[i+'|'+id]||P[i+'|'+baseId(id)]||null,f3=v=>v.toFixed(3).replace(/^0/,'');
 const nm=c=>`<button class="tvl" data-dexv="${esc(c.id)}">${esc(c.name)}</button>`;
 const bat=(c,lab,pos)=>{const r=ps(c.id);return `<tr><td>${lab}</td><td>${esc(pos||c.pos)}</td><td class="l">${nm(c)}</td><td>${c.year}</td><td>${c.ovr}</td><td>${r&&r.ab?f3(r.h/r.ab):'-'}</td><td>${r?r.hr:'-'}</td><td>${r?r.rbi:'-'}</td><td>${r?r.sb:'-'}</td><td>${r?r.ab:'-'}</td></tr>`};
 const pit=(c,lab)=>{const r=ps(c.id);return `<tr><td>${lab}</td><td class="l">${nm(c)}</td><td>${c.year}</td><td>${c.ovr}</td><td>${r&&r.outs?(r.er*27/r.outs).toFixed(2):'-'}</td><td>${r?r.w:'-'}</td><td>${r?r.sv:'-'}</td><td>${r?r.so:'-'}</td><td>${r&&r.outs?`${Math.floor(r.outs/3)}.${r.outs%3}`:'-'}</td></tr>`};
 const lu=(T.lineup||[]).map((x,k)=>{const c=byId[x.id];return c?bat(c,k+1,x.pos):''}).join(''),bn=(T.bench||[]).map(id=>byId[id]).filter(Boolean).map(c=>bat(c,'벤치')).join('');
 const rot=(T.rot||[]).map(id=>byId[id]).filter(Boolean).map((c,k)=>pit(c,'선발 '+(k+1))).join(''),pen=(T.pen||[]).map(id=>byId[id]).filter(Boolean).map(c=>pit(c,'불펜')).join('');
 return `<section class="band tview"><div class="tools"><button class="ghost" data-a="tvx" data-g="${MODEK(L)}">← 돌아가기</button><h3 style="margin:0"><i class="dot" style="background:${i===0?'#e07a45':L.teams[i].color||'#888'}"></i>${esc(tname(i,L))}</h3><span class="pill">${rk}위 · ${st.w||0}승 ${st.l||0}패${st.d?' '+st.d+'무':''} · 득점 ${st.rs||0} · 실점 ${st.ra||0}</span>${typeof teamOvr==='function'&&T.lineup?`<span class="pill">평균 능력 ${teamOvr(T)}</span>`:''}</div>
 ${tvBoard(T)}
 <h3 style="margin:12px 0 6px">야수 기록</h3><div class="scroll"><table class="tbl"><thead><tr><th></th><th>포지션</th><th class="l">선수</th><th>연도</th><th>능력</th><th>타율</th><th>홈런</th><th>타점</th><th>도루</th><th>타수</th></tr></thead><tbody>${lu}${bn}</tbody></table></div>
 <h3 style="margin:12px 0 6px">투수 기록</h3><div class="scroll"><table class="tbl"><thead><tr><th></th><th class="l">선수</th><th>연도</th><th>능력</th><th>평균자책</th><th>승</th><th>세이브</th><th>탈삼진</th><th>이닝</th></tr></thead><tbody>${rot}${pen}</tbody></table></div></section>`}
function standFull(L,t){const o=S.showStand;S.showStand=1;const h=tableHTML(L,t);S.showStand=o;return h.replace(/<button class="ghost" data-a="m-stand"[^>]*>접기<\/button>/,'')}
function lgPage(key,T,hd){const o=T.find(t=>t[0]===S['lgTab_'+key])||T[0],tb=`<div class="lgtabs2" role="tablist">${T.map(([k,n])=>`<button role="tab" aria-selected="${k===o[0]}" class="${k===o[0]?'on':''}" data-a="lgtab" data-g="${key}" data-k="${k}">${n}</button>`).join('')}</div>`;
 const tv=S['tv_'+key];if(tv!=null&&hd.L.teams[tv]){const L=hd.L,R=lgStand(L),me=R.findIndex(x=>x.i===0)+1,my=R.find(x=>x.i===0)||{};return `<section class="ofc"><div class="ofhead"><h2>${esc(hd.title)}</h2><span class="pill">${hd.pill?hd.pill+' · ':''}${me}위 · ${my.w||0}승 ${my.l||0}패</span>${tb}</div></section>${teamViewHTML(L,tv)}`}
 if(o[0]==='ofc')return o[2](tb);const L=hd.L,R=lgStand(L),me=R.findIndex(x=>x.i===0)+1,my=R.find(x=>x.i===0)||{};
 const h=o[2]();return `<section class="ofc"><div class="ofhead"><h2>${esc(hd.title)}</h2><span class="pill">${hd.pill?hd.pill+' · ':''}${me}위 · ${my.w||0}승 ${my.l||0}패</span>${tb}</div></section>${['lg'].includes(o[0])?h.replace(/<details(?![^>]*\bopen\b)/,'<details open'):h}`}
function vSeason(){
  weekTick();useMode('lg');const s=S.season,T=S.team,nxt=s.wk+CY_D*864e5,po=s.po,mx=po&&po.ser.find(x=>x.a===0||x.b===0),up=s.champ===0&&s.tier<10;
  const head=`<p class="mini" title="${esc(TIER_DESC[s.tier-1])} · 정규시즌은 2일차 24시, 시즌은 3일차 24시에 끝나고 남은 경기는 결과만 처리(보상 없음)">${wkLabel(s.wk)} · ${s.tier<10?`포스트시즌 우승하면 <b>${tierName(s.tier+1)}</b> 승급`:'최고 단계'}</p>${ladderHTML(s)}`;
  const poTxt=po?`<p style="margin:8px 0 0"><b>${po.st}</b> ${po.ser.map(x=>`${esc(tname(x.a,s))} ${x.w[0]} : ${x.w[1]} ${esc(tname(x.b,s))}`).join(' · ')} <small>(3전 2선승)</small></p>${po.log.length?`<p class="mini">${po.log.map(esc).join(' · ')}</p>`:''}`:'';
  const state=s.over?`<p style="margin:8px 0 0"><b>${tierName(s.tier)} 시즌 종료</b> · 정규 ${s.rank}위 · 우승 <b>${esc(tname(s.champ,s))}</b></p><p>다음 시즌 <b>${md(nxt)} 0시</b> · ${up?`${tierName(s.tier+1)} 승급`:'재도전'}</p>`
    :s.regDone&&!poOpen(s)?`<p style="margin:8px 0 0">정규시즌 ${s.rank}위 마감 · ${s.rank<=4?`포스트시즌 <b>${md(s.wk+2*864e5)} 0시</b> 시작`:'포스트시즌 진출 실패 · 결과는 3일차에'}</p>`
    :s.regDone?`<p class="note" style="margin:8px 0 0">${mx&&!mx.done?'내 포스트시즌 진행 중':'내 포스트시즌 끝 · 나머지는 자동 진행'} · 3일차 24시에 남은 경기는 결과만 처리</p>`
    :`<p class="note" style="margin:8px 0 0">다음 경기 ${wdayOf(s)} · 정규시즌 남은 경기 ${s.sched.length-s.round} · ${md(s.wk+864e5)} 24시에 마감 · 상위 4팀 포스트시즌</p>`;
  const pr=s.over?null:curPair(s),six=head+poTxt+state;
  // SJ 2026-11-26: 리그 화면 첫머리 = 감독실 3×2 판, 나머지 상세는 접어 둠
  return lgPage('lg',[['ofc','감독실',tb=>ofcHTML(s,{right:tb,key:'lg',title:'주간 리그',pill:esc(tierName(s.tier)),prog:po&&mx?`${po.st} ${mx.a===0?mx.w[0]:mx.w[1]}승 ${mx.a===0?mx.w[1]:mx.w[0]}패`:undefined,sixT:'리그 진행',six,idle:s.over||s.regDone?poTxt+state:''})],['lu','라인업',()=>vLineup()],['sc','일정',()=>(pr?`<section class="hero">${muHTML(s,pr,`${s.round+1}/${s.sched.length}경기`,'start','auto')}</section>`:'')+lastRes(s)+gamesHTML(s)],['st','기록실',()=>teamStatsHTML(s)+myTeamHTML(s,'lg')+(statsHTML(s)||'<section class="band"><p class="note">아직 기록 없음</p></section>')+titleHTML(s)],['lg','리그 정보',()=>`<section class="band"><h3>리그 진행</h3>${six}</section>`+standFull(s)]],{L:s,title:'주간 리그',pill:esc(tierName(s.tier))})} // 구단 설정·백업·초기화는 홈 화면 아래(ui2 vHome)
function vYears(){useMode('yl');const L=S.yl,won=S.ylWon||{};ranked();
  if(L&&!L.done){const pr=curPair(L),c=L.post&&L.post.cur,nx=ylNextAt(Date.now()),hm=t=>{const d=new Date(t+H9);return `${md(t)} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`};
    const stage=L.post?`${c.nm} · ${tname(c.lo,L)} ${c.w[0]} : ${c.w[1]} ${tname(c.hi,L)} (${c.need}선승)`:`정규시즌 ${Math.min(L.round+1,L.sched.length)}/${L.sched.length}라운드 · ${wdayOf(L)}`;
    const six=`<p class="mini" title="${L.teams.length>=8?'상위 4팀 포스트시즌(준PO 2선승·PO 3선승·KS 4선승)':'상위 2팀 한국시리즈(4선승)'}">${stage} · ${L.teams.length}팀</p><p title="08~23시 15분마다 자동 진행 · 직접 눌러 앞당길 수 있음">다음 자동 <b>${hm(nx)}</b>${pr?` · 내 다음 상대 <b>${esc(tname(pr[0]===0?pr[1]:pr[0],L))}</b>`:L.post?'':' · 다음 라운드는 휴식'}</p><div class="btns" style="margin-top:10px">${pr&&!L.post?`<button data-a="m-torest" title="휴식 라운드나 포스트시즌 직전, 최대 ${YL_RUN_MAX}경기까지 결과만 보기로 이어서 진행">다음 휴식일까지 자동</button>`:''}<button data-a="m-quit" class="ghost">이 리그 포기</button></div>`;
    return lgPage('yl',[['ofc','감독실',tb=>ofcHTML(L,{right:tb,key:'yl',title:L.year+' 리그',pill:L.post?'포스트시즌':'정규시즌',start:'m-start',auto:'m-auto',startN:'하이라이트 보기',prog:L.post?esc(c.nm):`${Math.min(L.round+1,L.sched.length)}/${L.sched.length}라운드`,sixT:'시즌 진행',six,idle:`<p class="note">${L.post?'내 경기 없음':'이번 라운드는 휴식'}</p><div class="tools"><button class="big" data-a="m-bye">다음 ${L.post?'경기':'라운드'} 진행</button><button data-a="m-bye" title="휴식일이라 내 경기 없음. 결과만 보기 자리에서 그대로 넘어가요">휴식 넘기기</button></div>`})],['lu','라인업',()=>vLineup()],['sc','일정',()=>`<section class="hero">${pr?`<p class="mini" style="margin-top:0">내 선발 예정 <b>${esc((byId[fatSP(teamOf(0,L),fatPrev(L,0,teamOf(0,L)))]||{}).name||'-')}</b></p>`:''}${fatHTML(L)}${pr?predHTML(L):''}
          ${L.hl?`<details><summary>내 지난 경기 하이라이트 · ${esc(tname(L.hl.a,L))} ${L.hl.sc[0]} : ${L.hl.sc[1]} ${esc(tname(L.hl.h,L))}</summary><ol class="log">${L.hl.log.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`:''}</section>`+lastRes(L)+gamesHTML(L)],['st','기록실',()=>teamStatsHTML(L)+myTeamHTML(L,'yl')+(statsHTML(L)||'<section class="band"><p class="note">아직 기록 없음</p></section>')+titleHTML(L)+asHTML(L)],['lg','리그 정보',()=>`<section class="band"><h3>시즌 진행</h3>${six}</section>${L.log.length?`<section class="band"><h3>포스트시즌</h3>${L.log.map(x=>`<p class="mini">${esc(x)}</p>`).join('')}</section>`:''}${standFull(L,L.post?'정규시즌 최종 순위':'순위표')}`]],{L,title:L.year+' 리그',pill:L.post?'포스트시즌':'정규시즌'})}
  const Y=YL_YEARS(),res=L&&L.done?`<section class="band"><h3>${L.year} 리그 결과</h3><p>정규시즌 ${L.rank}위 · 우승 <b>${esc(tname(L.champ,L))}</b>${L.champ===0?' (우승)':''}</p>${L.log.map(x=>`<p class="mini">${esc(x)}</p>`).join('')}</section>${tableHTML(L,'정규시즌 최종 순위')}${titleHTML(L)}${asHTML(L)}`:'';
  return `<section class="hero"><h1>연도별 리그</h1><p class="mini" title="그해 실제 구단들과 팀당 144경기 + 포스트시즌. 08~23시 15분마다 자동 진행(약 2~3일). 숫자는 구단 수·평균 전력">144경기 · 15분마다 자동 · 우승 ${Object.keys(won).length}/${Y.length}</p>
   <div class="tabs ylf" role="tablist" aria-label="우승 여부">${[['all','전체 '+Y.length],['not','미우승 '+Y.filter(y=>!won[y]).length],['won','우승 '+Y.filter(y=>won[y]).length]].map(([k,n])=>`<button role="tab" aria-selected="${(S.ylF||'all')===k}" class="${(S.ylF||'all')===k?'on':''}" data-a="m-ylf" data-v="${k}">${n}</button>`).join('')}</div>
   <div class="btns ylgrid" style="flex-wrap:wrap">${Y.filter(y=>S.ylF==='won'?won[y]:S.ylF==='not'?!won[y]:true).map(y=>{const ks=yearKeys(y),o=Math.round(ks.reduce((s,k)=>s+YOVR[k],0)/ks.length);return `<button data-a="m-join" data-y="${y}" class="yly ${won[y]?'won':'todo'}" title="${ks.length}개 구단${won[y]?` · 우승 ${won[y]}회`:' · 아직 우승 못 함'}"><b>${y}</b>${won[y]?`<em>우승${won[y]>1?' ×'+won[y]:''}</em>`:'<em class="no">미우승</em>'}<small>${ks.length}팀·${o}</small></button>`}).join('')}</div></section>${res}`}
function mAct(a,b){
  if(a==='m-stand'){S.showStand=!S.showStand;render();return}
  if(a==='m-ylf'){S.ylF=b.dataset.v;render();return}
  if(a==='m-pred'){const L=location.hash==='#years'?S.yl:S.season;if(L){L.pk=b.dataset.k;save();render()}return}
  if(a==='m-torest')ylToRest();else if(a==='m-start')startGame(false,'yl');else if(a==='m-auto')startGame(true,'yl');else if(a==='m-bye'){if(S.yl&&!S.yl.done)ylBye(S.yl)}
  else if(a==='m-join'){ylNew(+b.dataset.y);render()}
  else if(a==='m-quit'){if(b.dataset.c){S.yl=null;save();render()}else{b.dataset.c=1;b.textContent='한 번 더 누르면 포기'}}}

// ── 능력치 가이드: 각 능력치가 경기 엔진(core2 pa)에서 어디에 쓰이는지. 엔진 식을 바꾸면 여기도 고칠 것 ──
function vGuide(){const T=(h,rows)=>`<table class="tbl"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>i?`<td>${x}</td>`:`<th scope="row" style="text-align:left;white-space:nowrap;padding-right:8px">${x}</th>`).join('')}</tr>`).join('')}</tbody></table>`,
  sec=(t,b)=>`<section class="band"><h3>${t}</h3>${b}</section>`,up='<b style="color:var(--good,#2e8b57)">▲</b>',dn='<b style="color:var(--bad,#c0392b)">▼</b>';
 return `<section class="band"><h2>능력치 가이드</h2><p class="note">모든 능력치는 <b>70이 리그 보통</b>이에요. 100이면 보통보다 한 단계(+1) 위, 40이면 한 단계 아래로 계산해요. 능력치 70은 그 선수가 뛴 시즌의 리그 평균과 같아요.</p></section>
 ${sec('타석 결과는 이렇게 정해져요',`<p class="note">타자와 투수가 각자 가진 비율(예: 이 타자의 삼진율, 이 투수의 삼진율)을 <b>log5</b>라는 야구 통계 공식으로 합쳐요. 그래서 삼진 많은 투수와 삼진 많은 타자가 만나면 삼진이 더 많이 나오고, 선수 특징이 경기 기록에 그대로 드러나요. 판정 순서는 볼넷 → 삼진 → 홈런 → 땅볼/뜬공 → 안타 여부예요.</p>`+T(['결과','타자 쪽 (능력치 +10)','투수 쪽 (능력치 +10)'],[
  ['볼넷',`선구 ${up}3.2%p`,`제구 ${dn}4.5%p`],
  ['삼진',`교타 ${dn}4.2%p · 선구 ${dn}1.5%p · 장타 ${up}1.8%p`,`구속·변화구 ${up}11%p (구속×0.55 + 변화구×0.45)`],
  ['홈런',`장타 ${up}1.6%p`,`구위 ${dn}0.5%p · 땅볼 성향이면 더 적게`],
  ['땅볼 비율',`장타 ${dn}4%p · 주력 ${up}1%p`,`구종(싱커·포크·스플리터·체인지업 ${up}, 직구·슬라이더 ${dn}) · 구속 ${dn}1.5%p`],
  ['인플레이 안타',`교타 ${up}2.8%p`,`구위 ${dn}1.2%p · 팀 수비`],
  ['땅볼 타구','안타 3.5%p 덜 됨, 주력 +10마다 내야안타 1.5%p. 장타는 거의 없고 병살 위험','—'],
  ['뜬공·라인드라이브','안타 3%p 더 됨. 2루타 30% + 장타 +10마다 6%p, 3루타는 주력',`구위 ${dn}2루타`]]))}
 ${sec('좌우 상성',`<p class="note">타자와 투수가 <b>같은 손</b>이면 타자가 불리해요(삼진 +4%, 안타 −0.8%p, 홈런 −7%). 반대 손이면 그만큼 유리하고, 스위치히터는 언제나 절반만큼 유리해요. <b>언더핸드·사이드암</b> 투수는 이 차이가 1.8배라 같은 손 타자에겐 아주 강하고 반대 손 타자에겐 약해요. 땅볼도 더 많이 유도해요(언더 +5%p, 사이드 +3%p).</p>`)}
 ${sec('타자 능력치',T(['능력치','쓰이는 곳'],[
  ['교타','인플레이 안타, 삼진 줄이기'],['장타','홈런, 2루타, 뜬공 비율(삼진은 조금 늘어요)'],['선구','볼넷, 삼진 조금 줄이기'],
  ['주력','내야안타, 3루타, 도루 시도·성공, 한 베이스 더 가기, 병살 피하기, 외야 보살 피하기'],
  ['수비','포지션 수비값 → 팀 수비(안타 억제), 실책·보살 확률. 포수는 도루 저지'],
  ['멘탈','7회 이후 2점 차 이내나 득점권에서 교타 +(멘탈−70)×0.2'],['번트','희생번트 성공률']]))}
 ${sec('투수 능력치',T(['능력치','쓰이는 곳'],[
  ['구속','삼진(가장 큼), 뜬공 성향'],['변화구','삼진'],['구위','홈런·안타·2루타 억제'],['구종','땅볼/뜬공 성향(등급이 높을수록 강함). 변화구 등급은 변화, 직구 등급은 구속이 오른 만큼 올라가요(덱 효과·스킬·유학 포함). 기준값 D58·C68·B78·A87·S95에서 97 이상 SS, 103 이상 SSS, 109 이상 SSS+. 변화구가 S(95)를 넘으면 넘은 만큼 탈삼진도 늘어요'],['제구','볼넷 억제'],
  ['체력','투구 한계. 선발 16 + 체력×0.16타자, 불펜 3 + 체력÷20타자. 한계의 70%를 넘기면 구위 최대 −14, 제구 최대 −10'],
  ['멘탈','접전·득점권에서 제구 +(멘탈−70)×0.2']]))}
 ${sec('수비',`<p class="note">포지션마다 수비값이 따로 있어요(대개 80~100, 90이 보통). 포수·유격수·중견수는 1.3배 가중해서 팀 수비를 내요. 팀 수비 +10이면 경기당 실점이 약 0.3점 줄어요.</p>`+T(['항목','계산'],[
  ['실책','타구를 잡은 야수 기준 2.5%, 수비 +10마다 −1.2%p'],['외야 보살','추가 진루하던 주자를 잡을 확률. 외야 수비가 높고 주자가 느릴수록 높아요'],
  ['도루 저지','포수 수비 +10마다 도루 성공률 −4%p'],['못 맡는 포지션','수비값이 크게 깎여요. 대타·대주자는 다음 수비 때 자동 교체']]))}
 ${sec('그 밖의 보정',T(['항목','효과'],[
  ['컨디션','최악 −20% · 나쁨 −10% · 보통 0 · 좋음 +4% · 최상 +8%. 타자는 교타(선구는 절반), 투수는 제구(구위는 절반)에 곱해요'],
  ['덱 효과(팀컬러)','모든 능력치에 +보너스(체력 제외)'],['포수 궁합','투수와 포수의 궁합에 따라 제구(구위는 60%) 보정'],
  ['감독 성향','강공·도루·번트·대타·선발 교체·불펜·고의4구·수비 시프트 경향(0~4)'],
  ['작전·서포트 카드, 스킬 블록','카드에 적힌 상황에서 해당 능력치 가감']]))}
 ${sec('교체 규칙',T(['교체','언제'],[
  ['선발 강판','투구 한계 도달, 또는 감독 성향에 따라 4~8실점'],['셋업','8회, 1~3점 리드, 선발이 한계의 80%를 넘겼을 때'],
  ['마무리','9회 이후 1~3점 리드(성향 따라 동점~4점, 8회 2아웃 조기 투입)'],['중계','앞 투수가 한계에 닿거나 많이 맞았을 때 순서대로'],
  ['대타','7회 이후 2점 차 이내, 득점권 주자, 벤치 타자가 더 좋을 때'],['대주자','7회 이후 접전, 느린 주자를 벤치의 빠른 선수로'],
  ['대수비','8회 이후 1~3점 리드에서 수비가 크게 처지는 자리']]))}`}

// ── 투수 피로 바(SJ 2026-11-26): 0~100, 빨강 등판불가 · 노랑 등판 가능(구위 하락 구간) · 초록 정상 ──
// 기준은 core2 FAT: 선발 spOk(15) 이상이면 이번 순번 건너뜀, 불펜 rpOut(55) 이상이면 휴식, pen0(20) 초과부터 구위·제구 하락
function fatLv(v,sp){return sp?(v>=FAT.spOk?'r':'g'):(v>=FAT.rpOut?'r':v>FAT.pen0?'y':'g')}
function fatBar(v,sp){v=Math.max(0,Math.min(100,Math.round(v)));const lv=fatLv(v,sp),col={r:'#e5534b',y:'#e3b341',g:'#3fb950'}[lv],tx={r:sp?'등판 대기':'휴식',y:'등판 가능(구위↓)',g:'정상'}[lv];
  return `<span class="fbar" title="피로 ${v}/100 · ${tx}" style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="display:inline-block;width:64px;height:8px;border-radius:4px;background:rgba(127,127,127,.25);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(v,3)}%;background:${col}"></span></span><small style="color:${col};min-width:2.2em;text-align:right">${v}</small></span>`}
// ── 우리 팀 패널(SJ 2026-11-26): 리그마다 쓰는 덱의 라인업·로테이션·불펜과 그 리그 시즌 성적을 한 곳에 ──
// L: 리그 객체(성적 L.ps, 피로 L.fat). 친구 리그는 L 없이 m='on'
function myTeamHTML(L,m){const k=MODEK(m),T=userT(m),P=(L&&L.ps)||{},st=id=>P['0|'+id]||P['0|'+baseId(id)],f3=v=>v.toFixed(3).replace(/^0/,'');
  const F=L?fatPrev(L,0,T):{},spN=L?fatSP(T,F):null,nm=id=>{const c=byId[baseId(id)];return c?`<a data-pick="${esc(id)}" role="button" tabindex="0" style="cursor:pointer"><b>${esc(c.name)}</b></a> <small>${c.year} ${esc(c.team)} · ${c.cost}코</small>`:'-'};
  const bat=r=>!r||!(r.ab+r.bb)?'<td>-</td><td>-</td><td>-</td><td>-</td>':`<td>${r.ab?f3(r.h/r.ab):'-'}</td><td>${f3((r.h+r.bb)/Math.max(1,r.ab+r.bb))}</td><td>${r.hr}</td><td>${r.rbi}</td>`;
  const pit=(r,id,sp)=>`<td>${r&&r.outs?(r.er*27/r.outs).toFixed(2):'-'}</td><td>${r?`${Math.floor(r.outs/3)}.${r.outs%3}`:'-'}</td><td>${r?r.w:'-'}</td><td>${r?r.sv:'-'}</td><td>${r?r.so:'-'}</td>${L?`<td>${fatBar(F[id]||0,sp)}</td>`:''}`;
  const fx=(()=>{try{return simTeam(T).tc.fx.map(x=>x.n).join(' · ')}catch(e){return ''}})();
  const open=(S.tpOpen||{})[k]!==false;
  return `<section class="band myteam"><details${open?' open':''} data-tp="${k}"><summary><h3 style="display:inline;margin:0">우리 팀</h3> <span class="pill">${MODEN[k]} 전용 라인업</span>${fx?` <small>${esc(fx)}</small>`:''}</summary>
   <div class="tools" style="margin:8px 0">${k==='on'?'<a href="#lineup"><button class="ghost">이 리그 라인업 수정</button>':`<a><button class="ghost" data-a="lgtab" data-g="${k}" data-k="lu">이 리그 라인업 수정</button>`}</a>${L?'<small style="margin-left:auto">성적은 이 리그 기록이에요</small>':''}</div>
   <div class="scroll"><table class="tbl"><thead><tr><th>타순</th><th>위치</th><th class="l">타자</th><th>타율</th><th>출루율</th><th>홈런</th><th>타점</th></tr></thead><tbody>
   ${(T.lineup||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(PK[x.pos]||x.pos)}</td><td class="l">${nm(x.id)}</td>${bat(st(x.id))}</tr>`).join('')}
   ${(T.bench||[]).filter(Boolean).map(id=>`<tr class="use"><td>벤치</td><td>${esc((byId[baseId(id)]||{}).pos||'')}</td><td class="l">${nm(id)}</td>${bat(st(id))}</tr>`).join('')}</tbody></table>
   <table class="tbl"><thead><tr><th>보직</th><th class="l">투수</th><th>평균자책</th><th>이닝</th><th>승</th><th>세이브</th><th>탈삼진</th>${L?'<th>피로</th>':''}</tr></thead><tbody>
   ${(T.rot||[]).filter(Boolean).map((id,i)=>`<tr${id===spN?' class="me"':''}><td>선발${i+1}${id===spN?' · 다음':''}</td><td class="l">${nm(id)}</td>${pit(st(id),id,1)}</tr>`).join('')}
   ${(T.pen||[]).filter(Boolean).map((id,i)=>`<tr><td>${['마무리','셋업'][i]||'중계'}</td><td class="l">${nm(id)}</td>${pit(st(id),id)}</tr>`).join('')}</tbody></table></div></details></section>`}

// ── 덱 대결 시뮬(SJ 2026-11-26): 보유 덱·가상으로 짜본 덱·리그별 라인업끼리 N경기 시뮬. 보상·기록·피로 없음(순수 확인용) ──
// 양쪽 다 내 스킬 블록·유학·장비가 그대로 붙음. 홈/원정은 번갈아, 선발은 로테이션 순서대로
const DS_N=[1,10,50,144];
function dsOpts(){const o=[['m:lg',MODEN.lg+' 라인업'],['m:yl',MODEN.yl+' 라인업'],['m:on',MODEN.on+' 라인업']];
  for(const d of S.decks||[])o.push(['d:'+d.id,(d.name||'덱')+(deckOk(d)?'':' · 가상')]);return o}
function dsTeam(k,color){let t,name;if(!k)return null;
  if(k.startsWith('m:')){const m=k.slice(2);t=modeTeam(m);name=MODEN[m]}else{const d=(S.decks||[]).find(x=>x.id===k.slice(2));if(!d)return null;t=d.t;name=d.name||'덱'}
  t=JSON.parse(JSON.stringify(t||{}));if(!t.lineup||t.lineup.filter(x=>x&&x.id&&byId[x.id]).length<9||!(t.rot||[]).filter(Boolean).length||!(t.pen||[]).filter(Boolean).length)return {err:`${name}: 타순 9명·선발·불펜이 다 채워져 있어야 해요`};
  return {...clean(t),name,color,blocks:S.blocks,abSt:S.abSt||{},eq:eqMap(),rotIdx:0}}
function dsRun(){const o=S.ds||{},A=dsTeam(o.a,'#e07a45'),B=dsTeam(o.b,'#4a8fe0'),n=+o.n||10;
  if(!A||!B){S.dsRes={err:'양쪽 덱을 골라 주세요'};return}if(A.err||B.err){S.dsRes={err:A.err||B.err};return}
  if(o.a===o.b)B.name+=' (복제)';
  const R={n,w:[0,0],t:0,rs:[0,0],bat:[{},{}],pit:[{},{}],names:[A.name,B.name],last:null},T=[A,B],G=[];
  for(let i=0;i<n;i++){const aw=i%2,away=aw?1:0,home=1-away;T[0].rotIdx=i;T[1].rotIdx=i;
    const g=simAll(mkGame(simTeam(T[away]),simTeam(T[home])));const side=[away,home]; // g 쪽 s(0 원정,1 홈) → 덱 번호
    for(let s=0;s<2;s++){const d=side[s];R.rs[d]+=g.sc[s];
      for(const b of Object.values(g.bx[s])){const x=R.bat[d][b.c.id]=R.bat[d][b.c.id]||{c:b.c,g:0,ab:0,h:0,hr:0,rbi:0,bb:0};x.g++;x.ab+=b.ab;x.h+=b.h;x.hr+=b.hr;x.rbi+=b.rbi;x.bb+=b.bb}
      for(const p of g.px[s]){const x=R.pit[d][p.c.id]=R.pit[d][p.c.id]||{c:p.c,g:0,outs:0,r:0,k:0,bb:0,h:0};x.g++;x.outs+=p.outs;x.r+=p.r;x.k+=p.k;x.bb+=p.bb;x.h+=p.h}}
    if(g.res<0)R.t++;else R.w[side[g.res]]++;G.push(dsRec(g,away));
    if(i===n-1)R.last={away,sc:g.sc,log:hlOf(g,[away,home]).log}}
  const P=S.dsPred;if(P&&P.key===dsKey()&&P.pick!=null&&dsDay().tr<DS_TRY_DAY){S.dsIt.tr++;const x=P.opts[P.pick],hit=dsTest(x,dsStat(G));let msg=hit?'예측 적중':'예측 실패';
    if(hit){const t=dsGive(x);if(t)msg+=' · '+t}R.pred={label:x.label,hit,msg}}
  S.dsPred=null;S.dsRes=R;save()}
// 덱 대결 예측(SJ 2026-11-26): 매번 무작위 3개(종류·기준값 랜덤). 보상은 적중 확률에 반비례(미리 30경기 몰래 돌려 부트스트랩으로 확률 추정) → 뻔한 예측은 적게, 어려운 예측은 많이. 연도 리그 예측과 같은 하루 상한
const dsKey=()=>{const o=S.ds||{};return `${o.a}|${o.b}|${o.n}`};
function dsRec(g,away){const me=away===0?0:1,bx=Object.values(g.bx[me]);return {w:g.res<0?0:g.res===me?1:-1,r:g.sc[me],ra:g.sc[1-me],hr:bx.reduce((s,b)=>s+b.hr,0),k:g.px[me].reduce((s,p)=>s+p.k,0)}}
function dsStat(G){const n=G.length||1;return {n,w:G.filter(x=>x.w>0).length,r:G.reduce((s,x)=>s+x.r,0)/n,ra:G.reduce((s,x)=>s+x.ra,0)/n,hr:G.reduce((s,x)=>s+x.hr,0),k:G.reduce((s,x)=>s+x.k,0),so:G.filter(x=>x.w>0&&x.ra===0).length,big:G.filter(x=>x.r>=10).length,mx:Math.max(...G.map(x=>x.r-x.ra))}}
function dsTest(x,t){return x.ty==='w'?t.w>=x.th:x.ty==='r'?t.r>=x.th:x.ty==='ra'?t.ra<=x.th:x.ty==='hr'?t.hr>=x.th:x.ty==='k'?t.k>=x.th:x.ty==='so'?t.so>=x.th:x.ty==='big'?t.big>=x.th:x.ty==='mx'?t.mx>=x.th:false}
const DS_TY=[['w',n=>{const k=Math.max(1,Math.round(n*(.35+Math.random()*.4)));return [k,n===1?'내 덱 승리':`내 덱 ${k}승 이상`]}],
  ['r',n=>{const v=(6+Math.floor(Math.random()*9))/2;return [v,n===1?`내 덱 ${Math.ceil(v)}점 이상`:`내 덱 경기당 ${v.toFixed(1)}점 이상`]}],
  ['ra',n=>{const v=(4+Math.floor(Math.random()*8))/2;return [v,n===1?`상대 ${Math.floor(v)}점 이하로 막기`:`상대 경기당 ${v.toFixed(1)}점 이하`]}],
  ['hr',n=>{const k=Math.max(1,Math.round(n*(.4+Math.random()*1.4)));return [k,`내 덱 홈런 ${k}개 이상`]}],
  ['k',n=>{const k=Math.max(4,Math.round(n*(5+Math.random()*5)));return [k,`내 투수진 탈삼진 ${k}개 이상`]}],
  ['so',n=>{const k=Math.max(1,Math.round(n*Math.random()*.12));return [k,k===1?'완봉승 1번 이상':`완봉승 ${k}번 이상`]}],
  ['big',n=>{const k=Math.max(1,Math.round(n*Math.random()*.25));return [k,k===1?'10득점 경기 1번 이상':`10득점 경기 ${k}번 이상`]}],
  ['mx',n=>{const k=5+Math.floor(Math.random()*6);return [k,`${k}점 차 이상 승리 1번 이상`]}]];
// 예측 보상 종류(SJ 2026-11-26): 포인트만이 아니라 스킬 블록·서포트·작전 카드도. 어려울수록(확률 낮을수록) 등급이 높음. 아이템 보상은 하루 DS_ITEM_DAY개까지(넘으면 포인트로)
const DS_ITEM_DAY=6,DS_TRY_DAY=10; // 예측은 하루 10번까지(맞든 틀리든). 어려운 보상만 골라 무한히 찍는 것 방지
const dsDay=()=>{const d=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);S.dsIt=S.dsIt&&S.dsIt.day===d?S.dsIt:{day:d,n:0,tr:0};S.dsIt.tr=S.dsIt.tr||0;return S.dsIt};
function dsRw(p){const u=Math.random();if(p>.6||u<.4)return {k:'pt'};if(u<.65)return {k:'blk',g:p<.12?'A':p<.35?'B':'C'};if(u<.83)return {k:'sup'};return {k:'tc',g:p<.15?'특수':'일반'}}
const dsRwTxt=x=>!x.rw||x.rw.k==='pt'?`${x.pt}P`:x.rw.k==='blk'?`${x.rw.g}급 스킬 블록`:x.rw.k==='sup'?'서포트 카드':`${x.rw.g} 작전 카드`;
function dsGive(x){dsDay();
  if(x.rw&&x.rw.k!=='pt'&&S.dsIt.n<DS_ITEM_DAY){S.dsIt.n++;
    if(x.rw.k==='blk'){const b=gainBlock(null,x.rw.g);return `${x.rw.g}급 ${b.t==='B'?'타자':'투수'}용 ${bname(b)}`}
    if(x.rw.k==='sup'){const c=pick(SUPS.filter(t=>!t[0].endsWith('+')));S.sq[c[0]]=(S.sq[c[0]]||0)+1;return '서포트 카드 '+c[1]}
    const c=pick(TCARDS.filter(t=>t[3]===x.rw.g));S.tq[c[0]]=(S.tq[c[0]]||0)+1;return `${x.rw.g} 작전 카드 ${c[1]}`}
  const E=EC();let rw={pt:x.pt};if(E&&E.predCapped)rw=E.predCapped(S,rw);return (rw.pt?(give(rw,0,false)||rw.pt+'P'):'')+(rw.capped?' (오늘 예측 보상 상한)':'')+(x.rw&&x.rw.k!=='pt'?' (오늘 아이템 보상은 다 받아서 포인트로)':'')}
function dsPredGen(){const o=S.ds||{},A=dsTeam(o.a,'#e07a45'),B=dsTeam(o.b,'#4a8fe0'),n=+o.n||10;if(!A||!B||A.err||B.err)return null;
  const T=[A,B],G=[];for(let i=0;i<30;i++){const away=i%2;T[0].rotIdx=i;T[1].rotIdx=i;G.push(dsRec(simAll(mkGame(simTeam(T[away]),simTeam(T[1-away]))),away))}
  const boot=[];for(let j=0;j<240;j++){const X=[];for(let i=0;i<n;i++)X.push(G[Math.floor(Math.random()*G.length)]);boot.push(dsStat(X))}
  const opts=[],used=new Set();for(let tries=0;tries<60&&opts.length<3;tries++){const [ty,gen]=DS_TY[Math.floor(Math.random()*DS_TY.length)];if(used.has(ty))continue;
    const [th,label]=gen(n),x={ty,th,label},p=boot.filter(t=>dsTest(x,t)).length/boot.length;if(p<.04||p>.92)continue;
    used.add(ty);opts.push({...x,p,pt:Math.max(10,Math.min(300,Math.round((10+25*(1-p)/p)/5)*5)),rw:dsRw(p)})}
  return {key:dsKey(),opts,pick:null}}
function dsPredHTML(){if(dsDay().tr>=DS_TRY_DAY)return `<p class="note" style="text-align:center">오늘 예측 ${DS_TRY_DAY}번을 다 썼어요. 시뮬레이션은 계속 할 수 있어요.</p>`;let P=S.dsPred;if(!P||P.key!==dsKey()){P=S.dsPred=dsPredGen();if(!P)return ''}if(!P.opts.length)return '';
  return `<div class="btns pred" style="justify-content:center" aria-label="덱 대결 예측 고르기"><small>예측 (오늘 ${DS_TRY_DAY-S.dsIt.tr}번 남음)</small>${P.opts.map((x,i)=>`<button data-a="ds-pred" data-i="${i}" class="${P.pick===i?'big':'ghost'}" aria-pressed="${P.pick===i}">${esc(x.label)} · ${esc(dsRwTxt(x))}</button>`).join('')}<button class="ghost" data-a="ds-reroll" title="예측 선택지 다시 뽑기">새로 뽑기</button></div>
   <p class="note" style="text-align:center;margin:4px 0 0">하나 골라 두고 시뮬레이션하면 결과로 판정해요. 어려운 예측일수록 보상이 커요. 포인트는 연도 리그 예측과 같은 하루 상한, 블록·서포트·작전 카드는 하루 ${DS_ITEM_DAY}개까지예요.</p>`}
function vDsim(){const o=S.ds=S.ds||{a:'m:lg',b:(S.decks&&S.decks[0])?'d:'+S.decks[0].id:'m:yl',n:10},O=dsOpts(),R=S.dsRes,f3=v=>v.toFixed(3).replace(/^0/,'');
  const sel=(k)=>`<select data-ds="${k}" aria-label="${k==='a'?'내 덱':'상대 덱'}">${O.map(([v,nm])=>`<option value="${esc(v)}"${o[k]===v?' selected':''}>${esc(nm)}</option>`).join('')}</select>`;
  const side=d=>{const B=Object.values(R.bat[d]).sort((x,y)=>(y.h+y.bb)/Math.max(1,y.ab+y.bb)-(x.h+x.bb)/Math.max(1,x.ab+x.bb)),P=Object.values(R.pit[d]).sort((x,y)=>y.outs-x.outs);
    return `<div><h3 style="margin:8px 0 4px">${esc(R.names[d])} <small>${R.w[d]}승 · 평균 ${(R.rs[d]/R.n).toFixed(1)}점</small></h3><div class="scroll"><table class="tbl"><thead><tr><th class="l">타자</th><th>경기</th><th>타율</th><th>출루율</th><th>홈런</th><th>타점</th></tr></thead><tbody>
    ${B.map(x=>`<tr><td class="l">${esc(x.c.name)} <small>${String(x.c.year).slice(2)}' ${esc(x.c.team)}</small></td><td>${x.g}</td><td>${x.ab?f3(x.h/x.ab):'-'}</td><td>${f3((x.h+x.bb)/Math.max(1,x.ab+x.bb))}</td><td>${x.hr}</td><td>${x.rbi}</td></tr>`).join('')}</tbody></table>
    <table class="tbl"><thead><tr><th class="l">투수</th><th>경기</th><th>이닝</th><th>실점/9</th><th>탈삼진</th><th>WHIP</th></tr></thead><tbody>
    ${P.map(x=>`<tr><td class="l">${esc(x.c.name)} <small>${String(x.c.year).slice(2)}' ${esc(x.c.team)}</small></td><td>${x.g}</td><td>${Math.floor(x.outs/3)}.${x.outs%3}</td><td>${x.outs?(x.r*27/x.outs).toFixed(2):'-'}</td><td>${x.k}</td><td>${x.outs?((x.h+x.bb)*3/x.outs).toFixed(2):'-'}</td></tr>`).join('')}</tbody></table></div></div>`};
  return `<section class="hero"><h1>덱 대결</h1><p class="mini">보유 덱, 덱 짜보기로 만든 가상 덱, 리그별 라인업끼리 붙여 봐요. 보상·기록·피로는 없어요.</p>
   <div class="tools" style="flex-wrap:wrap;gap:6px;justify-content:center">${sel('a')}<b style="align-self:center">VS</b>${sel('b')}
   <select data-ds="n" aria-label="경기 수">${DS_N.map(v=>`<option value="${v}"${+o.n===v?' selected':''}>${v}경기</option>`).join('')}</select><button class="big" data-a="ds-go">시뮬레이션</button></div>${dsPredHTML()}
   <p class="note" style="text-align:center">홈·원정은 번갈아, 선발은 로테이션 순서대로 나와요. 스킬 블록·유학·장비는 양쪽 다 지금 내 것이 그대로 붙어요.</p></section>
   ${R?R.err?`<section class="band"><p class="note" style="color:#ff8a7a">${esc(R.err)}</p></section>`:`<section class="band"><h2>${esc(R.names[0])} ${R.w[0]} : ${R.w[1]} ${esc(R.names[1])}${R.t?` <small>(무 ${R.t})</small>`:''}</h2>
   ${R.pred?`<p class="mini" style="color:${R.pred.hit?'#3fb950':'#ff8a7a'}">예측 「${esc(R.pred.label)}」 · ${esc(R.pred.msg)}</p>`:''}<p class="mini">${R.n}경기 · 승률 ${f3(R.w[0]/Math.max(1,R.w[0]+R.w[1]))} · 경기당 ${(R.rs[0]/R.n).toFixed(1)} : ${(R.rs[1]/R.n).toFixed(1)}</p>
   ${R.last?`<details><summary>마지막 경기 하이라이트 · ${esc(R.names[R.last.away])} ${R.last.sc[0]} : ${R.last.sc[1]} ${esc(R.names[1-R.last.away])}</summary><ol class="log">${R.last.log.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`:''}
   <div class="dsg" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px">${side(0)}${side(1)}</div></section>`:''}`}
