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
function yearLeague(rank,firstWin){if(rank===1)return firstWin?{pt:3000,tix:{gg:1,ch:1}}:{pt:500};return {pt:[0,0,800,500][rank]||200}}

// ── 2. 뽑기 상품 ─────────────────────────────────────────────
// 가격은 기존 코인가 그대로. 카드 확률은 코스트 가중치 W (기존 draw와 같음)
const W=[0,30,22,18,12,8,5,3,1.6,.8,.35];
const PACKS=[
 {k:'n', n:'일반 팩',     p:500, cnt:5,d:'5장 · 전체 무작위 · 1장은 3코스트 이상'},
 {k:'c1',n:'1코스트 팩',  p:200, cnt:5,d:'5장 · 1코스트 카드만 · 합성 재료·도감 채우기용 · 10팩 안에 1코 올스타 확정'},
 {k:'p', n:'프리미엄 팩', p:1800,cnt:5,d:'5장 · 6코스트 이상 · 1장은 7코 이상 · 10팩 안에 레전드(9+) 확정'},
 {k:'t', n:'구단 묶음 팩', p:800, cnt:5,d:'5장 · 고른 구단 계보 3개 · 1장은 3코스트 이상'},
 {k:'y', n:'연도 묶음 팩', p:800, cnt:5,d:'5장 · 고른 연도 3개 · 1장은 3코스트 이상'},
 {k:'sx',n:'스타 이벤트 팩',p:2000,cnt:5,d:'5장 · 4코스트 이상 · 장마다 골든글러브·올스타·커리어하이 25% · 1장은 특별 카드 확정'},
 {k:'tl',n:'구단 팩',     p:600, cnt:5,d:'5장 · 고른 구단 계보 1개, 연도 상관없이 · 1장은 3코스트 이상'},
 {k:'ty',n:'팀 팩',       p:1000,cnt:3,d:'3장 · 고른 구단의 연도 3개 · 1장은 도감에 없는 그 팀 주전 확정'},
 {k:'b', n:'블록 팩',     p:400, cnt:3,d:'스킬 블록 3개 (C50/B30/A15/S5) · 1개는 B급 이상'},
 {k:'tc',n:'작전 카드 팩',p:600, cnt:3,d:'작전 카드 3장 (일반75/특수20/황금5) · 1장은 특수 이상'},
 {k:'t1',n:'작전 카드 1장',p:100,cnt:1,d:'작전 카드 1장'},
 {k:'sp',n:'서포트 카드 팩',p:500,cnt:3,d:'서포트 카드 3장'}];
// 천장: 팩 k를 연속 n팩 열 동안 조건(f)에 맞는 결과가 없으면 n번째 팩 하나를 확정으로 바꿈. 확정이 나오면(자연이든 천장이든) 카운트 0
// 카드 팩은 buyCards가 처리. 블록·작전·서포트 팩은 UI가 뽑은 뒤 pityTick(S,k,hit) 호출 → true면 결과 하나를 확정 등급으로 바꿀 것
const isSp=c=>c.v==='GG'||c.v==='AS'||c.v==='CH';
const PITY={p:{n:10,label:'레전드(9+)',f:c=>c.cost>=9},n:{n:10,label:'스타(6+)',f:c=>c.cost>=6},c1:{n:10,label:'1코 올스타',f:isSp},
  t:{n:10,label:'7코스트 이상',f:c=>c.cost>=7},y:{n:10,label:'7코스트 이상',f:c=>c.cost>=7},tl:{n:10,label:'7코스트 이상',f:c=>c.cost>=7},ty:{n:10,label:'7코스트 이상',f:c=>c.cost>=7},
  sx:{n:10,label:'9코 이상 특별 카드',f:c=>c.cost>=9&&isSp(c)},b:{n:10,label:'S급 블록'},tc:{n:10,label:'황금 작전'},t1:{n:30,label:'황금 작전'},sp:{n:10,label:'강화(+) 서포트'}};
function pityTick(S,k,hit){const P=PITY[k];if(!P)return false;S.pity=S.pity||{};if(hit){S.pity[k]=0;return false}
  const n=(S.pity[k]|0)+1;if(n>=P.n){S.pity[k]=0;return true}S.pity[k]=n;return false}
