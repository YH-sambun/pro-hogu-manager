// econ.js — 포인트(P)·확정권·도감 경제 모듈 (프로호구 매니저)
// 재화는 포인트(P) 하나. 기존 코인은 1:1로 P가 됨. 우승·도감 보상의 특별한 몫은 '확정권'(아이템)으로 줌.
// 도감: 카드를 한 번 얻으면 영구 등록(S.dex). 이후 합성·유학·분해로 카드가 없어져도 도감과 완성 기록은 유지.
// 사용: <script src="econ.js"> 뒤에 ECON.migrate(S), ECON.buildSets(CARDS) 한 번. node에서는 require.
(function(root){
'use strict';
let rnd=Math.random;

// ── 1. 모드별 보상 ───────────────────────────────────────────
// 주간 AI 리그 10단계. 단계 배율 m = 1 + 0.25×(단계-1) → 1단계 1.0, 10단계 3.25
const tierMul=t=>1+0.25*(Math.max(1,Math.min(10,t))-1);
const LEAGUE={game:{w:70,d:35,l:20},            // 경기당 기본 P × 배율 (주 27경기 = AI 9팀×3)
  rank:[0,1500,900,600,400,400,200,200,200,200,200], // 최종 순위 보너스 × 배율
  promo:{1:{tix:{prem:1}},2:{tix:{block:1}},3:{tix:{star:1}},4:{tix:{prem:2}},5:{tix:{gg:1}},  // 단계 첫 우승(승급) 1회 보상
         6:{tix:{star:2}},7:{tix:{legend:1}},8:{tix:{gg:2}},9:{tix:{ex:1}},10:{pt:10000,tix:{pick:1}}},
  top:{tix:{star:1}}};                           // 10단계 재우승(더 올라갈 곳 없음)마다
const leagueGame=(tier,res)=>({pt:Math.round(LEAGUE.game[res]*tierMul(tier))});
// 우승 보너스: 그 단계 첫 우승 3,000P×배율 + 확정권, 재우승 1,000P×배율 (rank 표의 1위 값은 쓰지 않음)
const WIN={first:3000,again:1000};
function leagueEnd(tier,rank,firstWin){const base=rank===1?(firstWin?WIN.first:WIN.again):(LEAGUE.rank[rank]||200);const r={pt:Math.round(base*tierMul(tier)),tix:{}};
  if(rank===1){const x=firstWin?LEAGUE.promo[tier]:tier>=10?LEAGUE.top:null;if(x){r.pt+=x.pt||0;r.tix={...x.tix}}}return r}

// 단일팀 도전(팀컬러 팀, 난이도 1~10): 첫 클리어 300×난이도 + 난이도 5·10 첫 클리어 확정권. 반복 클리어는 하루 5회까지 40×난이도
const CHAL={first:300,rep:40,daily:5,firstTix:{5:{star:1},10:{legend:1}}};
function challenge(diff,first,todayRepeats){if(first)return {pt:CHAL.first*diff,tix:{...(CHAL.firstTix[diff]||{})}};
  return todayRepeats<CHAL.daily?{pt:CHAL.rep*diff}:{pt:0,note:'오늘 반복 보상 완료'}}

// 연도별 리그(그 해 실제 구단들과 시즌): 그 연도 첫 우승 3000P+골든글러브 확정권(그 연도 지정 가능), 재우승 500P. 2위 800·3위 500·그 외 200
// 개인 타이틀: 리그 마감 때 내 선수가 1위인 부문마다 보너스. 주간 리그는 300P×단계 배율, 연도 리그는 300P(반복 상한 적용 대상)
// 규정: 타율·평균자책은 규정 타석(경기수×3.1)·이닝(경기수×1) 채운 선수만. 공동 1위도 지급
const TITLES={avg:'타율',hr:'홈런',rbi:'타점',sb:'도루',w:'다승',era:'평균자책',so:'탈삼진',sv:'세이브'},TITLE_PT=300,MVP_PT=1000;
// titles: 내 선수가 딴 부문 키 배열, mvp: 리그 MVP(내 선수면 true). mode 'league'|'year'
function titleBonus(mode,tier,titles,mvp){const m=mode==='league'?tierMul(tier):1;return {pt:Math.round(((titles||[]).filter(k=>TITLES[k]).length*TITLE_PT+(mvp?MVP_PT:0))*m)}}
// 시즌 시상(OOTP식 종료 보상): 리그 골든글러브(포지션별 1명, 투수·포수·1B·2B·3B·SS·외야3·DH = 10명) 1명당 200P, 올스타(포지션별 상위 2명 = 24명 안팎) 1명당 80P
const AWARD_PT={gg:200,df:150,as:80}; // df=수비상(야수 포지션별 1명, 외야 3, 최대 8명)
// a = {titles:[...], mvp:bool, gg:내 선수 GG 수, as:내 선수 올스타 수}. 반환 {pt, lines:[[항목,P]]}
// repeat=true(이미 우승한 연도 리그를 다시 돌 때)면 시상 보상 절반
function seasonAwards(mode,tier,a,repeat){a=a||{};const m=(mode==='league'?tierMul(tier):1)*(repeat?.5:1),L=[];
  for(const k of a.titles||[])if(TITLES[k])L.push([TITLES[k]+' 1위',TITLE_PT]);if(a.mvp)L.push(['MVP',MVP_PT]);
  if(a.gg)L.push([`골든글러브 ${a.gg}명`,a.gg*AWARD_PT.gg]);if(a.df)L.push([`수비상 ${a.df}명`,a.df*AWARD_PT.df]);if(a.as)L.push([`올스타 ${a.as}명`,a.as*AWARD_PT.as]);
  const lines=L.map(([n,p])=>[n,Math.round(p*m)]);return {pt:lines.reduce((s,x)=>s+x[1],0),lines}}
// 경기 예측(경기 전 목표 3개 제시, 경기 끝나고 달성한 만큼 지급. 포인트를 걸지는 않음)
// [키, 이름, 기준, 기본 P]. box = 내 팀 기준 {r:득점, h:안타, hr:홈런, k:내 투수 탈삼진, ra:실점, sb:도루}
// 경기당 평균 약 60P×배율(경기 보상과 비슷한 규모). 주 27경기면 1단계 약 1,600P
const PRED=[['r','득점 6점 이상',6,150],['h','안타 12개 이상',12,210],['hr','홈런 2개 이상',2,135],['k','탈삼진 8개 이상',8,180],
  ['sb','도루 1개 이상',1,240],['ra0','무실점 승리',0,750],['bw','5점 차 이상 승리',5,300]]; // 7개 중 1개를 골라 거는 방식 → 금액 ≈ 60P ÷ 달성률 (4,000경기 시뮬: 득점6+ 41%, 안타12+ 28%, 홈런2+ 41%, 무실점승 4.3%, 5점차승 18.5%, 탈삼진8+ 34%, 도루1+ 22%. 도루는 발야구 감독이면 쉬워져 80으로 낮게)
// mode 'league'(단계 배율) | 'year'(배율 없음, capped 대상). 반환 [[키,이름,P]] 3개
function predOffer(mode,tier){const m=mode==='league'?tierMul(tier):1,L=PRED.slice();for(let i=L.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[L[i],L[j]]=[L[j],L[i]]}
  return L.slice(0,3).map(x=>[x[0],x[1],Math.round(x[3]*m/10)*10])}
function predSettle(offer,box,won){const ok=k=>{const x=PRED.find(p=>p[0]===k);if(k==='ra0')return won&&box.ra===0;if(k==='bw')return won&&box.r-box.ra>=5;return (box[k]|0)>=x[2]};
  const hit=(offer||[]).filter(o=>ok(o[0]));return {pt:hit.reduce((s,o)=>s+o[2],0),hit:hit.map(o=>o[1])}}
const yearGame=res=>({pt:{w:25,d:12,l:8}[res]|0}); // 연도 리그 경기당(정규·포스트시즌 공통). 144경기·하루 약 60경기 기준 하루 약 1,100P → 상한 1,500P 안
function yearLeague(rank,firstWin){if(rank===1)return firstWin?{pt:3000,tix:{gg:1}}:{pt:500};return {pt:[0,0,800,500][rank]||200}}

// ── 2. 뽑기 상품 ─────────────────────────────────────────────
// 가격은 기존 코인가 그대로. 카드 확률은 코스트 가중치 W (기존 draw와 같음)
const W=[0,30,22,18,12,8,5,3,1.6,.8,.35];
const PACKS=[
 {k:'n', n:'일반 팩',     p:500, cnt:5,d:'5장 · 전체 무작위 · 1장은 3코스트 이상'},
 {k:'p', n:'프리미엄 팩', p:1800,cnt:5,d:'5장 · 4코스트 이상 · 1장은 스타(6+) · 20팩 안에 레전드(9+) 확정'},
 {k:'t', n:'구단 묶음 팩', p:800, cnt:5,d:'5장 · 고른 구단 계보 3개 · 1장은 3코스트 이상'},
 {k:'y', n:'연도 묶음 팩', p:800, cnt:5,d:'5장 · 고른 연도 3개 · 1장은 3코스트 이상'},
 {k:'sx',n:'스타 이벤트 팩',p:1500,cnt:5,d:'5장 · 4코스트 이상 · 장마다 골든글러브·올스타 25% · 1장은 골글·올스타 확정'},
 {k:'tl',n:'구단 팩',     p:600, cnt:5,d:'5장 · 고른 구단 계보 1개, 연도 상관없이 · 1장은 3코스트 이상'},
 {k:'ty',n:'팀 팩',       p:1000,cnt:3,d:'3장 · 고른 구단의 연도 3개 · 1장은 도감에 없는 그 팀 주전 확정'},
 {k:'b', n:'블록 팩',     p:400, cnt:3,d:'스킬 블록 3개 (C50/B30/A15/S5) · 1개는 B급 이상'},
 {k:'tc',n:'작전 카드 팩',p:600, cnt:3,d:'작전 카드 3장 (일반75/특수20/황금5) · 1장은 특수 이상'},
 {k:'t1',n:'작전 카드 1장',p:100,cnt:1,d:'작전 카드 1장'},
 {k:'sp',n:'서포트 카드 팩',p:500,cnt:3,d:'서포트 카드 3장'}];
const PITY={p:20};
// 작전 카드 팩 등급(일반75/특수20/황금5), 3장 중 1장은 특수 이상 보장. 반환 등급 배열 → 해당 등급 TCARDS에서 뽑기
function tcGrades(n){n=n||3;const g=()=>{const u=rnd();return u<.05?'황금':u<.25?'특수':'일반'};const o=[];for(let i=0;i<n;i++)o.push(g());if(o.every(x=>x==='일반'))o[n-1]=rnd()<.2?'황금':'특수';return o}
const FLOOR={n:3,t:3,y:3,tl:3,p:6};
// 블록 팩 등급(C50/B30/A15/S5), 3개 중 1개는 B 이상 보장. 반환 등급 배열 → mkBlock(t,g)에 넘김
function blockGrades(n){n=n||3;const g=()=>{const u=rnd();return u<.05?'S':u<.2?'A':u<.5?'B':'C'};const o=[];for(let i=0;i<n;i++)o.push(g());if(o.every(x=>x==='C')){const u=rnd();o[n-1]=u<.1?'S':u<.4?'A':'B'}return o}  // 프리미엄 팩 연속 20팩 동안 레전드가 없으면 그 팩 마지막 장은 레전드
// 확정권: 뽑기 한 번을 공짜로/확정으로
const TIX={prem:'프리미엄 팩 1개',block:'블록 팩 1개(1장 이상 A급)',star:'스타(6+) 카드 1장',gg:'골든글러브 카드 1장(연도 지정 가능)',
  ex:'EX 카드 1장(구단 지정 가능)',legend:'레전드(9+) 카드 1장',pick:'레전드 선택권(원하는 9+ 카드 1장)'};
const tixPool={star:c=>c.cost>=6,gg:c=>c.v==='GG',ex:c=>c.v==='EX',legend:c=>c.cost>=9};
// 중복 분해: 남는 카드 1장 → 코스트×30P (합성·유학 재료로 쓰지 않을 때)
const DISMANTLE=30;

function wpick(pool){const tot=pool.reduce((s,c)=>s+W[c.cost],0);let u=rnd()*tot;for(const c of pool)if((u-=W[c.cost])<0)return c;return pool[pool.length-1]}
function poolOf(CARDS,pk,opt){opt=opt||{};let pool=CARDS.filter(c=>c.v!=='EX'); // EX는 팩에서 안 나옴(확정권·도감 전용). 올스타(AS)·GG는 일반 확률로 섞임
  if(pk.k==='p')pool=pool.filter(c=>c.cost>=4);
  const arr=(a,b)=>(Array.isArray(a)?a:a!=null?[a]:b!=null?[b]:[]).slice(0,3);
  if(pk.k==='t'){const L=arr(opt.lines,opt.line);pool=pool.filter(c=>L.includes(c.line))}
  if(pk.k==='y'){const Y=arr(opt.years,opt.year).map(Number);pool=pool.filter(c=>Y.includes(c.year))}
  if(pk.k==='sx')pool=pool.filter(c=>c.cost>=4);
  if(pk.k==='tl')pool=pool.filter(c=>c.line===opt.line);
  if(pk.k==='ty'){const Y=(opt.tyYears||[]).map(Number);pool=pool.filter(c=>c.line===opt.line&&Y.includes(c.year))}
  return pool}
// 카드 팩 뽑기: 포인트 차감 + 천장 + 도감 등록까지. 반환 {cards, dex(새로 완성된 세트), err}
function buyCards(S,CARDS,k,opt){const pk=PACKS.find(p=>p.k===k);if(!pk||!['n','p','t','y','tl','ty','sx'].includes(k))return {err:'카드 팩 아님'};
  opt=opt||{};const sel=k==='t'?(opt.lines||[]):k==='y'?(opt.years||[]):null;if(sel&&new Set(sel.map(String)).size!==3)return {err:'3개 선택'};
  if(k==='tl'&&!opt.line)return {err:'구단 선택'};if(k==='ty'&&(!opt.line||new Set((opt.tyYears||[]).map(String)).size!==3))return {err:'구단 1개 · 연도 3개 선택'};
  if(S.pt<pk.p)return {err:'포인트가 모자라요'};const pool=poolOf(CARDS,pk,opt);if(!pool.length)return {err:'뽑을 카드 없음'};
  S.pt-=pk.p;const out=[];const sp=k==='sx'?pool.filter(c=>c.v==='GG'||c.v==='AS'):null,nsp=sp&&pool.filter(c=>!c.v);
  for(let i=0;i<pk.cnt;i++)out.push(k==='ty'?pool[Math.floor(rnd()*pool.length)]:sp?wpick(rnd()<.25?sp:nsp):wpick(pool));
  if(sp&&!out.some(c=>c.v==='GG'||c.v==='AS'))out[out.length-1]=wpick(sp);
  if(k==='ty'){const Y=opt.tyYears.map(Number),miss=SETS.filter(s=>s.kind==='team'&&s.line===opt.line&&Y.includes(s.year)).flatMap(s=>s.ids.filter(id=>!dexHas(S,id)));if(miss.length){const id=miss[Math.floor(rnd()*miss.length)];out[0]=pool.find(c=>c.id===id)||out[0]}}
  // 바닥 보장: 일반·구단·연도 팩은 3코스트 이상 1장, 프리미엄 팩은 스타(6+) 1장 (팩에 없으면 마지막 장을 바꿈)
  const fl=FLOOR[k];if(fl&&!out.some(c=>c.cost>=fl)){const fp=pool.filter(c=>c.cost>=fl);if(fp.length)out[out.length-1]=wpick(fp)}
  if(k==='p'){S.pity=S.pity||{};const n=(S.pity.p|0)+1;
    if(out.some(c=>c.cost>=9))S.pity.p=0;else if(n>=PITY.p){out[out.length-1]=wpick(pool.filter(c=>c.cost>=9));S.pity.p=0}else S.pity.p=n}
  return {cards:out,dex:gain(S,out.map(c=>c.id))}}
// 확정권 쓰기(카드형). pick은 id를 지정
// arg: pick→카드 id, gg→연도(선택), ex→구단 계보(선택)
function useTicket(S,CARDS,k,arg){const pickId=arg;if(!(S.tix&&S.tix[k]>0))return {err:'확정권 없음'};let c;
  if(k==='pick'){c=CARDS.find(x=>x.id===pickId&&x.cost>=9);if(!c)return {err:'레전드(9+) 카드 선택'}}
  else if(tixPool[k]){const all=CARDS.filter(c=>tixPool[k](c)&&(arg==null||(k==='gg'&&c.year===+arg)||(k==='ex'&&c.line===arg)||!['gg','ex'].includes(k))),nw=all.filter(x=>!dexHas(S,x.id));c=wpick(nw.length?nw:all)} // 도감에 없는 카드 우선else return {err:'팩형 확정권은 팩 화면에서 써요'};
  if(!c)return {err:'조건에 맞는 카드 없음'};S.tix[k]--;return {cards:[c],dex:gain(S,[c.id])}}
function dismantle(S,byId,id,n){n=n||1;const have=S.owned[id]|0;if(have-n<1)return {err:'1장은 남겨야 함'};
  S.owned[id]=have-n;if(byId[id].v==='EX'){S.exShard=(S.exShard|0)+n;let tk=0;while(S.exShard>=3){S.exShard-=3;tk++}if(tk){S.tix=S.tix||{};S.tix.ex=(S.tix.ex|0)+tk}return {shard:n,tix:tk,left:S.exShard}} // EX 중복 → EX 조각, 3개마다 EX 확정권(구단 지정 가능)
  const p=byId[id].cost*DISMANTLE*n;S.pt+=p;return {pt:p}}

// ── 3. 도감 ──────────────────────────────────────────────────
// 세트 종류
//  team: 연도·구단 주전 세트(373개) — 그 팀 OVR 상위 야수 8 + 투수 4 = 12장. 보상 Σ코스트×60P. 팀 팩은 균등 확률 + 미등록 주전 1장 확정
//  gg:   연도별 골든글러브 세트(44개) — 그 해 GG 카드 전부. 보상 Σ코스트×60P + 스타 확정권
//  ex:   구단 EX 세트(10개) — 그 구단 계보 EX 카드 전부. 보상 Σ코스트×80P + 레전드 확정권
//  meta: 세트 개수 달성(팀 세트 10/50/100/200/전부, GG 세트 10/전부)
const DEX={team:60,gg:60,ex:80};
let SETS=[],SET_BY={},IN_SETS={};
function buildSets(CARDS){SETS=[];const by=(f)=>{const m={};for(const c of CARDS){const k=f(c);if(k!=null)(m[k]=m[k]||[]).push(c)}return m};
  const ty=by(c=>c.v?null:c.year+'|'+c.team);
  for(const k in ty){const L=ty[k],top=(t,n)=>L.filter(c=>c.type===t).sort((a,b)=>b.ovr-a.ovr).slice(0,n);const ids=[...top('B',8),...top('P',4)];
    const [y,t]=k.split('|');SETS.push({id:'team:'+k,kind:'team',name:`${y} ${t} 주전`,year:+y,line:L[0].line,ids:ids.map(c=>c.id),rw:{pt:ids.reduce((s,c)=>s+c.cost,0)*DEX.team}})}
  const gg=by(c=>c.v==='GG'?c.year:null);
  for(const y in gg){const L=gg[y];SETS.push({id:'gg:'+y,kind:'gg',name:`${y} 골든글러브`,year:+y,ids:L.map(c=>c.id),rw:{pt:L.reduce((s,c)=>s+c.cost,0)*DEX.gg,tix:{star:1}}})}
  const ex=by(c=>c.v==='EX'?c.line:null);
  for(const l in ex){const L=ex[l];SETS.push({id:'ex:'+l,kind:'ex',name:`${l} EX`,ids:L.map(c=>c.id),rw:{pt:L.reduce((s,c)=>s+c.cost,0)*DEX.ex,tix:{legend:1}}})}
  const nT=SETS.filter(s=>s.kind==='team').length,nG=SETS.filter(s=>s.kind==='gg').length;
  for(const [n,rw] of [[10,{pt:3000,tix:{prem:2}}],[50,{pt:10000,tix:{gg:1}}],[100,{pt:20000,tix:{legend:1}}],[200,{pt:40000,tix:{ex:1}}],[nT,{pt:80000,tix:{pick:2}}]])
    SETS.push({id:'meta:team'+n,kind:'meta',name:n===nT?'팀 세트 전부':`팀 세트 ${n}개`,need:['team',n],rw});
  for(const [n,rw] of [[10,{pt:10000,tix:{legend:1}}],[nG,{pt:50000,tix:{pick:1}}]])
    SETS.push({id:'meta:gg'+n,kind:'meta',name:n===nG?'GG 세트 전부':`GG 세트 ${n}개`,need:['gg',n],rw});
  SET_BY={};IN_SETS={};for(const s of SETS){SET_BY[s.id]=s;for(const id of s.ids||[])(IN_SETS[id]=IN_SETS[id]||[]).push(s.id)}
  return SETS}
const dexHas=(S,id)=>!!(S.dex&&S.dex[id]);
function setProgress(S,s){if(s.kind==='meta'){const n=SETS.filter(x=>x.kind===s.need[0]&&S.dexDone[x.id]).length;return {have:Math.min(n,s.need[1]),need:s.need[1]}}
  return {have:s.ids.filter(id=>dexHas(S,id)).length,need:s.ids.length}}
// 카드 획득(보유+도감 등록). 새로 완성된 세트 보상을 자동 지급하고 목록을 돌려줌
function gain(S,ids){S.dex=S.dex||{};S.dexDone=S.dexDone||{};const touched=new Set();
  for(const id of ids){const dup=S.owned[id]|0;S.owned[id]=dup+1;if(!dup&&S.cond)S.cond[id]=S.cond[id]||3;
    if(!S.dex[id]){S.dex[id]=1;for(const sid of IN_SETS[id]||[])touched.add(sid)}}
  const done=[];const check=s=>{if(S.dexDone[s.id])return;const p=setProgress(S,s);if(p.have>=p.need){S.dexDone[s.id]=Date.now();grant(S,s.rw);done.push(s)}};
  for(const sid of touched)check(SET_BY[sid]);if(done.length)for(const s of SETS)if(s.kind==='meta')check(s);
  return done}


// 출석·일일 미션 (현질 대신 꾸준히 들어오면 목돈이 생기게). 날짜는 기기 현지 날짜 'YYYY-MM-DD'
const DAILY={login:200,streak7:{tix:{prem:1}},missions:[['g3','아무 경기 3판',3,100],['w1','AI 리그 1승',1,100],['p1','카드 팩 1개 열기',1,100]]};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function login(S,day){day=day||today();S.daily=S.daily||{};const D=S.daily;if(D.day===day)return null;
  const prev=D.day?Math.round((new Date(day)-new Date(D.day))/864e5):0;D.streak=prev===1?(D.streak|0)+1:1;D.day=day;D.m={};D.got={};
  const rw={pt:DAILY.login,tix:{}};if(D.streak%7===0)rw.tix={...DAILY.streak7.tix};grant(S,rw);return {...rw,streak:D.streak}}
// 미션 진행: ev = 'g3'|'w1'|'p1'. 달성 순간 보상 지급 후 보상 반환
function mission(S,ev){const D=S.daily;if(!D||!D.m)return null;const m=DAILY.missions.find(x=>x[0]===ev);if(!m||D.got[ev])return null;
  D.m[ev]=(D.m[ev]|0)+1;if(D.m[ev]>=m[2]){D.got[ev]=1;const rw={pt:m[3]};grant(S,rw);return rw}return null}

// 반복 보상 일일 상한: 결과만 보기로 무한히 벌지 못하게. 연도 리그 경기·재우승, 단일팀 반복 클리어 P는 하루 합계 CAP까지만.
// 첫 우승·첫 클리어·주간 리그(주 27경기 고정)·도감·출석은 상한 밖. 사용: rw=ECON.capped(S,ECON.yearGame(res)) 후 grant
const CAP={day:1500};
function capped(S,rw){const d=today();S.rep=S.rep&&S.rep.day===d?S.rep:{day:d,pt:0};const left=Math.max(0,CAP.day-S.rep.pt),pt=Math.min(left,rw.pt|0);
  S.rep.pt+=pt;return {...rw,pt,capped:pt<(rw.pt|0),left:left-pt}}
// 유학: 하이리스크 하이리턴. 유학지 표는 UI 시안 ABD/ABR과 같음(이 표가 기준). 좋은 곳일수록 비싸고 실패가 잦고 대성공이 큼
// [id, 시간h, 비용배율, [대성공,성공,보통,실패]%, [대성공,성공,보통 상승치]]. 실패면 상승 0, 비용·중복 재료는 소모
// 비용 = 500 × 시간^0.6 × 비용배율 × (1 + 코스트/5), 10P 단위. 조기 귀국은 남은 1시간당 500P
const STUDY=[['d1',2,1,[10,50,40,0],[4,3,2]],['d6',3,1.25,[12,45,38,5],[5,3,2]],['d2',4,1.5,[12,43,35,10],[6,4,2]],
  ['d8',6,1.75,[14,38,33,15],[7,4,2]],['d3',8,2,[15,35,30,20],[8,5,2]],['d7',10,2.25,[17,30,28,25],[10,6,3]],['d9',10,2.25,[17,30,28,25],[10,6,3]],
  ['d4',12,2.5,[18,25,27,30],[12,7,3]],['d5',24,3,[20,20,20,40],[15,9,4]]];
const STUDY_BY=Object.fromEntries(STUDY.map(x=>[x[0],x])),RUSH=500;
const studyFee=(d,cost)=>{const x=STUDY_BY[d]||STUDY[0];return Math.round(500*Math.pow(x[1],.6)*x[2]*(1+(cost||0)/5)/10)*10};
function studyRoll(d){const x=STUDY_BY[d]||STUDY[0],N=['대성공','성공','보통','실패'];let u=rnd()*100;
  for(let i=0;i<4;i++)if((u-=x[3][i])<0)return {name:N[i],gain:i<3?x[4][i]:0};return {name:'실패',gain:0}}
// 유학 가능 여부(경제 쪽 검사): 특수 카드(올스타·골글·EX)는 불가. 나이 조건 등은 UI/엔진에서 추가 검사
const canStudy=c=>c&&c.v?{err:'특수 카드(올스타·골든글러브·EX)는 유학 불가'}:{ok:true};
const rushFee=msLeft=>Math.max(0,Math.ceil(msLeft/36e5))*RUSH;
function pay(S,p){if((S.pt||0)<p)return {err:'포인트가 모자라요'};S.pt-=p;return {pt:p}}
// 쿠폰: Firestore coupons/{코드} 문서를 읽어 data로 넘김. 같은 코드는 한 번만(S.coupons에 기록). exp(만료 시각, ms 또는 Timestamp) 지나면 거절
function redeem(S,code,data){code=String(code||'').trim().toUpperCase();S.coupons=S.coupons||{};
  if(!data)return {err:'없는 쿠폰'};if(S.coupons[code])return {err:'이미 사용한 쿠폰'};
  const exp=data.exp&&(data.exp.toMillis?data.exp.toMillis():+data.exp);if(exp&&Date.now()>exp)return {err:'기간 만료 쿠폰'};
  const rw={pt:+data.pt||0,tix:data.tix||{}};S.coupons[code]=Date.now();grant(S,rw);return {rw,text:rwText(rw)}}
// 연도 리그 경기 예측 전용 상한: 하루 1,500P (자동 진행 하루 약 60경기 × 평균 60P = 3,600P라 상한 없으면 과함). 주간 리그 예측은 상한 없음
const PRED_CAP=1500;
function predCapped(S,rw){const d=today();S.prc=S.prc&&S.prc.day===d?S.prc:{day:d,pt:0};const left=Math.max(0,PRED_CAP-S.prc.pt),pt=Math.min(left,rw.pt|0);
  S.prc.pt+=pt;return {...rw,pt,capped:pt<(rw.pt|0),left:left-pt}}
// ── 4. 공통 ──────────────────────────────────────────────────
function grant(S,rw){if(!rw)return S;S.pt=(S.pt||0)+(rw.pt||0);S.tix=S.tix||{};for(const k in rw.tix||{})S.tix[k]=(S.tix[k]|0)+rw.tix[k];return S}
const rwText=rw=>[rw.pt?rw.pt.toLocaleString()+'P':'',...Object.entries(rw.tix||{}).filter(([,n])=>n).map(([k,n])=>TIX[k]+(n>1?' ×'+n:''))].filter(Boolean).join(' · ');
// 저장 데이터 이전: coins → pt, 기존 보유 카드는 도감에 등록(완성 보상은 지급하지 않고 완성 표시만)
function migrate(S){if(S.pt==null){S.pt=S.coins|0;delete S.coins}S.tix=S.tix||{};S.pity=S.pity||{p:0};
  if(!S.dex){S.dex={};for(const id in S.owned||{})S.dex[id]=1;S.dexDone={};
    for(const s of SETS)if(s.kind!=='meta'&&setProgress(S,s).have>=s.ids.length)S.dexDone[s.id]=-1;
    for(const s of SETS)if(s.kind==='meta'&&setProgress(S,s).have>=s.need[1])S.dexDone[s.id]=-1}
  S.dexDone=S.dexDone||{};return S}

const ECON={tierMul,LEAGUE,WIN,leagueGame,leagueEnd,CHAL,challenge,TITLES,TITLE_PT,MVP_PT,titleBonus,AWARD_PT,seasonAwards,PRED,predOffer,predSettle,yearGame,yearLeague,W,PACKS,PITY,FLOOR,blockGrades,tcGrades,TIX,DISMANTLE,buyCards,useTicket,dismantle,wpick,
  DEX,buildSets,get SETS(){return SETS},get SET_BY(){return SET_BY},setsOf:id=>IN_SETS[id]||[],setProgress,dexHas,gain,grant,rwText,migrate,DAILY,login,mission,CAP,capped,PRED_CAP,predCapped,redeem,STUDY,STUDY_BY,RUSH,studyFee,studyRoll,canStudy,rushFee,pay,setRnd:f=>{rnd=f}};
if(typeof module!=='undefined'&&module.exports)module.exports=ECON;else root.ECON=ECON;
})(typeof window!=='undefined'?window:globalThis);
