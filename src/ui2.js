(()=>{
// ===== 프로호구 매니저 UI (시안 디자인 이식판) =====
const $=s=>document.querySelector(s),vw=document.getElementById('view'),hdr=document.getElementById('hdr');
const KEY='diamond-chronicle-v2';
let S=null,G=null,packOut=null,flt={type:'',tier:'',line:'',year:'',q:'',sort:'ovr',all:false,lim:120};
// 저장: 화면 전용 임시 값은 빼고 저장. 라인업은 S.team이 원본(S.lu 등은 화면용 사본)
const TRANS=new Set(['ofMore','dsRes','dsPred','reveal','luAna','phMsg','ntcView','verMsg','ntcHide','dexFOpen','bldCode','bldImpMsg','msSub','msMsg','setbOpen','sel','modal','bmodal','bmslot','dexView','bldSel','bldClr','deckDel','deckName','mslot','mflip','msg','blkSel','synRes','recm','undo','cmpA','pkMsg','eqMore','eqSlot','cpMsg','toast','tdraw','ojoin','pkOut','lu','bench','rot','pen','abPick','ssel']);
const save=()=>{if(!S)return;syncTeam();S.ts=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S,function(k,v){return this===S&&TRANS.has(k)?undefined:v}))}catch(e){}if(typeof cloudPush==='function')cloudPush()};
let saveT=null;const saveSoon=()=>{clearTimeout(saveT);saveT=setTimeout(save,400)};
const own=t=>Object.keys(S.owned).map(id=>byId[id]).filter(c=>c&&(!t||c.type===t));
const yy=y=>"'"+String(y).slice(2);
const rollCond=()=>{S.cond={};for(const id in S.owned){const u=Math.random();S.cond[id]=Math.max(condMin(id),u<.08?1:u<.25?2:u<.6?3:u<.88?4:5)}};
const gainBlock=(t,g)=>{const b=mkBlock(t||pick(['B','P']),g);S.blocks.push(b);return b};
function fresh(){
  S={locks:[],tq:{b1:1,p1:1,c1:1},sq:{s1:1,s3:1},pt:3000,owned:{},team:{name:'내 구단',lineup:[],bench:[],rot:[],pen:[],rotIdx:0,mgr:'m1'},cond:{},gp:{},blocks:[],season:null,last:[],ab:[],abHist:{},abSt:{},abSum:{}};
  const used=new Set(),add=c=>{if(!c)return;S.owned[c.id]=1;used.add(c.pk)};
  const cheap=f=>{const L=CARDS.filter(x=>f(x)&&!x.v&&x.cost<=2&&!used.has(x.pk)&&x.ovr>=58);return L.length?pick(L):pick(CARDS.filter(x=>f(x)&&!x.v&&!used.has(x.pk)&&x.cost<=4))};
  for(const p of ['C','1B','2B','3B','SS','LF','CF','RF'])add(cheap(x=>x.type==='B'&&x.ps&&x.ps[p]!=null));
  for(let i=0;i<6;i++)add(cheap(x=>x.type==='B'));for(let i=0;i<5;i++)add(cheap(x=>x.pos==='SP'));for(let i=0;i<6;i++)add(cheap(x=>x.pos==='RP'));
  for(let i=0;i<3;i++)gainBlock(i<2?'B':'P');
  if(typeof ECON!=='undefined')ECON.migrate(S);
  autoSet();rollCond();newSeason()}
function autoSet(){Object.assign(S.team,bestLineup(Object.keys(S.owned).filter(id=>!(S.ab||[]).some(a=>a.id===id&&!a.got))));if(S.__ui)pullTeam()}
const clean=T=>({...T,rot:T.rot.filter(Boolean),pen:T.pen.filter(Boolean),bench:(T.bench||[]).filter(Boolean)});
// 덱 프리셋·모드별 덱: S.decks=[{id,name,t:{lineup,bench,rot,pen,mgr,tsel}}], S.modeDeck={lg,yl,on}=덱 id(없으면 현재 라인업)
const MODEK=m=>typeof m==='string'?m:m&&m===S.yl?'yl':'lg',MODEN={lg:'주간 리그',yl:'연도별 리그',on:'친구 리그'};
const deckIds=t=>[...(t.lineup||[]).map(x=>x.id),...(t.bench||[]),...(t.rot||[]),...(t.pen||[])].filter(Boolean);
const deckOk=d=>d&&deckIds(d.t).every(id=>S.owned[id]&&!(S.ab||[]).some(a=>a.id===id&&!a.got))&&!exErr(deckIds(d.t)).length; // EX 타자1·투수1 넘는 저장 덱은 모드에 쓰지 않음
const modeDeck=m=>{const id=(S.modeDeck||{})[MODEK(m)],d=(S.decks||[]).find(x=>x.id===id);return deckOk(d)?d:null};
const snapT=()=>{syncTeam();const T=S.team;return JSON.parse(JSON.stringify({lineup:T.lineup,bench:T.bench,rot:T.rot,pen:T.pen,mgr:T.mgr,tsel:T.tsel,fxsel:T.fxsel||[]}))};
// 리그별 라인업(SJ 2026-11-26, OOTP식): 주간(lg)·연도별(yl)·친구(on) 리그가 각자 라인업·투수진·감독·작전을 따로 가짐.
// S.team은 지금 편집 중인 리그(S.teamK)의 것이고, 나머지 리그 것은 S.mt[k]에 보관. 이름·서포트 카드 등은 공유
const MT_KEYS=['lineup','bench','rot','pen','mgr','tsel','fxsel','rotIdx'],mtPick=o=>JSON.parse(JSON.stringify(Object.fromEntries(MT_KEYS.map(x=>[x,o[x]===undefined?null:o[x]]))));
function useMode(k){const cur=S.teamK||'lg';if(cur===k)return;syncTeam();S.mt=S.mt||{};S.mt[cur]=mtPick(S.team);
  let n=S.mt[k];if(!n){const d=modeDeck(k);n=d?mtPick({...S.team,...d.t}):mtPick(S.team)} // 처음 여는 리그: 예전 '모드별 덱'이 있으면 그걸로, 없으면 지금 라인업 복사
  for(const x of MT_KEYS)if(n[x]!==null)S.team[x]=JSON.parse(JSON.stringify(n[x]));S.teamK=k;if(S.__ui)pullTeam()}
const modeTeam=k=>{syncTeam();if(k===(S.teamK||'lg')||!(S.mt||{})[k]){if(k!==(S.teamK||'lg')&&!(S.mt||{})[k]){const d=modeDeck(k);if(d)return {...S.team,...JSON.parse(JSON.stringify(d.t))}}return S.team}
  const m=S.mt[k];return {...S.team,...Object.fromEntries(MT_KEYS.filter(x=>m[x]!==null).map(x=>[x,JSON.parse(JSON.stringify(m[x]))]))}};
const userT=m=>({...clean(modeTeam(m!==undefined?MODEK(m):(S.teamK||'lg'))),color:'#e07a45',blocks:S.blocks,abSt:S.abSt||{},eq:eqMap()});
// SJ 2026-11-26: 라인업은 각 리그 화면의 라인업 탭에서. #lineup은 지금 리그(S.teamK)의 라인업을 바로 엶(친구 리그·홈 바로가기용)
function luHead(){const k=S.teamK||'lg',H={lg:'season',yl:'years',on:'online'};return `<div class="tools mttabs" style="margin-bottom:8px"><b>${MODEN[k]} 라인업</b><a href="#${H[k]}" class="note">${MODEN[k]} 화면으로 →</a></div>`}
function mtTabs(){const k=S.teamK||'lg';return `<div class="tools mttabs" style="margin-bottom:8px"><b>편집 중인 라인업</b><div class="tabs" role="tablist">${Object.entries(MODEN).map(([x,n])=>`<button role="tab" aria-selected="${k===x}" class="${k===x?'on':''}" data-a="mt-k" data-k="${x}">${n}</button>`).join('')}</div><small>리그마다 라인업이 따로 저장돼요</small></div>`}
const eqMap=()=>{const o={};if(typeof ECON!=='undefined'&&ECON.cardEq)for(const it of S.eq||[])if(it.on&&!o[it.on])o[it.on]=ECON.cardEq(S,it.on,byId);return o}; // 장착 장비 보너스(카드id→{능력:+n}), 경기 능력치에 더함
const starters=T=>{T=clean(T);return [...T.lineup.map(x=>x.id),...T.rot,...T.pen].filter(Boolean).map(id=>byId[id])};
const regCards=T=>{T=clean(T);return [...starters(T),...T.bench.map(id=>byId[id])].filter(Boolean)};
function validate(){syncTeam();
  const T=S.team,e=[],ps=T.lineup.map(x=>x.pos);
  if(T.lineup.length!==9||T.lineup.some(x=>!x.id))e.push('타순 9자리 필요');
  for(const p of POS)if(!ps.includes(p))e.push(`${PFULL[p]} 자리가 없습니다`);
  for(const x of T.lineup){const c=byId[x.id];if(c&&!canPlay(c,x.pos))e.push(`${c.name}은(는) ${PFULL[x.pos]}을(를) 수비 불가`)}
  if(T.rot.filter(Boolean).length<5)e.push('선발 5명 필요');
  if(!T.pen.filter(Boolean).length)e.push('불펜에 최소 1명이 필요합니다');
  const nm={};for(const c of regCards(T))nm[pkt(c)]=(nm[pkt(c)]||0)+1;for(const k in nm)if(nm[k]>1)e.push(`${k.split('|')[0]} 선수가 중복 등록됐습니다`);
  for(const c of regCards(T))if((S.ab||[]).some(a=>a.id===c.id&&!a.got))e.push(`${c.name}은(는) 유학 중`);
  e.push(...exErr(regCards(T).map(c=>c.id)));
  const cost=regCards(T).reduce((s,c)=>s+c.cost,0);if(cost>COST_CAP)e.push(`1군 코스트 ${cost} / 상한 ${COST_CAP} 초과`);
  {const bn=T.bench.map(id=>byId[id]).filter(Boolean);if(!bn.some(c=>c.type==='B'&&canPlay(c,'C'))){const rn=new Set(regCards(T).map(pkt)),mx=bn.length<5?0:Math.max(...bn.map(c=>c.cost)),spare=OWN.some(c=>c.type==='B'&&!c.dup&&canPlay(c,'C')&&!rn.has(pkt(c))&&!abOf(c.id)&&cost-mx+c.cost<=COST_CAP);if(spare)e.push('벤치에 백업 포수 1명이 필요합니다')}}
  return e}
// 화면용 라인업 사본(S.lu=[[포지션,id]], S.bench/rot/pen 고정 칸) ↔ S.team
function pullTeam(){const T=S.team,pad=(a,n)=>{a=[...(a||[])];while(a.length<n)a.push(null);return a.slice(0,n)};
  const L=(T.lineup||[]).map(x=>[x.pos,x.id]);for(const p of POS)if(!L.some(x=>x[0]===p))L.push([p,null]);
  Object.defineProperty(S,'lu',{value:L.slice(0,9),writable:true,configurable:true,enumerable:false});
  for(const [k,n] of [['bench',5],['rot',5],['pen',6]])Object.defineProperty(S,k,{value:pad(T[k],n),writable:true,configurable:true,enumerable:false})}
function syncTeam(){if(!S||!S.__ui)return;const T=S.team;T.lineup=S.lu.map(([pos,id])=>({id,pos}));T.bench=S.bench.slice();T.rot=S.rot.slice();T.pen=S.pen.slice()}
// EX 축소·철인 5~6코 한정(2026-11-24)으로 빠진 특별 카드는 같은 시즌 기본 카드로 돌려줌(라인업·잠금·스킬 블록도 옮김)
function migSpecial(S){if(!S||!S.owned)return;const R={};for(const id in S.owned)if(!byId[id]&&/·(EX|IR)$/.test(id)){const b=id.replace(/·(EX|IR)$/,'');if(byId[b]){S.owned[b]=(S.owned[b]|0)+S.owned[id];R[id]=b}delete S.owned[id]}
  if(!Object.keys(R).length)return;const T=S.team||{},f=x=>x&&R[x]?R[x]:x;T.lineup=(T.lineup||[]).map(e=>e&&typeof e==='object'?{...e,id:f(e.id)}:f(e));for(const k of ['bench','rot','pen'])T[k]=(T[k]||[]).map(f);S.locks=(S.locks||[]).map(f);(S.blocks||[]).forEach(b=>{if(b.on&&R[b.on])b.on=R[b.on]})}
function ensureUI(){if(S.__ui)return;Object.defineProperty(S,'__ui',{value:1,enumerable:false,configurable:true});
  for(const k of ['mgr','tsel'])Object.defineProperty(S,k,{get(){return this.team[k]},set(v){this.team[k]=v},enumerable:false,configurable:true});
  Object.defineProperty(S,'sup',{get(){return this.team.sup=(this.team.sup||[]).filter(x=>x.left>0)},set(v){this.team.sup=v},enumerable:false,configurable:true});
  if(typeof ECON!=='undefined')ECON.migrate(S);
  const D={locks:[],tq:{},sq:{},blocks:[],gp:{},cond:{},ab:[],abHist:{},abSt:{},abSum:{},photos:{},mat:[],sub:'order',tb:'B',pf:'all',side:'line',sort:'ovr',fteam:'all',fyear:'all',sk:'p',dexK:'all',back:false,pt:0};
  for(const k in D)if(S[k]==null)S[k]=D[k];
  migSpecial(S);
  // 2·3칸 블록 → 4칸 블록으로 바꿈 (능력치는 4칸 기준으로 다시 계산, 장착돼 있었으면 보관함으로)
  for(const b of S.blocks||[]){if(!SHAPES[b.sh]||SHAPES[b.sh].length>=4)continue;const sh=pick(SH4),ks=Object.keys(b.st||{}),pts=Math.max(1,Math.round(4*((GRADES[b.g]||{}).m||1))),st={};
   if(!ks.length)ks.push(b.t==='P'?'ctl':'con');for(let i=0;i<pts;i++){const k=ks[i%ks.length];st[k]=(st[k]||0)+1}
   b.sh=sh;b.st=st;b.rot=0;if(b.home){delete b.home}if(b.on){b.on=null;b.at=null}if(b.name)b.name=b.name.replace(/-[A-Z0-9]+형$/,'-'+sh+'형')}
  S.locks=S.locks.map(x=>{const m=/^(.*)#(\d+)$/.exec(x);return m&&!byId[x]&&byId[m[1]]?m[1]+'~'+m[2]:x}); // 예전 저장의 중복 카드 잠금('#k')을 '~k'로
  if(!MG.some(m=>m.id===S.team.mgr))S.team.mgr=MG[0].id;
  pullTeam();if(!byId[S.cardId])S.cardId=used()[0]||Object.keys(S.owned)[0]}
const statLine=c=>c.type==='B'?`타율 ${c.s[0].toFixed(3).replace(/^0/,'')} · ${c.s[1]}홈런 · ${c.s[2]}타점 · ${c.s[3]}도루 · ${c.s[4]}경기`:`평균자책 ${c.s[0].toFixed(2)} · ${c.s[1]}승 ${c.s[2]}패 · ${c.s[3]}세이브 · ${c.s[4]}홀드 · ${c.s[5]}탈삼진 · ${c.s[6]}이닝`;
// 보유 카드 목록: 같은 카드 2장 이상이면 중복분을 id#2, id#3…으로 펼침 (합성·유학 재료)
let OWN=[],OWNU=[],DUP={};
function rebuildOwn(){OWN=[];OWNU=[];DUP={};for(const id in S.owned){const c=byId[id];if(!c)continue;OWN.push(c);OWNU.push(c);for(let k=2;k<=(S.owned[id]|0);k++){const d={...c,id:id+'~'+k,dup:1};DUP[d.id]=d;OWN.push(d)}}}
const by=new Proxy({},{get:(_,k)=>typeof k==='string'?(DUP[k]||byId[k]):undefined,has:(_,k)=>!!(DUP[k]||byId[k])});
// 경기 화면용 (엔진 G)
function diamond(g){const on=i=>g.bases[i]?'on':'';return `<svg viewBox="0 -12 200 182" class="gdia" role="img" aria-label="주자 상황">
  <path d="M100 150 L30 80 L100 10 L170 80 Z" class="turf"/><circle cx="100" cy="82" r="9" class="mound"/>
  <rect x="160" y="70" width="20" height="20" transform="rotate(45 170 80)" class="base ${on(0)}"/><rect x="90" y="0" width="20" height="20" transform="rotate(45 100 10)" class="base ${on(1)}"/>
  <rect x="20" y="70" width="20" height="20" transform="rotate(45 30 80)" class="base ${on(2)}"/><path d="M92 142h16v8l-8 8-8-8z" class="plate"/></svg>`}
// 경기 MVP(SJ 2026-11-25): 이긴 팀(무승부면 양 팀)에서 타격·투구 점수 최고 1명
function gameMVP(g){if(!g||!g.bx||!g.px)return null;const sides=g.res===0||g.res===1?[g.res]:[0,1];let best=null;
  for(const s of sides){for(const b of Object.values(g.bx[s])){const v=b.h+b.hr*2+b.rbi*1.2+b.r*.8+b.bb*.4+(b.sb||0)*.6+(b.a||0)*.5-(b.e||0)*.8-b.k*.15;
      if(!best||v>best.v)best={v,s,txt:`${b.c.name} (${g.t[s].name}) · ${b.ab}타수 ${b.h}안타${b.hr?` ${b.hr}홈런`:''}${b.rbi?` ${b.rbi}타점`:''}${b.r?` ${b.r}득점`:''}${b.sb?` ${b.sb}도루`:''}`}}
    for(const p of g.px[s]){const v=p.outs/3*1.1+p.k*.4-p.r*1.4-p.h*.3-p.bb*.3+(p.outs>=27?2:0);
      if(!best||v>best.v)best={v,s,txt:`${p.c.name} (${g.t[s].name}) · ${Math.floor(p.outs/3)}${p.outs%3?'.'+p.outs%3:''}이닝 ${p.r}실점 ${p.k}탈삼진`}}}
  return best&&best.txt}
function logHTML(g){const HK=['i','r','hr','c','h','e'];let gr=[];for(const x of g.log){if(g.hl&&!HK.includes(x.k)&&!/보살|실책|저지/.test(x.txt))continue;if(x.k==='i'||!gr.length)gr.push([]);gr[gr.length-1].push(x)}if(g.hl)gr=gr.filter(a=>a.length>1||a[0].k!=='i');
  return gr.reverse().slice(0,30).map(a=>{const h=a[0].k==='i'?a[0]:null,rest=(h?a.slice(1):a).reverse();return (h?`<li class="i">${esc(h.txt)}</li>`:'')+rest.map(x=>`<li class="${x.k}">${esc(x.txt)}</li>`).join('')}).join('')}
// ===== 엔진·econ 연결 =====
const cells=cellsOf;
const BO={T:'테이블세터',C:'클린업',L:'하위 타선'},BOS={T:'테세',C:'클린',L:'하위'};
const MG=MANAGERS.map(m=>Array.isArray(m)?{id:m[0],n:m[1],st:m[2],g:m[4],sn:m[5],se:m[6],tac:Object.fromEntries(['power','steal','bunt','ph','hook','relief','ibb','shift'].map((k,i)=>[k,+m[3][i]||0]))}:{...m,tac:m.t});
const tc=id=>TC_BY[id];
const sp=id=>SUP_BY[id];
const AJ={yt:ADJ.team,ln:ADJ.line,hs:ADJ.hs,un:ADJ.un,rg:ADJ.reg};
// 덱 효과: 엔진 teamColor 결과를 시안 칩 모양으로
// 와일드카드 현황(SJ 2026-11-25): 주전 20명 중 커리어하이(CH_WILD장까지 합류)·영구결번(제한 없음). EX는 1군 등록 한도로 따로 표시
const wildTxt=cs=>{const ch=cs.filter(c=>c&&c.v==='CH').length,rn=cs.filter(c=>c&&c.v==='RN').length;return `와일드카드 커리어하이 ${Math.min(ch,CH_WILD)}/${CH_WILD}${ch>CH_WILD?` (+${ch-CH_WILD}장은 일반)`:''} · 영구결번 ${rn}`};
function deckFx(){const all=used().map(id=>byId[id]).filter(Boolean),T=teamColor(starters(S.team),S.team.fxsel,(S.bench||[]).map(id=>byId[id]).filter(Boolean));
  const fx=T.fx.map(f=>({cat:f.fam,g:f.g,n:f.name,sub:f.d,b:f.b,p:f.p,on:1,cur:1,need:1}));
  return {L:fx,fx,bat:T.bat,pit:T.pit,cost:T.cost,cnt:all.length}}
const TCOLC=FX_FAM;
// 유학: 유학지·조건은 시안 표, 비용·확률은 econ.js
const RUSH=ECON.RUSH,studyFee=ECON.studyFee,rushFee=ECON.rushFee,STUDY=ECON.STUDY,STUDY_BY=ECON.STUDY_BY,ABR=Object.fromEntries(STUDY.map(x=>[x[0],[x[3],x[4]]])),AB_CAP=20;
const dexDone=()=>Object.keys(S.dexDone||{}).filter(k=>!k.startsWith('meta')).length,lgWins=()=>Object.keys(S.lgFirst||{}).length,lgTop=()=>S.lgBest||1;
const ABU={ai5:[()=>lgTop()>=2,'주간 리그 2단계 도달'],ai3:[()=>lgTop()>=3,'주간 리그 3단계 도달'],dex5:[()=>dexDone()>=5,'도감 세트 5개 완성'],aiW:[()=>lgWins()>=1,'주간 리그 1위 1번'],
  hr:[()=>lgTop()>=4,'주간 리그 4단계 도달'],era:[()=>lgTop()>=5,'주간 리그 5단계 도달'],aiW2:[()=>lgWins()>=3,'주간 리그 1위 3번'],aiW3:[()=>lgTop()>=8,'주간 리그 8단계 도달']};
const abWhy=c=>c.v?'특수 카드는 유학 불가':'유학 불가 (25세 이하·35세 이상만)';
const dupsOf=c=>OWN.filter(x=>x.dup&&baseId(x.id)===c.id&&!isLocked(x.id));
function abRoll(a){const d=abd(a.d),c=byId[a.id],r=ECON.studyRoll(a.d,c.cost),keys=Object.keys(c.r).filter(k=>d[5].includes(k));
  let pts=Math.max(0,Math.min(Math.round(abGain(r.gain,c.cost)*potMul(c)),abCapC(c)));const st={};while(pts>0&&keys.length){const k=keys[Math.floor(Math.random()*keys.length)];st[k]=(st[k]||0)+1;pts--}return {g:r.name,st}}
function abSend(){const d=abd(S.abSel),c=byId[S.abPick];if(!c||used().includes(c.id)||!abOpen(d)||!abAge(c)||ECON.canStudy(c).err)return;
  const fee=studyFee(d[0],c.cost);if(ECON.pay(S,fee).err){S.msg='포인트 부족';return}
  S.ab.push({id:c.id,d:d[0],start:Date.now(),end:Date.now()+d[3]*36e5,res:null});S.abPick=null}
// 도감 (econ.js 세트)
const TIXN=ECON.TIX,rwText=ECON.rwText,dexHas=id=>ECON.dexHas(S,id),dexCard=id=>byId[id];
// SJ 2026-11-26: 도감 = 전체 카드 보기(전체 선수·국가대표), 모으면 보상 주는 세트는 미션 > 수집 세트(vDex('set'))로
function vDex(mode){if(!S.dexAll1){S.dexAll1=1;S.dexK='all'}const SET=mode==='set',KN=SET?{team:'팀 세트',gg:'골든글러브',ch:'커리어하이',ex:'EX',meta:'누적 목표'}:{all:'전체 선수',nat:'국가대표'},k=S.dexK in KN?S.dexK:SET?'team':'all',q=(S.dexQ||'').trim(),lim=S.dexLim||(S.dexK==='gg'?50:24),F=S.dexF||(S.dexF={y:'',t:'',st:'',h:''});
  const prog=s=>ECON.setProgress(S,s),tmOf=s=>s.kind==='team'?s.id.split('|')[1]:'',all=ECON.SETS.filter(s=>s.kind===k);
  const YS=[...new Set(all.map(s=>s.year).filter(Boolean))].sort((a,b)=>b-a),TS=[...new Set(all.map(tmOf).filter(Boolean))].sort();
  let L=all.filter(s=>(!q||s.name.includes(q))&&(!F.y||s.year===+F.y)&&(!F.t||tmOf(s)===F.t)&&(!F.st||(F.st==='done')===!!S.dexDone[s.id]));
  L=L.map(s=>({s,p:prog(s)})).sort((a,b)=>(!!S.dexDone[a.s.id])-(!!S.dexDone[b.s.id])||b.p.have/b.p.need-a.p.have/a.p.need||(b.s.year||0)-(a.s.year||0));
  const tix=Object.entries(S.tix||{}).filter(([k,n])=>n>0&&k!=='abr'),sel=(id,v,lab,opts)=>`<select id="${id}" aria-label="${lab}"><option value="">${lab}</option>${opts.map(([x,n])=>`<option value="${esc(x)}"${String(v)===String(x)?' selected':''}>${esc(n)}</option>`).join('')}</select>`,on=F.y||F.t||F.st||F.h||q;
  if(k==='all')return dexAll(KN,tix,sel,q);
  if(k==='nat')return dexNat(KN,tix,q);
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">${SET?'수집 세트':'도감'}</h2><span class="pill">완성 ${dexDone()}세트</span>${tix.map(([t,n])=>`<a href="#shop"><button class="ghost" title="카드팩 화면에서 사용">${esc(TIXN[t]||t)} ×${n}</button></a>`).join('')}</div>
  <p class="note help">한 번 얻은 카드는 계속 기록돼요. 합성 재료로 쓰거나 유학·분해로 없어져도 세트 진행은 그대로예요. 세트를 다 모으면 보상이 바로 들어와요.</p>
  <div class="subnav" role="tablist" style="margin-top:12px">${Object.entries(KN).map(([x,n])=>`<button role="tab" aria-selected="${k===x}" class="${k===x?'on':''}" data-dexk="${x}">${n}</button>`).join('')}</div>
  ${k!=='meta'?`<div class="dexf">${dexHV(F)}<input id="dexq" value="${esc(q)}" placeholder="이름 검색" aria-label="세트 검색">${on?'<button class="ghost" data-a="dexclr">필터 초기화</button>':''}<span class="note" style="margin:0">${L.length}세트</span></div>${dexFD([F.y,F.t,F.st].filter(Boolean).length,`${YS.length?sel('dexy',F.y,'전체 연도',YS.map(y=>[y,y+'년'])):''}${TS.length?sel('dext',F.t,'전체 구단',TS.map(t=>[t,t])):''}${sel('dexst',F.st,'전체 세트',[['todo','미완성 세트'],['done','완성 세트']])}`)}`:''}
  <div class="dexl">${L.slice(0,lim).map(({s,p})=>{const done=!!S.dexDone[s.id],ids=(s.ids||[]).filter(id=>!F.h||(F.h==='have')===!!dexHas(id));if(s.ids&&!ids.length)return '';
   return `<div class="dexs${done?' done':''}"><div class="dexh"><b>${esc(s.name)}</b><span class="pill">${p.have}/${p.need}</span><span class="dexrw">${esc(rwText(s.rw))}</span>${done?'<span class="pill dexok">완성 · 지급됨</span>':''}</div>
   <span class="abbar"><i style="width:${p.have/p.need*100}%"></i></span>
   ${s.ids?`<div class="dexg">${ids.map(id=>{const c=dexCard(id),h=dexHas(id);if(!c)return '';return `<div class="dexc${h?'':' no'}" ${S.owned[id]?`data-pick="${esc(id)}"`:`data-dexv="${esc(id)}"`} role="button" tabindex="0" title="${esc(c.name)} ${c.year}${h?'':' · 아직 없음'}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}${c.v?`<i class="ovb v-${c.v}">${c.v==='IR'||c.v==='RY'?vnm(c):c.v}</i>`:''}</span><small>${String(c.year).slice(2)}' ${esc(c.name)}</small></div>`}).join('')}</div>`:''}</div>`}).join('')||'<p class="note">해당 세트 없음</p>'}</div>
  ${L.length>lim?`<div class="tools" style="justify-content:center;margin-top:12px"><button class="ghost" data-a="dexmore">더 보기 (${L.length-lim})</button></div>`:''}</section>`}
const dexHV=F=>`<span class="hvt" role="group" aria-label="보유 여부"><button class="ghost${F.h!=='miss'?' on':''}" data-a="dexhv" data-v="have" aria-pressed="${F.h!=='miss'}">보유</button><button class="ghost${F.h!=='have'?' on':''}" data-a="dexhv" data-v="miss" aria-pressed="${F.h!=='have'}">미보유</button></span>`,dexFD=(n,inner)=>`<details class="dexfd"${S.dexFOpen?' open':''}><summary>필터${n?` · ${n}개 적용 중`:''}</summary><div class="dexf">${inner}</div></details>`;
const dexCell=c=>{const h=dexHas(c.id);return `<div class="dexc${h?'':' no'}" ${S.owned[c.id]?`data-pick="${esc(c.id)}"`:`data-dexv="${esc(c.id)}"`} role="button" tabindex="0" title="${esc(c.name)} ${c.year} ${esc(c.team)}${h?'':' · 아직 없음'}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}${c.v?`<i class="ovb v-${c.v}">${c.v==='IR'||c.v==='RY'?vnm(c):c.v}</i>`:''}</span><small>${String(c.year).slice(2)}' ${esc(c.name)}</small></div>`};
// 도감 · 국가대표(SJ 2026-11-26): 대회별 명단(ECON.NATS)을 세트처럼 보여 줌. 멤버 전원 보유 시 보상은 미션과 같음(natCheck)
function dexNat(KN,tix,q){const N=ECON.NATS||[],F=S.dexF||{},fin=N.filter(n=>ECON.natProg(S,n).done).length;
  const L=N.filter(n=>!q||n.name.includes(q)||n.mem.some(m=>m.e.split('@')[0].includes(q)));
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">도감</h2><span class="pill">국가대표 완성 ${fin}/${N.length}</span></div>
  <div class="subnav" role="tablist" style="margin-top:12px">${Object.entries(KN).map(([x,n])=>`<button role="tab" aria-selected="${x==='nat'}" class="${x==='nat'?'on':''}" data-dexk="${x}">${n}</button>`).join('')}</div>
  <div class="dexf">${dexHV(F)}<input id="dexq" value="${esc(q)}" placeholder="대회·선수 이름" aria-label="국가대표 검색"><span class="note" style="margin:0">${L.length}개 대회</span></div>
  <div class="dexl">${L.map(n=>{const p=ECON.natProg(S,n),mem=n.mem.filter(m=>{const h=m.ids.some(id=>dexHas(id));return !F.h||(F.h==='have')===h});
   return `<div class="dexs${p.done?' done':''}"><div class="dexh"><b>${esc(n.name.replace(/ 멤버 모으기$/,''))}</b><span class="pill">${p.have}/${p.need}</span><span class="dexrw">${esc(rwText(n.rw))}${n.nt&&n.nt.length?` + 국가대표 카드 ${n.nt.length}장`:''}</span>${p.done?'<span class="pill dexok">완성 · 지급됨</span>':''}</div>
   <span class="abbar"><i style="width:${p.have/Math.max(1,p.need)*100}%"></i></span>
   <div class="dexg">${mem.map(m=>{const own=m.ids.find(id=>(S.owned[id]|0)>0),c=byId[own||m.ids.find(id=>dexHas(id))||m.ids[0]];return c?dexCell(c):''}).join('')||'<p class="note">해당 선수 없음</p>'}</div></div>`}).join('')||'<p class="note">해당 대회 없음</p>'}</div></section>`}
let DEXYS=null;
function dexAll(KN,tix,sel,q){const F=S.dexF,lim=S.dexLim||60;DEXYS=DEXYS||[...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a);
  const TS=[...new Set(CARDS.filter(c=>!F.y||c.year===+F.y).map(c=>c.team))].sort(),VK=[['n','일반 카드'],...Object.entries(VN),['nat','국가대표']],NATID=F.v==='nat'?new Set((ECON.NATS||[]).flatMap(n=>n.mem.flatMap(m=>m.ids))):null;
  const L=CARDS.filter(c=>(!F.y||c.year===+F.y)&&(!F.t||c.team===F.t)&&(!F.p||(F.p==='P'?['SP','RP'].includes(c.pos):F.p==='B'?!['SP','RP'].includes(c.pos):c.pos===F.p))&&(!F.v||(F.v==='nat'?NATID.has(c.id):F.v==='n'?!c.v:c.v===F.v))&&(!F.h||(F.h==='have')===!!dexHas(c.id))&&(!q||c.name.includes(q)));
  const have=L.filter(c=>dexHas(c.id)).length,on=F.y||F.t||F.p||F.v||F.h||q;
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">도감</h2><span class="pill">완성 ${dexDone()}세트</span>${tix.map(([t,n])=>`<a href="#shop"><button class="ghost" title="카드팩 화면에서 사용">${esc(TIXN[t]||t)} ×${n}</button></a>`).join('')}</div>
  <div class="subnav" role="tablist" style="margin-top:12px">${Object.entries(KN).map(([x,n])=>`<button role="tab" aria-selected="${x==='all'}" class="${x==='all'?'on':''}" data-dexk="${x}">${n}</button>`).join('')}</div>
  <div class="dexf">${dexHV(F)}<input id="dexq" value="${esc(q)}" placeholder="선수 이름" aria-label="선수 검색">${on?'<button class="ghost" data-a="dexclr">필터 초기화</button>':''}<span class="note" style="margin:0">${L.length.toLocaleString()}장 · 모음 ${have.toLocaleString()}</span></div>${dexFD([F.y,F.t,F.p,F.v].filter(Boolean).length,`${sel('dexy',F.y,'전체 연도',DEXYS.map(y=>[y,y+'년']))}${sel('dext',F.t,'전체 구단',TS.map(t=>[t,t]))}${sel('dexp',F.p,'전체 포지션',[['P','투수 전체'],['B','타자 전체'],...Object.entries(PFULL)])}${sel('dexv',F.v,'전체 종류',VK)}`)}
  <div class="dexg dexall">${L.slice(0,lim).map(dexCell).join('')||'<p class="note">해당 선수 없음</p>'}</div>
  ${L.length>lim?`<div class="tools" style="justify-content:center;margin-top:12px"><button class="ghost" data-a="dexmore">더 보기 (${(L.length-lim).toLocaleString()})</button></div>`:''}</section>`}
// 카드팩·확정권 (econ.js)
const PACKS=ECON.PACKS.map(p=>[p.k,p.n,p.p,p.d.replace('최대 3개','3개')]);
let LINES=[],YEARS=[];
const YEARS_OF=l=>[...new Set(CARDS.filter(c=>c.line===l&&!c.v).map(c=>c.year))].sort((a,b)=>a-b);
const TEAMS_OF=y=>[...new Set(CARDS.filter(c=>c.year===+y).map(c=>c.team))].sort();
function pityHTML(k,sm){const PT=(ECON.PITY||{})[k];if(!PT)return '';const N=typeof PT==='number'?PT:PT.n,lab=typeof PT==='number'?(k==='p'?'레전드(9+)':'확정'):(PT.label||'확정'),n=Math.min(N,(((S.pity||{})[k])|0)),left=N-n;return `<div class="pity${sm?' sm':''}" title="${esc(lab)} 천장 ${n}/${N}"><span class="pbar" style="--n:${N}">${Array.from({length:N},(_,i)=>`<i class="${i<n?'on':''}${i===N-1?' last':''}"></i>`).join('')}</span><small>천장 ${n}/${N} · ${left<=1?'다음 팩 확정':`${left}팩 뒤 확정`}</small></div>`}
function pkOutHTML(){const o=S.pkOut;if(!o)return '';
  return `<div class="box" style="margin-top:14px"><h3 style="margin-top:0">개봉 결과</h3>${o.cards?(S.work?`<div class="scroll"><table class="tbl lul"><thead><tr><th>#</th><th class="l">선수</th><th>연도·구단</th><th>포지션</th><th>능력</th><th>코스트</th><th>종류</th><th>보유</th></tr></thead><tbody>${o.cards.map((c,i)=>`<tr role="button" tabindex="0" data-pick="${esc(c.id)}"><td>${i+1}</td><td class="l">${esc(c.name)}</td><td>${c.year} ${esc(c.team)}</td><td>${PFULL[c.pos]||c.pos}</td><td>${c.ovr}</td><td>${c.cost}</td><td>${c.v?esc(vnm(c)||c.v):'일반'}</td><td>${(S.owned[baseId(c.id)]|0)>1?'중복':'신규'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="pool">${o.cards.map(c=>card(c,{pick:1})).join('')}</div>`):''}${o.text?`<p>${esc(o.text)}</p>`:''}${o.dex&&o.dex.length?`<p class="note" style="color:var(--gold)">도감 완성: ${o.dex.map(s=>esc(s.name)+' ('+esc(rwText(s.rw))+')').join(', ')}</p>`:''}</div>`}
const SHOPX=['b','tc','t1','sp'],SHOPC={shop:{n:'선수 카드팩'},shop_sp:{n:'서포트 카드',ks:['sp']},shop_tc:{n:'작전 카드',ks:['tc','t1']},shop_b:{n:'스킬 블록',ks:['b']}};
function vShop(){const SC=SHOPC[view()]||SHOPC.shop,PK=PACKS.filter(x=>SC.ks?SC.ks.includes(x[0]):!SHOPX.includes(x[0]));if(!PK.some(x=>x[0]===S.pk)){S.pk=PK[0][0];S.pkOut=null;S.pkMsg=''}const pk=S.pk,P=PACKS.find(x=>x[0]===pk)||PACKS[0],pick=S.pkSel||(S.pkSel={t:LINES.slice(0,3),y:YEARS.slice(0,3),tl:LINES[0],ty:{line:LINES[0],years:[]}}),_fix=((!pick.ty||!pick.ty.years)&&(pick.ty={line:LINES[0],years:[]}),pick.tl||(pick.tl=LINES[0])),multi=pk==='t'||pk==='y',sel=multi?pick[pk]:[],ok=(!multi||sel.length===3)&&(pk!=='ty'||pick.ty.years.length===3),afford=S.pt>=P[2];
  const tix=Object.entries(S.tix||{}).filter(([k,n])=>n>0&&k!=='abr'),legends=tix.some(([k])=>k==='pick')?CARDS.filter(c=>c.cost>=9).sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.year-b.year):[];
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">${SC.n}</h2><span class="pill">${S.pt.toLocaleString()} P</span></div>
  <div class="pkm"><select id="pksel" aria-label="카드팩 고르기">${PK.map(([k,n,p])=>`<option value="${k}"${k===pk?' selected':''}>${esc(n)} · ${p.toLocaleString()}P</option>`).join('')}</select></div>
  <div class="shop"><div class="pkl">${PK.map(([k,n,p,d])=>`<button class="pkb${k===pk?' on':''}" data-pk="${k}"><b>${n}</b><em>${p.toLocaleString()}P</em><small>${d}</small>${pityHTML(k,1)}</button>`).join('')}</div>
  <div class="box"><h3 style="margin-top:0">${P[1]} <small style="color:var(--gold)">${P[2].toLocaleString()}P</small></h3><p class="note" style="margin-top:0">${P[3]}</p>${pityHTML(pk)}
  ${multi?`<div class="lbl">${pk==='t'?'구단 계보':'연도'} 3개 고르기 <small>(${sel.length}/3)</small></div><div class="chips">${(pk==='t'?LINES:YEARS).map(v=>{const on=sel.includes(v),full=!on&&sel.length>=3;return `<button class="chip${on?' on':''}" data-pkv="${v}" aria-pressed="${on}" ${full?'disabled':''}>${pk==='t'?esc(lname(v)):v}</button>`}).join('')}</div>`:''}
  ${pk==='tl'||pk==='ty'?`<div class="tools"><select id="${pk==='tl'?'tll':'tyl'}" aria-label="구단 계보">${LINES.map(l=>`<option value="${esc(l)}" ${(pk==='tl'?pick.tl:pick.ty.line)===l?'selected':''}>${esc(lname(l))}</option>`).join('')}</select></div>`:''}
  ${pk==='ty'?(()=>{const ys=YEARS_OF(pick.ty.line),a=pick.ty.years;return `<div class="lbl">연도 3개 고르기 <small>(${a.length}/3)</small></div><div class="chips">${ys.map(v=>{const on=a.includes(v),full=!on&&a.length>=3;return `<button class="chip${on?' on':''}" data-pkv="${v}" aria-pressed="${on}" ${full?'disabled':''}>${v}</button>`}).join('')}</div>`})():''}
  <div class="tools" style="margin-top:12px"><button data-a="pkbuy" data-hk="1" ${ok&&afford?'':'disabled'}>${P[2].toLocaleString()}P로 열기 <kbd class="kb">R</kbd></button>${multi&&sel.length<3?`<span class="note">${3-sel.length}개 더 선택</span>`:''}${!afford?'<span class="note" style="color:var(--bad)">포인트 부족</span>':''}${S.pkMsg?`<span class="note">${esc(S.pkMsg)}</span>`:''}</div>
  ${pkOutHTML()}<!-- 개봉 결과는 열기 버튼 바로 아래(오른쪽 상자)에: 목록 아래에 두면 화면 밖이라 안 보임 -->
  ${tix.length?`<div class="lbl" style="margin-top:16px">확정권</div><div class="tools">${tix.map(([k,n])=>`<button class="ghost" data-tix="${k}">${esc(TIXN[k]||k)} ×${n}</button>${k.startsWith('pk_')&&n>1?`<button class="ghost" data-tix="${k}" data-tixall="1">${n}개 전부 열기</button>`:''}`).join('')}
   ${tix.filter(([k])=>k==='gg'||k==='ch'||k==='ex').map(([k])=>{const v=k==='gg'?'GG':k==='ch'?'CH':'EX',o=k==='ex'?[...new Set(CARDS.filter(c=>c.v==='EX').map(c=>c.line))].sort():[...new Set(CARDS.filter(c=>c.v===v).map(c=>c.year))].sort((a,b)=>b-a);return o.length?`<select id="tixarg-${k}" aria-label="${esc(TIXN[k]||k)} 조건"><option value="">${k==='ex'?'구단':'연도'} 무작위</option>${o.map(x=>`<option value="${esc(x)}"${String((S.tixArg||{})[k]||'')===String(x)?' selected':''}>${k==='ex'?esc(msLn(x)):x}</option>`).join('')}</select>`:''}).join('')}
   ${legends.length?`<select id="tixpick" aria-label="레전드 선택권으로 받을 카드">${legends.map(c=>`<option value="${esc(c.id)}"${S.tixPick===c.id?' selected':''}>${esc(c.name)} ${c.year} ${esc(c.team)}${c.v?' '+vnm(c):''}</option>`).join('')}</select>`:''}</div>`:''}
  </div></div></section>`}
function shopAct(D){if(D.pk){S.pk=D.pk;S.pkMsg='';S.pkOut=null;return 1}
  if(D.pkv){const k=S.pk,v=k==='y'||k==='ty'?+D.pkv:D.pkv,a=k==='ty'?S.pkSel.ty.years:S.pkSel[k],i=a.indexOf(v);if(i>=0)a.splice(i,1);else if(a.length<3)a.push(v);return 1}
  if(D.tix&&String(D.tix).startsWith('pk_')){const k=D.tix,pk=k.slice(3),P=PACKS.find(x=>x[0]===pk),n=D.tixall?(S.tix[k]|0):1,cards=[],txt=[],dex=[],o=S.pk;S.pkOut=null;S.pkMsg='';if(!P)return 1;
    for(let i=0;i<n&&(S.tix[k]|0)>0;i++){S.tix[k]--;S.pt+=P[2];S.pk=pk;shopAct({a:'pkbuy'});const r=S.pkOut;if(S.pkMsg){S.tix[k]++;S.pt-=P[2];break}if(r){if(r.cards)cards.push(...r.cards);if(r.dex)dex.push(...[].concat(r.dex));if(r.text)txt.push(r.text)}S.pkOut=null}
    S.pk=o;S.pkOut=cards.length?{cards,dex}:txt.length?{text:txt.join(' / ')}:null;return 1}
  if(D.tix){const k=D.tix;S.pkOut=null;
    if(k==='prem'){S.tix.prem--;S.pt+=1800;const r=ECON.buyCards(S,CARDS,'p');if(r.err){S.tix.prem++;S.pt-=1800;S.pkMsg=r.err}else S.pkOut={cards:r.cards,dex:r.dex}}
    else if(k==='block'){S.tix.block--;const g=ECON.blockGrades(3);if(!g.some(x=>x==='A'||x==='S'))g[2]='A';S.pkOut={text:'블록: '+g.map(x=>{const b=gainBlock(null,x);return `${x}급 ${bname(b)}`}).join(', ')}}
    else{const arg=k==='pick'?(document.getElementById('tixpick')||{}).value:['gg','ch','ex'].includes(k)?((document.getElementById('tixarg-'+k)||{}).value||undefined):undefined,r=ECON.useTicket(S,CARDS,k,arg);if(r.err)S.pkMsg=r.err;else S.pkOut={cards:r.cards,dex:r.dex}}
    return 1}
  if(D.a==='pkbuy'){const k=S.pk||'n',P=PACKS.find(x=>x[0]===k);S.pkMsg='';S.pkOut=null;
    if(['n','p','t','y','tl','ty','sx','c1'].includes(k)){const r=ECON.buyCards(S,CARDS,k,{lines:S.pkSel.t,years:S.pkSel.y,line:k==='tl'?S.pkSel.tl:S.pkSel.ty.line,tyYears:S.pkSel.ty.years});if(r.err){S.pkMsg=r.err;return 1}S.pkOut={cards:r.cards,dex:r.dex}}
    else{if(ECON.pay(S,P[2]).err){S.pkMsg='포인트 부족';return 1}
      if(k==='b')S.pkOut={text:'블록: '+(gs=>{if(ECON.pityTick(S,'b',gs.includes('S')))gs[gs.length-1]='S';return gs})(ECON.blockGrades(3)).map(g=>{const b=gainBlock(null,g);return `${g}급 ${b.t==='B'?'타자':'투수'}용 ${bname(b)}`}).join(', ')};
      else if(k==='tc'||k==='t1'){const gs=k==='tc'?ECON.tcGrades(3):[(u=>u<.05?'황금':u<.25?'특수':'일반')(Math.random())];if(ECON.pityTick(S,k,gs.includes('황금')))gs[gs.length-1]='황금';S.pkOut={text:'작전 카드: '+gs.map(g=>{const x=pick(TCARDS.filter(t=>t[3]===g));S.tq[x[0]]=(S.tq[x[0]]||0)+1;return `${x[1]}(${g})`}).join(', ')}}
      else if(k==='sp'){const xs=[0,1,2].map(()=>pick(SUPS.filter(t=>!t[0].endsWith('+'))));if(ECON.pityTick(S,'sp',false)){const up=SUPS.filter(t=>t[0].endsWith('+')),j=xs.length-1,u=up.find(t=>t[0]===xs[j][0]+'+')||(up.length?pick(up):null);if(u)xs[j]=u}S.pkOut={text:'서포트 카드: '+xs.map(x=>{S.sq[x[0]]=(S.sq[x[0]]||0)+1;return x[1]}).join(', ')}}}
    ECON.mission(S,'p1');return 1}
  return 0}
// 합성 (엔진 synth)
function doSynth(){const k=S.sk||'p',pool=synPool(k),m=pool.filter(x=>S.mat.includes(x.key));if(synCheck(k,m))return;let out='';
  const mats=k==='p'?m.map(x=>x.c.id):k==='b'?m.map(x=>x.b):m.map(x=>x.x[0]);const r=synth(k,mats,k==='p'?S.locks:S.locks.filter(x=>!/~\d+$/.test(x)),{ex:k==='p'?(S.synEx||[]):[]});if(r.err){S.msg=r.err;return}
  if(k==='p'){const ids=new Set(m.map(x=>x.c.id)),back=S.blocks.filter(b=>ids.has(b.on)).length;S.blocks=S.blocks.filter(b=>!ids.has(b.on));
    for(const x of m){const id=baseId(x.c.id);S.owned[id]=(S.owned[id]|0)-1;if(S.owned[id]<=0){delete S.owned[id];S.blocks=S.blocks.filter(b=>b.on!==id)}}
    S.locks=S.locks.filter(x=>!ids.has(x));
    // 중복 카드는 서로 같은 카드라, 남은 장수에 맞춰 잠금 수를 앞 번호부터 다시 매김(잠근 장은 남고 안 잠근 장이 재료로 쓰임)
    for(const id of new Set(m.map(x=>baseId(x.c.id)))){const re=new RegExp('^'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(~\\d+)?$'),n=S.locks.filter(x=>re.test(x)).length,have=S.owned[id]|0;S.locks=S.locks.filter(x=>!re.test(x));for(let i=1;i<=Math.min(n,have);i++)S.locks.push(i===1?id:id+'~'+i)}
    const got=r.out;ECON.gain(S,[got]);revQueue([got]);const c=byId[got];out=card(c,{})+`<small>코스트 ${r.cost} 선수 획득${r.rules&&r.rules.length?' · '+esc(r.rules.join(' · ')):''}${back?` · 끼워 둔 스킬 블록 ${back}개도 사라짐`:''}</small>`}
  else if(k==='b'){const us=new Set(m.map(x=>x.b.u));S.blocks=S.blocks.filter(b=>!us.has(b.u));S.blocks.push(r.out);out=`<b>${r.out.g}등급 · ${esc(bname(r.out))}</b><small>${Object.entries(r.out.st).map(([x,v])=>SKN[x]+'+'+v).join(' ')}</small>`}
  else if(k==='s'){const id=m[0].x[0];S.sq[id]-=3;S.sq[r.out]=(S.sq[r.out]||0)+1;const x=SUP_BY[r.out];out=`<b>${esc(x[1])}</b><small>${esc(x[3])} · ${x[4]}경기</small>`}
  else{for(const x of m)S.tq[x.x[0]]--;S.tq[r.out]=(S.tq[r.out]||0)+1;if(S.tsel&&!(S.tq[S.tsel]>0))S.tsel=null;const x=TC_BY[r.out];out=tcard(x,{})+`<small>${r.grade} 작전 카드</small>`}
  S.synRes=out;S.mat=[]}
// 홈: 출석·미션·쿠폰·내 팀 요약
// 리그 감독실(SJ 2026-11-26, OOTP Manager's Office 참고): 주간·연도별 리그 화면 첫머리. 3×2 판 · 칸 높이 고정(노트북 한 화면) · 폰은 묶음 버튼으로 전환
function ofNav(key,G){const o=S['ofTab_'+key]||G[0][0];return `<nav class="ofnav" aria-label="화면 묶음">${G.map(([k,n])=>`<button class="${k===o?'on':''}" data-a="oft" data-g="${key}" data-k="${k}"${k===o?' aria-current="true"':''}>${n}</button>`).join('')}</nav>`}
function ofGrid(key,G,P){const o=S['ofTab_'+key]||G[0][0];return `<div class="ofg">${ofNav(key,G)}${P.map(([g,t,b,cls])=>`<div class="ofp${cls?' '+cls:''}${g===o?'':' off'}"><h3>${t}</h3><div class="ofb">${b}</div></div>`).join('')}</div>`}
function ofcHTML(L,cfg){if(!L||!L.teams)return '';cfg=cfg||{};const f3=v=>v.toFixed(3).replace(/^0/,'');
 const G=(L.gl||[]),g=G[G.length-1],R=lgStand(L),me=R.findIndex(x=>x.i===0)+1,top=R[0],gb=x=>(((top.w-x.w)+(x.l-top.l))/2),my=R.find(x=>x.i===0)||{};
 let last='<p class="note">아직 경기 없음</p>';if(g){const mi=g.a===0?0:1,w=g.sc[mi]>g.sc[1-mi]?'W':g.sc[mi]<g.sc[1-mi]?'L':'D',n=Math.max(9,g.ln[0].length),mvp=(g.hl||[]).find(x=>/^경기 MVP/.test(x));
  last=`<div class="ofres ${w}"><b>${w==='W'?'승리':w==='L'?'패배':'무승부'}</b><span>${typeof g.n==='number'?g.n+'경기':esc(g.n)} · ${esc(tname(g.a,L))} ${g.sc[0]} : ${g.sc[1]} ${esc(tname(g.h,L))}</span></div>
  <div class="scroll"><table class="tbl ls ofls"><thead><tr><th class="l"></th>${Array.from({length:n},(_,i)=>`<th>${i+1}</th>`).join('')}<th>R</th><th>H</th></tr></thead><tbody>${[0,1].map(k=>`<tr class="${(k?g.h:g.a)===0?'me':''}"><td class="l">${esc(tname(k?g.h:g.a,L))}</td>${Array.from({length:n},(_,i)=>`<td>${g.ln[k][i]??''}</td>`).join('')}<td><b>${g.sc[k]}</b></td><td>${g.ht[k]}</td></tr>`).join('')}</tbody></table></div>${mvp?`<p class="note" style="margin:6px 0 0">${esc(mvp)}</p>`:''}`}
 const pr=L.over||L.done?null:curPair(L);let next=cfg.idle||`<p class="note">${L.over||L.done?`리그 종료 · ${me}위`:'다음 경기 없음'}</p>`;
 if(pr){const oi=pr[0]===0?pr[1]:pr[0],A=teamOf(pr[0],L),H=teamOf(pr[1],L),spA=byId[fatSP(A,fatPrev(L,pr[0],A))],spH=byId[fatSP(H,fatPrev(L,pr[1],H))],mySp=pr[0]===0?spA:spH,opSp=pr[0]===0?spH:spA,o=R.find(x=>x.i===oi),ok=!validate().length;
  next=`<table class="oft"><tr><td>상대</td><td><b>${pr[0]===0?'@ ':'vs '}${esc(tname(oi,L))}</b> <small>${o?`${o.w}승 ${o.l}패 · ${R.indexOf(o)+1}위`:''}</small></td></tr><tr><td>선발</td><td>${mySp?esc(mySp.name):'-'} <small>vs</small> ${opSp?esc(opSp.name):'-'}</td></tr><tr><td>진행</td><td>${cfg.prog||`${L.round+1}/${L.sched.length}경기`}</td></tr></table>
  <div class="tools" style="margin-top:8px"><button class="playb" data-hk="1" data-a="${cfg.start||'start'}" ${ok?'':'disabled'}>▶ ${cfg.startN||'경기 시작'}</button><button class="ghost" data-hk="2" data-a="${cfg.auto||'auto'}" ${ok?'':'disabled'}>결과만 보기</button>${ok?'':'<a href="#lineup" class="note">라인업 먼저</a>'}</div>`}
 const P=Object.values(L.ps||{}).filter(r=>r.t===0),nm=r=>esc((byId[baseId(r.id)]||{}).name||'?'),gp=Math.max(1,my.g||1);
 const ld=(t,arr,fmt)=>arr.length?`<tr><td>${t}</td><td><b>${nm(arr[0])}</b></td><td class="v">${fmt(arr[0])}</td><td class="n2">${arr[1]?nm(arr[1])+' '+fmt(arr[1]):''}</td></tr>`:'';
 const B=P.filter(r=>r.ab>0),Pi=P.filter(r=>r.outs>0),qa=B.filter(r=>r.ab+r.bb>=gp*2),qe=Pi.filter(r=>r.outs>=gp*2);
 const lead=P.length?`<table class="ofldt">${[ld('타율',qa.slice().sort((a,b)=>b.h/b.ab-a.h/a.ab),r=>f3(r.h/r.ab)),ld('홈런',B.filter(r=>r.hr).sort((a,b)=>b.hr-a.hr),r=>r.hr),ld('타점',B.filter(r=>r.rbi).sort((a,b)=>b.rbi-a.rbi),r=>r.rbi),ld('도루',B.filter(r=>r.sb).sort((a,b)=>b.sb-a.sb),r=>r.sb),ld('평균자책',qe.slice().sort((a,b)=>a.er/a.outs-b.er/b.outs),r=>(r.er*27/r.outs).toFixed(2)),ld('승',Pi.filter(r=>r.w).sort((a,b)=>b.w-a.w),r=>r.w),ld('탈삼진',Pi.filter(r=>r.so).sort((a,b)=>b.so-a.so),r=>r.so),ld('세이브',Pi.filter(r=>r.sv).sort((a,b)=>b.sv-a.sv),r=>r.sv)].join('')}</table>`:'<p class="note">이번 시즌 기록 없음</p>';
 const stand=`<table class="tbl ofst"><thead><tr><th></th><th class="l">구단</th><th>승</th><th>패</th><th>승률</th><th>차</th></tr></thead><tbody>${R.map((x,k)=>`<tr class="${x.i===0?'me':''}"><td>${k+1}</td><td class="l"><i class="dot" style="background:${x.i===0?'var(--clay)':L.teams[x.i].color}"></i>${tvLink(x.i,L)}</td><td>${x.w}</td><td>${x.l}</td><td>${x.w+x.l?f3(x.pct):'-'}</td><td>${k?gb(x).toFixed(1):'-'}</td></tr>`).join('')}</tbody></table>`;
 const rec5={};for(const x of G.slice(-5)){const si=x.a===0?0:x.h===0?1:-1;if(si<0||!x.bx)continue;for(const b of x.bx[si]){const o=rec5[b[0]]=rec5[b[0]]||{n:b[0],ab:0,h:0,hr:0};o.ab+=b[2];o.h+=b[3];o.hr+=b[4]}}
 const R5=Object.values(rec5).filter(o=>o.ab>=3),hot=R5.slice().sort((a,b)=>b.h/b.ab-a.h/a.ab||b.hr-a.hr).slice(0,3),cold=R5.slice().sort((a,b)=>a.h/a.ab-b.h/b.ab).filter(o=>!hot.includes(o)).slice(0,3);
 const regs=[...new Set([...S.lu.map(x=>x[1]),...S.bench,...S.rot,...S.pen].filter(Boolean))].map(id=>byId[id]).filter(Boolean),cHot=regs.filter(c=>condOf(c)>=5).slice(0,3),cCold=regs.filter(c=>condOf(c)<=1).slice(0,3);
 const hc=(t,cls,arr,ca)=>`<div class="ofhc ${cls}"><b>${t}</b>${arr.map(o=>`<span>${esc(o.n)}${o.hr?` <small>${o.hr}홈런</small>`:''} <em>${f3(o.h/o.ab)}</em></span>`).join('')||'<span class="note">-</span>'}${ca.length?`<small class="note">컨디션 ${cls==='hot'?'최상':'최악'}: ${ca.map(c=>esc(c.name)).join(', ')}</small>`:''}</div>`;
 const hotcold=R5.length||cHot.length||cCold.length?`<div class="ofhc2">${hc('🔥 Hot','hot',hot,cHot)+hc('🧊 Cold','cold',cold,cCold)}</div>`:'<p class="note">최근 경기 기록이 쌓이면 보여요</p>';
 const key=cfg.key||'lg';
 return `<section class="ofc"><div class="ofhead"><h2>${esc(cfg.title||'감독실')}</h2><span class="pill">${cfg.pill?cfg.pill+' · ':''}${me}위 · ${my.w||0}승 ${my.l||0}패</span>${cfg.right||''}</div>
 ${ofGrid(key,[['g','경기'],['r','기록'],['s','순위']],[['g','최근 경기',last],['g','다음 경기',next],['r','기록 순위 <small>우리 팀 1·2위</small>',lead],['s','순위',stand],['r','Hot &amp; Cold <small>최근 5경기</small>',hotcold],['s',cfg.sixT||'리그 진행',cfg.six||'']])}</section>`}
// 메인 홈(SJ 2026-11-26): 어느 모드를 할지 모르니 덱·미션·리그 현황만. 리그별 감독실은 각 리그 화면에
function vHome(){const d=deckFx(),m=MG.find(x=>x.id===S.mgr),s=S.season,D=S.daily||{},e=validate(),Y=S.yl,f3=v=>v.toFixed(3).replace(/^0/,'');
  const mis=(ECON.DAILY.missions||[]).map(([id,n,need,pt])=>{const have=Math.min(need,(D.m||{})[id]|0),got=(D.got||{})[id];return `<div class="mis${got?' done':''}"><b>${esc(n)}</b><span class="pill">${have}/${need}</span><small>${pt}P${got?' · 받음':''}</small></div>`}).join('');
  const lu=(S.lu||[]).map((x,i)=>{const c=byId[x[1]];return `<tr><td>${i+1}</td><td class="ps">${esc(x[0]||'')}</td><td class="l">${c?esc(c.name):'<span class="note">빈칸</span>'}</td><td class="v">${c?c.ovr:''}</td></tr>`}).join('');
  const rot=(S.rot||[]).map((id,i)=>{const c=byId[id];return `<tr><td>${i+1}</td><td class="ps">SP</td><td class="l">${c?esc(c.name):'<span class="note">빈칸</span>'}</td><td class="v">${c?c.ovr:''}</td></tr>`}).join('');
  const deck=`<div class="ofdk"><table class="ofldt"><tbody>${lu}</tbody></table><table class="ofldt"><tbody>${rot}${(S.pen||[]).filter(Boolean).length?`<tr><td></td><td class="ps">RP</td><td class="l" colspan="2">불펜 ${(S.pen||[]).filter(Boolean).length}명</td></tr>`:''}</tbody></table></div>`;
  const club=`${e.length?`<p class="note" style="color:var(--bad);margin:0 0 6px">라인업 미완성: ${esc(e[0])} · <a href="#lineup">고치기</a></p>`:''}<table class="oft"><tr><td>구단</td><td><b>${esc(S.team.name)}</b></td></tr><tr><td>감독</td><td>${m?`${esc(m.n)} <small>${MSTY[m.st]} · ${esc(m.sn)}</small>`:'없음'}</td></tr><tr><td>팀컬러</td><td>${d.fx.map(x=>`${esc(x.n)} ${x.g}`).join(' · ')||'없음'} <small>야수 +${d.bat} · 투수 +${d.pit}</small></td></tr><tr><td>코스트</td><td>${d.cost} / ${COST_CAP}</td></tr></table>
  <div class="quick" style="margin-top:8px"><a href="#lineup"><button class="ghost" style="width:100%">라인업</button></a><a href="#builder"><button class="ghost" style="width:100%">덱</button></a></div>`;
  const miss=`${FBMODE()&&!ON.user?`<p class="note" style="margin:0 0 6px">게스트 플레이 중. 이 기기에만 저장. <button class="ghost" data-a="o-login">Google로 로그인</button></p>`:''}<p style="margin:0 0 6px">출석 <b>${D.streak||1}일째</b> <small class="note">7일마다 프리미엄 팩 확정권</small></p><div class="miss">${mis}</div><a href="#mission" class="note">미션 전체 보기 →</a>`;
  const sR=s&&s.teams?lgStand(s):[],sMe=sR.findIndex(x=>x.i===0)+1,sMy=sR.find(x=>x.i===0)||{},yR=Y&&Y.teams?lgStand(Y):[],yMe=yR.findIndex(x=>x.i===0)+1,yMy=yR.find(x=>x.i===0)||{};
  const lgs=`<a class="ofli" href="#season"><b>주간 리그</b><span>${s&&s.teams?`${esc(tierName(s.tier))} · ${sMe}위 · ${sMy.w||0}승 ${sMy.l||0}패 · ${s.over?'이번 주 종료':`${Math.min(s.round+1,s.sched.length)}/${s.sched.length}경기`}`:'시작 전'}</span></a>
  <a class="ofli" href="#years"><b>연도별 리그</b><span>${Y&&Y.teams&&!Y.done?`${Y.year} · ${yMe}위 · ${yMy.w||0}승 ${yMy.l||0}패${Y.post?' · 포스트시즌':''}`:Y&&Y.done?`${Y.year} 리그 끝 · 새 리그 고르기`:'참가 중인 리그 없음'}</span></a>
  <a class="ofli" href="#online"><b>친구 리그</b><span>${FBMODE()?(ON.user?'친구와 라인업 대전':'로그인하면 참가'):'배포본에서 열려요'}</span></a>`;
  const ntc=`<div class="ntcl">${NOTICES.slice(0,4).map(n=>`<button class="ghost ntci" data-ntc="${n.id}"><small>${n.d.slice(5).replace('-','.')}</small> ${esc(n.t)}${!(S.ntc||{})[n.id]&&n.rw?' <b class="ntcn">보상</b>':''}</button>`).join('')}</div>
  <div class="tools" style="margin-top:8px;flex-wrap:nowrap"><input id="cpn" aria-label="쿠폰 코드" placeholder="쿠폰 코드" autocomplete="off" style="flex:1;min-width:0;text-transform:uppercase"><button class="ghost" data-a="coupon">받기</button><button class="ghost" data-a="vercheck">새 버전 확인</button></div>${S.cpMsg?`<p class="note" aria-live="polite" style="margin:4px 0 0">${esc(S.cpMsg)}</p>`:''}${S.verMsg?`<p class="note" style="margin:4px 0 0">${esc(S.verMsg)}</p>`:''}`;
  const tx=Object.values(S.tix||{}).reduce((a,b)=>a+(b|0),0),own=Object.keys(S.owned||{}).length;
  const col=`<table class="oft"><tr><td>포인트</td><td><b>${(S.pt||0).toLocaleString()} P</b></td></tr><tr><td>보유 카드</td><td>${own.toLocaleString()}종</td></tr><tr><td>확정권</td><td>${tx}장</td></tr><tr><td>스킬 블록</td><td>${(S.blocks||[]).length}개</td></tr><tr><td>도감</td><td>완성 ${dexDone()}세트</td></tr></table>
  <div class="quick" style="margin-top:8px"><a href="#shop"><button class="ghost" style="width:100%">상점</button></a><a href="#dex"><button class="ghost" style="width:100%">도감</button></a></div>`;
  return `<section class="ofc"><div class="ofhead"><h2>홈</h2><span class="pill">${esc(S.team.name)}${m?' · '+esc(m.n)+' 감독':''}</span></div>
  ${ofGrid('home',[['d','덱'],['m','미션'],['l','리그']],[['d','편집 중인 라인업 <small>'+esc(MODEN[S.teamK||'lg']||'')+'</small>',deck],['d','구단',club],['m','오늘의 미션',miss],['l','리그 현황',lgs],['m','공지 · 쿠폰',ntc],['l','보유 현황',col]])}</section>
  <section class="band setb"><details${S.setbOpen?' open':''}><summary><b>구단 설정 · 테마 · 저장 데이터</b></summary>
  <div class="tools" style="margin-top:10px"><label>구단 이름 <input id="tn" value="${esc(S.team.name)}" maxlength="12"></label></div>
  <div class="thm" role="group" aria-label="테마 색"><b>테마</b><button class="${!S.theme?'on':''}" data-a="theme" data-v="" aria-pressed="${!S.theme}"><i style="--a:#e07a45;--b:#ffd27a"></i>기본</button>${Object.entries(THEMES).map(([k,[a,b2]])=>`<button class="${S.theme===k?'on':''}" data-a="theme" data-v="${k}" aria-pressed="${S.theme===k}"><i style="--a:${a};--b:${b2}"></i>${k}</button>`).join('')}</div>
  <div class="tools"><button class="ghost" data-a="work">업무 모드 ${S.work?'끄기':'켜기'}</button><span class="note" style="margin:0">PC에서는 \` 키</span></div>
  <p class="note">브라우저 자동 저장${FBMODE()&&ON.user?' · 계정 동기화':''}. 다른 기기: 코드 복사 후 붙여넣기.</p>
  <textarea id="sv" rows="3" style="width:100%"></textarea><div class="tools"><button class="ghost" data-a="copy">코드 복사</button><button class="ghost" data-a="load">붙여 넣은 코드 불러오기</button><button class="ghost danger" data-a="reset" style="margin-left:auto">처음부터 다시</button></div>
  <div class="lbl">사진 묶음</div><p class="note" style="margin:0 0 6px">내가 올린 사진 ${Object.keys(S.photos||{}).length}장을 파일 하나로 내보내거나, 받은 파일을 불러와요. 다른 사람에게 넘길 때는 <b>직접 찍은 사진이나 CC 라이선스 사진만</b> 넣어 주세요(기자·구단 사진은 저작권 문제).</p>
  <div class="tools"><button class="ghost" data-a="phexp" ${Object.keys(S.photos||{}).length?'':'disabled'}>사진 묶음 내보내기</button><label class="ghost phup" style="cursor:pointer">사진 묶음 불러오기<input type="file" id="phimp" accept=".json,application/json" hidden></label><label class="mdk"><input type="checkbox" id="phover"${S.phOver?' checked':''}> 이미 있는 사진도 덮어쓰기</label></div>${S.phMsg?`<p class="note" aria-live="polite" style="margin:4px 0 0">${esc(S.phMsg)}</p>`:''}</details></section>`}
// 사진 묶음(SJ 2026-11-26): S.photos만 JSON 파일로 내보내고 불러옴. 카드 id 기준이라 받는 쪽 게임에도 같은 카드에 들어감
function phExport(){const P=S.photos||{},n=Object.keys(P).length;if(!n)return;const blob=new Blob([JSON.stringify({kind:'phm-photos',v:1,n,at:new Date().toISOString().slice(0,10),photos:P})],{type:'application/json'}),name=`프로호구-사진묶음-${n}장.json`,file=new File([blob],name,{type:'application/json'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:'프로호구 사진 묶음'}).then(()=>{S.phMsg=`${n}장 공유`;render()}).catch(()=>{});return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);S.phMsg=`${n}장 내보냄 · ${name}`;render()}
function phImport(f){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result),P=d&&d.kind==='phm-photos'&&d.photos;if(!P||typeof P!=='object')throw 0;S.photos=S.photos||{};let add=0,skip=0,bad=0;
  for(const [id,u] of Object.entries(P)){if(!byId[baseId(id)]||typeof u!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(u)||u.length>400000){bad++;continue}if(S.photos[id]&&!S.phOver){skip++;continue}S.photos[id]=u;add++}
  try{save()}catch(e){S.phMsg='저장 공간 부족 · 일부만 들어갔을 수 있어요'}S.phMsg=`사진 ${add}장 불러옴${skip?` · 이미 있어서 건너뜀 ${skip}`:''}${bad?` · 맞지 않는 항목 ${bad}`:''}`}catch(e){S.phMsg='사진 묶음 파일이 아니에요'}render()};r.readAsText(f)}
async function redeemCoupon(){const el=document.getElementById('cpn'),code=((el&&el.value)||'').trim().toUpperCase();if(!code){S.cpMsg='코드 입력';render();return}
  const F=window.FB;if(!F){S.cpMsg='쿠폰은 온라인 전용';render();return}
  if((S.coupons||{})[code]){S.cpMsg='이미 사용한 쿠폰';render();return}
  S.cpMsg='확인 중…';render();
  try{const snap=await F.getDoc(F.doc(F.db,'coupons',code)),r=ECON.redeem(S,code,snap.exists()?snap.data():null);S.cpMsg=r.err||(r.text+' 획득');save()}catch(e){S.cpMsg='쿠폰 확인 실패 ('+(e.code||e.message)+')'}render()}
const nextOpp=()=>{try{const s=S.season;if(!s||s.over)return '';const pr=curPair(s);if(!pr)return '';const o=pr[0]===0?pr[1]:pr[0];return `<a href="#season" class="pill" style="text-decoration:none;color:inherit">다음 경기 vs ${esc(tname(o))}</a>`}catch(e){return ''}};
const ABMAP='M0 0h0M9 0h0M18 0h0M26 0h0M35 0h0M44 0h0M53 0h0M62 0h0M70 0h0M79 0h0M88 0h0M97 0h0M106 0h0M114 0h0M123 0h0M132 0h0M141 0h0M150 0h0M158 0h0M167 0h0M176 0h0M185 0h0M194 0h0M273 0h0M282 0h0M290 0h0M449 0h0M563 0h0M572 0h0M581 0h0M590 0h0M598 0h0M607 0h0M616 0h0M625 0h0M634 0h0M642 0h0M651 0h0M660 0h0M669 0h0M678 0h0M686 0h0M695 0h0M704 0h0M713 0h0M722 0h0M730 0h0M783 0h0M792 0h0M801 0h0M810 0h0M818 0h0M827 0h0M836 0h0M0 9h0M9 9h0M18 9h0M26 9h0M35 9h0M44 9h0M53 9h0M62 9h0M70 9h0M79 9h0M88 9h0M97 9h0M106 9h0M114 9h0M123 9h0M132 9h0M141 9h0M150 9h0M158 9h0M167 9h0M176 9h0M185 9h0M194 9h0M202 9h0M273 9h0M282 9h0M572 9h0M581 9h0M590 9h0M598 9h0M607 9h0M616 9h0M625 9h0M634 9h0M642 9h0M651 9h0M660 9h0M669 9h0M678 9h0M686 9h0M695 9h0M704 9h0M713 9h0M722 9h0M730 9h0M739 9h0M748 9h0M757 9h0M774 9h0M783 9h0M792 9h0M801 9h0M810 9h0M818 9h0M827 9h0M836 9h0M845 9h0M854 9h0M0 18h0M9 18h0M18 18h0M26 18h0M35 18h0M44 18h0M53 18h0M62 18h0M70 18h0M79 18h0M88 18h0M97 18h0M106 18h0M114 18h0M123 18h0M132 18h0M141 18h0M150 18h0M158 18h0M167 18h0M176 18h0M185 18h0M194 18h0M202 18h0M211 18h0M220 18h0M581 18h0M590 18h0M598 18h0M607 18h0M616 18h0M625 18h0M634 18h0M642 18h0M651 18h0M660 18h0M669 18h0M678 18h0M686 18h0M695 18h0M704 18h0M713 18h0M722 18h0M730 18h0M739 18h0M748 18h0M757 18h0M766 18h0M774 18h0M783 18h0M792 18h0M801 18h0M810 18h0M818 18h0M827 18h0M836 18h0M845 18h0M854 18h0M0 26h0M9 26h0M18 26h0M26 26h0M35 26h0M44 26h0M53 26h0M62 26h0M70 26h0M79 26h0M88 26h0M97 26h0M106 26h0M114 26h0M123 26h0M132 26h0M141 26h0M150 26h0M158 26h0M167 26h0M176 26h0M185 26h0M194 26h0M202 26h0M220 26h0M598 26h0M607 26h0M616 26h0M625 26h0M634 26h0M642 26h0M651 26h0M660 26h0M669 26h0M678 26h0M686 26h0M695 26h0M704 26h0M713 26h0M722 26h0M730 26h0M739 26h0M748 26h0M757 26h0M766 26h0M774 26h0M783 26h0M792 26h0M801 26h0M810 26h0M836 26h0M862 26h0M871 26h0M0 35h0M9 35h0M18 35h0M26 35h0M35 35h0M44 35h0M53 35h0M62 35h0M70 35h0M79 35h0M88 35h0M97 35h0M106 35h0M114 35h0M123 35h0M132 35h0M141 35h0M150 35h0M158 35h0M167 35h0M176 35h0M185 35h0M194 35h0M202 35h0M220 35h0M598 35h0M607 35h0M616 35h0M625 35h0M634 35h0M642 35h0M651 35h0M660 35h0M669 35h0M678 35h0M686 35h0M695 35h0M704 35h0M713 35h0M722 35h0M730 35h0M739 35h0M748 35h0M757 35h0M766 35h0M774 35h0M783 35h0M792 35h0M801 35h0M810 35h0M818 35h0M827 35h0M0 44h0M9 44h0M18 44h0M26 44h0M35 44h0M44 44h0M53 44h0M62 44h0M70 44h0M79 44h0M88 44h0M97 44h0M106 44h0M114 44h0M123 44h0M132 44h0M141 44h0M150 44h0M158 44h0M167 44h0M176 44h0M185 44h0M194 44h0M598 44h0M607 44h0M616 44h0M625 44h0M634 44h0M642 44h0M651 44h0M660 44h0M669 44h0M678 44h0M686 44h0M695 44h0M704 44h0M713 44h0M722 44h0M730 44h0M739 44h0M748 44h0M757 44h0M766 44h0M774 44h0M783 44h0M792 44h0M801 44h0M810 44h0M818 44h0M836 44h0M0 53h0M9 53h0M18 53h0M26 53h0M35 53h0M44 53h0M53 53h0M62 53h0M70 53h0M79 53h0M88 53h0M97 53h0M106 53h0M114 53h0M123 53h0M132 53h0M141 53h0M150 53h0M158 53h0M167 53h0M211 53h0M220 53h0M598 53h0M607 53h0M616 53h0M625 53h0M634 53h0M642 53h0M651 53h0M660 53h0M669 53h0M678 53h0M686 53h0M695 53h0M704 53h0M713 53h0M722 53h0M730 53h0M739 53h0M748 53h0M757 53h0M766 53h0M774 53h0M783 53h0M792 53h0M801 53h0M0 62h0M9 62h0M18 62h0M26 62h0M35 62h0M44 62h0M53 62h0M62 62h0M70 62h0M79 62h0M88 62h0M97 62h0M106 62h0M114 62h0M123 62h0M141 62h0M150 62h0M158 62h0M211 62h0M598 62h0M607 62h0M616 62h0M625 62h0M634 62h0M642 62h0M651 62h0M660 62h0M669 62h0M678 62h0M686 62h0M695 62h0M704 62h0M713 62h0M722 62h0M730 62h0M739 62h0M748 62h0M757 62h0M766 62h0M774 62h0M783 62h0M0 70h0M9 70h0M18 70h0M26 70h0M35 70h0M44 70h0M53 70h0M62 70h0M70 70h0M79 70h0M88 70h0M97 70h0M106 70h0M114 70h0M150 70h0M158 70h0M211 70h0M598 70h0M607 70h0M616 70h0M625 70h0M634 70h0M642 70h0M651 70h0M660 70h0M669 70h0M678 70h0M686 70h0M695 70h0M704 70h0M713 70h0M722 70h0M730 70h0M739 70h0M748 70h0M757 70h0M766 70h0M774 70h0M783 70h0M0 79h0M9 79h0M18 79h0M26 79h0M35 79h0M44 79h0M53 79h0M62 79h0M70 79h0M79 79h0M88 79h0M97 79h0M106 79h0M114 79h0M123 79h0M158 79h0M194 79h0M202 79h0M607 79h0M616 79h0M625 79h0M634 79h0M642 79h0M651 79h0M660 79h0M669 79h0M678 79h0M686 79h0M695 79h0M704 79h0M713 79h0M722 79h0M730 79h0M739 79h0M748 79h0M757 79h0M766 79h0M774 79h0M783 79h0M0 88h0M9 88h0M18 88h0M26 88h0M35 88h0M44 88h0M53 88h0M62 88h0M70 88h0M79 88h0M88 88h0M97 88h0M106 88h0M114 88h0M123 88h0M176 88h0M185 88h0M194 88h0M616 88h0M625 88h0M634 88h0M642 88h0M651 88h0M660 88h0M669 88h0M678 88h0M686 88h0M695 88h0M704 88h0M713 88h0M722 88h0M730 88h0M739 88h0M748 88h0M757 88h0M766 88h0M774 88h0M0 97h0M9 97h0M18 97h0M26 97h0M35 97h0M44 97h0M53 97h0M62 97h0M70 97h0M79 97h0M88 97h0M97 97h0M106 97h0M114 97h0M123 97h0M132 97h0M625 97h0M634 97h0M642 97h0M651 97h0M660 97h0M669 97h0M678 97h0M686 97h0M695 97h0M704 97h0M713 97h0M722 97h0M730 97h0M739 97h0M748 97h0M757 97h0M0 106h0M9 106h0M18 106h0M26 106h0M35 106h0M44 106h0M53 106h0M62 106h0M70 106h0M79 106h0M88 106h0M97 106h0M106 106h0M114 106h0M123 106h0M132 106h0M642 106h0M651 106h0M660 106h0M669 106h0M678 106h0M686 106h0M695 106h0M704 106h0M757 106h0M0 114h0M9 114h0M18 114h0M26 114h0M35 114h0M44 114h0M53 114h0M62 114h0M70 114h0M79 114h0M88 114h0M97 114h0M106 114h0M114 114h0M123 114h0M634 114h0M651 114h0M660 114h0M669 114h0M678 114h0M686 114h0M695 114h0M766 114h0M0 123h0M9 123h0M18 123h0M26 123h0M35 123h0M44 123h0M53 123h0M62 123h0M70 123h0M79 123h0M88 123h0M97 123h0M106 123h0M114 123h0M123 123h0M642 123h0M660 123h0M669 123h0M678 123h0M686 123h0M695 123h0M766 123h0M0 132h0M9 132h0M18 132h0M26 132h0M35 132h0M44 132h0M53 132h0M62 132h0M70 132h0M79 132h0M88 132h0M97 132h0M106 132h0M132 132h0M669 132h0M678 132h0M686 132h0M695 132h0M757 132h0M766 132h0M18 141h0M26 141h0M35 141h0M44 141h0M53 141h0M62 141h0M70 141h0M88 141h0M669 141h0M678 141h0M686 141h0M695 141h0M730 141h0M739 141h0M783 141h0M26 150h0M35 150h0M44 150h0M53 150h0M62 150h0M70 150h0M88 150h0M678 150h0M686 150h0M695 150h0M704 150h0M722 150h0M730 150h0M792 150h0M801 150h0M810 150h0M26 158h0M44 158h0M53 158h0M62 158h0M70 158h0M132 158h0M695 158h0M704 158h0M713 158h0M722 158h0M730 158h0M44 167h0M53 167h0M62 167h0M70 167h0M79 167h0M132 167h0M722 167h0M730 167h0M739 167h0M748 167h0M44 176h0M62 176h0M70 176h0M79 176h0M150 176h0M748 176h0M801 176h0M44 185h0M70 185h0M123 185h0M141 185h0M748 185h0M792 185h0M810 185h0M818 185h0M827 185h0M836 185h0M141 194h0M150 194h0M766 194h0M783 194h0M792 194h0M801 194h0M810 194h0M818 194h0M827 194h0M836 194h0M845 194h0M53 202h0M114 202h0M123 202h0M783 202h0M792 202h0M801 202h0M810 202h0M818 202h0M827 202h0M836 202h0M845 202h0M854 202h0M862 202h0M871 202h0M44 211h0M62 211h0M106 211h0M114 211h0M783 211h0M792 211h0M801 211h0M810 211h0M818 211h0M827 211h0M836 211h0M845 211h0M854 211h0M862 211h0M871 211h0M880 211h0M44 220h0M53 220h0M88 220h0M97 220h0M106 220h0M114 220h0M123 220h0M132 220h0M158 220h0M774 220h0M783 220h0M792 220h0M801 220h0M810 220h0M818 220h0M827 220h0M836 220h0M845 220h0M854 220h0M862 220h0M871 220h0M880 220h0M53 229h0M62 229h0M88 229h0M97 229h0M106 229h0M114 229h0M176 229h0M766 229h0M774 229h0M783 229h0M792 229h0M801 229h0M810 229h0M818 229h0M827 229h0M836 229h0M845 229h0M854 229h0M862 229h0M871 229h0M880 229h0M889 229h0M898 229h0M62 238h0M70 238h0M97 238h0M106 238h0M132 238h0M167 238h0M185 238h0M194 238h0M202 238h0M211 238h0M220 238h0M774 238h0M783 238h0M792 238h0M801 238h0M810 238h0M818 238h0M827 238h0M836 238h0M845 238h0M854 238h0M862 238h0M871 238h0M880 238h0M889 238h0M898 238h0M906 238h0M915 238h0M924 238h0M70 246h0M202 246h0M211 246h0M220 246h0M229 246h0M246 246h0M766 246h0M774 246h0M783 246h0M792 246h0M801 246h0M810 246h0M818 246h0M827 246h0M836 246h0M845 246h0M854 246h0M862 246h0M871 246h0M880 246h0M889 246h0M898 246h0M906 246h0M915 246h0M924 246h0M933 246h0M942 246h0M88 255h0M97 255h0M106 255h0M202 255h0M211 255h0M220 255h0M238 255h0M774 255h0M783 255h0M792 255h0M801 255h0M810 255h0M818 255h0M827 255h0M836 255h0M845 255h0M854 255h0M862 255h0M871 255h0M880 255h0M889 255h0M898 255h0M906 255h0M915 255h0M924 255h0M933 255h0M942 255h0M246 264h0M783 264h0M792 264h0M801 264h0M810 264h0M818 264h0M827 264h0M836 264h0M845 264h0M854 264h0M862 264h0M871 264h0M880 264h0M889 264h0M898 264h0M906 264h0M915 264h0M924 264h0M933 264h0M942 264h0M185 273h0M194 273h0M220 273h0M783 273h0M792 273h0M801 273h0M810 273h0M818 273h0M827 273h0M836 273h0M845 273h0M854 273h0M862 273h0M871 273h0M880 273h0M889 273h0M898 273h0M906 273h0M915 273h0M924 273h0M933 273h0M158 282h0M167 282h0M176 282h0M185 282h0M220 282h0M792 282h0M801 282h0M810 282h0M818 282h0M827 282h0M836 282h0M845 282h0M854 282h0M862 282h0M871 282h0M880 282h0M889 282h0M898 282h0M906 282h0M915 282h0M924 282h0M150 290h0M158 290h0M167 290h0M176 290h0M185 290h0M194 290h0M220 290h0M229 290h0M801 290h0M810 290h0M818 290h0M827 290h0M836 290h0M845 290h0M854 290h0M862 290h0M871 290h0M880 290h0M889 290h0M898 290h0M906 290h0M915 290h0M924 290h0M141 299h0M150 299h0M158 299h0M167 299h0M176 299h0M185 299h0M194 299h0M202 299h0M211 299h0M220 299h0M229 299h0M810 299h0M818 299h0M827 299h0M836 299h0M845 299h0M854 299h0M862 299h0M871 299h0M880 299h0M889 299h0M898 299h0M906 299h0M915 299h0M924 299h0M114 308h0M123 308h0M132 308h0M141 308h0M150 308h0M158 308h0M167 308h0M176 308h0M185 308h0M194 308h0M202 308h0M211 308h0M220 308h0M229 308h0M238 308h0M308 308h0M810 308h0M818 308h0M827 308h0M836 308h0M845 308h0M854 308h0M862 308h0M871 308h0M880 308h0M889 308h0M898 308h0M906 308h0M915 308h0M924 308h0M106 317h0M114 317h0M123 317h0M132 317h0M141 317h0M150 317h0M158 317h0M167 317h0M176 317h0M185 317h0M194 317h0M202 317h0M211 317h0M220 317h0M229 317h0M238 317h0M246 317h0M810 317h0M818 317h0M827 317h0M836 317h0M845 317h0M854 317h0M862 317h0M871 317h0M880 317h0M889 317h0M898 317h0M906 317h0M106 326h0M114 326h0M123 326h0M132 326h0M141 326h0M150 326h0M158 326h0M167 326h0M176 326h0M185 326h0M194 326h0M202 326h0M211 326h0M220 326h0M229 326h0M238 326h0M246 326h0M255 326h0M810 326h0M818 326h0M827 326h0M836 326h0M845 326h0M854 326h0M862 326h0M871 326h0M880 326h0M889 326h0M106 334h0M114 334h0M123 334h0M132 334h0M141 334h0M150 334h0M158 334h0M167 334h0M176 334h0M185 334h0M194 334h0M202 334h0M211 334h0M220 334h0M229 334h0M238 334h0M246 334h0M255 334h0M810 334h0M818 334h0M827 334h0M836 334h0M845 334h0M854 334h0M862 334h0M871 334h0M880 334h0M889 334h0M114 343h0M123 343h0M132 343h0M141 343h0M150 343h0M158 343h0M167 343h0M176 343h0M185 343h0M194 343h0M202 343h0M211 343h0M220 343h0M229 343h0M238 343h0M246 343h0M255 343h0M810 343h0M818 343h0M827 343h0M836 343h0M845 343h0M854 343h0M862 343h0M871 343h0M880 343h0M114 352h0M123 352h0M132 352h0M141 352h0M150 352h0M158 352h0M185 352h0M194 352h0M202 352h0M211 352h0M220 352h0M229 352h0M238 352h0M246 352h0M255 352h0M810 352h0M818 352h0M827 352h0M836 352h0M845 352h0M854 352h0M862 352h0M871 352h0M880 352h0M114 361h0M123 361h0M202 361h0M211 361h0M220 361h0M229 361h0M238 361h0M246 361h0M801 361h0M810 361h0M818 361h0M827 361h0M836 361h0M845 361h0M854 361h0M862 361h0M871 361h0M211 370h0M220 370h0M229 370h0M238 370h0M246 370h0M801 370h0M810 370h0M818 370h0M827 370h0M836 370h0M845 370h0M854 370h0M220 378h0M352 378h0M361 378h0M801 378h0M810 378h0M818 378h0M827 378h0M836 378h0M845 378h0M229 387h0M352 387h0M801 387h0M810 387h0M818 387h0M827 387h0M836 387h0M238 396h0M334 396h0M792 396h0M801 396h0M810 396h0M818 396h0M827 396h0M317 405h0M326 405h0M792 405h0M801 405h0M810 405h0M818 405h0M792 414h0M801 414h0M810 414h0M818 414h0',ABPOS={"d1": [16.2, 18.8, "l"], "d6": [13.8, 31.1, "l"], "d2": [26.2, 86.3, "r"], "d8": [70.8, 32.7, "l"], "d3": [21.5, 19.5, "r"], "d7": [85.8, 36.3, "r"], "d9": [85.5, 46.2, "r"], "d4": [84.0, 35.6, "t"], "d5": [66.7, 21.7, "l"]};
const abMapHTML=d=>`<div class="abmw"><div class="abmap" role="group" aria-label="유학지 지도"><svg viewBox="0 0 960 416" aria-hidden="true"><path d="${ABMAP}"/></svg>${ABD.map(x=>{const o=abOpen(x),p=ABPOS[x[0]]||[50,50,'r'];return `<button class="abpin ${p[2]}${x[0]===d[0]?' on':''}${o?'':' lk'}" style="left:${p[0]}%;top:${p[1]}%" data-abd="${x[0]}" title="${esc(x[1])} · ${o?x[3]+'시간 · 중복 '+x[4]+'장':'잠김 · '+esc(x[6])}" aria-pressed="${x[0]===d[0]}"><i></i><span>${esc(x[1].replace(/ (윈터리그|여름리그|캠프)$/,''))}</span></button>`}).join('')}</div></div>`;
const TC={SSG:'#ce0e2d',SK:'#e1251b',해태:'#c8102e',KIA:'#c8102e',삼성:'#0a5fb4',현대:'#2f7d6d',롯데:'#16326b',LG:'#b3134b',한화:'#e8691b'};
const SKN={con:'교타',pow:'장타',eye:'선구',bun:'번트',spd:'주력',def:'수비',men:'정신',vel:'구속',stu:'구위',brk:'변화',ctl:'제구',sta:'체력'};
const PN={C:'포',['1B']:'1루',['2B']:'2루',['3B']:'3루',SS:'유격',LF:'좌',CF:'중',RF:'우',DH:'지명'};
const PFULL={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발',RP:'불펜'};
const LNAME={키움:'삼미~현대·키움',SK:'쌍방울·SK·SSG',KIA:'해태·KIA',LG:'MBC·LG',두산:'OB·두산',한화:'빙그레·한화'},lname=l=>LNAME[l]||l;
// 철인(IR): 그해 전 경기 출장 야수 · 최다 등판 3위 안 투수. 능력치는 기본과 같고 스킬 블록 효과 ×1.5
// 투타: 좌우 던지기·치기 (KBO 선수 조회)
const HAND={a:'우투우타',b:'우투좌타',c:'우투양타',d:'좌투우타',e:'좌투좌타',f:'좌투양타'};
// 영구결번이 없는 키움·NC·KT의 상징 선수(이정후·테임즈·강백호)는 RN 규칙 그대로, 이름만 '구단 레전드'(SJ 2026-11-26)
const RNL=new Set(['키움','NC','KT']),rnName=line=>RNL.has(line)?'구단 레전드':'영구결번',vnm=c=>c&&c.v==='RN'?rnName(c.line):VN[c&&c.v];
const VN={AS:'올스타',GG:'골든글러브',EX:'EX',IR:'철인',RY:'신인왕',CH:'커리어하이',RN:'영구결번'},SKB={GG:1.25,EX:1.25,RN:1.25,IR:1.5};
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const XY={C:[50,90],'1B':[73,58],'2B':[63,40],'3B':[27,58],SS:[37,40],LF:[17,22],CF:[50,12],RF:[83,22],DH:[87,88]};
// 스킬 칸 기본 모양 5종: 처음 열린 6칸 + 성장하며 열리는 순서 (행,열)
const PAT=[['계단형','좌하단',[[1,0],[2,0],[2,1],[3,0],[3,1],[3,2],[3,3],[2,2],[1,1],[0,0],[1,2],[2,3],[0,1],[1,3],[0,2],[0,3]]],
 ['직사각형','우상단',[[0,1],[0,2],[0,3],[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[0,0],[1,0],[2,0],[3,1],[3,2],[3,3],[3,0]]],
 ['모자형','상단',[[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[0,0],[0,3],[2,1],[2,2],[2,0],[2,3],[3,1],[3,2],[3,0],[3,3]]],
 ['손가락형','하단',[[2,0],[2,3],[3,0],[3,1],[3,2],[3,3],[2,1],[2,2],[1,0],[1,3],[1,1],[1,2],[0,0],[0,3],[0,1],[0,2]]],
 ['물고기형','좌상단',[[0,0],[0,1],[0,2],[1,0],[1,1],[2,1],[1,2],[2,0],[2,2],[0,3],[1,3],[3,1],[3,0],[3,2],[2,3],[3,3]]]];
const patOf=c=>{if(c.pat!=null)return PAT[c.pat];let h=0;for(const ch of c.name+c.year)h=(h*31+ch.charCodeAt(0))%9973;return PAT[h%5]};
// 스킬 칸: 16칸 모두 열림
// 스킬 칸 16칸은 처음부터 모두 열림 (출전 경기 수로 여는 규칙 없앰)
const GP=34,open=c=>16;
const openSet=c=>new Set(patOf(c)[2].slice(0,open(c)).map(([r,q])=>r*4+q));
const SHL={I2:'I',O:'O',T:'T',L:'L',S:'S',I3:'I',I4:'I',V3:'V',J:'J',Z:'Z'};
// 블록 이름: 주 능력치 × 등급(C·B·A·S)
const BNM={con:['밀어치기 연습','결대로 친다','안타 제조기','타격 기계'],pow:['힘껏 퍼올리기','담장 너머로','홈런 공장','만루포 장인'],eye:['공 하나 더 보기','눈야구','볼넷 수집가','선구안의 신'],
 bun:['희생정신','기습 번트','번트 장인','스퀴즈 마스터'],spd:['한 베이스 더','도루 본능','대도','번개 발'],def:['몸 날리기','다이빙 캐치','철벽 수비','그물망 글러브'],men:['멘탈 관리','강심장','큰 경기 체질','승부사'],
 vel:['어깨 예열','강속구','파이어볼러','광속구'],stu:['묵직한 공','돌직구','공이 무겁다','쇳덩이 직구'],brk:['살짝 꺾기','마구 연구','헛스윙 유도','마구 장인'],ctl:['제구 잡기','칼제구','핀포인트','바늘구멍 제구'],sta:['어깨 관리','이닝 이터','완투형','철완']};
const bname=b=>{const k=Object.entries(b.st).sort((x,y)=>y[1]-x[1])[0][0];return (BNM[k]||[SKN[k]])[Math.max(0,'CBAS'.indexOf(b.g))]||SKN[k]};
const grade=v=>v>=115?'SS+':v>=110?'SS':v>=100?'S+':v>=90?'S':v>=80?'A':v>=70?'B':v>=60?'C':'D';
const fit=(c,p)=>p==='DH'?'지명':c.ps&&c.ps[p]!=null?grade(c.ps[p]):'X';
const fitCls=f=>f[0]==='S'||f==='A'||f==='지명'?'A':f==='B'?'B':'C';
// 포지션별 일러스트 (코드로 그린 실루엣)
function fig(c){const k=c.type==='P'?'P':c.pos==='C'?'C':'B',w='#fff',sh='rgba(0,0,0,.22)';
 const ground=`<ellipse cx="80" cy="112" rx="58" ry="8" fill="${sh}"/><path d="M0 120 Q80 96 160 120 V120 H0Z" fill="rgba(255,255,255,.12)"/>`;
 const stripes=`<g opacity=".12">${[0,1,2,3,4,5].map(i=>`<rect x="${i*30-10}" y="0" width="12" height="120" transform="skewX(-20)" fill="#fff"/>`).join('')}</g>`;
 let body;
 if(k==='B')body=`<line x1="104" y1="40" x2="134" y2="8" stroke="#d8b27a" stroke-width="7" stroke-linecap="round"/><circle cx="84" cy="30" r="12" fill="${w}"/><path d="M70 22 Q84 10 98 22 L100 28 H68Z" fill="${sh}"/><path d="M70 44 Q84 38 98 44 L102 78 H66Z" fill="${w}"/><path d="M98 48 L108 40" stroke="${w}" stroke-width="9" stroke-linecap="round"/><path d="M70 78 L58 108 M96 78 L106 108" stroke="${w}" stroke-width="11" stroke-linecap="round"/>`;
 else if(k==='P')body=`<circle cx="78" cy="30" r="12" fill="${w}"/><path d="M66 22 Q78 10 90 22 L94 27 H64Z" fill="${sh}"/><path d="M64 44 Q78 38 92 44 L96 76 H62Z" fill="${w}"/><path d="M92 48 Q118 38 124 16" stroke="${w}" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="125" cy="13" r="5" fill="#fff" stroke="${sh}"/><path d="M66 50 L50 66" stroke="${w}" stroke-width="9" stroke-linecap="round"/><circle cx="48" cy="68" r="7" fill="#8a5a2b"/><path d="M68 76 L44 106 M90 76 L100 92 L120 92" stroke="${w}" stroke-width="11" stroke-linecap="round" fill="none"/>`;
 else body=`<circle cx="80" cy="50" r="13" fill="${w}"/><rect x="70" y="44" width="20" height="14" rx="3" fill="none" stroke="${sh}" stroke-width="3"/><path d="M64 64 Q80 58 96 64 L100 92 H60Z" fill="${w}"/><circle cx="106" cy="76" r="11" fill="#8a5a2b"/><path d="M62 92 L50 104 L66 108 M98 92 L110 104 L94 108" stroke="${w}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
 return `<svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${stripes}${ground}${body}</svg>`}
// 스킬 블록(GG·EX ×1.25) + 유학 상승(S.abSt, 배율 없음)을 합친 추가 능력치
const skillOf=id=>{const s={},m=(by[id]&&SKB[by[id].v])||1;for(const b of S.blocks)if(b.on===id)for(const k in b.st)s[k]=(s[k]||0)+b.st[k];for(const k in s)s[k]=Math.round(s[k]*m);const ab=(S.abSt||{})[id]||{};for(const k in ab)s[k]=(s[k]||0)+ab[k];return s};
// 사진 우선순위: 사용자가 올린 사진 S.photos[id] → 공용 사진 c.img={f,a,l,u}(출처·라이선스 표기) → 코드로 그린 포지션 그림
// 얼굴 그림 (작은 카드용): 모자·헬멧·포수 마스크로 포지션 구분
function face(c){const k=c.type==='P'?'P':c.pos==='C'?'C':'B',sk='#f1d3b5',dk='#1b1d1c';
 const cap=k==='P'?`<path d="M44 46 Q80 14 116 46 L118 54 H42Z" fill="${dk}"/><path d="M110 50 Q130 52 136 58 L112 58Z" fill="${dk}"/><circle cx="80" cy="36" r="5" fill="${c.col}"/>`
  :k==='B'?`<path d="M40 56 Q40 16 80 16 Q120 16 120 56 L124 62 H36Z" fill="${dk}"/><path d="M40 56 Q36 70 46 76 L52 60Z" fill="${dk}"/><path d="M116 52 Q140 54 142 62 L118 62Z" fill="${dk}"/><rect x="72" y="28" width="16" height="10" rx="3" fill="${c.col}"/>`
  :`<path d="M44 50 Q80 14 116 50 L118 56 H42Z" fill="${dk}"/>`;
 const mask=k==='C'?`<g stroke="#9aa0a6" stroke-width="4" fill="none"><rect x="54" y="56" width="52" height="46" rx="12"/><path d="M54 72 H106 M54 86 H106 M80 56 V102"/></g>`:'';
 return `<svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g opacity=".14">${[0,1,2,3,4,5].map(i=>`<rect x="${i*30-10}" y="0" width="12" height="120" transform="skewX(-20)" fill="#fff"/>`).join('')}</g>
 <path d="M22 120 Q26 98 56 94 L104 94 Q134 98 138 120Z" fill="#fff"/><path d="M68 94 L80 108 L92 94" fill="none" stroke="${c.col}" stroke-width="4"/><rect x="70" y="84" width="20" height="14" fill="${sk}"/>
 <ellipse cx="80" cy="64" rx="28" ry="31" fill="${sk}"/><circle cx="70" cy="64" r="3" fill="${dk}"/><circle cx="90" cy="64" r="3" fill="${dk}"/><path d="M72 80 Q80 85 88 80" stroke="${dk}" stroke-width="2.5" fill="none" stroke-linecap="round"/>${cap}${mask}</svg>`}
function photo(c,credit,full){const up=(S.photos||{})[baseId(c.id)]||(S.photos||{})[c.id],m=c.img;const im=src=>`<img src="${esc(src)}" alt="${esc(c.name)}" class="${full?'':'facecrop'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 15%">`;
 if(up)return im(up);if(!m)return numArt(c,full);return numArt(c,full)+im(m.f).replace('<img ','<img loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" ')}
// 사진 없는 선수: 구단 색 + 등번호(없으면 포지션). 실제 로고·엠블럼 없음
const POSA={C:'C','1B':'1B','2B':'2B','3B':'3B',SS:'SS',LF:'LF',CF:'CF',RF:'RF',DH:'DH',SP:'SP',RP:'RP'};
function numArt(c,full){const n=c.no!=null&&c.no!==''?String(c.no):'',t=n||POSA[c.pos]||(c.type==='P'?'P':'B');
 return `<span class="numart${full?' big':''}${n?'':' nopos'}" style="--tc:${c.col||'#555'}" aria-hidden="true"><i class="na-st"></i><b>${esc(t)}</b><small>${esc(c.team)}</small></span>`}
// 사진 출처(CC 라이선스 표시 의무): 카드 위가 아니라 팝업 아래 한 줄로
const credLine=c=>c.img&&!(S.photos||{})[c.id]?`<span class="pcr">사진 <a href="${esc(c.img.u)}" target="_blank" rel="noopener">${esc(c.img.a)}</a> · ${esc(c.img.l)}</span>`:'';
function bars(c,keys,bonus){const EQ=ECON.cardEq?ECON.cardEq(S,baseId(c.id),byId):{};return keys.map(k=>{const v=c.r[k],p=k==='sta'?0:(bonus||0),sk=(skillOf(c.id)[k]||0),eq=EQ[k]||0,add=p+sk+eq,t=Math.min(120,v+add),tip=[p?`덱 효과 +${p}`:'',sk?`스킬 +${sk}`:'',eq?`장비 +${eq}`:''].filter(Boolean).join(' · ');
 return `<div class="sr"${tip?` title="${tip}"`:''}><span>${SKN[k]}</span><span class="bar"><i class="${t>=90?'e':t>=80?'h':''}" style="width:${Math.min(v,120)/120*100}%"></i>${add>0?`<b class="bb" style="width:${Math.min(add,120-Math.min(v,120))/120*100}%"></b>`:''}</span><em>${t}</em><small class="${add>0?'up':''}">${add>0?'(+'+add+')':''}</small></div>`}).join('')}
// 컨디션 1~5 (엔진 COND: 최악·나쁨·보통·좋음·최상) → OVR 앞 화살표. 시안은 선수별 고정 예시값
const CONDN=['','최악','나쁨','보통','좋음','최상'],CONDA=[0,90,45,0,-45,-90];
const condOf=c=>{if(!c)return 3;const v=(S.cond||{})[baseId(c.id)]||3;return Math.max(condMin(baseId(c.id)),v)};
const condI=c=>{const v=condOf(c);return `<i class="cnd cd${v}" title="컨디션 ${CONDN[v]}" aria-label="컨디션 ${CONDN[v]}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h8M8 4.5 11.5 8 8 11.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${CONDA[v]} 8 8)"/></svg></i>`};
const stars=n=>{if(S&&S.work)return `<i class="stars xs">코스트 ${n}</i>`;const k=Math.max(0,Math.min(5,n-5)),m=Math.min(n,5);return `<i class="stars" title="코스트 ${n}" aria-label="코스트 ${n}">${k?`<b>${'★'.repeat(k)}</b>`:''}${'★'.repeat(m-k)}</i>`}; // 6 이상: 5칸 중 (n-5)칸을 붉게
function card(c,o={}){if(!c)return '';if(S.work&&!o.full)return `<div class="card xcell${o.dim?' dim':''}" ${o.pick?`role="button" tabindex="0" draggable="true" data-drag="c:${esc(c.id)}" data-pick="${esc(c.id)}" aria-label="${esc(c.name)} 카드 크게 보기"`:''}><span class="x1"><b>${esc(c.name)}</b><em>${c.ovr}</em></span><span class="x2">${PFULL[c.pos]||c.pos} · 코스트 ${c.cost} · ${c.year} ${esc(c.team)}${c.v?' · '+esc(vnm(c)||c.v):''}${o.inUse?' · 1군':''}${S.locks&&S.locks.includes(c.id)?' · 잠김':''}</span></div>`;const keys=c.type==='B'?BK:PKEY,d=o.full?(o.dfx||deckFx()):null,bn=d&&(o.dids||used()).includes(c.id)?(c.type==='B'?d.bat:d.pit):o.full?0:null;
 return `<div class="card t-${c.tier}${c.v?' cv-'+c.v:''}${o.dim?' dim':''}${o.full?' big':o.stats?'':' slim'}" style="--tc:${c.col}" ${o.pick?`role="button" tabindex="0" draggable="true" data-drag="c:${esc(c.id)}" data-pick="${esc(c.id)}" aria-label="${esc(c.name)} 카드 크게 보기"`:''}>
 <div class="art">${photo(c,o.full,o.full)}${c.v?`<span class="fxo fx-${c.v}" aria-hidden="true"></span>`:''}<span class="ovr">${o.nocond?'':condI(c)}${c.ovr}</span>${o.full?`<span class="tag">${PFULL[c.pos]}${c.tw?' · 겸업':''}${HAND[c.h]?` · ${HAND[c.h]}`:''}</span>`:`<span class="tag tstar" title="${PFULL[c.pos]}${HAND[c.h]?' · '+HAND[c.h]:''} · 코스트 ${c.cost}">${stars(c.cost)}</span>`}${c.v?`<span class="vb v-${c.v}">${vnm(c)}</span>`:''}${planeB(c,'plb')}${o.inUse?'<span class="use">1군</span>':''}${abOf(c.id)?'<span class="use abu">유학 중</span>':''}${S.locks&&S.locks.includes(c.id)?'<span class="lockb" role="img" aria-label="잠김">'+LOCKI(1)+'</span>':''}</div>
 <div class="plate"><b><em>${esc(c.name)}</em>${o.full?stars(c.cost):''}</b><span>${c.year} ${esc(c.team)}${ageOf(c)!=null?` · <i class="age${abAge(c)?' ab':''}" title="${abAge(c)?'유학 가능':abWhy(c)}">${ageOf(c)}세</i>`:''}</span></div>
 ${o.full||o.stats?`<div class="st">${bars(c,o.full?keys:keys.slice(0,4),bn)}</div>`:''}</div>`}
// 오더 카드 (라인업 줄에 놓이는 작은 카드)
function oc(k,i,lab,o={}){const id=S[k][i]!==undefined&&k!=='lu'?S[k][i]:S.lu[i][1],c=by[id],sel=S.sel&&S.sel.k===k&&S.sel.i===i?' sel':'';
 const under=o.under||`<span class="olab ${o.cls||''}">${lab}</span>`;
 if(!c)return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb empty${sel}" data-slot="${k}:${i}">비어 있음</button>${under}</div>`;
 return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb${sel}" style="--tc:${c.col}" draggable="true" data-drag="s:${k}:${i}" data-slot="${k}:${i}" aria-label="${esc(lab)} ${esc(c.name)}">
 <span class="oart">${photo(c,0,0)}${c.v?`<span class="fxo fx-${c.v}" aria-hidden="true"></span>`:''}${c.v?`<i class="ovb v-${c.v}">${c.v==="IR"?"철인":c.v}</i>`:''}${planeB(c,'oplb')}<i class="oovr">${c.ovr}</i><i class="ocnd">${condI(c)}</i></span>${supOn(c.id)?`<i class="sbadge" title="서포트: ${esc(sp(supOn(c.id).id)[1])}">S${supOn(c.id).left}</i>`:''}<span class="onm" title="${c.year} ${esc(c.name)}"><span class="oy">${String(c.year).slice(2)}'</span>${esc(c.name)}</span><span class="osub t-${c.tier}">${PFULL[c.pos]}${c.tw?'·겸업':''}<i class="ost">★${c.cost}</i></span>${c.bo&&k!=='rot'&&k!=='pen'?`<span class="obo${k==='lu'&&!boOk(c,i)?' bad':''}" title="타순 적성: ${c.bo.map(x=>BO[x]).join('·')}${c.st?` (출루율 ${c.st.obp} · OPS ${c.st.ops})`:''}">${c.bo.map(x=>BOS[x]).join('·')}</span>`:''}</button>${under}</div>`}
function posSel(i){const [p,id]=S.lu[i],c=by[id];return `<select class="psel fit-${c?fitCls(fit(c,p)):'A'}" data-pos="${i}" aria-label="${i+1}번 타자 수비 위치">${POS.filter(q=>q===p||canPos(c,q)).map(q=>`<option value="${q}" ${q===p?'selected':''}>${PFULL[q]}${c&&q!=='DH'?' '+fit(c,q):''}</option>`).join('')}</select>`}
function used(){return [...S.lu.map(x=>x[1]),...S.bench,...S.rot,...S.pen].filter(Boolean)}
const tcChip=x=>`<span class="tcc g-${x.g}${x.on?' on':''}"><i>${x.g}</i><b>${esc(x.n)}</b><small>${esc(x.sub)}</small><em>${x.on?`야수 +${x.b} · 투수 +${x.p}`:`${x.cur}/${x.need}`}</em></span>`;
function meter(t,v,max,sub,over,cls){return `<div class="meter${over?' over':''}${cls?' '+cls:''}"><b>${t}</b><span class="v">${v}</span><div class="track"><i style="width:${Math.min(100,parseFloat(v)/max*100)}%"></i></div><small>${sub}</small></div>`}
function tcRow(){const d=deckFx(),m=MG.find(x=>x.id===S.mgr)||MG[0];return `<div class="strip tcr"><div class="sh">팀컬러</div><div class="tcrow"><div class="tcl"><span class="tcsum">야수 +${d.bat} · 투수 +${d.pit}</span>${d.fx.map(tcChip).join('')||'<span class="note">아직 없음</span>'}<button class="ghost tcall" data-a="tcall" aria-pressed="${!!S.tcAll}">${S.tcAll?'접기':'고르기'}</button></div><button class="mgt" data-sub="mgr" title="감독 바꾸기"><span class="mface">${mface(m)}</span><b>${esc(m.n)}</b><small>감독</small></button></div></div>`}
function deckBar(){const d=deckFx();return `<div class="deck">
 ${meter('1군 등록',`${d.cnt} / 25`,25,(()=>{const n=exCount(used());return `야수 9 · 벤치 5 · 선발 5 · 불펜 6 · EX 타자 ${n.B}/${EX_MAX.B} · 투수 ${n.P}/${EX_MAX.P} · ${wildTxt(starters(S.team))}`})(),false,'reg')}
 ${meter('코스트 (1군 25명 전체)',`${d.cost} / ${COST_CAP}`,COST_CAP,d.cost>COST_CAP?'코스트 상한 초과':`남은 코스트 ${COST_CAP-d.cost}`,d.cost>COST_CAP)}
 </div>
 ${S.tcAll?fxPickHTML(starters(S.team),S.team.fxsel,'team'):''}`}
// 덱 효과 고르기: 조건을 채운 효과 중 등급(S·A·B)마다 1개, 최대 3개. sel은 효과 key 배열
function fxPickHTML(cards,sel,scope){const T=teamColor(cards,sel,scope==='bld'?(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean):(S.bench||[]).map(id=>byId[id]).filter(Boolean)),A=T.all||[],on=new Set(T.fx.map(x=>x.key));
 return `<div class="fxpick">${['S','A','B'].map(g=>{const o=A.filter(x=>x.g===g);return `<label class="fxg g-${g}"><i>${g}</i><select data-fxg="${g}" data-fxs="${scope}" ${o.length?'':'disabled'} aria-label="${g}등급 덱 효과">${o.length?o.map(x=>`<option value="${esc(x.key)}"${on.has(x.key)?' selected':''}>${esc(x.name)} · ${esc(x.d)} (야수 +${x.b} · 투수 +${x.p})</option>`).join(''):'<option>조건을 채운 효과 없음</option>'}</select></label>`}).join('')}</div>`}
function fxSet(scope,g,key){const tgt=scope==='bld'?S.bld:S.team,cards=scope==='bld'?bldStart():starters(S.team),A=teamColor(cards,tgt.fxsel,scope==='bld'?(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean):(S.bench||[]).map(id=>byId[id]).filter(Boolean)).all||[];
 const keep=(tgt.fxsel||[]).filter(k=>{const x=A.find(y=>y.key===k);return x&&x.g!==g});tgt.fxsel=[...keep,key];save();render()}
function field(){return `<div class="field"><svg viewBox="0 0 100 86" preserveAspectRatio="none" aria-hidden="true">
 <rect width="100" height="86" fill="#2a7d4f"/>${[0,1,2,3,4,5,6,7].map(i=>`<rect x="${i*12.5}" width="6.25" height="86" fill="rgba(255,255,255,.05)"/>`).join('')}
 <path d="M50 84 L24 56 Q50 24 76 56 Z" fill="#c98a5a"/><path d="M50 78 L32 58 L50 40 L68 58Z" fill="#2a7d4f"/>
 <circle cx="50" cy="59" r="3" fill="#c98a5a"/>${[[50,78],[68,58],[50,40],[32,58]].map(([x,y])=>`<rect x="${x-1.4}" y="${y-1.4}" width="2.8" height="2.8" fill="#fff" transform="rotate(45 ${x} ${y})"/>`).join('')}</svg>
 ${S.lu.map(([p,id],i)=>{const c=by[id];if(!c)return '';const f=fit(c,p);return `<span class="fchip fit-${fitCls(f)}" style="left:${XY[p][0]}%;top:${XY[p][1]}%;--tc:${c.col}"><b>${i+1}</b>${esc(c.name)}<small>${PN[p]} ${f==='X'?'불가':f}</small></span>`}).join('')}</div>`}
function batteryPanel(){const ci=S.lu.find(x=>x[0]==='C'),cat=ci&&by[ci[1]],P=[...S.rot.map((id,i)=>['선'+(i+1),id]),...[2,3,4,5].map((j,i)=>['중'+(i+1),S.pen[j]]),['셋',S.pen[1]],['마',S.pen[0]]];
 const R=P.map(([l,id])=>{const c=by[id];return [l,c,c&&cat?battery(c,cat):null]});
 return `<p class="lbl" style="margin-top:0">포수 ${cat?esc(cat.name):'없음'}와의 궁합</p><div class="bat">${R.map(([l,c,r])=>{const v=r?r.v:0;
 return `<div class="bc2"><span class="bwrap"><i class="${v>=70?'g':v>=40?'m':'b'}" style="height:${v}%"></i></span><b>${l}</b><small>${c?esc(c.name):'–'}</small></div>`}).join('')}</div>
 <div class="legend"><span><i class="g"></i>좋음 70+</span><span><i class="m"></i>보통</span><span><i class="b"></i>나쁨 40 미만</span></div>
 <div class="why">${R.filter(x=>x[1]).map(([l,c,r])=>`<div><b>${l} ${esc(c.name)}</b><span class="v">${r?r.v:'–'}</span><span>${r&&r.why.length?r.why.map(w=>`<i>${w}</i>`).join(''):'<em>연결고리 없음</em>'}</span></div>`).join('')}</div>
 <p class="note help">궁합은 같은 구단(같은 해 같은 팀이면 더 높음), 같은 출신 고교, 같은 출신 지역일 때 올라가요. 좋으면 투수 제구·구위가 조금 오르고, 나쁘면 조금 내려갑니다.</p>`}
// 감독 20명 (가상 인물). 작전 경향은 감독이 정하고, 사용자는 감독을 고른다. tac 순서: bunt steal hr swing ph ibb infield hook close pitchout (0~4)
const TK=['power','steal','bunt','ph','hook','relief','ibb','shift'];
// 작전 경향 표시: [키, 이름, 왼쪽(0), 오른쪽(4)]
const MT=[['power','타격 방침','단타','장타'],['steal','도루 시도','소극적','적극적'],['bunt','번트 시도','소극적','적극적'],['ph','대타 기용','소극적','적극적'],['hook','선발 교체','느리게','빠르게'],['relief','중계 교체','느리게','빠르게'],['ibb','고의4구','적게','자주'],['shift','수비 시프트','적게','자주']];
const MSTY={small:'스몰볼',big:'빅볼',speed:'발야구',trust:'믿음의 야구',pen:'불펜 야구',data:'데이터 야구'};
function vMgr(){const m=MG.find(x=>x.id===S.mgr),fl=S.mf||'all',list=MG.filter(x=>fl==='all'||x.st===fl);
 return `<div class="mgwrap"><div><div class="tabs">${[['all','전체'],...Object.entries(MSTY)].map(([k,n])=>`<button class="${fl===k?'on':''}" data-mf="${k}">${n}</button>`).join('')}</div>
 <div class="mgrs">${list.map(x=>`<button class="mgr${x.id===S.mgr?' on':''}" data-mgr="${x.id}" aria-pressed="${x.id===S.mgr}"><span class="mface">${mface(x)}</span><b>${esc(x.n)}</b><small>${MSTY[x.st]} · ${{L:'레전드',S:'스타',N:'노멀'}[x.g]}</small></button>`).join('')}</div></div>
 <div class="box mdet"><div class="tools"><span class="mface big">${mface(m)}</span><div><h2 style="margin:0">${esc(m.n)} 감독</h2><p style="margin:0">${MSTY[m.st]} · ${{L:'레전드',S:'스타',N:'노멀'}[m.g]}</p></div></div>
 <div class="skill"><b>[${esc(m.sn)}]</b> ${esc(m.se)}</div><p class="note" style="margin:6px 0 0">지금 라인업의 감독이에요. 저장한 덱은 덱마다 감독이 따로 묶여 있어서, 라인업 화면 '덱 저장'에서 덱을 고르면 그 덱의 감독을 바로 바꿀 수 있어요.</p>
 <div class="lbl">작전 경향 (감독이 정함)</div>${MT.map(([k,n,l,r])=>`<div class="tq"><span>${n}</span><span class="tl">${l}</span><span class="tbar" aria-label="${n}: ${l} ${m.tac[k]} / 4 ${r}"><i style="left:${m.tac[k]*25}%"></i></span><span class="tl">${r}</span></div>`).join('')}
 <p class="note help">감독 이름은 KBO 역대 감독 별명, 성향은 게임용 해석. 모든 경기는 고른 감독의 경향대로 작전이 나와요.</p></div></div>`}
// 감독 일러스트(SJ 제공, 2026-11-26). 없으면 아래 SVG 얼굴
const MGR_IMG={"m7": "img/mgr-130d94c41c.jpg", "m1": "img/mgr-211a6a0417.jpg", "m12": "img/mgr-b9b00c68da.jpg", "m5": "img/mgr-060aa2e4ce.jpg", "m4": "img/mgr-20ac2e1151.jpg", "m2": "img/mgr-5b564f49cf.jpg", "m17": "img/mgr-3b14c4ecf4.jpg", "m16": "img/mgr-74fcb6feb9.jpg", "m14": "img/mgr-4dbafdd078.jpg", "m13": "img/mgr-ea5ced71f7.jpg", "m19": "img/mgr-9cbfca3305.jpg", "m20": "img/mgr-c78d22c321.jpg", "m11": "img/mgr-4f8712b23f.jpg", "m3": "img/mgr-66a32d69e6.jpg", "m9": "img/mgr-5464755c16.jpg", "m8": "img/mgr-62529fd76a.jpg", "m15": "img/mgr-dcbd8e6e93.jpg", "m6": "img/mgr-0882eb3f06.jpg", "m18": "img/mgr-fcb9de41d6.jpg", "m10": "img/mgr-f7b3c64dca.jpg"};
function mface(m){if(MGR_IMG[m.id])return `<img src="${MGR_IMG[m.id]}" alt="" loading="lazy">`;const hue={small:'#2f7d6d',big:'#c22a2a',speed:'#e8691b',trust:'#23214f',pen:'#0a5fb4',data:'#7b1530'}[m.st];
 let h=0;for(const ch of m.id)h=h*7+ch.charCodeAt(0);const hair=['#1b1d1c','#4a3b30','#8a8a8a','#d0d0d0'][h%4],gl=h%3===0;
 return `<svg viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="40" fill="${hue}"/><path d="M14 80 Q18 60 40 58 Q62 60 66 80Z" fill="#20242a"/><path d="M34 58 L40 70 L46 58" fill="#fff"/>
 <ellipse cx="40" cy="38" rx="15" ry="17" fill="#f1d3b5"/><path d="M25 34 Q26 18 40 18 Q54 18 55 34 Q48 26 40 27 Q32 26 25 34Z" fill="${hair}"/>
 ${gl?'<g fill="none" stroke="#1b1d1c" stroke-width="2"><circle cx="34" cy="39" r="5"/><circle cx="46" cy="39" r="5"/><path d="M39 39 H41"/></g>':'<circle cx="34" cy="39" r="2" fill="#1b1d1c"/><circle cx="46" cy="39" r="2" fill="#1b1d1c"/>'}
 <path d="M35 47 Q40 ${h%2?50:46} 45 47" stroke="#1b1d1c" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`}
const TCAT={투:'투수',야:'야수',공:'공통'};
function rel(x){const by2=TCARDS.filter(q=>q[7].includes(x[0])).map(q=>q[1]),beats=x[7].map(i=>tc(i)[1]),cancel=x[8].map(i=>tc(i)[1]);
 return [beats.length?`<i class="r-win">${beats.map(esc).join(', ')} 무효화</i>`:'',by2.length?`<i class="r-lose">${by2.map(esc).join(', ')}에 무효화됨</i>`:'',cancel.length?`<i class="r-tie">${cancel.map(esc).join(', ')}와 상쇄</i>`:''].join('')}
function tart(cat){const w='rgba(255,255,255,.92)';
 const P=`<circle cx="52" cy="16" r="7" fill="${w}"/><path d="M44 26 Q52 22 60 26 L62 46 H42Z" fill="${w}"/><path d="M60 29 Q74 22 78 8" stroke="${w}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M44 30 L34 40" stroke="${w}" stroke-width="5" stroke-linecap="round"/><path d="M45 46 L32 62 M58 46 L66 54 L78 54" stroke="${w}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
 const B=`<line x1="66" y1="26" x2="86" y2="4" stroke="#d8b27a" stroke-width="4" stroke-linecap="round"/><circle cx="54" cy="16" r="7" fill="${w}"/><path d="M46 26 Q54 22 62 26 L64 46 H44Z" fill="${w}"/><path d="M62 30 L68 24" stroke="${w}" stroke-width="5" stroke-linecap="round"/><path d="M46 46 L38 62 M62 46 L68 62" stroke="${w}" stroke-width="6" stroke-linecap="round"/>`;
 const C=`<g transform="translate(-14 0) scale(.85)">${P}</g><g transform="translate(26 6) scale(.8)">${B}</g>`;
 return `<svg viewBox="0 0 120 64" class="tart" aria-hidden="true"><g opacity=".18">${[0,1,2,3,4].map(i=>`<rect x="${i*28-6}" width="10" height="64" transform="skewX(-20)" fill="#fff"/>`).join('')}</g>${cat==='투'?P:cat==='야'?B:C}</svg>`}
function tcard(x,o={}){const [id,n,cat,tier,cond,fx,pt]=x;return `<button class="tcd c-${cat==='투'?'p':cat==='야'?'b':'c'} tr-${tier}${o.on?' on':''}${o.st?' st-'+o.st:''}" ${o.attr||''}><span class="tcat" title="${TCAT[cat]} 작전">${cat}</span><span class="ttier">${tier}</span><span class="tpt">${pt}P</span>${tart(cat)}<b>${esc(n)}</b><small>${esc(cond)}</small><span>${esc(fx)}</span>${o.rel?`<span class="rel">${rel(x)}</span>`:''}${o.st?`<em>${o.st}</em>`:''}${o.cnt!=null?`<i class="cnt">×${o.cnt}</i>`:''}</button>`}
function vTcard(){const f=S.tf||'all',list=TCARDS.filter(x=>(S.tq[x[0]]||0)>0&&(f==='all'||x[2]===f||x[3]===f)),cur=S.tsel&&tc(S.tsel);
 return `<div class="tsel2"><div><div class="lbl" style="margin-top:0">다음 대전에 쓸 작전 카드 (1장 · 연습경기는 소모 없음)</div>${cur?tcard(cur,{rel:1,attr:'data-tsel=""',cnt:S.tq[cur[0]]}):'<span class="tcd empty">카드 선택</span>'}</div>
 <div class="tdrawbox"><div class="lbl" style="margin-top:0">작전 카드 뽑기</div><button data-a="tdraw">한 장 뽑기 · 100P</button><p class="note">보유 작전 포인트 1,240P</p>${S.tdraw?`<div class="drawn">${tcard(tc(S.tdraw),{})}<p class="note">NEW</p></div>`:''}</div></div>
 <div class="tools" style="margin-top:16px"><h3 style="margin:0">보유 작전 카드</h3><div class="tabs">${[['all','전체'],['투','투수'],['야','야수'],['공','공통'],['황금','황금']].map(([k,n])=>`<button class="${f===k?'on':''}" data-tf="${k}">${n}</button>`).join('')}</div></div>
 <div class="tpool">${list.map(x=>tcard(x,{on:S.tsel===x[0],rel:1,cnt:S.tq[x[0]],attr:`data-tsel="${x[0]}"`})).join('')||'<p class="note">보유 카드 없음</p>'}</div>
 <p class="note help">작전 카드는 뽑기로 모으고, 대전(친구 리그) 경기마다 한 장을 골라 씁니다. 대전 사용 시 1장 소모, AI 연습경기는 소모 없음. 조건이 맞으면 경기 내내 자동으로 발동하고, 상대가 고른 카드와 우열 관계면 한쪽이 무효화, 대립 관계면 둘 다 상쇄됩니다. 분류: 투수·야수·전원 / 등급: 일반·특수·황금.</p>`}
function supOn(cid){return S.sup.find(x=>x.cid===cid)}
function scard(x,o={}){const [id,n,t,fx,g]=x;return `<button class="scd${o.on?' on':''}" ${o.attr||''}><span class="stg">${t==='B'?'타자용':t==='P'?'투수용':'공용'}</span><b>${esc(n)}</b><span>${esc(fx)}</span><small>${g}경기 지속</small>${o.cnt!=null?`<i class="cnt">×${o.cnt}</i>`:''}</button>`}
function vSup(){const ss=S.ssel&&sp(S.ssel),roster=used().map(id=>by[id]).filter(c=>!ss||ss[2]==='all'||ss[2]===c.type);
 return `<div class="lbl" style="margin-top:0">서포트 받는 선수 ${S.sup.length}/2 · 남은 경기 수는 대전에서만 차감</div><div class="sact">${[0,1].map(i=>{const a=S.sup[i];if(!a)return '<div class="sa empty">빈 자리</div>';const c=by[a.cid],x=sp(a.id);
  return `<div class="sa"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><div><b>${esc(c.name)}</b><small>${esc(x[1])} · ${esc(x[3])}</small><span class="left">${a.left}경기 남음</span></div><button class="ghost" data-sdel="${i}" aria-label="서포트 해제">해제</button></div>`}).join('')}</div>
 <div class="tools" style="margin-top:16px"><h3 style="margin:0">보유 서포트 카드</h3></div>
 <div class="spool">${SUPS.filter(x=>(S.sq[x[0]]||0)>0).map(x=>scard(x,{on:S.ssel===x[0],cnt:S.sq[x[0]],attr:`data-ssel="${x[0]}"`})).join('')}</div>
 ${ss?`<div class="box" style="margin-top:12px"><h3>${esc(ss[1])}를 줄 선수 고르기</h3>${S.sup.length>=2?'<p class="note">서포트 2자리 가득. 하나 해제 필요.</p>':`<div class="pick">${roster.map(c=>`<button class="pk" data-sgive="${esc(c.id)}" ${supOn(c.id)?'disabled':''}><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span>${esc(c.name)}</button>`).join('')}</div>`}</div>`:''}
 <p class="note help">1군 선수 1명에게 사용 · 그 선수 출전 2경기 지속. 경기당 서포트 대상 최대 2명. 준 카드 1장 소모, 남은 경기 수는 대전에서만 차감. AI 연습경기: 카드·경기 수 소모 없음.</p>`}
// 합성: 재료 3개 → 상위 결과. 규칙은 제안안이며 엔진에서 확정
const SYN={p:{n:'선수',rule:'1군에 없는 선수 카드 3장 → 재료 평균 코스트보다 높은 선수 1장 (평균 +1: 70%, +2: 25%, +3: 5%)'},
 b:{n:'스킬 블록',rule:'보관 중인 같은 종류(타자용·투수용) 블록 2개 → 같은 등급이면 한 단계 위 60% · 같은 등급 40%, 등급이 다르면 높은 쪽 등급. 모양은 새로 정해지고, 오르는 능력치 합은 칸 수 × 등급 배율(C 0.75 · B 1 · A 1.25 · S 1.5)이에요. C·B·A는 능력치 하나, S는 두 가지를 올려요.'},
 s:{n:'서포트 카드',rule:'같은 서포트 카드 3장 → 강화판 1장 (효과 1.5배, 3경기 지속)'},
 t:{n:'작전 카드',rule:'같은 등급 작전 카드 3장 → 한 등급 위 카드 1장 (일반 3장: 특수 80% · 황금 20%, 특수 3장: 황금 100%)'}};
const GUP={C:'B',B:'A',A:'S',S:'S'},TUP={일반:'특수',특수:'황금',황금:'황금'};
function synPool(k){if(k==='p'){const u=new Set(used());return OWN.filter(c=>!u.has(c.id)).map(c=>({key:c.id,html:card(c,{}),c}))}
 if(k==='b')return S.blocks.filter(b=>!b.on).map(b=>({key:'b'+b.u,b,html:`<span class="blk"><span class="mini" style="grid-template-columns:repeat(4,12px)">${cells(b).map(()=>`<i class="cell g-${b.g}"></i>`).join('')}</span><small><b class="gl g-${b.g}">${b.g}</b>${esc(bname(b))} · ${b.t==='B'?'타자용':'투수용'}</small><small>${Object.entries(b.st).map(([x,v])=>SKN[x]+'+'+v).join(' ')}</small></span>`}));
 if(k==='s')return SUPS.flatMap(x=>Array.from({length:S.sq[x[0]]||0},(_,i)=>({key:x[0]+'#'+i,x,html:scard(x,{})})));
 return TCARDS.flatMap(x=>Array.from({length:S.tq[x[0]]||0},(_,i)=>({key:x[0]+'#'+i,x,html:tcard(x,{})})))}
const SF0={ty:'all',team:'all',year:'all',cost:'all',pos:'all',sort:'cost',dup:0};
function synPoolF(k){const p=synPool(k);if(k!=='p')return p;const f=S.sf||SF0,EX=new Set(S.synExM||[]);return p.filter(({c})=>!abOf(c.id)&&!EX.has(c.line)&&(f.ty==='all'||c.type===f.ty)&&(f.team==='all'||lname(c.line)===f.team)&&(f.year==='all'||String(c.year)===f.year)&&(f.cost==='all'||(String(f.cost)[0]==='='?c.cost===+String(f.cost).slice(1):c.cost<=+f.cost))&&(!f.pos||f.pos==='all'||c.pos===f.pos)&&(!f.v||f.v==='all'||(f.v==='sp'?['GG','AS','CH','EX'].includes(c.v):f.v==='n'?!c.v:c.v===f.v))&&(!f.dup||c.dup)).sort(SYNSORT[f.sort||'cost']||SYNSORT.cost)}
const dupN=c=>OWN.filter(x=>x.pk===c.pk&&x.type===c.type).length;
const SYNSORT={cost:(a,b)=>a.c.cost-b.c.cost||a.c.ovr-b.c.ovr,costd:(a,b)=>b.c.cost-a.c.cost||b.c.ovr-a.c.ovr,ovr:(a,b)=>a.c.ovr-b.c.ovr,ovrd:(a,b)=>b.c.ovr-a.c.ovr,year:(a,b)=>b.c.year-a.c.year,yeara:(a,b)=>a.c.year-b.c.year,team:(a,b)=>lname(a.c.line).localeCompare(lname(b.c.line))||a.c.year-b.c.year,pos:(a,b)=>POSO.indexOf(a.c.pos)-POSO.indexOf(b.c.pos)||a.c.cost-b.c.cost,dup:(a,b)=>dupN(b.c)-dupN(a.c)||a.c.cost-b.c.cost};
const POSO=['SP','RP','C','1B','2B','3B','SS','LF','CF','RF','DH'];
function synFilt(){const f=S.sf||SF0,base=synPool('p').map(x=>x.c),teams=[...new Set(base.map(c=>lname(c.line)))].sort(),years=[...new Set(base.map(c=>c.year))].sort((a,b)=>b-a),o=(v,n,cur)=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(n)}</option>`;
 return `<div class="tools sfil"><div class="tabs">${[['all','전체'],['B','야수'],['P','투수']].map(([k,n])=>`<button class="${f.ty===k?'on':''}" data-sft="${k}">${n}</button>`).join('')}</div>
 <select data-sf="team" aria-label="구단 필터">${o('all','전체 구단',f.team)}${teams.map(t=>o(t,t,f.team)).join('')}</select>
 <select data-sf="year" aria-label="연도 필터">${o('all','전체 연도',f.year)}${years.map(y=>o(y,y,f.year)).join('')}</select>
 <select data-sf="cost" aria-label="코스트 필터">${o('all','전체 코스트',f.cost)}${[3,5,7].map(n=>o(n,'★'+n+' 이하',f.cost)).join('')}${[1,2,3,4,5,6,7,8,9,10].map(n=>o('='+n,'코스트 '+n+'만',f.cost)).join('')}</select>
 <select data-sf="v" aria-label="카드 종류 필터">${[['all','전체 종류'],['sp','특별 전체'],['GG','골든글러브'],['AS','올스타'],['CH','커리어하이'],['EX','EX'],['n','일반']].map(([v,n])=>o(v,n,f.v||'all')).join('')}</select>
 <select data-sf="pos" aria-label="포지션 필터">${o('all','전체 포지션',f.pos||'all')}${POSO.map(p=>o(p,PFULL[p],f.pos)).join('')}</select>
 <select data-sf="sort" aria-label="정렬">${[['cost','코스트 낮은 순'],['costd','코스트 높은 순'],['ovr','능력 낮은 순'],['ovrd','능력 높은 순'],['year','최신 연도 순'],['yeara','오래된 연도 순'],['team','구단 순'],['pos','포지션 순'],['dup','중복 많은 순']].map(([v,n])=>o(v,n,f.sort||'cost')).join('')}</select>
 <button class="${f.dup?'':'ghost'}" data-sfd="1" aria-pressed="${!!f.dup}">중복만</button></div>`}
const hasBlk=id=>S.blocks.some(b=>b.on===id)?1:0;
// 자동 추천: 잠금·유학 중 제외, 가치 낮은 재료부터
function synAuto(k){const pool=synPoolF(k).filter(x=>!isLocked(lkey(k,x))&&!(k==='p'&&abOf(x.c.id))),n=NEED(k);let m=[];
 if(k==='p')m=pool.sort((a,b)=>hasBlk(a.c.id)-hasBlk(b.c.id)||(b.c.dup?1:0)-(a.c.dup?1:0)||a.c.cost-b.c.cost||a.c.ovr-b.c.ovr).slice(0,n);
 else{const gk=k==='b'?x=>x.b.t:k==='s'?x=>x.x[0]:x=>x.x[3],rank=k==='b'?x=>'CBAS'.indexOf(x.b.g):k==='t'?x=>['일반','특수','황금'].indexOf(x.x[3]):()=>0,g={};
  for(const x of pool)(g[gk(x)]=g[gk(x)]||[]).push(x);
  const best=Object.values(g).filter(a=>a.length>=n).map(a=>a.sort((x,y)=>rank(x)-rank(y)).slice(0,n)).sort((a,b)=>a.reduce((s,x)=>s+rank(x),0)-b.reduce((s,x)=>s+rank(x),0))[0];m=best||[]}
 return m.length===n?m.map(x=>x.key):null}
const NEED=k=>k==='b'?2:3;
const lkey=(k,x)=>k==='p'?x.c.id:k==='b'?'b'+x.b.u:x.x[0];
const isLocked=key=>S.locks.includes(key);
// 자물쇠 아이콘: 잠김(닫힌 고리) / 풀림(열린 고리)
const LOCKI=on=>`<svg class="lki" viewBox="0 0 16 18" aria-hidden="true"><path d="${on?'M4 8V5.5a4 4 0 0 1 8 0V8':'M4 8V5.5a4 4 0 0 1 7.6-1.7'}" fill="none" stroke="currentColor" stroke-width="2"/><rect x="1.5" y="8" width="13" height="9" rx="2" fill="currentColor"/><circle cx="8" cy="12.5" r="1.4" fill="#1b1d1c"/></svg>`;
function toggleLock(key){const i=S.locks.indexOf(key);if(i>=0)S.locks.splice(i,1);else S.locks.push(key)}
function synCheck(k,m){if(m.length<NEED(k))return `재료 ${NEED(k)}개 선택`;
 if(m.some(x=>isLocked(lkey(k,x))))return '잠긴 카드는 재료 불가.';
 if(k==='b'&&new Set(m.map(x=>x.b.t)).size>1)return '타자용·투수용 블록 혼합 불가.';
 if(k==='s'&&new Set(m.map(x=>x.x[0])).size>1)return '같은 서포트 카드 3장 필요.';
 if(k==='t'&&new Set(m.map(x=>x.x[3])).size>1)return '같은 등급 작전 카드 3장 필요.';return ''}
const SYN_LINES=['LG','두산','삼성','KIA','롯데','키움','한화','SK','NC','KT'];
// 칩 이름: 같은 계보 구단을 함께 보여 줌(제외는 계보 단위라 SK를 고르면 SSG·쌍방울도 빠짐)
const SYN_LN={LG:'LG·MBC',두산:'두산·OB',KIA:'KIA·해태',키움:'키움·현대 등',한화:'한화·빙그레',SK:'SSG·SK·쌍방울'};
function synPreview(k,m){if(k==='p'){const a=m.reduce((s,x)=>s+x.c.cost,0)/m.length,R=synthRules(m.map(x=>byId[baseId(x.c.id)]));return `코스트 ${Math.min(10,Math.round(a)+1)}~${Math.min(10,Math.round(a)+3)} 선수`+(R.list.length?' · '+R.list.map(x=>x.n).join(' · '):'')+((S.synEx||[]).length?' · 제외: '+S.synEx.join(', '):'')}
 if(k==='b'){const g=['C','B','A','S'][Math.max(...m.map(x=>'CBAS'.indexOf(x.b.g)))];return m[0].b.g===m[1].b.g?`${GUP[g]}등급 60% · ${g}등급 40%`:`${g}등급 블록`}
 if(k==='s')return `${m[0].x[1]}+ (효과 1.5배, 3경기)`;return `${TUP[m[0].x[3]]} 작전 카드`}

// 유학: 1군 밖 선수를 실제 시간으로 몇 시간 보내고, 끝나면 결과(능력치 상승)를 확인. 같은 카드(중복)를 재료로 씀
const ABD=[['d1','국내 2군 캠프',null,2,1,['con','eye','ctl','men'],'처음부터 열림'],
 ['d6','대만 윈터리그','ai5',3,1,['bun','spd','def','brk'],'AI 시즌 승률 5할'],
 ['d2','호주 윈터리그','ai3',4,1,['con','pow','eye','spd','def','vel','stu','brk','ctl','sta'],'AI 시즌 3위 안'],
 ['d8','멕시코 여름리그','dex5',6,1,['con','pow','sta'],'도감 세트 5개 완성'],
 ['d3','일본 캠프','aiW',8,2,['con','eye','bun','ctl','brk'],'AI 시즌 우승'],
 ['d7','푸에르토리코 윈터리그','hr',10,2,['pow','spd','vel'],'AI 시즌 팀 홈런 1위'],
 ['d9','베네수엘라 윈터리그','era',10,2,['stu','brk','vel','men'],'AI 시즌 팀 평균자책 1위'],
 ['d4','도미니카 윈터리그','aiW2',12,2,['spd','def','pow','vel','sta'],'AI 시즌 2회 우승'],
 ['d5','미국 캠프','aiW3',24,3,['pow','con','vel','stu'],'AI 시즌 3회 우승']];
// 유학 가능: 카드 연도 기준 나이(연도-출생연도 c.b) 25세 이하 또는 35세 이상
// 출생연도 c.b (KBO 선수 조회)
const ABGN=['대성공','성공','보통','실패'];
const abOf=id=>S.ab.find(a=>a.id===id&&!a.got);
// 유학 다녀온 기록: S.abHist[id]=[{d,g,st}] → 사진에 비행기 표시, 마우스를 올리거나 팝업에서 확인
const abHistText=id=>((S.abHist||{})[id]||[]).map(h=>`${abd(h.d)[1]} · ${h.g} · ${Object.entries(h.st).map(([k,v])=>SKN[k]+' +'+v).join(' ')}`).join('\n');
const PLANE='<svg viewBox="1 1.25 21 21" aria-hidden="true"><path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8.5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" fill="currentColor"/></svg>';
const planeB=(c,cls)=>{const t=[...new Set(((S.abHist||{})[c.id]||[]).map(h=>abd(h.d)[1]))].join(', ');return t?`<i class="${cls}" title="${esc(t)}" aria-label="${esc(t)}">${PLANE}</i>`:''};
const abUsed=c=>(S.abSum||{})[c.id]||0;
const hm=ms=>{const m=Math.max(0,Math.round(ms/60000));return m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`};
function vAbroad(){const now=Date.now(),d=abd(S.abSel)||ABD[0],U=new Set(used()),aq=(S.abQ||'').trim(),only=S.abOnly!==false,alim=S.abLim||48,okC=c=>abAge(c)&&!U.has(c.id),cand=OWN.filter(c=>!c.dup&&!c.v&&!abOf(c.id)&&ageOf(c)!=null&&(!aq||c.name.includes(aq))&&(!only||okC(c))),pick=by[S.abPick];
 const fee=pick?studyFee(d[0],pick.cost):0,ok=abOpen(d)&&pick&&!U.has(pick.id)&&abAge(pick)&&S.pt>=fee,rf=pick?ECON.abResetFee(pick.cost):0,rt=(S.tix||{}).abr|0;
 return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">유학</h2><span class="pill">진행 중 ${S.ab.filter(a=>!a.got).length}명</span></div>
 <p class="note" style="margin:6px 0 0">25세 이하 · 35세 이상만</p><p class="note help">1군 미등록 선수만 · 유학 기간 동안 사용 불가. 시간이 끝나면 결과를 확인해 능력치가 올라요. 포인트만 내고 카드는 그대로예요. 특수 카드(올스타·골든글러브·EX 등)는 못 가요. 유학 결과는 카드마다 하나만 남아요. 다시 보내면 이전 결과는 지워지고 새 결과로 바뀌어요(초기화하면 결과 없이 원래 능력치로). 코스트 낮을수록 효율↑: 상승치는 1코 ×1.6 ~ 5코 ×1 ~ 10코 ×0.2, 한 번에 오르는 한도는 1코 +30 ~ 5코 +20 ~ 10코 +4예요. 기록은 평범했지만 세부 지표가 좋았던 선수(잠재력↑)는 유학 상승치·한도와 장비 보너스가 25~50% 더 붙어요. </p>
 ${abMapHTML(d)}<div class="abl"><div class="box"><h3 style="margin-top:0">${d[1]}</h3>${abOpen(d)?`<p class="abm" title="${ABR[d[0]][0].map((p,i)=>ABGN[i]+' '+p+'%'+(i<3?' (+'+ABR[d[0]][1][i]+')':'')).join(' · ')}"><span>${d[3]}시간</span><span>대성공 +${ABR[d[0]][1][0]}</span><span${ABR[d[0]][0][3]?' class="risk"':''}>실패 ${ABR[d[0]][0][3]}%</span><span>${d[5].map(k=>SKN[k]).filter((v,i,a)=>a.indexOf(v)===i).join('·')}</span></p>
  <div class="abpick">${pick?`<div>${card(pick,{stats:1})}</div><div><p style="margin:0 0 6px"><b>${esc(pick.name)}</b> ${pick.year} ${esc(pick.team)}</p><p class="note" style="margin:0 0 6px">${abUsed(pick)?`현재 유학 결과 <b>+${abUsed(pick)}</b> · 다시 보내면 새 결과로 바뀌어요 · `:''}한 번에 최대 +${abCapC(pick)} · 효율 ×${+(abMul(pick.cost)*potMul(pick)).toFixed(2)}${pick.pz?` · <b style="color:var(--gold)">숨은 잠재력 +${pick.pz*25}%</b>`:''}</p>${(()=>{const o=ECON.studyOdds?ECON.studyOdds(d[0],pick.cost):null;return o?`<p class="note" style="margin:0 0 6px">이 선수 확률 · 대성공 ${o[0]}% · 성공 ${o[1]}% · 보통 ${o[2]}% · 실패 ${o[3]}%${pick.cost<=5?' <b style="color:var(--gold)">(저코스트 보정)</b>':''}</p>`:''})()}
   <button data-a="absend" ${ok?'':'disabled'}>${d[3]}시간 유학 보내기 · ${fee.toLocaleString()}P</button>${U.has(pick.id)?'<p class="note" style="color:var(--bad);margin:6px 0 0">1군에 등록된 선수예요 · 라인업에서 빼면 보낼 수 있어요</p>':''}${S.pt<fee?'<p class="note" style="color:var(--bad);margin:6px 0 0">포인트 부족</p>':''}${!abAge(pick)?`<p class="note" style="color:var(--bad);margin:6px 0 0">${pick.v?'특수 카드 유학 불가':ageOf(pick)+'세 · 유학 불가 (25세 이하 또는 35세 이상)'}</p>`:''}${abUsed(pick)?`<div class="tools" style="margin-top:8px"><button class="ghost" data-abreset="pt" ${S.pt<rf?'disabled':''}>유학 초기화 · ${rf.toLocaleString()}P</button><button class="ghost" data-abreset="tix" ${rt?'':'disabled'}>초기화권 사용 (${rt}장)</button></div><p class="note" style="margin:4px 0 0">유학으로 오른 능력치 +${abUsed(pick)}을 모두 지워요</p>`:''}</div>`:'<p class="note" style="grid-column:1/-1;margin:0">선수 선택</p>'}</div>
  <div class="tools" style="margin:14px 0 6px"><h3 style="margin:0">보낼 선수</h3><input id="abq" value="${esc(aq)}" placeholder="선수 이름" aria-label="선수 검색" style="max-width:12em"><span class="hvt"><button class="ghost${only?' on':''}" data-a="abonly" aria-pressed="${only}">보낼 수 있는 선수만</button></span><span class="note" style="margin:0">${cand.length.toLocaleString()}명</span></div><div class="abc">${cand.sort((a,b)=>okC(b)-okC(a)||abAge(b)-abAge(a)||b.ovr-a.ovr).slice(0,alim).map(c=>`<button class="abr${c.id===S.abPick?' on':''}${okC(c)?'':' no'}" data-abpick="${esc(c.id)}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><span><b>${esc(c.name)}</b><small>${c.year} · ${ageOf(c)}세${abAge(c)?'':' · 유학 불가'}${U.has(c.id)?' · 1군 등록 중':''}${abUsed(c)?` · 현재 +${abUsed(c)}`:''}${c.pz?' · 잠재력↑':''}</small></span></button>`).join('')||'<p class="note">해당 선수 없음</p>'}</div>${cand.length>alim?`<div class="tools" style="justify-content:center;margin-top:8px"><button class="ghost" data-a="abmore">더 보기 (${(cand.length-alim).toLocaleString()})</button></div>`:''}`
  :`<p class="note">잠김. 여는 조건: <b>${d[6]}</b></p>`}</div></div>
 <h3>유학 중</h3><div class="abq">${S.ab.filter(a=>!a.got).map(a=>{const c=by[a.id],x=abd(a.d),done=now>=a.end,pc=Math.min(100,(now-a.start)/(a.end-a.start)*100);
  return `<div class="abi${done?' done':''}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><div><b>${esc(c.name)}</b> <small>${x[1]}</small><span class="abbar"><i style="width:${pc}%"></i></span>
  ${a.res?`<p class="abres"><b>${a.res.g}</b> ${Object.entries(a.res.st).map(([k,v])=>`${SKN[k]} +${v}`).join(' · ')||(a.res.g==='실패'?'오른 능력 없음':'더 오를 수 없음')}</p><button class="ghost" data-abok="${esc(a.id)}">확인</button>`:done?`<button data-abget="${esc(a.id)}">결과 보기</button>`:`<small>${hm(a.end-now)} 남음 · 돌아오면 알림</small><button class="ghost abrush" data-abrush="${esc(a.id)}" ${S.pt<rushFee(a.end-now)?'disabled':''}>바로 귀국 · ${rushFee(a.end-now).toLocaleString()}P</button>`}</div></div>`}).join('')||'<p class="note">유학 중인 선수 없음</p>'}</div></section>`}
function abAct(D){if(D.abd){S.abSel=D.abd;return 1}if(D.abpick){S.abPick=D.abpick;return 1}
 if(D.abget){const a=abOf(D.abget);a.res=abRoll(a);const c=by[a.id];S.abSt=S.abSt||{};S.abSt[c.id]={...a.res.st}; // 덮어쓰기(SJ 2026-11-26): 다시 보내면 이전 유학 결과를 지우고 새 결과로
 S.abHist=S.abHist||{};(S.abHist[c.id]=S.abHist[c.id]||[]).push({d:a.d,g:a.res.g,st:a.res.st});S.abSum=S.abSum||{};S.abSum[c.id]=Object.values(a.res.st).reduce((t,v)=>t+v,0);return 1}
 if(D.abok){abOf(D.abok).got=1;return 1}
 if(D.abreset){const c=by[S.abPick];if(!c||abOf(c.id)||!abUsed(c))return 1;if(D.abreset==='tix'){if(!((S.tix||{}).abr>0))return 1;S.tix.abr--}else if(ECON.pay(S,ECON.abResetFee(c.cost)).err){S.msg='포인트 부족';return 1}
  for(const k of ['abSt','abSum','abHist'])if(S[k])delete S[k][c.id];S.msg=`${c.name} 유학 초기화 완료`;return 1}
 if(D.a==='absend'){abSend();return 1}
 if(D.abrush){const a=abOf(D.abrush),f=rushFee(a.end-Date.now());if(ECON.pay(S,f).err)return 1;a.end=Date.now();return 1}
 return 0}
function synList(pool,mk){return `<div class="scroll"><table class="tbl lul synl"><thead><tr><th></th><th class="l">선수</th><th>연도·구단</th><th>포지션</th><th>능력</th><th>코스트</th><th>같은 선수</th><th>블록</th><th>잠금</th></tr></thead><tbody>
 ${pool.map(x=>{const c=x.c,lk=isLocked(lkey('p',x)),on=mk.has(x.key);return `<tr class="${on?'on':''}${lk?' use':''}" ${lk?'':`data-mat="${esc(x.key)}" role="button" tabindex="0"`}><td>${on?'✓':''}</td><td class="l"><b>${esc(c.name)}</b>${c.v?` <small>${esc(vnm(c)||c.v)}</small>`:''}${c.dup?' <small>중복</small>':''}</td><td>${c.year} ${esc(c.team)}</td><td>${PFULL[c.pos]||c.pos}</td><td><b>${c.ovr}</b></td><td>${c.cost}</td><td>${dupN(c)}</td><td>${hasBlk(c.id)?'있음':''}</td><td><button class="ghost lockt" data-lock="${esc(lkey('p',x))}" aria-pressed="${lk}" aria-label="${lk?'잠금 해제':'잠그기'}">${LOCKI(lk)}</button></td></tr>`}).join('')||'<tr><td colspan="9">재료 없음</td></tr>'}</tbody></table></div>`}
// 스킬 블록 자동 합성(SJ 2026-11-26): 원하는 등급·능력치 블록이 나올 때까지 같은 종류 블록을 계속 합성
// 재료: 장착 안 됨·잠금 아님·재료 최대 등급 이하. 짝 고르기: 같은 등급 2개 중 가장 낮은 등급부터(같은 등급이면 60%로 한 단계 위) → 없으면 낮은 등급+다음 등급(높은 쪽 등급으로 능력치만 다시 뽑기)
// 목표 등급 미만에서만 쓰면 등급이 안 올라가는 짝은 건너뜀. 결과가 목표면 멈춤, 아니면 재료 최대 등급 이하일 때 다시 재료로
const BAU0={t:'P',key:'ctl',g:'A',max:'B'},BAU_MAX=300,GO='CBAS';
const bauHit=(b,o)=>b.t===o.t&&GO.indexOf(b.g)>=GO.indexOf(o.g)&&(b.st[o.key]||0)>0&&Object.entries(b.st).sort((x,y)=>y[1]-x[1])[0][0]===o.key;
function bauPool(o){const L=new Set(S.locks||[]);return S.blocks.filter(b=>!b.on&&b.t===o.t&&!L.has('b'+b.u)&&GO.indexOf(b.g)<=GO.indexOf(o.max)&&!bauHit(b,o))}
function bauRun(){const o={...BAU0,...(S.bau||{})};if(GO.indexOf(o.max)<GO.indexOf(o.g)-1){S.bauRes={err:`재료를 ${o.max}등급까지만 쓰면 ${o.g}등급이 나올 수 없어요. 같은 등급 2개를 합쳐야 한 단계 올라가요.`};return}
  let n=0,used=0,hit=null;const made={};
  while(n<BAU_MAX){const P=bauPool(o),by={};for(const b of P)(by[b.g]=by[b.g]||[]).push(b);
    let pair=null;for(const g of GO)if((by[g]||[]).length>=2&&GO.indexOf(g)<GO.indexOf(o.g)+(o.max===o.g?1:0)){pair=by[g].slice(0,2);break}
    if(!pair){const gs=GO.split('').filter(g=>(by[g]||[]).length);if(gs.length>=2&&GO.indexOf(gs[1])>=GO.indexOf(o.g))pair=[by[gs[0]][0],by[gs[1]][0]]}
    if(!pair)break;const r=synth('b',pair,(S.locks||[]).filter(x=>!/~\d+$/.test(x)));if(r.err)break;
    const us=new Set(pair.map(b=>b.u));S.blocks=S.blocks.filter(b=>!us.has(b.u));S.blocks.push(r.out);n++;used+=2;made[r.out.g]=(made[r.out.g]||0)+1;
    if(bauHit(r.out,o)){hit=r.out;break}}
  S.bauRes={n,used,hit,made,left:bauPool(o).length};S.synRes=null;S.mat=[];if(n)save()}
function bauHTML(){const o={...BAU0,...(S.bau||{})},K=o.t==='B'?BK:PKEY,P=bauPool(o),cnt=GO.split('').map(g=>`${g} ${P.filter(b=>b.g===g).length}`).join(' · '),R=S.bauRes,sel=(k,opts)=>`<select data-bau="${k}" aria-label="${k}">${opts.map(([v,n])=>`<option value="${v}"${String(o[k])===v?' selected':''}>${esc(n)}</option>`).join('')}</select>`;
  return `<div class="box bau" style="margin-top:12px"><h3 style="margin:0 0 6px">자동 합성 <small>원하는 블록이 나올 때까지</small></h3>
  <div class="tools" style="flex-wrap:wrap;gap:6px">${sel('t',[['B','타자용'],['P','투수용']])}${sel('key',K.map(x=>[x,SKN[x]||x]))}${sel('g',[['B','B등급 이상'],['A','A등급 이상'],['S','S등급']])}<small style="align-self:center">재료는</small>${sel('max',[['C','C등급까지'],['B','B등급까지'],['A','A등급까지'],['S','S등급까지']])}<button data-a="bau-go" ${P.length<2||GO.indexOf(o.max)<GO.indexOf(o.g)-1?'disabled':''}>자동 합성 시작</button></div>${GO.indexOf(o.max)<GO.indexOf(o.g)-1?`<p class="note" style="color:#ff8a7a;margin:6px 0 0">재료를 ${o.max}등급까지만 쓰면 ${o.g}등급이 나올 수 없어요. 합성은 같은 등급 2개일 때만 한 단계 올라가요.</p>`:''}
  <p class="note" style="margin:6px 0 0">쓸 수 있는 재료 ${P.length}개 (${cnt}) · 장착·잠금 블록과 이미 목표에 맞는 블록은 안 써요. 같은 등급 2개는 60%로 한 단계 올라가고, 능력치는 무작위(${o.t==='B'?'타자 7종':'투수 6종'} 중 하나)예요.</p>
  ${R?R.err?`<p class="note" style="color:#ff8a7a">${esc(R.err)}</p>`:`<p class="note" aria-live="polite">${R.hit?`<b>성공!</b> ${R.n}번 합성 만에 <b>${R.hit.g}등급 ${esc(bname(R.hit))}</b> (${Object.entries(R.hit.st).map(([x,v])=>SKN[x]+'+'+v).join(' ')})`:`<b>재료가 떨어져 멈췄어요.</b> ${R.n}번 합성`} · 재료 ${R.used}개 사용 · 만들어진 등급 ${Object.entries(R.made).map(([g,v])=>g+' '+v).join(', ')||'-'} · 남은 재료 ${R.left}개</p>`:''}</div>`}
function vSynth(){const k=S.sk||'p',pool=synPoolF(k),mk=new Set(S.mat),m=pool.filter(x=>mk.has(x.key)),err=synCheck(k,m);
 return `<section class="band"><h2>합성</h2><div class="subnav" role="tablist">${Object.entries(SYN).map(([x,v])=>`<button role="tab" aria-selected="${k===x}" class="${k===x?'on':''}" data-sk="${x}">${v.n}</button>`).join('')}</div>
 <div class="syn${k==='p'?' sticky':''}"><div class="sslots">${[...Array(NEED(k)).keys()].map(i=>m[i]?`<div class="ss${k==='p'?' sm':''}" data-mat="${esc(m[i].key)}" title="빼기">${k==='p'?`<span class="oart" style="--tc:${m[i].c.col}">${photo(m[i].c,0,0)}</span><b>${esc(m[i].c.name)}</b><small>${String(m[i].c.year).slice(2)}' ${esc(m[i].c.team)} · 코스트 ${m[i].c.cost}</small>`:m[i].html}</div>`:'<div class="ss empty">재료</div>').join('<span class="plus">+</span>')}<span class="plus">→</span>
 <div class="ss res">${S.synRes?`<div class="got">${S.synRes}</div>`:`<b>${m.length===NEED(k)&&!err?esc(synPreview(k,m)):'?'}</b><small>${err?esc(err):'예상 결과'}${k==='p'&&m.some(x=>hasBlk(x.c.id))?' · 끼운 스킬 블록도 소멸':''}</small>`}</div></div>
 <div class="tools" style="justify-content:center;margin-top:12px"><button data-a="synth" data-hk="2" ${err?'disabled':''}>합성하기</button><button class="ghost" data-a="synauto" data-hk="1">자동 추천</button><button class="ghost" data-a="synclr" data-hk="3">재료 비우기</button><button class="ghost qbtn${S.synHelp?' on':''}" data-a="synhelp" aria-label="합성 방식 설명" aria-pressed="${!!S.synHelp}">?</button></div>
 ${k==='p'?`<div class="tools synex" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:4px" title="합성 결과로 안 나왔으면 하는 구단(최대 ${SYN_EX_MAX}개)"><small style="align-self:center;min-width:64px">결과 제외</small>${SYN_LINES.map(l=>{const on=(S.synEx||[]).includes(l);return `<button class="ghost${on?' on':''}" data-synex="${esc(l)}" aria-pressed="${on}" title="${esc(SYN_LN[l]||l)} 계열 결과에서 제외" style="padding:2px 8px;font-size:12px${on?';text-decoration:line-through':''}">${esc(SYN_LN[l]||l)}</button>`}).join('')}</div><div class="tools synex" style="justify-content:center;margin-top:8px;flex-wrap:wrap;gap:4px" title="재료 목록·자동 추천에서 숨길 구단(개수 제한 없음)"><small style="align-self:center;min-width:64px">재료 제외</small>${SYN_LINES.map(l=>{const on=(S.synExM||[]).includes(l);return `<button class="ghost${on?' on':''}" data-synexm="${esc(l)}" aria-pressed="${on}" title="${esc(SYN_LN[l]||l)} 계열 재료에서 제외" style="padding:2px 8px;font-size:12px${on?';text-decoration:line-through':''}">${esc(SYN_LN[l]||l)}</button>`}).join('')}</div>`:''}${k==='b'?bauHTML():''}
 ${S.msg?`<p class="note" style="text-align:center" aria-live="polite">${esc(S.msg)}</p>`:''}${S.synHelp?`<p class="note synrule">${esc(SYN[k].rule)}</p>`:''}</div>
 <h3 style="margin-top:18px">재료로 쓸 수 있는 ${SYN[k].n} <span class="pill">${pool.length}</span></h3>${k==='p'?synFilt()+`<div class="tabs" role="tablist" aria-label="보기 방식" style="margin:6px 0">${[['card','카드'],['list','일람']].map(([v,n])=>`<button role="tab" aria-selected="${(S.synView||'card')===v}" class="${(S.synView||'card')===v?'on':''}" data-a="synview" data-v="${v}">${n}</button>`).join('')}</div>`:''}${k==='p'&&(S.synView==='list'||S.work)?synList(pool,mk):`<div class="mpool">${pool.map(x=>{const lk=isLocked(lkey(k,x));return `<div class="mpw"><div class="mp${mk.has(x.key)?' on':''}${lk?' locked':''}" ${lk?'aria-disabled="true"':`data-mat="${esc(x.key)}" role="button" tabindex="0"`}>${x.html}${lk?'<span class="lockb" role="img" aria-label="잠김">'+LOCKI(1)+'</span>':''}</div><button class="ghost lockt" data-lock="${esc(lkey(k,x))}" aria-pressed="${lk}" aria-label="${lk?'잠금 해제':'잠그기'}" title="${lk?'잠금 해제':'잠그기'}">${LOCKI(lk)}</button></div>`}).join('')||'<p class="note">재료 없음</p>'}</div>`}
 <p class="note help">자물쇠로 잠근 카드는 재료·자동 추천 제외. 재료 선수의 스킬 블록도 함께 소멸.</p></section>`}
const pick2=a=>a[Math.floor(Math.random()*a.length)];
// 추천 라인업: 보유 카드로 자동 편성 (능력 우선 / 덱 효과 우선 / 코스트 절약). 코스트 상한 150 안에서
const bv=c=>c.r.con*.35+c.r.pow*.35+c.r.eye*.2+c.r.spd*.1;
// 코스트 페널티 cp를 이분 탐색: 상한 안에 들어가는 가장 작은 cp(=예산을 최대한 씀)
// Again 우승년도 목표(t.ycap): 해마다 최대 ycap명만 세므로, 넘친 해의 약한 선수를 모자란 해의 선수로 바꿈(코스트 상한 안에서)
function recCap(r,t){if(!t||!t.ycap)return r;const sl=[...r.lu.map((x,i)=>['lu',i]),...r.rot.map((x,i)=>['rot',i]),...r.pen.map((x,i)=>['pen',i]),...r.bench.map((x,i)=>['bench',i])],get=([k,i])=>k==='lu'?r.lu[i][1]:r[k][i],set=([k,i],id)=>{if(k==='lu')r.lu[i][1]=id;else r[k][i]=id};
 const pool=REC_ALL?CARDS:OWN.filter(c=>!c.dup&&!abOf(c.id));
 for(let it=0;it<40;it++){const yc={};for(const s of sl){const c=byId[get(s)];if(c&&t.m(c))yc[c.year]=(yc[c.year]||0)+1}const over=Object.keys(yc).find(y=>yc[y]>t.ycap);if(!over)break;
  const names=new Set(sl.map(s=>get(s)).filter(Boolean).map(id=>byId[id].on||byId[id].name)),room=COST_CAP-recCost(r);let ok=false;
  const outs=sl.filter(s=>{const c=byId[get(s)];return c&&t.m(c)&&c.year===+over}).sort((a,b)=>(a[0]==='bench'?-1:0)-(b[0]==='bench'?-1:0)||byId[get(a)].ovr-byId[get(b)].ovr);
  const cur=sl.map(s=>byId[get(s)]).filter(Boolean),wc=cur.filter(c=>t.wild&&t.wild(c)).length,exT=new Set(cur.filter(c=>c.v==='EX').map(c=>c.type));
  for(const s of outs){const o=byId[get(s)];const c=pool.filter(c=>(t.m(c)&&c.year!==+over&&(yc[c.year]||0)<t.ycap||t.wild&&wc<2&&t.wild(c)&&!(c.v==='EX'&&exT.has(c.type)))&&c.type===o.type&&!names.has(c.on||c.name)&&c.cost<=o.cost+room&&(s[0]==='lu'?canPos(c,r.lu[s[1]][0]):s[0]==='rot'?c.pos==='SP':true)).sort((a,b)=>b.ovr-a.ovr)[0];
   if(c){set(s,c.id);ok=true;break}}
  if(!ok)break}
 return r}
// 벤치 백업 포수 1명 고정: 추천 결과 벤치에 포수 가능 선수가 없으면 가장 약한(팀컬러 비해당 우선) 벤치 타자와 교체, 1번 칸에 배치
function recBenchC(r,t){const has=r.bench.findIndex(id=>id&&canPos(byId[id],'C')&&byId[id].type==='B');if(has>=0){if(has>0)r.bench.unshift(r.bench.splice(has,1)[0]);return r}
 const pool=REC_ALL?CARDS:OWN.filter(c=>!c.dup&&!abOf(c.id)),ids=[...r.lu.map(x=>x[1]),...r.bench,...r.rot,...r.pen].filter(Boolean),names=new Set(ids.map(id=>byId[id].on||byId[id].name)),room=COST_CAP-recCost(r);
 const yc={};if(t&&t.ycap)for(const id of ids){const c=byId[id];if(t.m(c))yc[c.year]=(yc[c.year]||0)+1}
 const slots=r.bench.map((id,i)=>[i,id?byId[id]:null]).sort((a,b)=>(!a[1]?-1:0)-(!b[1]?-1:0)||(t&&a[1]&&t.m(a[1])?1:0)-(t&&b[1]&&t.m(b[1])?1:0)||((a[1]?a[1].ovr:0)-(b[1]?b[1].ovr:0)));
 for(const [i,o] of slots){const oc=o?o.cost:0,c=pool.filter(c=>c.type==='B'&&c.v!=='EX'&&canPos(c,'C')&&!names.has(c.on||c.name)&&c.cost<=oc+room&&!(t&&o&&t.m(o)&&!t.m(c))&&!(t&&t.ycap&&t.m(c)&&(yc[c.year]||0)-(o&&t.m(o)&&o.year===c.year?1:0)>=t.ycap)).sort((a,b)=>(t&&t.m(b)?1:0)-(t&&t.m(a)?1:0)||b.ovr-a.ovr)[0];
  if(c){r.bench.splice(i,1);r.bench.unshift(c.id);break}}
 return r}
function recommend(mode){const t=recFx();return recBenchC(recCap(recommend0(mode),t),t)}
function recommend0(mode){let r=recommend1(mode,0);if(recCost(r)<=COST_CAP)return r;let lo=0,hi=recFx()&&recFx().must?40:12,best=recommend1(mode,hi);for(let i=0;i<14;i++){const m=(lo+hi)/2,x=recommend1(mode,m);if(recCost(x)<=COST_CAP){hi=m;best=x}else lo=m}return best}
const RF0={year:'all',team:'all',fx:''},recFx=()=>FX_T_BY[(S.recF||RF0).fx||''],recMatch=c=>{const f=S.recF||RF0,t=recFx();return (f.year==='all'||c.year===+f.year)&&(f.team==='all'||c.team===f.team)&&(!t||t.m(c)||c.v==='EX'&&(!t.ls||t.ls.includes(c.line)))},recOn=()=>{const f=S.recF||RF0;return f.year!=='all'||f.team!=='all'||!!recFx()};
// 덱 짜보기 '전체 카드로 추천'(SJ 2026-11-25): 보유와 상관없이 전체 카드에서 같은 방식으로 추천
let REC_ALL=0;function recommendAll(fx){const keep=S.recF;S.recF={...RF0,fx:fx||''};REC_ALL=1;try{let r=recommend('power');if(recCost(r)>COST_CAP){REC_ALL=2;r=recommend('power')}return recBenchC(recFix(recStar(r,recFx()),recFx()),recFx())}finally{S.recF=keep;REC_ALL=0}}
// FA 이적 목표: 그 선수(t.s)가 주전에 없으면 같은 자리에 설 수 있는 가장 약한 주전과 바꿔 넣음(코스트 상한 안에서)
function recStar(r,t){if(t&&t.must){for(const e of t.must){const [n,y]=e.split(':'),nm=n.split('@')[0];r=recStar(r,{s:nm,m:t.mhit?c=>t.mhit(c,e):c=>t.m(c)&&(!y||c.year===+y),keep:new Set(t.must.map(e=>e.split(/[:@]/)[0]))})}return r}if(!t||!t.s)return r;const ids=[...r.lu.map(x=>x[1]),...r.rot,...r.pen].filter(Boolean);if(ids.some(id=>byId[id]&&(byId[id].on||byId[id].name)===t.s&&t.m(byId[id])))return r;
 const sl=[...r.lu.map((x,i)=>['lu',i]),...r.rot.map((x,i)=>['rot',i]),...r.pen.map((x,i)=>['pen',i])],get=([k,i])=>k==='lu'?r.lu[i][1]:r[k][i],set=([k,i],id)=>{if(k==='lu')r.lu[i][1]=id;else r[k][i]=id};
 const room=COST_CAP-recCost(r),C=CARDS.filter(c=>(c.on||c.name)===t.s&&t.m(c)&&c.v!=='EX').sort((a,b)=>b.ovr-a.ovr);
 for(const c of C)for(const s of sl.filter(s=>{const o=byId[get(s)];return o&&o.type===c.type&&o.v!=='EX'&&!(t.keep&&t.keep.has(o.on||o.name))&&c.cost<=o.cost+room&&(s[0]==='lu'?canPos(c,r.lu[s[1]][0]):s[0]==='rot'?c.pos==='SP':true)}).sort((a,b)=>byId[get(a)].ovr-byId[get(b)].ovr)){const o=byId[get(s)];if(t.q&&t.q[o.line]&&o.line!==c.line)continue;set(s,c.id);r.bench=r.bench.filter(id=>!id||(byId[id].on||byId[id].name)!==t.s);return r}
 return r}
// 계보별 최소 인원(t.q)이 모자라면 벤치 포함 25명 중(2026-11-26 SJ: 팀컬러 25명 기준) 남는 계보의 낮은 능력 선수를 같은 자리에 설 수 있는 부족 계보 선수로 바꿈(코스트 상한 안에서)
function recFix(r,t){if(!t||!t.q)return r;const sl=[...r.lu.map((x,i)=>['lu',i]),...r.rot.map((x,i)=>['rot',i]),...r.pen.map((x,i)=>['pen',i]),...r.bench.map((x,i)=>['bench',i])],get=([k,i])=>k==='lu'?r.lu[i][1]:r[k][i],set=([k,i],id)=>{if(k==='lu')r.lu[i][1]=id;else r[k][i]=id};
 for(let it=0;it<30;it++){const lc={};for(const s of sl){const c=byId[get(s)];if(c){const l=c.v==='RN'||c.v==='EX'?'*':c.line;lc[l]=(lc[l]||0)+1}}const lc2={...lc};delete lc2['*'];const top=Object.entries(lc2).sort((a,b)=>b[1]-a[1])[0];if(top&&lc['*'])lc2[top[0]]+=lc['*'];
  const ql=Object.keys(t.q),need=ql.find(l=>(lc[l]||0)<t.q[l])||(ql.reduce((x,l)=>x+(lc2[l]||0),0)<25?ql.sort((a,b)=>(lc2[a]||0)-(lc2[b]||0))[0]:null);if(!need)break;
  const names=new Set([...r.lu.map(x=>x[1]),...r.bench,...r.rot,...r.pen].filter(Boolean).map(id=>byId[id].name)),room=COST_CAP-recCost(r);let ok=false;
  const dn=f=>sl.filter(s=>{const c=byId[get(s)];return c&&c.v!=='EX'&&!(c.name===t.s&&t.m(c))&&f(c)}).sort((a,b)=>byId[get(a)].ovr-byId[get(b)].ovr),don=dn(c=>c.v!=='RN'&&(!(c.line in t.q)||(lc[c.line]||0)>t.q[c.line]&&c.line!==need));
  for(const s of don.length?don:dn(c=>c.v==='RN')){const o=byId[get(s)];
   const c=CARDS.filter(c=>c.line===need&&c.type===o.type&&c.v!=='EX'&&c.v!=='RN'&&!names.has(c.name)&&c.cost<=o.cost+room&&(s[0]==='lu'?canPos(c,r.lu[s[1]][0]):s[0]==='rot'?c.pos==='SP':true)).sort((a,b)=>b.ovr-a.ovr)[0];
   if(c){set(s,c.id);ok=true;break}}
  if(!ok)break}
 return r}
function recommend1(mode,cp){const own=exTrim([...new Map([...(REC_ALL?(recFx()&&REC_ALL===1&&!recFx().loose?CARDS.filter(recMatch):CARDS):OWN.filter(c=>!c.dup&&!abOf(c.id)))].sort((x,y)=>(recMatch(x)-recMatch(y))||x.ovr-y.ovr).map(c=>[c.name+c.type,c])).values()]);
 const yc={};for(const c of own){const k=c.year+' '+c.team;yc[k]=(yc[k]||0)+1}const topY=Object.entries(yc).sort((a,b)=>b[1]-a[1])[0][0];
 const w=c=>(mode==='deck'&&c.year+' '+c.team===topY?15:0)-(mode==='cost'?c.cost*4:0)-cp*c.cost+(recOn()&&recMatch(c)?40:0)+(recFx()&&recFx().s&&(c.on||c.name)===recFx().s&&recFx().m(c)?80:0)+(recFx()&&recFx().must&&(recFx().mhit?recFx().must.some(e=>recFx().mhit(c,e)):recFx().m(c))?200:0);
 const B=own.filter(c=>c.type==='B'),P=own.filter(c=>c.type==='P'),used2=new Set(),lu=[];
 for(const p of ['C','SS','CF','2B','3B','RF','LF','1B']){const cand=B.filter(c=>!used2.has(c.id)&&canPos(c,p)).map(c=>[c,(c.ps&&c.ps[p]!=null?c.ps[p]*.5:-1e9)+bv(c)*.8+w(c)]).sort((a,b)=>b[1]-a[1])[0];if(cand){used2.add(cand[0].id);lu.push([p,cand[0].id])}}
 const dh=B.filter(c=>!used2.has(c.id)).sort((a,b)=>bv(b)+w(b)-bv(a)-w(a))[0];if(dh){used2.add(dh.id);lu.push(['DH',dh.id])}
 // 타순: 클린업 적성 4명(장타 점수 순, 4번 최고) → 테이블세터 적성 2명 → 나머지 하위. 적성자가 모자라면 남은 선수 중 점수 높은 순
 const pool2=[...lu],take=(role,n)=>{const sc=x=>boKey(by[x[1]],role==='L'?'C':role);const out=[];for(const pref of [1,0]){for(const x of pool2.filter(x=>!pref||by[x[1]].bo.includes(role)).sort((a,b)=>sc(b)-sc(a))){if(out.length>=n)break;out.push(x);pool2.splice(pool2.indexOf(x),1)}}return out};
 const cl=take('C',4),ts=take('T',2),lo=take('L',3);
 const ord=[ts[0],ts[1],cl[1],cl[0],cl[2],cl[3],...lo].filter(Boolean);
 const bench=B.filter(c=>!used2.has(c.id)).sort((a,b)=>bv(b)+w(b)-bv(a)-w(a)).slice(0,5).map(c=>c.id);
 const sp=P.filter(c=>c.pos==='SP').sort((a,b)=>b.ovr+w(b)-a.ovr-w(a)),rp=P.filter(c=>!sp.slice(0,5).includes(c)).sort((a,b)=>b.ovr+w(b)-a.ovr-w(a));
 const rot=sp.slice(0,5).map(c=>c.id),pen=rp.slice(0,6).map(c=>c.id);
 const pad=(a,n)=>[...a,...Array(Math.max(0,n-a.length)).fill(null)];
 return {lu:ord,bench:pad(bench,5),rot:pad(rot,5),pen:pad(pen,6)}}
function recCost(r){return [...r.lu.map(x=>x[1]),...r.bench,...r.rot,...r.pen].filter(Boolean).reduce((s,id)=>s+by[id].cost,0)}
function recPanel(){if(!S.recm)return '';const r=recommend(S.recm),cost=recCost(r),cur=new Set(used()),nw=[...r.lu.map(x=>x[1]),...r.bench,...r.rot,...r.pen].filter(Boolean),inn=nw.filter(id=>!cur.has(id)),out=[...cur].filter(id=>!nw.includes(id));
 return `<div class="rec box"><div class="tools"><h3 style="margin:0;margin-right:auto">추천 라인업 미리보기</h3>${[['power','능력 우선'],['deck','덱 효과 우선'],['cost','코스트 절약']].map(([k,n])=>`<button class="${S.recm===k?'':'ghost'}" data-rec="${k}">${n}</button>`).join('')}</div>
 ${(()=>{const f=S.recF||RF0,ys=[...new Set(OWN.map(c=>c.year))].sort((a,b)=>b-a),ts=[...new Set(OWN.filter(c=>f.year==='all'||c.year===+f.year).map(c=>c.team))].sort(),o=(v,n,cur)=>`<option value="${esc(v)}"${String(cur)===String(v)?' selected':''}>${esc(n)}</option>`;
  const m=r=>[...r.lu.map(x=>x[1]),...r.bench,...r.rot,...r.pen].filter(Boolean).filter(id=>by[id]&&recMatch(by[id])).length;
  return `<div class="tools recf"><span class="note" style="margin:0">조건</span><select id="recy" aria-label="추천 연도">${o('all','전체 연도',f.year)}${ys.map(y=>o(y,y+'년',f.year)).join('')}</select><select id="rect" aria-label="추천 구단">${o('all','전체 구단',f.team)}${ts.map(t=>o(t,t,f.team)).join('')}</select><select id="recx" aria-label="목표 덱 효과">${o('','덱 효과 지정 안 함',f.fx||'')}${[...new Set(FX_TARGETS.map(t=>t.g))].map(g=>`<optgroup label="${esc(g)}">${FX_TARGETS.filter(t=>t.g===g).map(t=>o(t.k,t.n,f.fx||'')).join('')}</optgroup>`).join('')}</select>${recOn()?`<span class="note" style="margin:0">조건에 맞는 선수 ${m(r)}명 · 나머지는 다른 카드로 채움</span>`:''}${(()=>{const fx=teamColor([...r.lu.map(x=>x[1]),...r.rot,...r.pen].filter(Boolean).map(id=>byId[id]).filter(Boolean),undefined,(r.bench||[]).filter(Boolean).map(id=>byId[id]).filter(Boolean)).fx;return `<span class="note" style="margin:0">덱 효과 ${fx.length?fx.map(x=>esc(x.name)+' '+x.g).join(', '):'없음'}</span>`})()}</div>`})()}
 <p class="rsum">타순 ${r.lu.map((x,i)=>`<span><b>${i+1}</b>${PN[x[0]]} ${esc(by[x[1]].name)}</span>`).join('')}</p>
 <p class="rsum">선발 ${r.rot.filter(Boolean).map(id=>`<span>${esc(by[id].name)}</span>`).join('')} · 마무리 <span>${r.pen[0]?esc(by[r.pen[0]].name):'–'}</span></p>
 <p class="note">코스트 ${cost}/${COST_CAP} ${cost>COST_CAP?'· 상한 초과':''} · 새로 들어오는 선수 ${inn.length}명${inn.length?` (${inn.slice(0,4).map(id=>esc(by[id].name)).join(', ')}${inn.length>4?' 외':''})`:''} · 빠지는 선수 ${out.length}명</p>
 <div class="tools"><button data-a="recapply" ${cost>COST_CAP?'disabled':''}>이대로 적용</button><button class="ghost" data-a="recclose">닫기</button></div></div>`}
// 스킬 화면: 왼쪽 1군 선수 목록, 가운데 선택 선수의 스킬 칸(장착 가능), 오른쪽 보유 블록
function vSkill(){const tb=S.sktb||'B',list=used().map(id=>by[id]).filter(c=>c.type===tb),c=by[S.skc]&&by[S.skc].type===tb?by[S.skc]:list[0];if(c)S.skc=c.id;
 return `<section class="band"><h2>스킬</h2><div class="tools"><div class="tabs">${[['B','야수'],['P','투수']].map(([k,n])=>`<button class="${tb===k?'on':''}" data-sktb="${k}">${n}</button>`).join('')}</div><a href="#synth" data-sk2="b"><button class="ghost">스킬 블록 합성</button></a></div>
 <div class="skl"><div class="skp">${list.map(x=>{const n=S.blocks.filter(b=>b.on===x.id).length;return `<button class="skr${x.id===S.skc?' on':''}" data-skc="${esc(x.id)}"><span class="oart" style="--tc:${x.col}">${photo(x,0,0)}</span><span><b>${esc(x.name)}</b><small>${x.year} · ${PFULL[x.pos]}</small></span><i>${n?n+'개':''}</i></button>`}).join('')}</div>
 <div class="skface" data-skflip="1" title="카드를 누르면 앞/뒷면이 바뀝니다">${c?`<div class="tools skft"><div class="tabs">${[[0,'뒷면 (스킬 칸)'],[1,'앞면 (능력치)']].map(([v,n])=>`<button class="${(S.skf|0)===v?'on':''}" data-skflip="${v?'f':'b'}">${n}</button>`).join('')}</div></div>${S.skf?skFront(c):backFace(c,1)}`:''}</div><div>${c?`<h3>${esc(c.name)}에게 넣을 블록</h3>${blkInv(c)}`:''}</div></div></section>`}
// 타선 분석: 타순별 공격력과 그 자리 수비 적성
// 인접 궁합: 타순에서 바로 앞뒤 타자(9번-1번도 이어짐)와
//  팀: 같은 팀·연도 +2, 연도는 달라도 같은 계보 +1 / 출신: 같은 고교 +3, 같은 대학 +2, 같은 지역 +1 (가장 큰 것) → 팀 + 출신 합산
//  경기 엔진은 점수 1당 교타·장타·선구 +0.15% (core2.js ADJ_PCT)
function adjPair(a,b){if(!a||!b)return null;const w=[];let v=0;
 if(sameTY(a,b)){v+=AJ.yt;w.push('같은 팀')}else if(a.line===b.line){v+=AJ.ln;w.push('같은 계보')}
 if(a.hs&&a.hs===b.hs){v+=AJ.hs;w.push('같은 고교 '+a.hs)}else if(a.un&&a.un===b.un){v+=AJ.un;w.push('같은 대학 '+a.un)}else if(a.rg&&a.rg===b.rg){v+=AJ.rg;w.push('같은 지역 '+a.rg)}
 return v?{v,why:w.join('·')}:null}
function luPow(i){const [p,id]=S.lu[i],c=by[id];if(!c)return {v:0,ok:1,adj:0};const raw=Math.round(bv(c)),ok=boOk(c,i),n=S.lu.length;
 const adj=[(i+n-1)%n,(i+1)%n].reduce((t,j)=>{const q=adjPair(c,by[S.lu[j][1]]);return t+(q?q.v:0)},0);
 return {raw,adj,base:ok?raw:Math.round(raw*BO_PEN),v:(ok?raw:Math.round(raw*BO_PEN))+adj,ok}}
function lineupChart(){const L=S.lu.map((x,i)=>luPow(i)),n=S.lu.length,bad=L.map((x,i)=>x.ok?null:i).filter(x=>x!==null),loss=L.reduce((t,x)=>t+x.raw-x.base,0);
 const links=S.lu.map((x,i)=>{const j=(i+1)%n,q=adjPair(by[x[1]],by[S.lu[j][1]]);return q?{i,j,...q}:null}).filter(Boolean),gain=links.reduce((t,q)=>t+q.v*2,0);
 return `<p class="note help" style="margin:0 0 6px">타순별 공격력 · 테이블세터: 출루율 .330+ · 클린업: OPS .700+ (100타석+) · 1~6번 적성 밖 -10%, 7~9번 무관 · 앞뒤 타자 궁합: 같은 팀 +2(같은 계보 +1), 같은 고교 +3·대학 +2·지역 +1, 9번-1번도 이어짐</p>
 ${lineChart(L,links)}`}
// 꺾은선 그래프: 타순별 공격력(적성 페널티·인접 궁합 반영). 빨간 점 = 적성 밖, 파란 점 = 인접 궁합
function lineChart(L,links){const W=360,H=170,px=i=>24+i*(W-40)/8,lo=Math.min(50,...L.map(x=>x.v))-5,hi=Math.max(95,...L.map(x=>x.v))+3,py=v=>12+(hi-v)/(hi-lo)*(H-44);
 const pts=L.map((x,i)=>[px(i),py(x.v)]),zone=(a,b,t)=>`<rect x="${px(a)-12}" y="4" width="${px(b)-px(a)+24}" height="${H-30}" rx="6" fill="rgba(255,255,255,${t})"/>`;
 return `<svg class="lch" viewBox="0 0 ${W} ${H}" role="img" aria-label="타순별 공격력 꺾은선 그래프">${zone(0,1,.06)}${zone(2,5,.03)}${zone(6,8,.06)}
 ${[60,70,80,90].filter(v=>v>lo&&v<hi).map(v=>`<line x1="14" x2="${W-6}" y1="${py(v)}" y2="${py(v)}" stroke="rgba(255,255,255,.08)"/><text x="2" y="${py(v)+3}" class="lty">${v}</text>`).join('')}
 ${links.map(q=>q.j===q.i+1?`<line x1="${pts[q.i][0]}" y1="${pts[q.i][1]}" x2="${pts[q.j][0]}" y2="${pts[q.j][1]}" stroke="#5aa9ff" stroke-width="6" stroke-linecap="round" opacity=".35"/>`:'').join('')}
 <polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>
 ${L.map((x,i)=>{const c=by[S.lu[i][1]];return `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${x.ok?4.5:6}" fill="${!x.ok?'var(--bad)':x.adj?'#5aa9ff':'var(--gold)'}" stroke="#1b1d1c" stroke-width="1.5"><title>${i+1}번 ${c?esc(c.name):''} ${x.v}${x.ok?'':' (적성 밖 -10%)'}${x.adj?' (인접 +'+x.adj+')':''}</title></circle><text x="${pts[i][0]}" y="${pts[i][1]-9}" class="ltv">${x.v}</text>
 <text x="${pts[i][0]}" y="${H-16}" class="ltx">${i+1}</text><text x="${pts[i][0]}" y="${H-4}" class="ltn">${c?esc(c.name):''}</text>`}).join('')}</svg>`}
function luList(pool,ids,dupC,B,rec){const keys=B?BK:PKEY,st=!!S.luStat,f3=v=>v.toFixed(3).replace(/^0/,''),E='-';
 const SH=B?['타율','출루율','타수','안타','홈런','타점','볼넷','도루']:['평균자책','이닝','승','세이브','탈삼진','자책'];
 const SV=c=>{const r=rec&&rec(c);if(!r)return SH.map(()=>E);return B?[r.ab?f3(r.h/r.ab):'-',f3((r.h+r.bb)/Math.max(1,r.ab+r.bb)),r.ab,r.h,r.hr,r.rbi,r.bb,r.sb]:[r.outs?(r.er*27/r.outs).toFixed(2):'-',`${Math.floor(r.outs/3)}.${r.outs%3}`,r.w,r.sv,r.so,r.er]};
 // 폰(좁은 화면): 선수·포지션·능력 + 고른 묶음(3칸)만 보이고 나머지 칸은 숨김 (SJ 2026-11-26)
 const H=st?SH:['코스트',...keys.map(k=>SKN[k]),'장수'],G=[];for(let k=0;k<H.length;k+=3)G.push([k,Math.min(H.length,k+3)]);const gi=Math.min(G.length-1,Math.max(0,(S.luCol|0))),[g0,g1]=G[gi];
 const oc=(k,v,h)=>`<${h?'th':'td'} class="o${k>=g0&&k<g1?' sel':''}${v==='-'&&!h?' mute':''}">${v}</${h?'th':'td'}>`;
 const vals=c=>st?SV(c):[c.cost,...keys.map(k=>c.r[k]),dupC[c.id]?'×'+(dupC[c.id]+1):'1'];
 return `<div class="lucolw"><label>보이는 기록 <select id="lucol" aria-label="보이는 기록">${G.map(([a,b],x)=>`<option value="${x}"${x===gi?' selected':''}>${H.slice(a,b).join(' · ')}</option>`).join('')}</select></label></div>
 <div class="scroll"><table class="tbl lul"><thead><tr><th class="l">선수</th><th class="yc">연도·구단</th><th>포지션</th><th>능력</th>${H.map((h,k)=>oc(k,h,1)).join('')}<th>상태</th></tr></thead><tbody>
 ${pool.map(c=>`<tr class="${ids.has(c.id)?'use':''}" role="button" tabindex="0" draggable="true" data-drag="c:${esc(c.id)}" data-pick="${esc(c.id)}"><td class="l"><b>${esc(c.name)}</b>${!st&&c.v?` <small>${esc(vnm(c)||c.v)}</small>`:''}<small class="mo">${String(c.year).slice(2)}' ${esc(c.team)}</small></td><td class="yc">${c.year} ${esc(c.team)}</td><td><span class="pf">${PFULL[c.pos]||c.pos}</span><span class="pa">${c.pos}</span></td><td><b>${c.ovr}</b></td>${vals(c).map((v,k)=>oc(k,v)).join('')}<td>${ids.has(c.id)?'1군':''}</td></tr>`).join('')}</tbody></table></div>${st?`<p class="note">${S.luStat==='yl'?'연도별 리그':'주간 리그'} 이번 시즌 내 구단 기록.</p>`:''}`}
// 저장 덱 표시(SJ 2026-11-25): 없는 카드가 있으면 가상덱(감상·목표용)으로 보유 장수 표시
const deckMgr=d=>{const m=MG.find(x=>x.id===(d.t.mgr||S.team.mgr));return m?m.n:''};
const deckTag=d=>{const ids=deckIds(d.t),own=ids.filter(id=>S.owned[id]).length;return own<ids.length?` · 가상 (보유 ${own}/${ids.length})`:deckOk(d)?'':' (지금 사용 불가)'};
// 라인업 좌상단 덱 이름 + 저장(SJ 2026-11-26)
function luDeckHTML(){const cur=S.deckSel&&(S.decks||[]).find(x=>x.id===S.deckSel);return `<div class="ludk"><input id="ludn" placeholder="${cur?esc(cur.name):'덱 이름'}" maxlength="14" aria-label="덱 이름" value="${esc(S.deckName||'')}"><button data-a="decknew" data-hk="2" title="지금 라인업·벤치·투수진·감독을 새 덱으로 저장">덱으로 저장</button>${cur?`<button class="ghost" data-a="decksave" title="고른 덱 '${esc(cur.name)}'에 지금 라인업 덮어쓰기">덮어쓰기</button>`:''}</div>`}
function presetBar(){const D=S.decks||[],M=S.modeDeck||{},cur=S.deckSel&&D.find(x=>x.id===S.deckSel);
 const opt=(v,n,sel)=>`<option value="${esc(v)}"${String(sel||'')===String(v)?' selected':''}>${esc(n)}</option>`;
 return `<div class="box presets"><div class="tools"><b style="margin-right:4px">덱 저장</b><select id="decksel" aria-label="저장한 덱">${opt('','저장한 덱 고르기',S.deckSel)}${D.map(d=>opt(d.id,d.name+' · '+deckMgr(d)+deckTag(d),S.deckSel)).join('')}</select>${cur?`<label class="mdk">감독 <select id="deckmgr" aria-label="이 덱의 감독">${MG.map(m=>opt(m.id,m.n,cur.t.mgr||S.team.mgr)).join('')}</select></label>`:''}
 <button data-a="deckload" ${cur?'':'disabled'}>불러오기</button><button class="ghost" data-a="decksave" ${cur?'':'disabled'}>덮어쓰기</button><button class="ghost" data-a="deckren" ${cur?'':'disabled'} title="오른쪽 이름 칸에 쓴 이름으로 바꿔요">이름 바꾸기</button><button class="ghost" data-a="deckdel" ${cur?'':'disabled'}>${S.deckDel?'한 번 더 누르면 삭제':'삭제'}</button>
 <span style="flex:1"></span><input id="deckname" placeholder="덱 이름 (새 덱/이름 바꾸기)" maxlength="14" style="max-width:190px" value="${esc(S.deckName||'')}"><button data-a="decknew">지금 라인업을 새 덱으로</button></div>
 </div>`}
function deckAct(a){const D=S.decks=S.decks||[],d=D.find(x=>x.id===S.deckSel);
 if(a==='decknew'){S.pdetOpen=1;const n=(S.deckName||'').trim()||`덱 ${D.length+1}`;const id='d'+Date.now().toString(36);D.push({id,name:n,t:snapT()});S.deckSel=id;S.deckName='';S.msg=`'${n}' 저장 완료`}
 else if(a==='deckren'&&d){const n=(S.deckName||'').trim();if(!n){S.msg='오른쪽 이름 칸에 새 이름을 쓰고 눌러 주세요';document.getElementById('deckname')?.focus()}else{const o=d.name;d.name=n;S.deckName='';S.msg=`'${o}' → '${n}' 이름 변경`}}
 else if(a==='decksave'&&d){d.t=snapT();S.msg=`'${d.name}' 덮어쓰기 완료`}
 else if(a==='deckload'&&d){const xe=exErr(deckIds(d.t));if(!deckIds(d.t).every(id=>S.owned[id]&&!(S.ab||[]).some(a=>a.id===id&&!a.got))){const B=bldInit(),t=d.t,L=t.lineup||[],pad=(x,n)=>[...(x||[]),...Array(n).fill(null)].slice(0,n);B.lu=L.length===9?L.map(x=>[x.pos,x.id]):BLD_POS.map(p=>[p,null]);B.bench=pad(t.bench,5);B.rot=pad(t.rot,5);B.pen=pad(t.pen,6);B.fxsel=[...(t.fxsel||[])];B.mgr=t.mgr||'';S.bldSel=null;S.msg=`'${d.name}'에 없는 카드가 있어 덱 화면에서 열었어요`;save();location.hash='builder';render();return}Object.assign(S.team,JSON.parse(JSON.stringify(d.t)));pullTeam();S.msg=`'${d.name}' 불러오기 완료`+(xe.length?` · ${xe.join(' · ')}. EX 교체 후 덮어쓰기`:'')}
 else if(a==='deckdel'&&d){if(!S.deckDel){S.deckDel=1;render();return}S.decks=D.filter(x=>x!==d);S.deckGone=[...(S.deckGone||[]),d.id].slice(-200);for(const k in S.modeDeck||{})if(S.modeDeck[k]===d.id)S.modeDeck[k]='';S.deckSel='';S.deckDel=0}
 save();render()}
// ===== 덱 짜보기: 보유 여부와 관계없이 전체 카드로 25명을 짜 보고 코스트·덱 효과를 확인 =====
const BLD_POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
function bldInit(){const B=S.bld=S.bld||{};if(!B.lu)B.lu=BLD_POS.map(p=>[p,null]);B.bench=B.bench||[null,null,null,null,null];B.rot=B.rot||[null,null,null,null,null];B.pen=B.pen||[null,null,null,null,null,null];B.fxsel=B.fxsel||[];return B}
const bldIds=()=>{const B=bldInit();return [...B.lu.map(x=>x[1]),...B.bench,...B.rot,...B.pen].filter(Boolean)};
const bldCards=()=>bldIds().map(id=>byId[id]).filter(Boolean);
const bldStart=()=>{const B=bldInit();return [...B.lu.map(x=>x[1]),...B.rot,...B.pen].filter(Boolean).map(id=>byId[id]).filter(Boolean)};
function bldSlotGet(k){const [a,i]=k.split(':'),B=bldInit();return a==='lu'?B.lu[+i][1]:B[a][+i]}
function bldSlotSet(k,id){const [a,i]=k.split(':'),B=bldInit();if(a==='lu')B.lu[+i][1]=id;else B[a][+i]=id}
function bldPut(id){const c=byId[id],B=bldInit();if(!c)return;const selId=S.bldSel?bldSlotGet(S.bldSel):null;if(bldIds().some(x=>x!==selId&&byId[x]&&byId[x].pk===c.pk&&byId[x].type===c.type)){S.msg=`${c.name}은(는) 이미 포함 · 바꾸려면 그 선수 자리를 먼저 선택`;return}
 let k=S.bldSel;if(k){const [a]=k.split(':');if((a==='rot'||a==='pen')!==(c.type==='P')){S.msg=c.type==='P'?'투수는 선발·불펜만 가능':'타자는 타순·벤치만 가능';return}}
 if(!k){const free=a=>B[a].map((v,i)=>v?null:a+':'+i).filter(Boolean);
  if(c.type==='B'){const i=B.lu.findIndex(x=>!x[1]&&canPlay(c,x[0]));k=i>=0?'lu:'+i:free('bench')[0]}
  else k=(c.pos==='SP'?free('rot')[0]||free('pen')[0]:free('pen')[0]||free('rot')[0])}
 if(!k){S.msg='빈 자리 없음. 바꿀 자리 먼저 선택';return}bldSlotSet(k,id);S.bldSel=null;S.msg=''}
// 덱 짜보기 카드 보기: 라인업 화면과 같은 줄(야수 타순·벤치 / 투수 선발›중계·셋업·마무리) 모양. 보유와 무관하게 전체 카드(byId)
function boc(k,lab,o={}){const c=byId[bldSlotGet(k)],sel=S.bldSel===k?' sel':'',under=`<span class="olab ${o.cls||''}" style="white-space:nowrap">${lab}${c?` <button class="ghost bx" data-bclr="${k}" aria-label="빼기" style="padding:0 6px;min-height:0">×</button>`:''}</span>`;
 if(!c)return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb empty${sel}" data-bslot="${k}">비어 있음</button>${under}</div>`;
 return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb${sel}" style="--tc:${c.col}" data-bslot="${k}" aria-label="${esc(lab)} ${esc(c.name)}"><span class="oart">${photo(c,0,0)}${c.v?`<span class="fxo fx-${c.v}" aria-hidden="true"></span>`:''}${c.v?`<i class="ovb v-${c.v}">${c.v==="IR"?"철인":c.v}</i>`:''}<i class="oovr">${c.ovr}</i>${S.owned[c.id]?'':'<i class="sbadge" title="보유하지 않은 카드" style="background:var(--gold);color:#111">미보유</i>'}</span><span class="onm" title="${c.year} ${esc(c.name)}"><span class="oy">${String(c.year).slice(2)}'</span>${esc(c.name)}</span><span class="osub t-${c.tier}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${PFULL[c.pos]}${c.tw?'·겸업':''}<i class="ost">★${c.cost}</i></span></button>${under}</div>`}
function bldStrips(B){return `<div class="strip"><div class="sh">야수</div><div class="row scroll">${B.lu.map((x,i)=>boc('lu:'+i,PFULL[x[0]],{num:(i+1)+'번'})).join('')}<span class="gap"></span>${B.bench.map((x,i)=>boc('bench:'+i,'벤치',{num:(i+1)+'번'})).join('')}</div></div>
 <div class="strip"><div class="sh">투수</div><div class="row scroll">${B.rot.map((x,i)=>(i?'<span class="arr" aria-hidden="true">›</span>':'')+boc('rot:'+i,'선발',{num:(i+1)+'번',cls:'sp'})).join('')}<span class="gap"></span>${[2,3,4,5].map((j,n)=>boc('pen:'+j,'중계',{num:(n+1)+'번',cls:'rp'})).join('')}<span class="gap"></span>${boc('pen:1','셋업',{cls:'su'})}${boc('pen:0','마무리',{cls:'cl'})}</div></div>`}
function vBuilder(){const B=bldInit(),cards=bldCards(),ids=new Set(bldIds()),cost=cards.reduce((t,c)=>t+c.cost,0),ex=exCount([...ids]),own=cards.filter(c=>S.owned[c.id]).length,T=teamColor(bldStart(),B.fxsel,(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean)),F=S.bldF=S.bldF||{};
 const row=(k,lab,sub)=>{const id=bldSlotGet(k),c=byId[id];return `<tr class="${S.bldSel===k?'sel':''}${c&&!S.owned[c.id]?' noown':''}" data-bslot="${k}" role="button" tabindex="0"><td class="l"><b>${lab}</b>${sub?` <small>${sub}</small>`:''}</td>${c?`<td class="l">${esc(c.name)}${c.v?` <small>${esc(vnm(c)||c.v)}</small>`:''}</td><td>${c.year} ${esc(c.team)}</td><td>${c.ovr}</td><td>${c.cost}</td><td>${S.owned[c.id]?'보유':'<span class="mute">없음</span>'}</td><td><button class="ghost bx" data-bclr="${k}" aria-label="빼기">×</button></td>`:'<td class="l mute" colspan="6">비어 있음</td>'}</tr>`};
 const yA=F.y?+F.y:0,yB=F.y2?+F.y2:9999,yLo=Math.min(yA,yB),yHi=Math.max(yA,yB),yIn=c=>c.year>=yLo&&c.year<=yHi;
 const pool=(()=>{const q=(F.q||'').trim();let L=CARDS.filter(c=>yIn(c)&&(!F.t||c.team===F.t)&&(!F.p||(F.p==='P'?c.type==='P':F.p==='B'?c.type==='B':c.pos===F.p))&&(!F.own||S.owned[c.id])&&(!F.ab||abAge(c))&&(!q||c.name.includes(q))&&(!F.v||(F.v==='n'?!c.v:c.v===F.v))&&(!F.c||c.cost>=+F.c)&&(!F.c2||c.cost<=+F.c2));
  const SO={ovr:(a,b)=>b.ovr-a.ovr||b.cost-a.cost,clo:(a,b)=>a.cost-b.cost||b.ovr-a.ovr,chi:(a,b)=>b.cost-a.cost||b.ovr-a.ovr,ynew:(a,b)=>b.year-a.year||b.ovr-a.ovr,yold:(a,b)=>a.year-b.year||b.ovr-a.ovr,name:(a,b)=>a.name.localeCompare(b.name,'ko')||a.year-b.year};
  return L.sort(SO[F.s]||SO.ovr)})(),lim=S.bldLim||40;
 const YS=[...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a),TS=[...new Set(CARDS.filter(yIn).map(c=>c.team))].sort(),o=(v,n,cur)=>`<option value="${esc(v)}"${String(cur||'')===String(v)?' selected':''}>${esc(n)}</option>`;
 const full=cards.length===25,allOwn=full&&own===25;
 return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">덱</h2><button class="ghost" data-a="bldfrom">지금 라인업 가져오기</button><button class="ghost" data-a="bldclr">${S.bldClr?'한 번 더 누르면 비움':'모두 비우기'}</button><button data-a="bldapply" ${allOwn?'':'disabled'} title="${allOwn?'':'25명 모두 보유해야 적용 가능'}">라인업에 적용</button><button class="ghost" data-a="bldsave" ${full?'':'disabled'}>덱으로 저장</button></div>
 <div class="tools bshare"><b>공유</b><button class="ghost" data-a="bldcode" ${cards.length?'':'disabled'}>공유 코드 복사</button><button class="ghost" data-a="bldimg" ${cards.length?'':'disabled'}>덱 이미지 저장</button><input id="bldimp" placeholder="받은 공유 코드 붙여넣기" aria-label="공유 코드" value=""><button class="ghost" data-a="bldimp">코드로 불러오기</button>${S.bldCode?`<input readonly class="bcode" value="${esc(S.bldCode)}" aria-label="내 공유 코드" onclick="this.select()">`:''}${S.bldImpMsg?`<span class="note" style="margin:0">${esc(S.bldImpMsg)}</span>`:''}</div>
 <div class="tools" style="margin-top:8px"><select data-bf="rx" aria-label="추천 목표 덱 효과">${o('','덱 효과 지정 안 함',F.rx)}${[...new Set(FX_TARGETS.map(t=>t.g))].map(g=>`<optgroup label="${esc(g)}">${FX_TARGETS.filter(t=>t.g===g).map(t=>o(t.k,t.n,F.rx)).join('')}</optgroup>`).join('')}</select><button class="ghost" data-a="bldrec">전체 카드로 추천</button><span class="note" style="margin:0">없는 선수도 포함해 코스트 ${COST_CAP} 안에서 채움. 지금 짠 덱은 바뀜</span></div>
 <div class="bsum"><span>코스트 <b class="${cost>COST_CAP?'bad':''}">${cost}</b>/${COST_CAP}</span><span>인원 <b>${cards.length}</b>/25</span><span>보유 <b>${own}</b>/${cards.length}</span><span>EX 타자 <b class="${ex.B>EX_MAX.B?'bad':''}">${ex.B}</b>/${EX_MAX.B} · 투수 <b class="${ex.P>EX_MAX.P?'bad':''}">${ex.P}</b>/${EX_MAX.P}</span><span title="주전 20명 기준. 커리어하이는 ${CH_WILD}장까지 같은 계보 최다 연도에 합류, 영구결번은 모두 최다 연도·구단에 합류">${wildTxt(bldStart())}</span><span>덱 효과 야수 <b>+${T.bat}</b> · 투수 <b>+${T.pit}</b></span></div>
 ${fxPickHTML(bldStart(),B.fxsel,'bld')}
 ${S.msg?`<p class="note hint on" aria-live="polite">${esc(S.msg)}</p>`:''}
 ${S.bldView==='card'&&!S.work?bldStrips(B):''}<div class="bld"${S.bldView==='card'&&!S.work?' style="grid-template-columns:minmax(0,1fr)"':''}>${S.bldView==='card'&&!S.work?``:`<div class="scroll"><table class="tbl bslots"><thead><tr><th class="l">자리</th><th class="l">선수</th><th>연도·구단</th><th>능력</th><th>코스트</th><th>보유</th><th></th></tr></thead><tbody>
 ${B.lu.map((x,i)=>row('lu:'+i,(i+1)+'번',PFULL[x[0]])).join('')}${B.bench.map((x,i)=>row('bench:'+i,'벤치',i+1)).join('')}${B.rot.map((x,i)=>row('rot:'+i,'선발',i+1)).join('')}${B.pen.map((x,i)=>row('pen:'+i,i===0?'마무리':i===1?'셋업':'중계',i>1?i-1:'')).join('')}</tbody></table></div>`}
 <div><div class="tools bf"><select data-bf="y" aria-label="시작 연도">${o('','처음부터',F.y)}${YS.map(y=>o(y,y+'년',F.y)).join('')}</select><span style="align-self:center">~</span><select data-bf="y2" aria-label="끝 연도">${o('','끝까지',F.y2)}${YS.map(y=>o(y,y+'년',F.y2)).join('')}</select><select data-bf="t" aria-label="구단">${o('','전체 구단',F.t)}${TS.map(t=>o(t,t,F.t)).join('')}</select><select data-bf="p" aria-label="포지션">${o('','전체 포지션',F.p)}${o('B','타자 전체',F.p)}${o('P','투수 전체',F.p)}${Object.entries(PFULL).map(([k,n])=>o(k,n,F.p)).join('')}</select><select data-bf="c" aria-label="최소 코스트">${o('','코스트 1',F.c)}${[2,3,4,5,6,7,8,9,10].map(n=>o(n,'코스트 '+n,F.c)).join('')}</select><span style="align-self:center">~</span><select data-bf="c2" aria-label="최대 코스트">${o('','10',F.c2)}${[1,2,3,4,5,6,7,8,9].map(n=>o(n,String(n),F.c2)).join('')}</select><select data-bf="s" aria-label="정렬">${[['ovr','능력 높은 순'],['clo','코스트 낮은 순'],['chi','코스트 높은 순'],['ynew','최근 연도 순'],['yold','오래된 연도 순'],['name','이름 순']].map(([v,n])=>o(v,n,F.s||'ovr')).join('')}</select><select data-bf="v" aria-label="종류">${o('','모든 종류',F.v)}${o('n','일반',F.v)}${Object.entries(VN).map(([k,n])=>o(k,n,F.v)).join('')}</select><input data-bf="q" value="${esc(F.q||'')}" placeholder="이름" aria-label="이름 검색" style="max-width:110px"><label class="mini"><input type="checkbox" data-bf="own" ${F.own?'checked':''}> 보유만</label><label class="mini" title="카드 연도 기준 25세 이하 또는 35세 이상(철인·신인왕·영구결번 제외)"><input type="checkbox" data-bf="ab" ${F.ab?'checked':''}> 유학 가능만</label><span class="note" style="margin:0">${pool.length.toLocaleString()}장${S.bldSel?' · 고른 자리에 넣기':''}</span></div>
 <div class="tabs" role="tablist" aria-label="보기 방식" style="margin:6px 0">${[['list','일람'],['card','카드']].map(([v,n])=>`<button role="tab" aria-selected="${(S.bldView||'list')===v}" class="${(S.bldView||'list')===v?'on':''}" data-a="bldview" data-v="${v}">${n}</button>`).join('')}</div>
 ${S.bldView==='card'&&!S.work?`<div class="pool">${pool.slice(0,lim).map(c=>`<div class="pw" data-bput="${esc(c.id)}" role="button" tabindex="0" aria-label="${esc(c.name)} 덱에 넣기" style="cursor:pointer">${card(c,{dim:ids.has(c.id),inUse:ids.has(c.id),nocond:1})}${S.owned[c.id]?'':'<span class="dupn" title="보유하지 않은 카드" style="top:34px;bottom:auto;left:8px;right:auto">미보유</span>'}</div>`).join('')}</div>`:`<div class="scroll"><table class="tbl lul bpool"><thead><tr><th class="l">선수</th><th>연도·구단</th><th>포지션</th><th>능력</th><th>코스트</th><th>보유</th></tr></thead><tbody>
 ${pool.slice(0,lim).map(c=>`<tr class="${ids.has(c.id)?'use':''}" data-bput="${esc(c.id)}" role="button" tabindex="0"><td class="l"><b>${esc(c.name)}</b>${c.v?` <small>${esc(vnm(c)||c.v)}</small>`:''}</td><td>${c.year} ${esc(c.team)}</td><td>${PFULL[c.pos]||c.pos}</td><td><b>${c.ovr}</b></td><td>${c.cost}</td><td>${S.owned[c.id]?'보유':''}</td></tr>`).join('')}</tbody></table></div>`}
 ${pool.length>lim?`<div class="tools" style="justify-content:center;margin-top:8px"><button class="ghost" data-a="bldmore">더 보기 (${(pool.length-lim).toLocaleString()})</button></div>`:''}</div></div></section>`}
// ===== 덱 공유 (코드·이미지) =====
const b64e=t=>btoa(unescape(encodeURIComponent(t))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),b64d=t=>decodeURIComponent(escape(atob(t.replace(/-/g,'+').replace(/_/g,'/'))));
function bldEncode(B){return 'PHD1.'+b64e(JSON.stringify({l:B.lu,b:B.bench,r:B.rot,p:B.pen,f:B.fxsel||[]}))}
function bldDecode(code){const m=String(code||'').trim().match(/PHD1\.([A-Za-z0-9_-]+)/);if(!m)return null;try{const d=JSON.parse(b64d(m[1])),ok=id=>id&&byId[id]?id:null,pad=(a,n)=>[...(a||[]).map(ok),...Array(n).fill(null)].slice(0,n);let miss=0;const cnt=a=>(a||[]).forEach(id=>{if(id&&!byId[id])miss++});cnt((d.l||[]).map(x=>x[1]));cnt(d.b);cnt(d.r);cnt(d.p);
  return {lu:BLD_POS.map((p,i)=>{const x=(d.l||[])[i];return [x&&x[0]||p,x?ok(x[1]):null]}),bench:pad(d.b,5),rot:pad(d.r,5),pen:pad(d.p,6),fxsel:Array.isArray(d.f)?d.f:[],miss}}catch(e){return null}}
async function bldImage(B){try{await document.fonts.ready}catch(e){}
  const W=1080,H=1380,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d'),F='"IBM Plex Sans KR",sans-serif',FH='"Barlow Condensed","IBM Plex Sans KR",sans-serif';
  g.fillStyle='#0d3a27';g.fillRect(0,0,W,H);g.fillStyle='#195a3a';g.fillRect(0,0,W,150);
  const cards=bldCards(),cost=cards.reduce((t,c)=>t+c.cost,0),T=teamColor(bldStart(),B.fxsel,(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean));
  g.fillStyle='#ffd27a';g.font=`700 54px ${FH}`;g.fillText(S.team&&S.team.name||'내 덱',48,82);
  g.fillStyle='#d2e7d9';g.font=`500 26px ${F}`;g.fillText(`코스트 ${cost}/${COST_CAP} · ${cards.length}/25명 · 야수 +${T.bat} · 투수 +${T.pit}`,48,126);
  const fx=(T.fx||[]).map(f=>`${f.g} ${f.name||f.n||''}`).join('   ');if(fx){g.fillStyle='#fff';g.font=`600 22px ${F}`;g.fillText(fx.slice(0,70),48,186)}
  const col=(x,y,title,rows)=>{g.fillStyle='#ffd27a';g.font=`700 30px ${FH}`;g.fillText(title,x,y);y+=16;
    for(const [lab,id] of rows){const c=byId[id];y+=52;g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x,y-36,480,46);g.fillStyle='#a3c1af';g.font=`600 20px ${F}`;g.fillText(lab,x+12,y-6);
      if(c){g.fillStyle=c.col||'#888';g.fillRect(x+96,y-34,6,42);g.fillStyle='#fff';g.font=`700 24px ${F}`;g.fillText(c.name,x+112,y-6);const nw=g.measureText(c.name).width;if(c.v){g.fillStyle='#ffd27a';g.font=`600 15px ${F}`;g.fillText(vnm(c)||c.v,x+118+nw,y-7)}g.fillStyle='#a3c1af';g.font=`500 17px ${F}`;g.fillText(`${String(c.year).slice(2)}' ${c.team}`,x+300,y-6);
        g.fillStyle='#ff8a6a';g.font=`600 16px ${F}`;g.fillText('C'+c.cost,x+392,y-6);g.textAlign='right';g.fillStyle='#ffd27a';g.font=`700 26px ${FH}`;g.fillText(c.ovr,x+468,y-4);g.textAlign='left'}
      else{g.fillStyle='#6f8a7a';g.font=`500 20px ${F}`;g.fillText('비어 있음',x+112,y-6)}}return y};
  let y1=col(48,250,'타순',B.lu.map(([p,id],i)=>[`${i+1}번 ${p}`,id]));col(48,y1+70,'벤치',B.bench.map(id=>['벤치',id]));
  let y2=col(552,250,'선발',B.rot.map((id,i)=>[`선발 ${i+1}`,id]));col(552,y2+70,'불펜',B.pen.map((id,i)=>[i<4?`중계 ${i+1}`:i===4?'셋업':'마무리',id]));
  g.fillStyle='#6f8a7a';g.font=`500 18px ${F}`;g.fillText('프로호구 매니저 · 공유 코드로 같은 덱 불러오기 가능',48,H-36);
  window.__deckPng=cv.toDataURL('image/png');
  const blob=await new Promise(r=>cv.toBlob(r,'image/png')),name=`deck-${Date.now().toString(36)}.png`;
  try{const file=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'내 덱'});return 'shared'}}catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return 'saved'}
function bldAct(a){const B=bldInit();
 if(a==='bldcode'){S.bldCode=bldEncode(B);S.bldImpMsg='';navigator.clipboard?.writeText(S.bldCode).then(()=>{S.bldImpMsg='코드 복사됨';render()},()=>{S.bldImpMsg='옆 코드를 직접 복사';render()});render();return}
 if(a==='bldimg'){bldImage(B).then(r=>{S.bldImpMsg=r==='shared'?'이미지 공유':'이미지 저장';render()});return}
 if(a==='bldimp'){const d=bldDecode((document.getElementById('bldimp')||{}).value);if(!d){S.bldImpMsg='잘못된 코드';render();return}Object.assign(B,{lu:d.lu,bench:d.bench,rot:d.rot,pen:d.pen,fxsel:d.fxsel});S.bldCode='';S.bldImpMsg=d.miss?`불러옴 · 없는 카드 ${d.miss}장 제외`:'불러옴';save();render();return}
 if(a==='bldmore'){S.bldLim=(S.bldLim||40)+40}
 else if(a==='bldrec'){const fx=(S.bldF||{}).rx||'',r=recommendAll(fx),pad=(a,n)=>[...a,...Array(n).fill(null)].slice(0,n);B.lu=r.lu.map(([p,id])=>[p,id]);B.bench=pad(r.bench,5);B.rot=pad(r.rot,5);B.pen=pad(r.pen,6);B.fxsel=[];S.bldSel=null;const t=FX_T_BY[fx];if(t){const nm=t.k[0]==='N'||t.k[0]==='K'?t.n:t.k[0]==='F'?'FA 이적: '+t.s:t.k[0]==='L'?'단일구단':t.k==='S:AS'?'올스타덱':t.k==='S:GG'?'골든글러브덱':t.k.slice(2),x=(teamColor(bldStart(),[],(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean)).all||[]).find(x=>x.name===nm);if(x)B.fxsel=[x.key]}S.msg=`전체 카드 기준 추천으로 채움${t?' · 목표 '+t.n:''}. 마음에 들면 덱으로 저장`}
 else if(a==='bldclr'){if(!S.bldClr){S.bldClr=1;render();return}S.bld=null;S.bldClr=0;S.bldSel=null;bldInit()}
 else if(a==='bldfrom'){syncTeam();const T=S.team,L=T.lineup||[];B.lu=L.length===9?L.map(x=>[x.pos,x.id]):BLD_POS.map(p=>[p,null]);B.bench=[...(T.bench||[]),null,null,null,null,null].slice(0,5);B.rot=[...(T.rot||[]),null,null,null,null,null].slice(0,5);B.pen=[...(T.pen||[]),null,null,null,null,null,null].slice(0,6);B.fxsel=[...(T.fxsel||[])];B.mgr=T.mgr||'';S.msg='현재 라인업 불러옴'}
 else if(a==='bldapply'){if(bldCards().some(c=>!S.owned[c.id]))return;Object.assign(S.team,{lineup:B.lu.map(([pos,id])=>({id,pos})),bench:[...B.bench],rot:[...B.rot],pen:[...B.pen],fxsel:[...B.fxsel]});pullTeam();S.msg='라인업 적용 완료';save();go('lineup');return}
 else if(a==='bldsave'){const D=S.decks=S.decks||[],id='d'+Date.now().toString(36);D.push({id,name:'짜본 덱 '+(D.length+1),t:JSON.parse(JSON.stringify({lineup:B.lu.map(([pos,id])=>({id,pos})),bench:B.bench,rot:B.rot,pen:B.pen,fxsel:B.fxsel,mgr:B.mgr||S.team.mgr,tsel:S.team.tsel}))});S.msg=`'짜본 덱 ${D.length}' 저장 완료. 라인업 > 저장한 덱에서 확인`}
 save();render()}
function vLineup(){const sub=`<div class="subnav" role="tablist">${[['order','라인업'],['mgr','감독'],['tcard','작전 카드'],['sup','서포트 카드']].map(([k,n])=>`<button role="tab" aria-selected="${S.sub===k}" class="${S.sub===k?'on':''}" data-sub="${k}">${n}</button>`).join('')}</div>`;
 if(S.sub==='sup')return `<section class="band">${sub}<h2 style="margin-top:16px">서포트 카드</h2>${vSup()}</section>`;
 if(S.sub==='tcard')return `<section class="band">${sub}<h2 style="margin-top:16px">작전 카드</h2>${vTcard()}</section>`;
 if(S.sub==='mgr')return `<section class="band">${sub}<h2 style="margin-top:16px">감독 선택</h2>${vMgr()}</section>`;
 const ids=new Set(used()),B=S.tb==='B';
 const F=B?{all:c=>c.type==='B',C:c=>c.type==='B'&&c.pos==='C',IF:c=>c.type==='B'&&['1B','2B','3B','SS'].includes(c.pos),OF:c=>c.type==='B'&&['LF','CF','RF','DH'].includes(c.pos)}:{all:c=>c.type==='P',SP:c=>c.pos==='SP',RP:c=>c.pos==='RP'};
 const LF=S.lf||(S.lf={}),SL=S.luStat==='yl'?S.yl:S.luStat==='lg'?S.season:null,rec=c=>SL&&SL.ps&&SL.ps['0|'+c.id]||null,keys=B?BK:PKEY;
 const avg=c=>{const r=rec(c);return r&&r.ab?r.h/r.ab:-1},era=c=>{const r=rec(c);return r&&r.outs?r.er*27/r.outs:99},rv=(c,k)=>{const r=rec(c);return r?r[k]||0:-1};
 const ord={ovr:(a,b)=>b.ovr-a.ovr,cost:(a,b)=>b.cost-a.cost,costa:(a,b)=>a.cost-b.cost,year:(a,b)=>a.year-b.year,yeard:(a,b)=>b.year-a.year,name:(a,b)=>a.name.localeCompare(b.name),
  ...Object.fromEntries(keys.map(k=>['r_'+k,(a,b)=>b.r[k]-a.r[k]])),avg:(a,b)=>avg(b)-avg(a),hr:(a,b)=>rv(b,'hr')-rv(a,'hr'),rbi:(a,b)=>rv(b,'rbi')-rv(a,'rbi'),sb:(a,b)=>rv(b,'sb')-rv(a,'sb'),era:(a,b)=>era(a)-era(b),so:(a,b)=>rv(b,'so')-rv(a,'so'),w:(a,b)=>rv(b,'w')-rv(a,'w'),sv:(a,b)=>rv(b,'sv')-rv(a,'sv')};
 if(!ord[S.sort])S.sort='ovr';
 const pf=F[S.pf]?S.pf:'all',base=OWN.filter(F[pf]),teams=[...new Set(base.map(c=>c.team))].sort(),years=[...new Set(base.map(c=>c.year))].sort((a,b)=>b-a);
 if(S.fteam!=='all'&&!teams.includes(S.fteam))S.fteam='all';if(S.fyear!=='all'&&!years.includes(+S.fyear))S.fyear='all';
 const dupC={};for(const c of OWN)if(c.dup){const b=baseId(c.id);dupC[b]=(dupC[b]||0)+1}
 const lq=(LF.q||'').trim(),pool=base.filter(c=>!c.dup).filter(c=>(S.fteam==='all'||c.team===S.fteam)&&(S.fyear==='all'||c.year===+S.fyear)&&(!LF.cost||LF.cost==='all'||(LF.cost[0]==='='?c.cost===+LF.cost.slice(1):c.cost<=+LF.cost))&&(!LF.v||LF.v==='all'||(LF.v==='n'?!c.v:c.v===LF.v))&&(!LF.hand||LF.hand==='all'||(B?c.bh===LF.hand:c.ph===LF.hand))&&(!LF.reg||LF.reg==='all'||(LF.reg==='in')===ids.has(c.id))&&(!LF.ab||LF.ab==='all'||(LF.ab==='y')===!!abAge(c))&&(!lq||c.name.includes(lq))).sort(ord[S.sort]);
 const FN=B?[['all','전체 야수'],['C','포수'],['IF','내야수'],['OF','외야·지명']]:[['all','전체 투수'],['SP','선발'],['RP','불펜']];
 const SIDE=B?[['line','타선 분석'],['field','수비 위치']]:[['bat','배터리 분석']],side=SIDE.some(x=>x[0]===S.side)?S.side:SIDE[0][0];
 return `<section class="band">${sub}<div class="tools" style="margin-top:12px">${luDeckHTML()}${nextOpp()}<button class="ghost" data-a="luana" data-k="B" data-hk="3" style="margin-left:auto">타선 분석</button><button class="ghost" data-a="luana" data-k="P" data-hk="4">배터리 분석</button><button class="ghost" data-hk="1" data-rec="${S.recm||'power'}">추천 라인업</button>${S.undo?'<button class="ghost" data-a="recundo">되돌리기</button>':''}</div>${recPanel()}
 ${`<div class="strip${B?' cur':''}"><div class="sh" data-tb="B" title="아래 보유 카드를 야수로">야수</div><div class="row scroll">${S.lu.map((x,i)=>oc('lu',i,'',{num:(i+1)+'번',under:posSel(i)})).join('')}<span class="gap"></span>${S.bench.map((x,i)=>oc('bench',i,'벤치',{num:(i+1)+'번'})).join('')}</div></div>`
 +`<div class="strip pit${B?'':' cur'}"><div class="sh" data-tb="P" title="아래 보유 카드를 투수로">투수</div><div class="row scroll">${S.rot.map((x,i)=>(i?'<span class="arr" aria-hidden="true">›</span>':'')+oc('rot',i,'선발',{num:(i+1)+'번',cls:'sp'})).join('')}<span class="gap"></span>${[2,3,4,5].map((j,n)=>oc('pen',j,'중계',{num:(n+1)+'번',cls:'rp'})).join('')}<span class="gap"></span>${oc('pen',1,'셋업',{cls:'su'})}${oc('pen',0,'마무리',{cls:'cl'})}</div></div>`+tcRow()}
 ${deckBar()}<details class="pdet"${S.pdetOpen?' open':''}><summary>저장한 덱 · 모드별 덱${(S.decks||[]).length?` <small>(${S.decks.length}개)</small>`:''}</summary>${presetBar()}</details>
 <p class="note hint${S.sel||S.msg?' on':''}" aria-live="polite">${S.msg?esc(S.msg):S.sel?'바꿀 자리나 넣을 카드 선택. 같은 자리 다시 누르면 취소.':''}</p><p class="note help">${S.sel?'같은 줄의 다른 자리를 누르면 서로 바뀌고, 아래 보유 카드를 누르면 그 카드가 들어갑니다. 같은 자리를 다시 누르면 선택 해제.':'PC: 카드·자리를 끌어 놓아 교체 가능. 카드를 누르면 상세 정보가 뜨고, 거기서 [자리 교체하기]를 누른 다음 다른 자리(타순 교체·벤치 교대)나 보유 카드를 누르면 바뀝니다. 빈 자리는 바로 선택. 수비 위치는 카드 아래 메뉴에서 바꾸고, 메뉴 옆 등급은 그 위치 수비 적성입니다.'}</p></section>
 <section class="band lu2 one"><div><div class="tools"><h2 style="margin:0">보유 카드</h2><div class="tabs tb" role="tablist">${[['B','야수'],['P','투수']].map(([k,n])=>`<button role="tab" aria-selected="${S.tb===k}" class="${S.tb===k?'on':''}" data-tb="${k}">${n}</button>`).join('')}</div>
 <div class="tabs" role="tablist">${FN.map(([k,n])=>`<button role="tab" aria-selected="${pf===k}" class="${pf===k?'on':''}" data-pf="${k}">${n}</button>`).join('')}</div>
 <select id="sort" aria-label="정렬">${[['ovr','능력 순'],['cost','코스트 높은 순'],['costa','코스트 낮은 순'],['yeard','최신 연도 순'],['year','오래된 연도 순'],['name','이름 순'],...keys.map(k=>['r_'+k,SKN[k]+' 순']),...(B?[['avg','타율 순(리그)'],['hr','홈런 순(리그)'],['rbi','타점 순(리그)'],['sb','도루 순(리그)']]:[['era','평균자책 순(리그)'],['so','탈삼진 순(리그)'],['w','승 순(리그)'],['sv','세이브 순(리그)']])].map(([v,n])=>`<option value="${v}"${S.sort===v?' selected':''}>${n}</option>`).join('')}</select>
 <select id="fteam" aria-label="구단 필터"><option value="all">전체 구단</option>${teams.map(t=>`<option value="${esc(t)}" ${S.fteam===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
 <select id="fyear" aria-label="연도 필터"><option value="all">전체 연도</option>${years.map(y=>`<option value="${y}" ${String(S.fyear)===String(y)?'selected':''}>${y}</option>`).join('')}</select>
 ${(o=>`<select data-lf="cost" aria-label="코스트 필터">${o('all','전체 코스트',LF.cost)}${[3,5,7].map(n=>o(n,'★'+n+' 이하',LF.cost)).join('')}${[1,2,3,4,5,6,7,8,9,10].map(n=>o('='+n,'코스트 '+n,LF.cost)).join('')}</select>
 <select data-lf="v" aria-label="카드 종류">${o('all','모든 종류',LF.v)}${o('n','일반',LF.v)}${Object.entries(VN).map(([k,n])=>o(k,n,LF.v)).join('')}</select>
 <select data-lf="hand" aria-label="${B?'타석':'투구 손'}">${o('all',B?'모든 타석':'모든 투구',LF.hand)}${(B?[['R','우타'],['L','좌타'],['S','양타']]:[['R','우투'],['L','좌투']]).map(([k,n])=>o(k,n,LF.hand)).join('')}</select>
 <select data-lf="reg" aria-label="1군 등록">${o('all','1군 포함 전체',LF.reg)}${o('out','미등록만',LF.reg)}${o('in','1군만',LF.reg)}</select><select data-lf="ab" aria-label="유학">${o('all','유학 전체',LF.ab)}${o('y','유학 가능',LF.ab)}${o('n','유학 불가',LF.ab)}</select>`)((v,n,cur)=>`<option value="${esc(v)}"${String(cur||'all')===String(v)?' selected':''}>${esc(n)}</option>`)}
 <input data-lf="q" value="${esc(LF.q||'')}" placeholder="이름" aria-label="이름 검색" style="max-width:110px"><span class="pill">${pool.length}종</span><div class="tabs" role="tablist" aria-label="기록 기준">${[['','능력치'],['lg','주간 리그 기록'],['yl','연도별 리그 기록']].map(([k,n])=>`<button class="${(S.luStat||'')===k?'on':''}" data-a="lustat" data-v="${k}">${n}</button>`).join('')}</div><div class="tabs" role="tablist" aria-label="보기 방식" style="margin-left:auto">${[['card','카드'],['list','일람']].map(([k,n])=>`<button role="tab" aria-selected="${(S.luStat?'list':S.luView||'card')===k}" class="${(S.luStat?'list':S.luView||'card')===k?'on':''}" data-a="luview" data-v="${k}">${n}</button>`).join('')}</div></div>
 ${S.luView==='list'||S.work||S.luStat?luList(pool,ids,dupC,B,rec):`<div class="pool">${pool.map(c=>`<div class="pw">${card(c,{pick:1,dim:ids.has(c.id),inUse:ids.has(c.id)})}${dupC[c.id]?`<span class="dupn" title="같은 카드 ${dupC[c.id]+1}장">×${dupC[c.id]+1}</span>`:''}</div>`).join('')}</div>`}</div></section>${S.luAna?`<div class="modal luana"><div class="mbox" role="dialog" aria-modal="true" aria-label="분석"><div class="mhead"><div class="tabs" role="tablist" style="margin-right:auto">${SIDE.map(([k,n])=>`<button role="tab" aria-selected="${side===k}" class="${side===k?'on':''}" data-side="${k}">${n}</button>`).join('')}</div><button class="ghost" data-a="luana">닫기</button></div>
 <div style="margin-top:12px">${side==='bat'?batteryPanel():side==='line'?lineupChart():field()}</div></div></div>`:''}`}
const KIND=k=>k==='lu'||k==='bench'?'B':'P';
function getS(s){return s.k==='lu'?S.lu[s.i][1]:S[s.k][s.i]}
function setS(s,id){if(s.k==='lu')S.lu[s.i][1]=id;else S[s.k][s.i]=id}
// 수비 위치는 카드의 수비 적성(c.ps)에 있는 포지션과 지명타자만 가능
const canPos=(c,p)=>!c||p==='DH'||!!(c.ps&&c.ps[p]!=null);
const posName=(k,i)=>k==='lu'?S.lu[i][0]:null;
function swapSlots(a,b){const x=getS(a),y=getS(b);if(a.k==='lu'&&b.k==='lu'){[S.lu[a.i],S.lu[b.i]]=[S.lu[b.i],S.lu[a.i]];return}
 if(a.k==='lu'&&!canPos(by[y],S.lu[a.i][0])){S.msg=`${by[y].name}은(는) ${PFULL[S.lu[a.i][0]]}수비 불가.`;return}
 if(b.k==='lu'&&!canPos(by[x],S.lu[b.i][0])){S.msg=`${by[x].name}은(는) ${PFULL[S.lu[b.i][0]]}수비 불가.`;return}
 setS(a,y);setS(b,x)}
function place(id){const s=S.sel;if(!s)return;const c=by[id];if(c.type!==KIND(s.k))return;if(abOf(c.id)){S.msg=`${c.name}은(는) 유학 중 · 사용 불가.`;return}if(s.k==='lu'&&!canPos(c,S.lu[s.i][0])){S.msg=`${c.name}은(는) ${PFULL[S.lu[s.i][0]]}수비 불가. 가능한 위치: ${['DH',...Object.keys(c.ps||{})].map(p=>PFULL[p]).join(', ')}`;return}
 const cur=getS(s);for(const k of ['lu','bench','rot','pen']){const n=k==='lu'?S.lu.length:S[k].length;for(let i=0;i<n;i++)if(getS({k,i})===id)setS({k,i},cur)}setS(s,id);S.sel=null}
function setPos(i,p){const c=by[S.lu[i][1]];if(!canPos(c,p))return;const j=S.lu.findIndex(x=>x[0]===p);if(j>=0){const o=by[S.lu[j][1]];if(!canPos(o,S.lu[i][0])){S.msg=`${o.name}은(는) ${PFULL[S.lu[i][0]]}수비 불가 · 위치 교환 불가.`;return}S.lu[j][0]=S.lu[i][0]}S.lu[i][0]=p}
// 구종 그림: 공을 가운데 두고 휘는 방향에 구종을 놓음 (우투수, 투수 시점)
const PDIR={직구:-90,포심:-90,투심:150,싱커:135,커터:-30,슬라이더:0,커브:45,파워커브:45,슬러브:20,체인지업:120,포크:90,스플리터:90,너클볼:-150,서클체인지업:120,SFF:90};
// 지금 등급: 카드 능력치 + 덱 효과(1군일 때) + 스킬 블록으로 오른 변화(직구는 구속)만큼 구종 등급이 올라감(SS·SSS·SSS+까지)
function ptNow(c){if(c.type!=='P')return [];const d=deckFx(),bn=used().includes(c.id)?d.pit||0:0,sk=skillOf(c.id),t=k=>Math.min(120,c.r[k]+bn+(sk[k]||0));return ptGrades(c,t('brk'),t('vel'))}
// 카드 상세 수비 위치: 구장 다이아몬드 위에 포지션별 적성·수비력 표시
const FXY={C:[150,203],'1B':[222,140],'2B':[190,98],SS:[110,98],'3B':[78,140],LF:[58,52],CF:[150,30],RF:[242,52]};
function fieldMap(c){const col=f=>f==='X'?'#55615a':fitCls(f)==='A'?'#2f9e5e':f==='B'?'#c99a1c':'#c8513f';
 return `<svg viewBox="0 0 300 228" class="pmap fmap" role="img" aria-label="수비 위치별 적성"><rect width="300" height="228" rx="12" fill="var(--board)"/>
 <path d="M150 214 L18 82 Q150 -38 282 82 Z" fill="#245f3d"/><path d="M150 214 L18 82 Q150 -38 282 82 Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
 <path d="M150 210 L92 150 Q150 70 208 150 Z" fill="#9a6a43"/><path d="M150 196 L112 156 L150 118 L188 156 Z" fill="#2f7a4f"/>
 <circle cx="150" cy="158" r="5" fill="#9a6a43"/>${[[150,196],[188,156],[150,118],[112,156]].map(([x,y])=>`<rect x="${x-3}" y="${y-3}" width="6" height="6" fill="#fff" transform="rotate(45 ${x} ${y})"/>`).join('')}
 ${POS.filter(p=>p!=='DH'&&FXY[p]&&fit(c,p)!=='X').map(p=>{const f=fit(c,p),[x,y]=FXY[p],no=false;return `<g transform="translate(${x} ${y})"${no?' opacity=".7"':''}><rect x="-31" y="-17" width="62" height="34" rx="9" fill="${col(f)}" stroke="rgba(0,0,0,.35)"/><text y="-3" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="var(--fh)">${p}</text><text y="12" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">${no?'불가':`${f} · ${c.ps[p]}`}</text></g>`}).join('')}</svg>`}
function pitchMap(c){const E=ptNow(c).map(x=>[x[0],x[1]]),gc={S:'#e2b23c',A:'#b05ad6',B:'#3d8fd1',C:'#8a9a90',D:'#6b6b6b'};
 return `<svg viewBox="0 0 300 200" class="pmap" role="img" aria-label="구종과 휘는 방향"><rect width="300" height="200" rx="12" fill="var(--board)"/>
 ${[40,70].map(r=>`<circle cx="150" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.12)"/>`).join('')}
 <circle cx="150" cy="100" r="16" fill="#fff"/><path d="M140 90 Q150 100 140 110 M160 90 Q150 100 160 110" stroke="#c8102e" stroke-width="1.5" fill="none"/>
 ${(()=>{// 같은 방향 구종은 라벨이 겹치지 않게 각도를 벌림 (최소 45~58°)
 const A=E.map(([n],i)=>({i,d:(PDIR[n]??-60)+i*1e-3})).sort((p,q)=>p.d-q.d),MIN=E.length>3?58:45;
 for(let t=0;t<40;t++)for(let k=0;k<A.length&&A.length>1;k++){const p=A[k],q=A[(k+1)%A.length],gap=((q.d-p.d)%360+360)%360;if(gap<MIN){const f=(MIN-gap)/2;p.d-=f;q.d+=f}}
 const D={};A.forEach(x=>D[x.i]=x.d);return E.map(([n,g],i)=>{const a=D[i]*Math.PI/180,r=Math.max(E.length>3?68:58,g==='S'||g.startsWith('S')?80:g==='A'?70:58),w=String(n+' '+g).length*12+16,x=Math.max(w/2+4,Math.min(296-w/2,150+Math.cos(a)*r*1.35)),y=Math.max(16,Math.min(184,100+Math.sin(a)*r));
 return `<line x1="${150+Math.cos(a)*20}" y1="${100+Math.sin(a)*20}" x2="${x}" y2="${y}" stroke="${gc[g[0]]||'#888'}" stroke-width="3" stroke-dasharray="4 3"/><g><rect x="${x-w/2}" y="${y-12}" width="${w}" height="24" rx="12" fill="${gc[g[0]]||'#888'}"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${esc(n)} ${esc(g)}</text></g>`}).join('')})()}</svg>`}
// 세부 지표 c.sx: 타자 [BABIP, wRC+], 투수 [WHIP, FIP, LOB%, 피BABIP] (tools/adv.js, KBO 기록 기준·구장 보정 없음)
const SXH={B:['BABIP','wRC+'],P:['WHIP','FIP','LOB%','피BABIP']},sxF=(t,i,v)=>v==null?'-':t==='B'?(i===0?v.toFixed(3).replace(/^0/,''):v):(i===2?v+'%':i===3?v.toFixed(3).replace(/^0/,''):v.toFixed(2));
function seasonLine(c){const H=c.type==='B'?['타율','홈런','타점','도루','경기','타석']:['ERA','승','패','세이브','홀드','탈삼진','이닝','경기'],X=[]; // 카드에는 클래식 기록만 (세부 지표 c.sx는 성능 배분에만 사용)
 return `<div class="scroll"><table class="sl"><thead><tr><th>연도</th>${H.map(h=>`<th>${h}</th>`).join('')}${X.map(h=>`<th class="sxh">${h}</th>`).join('')}</tr></thead><tbody><tr><td>${c.year}</td>${c.s.map((v,i)=>`<td>${i===0?(c.type==='B'?Number(v).toFixed(3).replace(/^0/,''):Number(v).toFixed(2)):v}</td>`).join('')}${X.map((h,i)=>`<td>${sxF(c.type,i,c.sx[i])}</td>`).join('')}</tr></tbody></table></div>`}
function backFace(c,live){const occ={};S.blocks.forEach(b=>{if(b.on===c.id)cells(b).forEach(([r,q])=>occ[(r+b.at[0])*4+q+b.at[1]]=b)});const op=open(c),os=openSet(c),pt=patOf(c);
 const grid=[...Array(16).keys()].map(i=>{const b=occ[i],lock=!os.has(i);return live?`<button class="cell${lock?' lock':''}${b?' g-'+b.g:''}" data-cell="${i}"${b?' draggable="true"':''} ${lock?'disabled aria-label="잠긴 칸"':`aria-label="${Math.floor(i/4)+1}행 ${i%4+1}열"`}></button>`:`<span class="cell${lock?' lock':''}${b?' g-'+b.g:''}"></span>`}).join('');
 const no=c.no!=null&&c.no!==''?String(c.no):'',info=[ageOf(c)!=null?`${ageOf(c)}세`:'',c.hs||'',c.un||'',HAND[c.h]||'',no?`No. ${no}`:'',PFULL[c.pos]||c.pos,c.rg0?(c.rg0===c.rg?c.rg0:`${c.rg0}(${c.rg})`):(c.rg||'')].filter(Boolean);
 // 뒷면(SJ 2026-11-26): 위 2단(사진+프로필 | 수비 위치·구종) → 시즌 기록 → 아래 2단(스킬 칸 | 장착 스킬·서포트)
 return `<div class="cback cb2${live?' live':''}" style="--tc:${c.col}"><div class="cbh"><b>${no?esc(no)+'. ':''}${esc(c.name)}</b><span>${c.year} ${esc(c.team)}</span></div>
  <div class="cbtop"><div class="cbl"><div class="cbph">${photo(c,0,0)}</div><ul class="cbinfo">${info.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="cbr">${c.type==='P'?`${pitchMap(c)}<div class="vel"><small>최고구속</small><b>${c.kmh??'–'}</b><small>km/h</small></div>`:`${fieldMap(c)}<div class="vel"><small>선호타선</small><b>${c.bo&&c.bo.length?c.bo.map(x=>BOS[x]||x).join('·'):'–'}</b></div>`}</div></div>
  ${seasonLine(c)}<div class="sk2"><div class="grid4">${grid}</div>
  <div class="eq">${S.blocks.filter(b=>b.on===c.id).map(b=>`<div><b class="gl g-${b.g}">${b.g}</b>${esc(bname(b))}<small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')}</small></div>`).join('')||'<div class="none">장착한 스킬 없음</div>'}
  <div class="sup2"><span>SUPPORT CARD</span>${supOn(c.id)?`<b>${esc(sp(supOn(c.id).id)[1])}</b><small>${esc(sp(supOn(c.id).id)[3])} · ${supOn(c.id).left}경기 남음</small>`:'<small>없음</small>'}</div></div></div></div>`}
function skFront(c){const sk=skillOf(c.id),ks=(c.type==='B'?BK:PKEY).filter(k=>sk[k]);
 return `${S.work?xlSheet(c):card(c,{full:1})}<div class="skd"><h3>스킬로 바뀐 능력치</h3>${ks.length?`<table><tr><th>능력</th><th>원래</th><th>스킬 후</th><th>변화</th></tr>${ks.map(k=>{const v=c.r[k],t=Math.min(120,v+sk[k]);return `<tr><td>${SKN[k]}</td><td>${v}</td><td><b>${t}</b></td><td class="up">+${t-v}</td></tr>`}).join('')}</table>`:'<p class="note">장착한 스킬이 없어요. 뒷면에서 블록을 끼우면 여기서 변화가 보여요.</p>'}</div>`}
function blkInv(c){const sk=skillOf(c.id),sel=S.blocks.find(b=>b.u===S.blkSel),mine=S.blocks.filter(b=>b.t===c.type&&(b.on===c.id||(b.on===null&&(!b.home||b.home.cid===c.id)))),BF=S.blkF||{},KS=[...new Set(mine.flatMap(b=>Object.keys(b.st)))],GO='SABC',shown=mine.filter(b=>b.on===c.id||((!BF.k||b.st[BF.k]!=null)&&(!BF.g||b.g===BF.g))).sort((x,y)=>(y.on===c.id)-(x.on===c.id)||GO.indexOf(x.g)-GO.indexOf(y.g));
 return `<p class="note help" style="margin-top:0">장착한 블록은 이 선수 안에서만 이동·회전. 빼면 사라짐.</p>
 <div class="tools"><button class="ghost" data-a="rot" ${sel&&!sel.on?'':'disabled'}>선택 블록 회전</button>${sel&&sel.home?'<button class="ghost danger" data-a="blkdel">빼내기 (블록 사라짐)</button>':''}<span class="note" style="margin:0">${sel?'놓을 칸 선택 (끌어 놓기 가능)':'블록 선택 또는 칸에 끌어 놓기'}</span></div>
 <div class="tools blkf"><select id="blkfk" aria-label="블록 종류"><option value="">전체 종류</option>${KS.map(k=>`<option value="${k}"${BF.k===k?' selected':''}>${SKN[k]||k}</option>`).join('')}</select><select id="blkfg" aria-label="블록 등급"><option value="">전체 등급</option>${['S','A','B','C'].map(g=>`<option value="${g}"${BF.g===g?' selected':''}>${g}급</option>`).join('')}</select><span class="note" style="margin:0">${shown.length}/${mine.length}개${BF.k||BF.g?' · 장착한 블록은 항상 보여요':''}</span></div>
 <div class="inv">${(()=>{const G=[],M={};shown.forEach(b=>{if(b.on||b.home){G.push([b,1]);return}const k=b.sh+'|'+b.g+'|'+Object.keys(b.st).sort().map(x=>x+b.st[x]).join(',')+'|'+S.locks.includes('b'+b.u);if(M[k]){M[k][1]++;if(b.u===S.blkSel)M[k][0]=b}else{M[k]=[b,1];G.push(M[k])}});return G})().map(([b,n])=>{const cs=cells(b),h=Math.max(...cs.map(x=>x[0]))+1,w=Math.max(...cs.map(x=>x[1]))+1;
  return `<button class="blk${b.u===S.blkSel?' sel':''}" data-blk="${b.u}" draggable="${b.on?'false':'true'}"><span class="mini" style="grid-template-columns:repeat(${w},12px)">${[...Array(h*w).keys()].map(i=>{const on=cs.some(([r,q])=>r*w+q===i);return `<i class="${on?'cell g-'+b.g:''}" style="${on?'':'visibility:hidden'}"></i>`}).join('')}</span><small><b class="gl g-${b.g}">${b.g}</b>${esc(bname(b))}${n>1?`<b class="blkn">×${n}</b>`:''}</small><small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')} · ${b.on?'장착됨':'보관 중'}${S.locks.includes('b'+b.u)?' · 잠금':''}</small></button>`}).join('')||'<p class="note">맞는 블록 없음</p>'}</div>
 <div class="sum">${Object.keys(sk).length?Object.entries(sk).map(([k,v])=>`<span>${SKN[k]} +${v}</span>`).join(''):'<span>장착한 스킬 없음</span>'}</div>`}
function vCard(){const c=by[S.cardId],op=open(c);
 const d=deckFx(),inUse=used().includes(c.id),back=backFace(c,0);
 return `<section class="band"><div class="tools"><h2 style="margin:0">카드 상세</h2><select id="cpick" aria-label="카드 선택">${OWN.map(x=>`<option value="${esc(x.id)}" ${x.id===c.id?'selected':''}>${x.year} ${esc(x.team)} ${esc(x.name)}</option>`).join('')}</select>
 <div class="tabs">${[[0,'앞면'],[1,'뒷면']].map(([v,n])=>`<button class="${+S.back===v?'on':''}" data-face="${v}">${n}</button>`).join('')}</div></div>
 <div class="cd"><div data-bigflip="1" style="cursor:pointer" title="눌러서 앞뒤 전환">${S.back?back:card(c,{full:1})}</div>
 <div>${S.back?`<h3>스킬</h3><p>장착한 스킬은 카드 뒷면에 칸으로 보여요. 블록 장착·해제는 스킬 화면에서.</p><a href="#skill" data-skillgo="${esc(c.id)}"><button>스킬 장착하러 가기</button></a>`
 :`<h3>${PFULL[c.pos]} ${stars(c.cost)}</h3>
  <p class="help" style="margin:0">막대 숫자 = 덱 효과·스킬 블록 포함, 오른쪽 작은 숫자 = 보너스. 육성으로 120까지 오르며 100을 넘는 등급은 S+, SS, SS+로 표시합니다.</p>
  <div class="lbl">덱 효과</div><p style="margin:0">${inUse?`1군 등록 중: ${d.fx.map(x=>`${x.n} ${x.g}`).join(' · ')||'팀컬러 없음'} (${c.type==='B'?'야수 +'+d.bat:'투수 +'+d.pit})`:'1군 등록 시 덱 효과 적용.'}</p>
  ${c.type==='P'&&c.arm?`<div class="lbl">투구폼</div><p style="margin:0"><b>${ARM_N[c.arm]}</b> <small>같은 손 타자에게 강하고 반대 손 타자에게 약해요 · 땅볼 많음</small></p>`:''}${c.type==='P'?`<div class="lbl">구종</div><div class="apt">${ptNow(c).map(([n,g],i)=>{const b0=Object.values(c.pt)[i];return `<span>${esc(n)}<b${g.startsWith('SS')?' style="color:#e2b23c"':''}>${esc(g)}</b>${g!==b0?`<small style="opacity:.6"> (기본 ${esc(b0)})</small>`:''}</span>`}).join('')}</div>`:''}
  <div class="lbl">이번 시즌</div><p style="margin:0">${S.gp[baseId(S.cardId)]||0}경기 출전 · 컨디션 <b>${CONDN[condOf(by[S.cardId])]}</b></p>`}</div></div></section>`}
let grab=null;
function tapBlk(i,cid){const c=by[cid],r=Math.floor(i/4),q=i%4;const hit=S.blocks.find(b=>b.on===cid&&cells(b).some(([a,d])=>a+b.at[0]===r&&d+b.at[1]===q));
 if(hit){hit.home={cid,at:hit.at,rot:hit.rot};hit.on=null;hit.at=null;S.blkSel=hit.u;return}const b=S.blocks.find(x=>x.u===S.blkSel);if(!b||b.t!==c.type||(b.home&&b.home.cid!==cid))return;const os=openSet(c);
 const fit=(r0,q0)=>r0>=0&&q0>=0&&cells(b).every(([a,d])=>{const R=a+r0,Q=d+q0;return R<4&&Q<4&&os.has(R*4+Q)&&!S.blocks.some(o=>o!==b&&o.on===cid&&cells(o).some(([x,y])=>x+o.at[0]===R&&y+o.at[1]===Q))});
 // 누른 칸이 블록의 어느 칸이든 덮이면 OK: 끌어온 칸 → 블록의 각 칸 순서로 맞춰 봄
 const tries=[...(grab?[grab]:[]),...cells(b)],hitT=tries.find(([a,d])=>fit(r-a,q-d));
 if(hitT){b.on=cid;b.at=[r-hitT[0],q-hitT[1]];delete b.home;S.blkSel=null}}
// 미리보기: 놓일 칸 전부 표시
function blkFoot(i,cid){const b=S.blocks.find(x=>x.u===S.blkSel);if(!b)return null;const r=Math.floor(i/4),q=i%4,os=openSet(by[cid]);
 for(const [a,d] of [...(grab?[grab]:[]),...cells(b)]){const r0=r-a,q0=q-d;if(r0<0||q0<0)continue;const cs=cells(b).map(([x,y])=>[x+r0,y+q0]);
  if(cs.every(([R,Q])=>R<4&&Q<4&&os.has(R*4+Q)&&!S.blocks.some(o=>o!==b&&o.on===cid&&cells(o).some(([x,y])=>x+o.at[0]===R&&y+o.at[1]===Q))))return cs.map(([R,Q])=>R*4+Q)}return []}
// 박힌 블록은 같은 선수 안에서만 옮기거나 돌릴 수 있고, 선택을 풀면 원래 자리로 돌아가요
function restoreLift(){for(const b of S.blocks)if(b.home&&b.u!==S.blkSel){const h=b.home,rot=b.rot;b.rot=h.rot;const clash=S.blocks.some(o=>o!==b&&o.on===h.cid&&cells(o).some(([x,y])=>cells(b).some(([a,d])=>a+h.at[0]===x+o.at[0]&&d+h.at[1]===y+o.at[1])));if(clash){b.rot=rot;continue}b.on=h.cid;b.at=h.at;delete b.home}}
// 카드 팝업: 넓은 화면은 앞뒤를 나란히, 좁은 화면은 카드를 누를 때마다 앞뒤 전환

// 선수 비교: 카드 팝업의 [비교하기] → 다른 카드를 누르면 두 장을 나란히 비교
const effR=c=>{const sk=skillOf(c.id),r={};for(const k in c.r)r[k]=Math.min(120,c.r[k]+(sk[k]||0));return r};
function cmpBar(){if(S.cmpA&&!by[S.cmpA])S.cmpA=null;return S.cmpA&&!S.modal?`<div class="cmpbar" role="status"><span>비교: <b>${esc(by[S.cmpA].name)}</b> ${by[S.cmpA].year} · 비교할 카드 선택</span><button class="ghost" data-cmpx="1">취소</button></div>`:''}
function cmpView(a,b){const head=`<div class="mhead"><b>선수 비교</b><button class="ghost" data-cmpre="1">다른 선수 고르기</button><button class="ghost" data-cmpx="1">비교 끝내기</button></div>`;
 if(a.type!==b.type)return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true">${head}<p class="note">타자와 투수는 비교 불가</p></div></div>`;
 const ra=effR(a),rb=effR(b),B=a.type==='B',keys=B?BK:PKEY;
 const row=(n,x,y,fmt=v=>v,hi=1)=>{const d=typeof x==='number'&&typeof y==='number'?(y-x):0,wa=hi?x>y:x<y,wb=hi?y>x:y<x;return `<tr><td class="${wa?'win':''}">${fmt(x)}</td><th>${n}</th><td class="${wb?'win':''}">${fmt(y)}${d?`<small class="${(hi?d>0:d<0)?'up':'dn'}">${d>0?'+':''}${Math.round(d*1000)/1000}</small>`:''}</td></tr>`};
 const sA=a.s||[],sB=b.s||[],f3=v=>v==null?'–':Number(v).toFixed(3).replace(/^0/,''),f2=v=>v==null?'–':Number(v).toFixed(2);
 const rows=[row('코스트',a.cost,b.cost,v=>v,0),row('OVR',a.ovr,b.ovr),...keys.map(k=>row(SKN[k],ra[k],rb[k])),
  ...(B?[row('타율',+sA[0],+sB[0],f3),row('홈런',sA[1],sB[1]),row('타점',sA[2],sB[2]),row('도루',sA[3],sB[3]),row('출루율',a.st&&a.st.obp,b.st&&b.st.obp,f3),row('OPS',a.st&&a.st.ops,b.st&&b.st.ops,f3)]
   :[row('ERA',+sA[0],+sB[0],f2,0),row('승',sA[1],sB[1]),row('세이브',sA[3],sB[3]),row('탈삼진',sA[5],sB[5]),row('이닝',sA[6],sB[6]),row('구속',a.kmh,b.kmh,v=>v+'km')])];
 const txt=(n,fa,fb)=>`<tr><td>${fa}</td><th>${n}</th><td>${fb}</td></tr>`;
 const extra=B?txt('수비',Object.entries(a.ps||{}).map(([p,v])=>PN[p]+' '+grade(v)).join(' ')||'지명',Object.entries(b.ps||{}).map(([p,v])=>PN[p]+' '+grade(v)).join(' ')||'지명')+txt('타순 적성',a.bo.map(x=>BOS[x]).join('·'),b.bo.map(x=>BOS[x]).join('·'))
  :txt('구종',Object.entries(a.pt||{}).map(([k,g])=>k+' '+g).join(' '),Object.entries(b.pt||{}).map(([k,g])=>k+' '+g).join(' '));
 return `<div class="modal" data-close="1"><div class="mbox cmpbox" role="dialog" aria-modal="true" aria-label="선수 비교">${head}
 <div class="cmpg"><div>${card(a,{stats:0})}</div><table class="cmpt"><thead><tr><th>${esc(a.name)} ${String(a.year).slice(2)}'</th><th></th><th>${esc(b.name)} ${String(b.year).slice(2)}'</th></tr></thead><tbody>${rows.join('')}${extra}</tbody></table><div>${card(b,{stats:0})}</div></div>
 <p class="note help" style="text-align:center">능력치는 스킬 블록 포함 값. 코스트·ERA는 낮을수록 좋음.</p></div></div>`}
function dexViewModal(){const c=byId[S.dexView];if(!c)return '';const h=dexHas(c.id);
 return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(c.name)} 카드">
 <div class="mhead"><b>${c.year} ${esc(c.team)} ${esc(c.name)}</b><span class="pill">${h?'모은 적 있음 · 지금은 없음':'아직 없는 카드'}</span><button class="ghost" data-close="1" aria-label="닫기">닫기</button></div>
 <p class="mmeta">${[c.rg?`출신 지역 <b>${esc(c.rg0&&c.rg0!==c.rg?c.rg0+' · '+c.rg:c.rg)}</b>`:'',c.hs?`출신 고교 <b>${esc(c.hs)}</b>`:'',c.b?`${c.year-c.b}세`:'',HAND[c.h]||'',PFULL[c.pos]||'',c.v?vnm(c):''].filter(Boolean).join(' · ')}</p>
 <div class="faces${S.mflip?' flipped':''}" data-mflip="1" title="탭하면 앞/뒷면"><div class="face f-front">${card(c,{full:1})}</div><div class="face f-back">${backFace(c,0)}</div></div>
 <p class="note" style="text-align:center"><label class="phup">사진 올리기<input type="file" accept="image/*" data-up="${esc(baseId(c.id))}" hidden></label>${(S.photos||{})[baseId(c.id)]?' · <button class="ghost phrm" data-a="rmphoto">올린 사진 지우기</button>':''} · 카드팩·합성으로 획득${credLine(c)?'<br>'+credLine(c):''}</p></div></div>`}
// 개인 기록: 주간 리그·연도별 리그의 내 구단 시즌 누적(L.ps, 키 '0|카드id')
function recHTML(c){const f3=v=>v.toFixed(3).replace(/^0/,''),rows=[['주간 리그',S.season],['연도별 리그',S.yl]].map(([n,L])=>{const r=L&&L.ps&&L.ps['0|'+c.id];if(!r)return '';
  const bat=r.ab+r.bb>0?`타율 <b>${r.ab?f3(r.h/r.ab):'-'}</b> · ${r.ab}타수 ${r.h}안타 ${r.hr}홈런 ${r.rbi}타점 ${r.bb}볼넷 ${r.sb}도루`:'',pit=r.outs>0?`평균자책 <b>${(r.er*27/r.outs).toFixed(2)}</b> · ${Math.floor(r.outs/3)}.${r.outs%3}이닝 ${r.w}승 ${r.sv}세이브 ${r.so}탈삼진`:'';
  return bat||pit?`<li><span>${n}</span> ${[bat,pit].filter(Boolean).join(' / ')}</li>`:''}).join('');
 return `<div class="mrec"><b>이번 시즌 개인 기록</b>${rows?`<ul>${rows}</ul>`:'<p class="note" style="margin:4px 0 0">출전 기록 없음</p>'}</div>`}
// 덱 짜보기 카드 상세(SJ 2026-11-25): 보유와 상관없이 그 덱의 덱 효과를 받은 수치로 보여줌
// 덱 짜보기 가정(SJ 2026-11-25): 유학·스킬·장비를 붙였다고 치고 능력치를 봄. 보유 카드·실제 장착과 무관, 덱 짜보기 안에서만
const simOf=id=>((bldInit().sim||{})[id])||null;
function simAdd(c){const x=simOf(c.id);if(!x)return {};const a={},put=(k,v)=>{if(v)a[k]=(a[k]||0)+v};
 for(const k in x.ab)put(k,x.ab[k]);const m=SK_MUL[c.v]||1;for(const k in x.sk)put(k,Math.round(x.sk[k]*m*10)/10);
 for(const sl in x.eq){const [kind,g]=x.eq[sl].split(':'),b=ECON.eqBonus({k:kind,g,line:null},c);if(b)put(b.stat,b.v)}return a}
function simCard(c){const a=simAdd(c);if(!Object.keys(a).length)return c;const r={...c.r};for(const k in a)if(r[k]!=null)r[k]=Math.min(120,r[k]+a[k]);return {...c,r}}
function simPanel(c){const x=simOf(c.id)||{ab:{},sk:{},eq:{}},keys=c.type==='B'?BK:PKEY,ab=abAge(c),cap=abCapC(c),sel=(g,k,max,cur)=>`<select data-sim="${g}" data-k="${k}" aria-label="${SKN[k]} ${g==='ab'?'유학':'스킬'}">${Array.from({length:max+1},(_,i)=>`<option value="${i}"${(cur|0)===i?' selected':''}>${i?'+'+i:'-'}</option>`).join('')}</select>`;
 const EQK=Object.entries(ECON.EQ_KIND).filter(([k,v])=>v[0]===c.type),slots=ECON.EQ_SLOTS[c.type];
 const eqSel=sl=>`<select data-sim="eq" data-k="${sl}" aria-label="${EQSN[sl]} 장비"><option value="">${EQSN[sl]} 없음</option>${EQK.filter(([k,v])=>v[1]===sl).map(([k,v])=>['일반','희귀','전설'].map(g=>`<option value="${k}:${g}"${x.eq[sl]===k+':'+g?' selected':''}>${g} ${v[2]}</option>`).join('')).join('')}</select>`;
 const a=simAdd(c);
 return `<details class="simp"${simOf(c.id)?' open':''}><summary>가정해 보기 · 유학·스킬·장비 (덱 화면 안에서만)${Object.keys(a).length?' · '+Object.entries(a).map(([k,v])=>SKN[k]+' +'+v).join(' '):''}</summary>
 <div class="scroll"><table class="tbl"><thead><tr><th class="l">능력</th>${keys.map(k=>`<th>${SKN[k]}</th>`).join('')}</tr></thead><tbody>
 <tr><td class="l">유학${ab?` <small>(최대 +${cap})</small>`:' <small>불가</small>'}</td>${keys.map(k=>`<td>${ab?sel('ab',k,cap,x.ab[k]):'-'}</td>`).join('')}</tr>
 <tr><td class="l">스킬${(SK_MUL[c.v]||1)!==1?` <small>×${SK_MUL[c.v]}</small>`:''}</td>${keys.map(k=>`<td>${sel('sk',k,12,x.sk[k])}</td>`).join('')}</tr></tbody></table></div>
 <div class="tools" style="margin-top:6px">${slots.map(eqSel).join('')}</div><p class="note" style="margin:4px 0 0">유학은 카드 연도 기준 25세 이하·35세 이상만, 코스트가 낮을수록 상한이 커요. 장비는 저코스트일수록 보너스가 커요(같은 구단 장비 +10%는 빼고 계산).</p></details>`}
function bldModal(){const c0=byId[S.bmodal];if(!c0)return '';const c=simCard(c0),T=teamColor(bldStart(),bldInit().fxsel,(bldInit().bench||[]).map(id=>byId[id]).filter(Boolean)),ids=bldIds();
 return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(c.name)} 카드">
 <div class="mhead"><b>${c.year} ${esc(c.team)} ${esc(c.name)}</b><span class="pill">${S.owned[c.id]?'보유':'미보유'} · 덱 화면 덱 효과 야수 +${T.bat} · 투수 +${T.pit}</span>${S.bmslot?'<button data-bswap="1">자리 교체하기</button>':''}<button class="ghost" data-close="1" aria-label="닫기">닫기</button></div>
 <p class="mmeta">${[c.rg?`출신 지역 <b>${esc(c.rg0&&c.rg0!==c.rg?c.rg0+' · '+c.rg:c.rg)}</b>`:'',c.hs?`출신 고교 <b>${esc(c.hs)}</b>`:'',c.b?`${c.year-c.b}세`:'',HAND[c.h]||'',`${esc(lname(c.line))} 계보`].filter(Boolean).join(' · ')}</p>
 <div class="faces${S.mflip?' flipped':''}" data-mflip="1" title="탭하면 앞/뒷면"><div class="face f-front">${card(c,{full:1,dfx:{bat:T.bat,pit:T.pit},dids:ids,nocond:1})}</div><div class="face f-back">${backFace(c0,0)}</div></div>${simPanel(c0)}</div></div>`}
// 공지사항(SJ 2026-11-26): 처음 보는 공지는 자동으로 띄우고, 보상(카드팩 등)은 '받기'로 한 번만 지급. 새 공지는 맨 위에 추가
/*NOTICES*/
var NOTICES=Array.isArray(NOTICES)?NOTICES:[]; // notices.js가 빠진 빌드에서도 화면이 깨지지 않게 (tools/build2.py로 빌드해야 공지가 들어감)
const ntcOpen=()=>S.ntcView?NOTICES.find(n=>n.id===S.ntcView):NOTICES.find(n=>!(S.ntc||{})[n.id]);
function noticeHTML(){if(S.modal||S.dexView||S.bmodal||S.ntcHide)return '';const n=ntcOpen();if(!n)return '';const got=(S.ntc||{})[n.id]==='got',rw=n.rw&&!got;
 return `<div class="modal ntcm" role="dialog" aria-modal="true" aria-label="공지사항"><div class="mbox"><small class="note" style="margin:0">공지 · ${n.d}</small><h2 style="margin:4px 0 10px">${esc(n.t)}</h2><ul class="ntcb">${n.b.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 ${n.rw?`<p class="ntcr">${got?'받은 보상':'보상'} · <b>${esc(rwText(n.rw))}</b></p>`:''}<div class="tools" style="justify-content:flex-end"><button ${rw?'':'class="ghost"'} data-a="ntcok" data-id="${n.id}">${rw?'보상 받기':'닫기'}</button></div></div></div>`}
let VERNEW=false;
async function verCheck(silent){if(!silent){S.verMsg='확인 중…';render()}try{const r=await fetch(location.pathname+'?vc='+Date.now(),{cache:'no-store'}),t=await r.text(),m=t.match(/const BUILD='([^']+)'/),nb=m&&m[1];
 if(nb&&nb!==BUILD&&BUILD!=='__BUILD__'){VERNEW=true;if(silent){S.verMsg='새 버전이 있어요';render();return}S.verMsg='새 버전으로 바꾸는 중…';render();try{const g=await navigator.serviceWorker?.getRegistration();await g?.update()}catch(e){}location.reload();return}
 if(!silent){S.verMsg='최신 버전이에요';render()}}catch(e){if(!silent){S.verMsg='확인 실패 · 인터넷 연결을 확인해 주세요';render()}}}
setInterval(()=>{if(!document.hidden&&!VERNEW)verCheck(true)},15*60*1000);
const verBanner=()=>VERNEW?`<div class="verb" role="status">새 버전이 나왔어요 <button data-a="vercheck">새로고침</button></div>`:'';
// 대박 연출(SJ 2026-11-26): 9·10코스트, 골든글러브·올스타(EX·커리어하이·영구결번 포함)가 나오면 전면 팝업. 탭할 때마다 다음 카드
const HIREV=c=>!!c&&(c.cost>=9||['GG','AS','EX','CH','RN'].includes(c.v));let revSeen=null;
function revQueue(ids){const L=ids.map(id=>by[id]||byId[id]).filter(HIREV).map(c=>c.id);if(!L.length)return;if(S.work){revFlash(L);return}S.reveal=[...(S.reveal||[]),...L]}
// 업무 모드(SJ 2026-11-26): 전면 팝업 대신 화면 아래쪽에 한 줄로 떴다 사라짐 · 연타 뽑기를 막지 않음
let revFT=0;function revFlash(L){let el=document.getElementById('revfl');if(!el){el=document.createElement('div');el.id='revfl';el.setAttribute('aria-live','polite');document.body.appendChild(el)}
 el.innerHTML=L.map(id=>{const c=byId[id];return c?`<div>★ ${c.year} ${esc(c.team)} ${esc(c.name)}${c.v?' · '+esc(vnm(c)||c.v):''} · 코스트 ${c.cost} · 능력 ${c.ovr}</div>`:''}).join('');el.classList.remove('off');void el.offsetWidth;el.classList.add('on');clearTimeout(revFT);revFT=setTimeout(()=>{el.classList.remove('on');el.classList.add('off')},2600)}
function revTag(c){const t=[];if(c.v==='EX')t.push('EX');else if(c.v==='GG')t.push('골든글러브');else if(c.v==='AS')t.push('올스타');else if(c.v==='CH')t.push('커리어하이');else if(c.v==='RN')t.push(rnName(c.line));if(c.cost>=10)t.push('10코스트');else if(c.cost>=9)t.push('9코스트 레전드');return t.join(' · ')+'!'}
function revealHTML(){const c=by[S.reveal[0]]||byId[S.reveal[0]];if(!c){S.reveal.shift();return S.reveal.length?revealHTML():''}const n=S.reveal.length;
 return `<div class="modal reveal${c.cost>=10||c.v==='EX'?' r10':''}" data-revx="1" role="dialog" aria-modal="true" aria-label="${esc(revTag(c))} ${esc(c.name)}"><div class="revbox"><div class="revtag">${esc(revTag(c))}</div><div class="revcard">${card(c,{full:1})}</div><p class="revn">${esc(c.year+' '+c.team+' '+c.name)}<br><small>${n>1?`탭하면 다음 (${n-1}장 더)`:'탭해서 닫기'}</small></p></div></div>`}
// 업무 모드 카드 상세(SJ 2026-11-26): 앞·뒷면 대신 엑셀 일람표 한 장 · 색 없음
function xlSheet(c){const B=c.type==='B',keys=B?BK:PKEY,d=deckFx(),bn=used().includes(c.id)?(B?d.bat:d.pit):0,EQ=ECON.cardEq?ECON.cardEq(S,baseId(c.id),byId):{},SK=skillOf(c.id),ag=ageOf(c);
 const info=[['선수',esc(c.name)],['연도·구단',`${c.year} ${esc(c.team)}`],['포지션',`${PFULL[c.pos]||c.pos}${c.tw?' · 겸업':''}`],['투타',HAND[c.h]||'-'],['나이',ag!=null?ag+'세':'-'],['종류',c.v?esc(vnm(c)||c.v):'일반'],['코스트',c.cost],['능력',c.ovr],...(c.bo?[['타순 적성',c.bo.map(x=>BO[x]).join('·')]]:[]),...(c.st?[['출루율 · OPS',`${c.st.obp.toFixed(3).slice(1)} · ${c.st.ops.toFixed(3)} (${c.st.pa}타석)`]]:[])];
 const rows=keys.map(k=>{const v=c.r[k],p=k==='sta'?0:bn,sk=SK[k]||0,eq=EQ[k]||0;return `<tr><td class="l">${SKN[k]||k}</td><td>${v}</td><td>${p?'+'+p:''}</td><td>${sk?'+'+sk:''}</td><td>${eq?'+'+eq:''}</td><td><b>${Math.min(120,v+p+sk+eq)}</b></td></tr>`}).join('');
 const fp=B?POS.filter(p=>p!=='DH'&&FXY[p]&&fit(c,p)!=='X').map(p=>`${p} ${fit(c,p)}·${c.ps[p]}`).join(' / '):'';
 const bl=(S.blocks||[]).filter(b=>b.on===c.id).map(b=>`${b.g}급 ${esc(bname(b))}`).join(', ');
 return `<div class="xls"><table class="tbl xlst"><tbody>${info.map(([k,v])=>`<tr><th class="l">${k}</th><td class="l">${v}</td></tr>`).join('')}${fp?`<tr><th class="l">수비 위치</th><td class="l">${fp}</td></tr>`:''}<tr><th class="l">스킬 블록</th><td class="l">${bl||'없음'}</td></tr></tbody></table>
 <table class="tbl xlst"><thead><tr><th class="l">능력치</th><th>기본</th><th>덱</th><th>스킬</th><th>장비</th><th>합계</th></tr></thead><tbody>${rows}</tbody></table>
 <div class="xlsl">${seasonLine(c)}</div></div>`}
function modal(){if(S.reveal&&S.reveal.length)return revealHTML();if(S.dexView)return dexViewModal();if(S.bmodal)return bldModal();const c=by[S.modal];if(!c)return '';if(S.cmpA&&S.cmpA!==c.id)return cmpView(by[S.cmpA],c);
 return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(c.name)} 카드">
 <div class="mhead"><b>${c.year} ${esc(c.team)} ${esc(c.name)}</b>${c.bo?`<span class="pill">타순 적성 ${c.bo.map(x=>BO[x]).join('·')}${c.st?` · 출루율 ${c.st.obp.toFixed(3).slice(1)} · OPS ${c.st.ops.toFixed(3)} · ${c.st.pa}타석`:''}</span>`:''}${S.mslot?'<button data-mswap="1">자리 교체하기</button>':''}<button class="ghost lockt" data-lock="${esc(c.id)}" aria-pressed="${isLocked(c.id)}" aria-label="${isLocked(c.id)?'잠금 해제':'잠그기'}" title="${isLocked(c.id)?'잠금 해제':'잠그기'}">${LOCKI(isLocked(c.id))}</button><button class="ghost" data-cmp="${esc(c.id)}">비교하기</button>${(S.owned[baseId(c.id)]|0)>1?`<button class="ghost" data-a="dism" data-id="${esc(baseId(c.id))}" title="${c.v==='EX'?'EX 조각 3개 = 구단 지정 EX 확정권 1장':'코스트 × 30P'}">중복 1장 분해 · ${c.v==='EX'?`EX 조각 ${(S.exShard|0)}/3`:'+'+(c.cost*ECON.DISMANTLE)+'P'}</button>`:''}<button class="ghost" data-close="1" aria-label="닫기">닫기</button></div>
 <p class="mmeta">${[c.v==='IR'?`철인 · ${c.type==='B'?'전 경기 출장':'최다 등판'} · 스킬 효과 ×1.5`:c.v==='GG'?`골든글러브 ${({OF:'외야수',P:'투수'})[c.gg]||PFULL[c.gg]||c.gg}`:'',c.v==='EX'?'EX · 스킬 효과 ×1.25 · 같은 계보 덱 인원으로 셈':'',c.v==='RY'?'신인왕 · 컨디션이 보통 아래로 안 떨어짐':'',c.tw?`투타 겸업 · 같은 선수의 ${c.type==='P'?'타자':'투수'} 카드와 함께 1군 등록 가능`:'',ageOf(c)!=null&&!abAge(c)?'유학 불가':''].filter(Boolean).join(' · ')}</p>${recHTML(c)}${abHistText(c.id)?`<p class="mmeta abh">${PLANE}유학 다녀옴: ${esc(abHistText(c.id).replace(/\n/g,' / '))}</p>`:''}
 ${S.work?xlSheet(c):`<div class="faces${S.mflip?' flipped':''}" data-mflip="1" title="탭하면 앞/뒷면"><div class="face f-front">${card(c,{full:1})}</div><div class="face f-back">${backFace(c,0)}</div></div>`}
 ${eqHTML(c)}
 <p class="note" style="text-align:center"><label class="phup">사진 올리기<input type="file" accept="image/*" data-up="${esc(baseId(c.id))}" hidden></label>${(S.photos||{})[baseId(c.id)]?' · <button class="ghost phrm" data-a="rmphoto">올린 사진 지우기</button>':''} · <a href="#skill" data-skillgo="${esc(c.id)}">스킬 장착</a>${credLine(c)?'<br>'+credLine(c):''}</p></div></div>`}
vw.addEventListener('click',e=>{S.msg='';const t=e.target.closest('[data-revx],[data-ntc],[data-tix],[data-abreset],[data-msn],[data-sft],[data-sfd],[data-pk],[data-pkv],[data-abrush],[data-dexk],[data-dexv],[data-bslot],[data-bswap],[data-bput],[data-bclr],[data-dexgot],[data-cmp],[data-cmpx],[data-cmpre],[data-abd],[data-abpick],[data-abget],[data-abok],[data-lock],[data-skillgo],[data-sktb],[data-skc],[data-sk2],[data-rec],[data-sk],[data-synex],[data-synexm],[data-mat],[data-tsel],[data-ssel],[data-sgive],[data-sdel],[data-mswap],[data-tf],[data-tin],[data-tout],[data-mf],[data-sub],[data-tb],[data-mgr],[data-ojoin],[data-close],[data-mflip],[data-detail],[data-bigflip],[data-slot],[data-pick],[data-a],[data-cell],[data-blk],[data-pf],[data-side],[data-face],[data-skflip]');if(!t)return;const D=t.dataset;
 if(D.revx){(S.reveal||[]).shift();if(!(S.reveal||[]).length)S.reveal=null;render();return}
 if(D.ntc){S.ntcView=D.ntc;S.ntcHide=false;render();return}
 if(abAct(D)||shopAct(D)){render();return}
 if(D.msn&&S.msSub){const m=S.msSub,v=Math.max(0,(m.sel[D.msn]|0)+(+t.dataset.d));if(v)m.sel[D.msn]=v;else delete m.sel[D.msn];S.msMsg='';render();return}
 if(D.dexk){S.dexK=D.dexk;S.dexLim=0;render();return}
 if(D.bclr){bldSlotSet(D.bclr,null);S.bldSel=null;save();render();return}
 if(D.bslot&&S.bldSel&&S.bldSel!==D.bslot){const g=k=>/^(lu|bench)/.test(k)?'B':'P',a=S.bldSel,b=D.bslot;if(g(a)===g(b)){const x=bldSlotGet(a),y=bldSlotGet(b);bldSlotSet(a,y);bldSlotSet(b,x);S.bldSel=null;S.msg='자리 교환';save();render();return}}
 if(D.bslot){const id=bldSlotGet(D.bslot);if(S.bldView==='card'&&id&&!S.bldSel){S.bmodal=id;S.bmslot=D.bslot;S.mflip=false}else S.bldSel=S.bldSel===D.bslot?null:D.bslot;S.msg='';render();return}
 if(D.bswap){S.bldSel=S.bmslot;S.bmodal=null;S.bmslot=null;render();return}
 if(D.bput){bldPut(D.bput);save();render();return}
 if(D.dexv){S.dexView=D.dexv;S.mflip=false;render();return}
 if(D.dexgot){S.dexGot=S.dexGot||{};S.dexGot[D.dexgot]=Date.now();render();return}
 if(D.cmp){S.cmpA=D.cmp;S.modal=null;S.mslot=null;render();return}
 if(D.cmpx){S.cmpA=null;S.modal=null;render();return}
 if(D.cmpre){S.modal=null;render();return}
 if(D.close){if(e.target===t||t.tagName==='BUTTON'){S.modal=null;S.mslot=null;S.dexView=null;S.bmodal=null;S.bmslot=null}else return}
 else if(D.mflip)S.mflip=!S.mflip;
 else if(D.detail){S.cardId=D.detail;S.back=false;S.modal=null;location.hash='card';render();return}
 else if(D.bigflip)S.back=!S.back;
 else if(D.ojoin)S.ojoin=!S.ojoin;
 else if(D.sub){S.sub=D.sub;S.sel=null}
 else if(D.tb){S.tb=D.tb;S.sel=null;S.pf='all'}
 else if(D.mgr)S.mgr=D.mgr;
 else if(D.mf)S.mf=D.mf;
 else if(D.tf)S.tf=D.tf;
 else if(D.tsel!=null)S.tsel=D.tsel&&S.tsel!==D.tsel?D.tsel:null;
 else if(D.lock){toggleLock(D.lock);S.mat=S.mat.filter(x=>!x.startsWith(D.lock))}
 else if(D.rec)S.recm=D.rec;
 else if(D.skillgo){const c=by[D.skillgo];S.skc=c.id;S.sktb=c.type;S.modal=null;S.mslot=null;S.blkSel=null;location.hash='skill';render();return}
 else if(D.sktb){S.sktb=D.sktb;S.blkSel=null}
 else if(D.skc){S.skc=D.skc;S.blkSel=null}
 else if(D.skflip){S.skf=D.skflip==='f'?1:D.skflip==='b'?0:S.skf?0:1}
 else if(D.sft){S.sf={...(S.sf||SF0),ty:D.sft};S.mat=[]}else if(D.sfd){S.sf={...(S.sf||SF0),dup:(S.sf||SF0).dup?0:1};S.mat=[]}else if(D.sk2){S.sk=D.sk2;S.mat=[];S.synRes=null;location.hash='synth';render();return}
 else if(D.sk){S.sk=D.sk;S.mat=[];S.synRes=null}
 else if(D.synex){const E=S.synEx=S.synEx||[],i=E.indexOf(D.synex);if(i>=0)E.splice(i,1);else if(E.length>=SYN_EX_MAX)S.msg=`결과 제외 구단은 ${SYN_EX_MAX}개까지 선택 가능.`;else E.push(D.synex);S.synRes=null}
 else if(D.synexm){const E=S.synExM=S.synExM||[],i=E.indexOf(D.synexm);if(i>=0)E.splice(i,1);else E.push(D.synexm);S.synRes=null;S.mat=(S.mat||[]).filter(id=>{const c=byId[baseId(id)];return !c||!E.includes(c.line)})}
 else if(D.mat){const i=S.mat.indexOf(D.mat);S.synRes=null;if(i>=0)S.mat.splice(i,1);else if(S.mat.length<NEED(S.sk||'p'))S.mat.push(D.mat)}
 else if(D.ssel)S.ssel=S.ssel===D.ssel?null:D.ssel;
 else if(D.sgive){if(S.sup.length<2&&S.ssel){S.sup.push({id:S.ssel,cid:D.sgive,left:SUP_BY[S.ssel][4]});S.sq[S.ssel]--;S.ssel=null}}
 else if(D.sdel)S.sup.splice(+D.sdel,1);
 else if(D.slot){const [k,i]=D.slot.split(':'),s={k,i:+i};
  if(S.sel&&S.sel.k===k&&S.sel.i===+i)S.sel=null;else if(S.sel&&KIND(S.sel.k)===KIND(k)){swapSlots(S.sel,s);S.sel=null}
  else{const id=getS(s);if(id){S.modal=id;S.mflip=false;S.mslot=s}else{S.sel=s;S.tb=KIND(k)}}}
 else if(D.mswap){S.sel=S.mslot;if(S.sel)S.tb=KIND(S.sel.k);S.modal=null;S.mslot=null}
 else if(D.pick){if(S.sel)place(D.pick);else{S.modal=D.pick;S.mflip=false;S.mslot=null}}
 else if(D.pf)S.pf=D.pf;else if(D.side)S.side=D.side;else if(D.face)S.back=D.face==='1';
 else if(D.cell)tapBlk(+D.cell,location.hash==='#skill'?S.skc:S.cardId);
 else if(D.blk){const u=D.blk;S.blkSel=S.blkSel===u?null:u}
 else{const a=D.a;if(a==='rot'){const b=S.blocks.find(x=>x.u===S.blkSel);if(b&&!b.on)b.rot=(b.rot+1)%4}if(a==='blkdel'){S.blocks=S.blocks.filter(b=>!(b.u===S.blkSel&&b.home));S.blkSel=null}
  if(a==='recapply'){S.undo=JSON.stringify({lu:S.lu,bench:S.bench,rot:S.rot,pen:S.pen});Object.assign(S,recommend(S.recm));S.recm=null;S.sel=null}
  if(a==='recclose')S.recm=null;
  if(a==='recundo'&&S.undo){Object.assign(S,JSON.parse(S.undo));S.undo=null}
  if(a==='synhelp')S.synHelp=!S.synHelp;if(a==='tcall')S.tcAll=!S.tcAll;
  if(a==='mt-k'){useMode(D.k);S.sel=null}
  if(a==='bau-go')bauRun();if(a==='ds-go')dsRun();if(a==='ds-pred'&&S.dsPred){const i=+D.i;S.dsPred.pick=S.dsPred.pick===i?null:i}if(a==='ds-reroll')S.dsPred=null;if(a==='synth')doSynth();if(a==='synclr'){S.mat=[];S.synRes=null}if(a==='synauto'){const m=synAuto(S.sk||'p');S.synRes=null;if(m)S.mat=m;else{S.mat=[];S.msg='재료 부족.'}}
  if(a==='tdraw'){if(ECON.pay(S,100).err)S.msg='포인트 부족';else{const u=Math.random(),g=u<.05?'황금':u<.25?'특수':'일반',x=pick(TCARDS.filter(t=>t[3]===g));S.tq[x[0]]=(S.tq[x[0]]||0)+1;S.tdraw=x[0]}}}
 render()});
vw.addEventListener('toggle',e=>{const t=e.target;if(t.classList&&t.classList.contains('pdet')&&S)S.pdetOpen=t.open;if(t.classList&&t.classList.contains('dexfd')&&S)S.dexFOpen=t.open},true);
// 단축키(SJ 2026-11-26): 숫자 1~9 = 화면 버튼(data-hk, 버튼 오른쪽 위 숫자), F1~F4 = 하위 탭, Shift(또는 Alt)+1~5 = 위 메뉴(홈·경기·팀·카드·상점)
document.addEventListener('keydown',e=>{if(!S||S.modal||S.dexView||(S.reveal&&S.reveal.length)||e.ctrlKey||e.metaKey)return;const tg=e.target,typing=/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName||'')||tg.isContentEditable;
 const fk=/^F([1-4])$/.exec(e.key);if(fk&&!e.shiftKey&&!e.altKey){const k=view(),g=NAVG[k],L=NAVS[g]||[],t=L[+fk[1]-1];if(t){e.preventDefault();if(t[0]!==k)location.hash=t[0]}return}
 if(typing)return;const dg=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);if(!dg)return;
 if(e.shiftKey||e.altKey){const G=Object.keys(NAVS),gk=G[+dg[1]-1];if(!gk)return;e.preventDefault();const h=(NAVS[gk].find(([x])=>x===S['lastTab_'+gk])||NAVS[gk][0])[0];location.hash=h;return}
 const b=[...document.querySelectorAll('#view [data-hk="'+dg[1]+'"],main [data-hk="'+dg[1]+'"]')].find(x=>x.offsetParent&&!x.disabled);if(b){e.preventDefault();if(!e.repeat)b.click()}});
document.addEventListener('toggle',e=>{if(e.target&&e.target.classList&&e.target.classList.contains('ofmore')&&S)S.ofMore=e.target.open},true);
document.addEventListener('keydown',e=>{if(S&&S.reveal&&S.reveal.length&&(e.code==='Space'||e.code==='KeyR'||e.key==='Enter'||e.key==='Escape')){e.preventDefault();if(e.key==='Escape')S.reveal=null;else{S.reveal.shift();if(!S.reveal.length)S.reveal=null}render();return}if(e.key==='Escape'&&S&&S.luAna){S.luAna=false;render();return}if((e.code==='KeyR'||e.key==='Enter')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test((e.target.tagName||''))&&!e.target.closest?.('[role=button],[tabindex]')&&S&&!S.modal){const b=document.querySelector('[data-a="pkbuy"]');if(b){e.preventDefault();if(!e.repeat&&!b.disabled)b.click();return}}if(e.code==='Backquote'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||''))&&S){e.preventDefault();S.work=!S.work;save();render();return}if(e.key==='Escape'&&(S.modal||S.dexView)){S.modal=null;S.dexView=null;render()}});
// 드래그해서 넣기 (데스크톱). 누르고 칸 누르기도 그대로 됨
// 라인업 드래그 앤 드롭 (컴퓨터): 보유 카드 → 자리에 놓으면 넣기, 자리 → 자리에 놓으면 맞바꾸기. 폰은 누르기 방식 그대로
let DRAG=null;
vw.addEventListener('dragstart',e=>{const d=e.target.closest&&e.target.closest('[data-drag]');if(d){DRAG=d.dataset.drag;e.dataTransfer.setData('text/plain',DRAG);e.dataTransfer.effectAllowed='move';d.classList.add('dragging');return}});
vw.addEventListener('dragend',()=>{DRAG=null;vw.querySelectorAll('.dropok,.dragging').forEach(x=>x.classList.remove('dropok','dragging'))});
vw.addEventListener('dragover',e=>{if(!DRAG)return;const t=e.target.closest&&e.target.closest('[data-slot]');if(!t)return;const [k]=t.dataset.slot.split(':'),src=DRAG[0]==='c'?by[DRAG.slice(2)]:null,sk=DRAG[0]==='s'?DRAG.split(':')[1]:null;
 const ok=src?src.type===KIND(k):KIND(sk)===KIND(k);if(ok){e.preventDefault();t.classList.add('dropok')}});
vw.addEventListener('dragleave',e=>{const t=e.target.closest&&e.target.closest('[data-slot]');if(t)t.classList.remove('dropok')});
vw.addEventListener('drop',e=>{if(!DRAG)return;const t=e.target.closest&&e.target.closest('[data-slot]');if(!t)return;e.preventDefault();const [k,i]=t.dataset.slot.split(':'),to={k,i:+i};S.msg='';
 if(DRAG[0]==='c'){S.sel=to;place(DRAG.slice(2));S.sel=null}else{const [,fk,fi]=DRAG.split(':');if(!(fk===k&&+fi===+i))swapSlots({k:fk,i:+fi},to)}DRAG=null;render()});
vw.addEventListener('dragstart',e=>{const pc=e.target.closest&&e.target.closest('[data-cell][draggable="true"]');
 // 박힌 블록을 칸에서 바로 끌어 같은 선수 안에서 옮김
 if(pc){const cid=location.hash==='#skill'?S.skc:S.cardId,i=+pc.dataset.cell,r=Math.floor(i/4),q=i%4,hb=S.blocks.find(b=>b.on===cid&&b.at&&cells(b).some(([a,d])=>a+b.at[0]===r&&d+b.at[1]===q));if(!hb)return;
  grab=[r-hb.at[0],q-hb.at[1]];hb.home={cid,at:hb.at,rot:hb.rot};hb.on=null;hb.at=null;S.blkSel=hb.u;e.dataTransfer.setData('text/plain','b'+hb.u);e.dataTransfer.effectAllowed='move';vw.querySelectorAll('[data-cell]').forEach(x=>{const j=+x.dataset.cell;if(cells(hb).some(([a,d])=>(a+hb.home.at[0])*4+d+hb.home.at[1]===j))x.classList.add('lifting')});return}
 const b=e.target.closest&&e.target.closest('[data-blk]');if(!b)return;S.blkSel=b.dataset.blk;e.dataTransfer.setData('text/plain',b.dataset.blk);e.dataTransfer.effectAllowed='move';
 // 블록 모양만 끌려 보이게, 잡은 칸 기억
 const mini=b.querySelector('.mini'),bk=S.blocks.find(x=>x.u===S.blkSel);grab=null;if(mini&&bk){const rc=mini.getBoundingClientRect(),cs=cells(bk),w=Math.max(...cs.map(x=>x[1]))+1,h=Math.max(...cs.map(x=>x[0]))+1,cw=rc.width/w,ch=rc.height/h,x=e.clientX-rc.left,y=e.clientY-rc.top;
  if(x>=0&&y>=0&&x<=rc.width&&y<=rc.height){const gr=Math.min(h-1,Math.floor(y/ch)),gq=Math.min(w-1,Math.floor(x/cw));grab=cs.slice().sort((A,B)=>Math.hypot(A[0]-gr,A[1]-gq)-Math.hypot(B[0]-gr,B[1]-gq))[0]}
  if(e.dataTransfer.setDragImage)e.dataTransfer.setDragImage(mini,Math.max(0,Math.min(rc.width,x)),Math.max(0,Math.min(rc.height,y)))}});
vw.addEventListener('dragend',()=>{grab=null;const lb=S.blocks.find(b=>b.u===S.blkSel&&b.home);if(lb){S.blkSel=null;render()}vw.dataset.foot='';vw.querySelectorAll('[data-cell].fhint').forEach(x=>x.classList.remove('fhint'))});
vw.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('[data-cell]');if(!c||c.disabled)return;e.preventDefault();const cid=location.hash==='#skill'?S.skc:S.cardId,f=blkFoot(+c.dataset.cell,cid)||[],key=f.join();if(vw.dataset.foot===key)return;vw.dataset.foot=key;
 vw.querySelectorAll('[data-cell].fhint').forEach(x=>x.classList.remove('fhint'));f.forEach(i=>{const x=vw.querySelector(`[data-cell="${i}"]`);if(x)x.classList.add('fhint')})});

vw.addEventListener('drop',e=>{const c=e.target.closest&&e.target.closest('[data-cell]');if(!c)return;e.preventDefault();vw.dataset.foot='';tapBlk(+c.dataset.cell,location.hash==='#skill'?S.skc:S.cardId);render()});
vw.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&(e.target.dataset.pick||e.target.dataset.dexv||e.target.dataset.bslot||e.target.dataset.bput)){e.preventDefault();e.target.click()}});
vw.addEventListener('change',e=>{const t=e.target;if(t.id==='bldimp')return;if(t.id==='deckname'||t.id==='ludn'){S.deckName=t.value;return}if(t.id==='cpn')return;if(t.id==='blkfk'||t.id==='blkfg'){S.blkF={...(S.blkF||{}),[t.id.slice(4)]:t.value}}if(t.id.startsWith('tixarg-')){S.tixArg={...(S.tixArg||{}),[t.id.slice(7)]:t.value};return}if(t.id==='tixpick'){S.tixPick=t.value;return} // 쿠폰 입력칸: 다시 그리면 입력값과 받기 버튼 클릭이 사라짐
  S.msg='';if(t.id==='sort')S.sort=t.value;if(t.id==='fteam')S.fteam=t.value;if(t.id==='fyear')S.fyear=t.value;if(t.dataset.ds){S.ds={...(S.ds||{}),[t.dataset.ds]:t.value};S.dsRes=null}if(t.dataset.bau){S.bau={...BAU0,...(S.bau||{}),[t.dataset.bau]:t.value};if(t.dataset.bau==='t')S.bau.key=(t.value==='B'?BK:PKEY)[0];S.bauRes=null}if(t.dataset.sf){S.sf={...(S.sf||SF0),[t.dataset.sf]:t.value};S.mat=[]}if(t.id==='cpick'){S.cardId=t.value;S.back=false}if(t.dataset.pos)setPos(+t.dataset.pos,t.value);if(t.id==='t-live')S.tacLive=t.checked;render()});

const abd=id=>ABD.find(d=>d[0]===id),abOpen=d=>!d[2]||(ABU[d[2]]?ABU[d[2]][0]():false);
ABD.forEach(d=>{if(d[2]&&ABU[d[2]])d[6]=ABU[d[2]][1]});
// ===== 기존 화면 (주간·연도·친구 리그, 경기장, 보유 카드) =====
const cardHTML=(c,o={})=>card(c,{stats:1,pick:1,dim:o.dim});
function fxHTML(T){const tc=teamColor(starters(T),T.fxsel,(T.bench||[]).map(id=>byId[id]).filter(Boolean));return tc.fx.length?`<span class="fxchips">${tc.fx.map(f=>`<span class="fxc fx-${f.g}" title="${f.g}등급 덱 효과"><i>${f.g}</i>${esc(f.name)} · ${esc(f.d)} <b>야수 +${f.b} / 투수 +${f.p}</b></span>`).join('')}</span>`:`덱 효과 없음 · 가장 많은 연도·구단 ${esc(tc.top.year?tc.top.year[0]:'-')} ${tc.top.year?tc.top.year[1]:0}명 (12명부터)`}
function vCards(){const n=Object.keys(S.owned).length;
  const q=flt.q.trim();let L=(flt.all?CARDS:own()).filter(c=>(!flt.type||c.type===flt.type)&&(!flt.tier||c.tier===flt.tier)&&(!flt.line||c.line===flt.line)&&(!flt.year||c.year===+flt.year)&&(!q||c.name.includes(q)));
  L=[...L].sort(flt.sort==='year'?(a,b)=>a.year-b.year||b.ovr-a.ovr:flt.sort==='cost'?(a,b)=>b.cost-a.cost||b.ovr-a.ovr:(a,b)=>b.ovr-a.ovr);
  const sl=(k,o,l)=>`<select data-f="${k}" aria-label="${l}">${o.map(([v,t])=>`<option value="${v}" ${String(flt[k])===String(v)?'selected':''}>${t}</option>`).join('')}</select>`;
  return `<section class="band"><div class="lhead"><h1>컬렉션 <small>${n.toLocaleString()} / ${CARDS.length.toLocaleString()}</small></h1></div>
  <div class="filters"><input data-f="q" value="${esc(flt.q)}" placeholder="선수 이름" aria-label="선수 이름 검색">${sl('type',[['','타자+투수'],['B','타자'],['P','투수']],'유형')}${sl('tier',[['','모든 등급'],['N','노멀'],['S','스타'],['L','레전드']],'등급')}
  ${sl('line',[['','모든 구단'],...LINES.map(l=>[l,l])],'구단')}${sl('year',[['','모든 연도'],...[...YEARS].reverse().map(y=>[y,y])],'연도')}${sl('sort',[['ovr','능력순'],['cost','코스트순'],['year','연도순']],'정렬')}
  <label class="chk"><input type="checkbox" data-f="all" ${flt.all?'checked':''}> 미보유 카드도 보기</label></div>
  <p class="mini">${L.length.toLocaleString()}장</p><div class="grid">${L.slice(0,flt.lim).map(c=>cardHTML(c,{dim:!S.owned[c.id]})).join('')||'<p>해당 카드 없음.</p>'}</div>
  ${L.length>flt.lim?`<div class="btns" style="margin-top:16px"><button data-a="more">더 보기</button></div>`:''}</section>`}
function vGame(){
  if(!G)return `<section class="hero"><h1>진행 중인 경기 없음</h1><p><a href="#season">주간 리그</a>에서 경기장 입장.</p></section>`;
  const g=G,n=Math.max(9,g.line[0].length),bat=g.half,cur=g.done?null:g.t[bat].lu[g.idx[bat]].c,P=g.done?null:g.pit[1-bat].c,myBat=bat===g.me,B=g.bases;
  const ls=s=>Array.from({length:n},(_,i)=>g.line[s][i]??(i===g.inn-1&&g.half===s&&!g.done?g.hr:''));
  const box=s=>`<table class="tbl"><thead><tr><th class="l">${esc(g.t[s].name)}</th><th>타수</th><th>안타</th><th>홈런</th><th>타점</th><th>득점</th><th>볼넷</th><th>삼진</th><th>보살</th><th>실책</th></tr></thead><tbody>${Object.values(g.bx[s]).map(b=>`<tr><td class="l">${esc(b.c.name)} <small>${PK[b.pos]}</small></td><td>${b.ab}</td><td>${b.h}</td><td>${b.hr}</td><td>${b.rbi}</td><td>${b.r}</td><td>${b.bb}</td><td>${b.k}</td><td>${b.a||0}</td><td>${b.e||0}</td></tr>`).join('')}</tbody></table>
   <table class="tbl"><thead><tr><th class="l">투수</th><th>이닝</th><th>피안타</th><th>실점</th><th>볼넷</th><th>삼진</th></tr></thead><tbody>${g.px[s].map(p=>`<tr><td class="l">${esc(p.c.name)}</td><td>${Math.floor(p.outs/3)}.${p.outs%3}</td><td>${p.h}</td><td>${p.r}</td><td>${p.bb}</td><td>${p.k}</td></tr>`).join('')}</tbody></table>`;
  const tk=g.done||!S.tacLive?'':myBat?`<div class="btns tk"><span class="mini">작전</span>${(B[0]||B[1])&&g.outs<2?'<button data-a="tk" data-k="bunt">희생번트</button>':''}${(B[0]&&!B[1])||(B[1]&&!B[2])?'<button data-a="tk" data-k="steal">도루</button>':''}
    ${g.t[bat].bench.length?`<select id="phs" aria-label="대타">${g.t[bat].bench.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} ${yy(c.year)} (${c.ovr})</option>`).join('')}</select><button data-a="tk" data-k="ph">대타</button>`:''}${g.pending?`<b class="mini">예약: ${{bunt:'희생번트',steal:'도루',ph:'대타',ibb:'고의4구'}[g.pending.kind]}</b>`:''}</div>`
    :`<div class="btns tk"><span class="mini">수비 작전</span><button data-a="tk" data-k="ibb">고의4구</button>${g.pending?'<b class="mini">예약: 고의4구</b>':''}</div>`;
  return `<section class="board"><div class="scroll"><table class="ls"><thead><tr><th class="l">${g.done?'경기 종료':`${g.inn}회${g.half?'말':'초'}`}</th>${Array.from({length:n},(_,i)=>`<th>${i+1}</th>`).join('')}<th class="rr">R</th><th>H</th></tr></thead>
  <tbody>${[0,1].map(s=>`<tr class="${!g.done&&g.half===s?'up':''}"><td class="l"><i class="dot" style="background:${g.t[s].color}"></i>${esc(g.t[s].name)}</td>${ls(s).map(v=>`<td>${v}</td>`).join('')}<td class="rr">${g.sc[s]}</td><td>${g.hits[s]}</td></tr>`).join('')}</tbody></table></div>
  <div class="gfield">${diamond(g)}<div class="outs">아웃 ${[0,1,2].map(i=>`<i class="${i<g.outs?'on':''}"></i>`).join('')}</div>
   <div class="duel">${cur?`<div><small>타자</small><b>${esc(cur.name)}</b><span>${yy(cur.year)} ${esc(cur.team)} · 교타 ${Math.round(cur.r.con)} 장타 ${Math.round(cur.r.pow)}</span></div><div><small>투수</small><b>${esc(P.name)}</b><span>${g.pit[1-bat].bf}타자 상대 · 구위 ${Math.round(P.r.stu)} 제구 ${Math.round(P.r.ctl)}</span></div>`:`<div><b class="final">${g.res<0?'무승부':esc(g.t[g.res].name)+' 승리'}</b></div>`}</div></div>
  ${tk}<div class="btns gb">${g.done?`<button class="big" data-a="fin">${g.friendly?(g.friendly.sw?`시리즈 ${g.friendly.sw[0]}:${g.friendly.sw[1]} 결과 저장`:'친선전 결과 저장'):'결과 반영하고 다음 라운드'}</button>`:`<button class="big" data-a="pa">다음 타석</button><button data-a="inn">이닝 끝까지</button><button data-a="end">경기 끝까지</button>`}</div></section>
  <section class="band cols2"><div><h3>${g.hl?'하이라이트 <small>득점·홈런·보살·실책·교체</small>':'문자 중계'}</h3>${g.done&&gameMVP(g)?`<p class="gmvp"><b>경기 MVP</b> ${esc(gameMVP(g))}</p>`:''}<ol class="glog">${logHTML(g)}</ol></div><div><details open><summary>박스스코어</summary>${box(0)}${box(1)}</details></div></section>`}
/*MODES*/
/*ONLINE*/
// ===== 시작 화면: 배포판(Firebase)은 구글 로그인부터 =====
const FBMODE=()=>!!document.querySelector('script[type=module]');
function loginView(){return `<section class="login"><div class="logo big">프로호구 매니저<small>KBO 1982–2026 선수카드 매니저</small></div>
  <p class="note">구글 로그인 시 클라우드 저장 · 기기 간 이어하기 · 친구 리그.</p>
  ${ON.ready||window.FB?`<button class="big gbtn" data-a="o-login">Google로 로그인</button>`:'<p class="note">로그인 준비 중…</p>'}
  ${ON.msg?`<p class="note" style="color:var(--bad)">${esc(ON.msg)}</p>`:''}
  <button class="ghost" data-a="guest">로그인 없이 하기 (이 기기에만 저장)</button></section>`}
setTimeout(()=>{if(!ON.ready){ON.ready=1;if(S)render()}},8000);


// ===== 장비 =====
const EQSN={bat:'배트',glove:'글러브',spike:'스파이크',rosin:'로진',ball:'공인구',shoe:'투수화'},EQGC={일반:'g1',희귀:'g2',전설:'g3'};
function eqHTML(c){if(!ECON.EQ_SLOTS)return '';const id=baseId(c.id),K=ECON.EQ_KIND,EQ=S.eq||[],slots=ECON.EQ_SLOTS[c.type]||[];
  const on=slots.map(sl=>EQ.find(x=>x.on===id&&K[x.k][1]===sl));
  const tot=ECON.cardEq(S,id,byId),op=S.eqSlot&&S.eqSlot.id===id?S.eqSlot.sl:null; // SJ 2026-11-26: 슬롯을 눌러야 그 슬롯 추천 장비가 펼쳐짐(목록이 길어 스크롤을 막던 문제)
  const mine=op?EQ.filter(x=>K[x.k][0]===c.type&&K[x.k][1]===op&&x.on!==id).map(x=>({x,b:ECON.eqBonus(x,c)})).sort((a,b)=>(b.b?b.b.v:0)-(a.b?a.b.v:0)||(a.x.on?1:0)-(b.x.on?1:0)):[];
  const top=mine.slice(0,S.eqMore?99:3);
  return `<div class="eqp"><div class="eqh"><b>장비</b><small>${Object.keys(tot).length?Object.entries(tot).map(([k,v])=>`${SKN[k]} +${v}`).join(' · '):'칸을 눌러 장착'}</small></div>
  <div class="eqs">${slots.map((sl,i)=>{const it=on[i],b=it&&ECON.eqBonus(it,c);return `<div class="eqslot${it?' on '+EQGC[it.g]:''}${op===sl?' sel':''}" role="button" tabindex="0" data-a="eqsl" data-sl="${esc(sl)}" data-id="${esc(id)}" aria-expanded="${op===sl}"><small>${EQSN[sl]} ${op===sl?'▲':'▼'}</small>${it?`<b>${esc(ECON.eqName(it))}</b><em>${b?SKN[b.stat]+' +'+b.v:''}</em><button class="ghost" data-a="eqoff" data-u="${esc(it.u)}">빼기</button>`:'<span class="mute">비어 있음</span>'}</div>`}).join('')}</div>
  ${op?(mine.length?`<div class="eql">${top.map(({x,b},j)=>`<div class="eqi ${EQGC[x.g]}"><span><b>${j===0?'추천 · ':''}${esc(ECON.eqName(x))}</b><small>${x.on&&byId[x.on]?`${esc(byId[x.on].name)} 장착 중`:'미장착'}</small></span><em>${b?`${SKN[b.stat]} +${b.v}`:''}</em><button data-a="eqon" data-u="${esc(x.u)}" data-id="${esc(id)}">끼우기</button></div>`).join('')}${mine.length>3&&!S.eqMore?`<button class="ghost" data-a="eqmore">${mine.length-3}개 더 보기</button>`:''}</div>`:`<p class="note" style="margin:6px 0 0">${EQSN[op]} 장비 없음 · 미션 보상으로 획득</p>`):''}</div>`}
// ===== 미션 챕터 =====
let msSig='';
function msTick(){if(!ECON.missionCheck||!(ECON.CHAPTERS||[]).length)return;const sig=Object.keys(S.owned).length+'|'+Object.values(S.owned).reduce((a,b)=>a+(b|0),0)+'|'+Object.keys(S.dexDone||{}).length;if(sig===msSig)return;msSig=sig;const out=ECON.missionCheck(S);if(out.length){S.toast='미션 달성 · '+out.map(x=>`${x.ch?msLn(x.ch)+' ':''}${x.what}${x.card&&byId[x.card]?' '+byId[x.card].name:''}${x.rw&&rwText(x.rw)?' +'+rwText(x.rw):''}`).join(' / ');save()}}
const msLn=l=>SYN_LN[l]||l;
function msSubHTML(){const m=S.msSub;if(!m)return '';const last=!!(S.opt&&S.opt.submitLast),st=((S.ms||{})['ch:'+m.line])||{},chx=(ECON.CHAPTERS||[]).find(c=>c.line===m.line),need=chx?ECON.msProg(S,chx,'m3').need:5,room=need-(st.sub|0);
  const L=Object.keys(S.owned).map(id=>byId[id]).filter(c=>c&&c.line===m.line&&c.cost>=7).map(c=>({c,n:S.owned[c.id]|0,can:Math.max(0,(S.owned[c.id]|0)-(last?0:1))})).sort((a,b)=>b.can-a.can||b.c.cost-a.c.cost);
  const tot=Object.values(m.sel).reduce((a,b)=>a+b,0);
  return `<div class="modal"><div class="mbox"><div class="mhead"><b>${esc(msLn(m.line))} · 7코스트 이상 제출</b><span class="pill">${tot}/${room}</span><button class="ghost" data-a="msclose">닫기</button></div>
  <p class="note">${last?'마지막 1장까지 제출 가능 (도감 기록 유지)':'중복분만 제출 가능'} · <button class="ghost" data-a="msopt" style="min-height:30px;padding:2px 8px">${last?'중복만 내기로':'마지막 1장도 허용'}</button></p>
  <div class="scroll"><table class="tbl lul"><thead><tr><th class="l">선수</th><th>연도·구단</th><th>코스트</th><th>보유</th><th>제출 가능</th><th>낼 장수</th></tr></thead><tbody>
  ${L.map(({c,n,can})=>{const k=m.sel[c.id]|0;return `<tr class="${can?'':'use'}"><td class="l"><b>${esc(c.name)}</b>${c.v?` <small>${esc(vnm(c)||c.v)}</small>`:''}</td><td>${c.year} ${esc(c.team)}</td><td>${c.cost}</td><td>${n}</td><td>${can}</td><td>${can?`<button class="ghost" data-msn="${esc(c.id)}" data-d="-1" ${k?'':'disabled'}>−</button> <b>${k}</b> <button class="ghost" data-msn="${esc(c.id)}" data-d="1" ${k<can&&tot<room?'':'disabled'}>+</button>`:'-'}</td></tr>`}).join('')||'<tr><td colspan="6">해당 카드 없음</td></tr>'}</tbody></table></div>
  <div class="tools" style="margin-top:10px"><button data-a="msgo" ${tot?'':'disabled'}>${tot}장 제출</button>${S.msMsg?`<span class="note" style="color:var(--bad)">${esc(S.msMsg)}</span>`:''}</div></div></div>`}
function natHTML(){const N=ECON.NATS||[];if(!N.length)return '';const fin=N.filter(n=>ECON.natProg(S,n).done).length;
  return `<details class="natw"${S.natOpen===false?'':' open'}><summary><h3 style="display:inline;margin:0">국가대표</h3> <span class="pill">${fin}/${N.length}</span></summary><div class="msgrid nat">${N.map(n=>{const p=ECON.natProg(S,n);
    return `<div class="msch${p.done?' fin':''}"><div class="msh"><b>${esc(n.name.replace(/ 멤버 모으기$/,''))}</b><span class="msn">${p.done?'완료':`${p.have}/${p.need}`}</span></div>
    <p class="note msr" style="margin:0 0 6px">멤버 전원 보유 → ${esc(rwText(n.rw))}${n.nt&&n.nt.length?` + 국가대표 카드 ${n.nt.length}장`:''}</p>
    <div class="msrn">${n.mem.map(m=>{const own=m.ids.find(id=>(S.owned[id]|0)>0),nm=m.e.split('@')[0];return `<span class="${own?'got':''}" ${own?`data-pick="${esc(own)}"`:`data-dexv="${esc(m.ids[0])}"`} role="button" tabindex="0">${esc(nm)}</span>`}).join('')}</div></div>`}).join('')}</div></details>`}
const msTabs=()=>`<div class="subnav mstabs" role="tablist">${[['ch','미션 챕터'],['set','수집 세트']].map(([k,n])=>`<button role="tab" aria-selected="${(S.msTab||'ch')===k}" class="${(S.msTab||'ch')===k?'on':''}" data-a="mstab" data-k="${k}">${n}</button>`).join('')}</div>`;
function vMission(){if(S.msTab==='set')return msTabs()+vDex('set');return msTabs()+vMission0()}
function vMission0(){const CH=ECON.CHAPTERS||[];if(!CH.length)return `<section class="band"><h2>미션</h2><p class="note">미션 데이터 없음</p></section>`;
  const fin=CH.filter(c=>(S.msFin||{})[c.id]).length,last=!!(S.opt&&S.opt.submitLast);
  return `<section class="band ms"><div class="mhead"><h2 style="margin:0;margin-right:auto">미션</h2><span class="pill">챕터 완료 ${fin}/${CH.length}</span><label class="chk"><input type="checkbox" data-msopt="1" ${last?'checked':''}> 제출 때 마지막 1장도 허용</label></div>
  <div class="msmeta">${ECON.MS_META.map(([k,name,rw])=>{const need=k==='all'?CH.length:k,done=(S.msMeta||{})[k];return `<div class="${done?'done':''}"><b>${esc(name)}</b><span>${Math.min(fin,need)}/${need}</span><small>${esc(rwText(rw))}</small></div>`}).join('')}</div>
  ${natHTML()}
  <h3 style="margin:16px 0 8px">구단 챕터</h3>
  <div class="msgrid">${CH.map(ch=>{const st=(S.ms||{})[ch.id]||{},n=ECON.MS_DEF.filter(m=>st[m[0]]).length,cyc=ECON.msCyc?ECON.msCyc(S,ch):0,left=ch.mx.filter(id=>!(S.owned[id]>0)).length,done=(S.msFin||{})[ch.id]&&!left;
    return `<div class="msch${done?' fin':''}"><div class="msh"><b>${esc(msLn(ch.line))}</b>${cyc?`<em class="cyc">${cyc+1}회차</em>`:''}<span class="msn">${n}/5</span>${done?'<em>완료</em>':st.mid?'<em class="mid">3개 달성</em>':''}</div>
    ${ch.mx.length?`<div class="msrn"><small>${rnName(ch.line)} ${ch.mx.length-left}/${ch.mx.length}${left&&(S.msFin||{})[ch.id]?` · 남은 ${left}장`:''}</small>${ch.mx.map(id=>{const c=byId[id];return c?`<span class="${S.owned[id]>0?'got':''}" ${S.owned[id]>0?`data-pick="${esc(id)}" role="button" tabindex="0"`:`data-dexv="${esc(id)}" role="button" tabindex="0"`}>${c.no?`<i>${esc(c.no)}</i>`:''}${esc(c.name)}</span>`:''}).join('')}</div>`:''}
    <ol>${ECON.MS_DEF.map(([mid,star,desc,rw])=>{const p=ECON.msProg(S,ch,mid);return `<li class="${p.done?'done':''}"><i class="mst">★${star}</i><span>${esc((ECON.msText?ECON.msText(S,ch,mid):desc).replace(/^그 구단 /,""))}<small>${esc(rwText(rw)||'')}${mid==='m3'?' · EX 조각 1':''}</small></span><b>${p.done?'완료':`${p.have}/${p.need}`}</b>${mid==='m3'&&!p.done?`<button class="ghost" data-a="mssub" data-line="${esc(ch.line)}">제출</button>`:''}</li>`}).join('')}</ol>
    <p class="note msr">3개 → EX 확정권 · 5개 → 전설 장비 + ${ch.mx.length?rnName(ch.line)+' 1장':'EX 확정권 + 10,000P'}</p></div>`}).join('')}</div></section>${msSubHTML()}`}
// ===== 화면 전환 =====
const ROUTES={lineup:()=>luHead()+vLineup(),mission:vMission,home:vHome,season:vSeason,years:vYears,online:vOnline,game:vGame,skill:vSkill,cards:vCards,card:vCard,shop:vShop,shop_sp:vShop,shop_tc:vShop,shop_b:vShop,synth:vSynth,abroad:vAbroad,dex:vDex,guide:vGuide,builder:vBuilder,dsim:vDsim};
const LEG=new Set(['season','years','online','game','cards']);
const NAVS={home:[['home','홈']],play:[['season','주간 리그'],['years','연도별 리그'],['online','친구 리그'],['dsim','덱 대결'],['game','경기장']],team:[['builder','덱'],['skill','스킬'],['cards','보유 카드']],cards:[['synth','합성'],['abroad','유학'],['dex','도감'],['mission','미션']],store:[['shop','선수 카드팩'],['shop_sp','서포트'],['shop_tc','작전'],['shop_b','스킬 블록']]};
const NAVG=Object.fromEntries(Object.entries(NAVS).flatMap(([g,L])=>L.map(([h])=>[h,g])));NAVG.card='team';NAVG.guide='home';NAVG.lineup='play';
const NAVN={home:'홈',play:'경기',team:'팀',cards:'카드',store:'상점'};
const view=()=>{const h=location.hash.slice(1);return ROUTES[h]?h:'home'};
const BUILD='__BUILD__';
const TABI={home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="currentColor"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 5.5q3 6.5 0 13M17 5.5q-3 6.5 0 13" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',team:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="currentColor"/><circle cx="17" cy="9" r="2.8" fill="currentColor" opacity=".7"/><path d="M2 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5zM15 14c4 0 7 2 7 6h-5" fill="currentColor"/></svg>',cards:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="12" height="16" rx="2" fill="currentColor" opacity=".55"/><rect x="4" y="6" width="12" height="16" rx="2" fill="currentColor"/></svg>',store:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.3 11H5.3z" fill="currentColor"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',guide:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4z" fill="currentColor"/></svg>'};
function head(k){if(NAVG[k]&&NAVS[NAVG[k]].some(([x])=>x===k))S['lastTab_'+NAVG[k]]=k;const s=S.season,tx=Object.values(S.tix||{}).reduce((a,b)=>a+(b|0),0),g=NAVG[k],L=NAVS[g]||[];
  return `${S.work?xlBar(k):''}<div class="logo">${S.work?'업무 현황<small>2026 하반기 실적 집계 · 담당 부서 공유용</small>':`프로호구 매니저<small>KBO 1982–2026 선수카드 매니저 · ${CARDS.length.toLocaleString()}장</small>`}</div>
  <div class="wallet"><span id="ptw">${(S.pt||0).toLocaleString()} P</span>${tx?`<a href="#shop" style="text-decoration:none;color:inherit"><span>확정권 ${tx}장</span></a>`:''}<span>블록 ${S.blocks.filter(b=>!b.on).length}</span><button id="helpBtn2" class="ghost mhelp" aria-label="설명 보기" aria-pressed="${document.body.classList.contains('showhelp')}">?</button>${s?`<span>${s.tier?esc(tierName(s.tier)):'시즌 '+s.n} · ${Math.min(s.round+1,s.sched.length)}/${s.sched.length}</span>`:''}</div>
  <nav id="nav">${Object.entries(NAVS).map(([gk,LL],i)=>`<a href="#${LL[0][0]}" data-g="${gk}" class="${gk===g?'on':''}" title="Shift+${i+1}">${NAVN[gk]}</a>`).join('')}<a href="#guide" class="${k==='guide'?'on':''}" style="margin-left:auto">능력치 가이드</a><button id="helpBtn" class="ghost" aria-pressed="${document.body.classList.contains('showhelp')}">${document.body.classList.contains('showhelp')?'설명 숨기기':'설명 보기'}</button></nav>
  <nav id="tabbar" aria-label="메뉴">${[...Object.keys(NAVS),'guide'].map(gk=>{const on=gk==='guide'?k==='guide':gk===g&&k!=='guide',h=gk==='guide'?'guide':(NAVS[gk].find(([x])=>x===S['lastTab_'+gk])||NAVS[gk][0])[0];return `<a href="#${h}" class="${on?'on':''}"${on?' aria-current="page"':''}>${TABI[gk]}<span>${gk==='guide'?'가이드':NAVN[gk]}</span></a>`}).join('')}</nav>
  <div id="subnav" class="subnav2" role="navigation" aria-label="하위 메뉴" ${L.length<2?'hidden':''}>${L.length>1?L.map(([h,n],i)=>`<a href="#${h}" class="${h===k?'on':''}"${h===k?' aria-current="page"':''}>${n}${i<4?`<kbd class="hkb">F${i+1}</kbd>`:''}</a>`).join(''):''}</div>
  ${S.toast?`<div class="toast">${esc(S.toast)}</div>`:''}`}
const XLC='ABCDEFGHIJKLMN'.split('');
function xlBar(k){const ref=XLC[(k.length*3)%XLC.length]+(k.charCodeAt(0)%40+2);return `<div class="xlbar" aria-hidden="true"><div class="xlt">업무 현황.xlsx<span>저장됨</span></div><div class="xlr">${['파일','홈','삽입','페이지 레이아웃','수식','데이터','검토','보기'].map((x,i)=>`<i class="${i===1?'on':''}">${x}</i>`).join('')}</div><div class="xlf"><b>${ref}</b><i>fx</i><span>=SUMIFS(실적!D:D,실적!B:B,"${esc(NAVN[NAVG[k]]||'홈')}")</span></div><div class="xlc"><i></i>${XLC.map(c=>`<i>${c}</i>`).join('')}</div></div>`}
const THEMES={LG:['#c30452','#ff8fb8'],두산:['#1a1748','#ff6b72'],삼성:['#074ca1','#8ab8ff'],KIA:['#d8001f','#ff9a9a'],롯데:['#041e42','#ff7b84'],키움:['#6d0a1d','#f0c27b'],한화:['#f26a00','#ffb36b'],SSG:['#ce0e2d','#f6d36b'],NC:['#2b4a80','#d9b48a'],KT:['#1f1f1f','#ff5a4f']};
function themeSet(){const r=document.documentElement.style,t=THEMES[S.theme];if(t){r.setProperty('--clay',t[0]);r.setProperty('--clay2',`color-mix(in srgb,${t[0]} 80%,#000)`);r.setProperty('--gold',t[1])}else['--clay','--clay2','--gold'].forEach(k=>r.removeProperty(k))}
function xlSet(){themeSet();const on=!!S.work;document.body.classList.toggle('xl',on);document.title=on?'업무 현황.xlsx':'프로호구 매니저'}
const SAFE=(f,d)=>{try{return f()}catch(e){console.error('[render]',e);RERR=RERR||(e&&e.message)||String(e);return d}};let RERR='';
function render(){if(!S)return;if(S.pkOut&&S.pkOut!==revSeen){revSeen=S.pkOut;if(S.pkOut.cards)revQueue(S.pkOut.cards.map(c=>c.id))}RERR='';SAFE(ensureUI);SAFE(xlSet);SAFE(msTick);if(S.season&&!G){SAFE(weekTick);SAFE(ylTick)}SAFE(restoreLift);SAFE(syncTeam);SAFE(rebuildOwn);
  if(FBMODE()&&!ON.user&&!S.guest){document.body.dataset.bg='field';hdr.innerHTML='';vw.innerHTML=loginView();return}
  const k=view(),y=scrollY;document.body.dataset.bg=k==='lineup'?(S.tb==='P'?'pen':'team'):k==='skill'?'cage':k==='cards'||k==='card'?'team':k==='abroad'?'fungo':k==='game'?'catch':'field';hdr.innerHTML=SAFE(()=>head(k),'');document.querySelectorAll('body>#tabbar').forEach(e=>e.remove());{const tb=hdr.querySelector('#tabbar');if(tb)document.body.appendChild(tb)}let body;try{body=ROUTES[k]()}catch(e){console.error(e);body=`<section class="band"><h2>화면 오류</h2><p class="note">${esc(e.message)}</p></section>`}
  vw.innerHTML=(LEG.has(k)?`<div class="lg">${body}</div>`:body)+SAFE(cmpBar,'')+SAFE(()=>modal(),'')+SAFE(noticeHTML,'')+verBanner();if(RERR)vw.insertAdjacentHTML('afterbegin',`<p class="warn" style="margin:8px 0">화면 일부 오류 · ${esc(RERR)} (이 문구를 캡처해 알려 주세요)</p>`);S.toast='';
  SAFE(()=>{const sv=$('#sv');if(sv)sv.value=btoa(unescape(encodeURIComponent(JSON.stringify(S,function(kk,v){return this===S&&TRANS.has(kk)?undefined:v}))));});if(S.modal||S.dexView)scrollTo(0,y);saveSoon()}
// 메뉴를 옮기면 열려 있던 카드 팝업을 모두 닫음(SJ 2026-11-26: 닫기 안 누르면 다른 메뉴에서도 떠 있던 문제)
const closePops=()=>{if(!S)return;S.modal=null;S.mslot=null;S.dexView=null;S.bmodal=null;S.bmslot=null;S.mflip=false;S.eqSlot=null};
addEventListener('hashchange',()=>{closePops();render();scrollTo(0,0)});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#nav a,#tabbar a,#nav button,#tabbar button')&&S&&(S.modal||S.dexView||S.bmodal)){closePops();render()}},true);
hdr.addEventListener('click',e=>{const hb=e.target.closest('#helpBtn,#helpBtn2');if(hb){document.body.classList.toggle('showhelp');render()}});
// 기존 게임 동작 (경기 진행·리그·친구 리그·저장 코드·사진 올리기)
const REALA=new Set(['tview','tvx','tsk','tss','lgtab','mstab','oft','guest','start','auto','newseason','pa','inn','end','fin','tk','copy','load','reset','more','rmphoto','dexmore','dexclr','dexhv','phexp','ntcok','vercheck','abonly','abmore','luview','decknew','decksave','deckren','deckload','deckdel','lustat','dism','synview','bldmore','bldclr','bldfrom','bldapply','bldsave','bldrec','bldview','luana','bldcode','bldimg','bldimp','coupon','eqon','eqoff','eqsl','eqmore','mssub','msgo','msclose','msopt','theme','work']);
function realClick(b){const a=b.dataset.a;if(a.startsWith('o-')){oAct(a,b);return}if(a.startsWith('m-')){mAct(a,b);return}
  if(a==='start')startGame(false);else if(a==='auto')startGame(true);else if(a==='newseason'){newSeason();render()}
  else if(a==='pa'){pa(G,true);render()}else if(a==='inn'){const h=G.half,n=G.inn;let k=0;while(!G.done&&G.half===h&&G.inn===n&&k++<300)pa(G);render()}
  else if(a==='end'){simAll(G);render()}else if(a==='fin'){if(G.friendly)oFinish();else endGame()}
  else if(a==='tk'){const k=b.dataset.k;tactic(G,k,k==='ph'?$('#phs').value:null);pa(G);render()}
  else if(a==='more'){flt.lim+=240;render()}
  else if(a==='luview'){S.luView=b.dataset.v;if(b.dataset.v==='card')S.luStat='';render()}
  else if(a==='dism'){const r=ECON.dismantle(S,byId,b.dataset.id,1);S.toast=r.err||(r.shard?`EX 조각 +1 (${r.left}/3)${r.tix?` · 구단 지정 EX 확정권 ${r.tix}장 획득`:''}`:`분해 · +${r.pt}P`);rebuildOwn();if(!by[S.modal])S.modal=null;save();render()}
  else if(a==='bldview'){S.bldView=b.dataset.v;render()}
  else if(/^bld/.test(a))bldAct(a);
  else if(a==='synview'){S.synView=b.dataset.v;render()}
  else if(a==='lustat'){S.luStat=b.dataset.v;render()}
  else if(/^deck/.test(a))deckAct(a);
  else if(a==='phexp')phExport();
  else if(a==='abonly'){S.abOnly=S.abOnly===false;S.abLim=0;render()}
  else if(a==='abmore'){S.abLim=(S.abLim||48)+48;render()}
  else if(a==='ntcok'){const n=NOTICES.find(x=>x.id===b.dataset.id);S.ntc=S.ntc||{};if(n){if(n.rw&&S.ntc[n.id]!=='got'){ECON.grant(S,n.rw);S.ntc[n.id]='got';S.toast='공지 보상 · '+rwText(n.rw)}else if(!S.ntc[n.id])S.ntc[n.id]=1}S.ntcView=null;save();render()}
  else if(a==='vercheck')verCheck(false);
  else if(a==='dexhv'){const F=S.dexF=S.dexF||{},v=b.dataset.v;let H=F.h!=='miss',M=F.h!=='have';if(v==='have')H=!H;else M=!M;if(!H&&!M){if(v==='have')M=true;else H=true}F.h=H&&M?'':H?'have':'miss';S.dexLim=0;render()}
  else if(a==='dexclr'){S.dexF={};S.dexQ='';S.dexLim=0;render()}
  else if(a==='dexmore'){{const st=(S.dexK||'all')==='all'?60:24;S.dexLim=(S.dexLim||st)+st};render()}
  else if(a==='coupon')redeemCoupon();
  else if(a==='guest'){S.guest=1;save();render()}
  else if(a==='rmphoto'){const id=S.modal||S.dexView;if(id){delete S.photos[baseId(id)];delete S.photos[id]}save();render()}
  else if(a==='theme'){S.theme=b.dataset.v||'';S.setbOpen=1;save();render()}
  else if(a==='work'){S.work=!S.work;save();render()}
  else if(a==='mssub'){S.msSub={line:b.dataset.line,sel:{}};S.msMsg='';render()}
  else if(a==='tsk'){S.tsK=b.dataset.k;S.tsS='';render()}else if(a==='tss'){S.tsS=b.dataset.k;render()}
  else if(a==='tview'){S['tv_'+b.dataset.g]=+b.dataset.i;render();scrollTo(0,0)}else if(a==='tvx'){S['tv_'+b.dataset.g]=null;render()}
  else if(a==='lgtab'){S['tv_'+b.dataset.g]=null;S['lgTab_'+b.dataset.g]=b.dataset.k;render();scrollTo(0,0)}
  else if(a==='mstab'){S.msTab=b.dataset.k;S.dexLim=0;render()}
  else if(a==='msclose'){S.msSub=null;render()}
  else if(a==='msopt'){S.opt=S.opt||{};S.opt.submitLast=!S.opt.submitLast;save();render()}
  else if(a==='msgo'){const m=S.msSub;if(!m)return;const ids=Object.entries(m.sel).flatMap(([id,n])=>Array(n).fill(id));if(!ids.length){S.msMsg='카드 선택';render();return}const r=ECON.missionSubmit(S,m.line,ids);if(r.err){S.msMsg=r.err;render();return}S.toast=`${r.used}장 제출 · ${r.have}장 누적`+(r.out&&r.out.length?' · '+r.out.map(x=>x.what+(x.rw?' '+rwText(x.rw):'')).join(' · '):'');S.msSub=null;msTick();save();render()}
  else if(a==='eqsl'){const sl=b.dataset.sl,id=b.dataset.id;S.eqSlot=S.eqSlot&&S.eqSlot.id===id&&S.eqSlot.sl===sl?null:{id,sl};S.eqMore=0;render()}
  else if(a==='eqmore'){S.eqMore=1;render()}
  else if(a==='eqon'){const r=ECON.equip(S,b.dataset.u,b.dataset.id,byId);S.toast=r.err||'';if(!r.err)S.eqSlot=null;save();render()}
  else if(a==='eqoff'){ECON.unequip(S,b.dataset.u);save();render()}
  else if(a==='oft'){S['ofTab_'+(b.dataset.g||'lg')]=b.dataset.k;render();scrollTo(0,0);return}else if(a==='luana'){if(b.dataset.k){S.tb=b.dataset.k;S.luAna=true}else S.luAna=!S.luAna;render()}
  else if(a==='copy'){const t=$('#sv').value;navigator.clipboard?.writeText(t).then(()=>{b.textContent='복사됨'},()=>{$('#sv').select()})}
  else if(a==='load'){try{const o=JSON.parse(decodeURIComponent(escape(atob($('#sv').value.trim()))));if(o&&o.team&&o.season){S=o;ensureUI();save();render()}}catch(e){b.textContent='코드 오류'}}
  else if(a==='reset'){if(b.dataset.c){fresh();packOut=null;G=null;render()}else{b.dataset.c=1;b.textContent='한 번 더 누르면 초기화'}}}
vw.addEventListener('click',e=>{const ra=e.target.closest('[data-a]');if(ra&&!ra.disabled&&(REALA.has(ra.dataset.a)||/^[om]-/.test(ra.dataset.a))){e.stopImmediatePropagation();realClick(ra)}},true);
vw.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.msopt){S.opt=S.opt||{};S.opt.submitLast=t.checked;save();render();return}
  if(t.dataset.up&&t.files&&t.files[0]){const id=t.dataset.up,img=new Image();img.onload=()=>{const W=240,H=Math.round(img.height*W/img.width),cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(img,0,0,W,H);
    S.photos=S.photos||{};S.photos[id]=cv.toDataURL('image/jpeg',.82);try{save()}catch(e){};render()};img.src=URL.createObjectURL(t.files[0]);return}
  if(t.dataset.f){flt[t.dataset.f]=t.type==='checkbox'?t.checked:t.value;flt.lim=120;render();return}
  if(t.id==='tn'){S.team.name=t.value.trim()||'내 구단';save();render();return}
  if(t.id==='recy'||t.id==='rect'||t.id==='recx'){S.recF={...RF0,...(S.recF||{})};if(t.id==='recy'){S.recF.year=t.value;S.recF.team='all'}else if(t.id==='rect')S.recF.team=t.value;else S.recF.fx=t.value;render();return}
  if(t.dataset.fxg){fxSet(t.dataset.fxs,t.dataset.fxg,t.value);return}
  if(t.dataset.bf){S.bldF=S.bldF||{};S.bldF[t.dataset.bf]=t.type==='checkbox'?t.checked:t.value;if(t.dataset.bf==='y'||t.dataset.bf==='y2')S.bldF.t='';S.bldLim=40;render();return}
  if(t.dataset.lf){S.lf=S.lf||{};S.lf[t.dataset.lf]=t.value;render();return}
  if(t.dataset.sim){const B=bldInit(),id=S.bmodal;B.sim=B.sim||{};const x=B.sim[id]=B.sim[id]||{ab:{},sk:{},eq:{}};const g=t.dataset.sim,k=t.dataset.k;if(t.value&&t.value!=='0')x[g][k]=g==='eq'?t.value:+t.value;else delete x[g][k];if(!Object.keys(x.ab).length&&!Object.keys(x.sk).length&&!Object.keys(x.eq).length)delete B.sim[id];save();render();return}
  if(t.id==='decksel'){S.deckSel=t.value;S.deckDel=0;render();return}
  if(t.id==='deckname'||t.id==='ludn'){S.deckName=t.value;return}
  if(t.id==='deckmgr'){const d=(S.decks||[]).find(x=>x.id===S.deckSel),m=MG.find(x=>x.id===t.value);if(d&&m){d.t.mgr=m.id;S.msg=`'${d.name}' 감독을 ${m.n}(으)로 바꿨어요`;save()}render();return}
  if(t.dataset.mdeck){S.modeDeck=S.modeDeck||{};S.modeDeck[t.dataset.mdeck]=t.value;save();render();return}
  if(t.id==='tll'){S.pkSel.tl=t.value;render();return}
  if(t.id==='tyl'){S.pkSel.ty={line:t.value,years:[]};render();return}
  if(t.id==='dexq'){S.dexQ=t.value;S.dexLim=0;render();return}
  if(t.id==='phimp'&&t.files&&t.files[0]){phImport(t.files[0]);return}
  if(t.id==='phover'){S.phOver=t.checked;render();return}
  if(t.id==='lucol'){S.luCol=+t.value;render();return}
  if(t.id==='pksel'){S.pk=t.value;S.pkMsg='';S.pkOut=null;render();return}
  if(t.id==='abq'){S.abQ=t.value;S.abLim=0;render();return}
  if(/^dex(y|t|st|h|p|v)$/.test(t.id)){S.dexF=S.dexF||{};S.dexF[t.id.slice(3)]=t.value;if(t.id==='dexy'&&S.dexF.t&&t.value){const y=+t.value,o=S.dexF.t;if(!CARDS.some(c=>c.year===y&&c.team===o)){const ln=(CARDS.find(c=>c.team===o)||{}).line,n=ln&&CARDS.find(c=>c.year===y&&c.line===ln);S.dexF.t=n?n.team:''}}S.dexLim=0;render();return}
  if(t.id==='t-live'){S.tacLive=t.checked;render();return}});
// ===== 시작 =====
vw.innerHTML='<section class="band"><h1>선수 카드 불러오는 중…</h1><p class="note">KBO 1982~2026 기록으로 만든 카드</p></section>';
fetch('cards.json').then(r=>r.json()).then(j=>{loadCards(j);j.cards.forEach((r,i)=>{if(r.no!=null&&CARDS[i])CARDS[i].no=r.no});
  for(const c of CARDS){c.col=TC[c.team]||LINE_COLOR[c.line]||'#555';if(c.reg)c.rg=c.reg}
  LINES=[...new Set(CARDS.filter(c=>c.v!=='NT').map(c=>c.line))];YEARS=[...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a);ECON.buildSets(CARDS);if(ECON.buildMissions)ECON.buildMissions(CARDS);if(ECON.buildNat&&typeof NAT_SETS!=='undefined')ECON.buildNat(CARDS,NAT_SETS,natHit);
  try{const t=localStorage.getItem(KEY);if(t){S=JSON.parse(t);if(!S.season||!S.team)S=null}}catch(e){S=null}
  if(!S)fresh();else{migSpecial(S);for(const id in S.owned)if(!byId[id])delete S.owned[id];S.blocks=S.blocks||[];S.gp=S.gp||{};S.tq=S.tq||{};S.sq=S.sq||{};S.team.bench=S.team.bench||[]}
  ensureUI();const lg=ECON.login(S);if(lg)S.toast=`출석 ${lg.streak}일째 · +${rwText(lg)}`;
  render();fbBoot()}).catch(e=>{console.error(e);vw.innerHTML=`<section class="band"><h1>카드 데이터 불러오기 실패</h1><p>${esc(e.message)}</p></section>`});
})();