// 작전 카드 팩 등급(일반75/특수20/황금5), 3장 중 1장은 특수 이상 보장. 반환 등급 배열 → 해당 등급 TCARDS에서 뽑기
function tcGrades(n){n=n||3;const g=()=>{const u=rnd();return u<.05?'황금':u<.25?'특수':'일반'};const o=[];for(let i=0;i<n;i++)o.push(g());if(o.every(x=>x==='일반'))o[n-1]=rnd()<.2?'황금':'특수';return o}
const FLOOR={n:3,t:3,y:3,tl:3,p:7};
// 블록 팩 등급(C50/B30/A15/S5), 3개 중 1개는 B 이상 보장. 반환 등급 배열 → mkBlock(t,g)에 넘김
function blockGrades(n){n=n||3;const g=()=>{const u=rnd();return u<.05?'S':u<.2?'A':u<.5?'B':'C'};const o=[];for(let i=0;i<n;i++)o.push(g());if(o.every(x=>x==='C')){const u=rnd();o[n-1]=u<.1?'S':u<.4?'A':'B'}return o}  // 프리미엄 팩 연속 20팩 동안 레전드가 없으면 그 팩 마지막 장은 레전드
// 확정권: 뽑기 한 번을 공짜로/확정으로
const TIX={ch:'커리어하이 카드 1장(연도 지정 가능)',prem:'프리미엄 팩 1개',block:'블록 팩 1개(1장 이상 A급)',star:'스타(6+) 카드 1장',gg:'골든글러브 카드 1장(연도 지정 가능)',
  ex:'EX 카드 1장(구단 지정 가능)',legend:'레전드(9+) 카드 1장',abr:'유학 초기화권',pick:'레전드 선택권(원하는 9+ 카드 1장)'};
const tixPool={ch:c=>c.v==='CH',star:c=>c.cost>=6&&!c.mx,gg:c=>c.v==='GG',ex:c=>c.v==='EX'&&!c.mx,legend:c=>c.cost>=9&&!c.mx};
// 중복 분해: 남는 카드 1장 → 코스트×30P (합성·유학 재료로 쓰지 않을 때)
const DISMANTLE=30;

function wpick(pool){const tot=pool.reduce((s,c)=>s+W[c.cost],0);let u=rnd()*tot;for(const c of pool)if((u-=W[c.cost])<0)return c;return pool[pool.length-1]}
function poolOf(CARDS,pk,opt){opt=opt||{};let pool=CARDS.filter(c=>c.v!=='EX'&&c.v!=='RN'&&!c.mx); // 영구결번(RN·mx)은 미션 전용 // EX는 팩에서 안 나옴(확정권·도감 전용). 올스타(AS)·GG는 일반 확률로 섞임
  if(pk.k==='p')pool=pool.filter(c=>c.cost>=6); // SJ 2026-11-26: 프리미엄=고코스트 팩
  if(pk.k==='c1')pool=pool.filter(c=>c.cost===1);
  const arr=(a,b)=>(Array.isArray(a)?a:a!=null?[a]:b!=null?[b]:[]).slice(0,3);
  if(pk.k==='t'){const L=arr(opt.lines,opt.line);pool=pool.filter(c=>L.includes(c.line))}
  if(pk.k==='y'){const Y=arr(opt.years,opt.year).map(Number);pool=pool.filter(c=>Y.includes(c.year))}
  if(pk.k==='sx')pool=pool.filter(c=>c.cost>=4);
  if(pk.k==='tl')pool=pool.filter(c=>c.line===opt.line);
  if(pk.k==='ty'){const Y=(opt.tyYears||[]).map(Number);pool=pool.filter(c=>c.line===opt.line&&Y.includes(c.year))}
  return pool}
