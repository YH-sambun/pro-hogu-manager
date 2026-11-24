(()=>{
// ===== 프로호구 매니저 UI (시안 디자인 이식판) =====
const $=s=>document.querySelector(s),vw=document.getElementById('view'),hdr=document.getElementById('hdr');
const KEY='diamond-chronicle-v2';
let S=null,G=null,packOut=null,flt={type:'',tier:'',line:'',year:'',q:'',sort:'ovr',all:false,lim:120};
// 저장: 화면 전용 임시 값은 빼고 저장. 라인업은 S.team이 원본(S.lu 등은 화면용 사본)
const TRANS=new Set(['sel','modal','mslot','mflip','msg','blkSel','synRes','recm','undo','cmpA','pkMsg','cpMsg','toast','tdraw','ojoin','pkOut','lu','bench','rot','pen','abPick','ssel']);
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
const userT=()=>{syncTeam();return {...clean(S.team),color:'#e07a45',blocks:S.blocks,abSt:S.abSt||{}}};
const starters=T=>{T=clean(T);return [...T.lineup.map(x=>x.id),...T.rot,...T.pen].filter(Boolean).map(id=>byId[id])};
const regCards=T=>{T=clean(T);return [...starters(T),...T.bench.map(id=>byId[id])].filter(Boolean)};
function validate(){syncTeam();
  const T=S.team,e=[],ps=T.lineup.map(x=>x.pos);
  if(T.lineup.length!==9||T.lineup.some(x=>!x.id))e.push('타순 9자리를 모두 채워 주세요');
  for(const p of POS)if(!ps.includes(p))e.push(`${PFULL[p]} 자리가 없습니다`);
  for(const x of T.lineup){const c=byId[x.id];if(c&&!canPlay(c,x.pos))e.push(`${c.name}은(는) ${PFULL[x.pos]}을(를) 볼 수 없어요`)}
  if(T.rot.filter(Boolean).length<5)e.push('선발 5명을 채워 주세요');
  if(!T.pen.filter(Boolean).length)e.push('불펜에 최소 1명이 필요합니다');
  const nm={};for(const c of regCards(T))nm[pkt(c)]=(nm[pkt(c)]||0)+1;for(const k in nm)if(nm[k]>1)e.push(`${k.split('|')[0]} 선수가 중복 등록됐습니다`);
  for(const c of regCards(T))if((S.ab||[]).some(a=>a.id===c.id&&!a.got))e.push(`${c.name}은(는) 유학 중이에요`);
  const cost=regCards(T).reduce((s,c)=>s+c.cost,0);if(cost>COST_CAP)e.push(`1군 코스트 ${cost} / 상한 ${COST_CAP} 초과`);
  return e}
// 화면용 라인업 사본(S.lu=[[포지션,id]], S.bench/rot/pen 고정 칸) ↔ S.team
function pullTeam(){const T=S.team,pad=(a,n)=>{a=[...(a||[])];while(a.length<n)a.push(null);return a.slice(0,n)};
  const L=(T.lineup||[]).map(x=>[x.pos,x.id]);for(const p of POS)if(!L.some(x=>x[0]===p))L.push([p,null]);
  Object.defineProperty(S,'lu',{value:L.slice(0,9),writable:true,configurable:true,enumerable:false});
  for(const [k,n] of [['bench',5],['rot',5],['pen',6]])Object.defineProperty(S,k,{value:pad(T[k],n),writable:true,configurable:true,enumerable:false})}
function syncTeam(){if(!S||!S.__ui)return;const T=S.team;T.lineup=S.lu.map(([pos,id])=>({id,pos}));T.bench=S.bench.slice();T.rot=S.rot.slice();T.pen=S.pen.slice()}
function ensureUI(){if(S.__ui)return;Object.defineProperty(S,'__ui',{value:1,enumerable:false,configurable:true});
  for(const k of ['mgr','tsel'])Object.defineProperty(S,k,{get(){return this.team[k]},set(v){this.team[k]=v},enumerable:false,configurable:true});
  Object.defineProperty(S,'sup',{get(){return this.team.sup=(this.team.sup||[]).filter(x=>x.left>0)},set(v){this.team.sup=v},enumerable:false,configurable:true});
  if(typeof ECON!=='undefined')ECON.migrate(S);
  const D={locks:[],tq:{},sq:{},blocks:[],gp:{},cond:{},ab:[],abHist:{},abSt:{},abSum:{},photos:{},mat:[],sub:'order',tb:'B',pf:'all',side:'line',sort:'ovr',fteam:'all',fyear:'all',sk:'p',dexK:'team',back:false,pt:0};
  for(const k in D)if(S[k]==null)S[k]=D[k];
  if(!MG.some(m=>m.id===S.team.mgr))S.team.mgr=MG[0].id;
  pullTeam();if(!byId[S.cardId])S.cardId=used()[0]||Object.keys(S.owned)[0]}
const statLine=c=>c.type==='B'?`타율 ${c.s[0].toFixed(3).replace(/^0/,'')} · ${c.s[1]}홈런 · ${c.s[2]}타점 · ${c.s[3]}도루 · ${c.s[4]}경기`:`평균자책 ${c.s[0].toFixed(2)} · ${c.s[1]}승 ${c.s[2]}패 · ${c.s[3]}세이브 · ${c.s[4]}홀드 · ${c.s[5]}탈삼진 · ${c.s[6]}이닝`;
// 보유 카드 목록: 같은 카드 2장 이상이면 중복분을 id#2, id#3…으로 펼침 (합성·유학 재료)
let OWN=[],OWNU=[],DUP={};
function rebuildOwn(){OWN=[];OWNU=[];DUP={};for(const id in S.owned){const c=byId[id];if(!c)continue;OWN.push(c);OWNU.push(c);for(let k=2;k<=(S.owned[id]|0);k++){const d={...c,id:id+'#'+k,dup:1};DUP[d.id]=d;OWN.push(d)}}}
const by=new Proxy({},{get:(_,k)=>typeof k==='string'?(DUP[k]||byId[k]):undefined,has:(_,k)=>!!(DUP[k]||byId[k])});
// 경기 화면용 (엔진 G)
function diamond(g){const on=i=>g.bases[i]?'on':'';return `<svg viewBox="0 -12 200 182" class="gdia" role="img" aria-label="주자 상황">
  <path d="M100 150 L30 80 L100 10 L170 80 Z" class="turf"/><circle cx="100" cy="82" r="9" class="mound"/>
  <rect x="160" y="70" width="20" height="20" transform="rotate(45 170 80)" class="base ${on(0)}"/><rect x="90" y="0" width="20" height="20" transform="rotate(45 100 10)" class="base ${on(1)}"/>
  <rect x="20" y="70" width="20" height="20" transform="rotate(45 30 80)" class="base ${on(2)}"/><path d="M92 142h16v8l-8 8-8-8z" class="plate"/></svg>`}
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
function deckFx(){const all=used().map(id=>byId[id]).filter(Boolean),T=teamColor(all);
  const fx=T.fx.map(f=>({cat:f.fam,g:f.g,n:f.name,sub:f.d,b:f.b,p:f.p,on:1,cur:1,need:1}));
  return {L:fx,fx,bat:T.bat,pit:T.pit,cost:T.cost,cnt:all.length}}
const TCOLC=FX_FAM;
// 유학: 유학지·조건은 시안 표, 비용·확률은 econ.js
const RUSH=ECON.RUSH,studyFee=ECON.studyFee,rushFee=ECON.rushFee,STUDY=ECON.STUDY,STUDY_BY=ECON.STUDY_BY,ABR=Object.fromEntries(STUDY.map(x=>[x[0],[x[3],x[4]]])),AB_CAP=20;
const dexDone=()=>Object.keys(S.dexDone||{}).filter(k=>!k.startsWith('meta')).length,lgWins=()=>Object.keys(S.lgFirst||{}).length,lgTop=()=>S.lgBest||1;
const ABU={ai5:[()=>lgTop()>=2,'주간 리그 2단계 도달'],ai3:[()=>lgTop()>=3,'주간 리그 3단계 도달'],dex5:[()=>dexDone()>=5,'도감 세트 5개 완성'],aiW:[()=>lgWins()>=1,'주간 리그 1위 1번'],
  hr:[()=>lgTop()>=4,'주간 리그 4단계 도달'],era:[()=>lgTop()>=5,'주간 리그 5단계 도달'],aiW2:[()=>lgWins()>=3,'주간 리그 1위 3번'],aiW3:[()=>lgTop()>=8,'주간 리그 8단계 도달']};
const abWhy=c=>c.v?'특수 카드는 유학 불가':'유학 불가 (25세 이하·35세 이상만)';
const dupsOf=c=>OWN.filter(x=>x.dup&&x.id.split('#')[0]===c.id&&!isLocked(x.id));
function abRoll(a){const d=abd(a.d),c=byId[a.id],r=ECON.studyRoll(a.d),keys=Object.keys(c.r).filter(k=>d[5].includes(k));
  let pts=Math.min(r.gain,AB_CAP-abUsed(c));const st={};while(pts>0&&keys.length){const k=keys[Math.floor(Math.random()*keys.length)];st[k]=(st[k]||0)+1;pts--}return {g:r.name,st}}
function abSend(){const d=abd(S.abSel),c=byId[S.abPick];if(!c||!abOpen(d)||!abAge(c)||ECON.canStudy(c).err)return;const m=dupsOf(c).slice(0,d[4]);if(m.length<d[4])return;
  const fee=studyFee(d[0],c.cost);if(ECON.pay(S,fee).err){S.msg='포인트가 모자라요';return}
  S.owned[c.id]-=m.length;S.locks=S.locks.filter(k=>!m.some(x=>x.id===k));S.ab.push({id:c.id,d:d[0],start:Date.now(),end:Date.now()+d[3]*36e5,res:null});S.abPick=null}
// 도감 (econ.js 세트)
const TIXN=ECON.TIX,rwText=ECON.rwText,dexHas=id=>ECON.dexHas(S,id),dexCard=id=>byId[id];
function vDex(){const k=S.dexK||'team',KN={team:'팀 세트',gg:'골든글러브',ex:'EX',meta:'누적 목표'},q=(S.dexQ||'').trim(),lim=S.dexLim||24;
  const prog=s=>ECON.setProgress(S,s);let L=ECON.SETS.filter(s=>s.kind===k&&(!q||s.name.includes(q)));
  L=L.map(s=>({s,p:prog(s)})).sort((a,b)=>(!!S.dexDone[a.s.id])-(!!S.dexDone[b.s.id])||b.p.have/b.p.need-a.p.have/a.p.need);
  const tix=Object.entries(S.tix||{}).filter(([,n])=>n>0);
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">도감</h2><span class="pill">완성 ${dexDone()}세트</span>${tix.map(([t,n])=>`<a href="#shop"><button class="ghost" title="카드팩 화면에서 사용">${esc(TIXN[t]||t)} ×${n}</button></a>`).join('')}</div>
  <p class="note help">한 번 얻은 카드는 합성·분해로 없어져도 도감에 남아요. 세트를 다 모으면 보상이 바로 들어와요. 확정권은 카드팩 화면에서 써요.</p>
  <div class="subnav" role="tablist" style="margin-top:12px">${Object.entries(KN).map(([x,n])=>`<button role="tab" aria-selected="${k===x}" class="${k===x?'on':''}" data-dexk="${x}">${n}</button>`).join('')}
  ${k!=='meta'?`<input id="dexq" value="${esc(q)}" placeholder="연도·구단 검색" aria-label="세트 검색" style="margin-left:auto;max-width:200px">`:''}</div>
  <div class="dexl">${L.slice(0,lim).map(({s,p})=>{const done=!!S.dexDone[s.id];
   return `<div class="dexs${done?' done':''}"><div class="dexh"><b>${esc(s.name)}</b><span class="pill">${p.have}/${p.need}</span><span class="dexrw">${esc(rwText(s.rw))}</span>${done?'<span class="pill dexok">완성 · 지급됨</span>':''}</div>
   <span class="abbar"><i style="width:${p.have/p.need*100}%"></i></span>
   ${s.ids?`<div class="dexg">${s.ids.map(id=>{const c=dexCard(id),h=dexHas(id);if(!c)return '';return `<div class="dexc${h?'':' no'}" ${h&&S.owned[id]?`data-pick="${esc(id)}" role="button" tabindex="0"`:''} title="${esc(c.name)} ${c.year}"><span class="oart" style="--tc:${h?c.col:'#333'}">${h?photo(c,0,0):'<b class="q">?</b>'}${c.v?`<i class="ovb v-${c.v}">${c.v==='IR'||c.v==='RY'?VN[c.v]:c.v}</i>`:''}</span><small>${String(c.year).slice(2)}' ${esc(c.name)}</small></div>`}).join('')}</div>`:''}</div>`}).join('')}</div>
  ${L.length>lim?`<div class="tools" style="justify-content:center;margin-top:12px"><button class="ghost" data-a="dexmore">더 보기 (${L.length-lim})</button></div>`:''}</section>`}
// 카드팩·확정권 (econ.js)
const PACKS=ECON.PACKS.map(p=>[p.k,p.n,p.p,p.d.replace('최대 3개','3개')]);
let LINES=[],YEARS=[];
const TEAMS_OF=y=>[...new Set(CARDS.filter(c=>c.year===+y).map(c=>c.team))].sort();
function pkOutHTML(){const o=S.pkOut;if(!o)return '';
  return `<div class="box" style="margin-top:14px"><h3 style="margin-top:0">개봉 결과</h3>${o.cards?`<div class="pool">${o.cards.map(c=>card(c,{pick:1})).join('')}</div>`:''}${o.text?`<p>${esc(o.text)}</p>`:''}${o.dex&&o.dex.length?`<p class="note" style="color:var(--gold)">도감 완성: ${o.dex.map(s=>esc(s.name)+' ('+esc(rwText(s.rw))+')').join(', ')}</p>`:''}</div>`}
function vShop(){const pk=S.pk||'n',P=PACKS.find(x=>x[0]===pk)||PACKS[0],pick=S.pkSel||(S.pkSel={t:LINES.slice(0,3),y:YEARS.slice(0,3),ty:{year:YEARS[0],team:TEAMS_OF(YEARS[0])[0]}}),multi=pk==='t'||pk==='y',sel=multi?pick[pk]:[],ok=!multi||sel.length===3,afford=S.pt>=P[2];
  const tix=Object.entries(S.tix||{}).filter(([,n])=>n>0),legends=tix.some(([k])=>k==='pick')?CARDS.filter(c=>c.cost>=9).sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.year-b.year):[];
  return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">카드팩</h2><span class="pill">${S.pt.toLocaleString()} P</span></div>
  <div class="shop"><div class="pkl">${PACKS.map(([k,n,p,d])=>`<button class="pkb${k===pk?' on':''}" data-pk="${k}"><b>${n}</b><em>${p.toLocaleString()}P</em><small>${d}</small></button>`).join('')}</div>
  <div class="box"><h3 style="margin-top:0">${P[1]} <small style="color:var(--gold)">${P[2].toLocaleString()}P</small></h3><p class="note" style="margin-top:0">${P[3]}</p>
  ${multi?`<div class="lbl">${pk==='t'?'구단 계보':'연도'} 3개 고르기 <small>(${sel.length}/3)</small></div><div class="chips">${(pk==='t'?LINES:YEARS).map(v=>{const on=sel.includes(v),full=!on&&sel.length>=3;return `<button class="chip${on?' on':''}" data-pkv="${v}" aria-pressed="${on}" ${full?'disabled':''}>${pk==='t'?esc(lname(v)):v}</button>`}).join('')}</div>`:''}
  ${pk==='ty'?`<div class="tools"><select id="tyy" aria-label="연도">${YEARS.map(y=>`<option ${+pick.ty.year===y?'selected':''}>${y}</option>`).join('')}</select><select id="tyt" aria-label="구단">${TEAMS_OF(pick.ty.year).map(t=>`<option ${pick.ty.team===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`:''}
  <div class="tools" style="margin-top:12px"><button data-a="pkbuy" ${ok&&afford?'':'disabled'}>${P[2].toLocaleString()}P로 열기</button>${multi&&sel.length<3?`<span class="note">${3-sel.length}개 더 골라 주세요</span>`:''}${!afford?'<span class="note" style="color:var(--bad)">포인트가 모자라요</span>':''}${S.pkMsg?`<span class="note">${esc(S.pkMsg)}</span>`:''}</div>
  ${tix.length?`<div class="lbl" style="margin-top:16px">확정권</div><div class="tools">${tix.map(([k,n])=>`<button class="ghost" data-tix="${k}">${esc(TIXN[k]||k)} ×${n}</button>`).join('')}
   ${legends.length?`<select id="tixpick" aria-label="레전드 선택권으로 받을 카드">${legends.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} ${c.year} ${esc(c.team)}${c.v?' '+VN[c.v]:''}</option>`).join('')}</select>`:''}</div>`:''}
  </div></div>${pkOutHTML()}</section>`}
function shopAct(D){if(D.pk){S.pk=D.pk;S.pkMsg='';S.pkOut=null;return 1}
  if(D.pkv){const k=S.pk,v=k==='y'?+D.pkv:D.pkv,a=S.pkSel[k],i=a.indexOf(v);if(i>=0)a.splice(i,1);else if(a.length<3)a.push(v);return 1}
  if(D.tix){const k=D.tix;S.pkOut=null;
    if(k==='prem'){S.tix.prem--;S.pt+=1800;const r=ECON.buyCards(S,CARDS,'p');if(r.err){S.tix.prem++;S.pt-=1800;S.pkMsg=r.err}else S.pkOut={cards:r.cards,dex:r.dex}}
    else if(k==='block'){S.tix.block--;const g=ECON.blockGrades(3);if(!g.some(x=>x==='A'||x==='S'))g[2]='A';S.pkOut={text:'블록: '+g.map(x=>{const b=gainBlock(null,x);return `${x}급 ${bname(b)}`}).join(', ')}}
    else{const arg=k==='pick'?(document.getElementById('tixpick')||{}).value:undefined,r=ECON.useTicket(S,CARDS,k,arg);if(r.err)S.pkMsg=r.err;else S.pkOut={cards:r.cards,dex:r.dex}}
    return 1}
  if(D.a==='pkbuy'){const k=S.pk||'n',P=PACKS.find(x=>x[0]===k);S.pkMsg='';S.pkOut=null;
    if(['n','p','t','y','ty','sx'].includes(k)){const r=ECON.buyCards(S,CARDS,k,{lines:S.pkSel.t,years:S.pkSel.y,year:S.pkSel.ty.year,team:S.pkSel.ty.team});if(r.err){S.pkMsg=r.err;return 1}S.pkOut={cards:r.cards,dex:r.dex}}
    else{if(ECON.pay(S,P[2]).err){S.pkMsg='포인트가 모자라요';return 1}
      if(k==='b')S.pkOut={text:'블록: '+ECON.blockGrades(3).map(g=>{const b=gainBlock(null,g);return `${g}급 ${b.t==='B'?'타자':'투수'}용 ${bname(b)}`}).join(', ')};
      else if(k==='tc'||k==='t1'){const gs=k==='tc'?ECON.tcGrades(3):[(u=>u<.05?'황금':u<.25?'특수':'일반')(Math.random())];S.pkOut={text:'작전 카드: '+gs.map(g=>{const x=pick(TCARDS.filter(t=>t[3]===g));S.tq[x[0]]=(S.tq[x[0]]||0)+1;return `${x[1]}(${g})`}).join(', ')}}
      else if(k==='sp'){S.pkOut={text:'서포트 카드: '+[0,1,2].map(()=>{const x=pick(SUPS.filter(t=>!t[0].endsWith('+')));S.sq[x[0]]=(S.sq[x[0]]||0)+1;return x[1]}).join(', ')}}}
    ECON.mission(S,'p1');return 1}
  return 0}
// 합성 (엔진 synth)
function doSynth(){const k=S.sk||'p',pool=synPool(k),m=pool.filter(x=>S.mat.includes(x.key));if(synCheck(k,m))return;let out='';
  const mats=k==='p'?m.map(x=>x.c.id):k==='b'?m.map(x=>x.b):m.map(x=>x.x[0]);const r=synth(k,mats,S.locks.filter(x=>!x.includes('#')));if(r.err){S.msg=r.err;return}
  if(k==='p'){const ids=new Set(m.map(x=>x.c.id)),back=S.blocks.filter(b=>ids.has(b.on)).length;S.blocks=S.blocks.filter(b=>!ids.has(b.on));
    for(const x of m){const id=x.c.id.split('#')[0];S.owned[id]=(S.owned[id]|0)-1;if(S.owned[id]<=0){delete S.owned[id];S.blocks=S.blocks.filter(b=>b.on!==id)}}
    S.locks=S.locks.filter(x=>!ids.has(x));const got=r.out;ECON.gain(S,[got]);const c=byId[got];out=card(c,{})+`<small>코스트 ${r.cost} 선수 획득${back?` · 끼워 둔 스킬 블록 ${back}개도 사라짐`:''}</small>`}
  else if(k==='b'){const us=new Set(m.map(x=>x.b.u));S.blocks=S.blocks.filter(b=>!us.has(b.u));S.blocks.push(r.out);out=`<b>${r.out.g}등급 · ${esc(bname(r.out))}</b><small>${Object.entries(r.out.st).map(([x,v])=>SKN[x]+'+'+v).join(' ')}</small>`}
  else if(k==='s'){const id=m[0].x[0];S.sq[id]-=3;S.sq[r.out]=(S.sq[r.out]||0)+1;const x=SUP_BY[r.out];out=`<b>${esc(x[1])}</b><small>${esc(x[3])} · ${x[4]}경기</small>`}
  else{for(const x of m)S.tq[x.x[0]]--;S.tq[r.out]=(S.tq[r.out]||0)+1;if(S.tsel&&!(S.tq[S.tsel]>0))S.tsel=null;const x=TC_BY[r.out];out=tcard(x,{})+`<small>${r.grade} 작전 카드</small>`}
  S.synRes=out;S.mat=[]}
// 홈: 출석·미션·쿠폰·내 팀 요약
function vHome(){const d=deckFx(),m=MG.find(x=>x.id===S.mgr),s=S.season,D=S.daily||{},e=validate();
  const mis=(ECON.DAILY.missions||[]).map(([id,n,need,pt])=>{const have=Math.min(need,(D.m||{})[id]|0),got=(D.got||{})[id];return `<div class="mis${got?' done':''}"><b>${esc(n)}</b><span class="pill">${have}/${need}</span><small>${pt}P${got?' · 받음':''}</small></div>`}).join('');
  return `<section class="band hub"><div class="box"><h3>${s?`${s.tier?esc(tierName(s.tier)):'시즌 '+s.n} · ${Math.min(s.round+1,s.sched.length)}/${s.sched.length} 라운드`:'시즌 준비 중'}</h3>
  <div class="quick"><a href="#season"><button style="width:100%">주간 리그로</button></a><a href="#years"><button class="ghost" style="width:100%">연도별 리그</button></a><a href="#lineup"><button class="ghost" style="width:100%">라인업 확인</button></a><a href="#shop"><button class="ghost" style="width:100%">카드팩 열기</button></a></div>
  ${e.length?`<p class="note" style="color:var(--bad)">라인업을 먼저 채워 주세요: ${esc(e[0])}</p>`:''}
  <div class="lbl">감독</div><p style="margin:0">${m?`${esc(m.n)} · ${MSTY[m.st]} · [${esc(m.sn)}]`:'없음'}</p><div class="lbl">내 덱 효과</div><p style="margin:0">${d.fx.map(x=>`${esc(x.n)} ${x.g}`).join(' · ')||'팀컬러 없음'} · 야수 +${d.bat} · 투수 +${d.pit} · 코스트 ${d.cost}/${COST_CAP}</p></div>
  <div class="box"><h3>오늘</h3><p style="margin:0">출석 ${D.streak||1}일째 · 7일마다 프리미엄 팩 확정권</p><div class="lbl">일일 미션</div><div class="miss">${mis}</div>
  <div class="lbl">쿠폰</div><div class="tools" style="flex-wrap:nowrap"><input id="cpn" aria-label="쿠폰 코드" placeholder="쿠폰 코드" autocomplete="off" style="flex:1;min-width:0;text-transform:uppercase"><button class="ghost" data-a="coupon">받기</button></div>${S.cpMsg?`<p class="note" aria-live="polite" style="margin:4px 0 0">${esc(S.cpMsg)}</p>`:''}</div></section>`}
async function redeemCoupon(){const el=document.getElementById('cpn'),code=((el&&el.value)||'').trim().toUpperCase();if(!code){S.cpMsg='코드를 넣어 주세요';render();return}
  const F=window.FB;if(!F){S.cpMsg='쿠폰은 온라인(배포판)에서만 쓸 수 있어요';render();return}
  if((S.coupons||{})[code]){S.cpMsg='이미 받은 쿠폰이에요';render();return}
  S.cpMsg='확인 중…';render();
  try{const snap=await F.getDoc(F.doc(F.db,'coupons',code)),r=ECON.redeem(S,code,snap.exists()?snap.data():null);S.cpMsg=r.err||(r.text+' 받았어요');save()}catch(e){S.cpMsg='쿠폰을 확인하지 못했어요 ('+(e.code||e.message)+')'}render()}
const nextOpp=()=>{try{const s=S.season;if(!s||s.over)return '';const pr=curPair(s);if(!pr)return '';const o=pr[0]===0?pr[1]:pr[0];return `<a href="#season" class="pill" style="text-decoration:none;color:inherit">다음 경기 vs ${esc(tname(o))}</a>`}catch(e){return ''}};
const TC={SSG:'#ce0e2d',SK:'#e1251b',해태:'#c8102e',KIA:'#c8102e',삼성:'#0a5fb4',현대:'#2f7d6d',롯데:'#16326b',LG:'#b3134b',한화:'#e8691b'};
const SKN={con:'교타',pow:'장타',eye:'선구',bun:'번트',spd:'주력',def:'수비',men:'정신',vel:'구속',stu:'구위',brk:'변화',ctl:'제구',sta:'체력'};
const PN={C:'포',['1B']:'1루',['2B']:'2루',['3B']:'3루',SS:'유격',LF:'좌',CF:'중',RF:'우',DH:'지명'};
const PFULL={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발',RP:'불펜'};
const LNAME={키움:'현대·키움',SK:'SK·SSG'},lname=l=>LNAME[l]||l;
// 철인(IR): 그해 전 경기 출장 야수 · 최다 등판 3위 안 투수. 능력치는 기본과 같고 스킬 블록 효과 ×1.5
// 투타: 좌우 던지기·치기 (KBO 선수 조회)
const HAND={a:'우투우타',b:'우투좌타',c:'우투양타',d:'좌투우타',e:'좌투좌타',f:'좌투양타'};
const VN={AS:'올스타',GG:'골든글러브',EX:'EX',IR:'철인',RY:'신인왕'},SKB={GG:1.25,EX:1.25,IR:1.5};
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
function photo(c,credit,full){const up=(S.photos||{})[c.id],m=c.img;const im=src=>`<img src="${esc(src)}" alt="${esc(c.name)}" class="${full?'':'facecrop'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 15%">`;
 if(up)return im(up);if(!m)return full?fig(c):face(c);return im(m.f)}
// 사진 출처(CC 라이선스 표시 의무): 카드 위가 아니라 팝업 아래 한 줄로
const credLine=c=>c.img&&!(S.photos||{})[c.id]?`<span class="pcr">사진 <a href="${esc(c.img.u)}" target="_blank" rel="noopener">${esc(c.img.a)}</a> · ${esc(c.img.l)}</span>`:'';
function bars(c,keys,bonus){return keys.map(k=>{const v=c.r[k],p=k==='sta'?0:(bonus||0),sk=(skillOf(c.id)[k]||0),t=Math.min(120,v+p+sk);
 return `<div class="sr"><span>${SKN[k]}</span><span class="bar"><i class="${t>=90?'e':t>=80?'h':''}" style="width:${t/120*100}%"></i></span><em>${t}</em>${bonus!=null?`<small>${p+sk?'+'+(p+sk):''}</small>`:''}</div>`}).join('')}
// 컨디션 1~5 (엔진 COND: 최악·나쁨·보통·좋음·최상) → OVR 앞 화살표. 시안은 선수별 고정 예시값
const CONDN=['','최악','나쁨','보통','좋음','최상'],CONDA=[0,90,45,0,-45,-90];
const condOf=c=>{if(!c)return 3;const v=(S.cond||{})[String(c.id).split('#')[0]]||3;return Math.max(condMin(String(c.id).split('#')[0]),v)};
const condI=c=>{const v=condOf(c);return `<i class="cnd cd${v}" title="컨디션 ${CONDN[v]}" aria-label="컨디션 ${CONDN[v]}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h8M8 4.5 11.5 8 8 11.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(${CONDA[v]} 8 8)"/></svg></i>`};
const stars=n=>`<i class="stars" title="코스트 ${n}" aria-label="코스트 ${n}">${'★'.repeat(n)}</i>`;
function card(c,o={}){if(!c)return '';const keys=c.type==='B'?BK:PKEY,d=o.full?deckFx():null,bn=d&&used().includes(c.id)?(c.type==='B'?d.bat:d.pit):o.full?0:null;
 return `<div class="card t-${c.tier}${c.v?' cv-'+c.v:''}${o.dim?' dim':''}${o.full?' big':o.stats?'':' slim'}" style="--tc:${c.col}" ${o.pick?`role="button" tabindex="0" draggable="true" data-drag="c:${esc(c.id)}" data-pick="${esc(c.id)}" aria-label="${esc(c.name)} 카드 크게 보기"`:''}>
 <div class="art">${photo(c,o.full,o.full)}${c.v?`<span class="fxo fx-${c.v}" aria-hidden="true"></span>`:''}<span class="ovr">${condI(c)}${c.ovr}</span><span class="tag">${PFULL[c.pos]}${c.tw?' · 겸업':''}${HAND[c.h]?` · ${HAND[c.h]}`:''}</span>${c.v?`<span class="vb v-${c.v}">${VN[c.v]}</span>`:''}${planeB(c,'plb')}${o.inUse?'<span class="use">1군</span>':''}${abOf(c.id)?'<span class="use abu">유학 중</span>':''}${S.locks&&S.locks.includes(c.id)?'<span class="lockb" role="img" aria-label="잠김">'+LOCKI(1)+'</span>':''}</div>
 <div class="plate"><b><em>${esc(c.name)}</em>${stars(c.cost)}</b><span>${c.year} ${esc(c.team)}${ageOf(c)!=null?` · <i class="age${abAge(c)?' ab':''}" title="${abAge(c)?'유학 가능':abWhy(c)}">${ageOf(c)}세</i>`:''}</span></div>
 ${o.full||o.stats?`<div class="st">${bars(c,o.full?keys:keys.slice(0,4),bn)}</div>`:''}</div>`}
// 오더 카드 (라인업 줄에 놓이는 작은 카드)
function oc(k,i,lab,o={}){const id=S[k][i]!==undefined&&k!=='lu'?S[k][i]:S.lu[i][1],c=by[id],sel=S.sel&&S.sel.k===k&&S.sel.i===i?' sel':'';
 const under=o.under||`<span class="olab ${o.cls||''}">${lab}</span>`;
 if(!c)return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb empty${sel}" data-slot="${k}:${i}">비어 있음</button>${under}</div>`;
 return `<div class="oc"><span class="onum">${o.num||''}</span><button class="ocb${sel}" style="--tc:${c.col}" draggable="true" data-drag="s:${k}:${i}" data-slot="${k}:${i}" aria-label="${esc(lab)} ${esc(c.name)}">
 <span class="oart">${photo(c,0,0)}${c.v?`<span class="fxo fx-${c.v}" aria-hidden="true"></span>`:''}${c.v?`<i class="ovb v-${c.v}">${c.v==="IR"?"철인":c.v}</i>`:''}${planeB(c,'oplb')}<i class="oovr">${condI(c)}${c.ovr}</i></span>${supOn(c.id)?`<i class="sbadge" title="서포트: ${esc(sp(supOn(c.id).id)[1])}">S${supOn(c.id).left}</i>`:''}<span class="onm">${String(c.year).slice(2)}' ${esc(c.name)}</span><span class="osub t-${c.tier}">${PFULL[c.pos]}${c.tw?'·겸업':''}<i class="ost">★${c.cost}</i></span>${c.bo&&k!=='rot'&&k!=='pen'?`<span class="obo${k==='lu'&&!boOk(c,i)?' bad':''}" title="타순 적성: ${c.bo.map(x=>BO[x]).join('·')}${c.st?` (출루율 ${c.st.obp} · OPS ${c.st.ops})`:''}">${c.bo.map(x=>BOS[x]).join('·')}</span>`:''}</button>${under}</div>`}
function posSel(i){const [p,id]=S.lu[i],c=by[id];return `<select class="psel fit-${c?fitCls(fit(c,p)):'A'}" data-pos="${i}" aria-label="${i+1}번 타자 수비 위치">${POS.filter(q=>q===p||canPos(c,q)).map(q=>`<option value="${q}" ${q===p?'selected':''}>${PFULL[q]}${c&&q!=='DH'?' '+fit(c,q):''}</option>`).join('')}</select>`}
function used(){return [...S.lu.map(x=>x[1]),...S.bench,...S.rot,...S.pen].filter(Boolean)}
const tcChip=x=>`<span class="tcc g-${x.g}${x.on?' on':''}"><i>${x.g}</i><b>${esc(x.n)}</b><small>${esc(x.sub)}</small><em>${x.on?`야수 +${x.b} · 투수 +${x.p}`:`${x.cur}/${x.need}`}</em></span>`;
function meter(t,v,max,sub,over){return `<div class="meter${over?' over':''}"><b>${t}</b><span class="v">${v}</span><div class="track"><i style="width:${Math.min(100,parseFloat(v)/max*100)}%"></i></div><small>${sub}</small></div>`}
function deckBar(){const d=deckFx();return `<div class="deck">
 ${meter('코스트 (1군 25명 전체)',`${d.cost} / ${COST_CAP}`,COST_CAP,d.cost>COST_CAP?'상한 초과: 등록할 수 없어요':`남은 코스트 ${COST_CAP-d.cost}`,d.cost>COST_CAP)}
 ${meter('1군 등록',`${d.cnt} / 25`,25,'야수 9 · 벤치 5 · 선발 5 · 불펜 6')}
 <div class="meter tcm"><b>팀컬러 · 야수 +${d.bat} · 투수 +${d.pit}</b><div class="tcl">${d.fx.map(tcChip).join('')||'<span class="note">아직 없음</span>'}<button class="ghost tcall" data-a="tcall" aria-pressed="${!!S.tcAll}">${S.tcAll?'접기':'전체 보기'}</button></div></div></div>
 ${S.tcAll?`<div class="tcgrid">${['Y','F','E'].map(cat=>`<div><div class="lbl">${TCOLC[cat]} 계열 <small>(1개 적용)</small></div>${d.L.filter(x=>x.cat===cat).map(tcChip).join('')}</div>`).join('')}</div>`:''}`}
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
 <div class="skill"><b>[${esc(m.sn)}]</b> ${esc(m.se)}</div>
 <div class="lbl">작전 경향 (감독이 정함)</div>${MT.map(([k,n,l,r])=>`<div class="tq"><span>${n}</span><span class="tl">${l}</span><span class="tbar" aria-label="${n}: ${l} ${m.tac[k]} / 4 ${r}"><i style="left:${m.tac[k]*25}%"></i></span><span class="tl">${r}</span></div>`).join('')}
 <label class="chk"><input type="checkbox" id="t-live" ${S.tacLive?'checked':''}> 직접 지휘 경기에서 작전 버튼 쓰기</label>
 <p class="note help">감독 이름은 KBO 역대 감독의 별명이고, 성향은 게임용 해석이에요. 자동 진행과 '결과만' 경기에서는 고른 감독의 경향대로 작전이 나오고, 직접 지휘할 때는 경기 화면의 작전 버튼이 우선합니다.</p></div></div>`}
function mface(m){const hue={small:'#2f7d6d',big:'#c22a2a',speed:'#e8691b',trust:'#23214f',pen:'#0a5fb4',data:'#7b1530'}[m.st];
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
 return `<div class="tsel2"><div><div class="lbl" style="margin-top:0">다음 대전에 쓸 작전 카드 (1장 · 연습경기는 소모 없음)</div>${cur?tcard(cur,{rel:1,attr:'data-tsel=""',cnt:S.tq[cur[0]]}):'<span class="tcd empty">카드를 고르세요</span>'}</div>
 <div class="tdrawbox"><div class="lbl" style="margin-top:0">작전 카드 뽑기</div><button data-a="tdraw">한 장 뽑기 · 100P</button><p class="note">보유 작전 포인트 1,240P</p>${S.tdraw?`<div class="drawn">${tcard(tc(S.tdraw),{})}<p class="note">새로 뽑은 카드예요.</p></div>`:''}</div></div>
 <div class="tools" style="margin-top:16px"><h3 style="margin:0">보유 작전 카드</h3><div class="tabs">${[['all','전체'],['투','투수'],['야','야수'],['공','공통'],['황금','황금']].map(([k,n])=>`<button class="${f===k?'on':''}" data-tf="${k}">${n}</button>`).join('')}</div></div>
 <div class="tpool">${list.map(x=>tcard(x,{on:S.tsel===x[0],rel:1,cnt:S.tq[x[0]],attr:`data-tsel="${x[0]}"`})).join('')||'<p class="note">보유한 카드가 없어요.</p>'}</div>
 <p class="note help">작전 카드는 뽑기로 모으고, 대전(친구 리그) 경기마다 한 장을 골라 씁니다. 대전에서 쓴 카드는 한 장 줄어들고, AI와 하는 연습경기에서는 줄지 않아요. 조건이 맞으면 경기 내내 자동으로 발동하고, 상대가 고른 카드와 우열 관계면 한쪽이 무효화, 대립 관계면 둘 다 상쇄됩니다. 투(투수)·야(야수)·공(전원) 분류와 일반·특수·황금 등급이 있어요.</p>`}
function supOn(cid){return S.sup.find(x=>x.cid===cid)}
function scard(x,o={}){const [id,n,t,fx,g]=x;return `<button class="scd${o.on?' on':''}" ${o.attr||''}><span class="stg">${t==='B'?'타자용':t==='P'?'투수용':'공용'}</span><b>${esc(n)}</b><span>${esc(fx)}</span><small>${g}경기 지속</small>${o.cnt!=null?`<i class="cnt">×${o.cnt}</i>`:''}</button>`}
function vSup(){const ss=S.ssel&&sp(S.ssel),roster=used().map(id=>by[id]).filter(c=>!ss||ss[2]==='all'||ss[2]===c.type);
 return `<div class="lbl" style="margin-top:0">서포트 받는 선수 ${S.sup.length}/2 · 대전 경기에서만 남은 경기 수가 줄어요</div><div class="sact">${[0,1].map(i=>{const a=S.sup[i];if(!a)return '<div class="sa empty">빈 자리</div>';const c=by[a.cid],x=sp(a.id);
  return `<div class="sa"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><div><b>${esc(c.name)}</b><small>${esc(x[1])} · ${esc(x[3])}</small><span class="left">${a.left}경기 남음</span></div><button class="ghost" data-sdel="${i}" aria-label="서포트 해제">해제</button></div>`}).join('')}</div>
 <div class="tools" style="margin-top:16px"><h3 style="margin:0">보유 서포트 카드</h3></div>
 <div class="spool">${SUPS.filter(x=>(S.sq[x[0]]||0)>0).map(x=>scard(x,{on:S.ssel===x[0],cnt:S.sq[x[0]],attr:`data-ssel="${x[0]}"`})).join('')}</div>
 ${ss?`<div class="box" style="margin-top:12px"><h3>${esc(ss[1])}를 줄 선수 고르기</h3>${S.sup.length>=2?'<p class="note">이번 경기 서포트 자리 2개가 다 찼어요. 먼저 하나를 해제하세요.</p>':`<div class="pick">${roster.map(c=>`<button class="pk" data-sgive="${esc(c.id)}" ${supOn(c.id)?'disabled':''}><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span>${esc(c.name)}</button>`).join('')}</div>`}</div>`:''}
 <p class="note help">서포트 카드는 1군 선수 한 명에게 주면 그 선수가 나오는 다음 2경기 동안 효과가 이어져요. 한 경기에 서포트를 받는 선수는 2명까지예요. 준 카드는 한 장 줄어들고 남은 경기 수는 대전 경기에서만 줄어요. AI와 하는 연습경기에서는 카드도 경기 수도 소모되지 않아요.</p>`}
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
const SF0={ty:'all',team:'all',year:'all',cost:'all',dup:0};
function synPoolF(k){const p=synPool(k);if(k!=='p')return p;const f=S.sf||SF0;return p.filter(({c})=>!abOf(c.id)&&(f.ty==='all'||c.type===f.ty)&&(f.team==='all'||lname(c.line)===f.team)&&(f.year==='all'||String(c.year)===f.year)&&(f.cost==='all'||c.cost<=+f.cost)&&(!f.dup||c.dup))}
function synFilt(){const f=S.sf||SF0,base=synPool('p').map(x=>x.c),teams=[...new Set(base.map(c=>lname(c.line)))].sort(),years=[...new Set(base.map(c=>c.year))].sort((a,b)=>b-a),o=(v,n,cur)=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(n)}</option>`;
 return `<div class="tools sfil"><div class="tabs">${[['all','전체'],['B','야수'],['P','투수']].map(([k,n])=>`<button class="${f.ty===k?'on':''}" data-sft="${k}">${n}</button>`).join('')}</div>
 <select data-sf="team" aria-label="구단 필터">${o('all','전체 구단',f.team)}${teams.map(t=>o(t,t,f.team)).join('')}</select>
 <select data-sf="year" aria-label="연도 필터">${o('all','전체 연도',f.year)}${years.map(y=>o(y,y,f.year)).join('')}</select>
 <select data-sf="cost" aria-label="코스트 필터">${o('all','전체 코스트',f.cost)}${[3,5,7].map(n=>o(n,'★'+n+' 이하',f.cost)).join('')}</select>
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
function synCheck(k,m){if(m.length<NEED(k))return `재료를 ${NEED(k)}개 골라 주세요.`;
 if(m.some(x=>isLocked(lkey(k,x))))return '잠긴 카드는 재료로 쓸 수 없어요.';
 if(k==='b'&&new Set(m.map(x=>x.b.t)).size>1)return '타자용과 투수용 블록은 섞을 수 없어요.';
 if(k==='s'&&new Set(m.map(x=>x.x[0])).size>1)return '같은 서포트 카드 3장이 필요해요.';
 if(k==='t'&&new Set(m.map(x=>x.x[3])).size>1)return '같은 등급 작전 카드 3장이 필요해요.';return ''}
function synPreview(k,m){if(k==='p'){const a=m.reduce((s,x)=>s+x.c.cost,0)/m.length;return `코스트 ${Math.min(10,Math.round(a)+1)}~${Math.min(10,Math.round(a)+3)} 선수`}
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
const PLANE='<svg viewBox="-0.5 0.25 24 24" aria-hidden="true"><path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8.5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" fill="currentColor"/></svg>';
const planeB=(c,cls)=>{const t=[...new Set(((S.abHist||{})[c.id]||[]).map(h=>abd(h.d)[1]))].join(', ');return t?`<i class="${cls}" title="${esc(t)}" aria-label="${esc(t)}">${PLANE}</i>`:''};
const abUsed=c=>(S.abSum||{})[c.id]||0;
const hm=ms=>{const m=Math.max(0,Math.round(ms/60000));return m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`};
function vAbroad(){const now=Date.now(),d=abd(S.abSel)||ABD[0],cand=OWN.filter(c=>!c.dup&&!c.v&&!used().includes(c.id)&&!abOf(c.id)&&ageOf(c)!=null),pick=by[S.abPick],need=d[4],have=pick?dupsOf(pick).length:0;
 const fee=pick?studyFee(d[0],pick.cost):0,ok=abOpen(d)&&pick&&abAge(pick)&&have>=need&&abUsed(pick)<AB_CAP&&S.pt>=fee;
 return `<section class="band"><div class="tools"><h2 style="margin:0;margin-right:auto">유학</h2><span class="pill">진행 중 ${S.ab.filter(a=>!a.got).length}명</span></div>
 <p class="note" style="margin:6px 0 0">25세 이하 · 35세 이상만</p><p class="note help">1군에 등록되지 않은 선수를 유학 보내면 정해진 시간 동안 쓸 수 없어요. 시간이 끝나면 결과를 확인해 능력치가 올라요. 재료로 같은 카드(중복)를 써요. 카드 한 장이 유학으로 올릴 수 있는 능력치는 합계 +${AB_CAP}까지예요. 시간·확률·상승치는 제안안이에요.</p>
 <div class="abl"><div class="abds">${ABD.map(x=>{const o=abOpen(x);return `<button class="abd${x[0]===d[0]?' on':''}${o?'':' lk'}" data-abd="${x[0]}"><b>${x[1]}</b><small>${o?`${x[3]}시간 · 중복 ${x[4]}장 · ${x[5].map(k=>SKN[k]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4).join('·')}`:`잠김 · ${x[6]}`}</small></button>`}).join('')}</div>
 <div class="box"><h3 style="margin-top:0">${d[1]}</h3>${abOpen(d)?`<p class="abm" title="${ABR[d[0]][0].map((p,i)=>ABGN[i]+' '+p+'%'+(i<3?' (+'+ABR[d[0]][1][i]+')':'')).join(' · ')}"><span>${d[3]}시간</span><span>대성공 +${ABR[d[0]][1][0]}</span><span${ABR[d[0]][0][3]?' class="risk"':''}>실패 ${ABR[d[0]][0][3]}%</span><span>중복 ${d[4]}장</span><span>${d[5].map(k=>SKN[k]).filter((v,i,a)=>a.indexOf(v)===i).join('·')}</span></p>
  <div class="abpick">${pick?`<div>${card(pick,{stats:1})}</div><div><p style="margin:0 0 6px"><b>${esc(pick.name)}</b> ${pick.year} ${esc(pick.team)}</p><p class="note" style="margin:0 0 6px">중복 ${have}/${need} · 상승 ${abUsed(pick)}/${AB_CAP}</p>
   <button data-a="absend" ${ok?'':'disabled'}>${d[3]}시간 유학 보내기 · ${fee.toLocaleString()}P</button>${S.pt<fee?'<p class="note" style="color:var(--bad);margin:6px 0 0">포인트가 모자라요</p>':''}${!abAge(pick)?`<p class="note" style="color:var(--bad);margin:6px 0 0">${pick.v?'특수 카드는 유학 갈 수 없어요':ageOf(pick)+'세라 유학 갈 수 없어요 (25세 이하 또는 35세 이상)'}</p>`:have<need?'<p class="note" style="color:var(--bad);margin:6px 0 0">중복 카드가 모자라요</p>':''}</div>`:'<p class="note" style="grid-column:1/-1;margin:0">선수를 고르세요</p>'}</div>
  <h3>보낼 선수</h3><div class="abc">${cand.sort((a,b)=>abAge(b)-abAge(a)||dupsOf(b).length-dupsOf(a).length||b.ovr-a.ovr).slice(0,24).map(c=>`<button class="abr${c.id===S.abPick?' on':''}${abAge(c)?'':' no'}" data-abpick="${esc(c.id)}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><span><b>${esc(c.name)}</b><small>${c.year} · ${ageOf(c)}세${abAge(c)?'':' · 유학 불가'} · 중복 ${dupsOf(c).length}장</small></span></button>`).join('')}</div>`
  :`<p class="note">아직 잠겨 있어요. 여는 조건: <b>${d[6]}</b></p>`}</div></div>
 <h3>유학 중</h3><div class="abq">${S.ab.filter(a=>!a.got).map(a=>{const c=by[a.id],x=abd(a.d),done=now>=a.end,pc=Math.min(100,(now-a.start)/(a.end-a.start)*100);
  return `<div class="abi${done?' done':''}"><span class="oart" style="--tc:${c.col}">${photo(c,0,0)}</span><div><b>${esc(c.name)}</b> <small>${x[1]}</small><span class="abbar"><i style="width:${pc}%"></i></span>
  ${a.res?`<p class="abres"><b>${a.res.g}</b> ${Object.entries(a.res.st).map(([k,v])=>`${SKN[k]} +${v}`).join(' · ')||(a.res.g==='실패'?'오른 능력 없음':'더 오를 수 없음')}</p><button class="ghost" data-abok="${esc(a.id)}">확인</button>`:done?`<button data-abget="${esc(a.id)}">결과 보기</button>`:`<small>${hm(a.end-now)} 남음 · 돌아오면 알림</small><button class="ghost abrush" data-abrush="${esc(a.id)}" ${S.pt<rushFee(a.end-now)?'disabled':''}>바로 귀국 · ${rushFee(a.end-now).toLocaleString()}P</button>`}</div></div>`}).join('')||'<p class="note">유학 중인 선수가 없어요.</p>'}</div></section>`}
function abAct(D){if(D.abd){S.abSel=D.abd;return 1}if(D.abpick){S.abPick=D.abpick;return 1}
 if(D.abget){const a=abOf(D.abget);a.res=abRoll(a);const c=by[a.id];S.abSt=S.abSt||{};const t=S.abSt[c.id]=S.abSt[c.id]||{};for(const k in a.res.st)t[k]=(t[k]||0)+a.res.st[k];S.abHist=S.abHist||{};(S.abHist[c.id]=S.abHist[c.id]||[]).push({d:a.d,g:a.res.g,st:a.res.st});S.abSum=S.abSum||{};S.abSum[c.id]=abUsed(c)+Object.values(a.res.st).reduce((t,v)=>t+v,0);return 1}
 if(D.abok){abOf(D.abok).got=1;return 1}
 if(D.a==='absend'){abSend();return 1}
 if(D.abrush){const a=abOf(D.abrush),f=rushFee(a.end-Date.now());if(ECON.pay(S,f).err)return 1;a.end=Date.now();return 1}
 return 0}
function vSynth(){const k=S.sk||'p',pool=synPoolF(k),mk=new Set(S.mat),m=pool.filter(x=>mk.has(x.key)),err=synCheck(k,m);
 return `<section class="band"><h2>합성</h2><div class="subnav" role="tablist">${Object.entries(SYN).map(([x,v])=>`<button role="tab" aria-selected="${k===x}" class="${k===x?'on':''}" data-sk="${x}">${v.n}</button>`).join('')}</div>
 <div class="syn"><div class="sslots">${[...Array(NEED(k)).keys()].map(i=>m[i]?`<div class="ss" data-mat="${esc(m[i].key)}" title="빼기">${m[i].html}</div>`:'<div class="ss empty">재료</div>').join('<span class="plus">+</span>')}<span class="plus">→</span>
 <div class="ss res">${S.synRes?`<div class="got">${S.synRes}</div>`:`<b>${m.length===NEED(k)&&!err?esc(synPreview(k,m)):'?'}</b><small>${err?esc(err):'예상 결과'}${k==='p'&&m.some(x=>hasBlk(x.c.id))?' · 끼운 스킬 블록도 사라져요':''}</small>`}</div></div>
 <div class="tools" style="justify-content:center;margin-top:12px"><button data-a="synth" ${err?'disabled':''}>합성하기</button><button class="ghost" data-a="synauto">자동 추천</button><button class="ghost" data-a="synclr">재료 비우기</button><button class="ghost qbtn${S.synHelp?' on':''}" data-a="synhelp" aria-label="합성 방식 설명" aria-pressed="${!!S.synHelp}">?</button></div>
 ${S.msg?`<p class="note" style="text-align:center" aria-live="polite">${esc(S.msg)}</p>`:''}${S.synHelp?`<p class="note synrule">${esc(SYN[k].rule)}</p>`:''}</div>
 <h3 style="margin-top:18px">재료로 쓸 수 있는 ${SYN[k].n} <span class="pill">${pool.length}</span></h3>${k==='p'?synFilt():''}<div class="mpool">${pool.map(x=>{const lk=isLocked(lkey(k,x));return `<div class="mpw"><div class="mp${mk.has(x.key)?' on':''}${lk?' locked':''}" ${lk?'aria-disabled="true"':`data-mat="${esc(x.key)}" role="button" tabindex="0"`}>${x.html}${lk?'<span class="lockb" role="img" aria-label="잠김">'+LOCKI(1)+'</span>':''}</div><button class="ghost lockt" data-lock="${esc(lkey(k,x))}" aria-pressed="${lk}" aria-label="${lk?'잠금 해제':'잠그기'}" title="${lk?'잠금 해제':'잠그기'}">${LOCKI(lk)}</button></div>`}).join('')||'<p class="note">재료가 없어요.</p>'}</div>
 <p class="note help">카드 아래 자물쇠로 잠그면 재료·자동 추천에서 빠져요. 재료 선수에 끼운 스킬 블록은 같이 사라져요.</p></section>`}
const pick2=a=>a[Math.floor(Math.random()*a.length)];
// 추천 라인업: 보유 카드로 자동 편성 (능력 우선 / 덱 효과 우선 / 코스트 절약). 코스트 상한 150 안에서
const bv=c=>c.r.con*.35+c.r.pow*.35+c.r.eye*.2+c.r.spd*.1;
function recommend(mode){for(let cp=0;cp<=12;cp+=.5){const r=recommend1(mode,cp);if(recCost(r)<=COST_CAP||cp>=12)return r}}
function recommend1(mode,cp){const own=[...new Map(OWN.filter(c=>!c.dup&&!abOf(c.id)).sort((x,y)=>x.ovr-y.ovr).map(c=>[c.name+c.type,c])).values()];
 const yc={};for(const c of own){const k=c.year+' '+c.team;yc[k]=(yc[k]||0)+1}const topY=Object.entries(yc).sort((a,b)=>b[1]-a[1])[0][0];
 const w=c=>(mode==='deck'&&c.year+' '+c.team===topY?15:0)-(mode==='cost'?c.cost*4:0)-cp*c.cost;
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
 <p class="rsum">타순 ${r.lu.map((x,i)=>`<span><b>${i+1}</b>${PN[x[0]]} ${esc(by[x[1]].name)}</span>`).join('')}</p>
 <p class="rsum">선발 ${r.rot.filter(Boolean).map(id=>`<span>${esc(by[id].name)}</span>`).join('')} · 마무리 <span>${r.pen[0]?esc(by[r.pen[0]].name):'–'}</span></p>
 <p class="note">코스트 ${cost}/${COST_CAP} ${cost>COST_CAP?'· 상한 초과':''} · 새로 들어오는 선수 ${inn.length}명${inn.length?` (${inn.slice(0,4).map(id=>esc(by[id].name)).join(', ')}${inn.length>4?' 외':''})`:''} · 빠지는 선수 ${out.length}명</p>
 <div class="tools"><button data-a="recapply" ${cost>COST_CAP?'disabled':''}>이대로 적용</button><button class="ghost" data-a="recclose">닫기</button></div></div>`}
// 스킬 화면: 왼쪽 1군 선수 목록, 가운데 선택 선수의 스킬 칸(장착 가능), 오른쪽 보유 블록
function vSkill(){const tb=S.sktb||'B',list=used().map(id=>by[id]).filter(c=>c.type===tb),c=by[S.skc]&&by[S.skc].type===tb?by[S.skc]:list[0];if(c)S.skc=c.id;
 return `<section class="band"><h2>스킬</h2><div class="tools"><div class="tabs">${[['B','야수'],['P','투수']].map(([k,n])=>`<button class="${tb===k?'on':''}" data-sktb="${k}">${n}</button>`).join('')}</div><a href="#synth" data-sk2="b"><button class="ghost">스킬 블록 합성</button></a></div>
 <div class="skl"><div class="skp">${list.map(x=>{const n=S.blocks.filter(b=>b.on===x.id).length;return `<button class="skr${x.id===S.skc?' on':''}" data-skc="${esc(x.id)}"><span class="oart" style="--tc:${x.col}">${photo(x,0,0)}</span><span><b>${esc(x.name)}</b><small>${x.year} · ${PFULL[x.pos]}</small></span><i>${n?n+'개':''}</i></button>`}).join('')}</div>
 <div>${c?backFace(c,1):''}</div><div>${c?`<h3>${esc(c.name)}에게 넣을 블록</h3>${blkInv(c)}`:''}</div></div></section>`}
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
function vLineup(){const sub=`<div class="subnav" role="tablist">${[['order','라인업'],['mgr','감독'],['tcard','작전 카드'],['sup','서포트 카드']].map(([k,n])=>`<button role="tab" aria-selected="${S.sub===k}" class="${S.sub===k?'on':''}" data-sub="${k}">${n}</button>`).join('')}</div>`;
 if(S.sub==='sup')return `<section class="band">${sub}<h2 style="margin-top:16px">서포트 카드</h2>${vSup()}</section>`;
 if(S.sub==='tcard')return `<section class="band">${sub}<h2 style="margin-top:16px">작전 카드</h2>${vTcard()}</section>`;
 if(S.sub==='mgr')return `<section class="band">${sub}<h2 style="margin-top:16px">감독 선택</h2>${vMgr()}</section>`;
 const ids=new Set(used()),B=S.tb==='B';
 const F=B?{all:c=>c.type==='B',C:c=>c.type==='B'&&c.pos==='C',IF:c=>c.type==='B'&&['1B','2B','3B','SS'].includes(c.pos),OF:c=>c.type==='B'&&['LF','CF','RF','DH'].includes(c.pos)}:{all:c=>c.type==='P',SP:c=>c.pos==='SP',RP:c=>c.pos==='RP'};
 const ord={ovr:(a,b)=>b.ovr-a.ovr,cost:(a,b)=>b.cost-a.cost,year:(a,b)=>a.year-b.year};
 const pf=F[S.pf]?S.pf:'all',base=OWN.filter(F[pf]),teams=[...new Set(base.map(c=>c.team))].sort(),years=[...new Set(base.map(c=>c.year))].sort((a,b)=>b-a);
 if(S.fteam!=='all'&&!teams.includes(S.fteam))S.fteam='all';if(S.fyear!=='all'&&!years.includes(+S.fyear))S.fyear='all';
 const pool=base.filter(c=>(S.fteam==='all'||c.team===S.fteam)&&(S.fyear==='all'||c.year===+S.fyear)).sort(ord[S.sort]);
 const FN=B?[['all','전체 야수'],['C','포수'],['IF','내야수'],['OF','외야·지명']]:[['all','전체 투수'],['SP','선발'],['RP','불펜']];
 const SIDE=B?[['line','타선 분석'],['field','수비 위치']]:[['bat','배터리 분석']],side=SIDE.some(x=>x[0]===S.side)?S.side:SIDE[0][0];
 return `<section class="band">${sub}<div class="tools" style="margin-top:16px"><div class="tabs tb" role="tablist">${[['B','야수'],['P','투수']].map(([k,n])=>`<button role="tab" aria-selected="${S.tb===k}" class="${S.tb===k?'on':''}" data-tb="${k}">${n}</button>`).join('')}</div>${nextOpp()}<button class="ghost" data-rec="${S.recm||'power'}" style="margin-left:auto">추천 라인업</button>${S.undo?'<button class="ghost" data-a="recundo">되돌리기</button>':''}</div>${recPanel()}${deckBar()}
 ${B?`<div class="strip"><div class="sh">야수</div><div class="row scroll">${S.lu.map((x,i)=>oc('lu',i,'',{num:(i+1)+'번',under:posSel(i)})).join('')}<span class="gap"></span>${S.bench.map((x,i)=>oc('bench',i,'벤치',{num:(i+1)+'번'})).join('')}</div></div>`
 :`<div class="strip"><div class="sh">투수</div><div class="row scroll">${S.rot.map((x,i)=>(i?'<span class="arr" aria-hidden="true">›</span>':'')+oc('rot',i,'선발',{num:(i+1)+'번',cls:'sp'})).join('')}<span class="gap"></span>${[2,3,4,5].map((j,n)=>oc('pen',j,'중계',{num:(n+1)+'번',cls:'rp'})).join('')}<span class="gap"></span>${oc('pen',1,'셋업',{cls:'su'})}${oc('pen',0,'마무리',{cls:'cl'})}</div></div>`}
 <p class="note hint${S.sel||S.msg?' on':''}" aria-live="polite">${S.msg?esc(S.msg):S.sel?'바꿀 자리나 넣을 카드를 고르세요. 같은 자리를 다시 누르면 취소돼요.':''}</p><p class="note help">${S.sel?'같은 줄의 다른 자리를 누르면 서로 바뀌고, 아래 보유 카드를 누르면 그 카드가 들어갑니다. 같은 자리를 다시 누르면 선택 해제.':'컴퓨터에서는 보유 카드나 자리를 끌어다 다른 자리에 놓아도 바뀌어요. 카드를 누르면 상세 정보가 뜨고, 거기서 [자리 교체하기]를 누른 다음 다른 자리(타순 교체·벤치 교대)나 보유 카드를 누르면 바뀝니다. 빈 자리는 바로 선택돼요. 수비 위치는 카드 아래 메뉴에서 바꾸고, 메뉴 옆 등급은 그 위치 수비 적성입니다.'}</p></section>
 <section class="band lu2"><div><div class="tools"><h2 style="margin:0">보유 카드</h2>
 <div class="tabs" role="tablist">${FN.map(([k,n])=>`<button role="tab" aria-selected="${pf===k}" class="${pf===k?'on':''}" data-pf="${k}">${n}</button>`).join('')}</div>
 <select id="sort" aria-label="정렬"><option value="ovr">능력 순</option><option value="cost" ${S.sort==='cost'?'selected':''}>코스트 순</option><option value="year" ${S.sort==='year'?'selected':''}>연도 순</option></select>
 <select id="fteam" aria-label="구단 필터"><option value="all">전체 구단</option>${teams.map(t=>`<option value="${esc(t)}" ${S.fteam===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
 <select id="fyear" aria-label="연도 필터"><option value="all">전체 연도</option>${years.map(y=>`<option value="${y}" ${String(S.fyear)===String(y)?'selected':''}>${y}</option>`).join('')}</select><span class="pill">${pool.length}장</span></div>
 <div class="pool">${pool.map(c=>card(c,{pick:1,dim:ids.has(c.id),inUse:ids.has(c.id)})).join('')}</div></div>
 <div class="box"><div class="tabs" role="tablist">${SIDE.map(([k,n])=>`<button role="tab" aria-selected="${side===k}" class="${side===k?'on':''}" data-side="${k}">${n}</button>`).join('')}</div>
 <div style="margin-top:12px">${side==='bat'?batteryPanel():side==='line'?lineupChart():field()}</div></div></section>`}
const KIND=k=>k==='lu'||k==='bench'?'B':'P';
function getS(s){return s.k==='lu'?S.lu[s.i][1]:S[s.k][s.i]}
function setS(s,id){if(s.k==='lu')S.lu[s.i][1]=id;else S[s.k][s.i]=id}
// 수비 위치는 카드의 수비 적성(c.ps)에 있는 포지션과 지명타자만 가능
const canPos=(c,p)=>!c||p==='DH'||!!(c.ps&&c.ps[p]!=null);
const posName=(k,i)=>k==='lu'?S.lu[i][0]:null;
function swapSlots(a,b){const x=getS(a),y=getS(b);if(a.k==='lu'&&b.k==='lu'){[S.lu[a.i],S.lu[b.i]]=[S.lu[b.i],S.lu[a.i]];return}
 if(a.k==='lu'&&!canPos(by[y],S.lu[a.i][0])){S.msg=`${by[y].name}은(는) ${PFULL[S.lu[a.i][0]]}를 볼 수 없어요.`;return}
 if(b.k==='lu'&&!canPos(by[x],S.lu[b.i][0])){S.msg=`${by[x].name}은(는) ${PFULL[S.lu[b.i][0]]}를 볼 수 없어요.`;return}
 setS(a,y);setS(b,x)}
function place(id){const s=S.sel;if(!s)return;const c=by[id];if(c.type!==KIND(s.k))return;if(abOf(c.id)){S.msg=`${c.name}은(는) 유학 중이라 쓸 수 없어요.`;return}if(s.k==='lu'&&!canPos(c,S.lu[s.i][0])){S.msg=`${c.name}은(는) ${PFULL[S.lu[s.i][0]]}를 볼 수 없어요. 가능한 위치: ${['DH',...Object.keys(c.ps||{})].map(p=>PFULL[p]).join(', ')}`;return}
 const cur=getS(s);for(const k of ['lu','bench','rot','pen']){const n=k==='lu'?S.lu.length:S[k].length;for(let i=0;i<n;i++)if(getS({k,i})===id)setS({k,i},cur)}setS(s,id);S.sel=null}
function setPos(i,p){const c=by[S.lu[i][1]];if(!canPos(c,p))return;const j=S.lu.findIndex(x=>x[0]===p);if(j>=0){const o=by[S.lu[j][1]];if(!canPos(o,S.lu[i][0])){S.msg=`${o.name}은(는) ${PFULL[S.lu[i][0]]}를 볼 수 없어서 위치를 맞바꿀 수 없어요.`;return}S.lu[j][0]=S.lu[i][0]}S.lu[i][0]=p}
// 구종 그림: 공을 가운데 두고 휘는 방향에 구종을 놓음 (우투수, 투수 시점)
const PDIR={직구:-90,포심:-90,투심:150,싱커:135,커터:-30,슬라이더:0,커브:45,파워커브:45,슬러브:20,체인지업:120,포크:90,스플리터:90,너클볼:-150,서클체인지업:120,SFF:90};
function pitchMap(c){const E=Object.entries(c.pt||{}),gc={S:'#e2b23c',A:'#b05ad6',B:'#3d8fd1',C:'#8a9a90',D:'#6b6b6b'};
 return `<svg viewBox="0 0 300 200" class="pmap" role="img" aria-label="구종과 휘는 방향"><rect width="300" height="200" rx="12" fill="var(--board)"/>
 ${[40,70].map(r=>`<circle cx="150" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.12)"/>`).join('')}
 <circle cx="150" cy="100" r="16" fill="#fff"/><path d="M140 90 Q150 100 140 110 M160 90 Q150 100 160 110" stroke="#c8102e" stroke-width="1.5" fill="none"/>
 ${(()=>{// 같은 방향 구종은 라벨이 겹치지 않게 각도를 벌림 (최소 45~58°)
 const A=E.map(([n],i)=>({i,d:(PDIR[n]??-60)+i*1e-3})).sort((p,q)=>p.d-q.d),MIN=E.length>3?58:45;
 for(let t=0;t<40;t++)for(let k=0;k<A.length&&A.length>1;k++){const p=A[k],q=A[(k+1)%A.length],gap=((q.d-p.d)%360+360)%360;if(gap<MIN){const f=(MIN-gap)/2;p.d-=f;q.d+=f}}
 const D={};A.forEach(x=>D[x.i]=x.d);return E.map(([n,g],i)=>{const a=D[i]*Math.PI/180,r=Math.max(E.length>3?68:58,g==='S'||g.startsWith('S')?80:g==='A'?70:58),w=String(n+' '+g).length*12+16,x=Math.max(w/2+4,Math.min(296-w/2,150+Math.cos(a)*r*1.35)),y=Math.max(16,Math.min(184,100+Math.sin(a)*r));
 return `<line x1="${150+Math.cos(a)*20}" y1="${100+Math.sin(a)*20}" x2="${x}" y2="${y}" stroke="${gc[g[0]]||'#888'}" stroke-width="3" stroke-dasharray="4 3"/><g><rect x="${x-w/2}" y="${y-12}" width="${w}" height="24" rx="12" fill="${gc[g[0]]||'#888'}"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${esc(n)} ${esc(g)}</text></g>`}).join('')})()}</svg>`}
function seasonLine(c){const H=c.type==='B'?['타율','홈런','타점','도루','경기','타석']:['ERA','승','패','세이브','홀드','탈삼진','이닝','경기'];
 return `<div class="scroll"><table class="sl"><thead><tr><th>연도</th>${H.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody><tr><td>${c.year}</td>${c.s.map((v,i)=>`<td>${i===0?(c.type==='B'?Number(v).toFixed(3).replace(/^0/,''):Number(v).toFixed(2)):v}</td>`).join('')}</tr></tbody></table></div>`}
function backFace(c,live){const occ={};S.blocks.forEach(b=>{if(b.on===c.id)cells(b).forEach(([r,q])=>occ[(r+b.at[0])*4+q+b.at[1]]=b)});const op=open(c),os=openSet(c),pt=patOf(c);
 const grid=[...Array(16).keys()].map(i=>{const b=occ[i],lock=!os.has(i);return live?`<button class="cell${lock?' lock':''}${b?' g-'+b.g:''}" data-cell="${i}"${b?' draggable="true"':''} ${lock?'disabled aria-label="잠긴 칸"':`aria-label="${Math.floor(i/4)+1}행 ${i%4+1}열"`}></button>`:`<span class="cell${lock?' lock':''}${b?' g-'+b.g:''}"></span>`}).join('');
 return `<div class="cback" style="--tc:${c.col}"><div class="cbh"><b>${esc(c.name)}</b><span>${c.year} ${esc(c.team)} · ${PFULL[c.pos]}</span></div><div class="cbm">${[ageOf(c)!=null?`${ageOf(c)}세`:'',HAND[c.h]||'',c.rg||'',c.hs||'',c.un||''].filter(Boolean).map(esc).join(' · ')||'출신 정보 없음'}</div>
  ${c.type==='P'?`<div class="pv">${pitchMap(c)}<div class="vel"><small>최고구속</small><b>${c.kmh??'–'}</b><small>km/h</small></div></div>`:`<div class="apt" style="margin:0">${POS.filter(p=>p!=='DH').map(p=>{const f=fit(c,p);return `<span>${PFULL[p]}<b style="color:${f==='X'?'var(--mute)':fitCls(f)==='A'?'var(--ok)':f==='B'?'var(--warn)':'var(--bad)'}">${f==='X'?'–':f}</b>${f==='X'?'불가':c.ps[p]}</span>`}).join('')}</div>`}
  ${seasonLine(c)}<div class="lbl">스킬</div><div class="sk2"><div class="grid4">${grid}</div>
  <div class="eq">${S.blocks.filter(b=>b.on===c.id).map(b=>`<div><b class="gl g-${b.g}">${b.g}</b>${esc(bname(b))}<small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')}</small></div>`).join('')||'<div class="none">장착한 스킬 없음</div>'}
  <div class="sup2"><span>SUPPORT CARD</span>${supOn(c.id)?`<b>${esc(sp(supOn(c.id).id)[1])}</b><small>${esc(sp(supOn(c.id).id)[3])} · ${supOn(c.id).left}경기 남음</small>`:'<small>없음</small>'}</div></div></div></div>`}
function blkInv(c){const sk=skillOf(c.id),sel=S.blocks.find(b=>b.u===S.blkSel),mine=S.blocks.filter(b=>b.t===c.type&&(b.on===c.id||(b.on===null&&(!b.home||b.home.cid===c.id))));
 return `<p class="note help" style="margin-top:0">박힌 블록은 이 선수 안에서만 옮기거나 돌릴 수 있어요. 빼내면 사라져요.</p>
 <div class="tools"><button class="ghost" data-a="rot" ${sel&&!sel.on?'':'disabled'}>선택 블록 회전</button>${sel&&sel.home?'<button class="ghost danger" data-a="blkdel">빼내기 (블록 사라짐)</button>':''}<span class="note" style="margin:0">${sel?'놓을 칸을 누르세요 (끌어다 놓아도 돼요)':'블록을 고르거나 칸으로 끌어다 놓으세요'}</span></div>
 <div class="inv">${mine.map(b=>{const cs=cells(b),h=Math.max(...cs.map(x=>x[0]))+1,w=Math.max(...cs.map(x=>x[1]))+1;
  return `<button class="blk${b.u===S.blkSel?' sel':''}" data-blk="${b.u}" draggable="${b.on?'false':'true'}"><span class="mini" style="grid-template-columns:repeat(${w},12px)">${[...Array(h*w).keys()].map(i=>{const on=cs.some(([r,q])=>r*w+q===i);return `<i class="${on?'cell g-'+b.g:''}" style="${on?'':'visibility:hidden'}"></i>`}).join('')}</span><small><b class="gl g-${b.g}">${b.g}</b>${esc(bname(b))}</small><small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')} · ${b.on?'장착됨':'보관 중'}${S.locks.includes('b'+b.u)?' · 잠금':''}</small></button>`}).join('')||'<p class="note">이 카드에 맞는 블록이 없어요.</p>'}</div>
 <div class="sum">${Object.keys(sk).length?Object.entries(sk).map(([k,v])=>`<span>${SKN[k]} +${v}</span>`).join(''):'<span>장착한 스킬 없음</span>'}</div>`}
function vCard(){const c=by[S.cardId],op=open(c);
 const d=deckFx(),inUse=used().includes(c.id),back=backFace(c,0);
 return `<section class="band"><div class="tools"><h2 style="margin:0">카드 상세</h2><select id="cpick" aria-label="카드 선택">${OWN.map(x=>`<option value="${esc(x.id)}" ${x.id===c.id?'selected':''}>${x.year} ${esc(x.team)} ${esc(x.name)}</option>`).join('')}</select>
 <div class="tabs">${[[0,'앞면'],[1,'뒷면']].map(([v,n])=>`<button class="${+S.back===v?'on':''}" data-face="${v}">${n}</button>`).join('')}</div></div>
 <div class="cd"><div data-bigflip="1" style="cursor:pointer" title="눌러서 앞뒤 전환">${S.back?back:card(c,{full:1})}</div>
 <div>${S.back?`<h3>스킬</h3><p>장착한 스킬은 카드 뒷면에 칸으로 보여요. 블록을 넣거나 빼려면 스킬 화면에서 해요.</p><a href="#skill" data-skillgo="${esc(c.id)}"><button>스킬 장착하러 가기</button></a>`
 :`<h3>${PFULL[c.pos]} ${stars(c.cost)}</h3>
  <p class="help" style="margin:0">능력치 막대의 숫자는 덱 효과와 스킬 블록을 더한 값이고, 오른쪽 작은 숫자가 더해진 양이에요. 육성으로 120까지 오르며 100을 넘는 등급은 S+, SS, SS+로 표시합니다.</p>
  <div class="lbl">덱 효과</div><p style="margin:0">${inUse?`1군 등록 중: ${d.fx.map(x=>`${x.n} ${x.g}`).join(' · ')||'팀컬러 없음'} (${c.type==='B'?'야수 +'+d.bat:'투수 +'+d.pit})`:'1군에 등록하면 현재 덱 효과가 붙어요.'}</p>
  ${c.type==='P'?`<div class="lbl">구종</div><div class="apt">${Object.entries(c.pt).map(([n,g])=>`<span>${esc(n)}<b>${esc(g)}</b></span>`).join('')}</div>`:''}
  <div class="lbl">이번 시즌</div><p style="margin:0">${S.gp[String(S.cardId).split('#')[0]]||0}경기 출전 · 컨디션 <b>${CONDN[condOf(by[S.cardId])]}</b></p>`}</div></div></section>`}
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
function cmpBar(){return S.cmpA&&!S.modal?`<div class="cmpbar" role="status"><span>비교: <b>${esc(by[S.cmpA].name)}</b> ${by[S.cmpA].year} · 비교할 카드를 누르세요</span><button class="ghost" data-cmpx="1">취소</button></div>`:''}
function cmpView(a,b){const head=`<div class="mhead"><b>선수 비교</b><button class="ghost" data-cmpre="1">다른 선수 고르기</button><button class="ghost" data-cmpx="1">비교 끝내기</button></div>`;
 if(a.type!==b.type)return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true">${head}<p class="note">타자와 투수는 비교할 수 없어요. 같은 종류의 카드를 골라 주세요.</p></div></div>`;
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
function modal(){const c=by[S.modal];if(!c)return '';if(S.cmpA&&S.cmpA!==c.id)return cmpView(by[S.cmpA],c);
 return `<div class="modal" data-close="1"><div class="mbox" role="dialog" aria-modal="true" aria-label="${esc(c.name)} 카드">
 <div class="mhead"><b>${c.year} ${esc(c.team)} ${esc(c.name)}</b>${c.bo?`<span class="pill">타순 적성 ${c.bo.map(x=>BO[x]).join('·')}${c.st?` · 출루율 ${c.st.obp.toFixed(3).slice(1)} · OPS ${c.st.ops.toFixed(3)} · ${c.st.pa}타석`:''}</span>`:''}${S.mslot?'<button data-mswap="1">자리 교체하기</button>':''}<button class="ghost lockt" data-lock="${esc(c.id)}" aria-pressed="${isLocked(c.id)}" aria-label="${isLocked(c.id)?'잠금 해제':'잠그기'}" title="${isLocked(c.id)?'잠금 해제':'잠그기'}">${LOCKI(isLocked(c.id))}</button><button class="ghost" data-cmp="${esc(c.id)}">비교하기</button><button class="ghost mflip" data-mflip="1">${S.mflip?'앞면 보기':'뒷면 보기'}</button><button class="ghost" data-close="1" aria-label="닫기">닫기</button></div>
 <p class="mmeta">${[c.rg?`출신 지역 <b>${esc(c.rg)}</b>`:'',c.hs?`출신 고교 <b>${esc(c.hs)}</b>`:'',c.un?`대학 <b>${esc(c.un)}</b>`:'',c.b?`${c.year-c.b}세`:'',HAND[c.h]||'',!c.rg&&!c.hs?'출신 정보 없음':'',`${esc(lname(c.line))} 계보`,c.v==='IR'?`철인 · ${c.type==='B'?'전 경기 출장':'최다 등판'} · 스킬 효과 ×1.5`:c.v==='GG'?`골든글러브 ${({OF:'외야수',P:'투수'})[c.gg]||PFULL[c.gg]||c.gg}`:'',c.v==='EX'?'EX · 스킬 효과 ×1.25 · 같은 계보 덱 인원으로 셈':'',c.v==='RY'?'신인왕 · 컨디션이 보통 아래로 안 떨어짐':'',c.tw?`투타 겸업 · 같은 선수의 ${c.type==='P'?'타자':'투수'} 카드와 함께 1군 등록 가능`:'',ageOf(c)!=null?(abAge(c)?'유학 가능':'유학 불가'):''].filter(Boolean).join(' · ')}</p>${abHistText(c.id)?`<p class="mmeta abh">${PLANE}유학 다녀옴: ${esc(abHistText(c.id).replace(/\n/g,' / '))}</p>`:''}
 <div class="faces${S.mflip?' flipped':''}"><div class="face f-front">${card(c,{full:1})}</div><div class="face f-back">${backFace(c,0)}</div></div>
 <p class="note" style="text-align:center"><a href="#skill" data-skillgo="${esc(c.id)}">스킬 장착하러 가기</a>${credLine(c)?'<br>'+credLine(c):''}</p></div></div>`}
vw.addEventListener('click',e=>{S.msg='';const t=e.target.closest('[data-sft],[data-sfd],[data-pk],[data-pkv],[data-abrush],[data-dexk],[data-dexgot],[data-cmp],[data-cmpx],[data-cmpre],[data-abd],[data-abpick],[data-abget],[data-abok],[data-lock],[data-skillgo],[data-sktb],[data-skc],[data-sk2],[data-rec],[data-sk],[data-mat],[data-tsel],[data-ssel],[data-sgive],[data-sdel],[data-mswap],[data-tf],[data-tin],[data-tout],[data-mf],[data-sub],[data-tb],[data-mgr],[data-ojoin],[data-close],[data-mflip],[data-detail],[data-bigflip],[data-slot],[data-pick],[data-a],[data-cell],[data-blk],[data-pf],[data-side],[data-face]');if(!t)return;const D=t.dataset;
 if(abAct(D)||shopAct(D)){render();return}
 if(D.dexk){S.dexK=D.dexk;render();return}
 if(D.dexgot){S.dexGot=S.dexGot||{};S.dexGot[D.dexgot]=Date.now();render();return}
 if(D.cmp){S.cmpA=D.cmp;S.modal=null;S.mslot=null;render();return}
 if(D.cmpx){S.cmpA=null;S.modal=null;render();return}
 if(D.cmpre){S.modal=null;render();return}
 if(D.close){if(e.target===t||t.tagName==='BUTTON'){S.modal=null;S.mslot=null}else return}
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
 else if(D.sft){S.sf={...(S.sf||SF0),ty:D.sft};S.mat=[]}else if(D.sfd){S.sf={...(S.sf||SF0),dup:(S.sf||SF0).dup?0:1};S.mat=[]}else if(D.sk2){S.sk=D.sk2;S.mat=[];S.synRes=null;location.hash='synth';render();return}
 else if(D.sk){S.sk=D.sk;S.mat=[];S.synRes=null}
 else if(D.mat){const i=S.mat.indexOf(D.mat);S.synRes=null;if(i>=0)S.mat.splice(i,1);else if(S.mat.length<NEED(S.sk||'p'))S.mat.push(D.mat)}
 else if(D.ssel)S.ssel=S.ssel===D.ssel?null:D.ssel;
 else if(D.sgive){if(S.sup.length<2&&S.ssel){S.sup.push({id:S.ssel,cid:D.sgive,left:SUP_BY[S.ssel][4]});S.sq[S.ssel]--;S.ssel=null}}
 else if(D.sdel)S.sup.splice(+D.sdel,1);
 else if(D.slot){const [k,i]=D.slot.split(':'),s={k,i:+i};
  if(S.sel&&S.sel.k===k&&S.sel.i===+i)S.sel=null;else if(S.sel&&KIND(S.sel.k)===KIND(k)){swapSlots(S.sel,s);S.sel=null}
  else{const id=getS(s);if(id){S.modal=id;S.mflip=false;S.mslot=s}else S.sel=s}}
 else if(D.mswap){S.sel=S.mslot;S.modal=null;S.mslot=null}
 else if(D.pick){if(S.sel)place(D.pick);else{S.modal=D.pick;S.mflip=false;S.mslot=null}}
 else if(D.pf)S.pf=D.pf;else if(D.side)S.side=D.side;else if(D.face)S.back=D.face==='1';
 else if(D.cell)tapBlk(+D.cell,location.hash==='#skill'?S.skc:S.cardId);
 else if(D.blk){const u=D.blk;S.blkSel=S.blkSel===u?null:u}
 else{const a=D.a;if(a==='rot'){const b=S.blocks.find(x=>x.u===S.blkSel);if(b&&!b.on)b.rot=(b.rot+1)%4}if(a==='blkdel'){S.blocks=S.blocks.filter(b=>!(b.u===S.blkSel&&b.home));S.blkSel=null}
  if(a==='recapply'){S.undo=JSON.stringify({lu:S.lu,bench:S.bench,rot:S.rot,pen:S.pen});Object.assign(S,recommend(S.recm));S.recm=null;S.sel=null}
  if(a==='recclose')S.recm=null;
  if(a==='recundo'&&S.undo){Object.assign(S,JSON.parse(S.undo));S.undo=null}
  if(a==='synhelp')S.synHelp=!S.synHelp;if(a==='tcall')S.tcAll=!S.tcAll;
  if(a==='synth')doSynth();if(a==='synclr'){S.mat=[];S.synRes=null}if(a==='synauto'){const m=synAuto(S.sk||'p');S.synRes=null;if(m)S.mat=m;else{S.mat=[];S.msg='넣을 수 있는 재료가 부족해요.'}}
  if(a==='tdraw'){if(ECON.pay(S,100).err)S.msg='포인트가 모자라요';else{const u=Math.random(),g=u<.05?'황금':u<.25?'특수':'일반',x=pick(TCARDS.filter(t=>t[3]===g));S.tq[x[0]]=(S.tq[x[0]]||0)+1;S.tdraw=x[0]}}}
 render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.modal){S.modal=null;render()}});
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
vw.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.pick){e.preventDefault();e.target.click()}});
vw.addEventListener('change',e=>{const t=e.target;S.msg='';if(t.id==='sort')S.sort=t.value;if(t.id==='fteam')S.fteam=t.value;if(t.id==='fyear')S.fyear=t.value;if(t.dataset.sf){S.sf={...(S.sf||SF0),[t.dataset.sf]:t.value};S.mat=[]}if(t.id==='cpick'){S.cardId=t.value;S.back=false}if(t.dataset.pos)setPos(+t.dataset.pos,t.value);if(t.id==='t-live')S.tacLive=t.checked;render()});

const abd=id=>ABD.find(d=>d[0]===id),abOpen=d=>!d[2]||(ABU[d[2]]?ABU[d[2]][0]():false);
ABD.forEach(d=>{if(d[2]&&ABU[d[2]])d[6]=ABU[d[2]][1]});
// ===== 기존 화면 (주간·연도·친구 리그, 경기장, 보유 카드) =====
const cardHTML=(c,o={})=>card(c,{stats:1,pick:1,dim:o.dim});
function fxHTML(T){const tc=teamColor(regCards(T));return tc.fx.length?`<span class="fxchips">${tc.fx.map(f=>`<span class="fxc fx-${f.g}" title="${FX_FAM[f.fam]} 계열"><i>${f.g}</i>${esc(f.name)} · ${esc(f.d)} <b>야수 +${f.b} / 투수 +${f.p}</b></span>`).join('')}</span>`:`덱 효과 없음 · 가장 많은 연도·구단 ${esc(tc.top.year?tc.top.year[0]:'-')} ${tc.top.year?tc.top.year[1]:0}명 (12명부터)`}
function vCards(){const n=Object.keys(S.owned).length;
  const q=flt.q.trim();let L=(flt.all?CARDS:own()).filter(c=>(!flt.type||c.type===flt.type)&&(!flt.tier||c.tier===flt.tier)&&(!flt.line||c.line===flt.line)&&(!flt.year||c.year===+flt.year)&&(!q||c.name.includes(q)));
  L=[...L].sort(flt.sort==='year'?(a,b)=>a.year-b.year||b.ovr-a.ovr:flt.sort==='cost'?(a,b)=>b.cost-a.cost||b.ovr-a.ovr:(a,b)=>b.ovr-a.ovr);
  const sl=(k,o,l)=>`<select data-f="${k}" aria-label="${l}">${o.map(([v,t])=>`<option value="${v}" ${String(flt[k])===String(v)?'selected':''}>${t}</option>`).join('')}</select>`;
  return `<section class="band"><div class="lhead"><h1>컬렉션 <small>${n.toLocaleString()} / ${CARDS.length.toLocaleString()}</small></h1></div>
  <div class="filters"><input data-f="q" value="${esc(flt.q)}" placeholder="선수 이름" aria-label="선수 이름 검색">${sl('type',[['','타자+투수'],['B','타자'],['P','투수']],'유형')}${sl('tier',[['','모든 등급'],['N','노멀'],['S','스타'],['L','레전드']],'등급')}
  ${sl('line',[['','모든 구단'],...LINES.map(l=>[l,l])],'구단')}${sl('year',[['','모든 연도'],...[...YEARS].reverse().map(y=>[y,y])],'연도')}${sl('sort',[['ovr','능력순'],['cost','코스트순'],['year','연도순']],'정렬')}
  <label class="chk"><input type="checkbox" data-f="all" ${flt.all?'checked':''}> 미보유 카드도 보기</label></div>
  <p class="mini">${L.length.toLocaleString()}장</p><div class="grid">${L.slice(0,flt.lim).map(c=>cardHTML(c,{dim:!S.owned[c.id]})).join('')||'<p>조건에 맞는 카드가 없어요.</p>'}</div>
  ${L.length>flt.lim?`<div class="btns" style="margin-top:16px"><button data-a="more">더 보기</button></div>`:''}</section>`}
function vGame(){
  if(!G)return `<section class="hero"><h1>진행 중인 경기가 없어요</h1><p><a href="#season">주간 리그</a>에서 경기장에 입장하세요.</p></section>`;
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
  ${tk}<div class="btns gb">${g.done?`<button class="big" data-a="fin">${g.friendly?'친선전 결과 저장':'결과 반영하고 다음 라운드'}</button>`:`<button class="big" data-a="pa">다음 타석</button><button data-a="inn">이닝 끝까지</button><button data-a="end">경기 끝까지</button>`}</div></section>
  <section class="band cols2"><div><h3>${g.hl?'하이라이트 <small>득점·홈런·보살·실책·교체</small>':'문자 중계'}</h3><ol class="glog">${logHTML(g)}</ol></div><div><details open><summary>박스스코어</summary>${box(0)}${box(1)}</details></div></section>`}
/*MODES*/
/*ONLINE*/
// ===== 화면 전환 =====
const ROUTES={home:vHome,season:vSeason,years:vYears,online:vOnline,game:vGame,lineup:vLineup,skill:vSkill,cards:vCards,card:vCard,shop:vShop,synth:vSynth,abroad:vAbroad,dex:vDex};
const LEG=new Set(['season','years','online','game','cards']);
const NAVS={home:[['home','홈']],play:[['season','주간 리그'],['years','연도별 리그'],['online','친구 리그'],['game','경기장']],team:[['lineup','라인업'],['skill','스킬'],['cards','보유 카드']],cards:[['shop','카드팩'],['synth','합성'],['abroad','유학'],['dex','도감']]};
const NAVG=Object.fromEntries(Object.entries(NAVS).flatMap(([g,L])=>L.map(([h])=>[h,g])));NAVG.card='team';
const NAVN={home:'홈',play:'경기',team:'팀',cards:'카드'};
const view=()=>{const h=location.hash.slice(1);return ROUTES[h]?h:'home'};
function head(k){const s=S.season,tx=Object.values(S.tix||{}).reduce((a,b)=>a+(b|0),0),g=NAVG[k],L=NAVS[g]||[];
  return `<div class="logo">프로호구 매니저<small>KBO 1982–2026 선수카드 매니저 · ${CARDS.length.toLocaleString()}장</small></div>
  <div class="wallet"><span id="ptw">${(S.pt||0).toLocaleString()} P</span>${tx?`<a href="#shop" style="text-decoration:none;color:inherit"><span>확정권 ${tx}장</span></a>`:''}<span>블록 ${S.blocks.filter(b=>!b.on).length}</span>${s?`<span>${s.tier?esc(tierName(s.tier)):'시즌 '+s.n} · ${Math.min(s.round+1,s.sched.length)}/${s.sched.length}</span>`:''}</div>
  <nav id="nav">${Object.entries(NAVS).map(([gk,LL])=>`<a href="#${LL[0][0]}" data-g="${gk}" class="${gk===g?'on':''}">${NAVN[gk]}</a>`).join('')}<button id="helpBtn" class="ghost" aria-pressed="${document.body.classList.contains('showhelp')}" style="margin-left:auto">${document.body.classList.contains('showhelp')?'설명 숨기기':'설명 보기'}</button></nav>
  <div id="subnav" class="subnav2" role="navigation" aria-label="하위 메뉴" ${L.length<2?'hidden':''}>${L.length>1?L.map(([h,n])=>`<a href="#${h}" class="${h===k?'on':''}"${h===k?' aria-current="page"':''}>${n}</a>`).join(''):''}</div>
  ${S.toast?`<div class="toast">${esc(S.toast)}</div>`:''}`}
function render(){if(!S)return;ensureUI();if(S.season&&!G){weekTick();ylTick()}restoreLift();syncTeam();rebuildOwn();
  const k=view(),y=scrollY;document.body.dataset.bg=k==='lineup'?(S.tb==='P'?'pen':'team'):k==='skill'?'cage':k==='cards'||k==='card'?'team':k==='abroad'?'fungo':k==='game'?'catch':'field';hdr.innerHTML=head(k);let body;try{body=ROUTES[k]()}catch(e){console.error(e);body=`<section class="band"><h2>화면을 그리지 못했어요</h2><p class="note">${esc(e.message)}</p></section>`}
  vw.innerHTML=(LEG.has(k)?`<div class="lg">${body}</div>`:body)+cmpBar()+modal();S.toast='';
  const sv=$('#sv');if(sv)sv.value=btoa(unescape(encodeURIComponent(JSON.stringify(S,function(kk,v){return this===S&&TRANS.has(kk)?undefined:v}))));if(S.modal)scrollTo(0,y);saveSoon()}
addEventListener('hashchange',()=>{S&&(S.modal=null);render();scrollTo(0,0)});
hdr.addEventListener('click',e=>{const hb=e.target.closest('#helpBtn');if(hb){document.body.classList.toggle('showhelp');render()}});
// 기존 게임 동작 (경기 진행·리그·친구 리그·저장 코드·사진 올리기)
const REALA=new Set(['start','auto','newseason','pa','inn','end','fin','tk','copy','load','reset','more','rmphoto','dexmore','coupon']);
function realClick(b){const a=b.dataset.a;if(a.startsWith('o-')){oAct(a,b);return}if(a.startsWith('m-')){mAct(a,b);return}
  if(a==='start')startGame(false);else if(a==='auto')startGame(true);else if(a==='newseason'){newSeason();render()}
  else if(a==='pa'){pa(G,true);render()}else if(a==='inn'){const h=G.half,n=G.inn;let k=0;while(!G.done&&G.half===h&&G.inn===n&&k++<300)pa(G);render()}
  else if(a==='end'){simAll(G);render()}else if(a==='fin'){if(G.friendly)oFinish();else endGame()}
  else if(a==='tk'){const k=b.dataset.k;tactic(G,k,k==='ph'?$('#phs').value:null);pa(G);render()}
  else if(a==='more'){flt.lim+=240;render()}
  else if(a==='dexmore'){S.dexLim=(S.dexLim||24)+24;render()}
  else if(a==='coupon')redeemCoupon();
  else if(a==='rmphoto'){delete S.photos[S.modal];save();render()}
  else if(a==='copy'){const t=$('#sv').value;navigator.clipboard?.writeText(t).then(()=>{b.textContent='복사됨'},()=>{$('#sv').select()})}
  else if(a==='load'){try{const o=JSON.parse(decodeURIComponent(escape(atob($('#sv').value.trim()))));if(o&&o.team&&o.season){S=o;ensureUI();save();render()}}catch(e){b.textContent='코드를 읽지 못했어요'}}
  else if(a==='reset'){if(b.dataset.c){fresh();packOut=null;G=null;render()}else{b.dataset.c=1;b.textContent='한 번 더 누르면 초기화'}}}
vw.addEventListener('click',e=>{const ra=e.target.closest('[data-a]');if(ra&&!ra.disabled&&(REALA.has(ra.dataset.a)||/^[om]-/.test(ra.dataset.a))){e.stopImmediatePropagation();realClick(ra)}},true);
vw.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.up&&t.files&&t.files[0]){const id=t.dataset.up,img=new Image();img.onload=()=>{const W=240,H=Math.round(img.height*W/img.width),cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(img,0,0,W,H);
    S.photos=S.photos||{};S.photos[id]=cv.toDataURL('image/jpeg',.82);try{save()}catch(e){};render()};img.src=URL.createObjectURL(t.files[0]);return}
  if(t.dataset.f){flt[t.dataset.f]=t.type==='checkbox'?t.checked:t.value;flt.lim=120;render();return}
  if(t.id==='tn'){S.team.name=t.value.trim()||'내 구단';save();render();return}
  if(t.id==='tyy'){S.pkSel.ty={year:+t.value,team:TEAMS_OF(t.value)[0]};render();return}
  if(t.id==='tyt'){S.pkSel.ty.team=t.value;render();return}
  if(t.id==='dexq'){S.dexQ=t.value;S.dexLim=24;render();return}
  if(t.id==='t-live'){S.tacLive=t.checked;render();return}});
// ===== 시작 =====
vw.innerHTML='<section class="band"><h1>선수 카드 불러오는 중…</h1><p class="note">KBO 1982~2026 기록으로 만든 카드</p></section>';
fetch('cards.json').then(r=>r.json()).then(j=>{loadCards(j);
  for(const c of CARDS){c.col=TC[c.team]||LINE_COLOR[c.line]||'#555';if(c.rg==null&&c.reg)c.rg=c.reg}
  LINES=[...new Set(CARDS.map(c=>c.line))];YEARS=[...new Set(CARDS.map(c=>c.year))].sort((a,b)=>b-a);ECON.buildSets(CARDS);
  try{const t=localStorage.getItem(KEY);if(t){S=JSON.parse(t);if(!S.season||!S.team)S=null}}catch(e){S=null}
  if(!S)fresh();else{for(const id in S.owned)if(!byId[id])delete S.owned[id];S.blocks=S.blocks||[];S.gp=S.gp||{};S.tq=S.tq||{};S.sq=S.sq||{};S.team.bench=S.team.bench||[]}
  ensureUI();const lg=ECON.login(S);if(lg)S.toast=`출석 ${lg.streak}일째 · ${rwText(lg)} 받았어요`;
  render();fbBoot()}).catch(e=>{console.error(e);vw.innerHTML=`<section class="band"><h1>카드 데이터를 불러오지 못했어요</h1><p>${esc(e.message)}</p></section>`});
})();
