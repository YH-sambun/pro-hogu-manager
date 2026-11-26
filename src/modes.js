// ===== 게임 모드: 주간 승급 리그 · 연도별 리그 =====
// 주간 리그: 실제 1주(월 0시~일 24시, KST) 동안 AI 9팀과 27경기. 1위로 마치면 다음 주에 한 단계 승급(10단계).
// 연도별 리그: 그해 실제 구단들 사이에 내 구단이 들어가 정규시즌(팀당 3번씩) + 포스트시즌. 한국시리즈 우승이 목표.
const TIERS=[
  {n:'주전자',m:[50,57],c:[1,2]},{n:'동호회',m:[53,60],c:[2,3]},{n:'대학',m:[56,63]},{n:'실업',m:[59,66]},{n:'퓨처스',m:[62,70]},{n:'프로',m:[66,75]},
  {n:'올스타',r:[0,.4],c:[1,2]},{n:'챔피언',r:[.3,.7],c:[2,3,4]},{n:'레전드',r:[.6,1],c:[3,4]},{n:'명예의 전당',r:[.85,1],c:[4,5]}];
const TIER_DESC=['여러 시대 하위권 선수로 꾸린 혼성팀 · 컨디션 나쁨','혼성팀 · 주전급 일부 · 컨디션 보통 이하','혼성팀 · 주전급','혼성팀 · 주전급 다수','혼성팀 · 주전과 스타','혼성팀 · 스타 다수',
  '실제 연도·구단 팀(하위권) · 컨디션 나쁨','실제 연도·구단 팀(중위권) · 컨디션 보통','실제 연도·구단 팀(상위권) · 컨디션 좋음','역대 최강 연도·구단 팀 · 컨디션 최고'];
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
const wkLabel=w=>`${md(w)}(월)~${md(w+6*864e5)}(일)`;
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
// 리그 중 선발 교체 대책(SJ 2026-11-26): 시즌 중 새로 선발 로테이션에 들어온 투수는 피로도 75로 합류(약 3~4경기 등판 대기). 덱을 바꿔 쉰 에이스만 돌려 쓰는 걸 막음
const ROT_JOIN=75;
function rotJoin(L,T){const F=fatOf(L,0),R=(T.rot||[]).filter(Boolean);if(L.rot0)for(const id of R)if(!L.rot0.includes(id))F[id]=Math.max(F[id]||0,ROT_JOIN);L.rot0=R.slice()}
function fatPrev(L,i,T){const F=fatOf(L,i);if(i!==0||!L.rot0)return F;const G={...F};for(const id of (T.rot||[]).filter(Boolean))if(!L.rot0.includes(id))G[id]=Math.max(G[id]||0,ROT_JOIN);return G} // 미리보기용(저장 안 함)
function simT(L,i){if(i===0){const T=userT(L);rotJoin(L,T);return simTeam(T,S.cond,fatOf(L,0))}const T=L.teams[i];return simTeam(T,T.cv?condMap(T):undefined,fatOf(L,i))}
const sched3=n=>{const base=rr(n%2?n+1:n);return [...base,...base.map(r=>r.map(p=>[p[1],p[0]])),...base]};
const newSt=n=>Array.from({length:n},()=>({w:0,l:0,d:0,rs:0,ra:0}));
function curPair(L){
  if(L.post){const c=L.post.cur;if(!c||(c.lo!==0&&c.hi!==0))return null;const k=c.w[0]+c.w[1]+(c.d||0);return [0,1,4,5,6].includes(k)?[c.lo,c.hi]:[c.hi,c.lo]}
  if(L.round>=L.sched.length)return null;return L.sched[L.round].find(p=>p.includes(0)&&p[0]<L.teams.length&&p[1]<L.teams.length)||null}
// 한 라운드 진행. g가 있으면 내 경기는 그 결과(직접 지휘)를 쓰고, 없으면 내 경기도 시뮬레이션한다.
function lgPlay(L,g){let res=null;const out=[];
  for(const p of L.sched[L.round]){if(p[0]>=L.teams.length||p[1]>=L.teams.length)continue;
    const mine=p.includes(0),gg=mine&&g?g:simAll(mkGame(simT(L,p[0]),simT(L,p[1])));
    if(mine){const me=p.indexOf(0);res=gg.res<0?'d':gg.res===me?'w':'l';L.hl=hlOf(gg,p);recGame(L,gg,p);predDo(L,gg,me)}
    lgRec(L,p[0],p[1],gg);accStats(L,p,gg);fatGame(L,p,gg);out.push({a:p[0],h:p[1],sc:gg.sc,me:mine})}
  L.last=out.sort((x,y)=>y.me-x.me);L.teams.forEach((t,i)=>{if(i)t.rotIdx=(t.rotIdx||0)+1});fatDay(L);L.round++;return res}
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
  const st=wp[0],win=st.outs>=15?st:wp.slice(1).sort((a,b)=>b.outs-a.outs)[0]||st;rec(pr[ws],win.c).w++;
  const last=wp[wp.length-1];if(last!==win&&lead<=3&&last.outs>=3)rec(pr[ws],last.c).sv++}
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
  return out}