// 카드 팩 뽑기: 포인트 차감 + 천장 + 도감 등록까지. 반환 {cards, dex(새로 완성된 세트), err}
function buyCards(S,CARDS,k,opt){const pk=PACKS.find(p=>p.k===k);if(!pk||!['n','c1','p','t','y','tl','ty','sx'].includes(k))return {err:'카드 팩 아님'};
  opt=opt||{};const sel=k==='t'?(opt.lines||[]):k==='y'?(opt.years||[]):null;if(sel&&new Set(sel.map(String)).size!==3)return {err:'3개 선택'};
  if(k==='tl'&&!opt.line)return {err:'구단 선택'};if(k==='ty'&&(!opt.line||new Set((opt.tyYears||[]).map(String)).size!==3))return {err:'구단 1개 · 연도 3개 선택'};
  if(S.pt<pk.p)return {err:'포인트가 모자라요'};const pool=poolOf(CARDS,pk,opt);if(!pool.length)return {err:'뽑을 카드 없음'};
  S.pt-=pk.p;const out=[];const sp=k==='sx'?pool.filter(isSp):null,nsp=sp&&pool.filter(c=>!c.v);
  for(let i=0;i<pk.cnt;i++)out.push(k==='ty'?pool[Math.floor(rnd()*pool.length)]:sp?wpick(rnd()<.25?sp:nsp):wpick(pool));
  if(sp&&!out.some(isSp))out[out.length-1]=wpick(sp);
  if(k==='ty'){const Y=opt.tyYears.map(Number),miss=SETS.filter(s=>s.kind==='team'&&s.line===opt.line&&Y.includes(s.year)).flatMap(s=>s.ids.filter(id=>!dexHas(S,id)));if(miss.length){const id=miss[Math.floor(rnd()*miss.length)];out[0]=pool.find(c=>c.id===id)||out[0]}}
  // 바닥 보장: 일반·구단·연도 팩은 3코스트 이상 1장, 프리미엄 팩은 스타(6+) 1장 (팩에 없으면 마지막 장을 바꿈)
  const fl=FLOOR[k];if(fl&&!out.some(c=>c.cost>=fl)){const fp=pool.filter(c=>c.cost>=fl);if(fp.length)out[out.length-1]=wpick(fp)}
  {const P=PITY[k];if(P&&P.f){const fp=pool.filter(P.f);if(fp.length&&pityTick(S,k,out.some(P.f)))out[out.length-1]=k==='ty'?fp[Math.floor(rnd()*fp.length)]:wpick(fp)}}
  return {cards:out,dex:gain(S,out.map(c=>c.id))}}
// 확정권 쓰기(카드형). pick은 id를 지정
// arg: pick→카드 id, gg→연도(선택), ex→구단 계보(선택)
function useTicket(S,CARDS,k,arg){const pickId=arg;if(!(S.tix&&S.tix[k]>0))return {err:'확정권 없음'};let c;
  if(k==='pick'){c=CARDS.find(x=>x.id===pickId&&x.cost>=9&&!x.mx);if(!c)return {err:'레전드(9+) 카드 선택'}}
  else if(tixPool[k]){const all=CARDS.filter(c=>tixPool[k](c)&&(arg==null||(k==='gg'&&c.year===+arg)||(k==='ex'&&c.line===arg)||(k==='ch'&&c.year===+arg)||!['gg','ex','ch'].includes(k))),nw=all.filter(x=>!dexHas(S,x.id));c=wpick(nw.length?nw:all)} // 도감에 없는 카드 우선
  else return {err:'팩형 확정권은 팩 화면에서 써요'};
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
  const chs=by(c=>c.v==='CH'?c.line:null);
  for(const l in chs){const L=chs[l];SETS.push({id:'ch:'+l,kind:'ch',name:`${l} 커리어하이`,line:l,ids:L.map(c=>c.id),rw:{pt:L.reduce((s,c)=>s+c.cost,0)*DEX.gg,tix:{legend:1}}})}
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
const DAILY={login:200,streak7:{tix:{prem:1,abr:1}},missions:[['g3','아무 경기 3판',3,100],['w1','AI 리그 1승',1,100],['p1','카드 팩 1개 열기',1,100]]};
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
const abResetFee=cost=>Math.round(3000*(1+(cost||0)/5)/100)*100; // 유학 초기화 비용(SJ 2026-11-25: 포인트나 초기화권으로 지우고 다시 보냄)
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
// ── 장비(미션 보상 전용) ──────────────────────────────────────
// 카드 유형별 슬롯 3칸, 언제든 끼웠다 뺄 수 있음. 저코스트 카드일수록 보너스가 큼(덱 운영용): 전설 기준 1코 +20 … 5코 +10 … 10코 +2
// 등급 배율: 일반 0.35 · 희귀 0.6 · 전설 1. 같은 구단 장비를 그 구단 카드에 끼우면 +10%(최소 +1). 결과는 반올림, 최소 +1
const EQ_KIND={bp:['B','bat','배트(장타)','pow'],bc:['B','bat','배트(교타)','con'],gl:['B','glove','글러브','def'],sk:['B','spike','스파이크','spd'],
  ro:['P','rosin','로진','ctl'],bl:['P','ball','공인구','stu'],sh:['P','shoe','투수화','sta']};
const EQ_SLOTS={B:['bat','glove','spike'],P:['rosin','ball','shoe']},EQ_G={일반:.35,희귀:.6,전설:1};
const EQ_BASE=[0,20,17,15,12,10,8,6,4,3,2];
function mkEquip(S,g,line,kind){const ks=Object.keys(EQ_KIND),k=kind||ks[Math.floor(rnd()*ks.length)];S.eq=S.eq||[];S.eqN=(S.eqN|0)+1;
  const it={u:'e'+S.eqN,k,g,line:line||null,on:null};S.eq.push(it);return it}
const eqName=it=>`${it.line?it.line+' ':''}${it.g} ${EQ_KIND[it.k][2]}`;
function eqBonus(it,c){const K=EQ_KIND[it.k];if(!c||c.type!==K[0])return null;let v=EQ_BASE[Math.max(1,Math.min(10,c.cost))]*EQ_G[it.g];
  if(c.v==='CH')v*=1.25; // 커리어하이 카드는 장비 ×1.25
  if(c.pz)v*=1+.25*c.pz; // 숨은 잠재력(세이버 지표 좋았던 선수) ×1.25/×1.5
  if(it.line&&it.line===c.line)v+=Math.max(1,v*.1);return {stat:K[3],v:Math.max(1,Math.round(v))}}
function equip(S,u,cardId,byId){const it=(S.eq||[]).find(x=>x.u===u),c=byId[cardId];if(!it||!c)return {err:'없는 장비·카드'};const K=EQ_KIND[it.k];
  if(c.type!==K[0])return {err:K[0]==='B'?'타자용 장비예요':'투수용 장비예요'};
  for(const x of S.eq)if(x.on===cardId&&EQ_KIND[x.k][1]===K[1]&&x!==it)x.on=null; // 같은 슬롯에 있던 장비는 빠짐
  it.on=cardId;return {ok:true,bonus:eqBonus(it,c)}}
function unequip(S,u){const it=(S.eq||[]).find(x=>x.u===u);if(it)it.on=null;return {ok:!!it}}
// 카드에 끼운 장비 합계 {stat:+v}. 엔진이 능력치에 더할 때 사용
function cardEq(S,cardId,byId){const o={},c=byId[cardId];for(const it of S.eq||[])if(it.on===cardId){const b=eqBonus(it,c);if(b)o[b.stat]=(o[b.stat]|0)+b.v}return o}
// ── 미션 챕터(OOTP식) ─────────────────────────────────────────
// 구단 계보마다 챕터 1개, 미션 ★1~★5. 미션 3개 → 그 구단 EX 확정권, 5개 → 영구결번 카드(v:'RN', mx) 1장 + 전설 장비. 챕터 재완료는 없음
// 챕터 3개 완료 → 레전드 선택권, 전부 → 명예의 전당 보상(첫 완료 기준 S.msFin). 진행 기록 S.ms[챕터id]={cyc,m1:시각,...,mid,fin}
// 제출 미션은 기본적으로 중복만 소모(1장은 남김). S.opt.submitLast=true면 마지막 1장도 제출 가능(도감 기록은 유지)
const MS_DEF=[['m1',1,'그 구단 카드 10장 보유',{pt:1000,eq:'일반'}],['m2',2,'그 구단 주전 세트 1개 완성',{pt:2000,tix:{star:1,abr:1},eq:'일반'}],
  ['m3',3,'그 구단 7코스트 이상 카드 5장 제출',{pt:3000,exShard:1,eq:'희귀'}],['m4',4,'그 구단 선수 15명 이상 1군으로 주간 리그 4단계 이상 우승',{pt:4000,tix:{gg:1},eq:'희귀'}],
  ['m5',5,'그 구단 레전드(9+) 카드 3장 보유',{pt:5000,tix:{legend:1},eq:'희귀'}]];
const MS_META=[[3,'챕터 3개 완료',{pt:10000,tix:{pick:1}}],['all','모든 챕터 완료 · 명예의 전당',{pt:50000,tix:{pick:2}}]];
let CHAPTERS=[],CARDS_=[];
function buildMissions(CARDS){CARDS_=CARDS;const L=[...new Set(CARDS.filter(c=>c.v!=='NT').map(c=>c.line))]; // 국가대표(NT)는 구단 챕터가 아님(국가대표 미션 보상)
  CHAPTERS=L.map(l=>({id:'ch:'+l,line:l,mx:CARDS.filter(c=>c.mx&&c.line===l).map(c=>c.id)}));return CHAPTERS}
// 회차: 구단에 영구결번이 여러 장이면(삼성·한화 4장 등) 챕터를 다시 돌 수 있음. 회차 c마다 조건이 올라감
const msReq=(c)=>({m1:10+5*c,m2:1+c,m3:5+3*c,m4:Math.min(10,4+2*c),m5:3+c});
const msCyc=(S,ch)=>((S.ms&&S.ms[ch.id]&&S.ms[ch.id].cyc)|0);
function msText(S,ch,mid){const q=msReq(msCyc(S,ch));return {m1:`그 구단 카드 ${q.m1}장 보유`,m2:`그 구단 주전 세트 ${q.m2}개 완성`,m3:`그 구단 7코스트 이상 카드 ${q.m3}장 제출`,
  m4:`그 구단 선수 15명 이상 1군으로 주간 리그 ${q.m4}단계 이상 우승`,m5:`그 구단 레전드(9+) 카드 ${q.m5}장 보유`}[mid]}
const ownedOf=(S,f)=>CARDS_.filter(c=>(S.owned[c.id]|0)>0&&f(c));
function msProg(S,ch,mid){const l=ch.line,st=(S.ms&&S.ms[ch.id])||{};if(st[mid])return {done:true,have:1,need:1};
  const q=msReq(st.cyc|0);
  if(mid==='m1'){const n=ownedOf(S,c=>c.line===l).length;return {have:Math.min(n,q.m1),need:q.m1}}
  if(mid==='m2'){const n=SETS.filter(s=>s.kind==='team'&&s.line===l&&S.dexDone&&S.dexDone[s.id]).length;return {have:Math.min(n,q.m2),need:q.m2}}
  if(mid==='m3'){return {have:(st.sub|0),need:q.m3}}
  if(mid==='m4')return {have:0,need:1,tier:q.m4};
  if(mid==='m5'){const n=ownedOf(S,c=>c.line===l&&c.cost>=9&&!c.mx).length;return {have:Math.min(n,q.m5),need:q.m5}}}
function msDone(S,ch,mid,out){S.ms=S.ms||{};const st=S.ms[ch.id]=S.ms[ch.id]||{};if(st[mid])return;st[mid]=Date.now();
  const rw={...MS_DEF.find(m=>m[0]===mid)[3]};if(rw.exShard){S.exShard=(S.exShard|0)+rw.exShard;while(S.exShard>=3){S.exShard-=3;rw.tix={...(rw.tix||{}),ex:((rw.tix||{}).ex|0)+1}}delete rw.exShard}
  let eqx='';if(rw.eq){const it=mkEquip(S,rw.eq,ch.line);eqx=' · 장비: '+eqName(it);delete rw.eq}
  grant(S,rw);out.push({ch:ch.line,what:msText(S,ch,mid)+(mid==='m3'?' (EX 조각 +1)':'')+eqx,rw});
  const n=MS_DEF.filter(m=>st[m[0]]).length;
  if(n>=3&&!st.mid){st.mid=Date.now();const r={tix:{ex:1}};grant(S,r);out.push({ch:ch.line,what:'미션 3개 달성',rw:r})}
  if(n>=5&&!st.fin){st.fin=Date.now();{const it=mkEquip(S,'전설',ch.line);out.push({ch:ch.line,what:'챕터 완료 · 전설 장비: '+eqName(it),rw:{}})}const miss=ch.mx.filter(id=>!(S.owned[id]>0));
    if(ch.mx.length){const id=(miss.length?miss:ch.mx)[Math.floor(rnd()*(miss.length||ch.mx.length))];gain(S,[id]);out.push({ch:ch.line,what:'챕터 완료',card:id,rw:{}})}
    else{const r={pt:10000,tix:{ex:1}};grant(S,r);out.push({ch:ch.line,what:'챕터 완료',rw:r})}
    S.msFin=S.msFin||{};if(!S.msFin[ch.id])S.msFin[ch.id]=Date.now();
    if(ch.mx.some(id=>!(S.owned[id]>0))){S.ms[ch.id]={cyc:(st.cyc|0)+1};out.push({ch:ch.line,what:`${(st.cyc|0)+2}회차 시작 (남은 영구결번 ${ch.mx.filter(id=>!(S.owned[id]>0)).length}장, 조건 상향)`,rw:{}})}
    const fin=CHAPTERS.filter(c=>S.msFin[c.id]).length;S.msMeta=S.msMeta||{};
    for(const [k,name,r] of MS_META){const need=k==='all'?CHAPTERS.length:k;if(fin>=need&&!S.msMeta[k]){S.msMeta[k]=Date.now();grant(S,r);out.push({ch:'',what:name,rw:r})}}}}
// 보유·도감 조건 미션 자동 확인(카드 얻은 뒤, 화면 열 때 호출). 새로 깬 미션 목록 반환
function missionCheck(S){const out=[];for(const ch of CHAPTERS)for(const mid of ['m1','m2','m5']){const p=msProg(S,ch,mid);if(!p.done&&p.have>=p.need)msDone(S,ch,mid,out)}return out.concat(natCheck(S))}
// 제출(★3): ids = 낼 카드 id 배열(중복 허용). 그 구단 7코+만. 기본은 중복만, S.opt.submitLast면 마지막 장도
function missionSubmit(S,line,ids){const ch=CHAPTERS.find(c=>c.line===line);if(!ch)return {err:'없는 챕터'};S.ms=S.ms||{};const st=S.ms[ch.id]=S.ms[ch.id]||{};
  if(st.m3)return {err:'이미 완료한 미션이에요'};const last=S.opt&&S.opt.submitLast,use={};
  for(const id of ids){const c=CARDS_.find(x=>x.id===id);if(!c||c.line!==line||c.cost<7)return {err:'그 구단 7코스트 이상 카드만 낼 수 있어요'};use[id]=(use[id]|0)+1}
  for(const id in use){const keep=last?0:1;if((S.owned[id]|0)-use[id]<keep)return {err:last?'가진 장수보다 많아요':'중복 카드만 낼 수 있어요 (옵션에서 마지막 1장 제출 허용 가능)'}}
  const room=msReq(st.cyc|0).m3-(st.sub|0);let n=0;for(const id in use){const k=Math.min(use[id],room-n);if(k<=0)break;S.owned[id]-=k;if(S.owned[id]<=0)delete S.owned[id];n+=k}
  st.sub=(st.sub|0)+n;const out=[];if(st.sub>=msReq(st.cyc|0).m3)msDone(S,ch,'m3',out);return {used:n,have:st.sub,out}}
// ★4: 주간 리그 우승 때 모드 쪽에서 호출. lineupCards = 1군 카드 객체 배열
function missionLeague(S,tier,lineupCards){const out=[];const cnt={};for(const c of lineupCards||[])if(c)cnt[c.line]=(cnt[c.line]|0)+1;
  for(const ch of CHAPTERS)if((cnt[ch.line]|0)>=15&&tier>=msReq(msCyc(S,ch)).m4)msDone(S,ch,'m4',out);return out}
// ── 국가대표 우승 미션 ─────────────────────────────────────────
// 대회마다 명단 선수 중 그해 기본 카드(c.v 없음)가 있는 선수 전원의 그해 카드를 1장씩 보유하면 완료(도감 아님, 보유 기준)
// 보상: 그 대회 국가대표 카드(v:'NT', mx, 미션 전용) 전부 + 5,000P. 보상 카드가 없는 대회(2018·2026)는 10,000P + 레전드 확정권
// 사용: ECON.buildNat(CARDS, NAT_SETS, natHit) — core2의 NAT_SETS·natHit를 넘김. 확인은 missionCheck가 같이 함
let NATS=[];
function buildNat(CARDS,sets,hit){NATS=(sets||[]).map(([name,y,list])=>{const mem=list.split(' ').map(e=>({e,ids:CARDS.filter(c=>!c.v&&hit(c,y,e)).map(c=>c.id)})).filter(m=>m.ids.length);
  const nt=CARDS.filter(c=>c.v==='NT'&&(c.nt?c.nt===name:c.year===y)).map(c=>c.id);
  return {id:'nat:'+name,name:name+' 멤버 모으기',year:y,mem,nt,rw:nt.length?{pt:5000}:{pt:10000,tix:{legend:1}}}});return NATS}
function natProg(S,n){if(S.nat&&S.nat[n.id])return {done:true,have:n.mem.length,need:n.mem.length};return {have:n.mem.filter(m=>m.ids.some(id=>(S.owned[id]|0)>0)).length,need:n.mem.length}}
function natCheck(S){const out=[];S.nat=S.nat||{};for(const n of NATS){if(S.nat[n.id])continue;const p=natProg(S,n);if(p.have>=p.need&&p.need){S.nat[n.id]=Date.now();grant(S,n.rw);if(n.nt.length)gain(S,n.nt);
  out.push({ch:'국가대표',what:n.name+' 완료',rw:n.rw,cards:n.nt})}}return out}
const isMissionOnly=c=>!!(c&&c.mx);
// ── 4. 공통 ──────────────────────────────────────────────────
function grant(S,rw){if(!rw)return S;S.pt=(S.pt||0)+(rw.pt||0);S.tix=S.tix||{};for(const k in rw.tix||{})S.tix[k]=(S.tix[k]|0)+rw.tix[k];return S}
const rwText=rw=>[rw.pt?rw.pt.toLocaleString()+'P':'',...Object.entries(rw.tix||{}).filter(([,n])=>n).map(([k,n])=>TIX[k]+(n>1?' ×'+n:''))].filter(Boolean).join(' · ');
// 저장 데이터 이전: coins → pt, 기존 보유 카드는 도감에 등록(완성 보상은 지급하지 않고 완성 표시만)
function migrate(S){if(S.pt==null){S.pt=S.coins|0;delete S.coins}S.tix=S.tix||{};S.pity=S.pity||{p:0};
  if(!S.dex){S.dex={};for(const id in S.owned||{})S.dex[id]=1;S.dexDone={};
    for(const s of SETS)if(s.kind!=='meta'&&setProgress(S,s).have>=s.ids.length)S.dexDone[s.id]=-1;
    for(const s of SETS)if(s.kind==='meta'&&setProgress(S,s).have>=s.need[1])S.dexDone[s.id]=-1}
  S.dexDone=S.dexDone||{};return S}

const ECON={tierMul,LEAGUE,WIN,leagueGame,leagueEnd,CHAL,challenge,TITLES,TITLE_PT,MVP_PT,titleBonus,AWARD_PT,seasonAwards,PRED,predOffer,predSettle,yearGame,yearLeague,W,PACKS,PITY,FLOOR,pityTick,blockGrades,tcGrades,TIX,DISMANTLE,buyCards,useTicket,dismantle,wpick,
  DEX,buildSets,get SETS(){return SETS},get SET_BY(){return SET_BY},setsOf:id=>IN_SETS[id]||[],setProgress,dexHas,gain,grant,rwText,migrate,DAILY,login,mission,CAP,capped,PRED_CAP,predCapped,redeem,MS_DEF,MS_META,buildMissions,get CHAPTERS(){return CHAPTERS},msProg,msText,msReq,msCyc,missionCheck,missionSubmit,missionLeague,isMissionOnly,buildNat,get NATS(){return NATS},natProg,natCheck,EQ_KIND,EQ_SLOTS,EQ_G,EQ_BASE,mkEquip,eqName,eqBonus,equip,unequip,cardEq,STUDY,STUDY_BY,RUSH,studyFee,studyRoll,canStudy,abResetFee,rushFee,pay,setRnd:f=>{rnd=f}};
if(typeof module!=='undefined'&&module.exports)module.exports=ECON;else root.ECON=ECON;
})(typeof window!=='undefined'?window:globalThis);