function newSeason(tier){const prev=S.season;tier=tier||(prev&&prev.tier)||1;
  const teams=[{user:true},...lgTeams(tier)];
  S.season={n:prev?prev.n+1:1,tier,wk:wkStart(),teams,sched:sched3(10),round:0,st:newSt(10),over:false,last:[]};S.last=[];S.lgBest=Math.max(S.lgBest||1,tier);save()}
function lgClose(s){s.over=true;const rk=lgStand(s).findIndex(x=>x.i===0)+1,first=rk===1&&!(S.lgFirst||{})[s.tier];s.rank=rk;
  const E=EC(),bonus=give(E?E.leagueEnd(s.tier,rk,first):null,[0,6000,4000,3000,2000,1500][rk]||800);if(rk===1)S.lgFirst={...(S.lgFirst||{}),[s.tier]:1};
  // 미션 챕터 ★4: 1군(라인업·벤치·선발·불펜)에 같은 구단 15명 이상으로 4단계 이상 우승
  let msx='';if(rk===1&&E&&E.missionLeague){const T=userT(s),cs=[...(T.lineup||[]).map(x=>x.id),...(T.bench||[]),...(T.rot||[]),...(T.pen||[])].filter(Boolean).map(id=>byId[baseId(id)]).filter(Boolean);
    const out=E.missionLeague(S,s.tier,cs)||[];if(out.length)msx=' · 미션 달성: '+out.map(o=>`${o.ch} ${o.what}${o.rw&&E.rwText?' ('+E.rwText(o.rw)+')':''}`).join(', ')}
  return ` · ${tierName(s.tier)} ${rk}위${bonus?' · 보너스 '+bonus:''}`+titleClose(s,'lg',s.tier)+(rk===1&&s.tier<10?` · 다음 주 ${tierName(s.tier+1)}로 승급`:'')+msx}
// 주가 바뀌었으면 지난 리그를 마감하고(남은 경기는 결과만으로 처리, 보상 없음) 새 리그를 연다.
function weekTick(){const s=S&&S.season;if(!s)return false;if(!s.tier){s.tier=1;s.wk=wkStart();return false}
  if(s.wk>=wkStart())return false;
  let msg='';if(!s.over){s.noPred=1;while(s.round<s.sched.length)lgPlay(s,null);delete s.noPred;PM='';msg=lgClose(s).replace(/^ · /,'')}
  S.lgHist=[...(S.lgHist||[]),{wk:s.wk,tier:s.tier,rank:s.rank}].slice(-30);
  const nt=s.rank===1&&s.tier<10?s.tier+1:s.tier;newSeason(nt);
  S.toast=`지난주 ${tierName(s.tier)} ${s.rank}위 마감${msg?' ('+msg+')':''} · 이번 주는 ${tierName(nt)}예요`;return true}
function startGame(auto,mode){mode=mode||'lg';useMode(mode==='yl'?'yl':'lg');const e=validate();if(e.length){location.hash='lineup';render();return}
  if(mode==='lg'&&weekTick()){render();return}
  const L=mode==='yl'?S.yl:S.season;if(!L||L.over||L.done)return;
  const pr=curPair(L);
  if(!pr){if(mode==='yl'){ylBye(L);return}return}
  G=mkGame(simT(L,pr[0]),simT(L,pr[1]));G.pair=pr;G.me=pr.indexOf(0);G.ctrl=null;G.mode=mode;
  simAll(G);if(auto)endGame();else{G.hl=1;location.hash='game';render()}}
const go=h=>{if(location.hash!=='#'+h)location.hash=h;else render()};
function endGame(){if(G.mode==='yl')ylFinish();else finishRound()}
function finishRound(){const s=S.season;const res=lgPlay(s,G);let msg=userReward(res,'lg',s.tier);S.last=s.last;
  if(s.round>=s.sched.length)msg+=lgClose(s);S.toast=msg;rollCond();G=null;save();go('season')}
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
  const gg=g||simAll(mkGame(simT(L,pr[0]),simT(L,pr[1])));L.teams.forEach((t,i)=>{if(i&&pr.includes(i))t.rotIdx=(t.rotIdx||0)+1});fatGame(L,pr,gg);fatDay(L);
  L.last=[{a:pr[0],h:pr[1],sc:gg.sc,me:pr.includes(0)}];if(pr.includes(0)){L.hl=hlOf(gg,pr);recGame(L,gg,pr,L.post.cur.nm);predDo(L,gg,pr.indexOf(0))}
  if(gg.res<0){s.d=(s.d||0)+1;return pr.includes(0)?'d':null}const win=pr[gg.res];s.w[win===s.lo?0:1]++;return pr.includes(0)?(win===0?'w':'l'):null}
function ylAdvance(L){let msg='';
  for(let guard=0;guard<60&&!L.done;guard++){const s=L.post.cur;
    if(s.w[0]>=s.need||s.w[1]>=s.need){const wi=s.w[0]>=s.need?s.lo:s.hi,lo=wi===s.lo?s.hi:s.lo,wn=Math.max(...s.w),ln=Math.min(...s.w);
      L.log.push(`${s.nm}: ${tname(wi,L)} ${wn}승 ${ln}패${s.d?' '+s.d+'무':''}로 ${tname(lo,L)}에 승리`);
      if(lo===0){msg+=` · ${s.nm} 탈락`;L.place=s.nm==='한국시리즈'?2:Math.max(3,L.rank)}
      if(L.post.q.length){const nx=L.post.q.shift();L.post.cur={...nx,lo:wi,w:[0,0]};if(wi===0)msg+=` · ${nx.nm} 진출`}
      else{L.done=true;L.champ=wi;
        const E=EC();if(wi===0){const first=!(S.ylWon||{})[L.year];S.ylWon={...(S.ylWon||{}),[L.year]:((S.ylWon||{})[L.year]||0)+1};L.place=1;msg+=` · ${L.year} 한국시리즈 우승! ${give(E?E.yearLeague(1,first):null,10000,!first)}`}
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
  ${R.map((x,k)=>`<tr class="${x.i===0?'me':''}"><td>${k+1}</td><td class="l"><i class="dot" style="background:${x.i===0?'#e07a45':L.teams[x.i].color}"></i>${esc(tname(x.i,L))}</td><td>${x.g}</td><td>${x.w}</td><td>${x.l}</td><td>${x.d}</td><td>${x.pct.toFixed(3).replace(/^0/,'')}</td><td>${k?(((top.w-x.w)+(x.l-top.l))/2).toFixed(1):'-'}</td><td>${x.rs}</td><td>${x.ra}</td></tr>`).join('')}</tbody></table></div></section>`}
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
function vSeason(){
  weekTick();useMode('lg');const s=S.season,T=S.team,nxt=s.wk+7*864e5;
  const head=`<p class="mini" title="${esc(TIER_DESC[s.tier-1])} · 주가 끝나면 남은 경기는 결과만 처리(보상 없음)">${wkLabel(s.wk)} · ${s.tier<10?`1위면 <b>${tierName(s.tier+1)}</b> 승급`:'최고 단계'}</p>${ladderHTML(s)}`;
  const pr=s.over?null:curPair(s),six=head+(s.over?`<p style="margin:8px 0 0"><b>${tierName(s.tier)} 종료 · ${s.rank}위</b></p><p>다음 리그 <b>${md(nxt)}(월) 0시</b> · ${s.rank===1&&s.tier<10?`${tierName(s.tier+1)} 승급`:'재도전'}</p>`:`<p class="note" style="margin:8px 0 0">남은 경기 ${s.sched.length-s.round} · 주가 끝나면 남은 경기는 결과만 처리</p>`);
  // SJ 2026-11-26: 리그 화면 첫머리 = 감독실 3×2 판, 나머지 상세는 접어 둠
  return ofcHTML(s,{key:'lg',title:'주간 리그',pill:esc(tierName(s.tier)),sixT:'리그 진행',six,idle:s.over?`<p class="note">이번 주 리그 종료 · ${s.rank}위</p><p>다음 리그 <b>${md(nxt)}(월) 0시</b> · ${s.rank===1&&s.tier<10?`${tierName(s.tier+1)} 승급`:'재도전'}</p>`:''})+`<details class="band ofmore"${S.ofMore?' open':''}><summary><b>매치업 · 내 팀 기록 · 전체 경기</b></summary>${pr?`<section class="hero">${muHTML(s,pr,`${s.round+1}/${s.sched.length}경기`,'start','auto')}</section>`:''}${myTeamHTML(s,'lg')}${lastHTML(s)}${tableHTML(s)}${s.over?titleHTML(s):''}</details>`} // 구단 설정·백업·초기화는 홈 화면 아래(ui2 vHome)
function vYears(){useMode('yl');const L=S.yl,won=S.ylWon||{};ranked();
  if(L&&!L.done){const pr=curPair(L),c=L.post&&L.post.cur,nx=ylNextAt(Date.now()),hm=t=>{const d=new Date(t+H9);return `${md(t)} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`};
    const stage=L.post?`${c.nm} · ${tname(c.lo,L)} ${c.w[0]} : ${c.w[1]} ${tname(c.hi,L)} (${c.need}선승)`:`정규시즌 ${Math.min(L.round+1,L.sched.length)}/${L.sched.length}라운드`;
    const six=`<p class="mini" title="${L.teams.length>=8?'상위 4팀 포스트시즌(준PO 2선승·PO 3선승·KS 4선승)':'상위 2팀 한국시리즈(4선승)'}">${stage} · ${L.teams.length}팀</p><p title="08~23시 15분마다 자동 진행 · 직접 눌러 앞당길 수 있음">다음 자동 <b>${hm(nx)}</b>${pr?` · 내 다음 상대 <b>${esc(tname(pr[0]===0?pr[1]:pr[0],L))}</b>`:L.post?'':' · 다음 라운드는 휴식'}</p><div class="btns" style="margin-top:10px">${pr&&!L.post?`<button data-a="m-torest" title="휴식 라운드나 포스트시즌 직전, 최대 ${YL_RUN_MAX}경기까지 결과만 보기로 이어서 진행">다음 휴식일까지 자동</button>`:''}<button data-a="m-quit" class="ghost">이 리그 포기</button></div>`;
    return ofcHTML(L,{key:'yl',title:L.year+' 리그',pill:L.post?'포스트시즌':'정규시즌',start:'m-start',auto:'m-auto',startN:'하이라이트 보기',prog:L.post?esc(c.nm):`${Math.min(L.round+1,L.sched.length)}/${L.sched.length}라운드`,sixT:'시즌 진행',six,idle:`<p class="note">${L.post?'내 경기 없음':'이번 라운드는 휴식'}</p><div class="tools"><button class="big" data-a="m-bye">다음 ${L.post?'경기':'라운드'} 진행</button><button data-a="m-bye" title="휴식일이라 내 경기 없음. 결과만 보기 자리에서 그대로 넘어가요">휴식 넘기기</button></div>`})
     +`<details class="band ofmore"${S.ofMore?' open':''}><summary><b>투수 피로 · 예상 · 내 팀 기록 · 전체 경기</b></summary><section class="hero">${pr?`<p class="mini" style="margin-top:0">내 선발 예정 <b>${esc((byId[fatSP(teamOf(0,L),fatPrev(L,0,teamOf(0,L)))]||{}).name||'-')}</b></p>`:''}${fatHTML(L)}${pr?predHTML(L):''}
          ${L.hl?`<details><summary>내 지난 경기 하이라이트 · ${esc(tname(L.hl.a,L))} ${L.hl.sc[0]} : ${L.hl.sc[1]} ${esc(tname(L.hl.h,L))}</summary><ol class="log">${L.hl.log.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`:''}</section>${myTeamHTML(L,'yl')}${L.log.length?`<section class="band"><h3>포스트시즌</h3>${L.log.map(x=>`<p class="mini">${esc(x)}</p>`).join('')}</section>`:''}${lastHTML(L)}${tableHTML(L,L.post?'정규시즌 최종 순위':'순위표')}${titleHTML(L)}${asHTML(L)}</details>`}
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
   <div class="tools" style="margin:8px 0"><a href="#lineup"><button class="ghost">이 리그 라인업 수정</button></a>${L?'<small style="margin-left:auto">성적은 이 리그 기록이에요</small>':''}</div>
   <div class="scroll"><table class="tbl"><thead><tr><th>타순</th><th>위치</th><th class="l">타자</th><th>타율</th><th>출루율</th><th>홈런</th><th>타점</th></tr></thead><tbody>
   ${(T.lineup||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(PK[x.pos]||x.pos)}</td><td class="l">${nm(x.id)}</td>${bat(st(x.id))}</tr>`).join('')}
   ${(T.bench||[]).filter(Boolean).map(id=>`<tr class="use"><td>벤치</td><td>${esc((byId[baseId(id)]||{}).pos||'')}</td><td class="l">${nm(id)}</td>${bat(st(id))}</tr>`).join('')}</tbody></table>
   <table class="tbl"><thead><tr><th>보직</th><th class="l">투수</th><th>평균자책</th><th>이닝</th><th>승</th><th>세이브</th><th>탈삼진</th>${L?'<th>피로</th>':''}</tr></thead><tbody>
   ${(T.rot||[]).filter(Boolean).map((id,i)=>`<tr${id===spN?' class="me"':''}><td>선발${i+1}${id===spN?' · 다음':''}</td><td class="l">${nm(id)}</td>${pit(st(id),id,1)}</tr>`).join('')}
   ${(T.pen||[]).filter(Boolean).map((id,i)=>`<tr><td>${['마무리','셋업'][i]||'중계'}</td><td class="l">${nm(id)}</td>${pit(st(id),id)}</tr>`).join('')}</tbody></table></div></details></section>`}
