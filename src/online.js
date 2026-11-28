// ===== 친구 리그 (Firebase: Google 로그인 + Firestore) =====
// window.FB 는 Firebase 배포본의 module 스크립트가 채워 넣는다. 없으면 안내만 보여 준다.
const ON={user:null,leagues:[],cur:null,teams:{},games:[],msg:'',busy:false,sync:'',lastPush:0};
const fb=()=>window.FB;
// ===== 클라우드 저장(v2, 2026-11-25) =====
// users/{uid}            : 작은 요약 문서. v·ts·name·cards(보유 종류 수)와 콘솔에서 바로 고칠 수 있는 pt·tix·exShard·tq·sq
// users/{uid}/save/owned : {c:{카드id:장수}} 보유 카드(맵, 콘솔 편집 가능)
// users/{uid}/save/team  : {j:팀·라인업 JSON}
// users/{uid}/save/rest  : {j:나머지(스킬 블록·덱·유학·시즌 등) JSON}
// 저장: 바뀐 하위 문서만 한 번에(batch) 씀. 불러오기: 평소엔 요약 문서 1개만 읽고, 다른 기기에서 더 최근에 저장했을 때만 하위 문서 3개를 읽음
// 콘솔에서 pt 등 요약 필드를 고치면 다음 접속 때 자동 반영. 보유 카드·나머지를 콘솔에서 고쳤다면 요약 문서 ts를 더 큰 수로 바꿔 주면 반영됨
const TOPK=['pt','tix','exShard','tq','sq'],LOCALK=new Set(['photos','photoTs','phPull','cl','uid']);
const canon=v=>v&&typeof v==='object'?(Array.isArray(v)?'['+v.map(canon).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}'):JSON.stringify(v===undefined?null:v);
const topOf=o=>{const t={};for(const k of TOPK)if(o[k]!=null)t[k]=o[k];return t};
function packSave(){syncTeam();const o=JSON.parse(JSON.stringify(S,function(k,v){return this===S&&(TRANS.has(k)||LOCALK.has(k))?undefined:v}));
  const owned=o.owned||{},team=o.team||{};delete o.owned;delete o.team;const top=topOf(o);for(const k of TOPK)delete o[k];delete o.ts; // ts는 요약 문서에만
  return {top,owned,os:canon(owned),team:JSON.stringify(team),rest:JSON.stringify(o)}}
const stripS=()=>{const o={...S};for(const k of LOCALK)delete o[k];return o}; // 예전 형식(json 한 덩어리) 저장용
let pushT=null;ON.last=ON.last||null; // 이 기기가 마지막으로 올린 하위 문서 내용(같으면 다시 안 씀)
// 동기화 수정(SJ 2026-11-26: PC에 있던 김광현 EX가 폰 접속 후 사라짐). 원인: 로그인 직후 클라우드를 읽기 전에 이 기기가 먼저 저장하거나(출석 보상 등),
// 이 기기 저장 시각이 더 늦으면 클라우드(다른 기기 진행분)를 통째로 덮어씀. → ① 클라우드를 한 번 읽어 맞추기 전에는 올리지 않음(ON.synced)
// ② 마지막으로 맞춘 시점의 보유량(기준점, 기기별 localStorage)을 기억해 두고, 양쪽이 다 바뀌었으면 '기준점 대비 증감'을 합침(mergeSave)
function cloudPush(now){const F=fb();if(!F||!ON.user||ON.synced!==ON.user.uid)return;clearTimeout(pushT);
  pushT=setTimeout(async()=>{try{if(ON.synced!==ON.user.uid)return;const uid=ON.user.uid,ref=(...p)=>F.doc(F.db,'users',uid,...p);S.uid=uid;const ts=S.ts||Date.now(),snap=cbSnap(S),P=packSave(),L=ON.last||{};let n=0;
    if(F.writeBatch){try{const b=F.writeBatch(F.db);
      if(L.os!==P.os){b.set(ref('save','owned'),{c:P.owned});n++}
      if(L.team!==P.team){b.set(ref('save','team'),{j:P.team});n++}
      if(L.rest!==P.rest){b.set(ref('save','rest'),{j:P.rest});n++}
      b.set(ref(),{v:2,ts,name:ON.user.displayName||'',cards:Object.keys(P.owned).length,...P.top});await b.commit();
      ON.last={os:P.os,team:P.team,rest:P.rest};S.cl=canon(P.top);setBase(uid,ts,snap);n=-1}
     catch(e){if(e.code!=='permission-denied')throw e;ON.v1=1}} // 규칙을 아직 안 바꿨으면 예전 형식으로
    if(n!==-1){await F.setDoc(ref(),{json:JSON.stringify(stripS()),ts,name:ON.user.displayName||''});setBase(uid,ts,snap)}
    try{await photoSync()}catch(e){ON.sync='사진 연동 실패: '+e.code}ON.sync=ON.sync&&ON.sync.startsWith('사진')?ON.sync:'클라우드 저장됨 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+(ON.v1?' (예전 형식: 보안 규칙 게시 필요)':'');if(view()==='online')render()}catch(e){ON.sync='클라우드 저장 실패: '+e.code}},now?0:2500)}
// 직접 올린 사진(S.photos) 기기 간 연동: users/{uid}/photos/{cardId} = {d: dataURL, ts}. 본문 문서(1MB 한도)와 분리.
// S.photoTs[id]=올린 시각, S.phPull=마지막으로 클라우드 사진을 받은 시각. ON.ph=클라우드에 있다고 아는 사진(id→dataURL)
ON.ph=ON.ph||null;
async function photoSync(){const F=fb();if(!F||!ON.user||!ON.ph||!F.deleteDoc)return;S.photos=S.photos||{};S.photoTs=S.photoTs||{};const col=['users',ON.user.uid,'photos'];
  for(const id in S.photos){if(ON.ph[id]===S.photos[id])continue;const d=S.photos[id];if(d.length>190000){ON.sync='사진 용량 초과 · 연동 제외';continue}
    if(!S.photoTs[id])S.photoTs[id]=Date.now();
    await F.setDoc(F.doc(F.db,...col,id),{d,ts:S.photoTs[id]});ON.ph[id]=d}
  for(const id in ON.ph)if(!S.photos[id]){await F.deleteDoc(F.doc(F.db,...col,id));delete ON.ph[id];delete S.photoTs[id]}
  S.phPull=Date.now()} // 여기까지 올린 사진은 클라우드와 맞춰짐
async function photoPull(){const F=fb();S.photos=S.photos||{};S.photoTs=S.photoTs||{};const last=S.phPull||0,got={};
  const qs=await F.getDocs(F.collection(F.db,'users',ON.user.uid,'photos'));qs.forEach(x=>{got[x.id]=x.data()});
  for(const id in got){const c=got[id];if(!S.photos[id]||(S.photoTs[id]||0)<(c.ts||0)){S.photos[id]=c.d;S.photoTs[id]=c.ts||0}}
  // 클라우드에 없는 로컬 사진: 마지막 동기화 뒤에 올린 것만 남기고(올라갈 예정), 그 전 것은 다른 기기에서 지운 것으로 봄
  for(const id in S.photos)if(!got[id]&&last&&S.photoTs[id]&&S.photoTs[id]<=last){delete S.photos[id];delete S.photoTs[id]}
  ON.ph={};for(const id in got)if(S.photos[id]===got[id].d)ON.ph[id]=got[id].d;S.phPull=Date.now()}
function adoptCloud(o,uid){const ph=S.photos,pt=S.photoTs,pp=S.phPull;S=o;S.photos=ph;S.photoTs=pt;S.phPull=pp;S.uid=uid;
  if(typeof migSpecial==='function')migSpecial(S);for(const id in S.owned)if(!byId[id])delete S.owned[id];
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){};ON.sync='클라우드 저장 불러옴';G=null;packOut=null}
// 덱 합치기(SJ 2026-11-26: 집에서 짠 덱이 다른 컴퓨터에서 안 보임). 저장은 '더 최근 기기 전체'가 이기는 방식이라
// 다른 기기에서 먼저 저장하면 이쪽 덱이 사라질 수 있었음 → 덱은 id 기준으로 양쪽을 합침. 지운 덱은 deckGone(id 목록)으로 되살아나지 않게
function mergeDecks(a,b){const gone=new Set([...(a.deckGone||[]),...(b.deckGone||[])]),m=new Map();
  for(const d of [...(b.decks||[]),...(a.decks||[])])if(d&&d.id&&!gone.has(d.id))m.set(d.id,d);a.decks=[...m.values()];a.deckGone=[...gone].slice(-200)}
// 기준점: 이 기기가 클라우드와 마지막으로 맞춘 때(올렸거나 받았을 때)의 클라우드 ts와 보유량. 계정별로 이 기기 localStorage에만 둠
const CNTK=['owned','tq','sq','tix'],NUMK=['pt','exShard'],LSTK=['blocks','eq'],CBK=()=>KEY+'-cb';
const cbSnap=s=>JSON.parse(JSON.stringify({...Object.fromEntries(CNTK.map(k=>[k,s[k]||{}])),...Object.fromEntries(NUMK.map(k=>[k,+s[k]||0])),...Object.fromEntries(LSTK.map(k=>[k,(s[k]||[]).map(x=>x&&x.u).filter(Boolean)]))}));
function getBase(uid){try{const b=JSON.parse(localStorage.getItem(CBK())||'null');return b&&b.uid===uid?b:null}catch(e){return null}}
function setBase(uid,ts,snap){try{localStorage.setItem(CBK(),JSON.stringify({...snap,uid,ts}))}catch(e){}}
// L=이 기기, C=클라우드, B=기준점(없으면 null: 예전 버전에서 넘어온 첫 동기화 → 양쪽 중 큰 값/합집합으로 아무것도 잃지 않게)
// 카드·작전카드·확정권 장수와 포인트: 클라우드 값 + 이 기기에서 기준점 이후 늘고 준 만큼. 블록·장비: 양쪽에서 새로 생긴 것은 모두, 한쪽에서 지운 것은 지움
// 그 밖의 값(라인업·시즌·미션 진행 등)은 더 최근에 저장한 쪽. 도감·받은 공지 보상·끝낸 미션 챕터는 합집합, 경기 수(gp)는 큰 값
function mergeSave(L,C,B){const lw=(L.ts||0)>(C.ts||0),N=lw?L:C,O=lw?C:L,m=JSON.parse(JSON.stringify(N));
  const d=(l,c,b)=>Math.max(0,B?c+l-b:Math.max(l,c));
  for(const k of CNTK){const l=L[k]||{},c=C[k]||{},b=B&&B[k]||{},r={};
    for(const id of new Set([...Object.keys(l),...Object.keys(c)])){const v=d(l[id]|0,c[id]|0,b[id]|0);if(v>0)r[id]=v}m[k]=r}
  for(const k of NUMK)m[k]=d(+L[k]||0,+C[k]||0,B?+B[k]||0:0);
  for(const k of ['dex','dexDone','ntc','msFin'])if(O[k]||N[k])m[k]={...(O[k]||{}),...(N[k]||{})}; // 받은 공지 보상·끝낸 미션 챕터도 합집합(두 번 받기 방지)
  m.gp={...(O.gp||{})};for(const id in N.gp||{})m.gp[id]=Math.max(m.gp[id]|0,N.gp[id]|0);
  m.eqN=Math.max(L.eqN|0,C.eqN|0);
  for(const k of LSTK){const bs=B?new Set(B[k]||[]):null,lm=new Map((L[k]||[]).filter(x=>x&&x.u).map(x=>[x.u,x])),cm=new Map((C[k]||[]).filter(x=>x&&x.u).map(x=>[x.u,x])),nm=lw?lm:cm,om=lw?cm:lm,r=[];
    for(const u of new Set([...nm.keys(),...om.keys()])){const inL=lm.has(u),inC=cm.has(u),inB=bs?bs.has(u):false;
      if(bs&&!((inL&&inC)||(!inB&&(inL||inC))))continue; // 기준점에 있던 것을 한쪽에서 지웠으면 지움
      const a=nm.get(u),b=om.get(u);
      if(a&&b&&!inB&&canon(a)!==canon(b)){r.push(a);r.push({...b,u:k==='eq'?'e'+(++m.eqN):u+'m'});continue} // 두 기기가 같은 번호로 각자 만든 장비 → 둘 다 남김
      r.push(JSON.parse(JSON.stringify(a||b)))}
    m[k]=r}
  for(const x of [...(m.blocks||[]),...(m.eq||[])])if(x.on&&!m.owned[x.on]){x.on=null;if('at' in x)x.at=null} // 사라진 카드에 붙어 있던 블록·장비는 떼어 둠
  mergeDecks(m,O);return m}
const backupLocal=()=>{try{const o={...S};delete o.photos;delete o.photoTs;localStorage.setItem(KEY+'-bak',JSON.stringify(o,function(k,v){return this===o&&TRANS.has(k)?undefined:v}))}catch(e){}}; // 덮어쓰기 전 이 기기 저장 사본(만일을 위해)
async function cloudPull(){const F=fb(),u=ON.user,ref=(...p)=>F.doc(F.db,'users',u.uid,...p);let push=0;try{
  const d=await F.getDoc(ref());
  if(d.exists()){const c=d.data(),mine=S.uid===u.uid,B=mine?getBase(u.uid):null,bts=B?B.ts:0,
      cNew=!mine||(c.ts||0)>bts, // 이 기기가 마지막으로 맞춘 뒤 다른 기기가 클라우드에 저장함(기준점 없으면 늘 참)
      lNew=mine&&(S.ts||0)>bts;  // 이 기기도 그 뒤에 저장함
    if(c.v===2&&cNew){const [o,t,r]=await Promise.all([F.getDoc(ref('save','owned')),F.getDoc(ref('save','team')),F.getDoc(ref('save','rest'))]);
      let x=r.exists()?JSON.parse(r.data().j):{};x.team=t.exists()?JSON.parse(t.data().j):S.team;x.owned=o.exists()?(o.data().c||{}):{};Object.assign(x,topOf(c));x.ts=c.ts||0;
      const cloudSnap=cbSnap(x);
      if(lNew){backupLocal();x=mergeSave(S,x,B);x.ts=Math.max(Date.now(),(c.ts||0)+1,(S.ts||0)+1); // 양쪽 다 바뀜 → 합쳐서 다시 올림
        adoptCloud(x,u.uid);setBase(u.uid,c.ts||0,cloudSnap);S.cl=canon(topOf(c));ON.last=null;ON.sync='다른 기기 저장과 합침';push=1}
      else{if(S.decks&&S.decks.length&&(!S.uid||mine))mergeDecks(x,S);if(mine)backupLocal();
        adoptCloud(x,u.uid);setBase(u.uid,c.ts||0,cloudSnap);S.cl=canon(topOf(c));ON.last={os:canon(x.owned),team:r.exists()&&t.exists()?t.data().j:null,rest:r.exists()?r.data().j:null}}}
    else if(c.v!==2&&c.json&&cNew){if(mine)backupLocal();let x=JSON.parse(c.json);if(lNew)x=mergeSave(S,x,B);adoptCloud(x,u.uid);S.ts=Date.now();ON.last=null;push=1} // 예전 형식 → 새 형식으로 다시 저장
    else{ // 클라우드는 이 기기가 마지막으로 맞춘 그대로: 이 기기 저장을 올림. 콘솔에서 요약 필드(pt 등)를 고쳤으면 반영 후 저장
      if(c.v===2){try{const r=await F.getDoc(ref('save','rest'));if(r.exists()){const n0=(S.decks||[]).length;mergeDecks(S,JSON.parse(r.data().j));if(S.decks.length!==n0)ON.sync='다른 기기에서 짠 덱 합침'}}catch(e){}}
      if(c.v===2){const ct=canon(topOf(c));if(S.cl&&ct!==S.cl){Object.assign(S,topOf(c));S.cl=ct;ON.sync='콘솔에서 바꾼 값 반영'}}
      push=1}}
  else{S.uid=u.uid;push=1}
  ON.synced=u.uid;if(push){S.ts=Math.max(S.ts||0,Date.now());try{localStorage.setItem(KEY,JSON.stringify(S,function(k,v){return this===S&&TRANS.has(k)?undefined:v}))}catch(e){}cloudPush(true)}}
  catch(e){ON.sync='클라우드 불러오기 실패: '+e.code+' · 다시 시도하려면 [지금 클라우드 저장]'}
  try{await photoPull();cloudPush(true)}catch(e){ON.sync='사진 불러오기 실패: '+e.code}}
async function loadLeagues(){const F=fb();try{const q=F.query(F.collection(F.db,'leagues'),F.where('members','array-contains',ON.user.uid));
  ON.leagues=(await F.getDocs(q)).docs.map(d=>({id:d.id,...d.data()}));if(ON.cur&&!ON.leagues.find(l=>l.id===ON.cur))ON.cur=null;if(!ON.cur&&ON.leagues[0])ON.cur=ON.leagues[0].id;if(ON.cur)await loadLeague()}catch(e){ON.msg='리그 목록 오류: '+e.code}}
async function loadLeague(){const F=fb(),lid=ON.cur;
  const ts=await F.getDocs(F.collection(F.db,'leagues',lid,'teams'));ON.teams={};ts.forEach(d=>{ON.teams[d.id]=d.data()});
  const gs=await F.getDocs(F.query(F.collection(F.db,'leagues',lid,'games'),F.orderBy('at','desc'),F.limit(200)));ON.games=gs.docs.map(d=>d.data())}
async function afterLogin(){if(!S||!ON.user||ON.pulled===ON.user.uid)return;ON.pulled=ON.user.uid;await cloudPull();await loadLeagues();render()}
function fbBoot(){const F=fb();if(!F)return;if(fbBoot.done){afterLogin();return}fbBoot.done=1;
  F.onAuthStateChanged(F.auth,async u=>{ON.user=u;ON.pulled=null;ON.synced=null;ON.ready=1;if(S)render();if(u)await afterLogin();else{ON.leagues=[];ON.cur=null;if(S)render()}})}
addEventListener('fb-ready',fbBoot);
const code6=()=>Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const myName=()=>(ON.user&&(ON.user.displayName||ON.user.email||'').split('@')[0])||'나';
// ===== 미리 받기(2026-11-25) =====
// 카드 데이터(cards.json, 버전별)와 기본 선수 사진을 브라우저 캐시(Cache API 'phm-img')에 미리 받아 둠. 이후 접속 때는 다시 내려받지 않음(sw.js가 캐시에서 응답).
// 직접 올린 사진(S.photos, data: URL)은 캐시와 무관하고 항상 기본 사진보다 우선이라 업데이트로 덮어쓰이지 않음
ON.pre=ON.pre||null;
const preURLs=()=>[...new Set(CARDS.map(c=>c.img&&(typeof c.img==='string'?c.img:c.img.f)).filter(Boolean))];
async function preload(){if(!('caches' in window)){ON.pre={err:'이 브라우저는 미리 받기 미지원'};return}
  const c=await caches.open('phm-img'),L=preURLs(),P=ON.pre={done:0,skip:0,total:L.length,fail:0,run:1};let i=0;const tick=()=>{if(view()==='online')render()};
  const one=async u=>{try{if(await c.match(u)){P.skip++;return}const cross=/^https?:/.test(u)&&!u.startsWith(location.origin);const r=await fetch(u,cross?{mode:'no-cors'}:{});if(r.ok||r.type==='opaque')await c.put(u,r);else P.fail++}catch(e){P.fail++}finally{P.done++;if(P.done%40===0)tick()}};
  await Promise.all(Array.from({length:6},async()=>{while(i<L.length)await one(L[i++])}));P.run=0;try{localStorage.setItem(KEY+'-pre',String(Date.now()))}catch(e){}tick()}
function preHTML(){const P=ON.pre,t=+(localStorage.getItem(KEY+'-pre')||0);
  return `<div class="btns" style="margin-top:8px"><button class="ghost" data-a="o-pre" ${P&&P.run?'disabled':''}>사진 미리 받기</button><span class="mini">${P&&P.err?esc(P.err):P&&P.run?`받는 중 ${P.done}/${P.total}`:P?`완료 · 새로 ${P.done-P.skip-P.fail}장, 이미 있음 ${P.skip}장${P.fail?`, 실패 ${P.fail}장`:''}`:t?`마지막으로 받은 때 ${new Date(t).toLocaleDateString('ko-KR')}`:'기본 선수 사진을 한 번에 받아 두면 이후 접속 때는 다시 받지 않음(와이파이 권장)'}</span></div>`}
async function oAct(a,b){const F=fb(),u=ON.user;ON.msg='';
  try{
  if(a==='o-login'){await F.signInWithPopup(F.auth,new F.GoogleAuthProvider());return}
  if(a==='o-logout'){await F.signOut(F.auth);return}
  if(a==='o-save'){if(ON.synced!==u.uid){ON.pulled=null;await afterLogin();return}cloudPush(true);return}
  if(a==='o-pre'){preload();return}
  if(a==='o-sel'||a==='o-ref'){if(b.dataset.l)ON.cur=b.dataset.l;await loadLeagues()}
  else if(a==='o-create'){const nm=($('#oln').value||'').trim().slice(0,20);if(!nm){ON.msg='리그 이름 필요';return}
    let code=code6();for(let i=0;i<5&&(await F.getDoc(F.doc(F.db,'leagues',code))).exists();i++)code=code6();
    await F.setDoc(F.doc(F.db,'leagues',code),{name:nm,code,owner:u.uid,members:[u.uid],memberNames:{[u.uid]:S.team.name+' ('+myName()+')'},created:F.serverTimestamp()});
    ON.cur=code;await loadLeagues();ON.msg=`리그 생성 완료. 친구에게 코드 ${code} 공유.`}
  else if(a==='o-join'){const code=($('#olc').value||'').trim().toUpperCase();const ref=F.doc(F.db,'leagues',code),d=await F.getDoc(ref);
    if(!d.exists()){ON.msg='없는 리그 코드';return}
    if(!d.data().members.includes(u.uid))await F.updateDoc(ref,{members:F.arrayUnion(u.uid),['memberNames.'+u.uid]:S.team.name+' ('+myName()+')'});
    ON.cur=code;await loadLeagues();ON.msg=`${d.data().name} 리그 참가 완료. 라인업을 등록하면 친구들이 도전 가능.`}
  else if(a==='o-reg'){useMode('on');const e=validate();if(e.length){ON.msg='라인업 오류: '+e[0];return}
    const T=clean(S.team),ids=new Set(regCards(T).map(c=>c.id)),blocks=S.blocks.filter(x=>x.on&&ids.has(x.on));
    await F.setDoc(F.doc(F.db,'leagues',ON.cur,'teams',u.uid),{name:S.team.name,owner:myName(),json:JSON.stringify({name:S.team.name,lineup:T.lineup,bench:T.bench,rot:T.rot,pen:T.pen,rotMode:S.rotMode||'strict',blocks,abSt:S.abSt||{},mgr:S.team.mgr||'',fxsel:S.team.fxsel||[],eq:eqMap(),tsel:(S.tq||{})[S.team.tsel]>0?S.team.tsel:null,sup:(S.team.sup||[]).filter(x=>x.left>0)}),ovr:teamOvr(T),cost:regCards(T).reduce((s,c)=>s+c.cost,0),fx:teamColor(regCards(T)).fx.map(f=>f.n).join(', '),updated:F.serverTimestamp()});
    await loadLeague();ON.msg='현재 라인업 리그 등록 완료.'}
  else if(a==='o-play'||a==='o-quick'){useMode('on');const h=b.dataset.u,t=ON.teams[h];if(!t)return;const e=validate();if(e.length){ON.msg='라인업 오류: '+e[0];return}
    const T=JSON.parse(t.json);T.color='#3d7fd1';
    const prev=ON.games.filter(x=>(x.a===ON.user.uid&&x.h===h)||(x.h===ON.user.uid&&x.a===h)).length;let st=0;for(const x of ON.games.filter(x=>x.a===ON.user.uid||x.h===ON.user.uid)){const me=x.a===ON.user.uid?0:1;if(x.res===1-me){if(st<=0)st--;else break}else break}
    // 5판 3선승(SJ 2026-11-26): 단판이면 1선발만 좋으면 돼서 선발진 깊이가 의미 없음 → 양쪽 다 1선발부터 로테이션 순서대로. 무승부 경기는 승수에 안 들어가고 최대 7경기, 그래도 안 끝나면 시리즈 무승부
    const U=userT('on');U.ctx={rematch:prev>0,streak:st};const TC={};for(const id of [...T.lineup.map(x=>x.id),...(T.bench||[]),...(T.rot||[]),...(T.pen||[])].filter(Boolean)){const u=Math.random();TC[id]=Math.max(condMin(id),u<.08?1:u<.25?2:u<.6?3:u<.88?4:5)} // 2026-11-27(SJ): 도전 상대도 컨디션 무작위(내 쪽과 같은 분포, 시리즈 동안 유지)const sw=[0,0],gl=[],rs=[0,0],F0={},F1={};let last=null; // 시리즈 피로: 경기마다 누적, 경기 사이 하루 휴식(선발 운용 '유연'일 때 에이스 재등판 판단에 씀)
    for(let i=0;i<OBO_MAX&&sw[0]<3&&sw[1]<3;i++){U.rotIdx=i;T.rotIdx=i;const g=mkGame(simTeam(U,S.cond,F0),simTeam(T,TC,F1));g.me=0;g.ctrl=null;g.pair=[0,1];simAll(g);fatAdd(F0,g,0);fatAdd(F1,g,1);fatRest(F0);fatRest(F1);if(i===5){fatRest(F0);fatRest(F1)} /* 2026-11-27: 화~일 6경기 뒤 월요일 휴식 */
      if(g.res>=0)sw[g.res]++;rs[0]+=g.sc[0];rs[1]+=g.sc[1];gl.push({sc:g.sc,sp:[g.px[0][0]&&g.px[0][0].c.name,g.px[1][0]&&g.px[1][0].c.name]});last=g}
    G=last;G.friendly={lid:ON.cur,h,hn:t.name+' ('+t.owner+')',sw,gl,rs};if(a==='o-quick'){await oFinish();return}G.hl=1;location.hash='game'}
  }catch(e){ON.msg='오류: '+(e.code||e.message)}finally{render()}}
const OBO_MAX=7;
async function oFinish(){const F=fb(),g=G,f=g.friendly,sr=f.sw?(f.sw[0]>f.sw[1]?0:f.sw[1]>f.sw[0]?1:-1):g.res;
  const res=sr<0?'d':sr===0?'w':'l',pay={w:300,d:150,l:100}[res];S.pt=(S.pt||0)+pay;
  // 대전 경기: 작전 카드 1장 소모, 서포트 남은 경기 1 감소
  const ts=S.team.tsel;if(ts&&S.tq[ts]>0){S.tq[ts]--;if(!S.tq[ts])S.team.tsel=null}
  S.team.sup=(S.team.sup||[]).map(x=>({...x,left:x.left-1})).filter(x=>x.left>0);
  for(const c of regCards(S.team))S.gp[c.id]=(S.gp[c.id]||0)+1;
  try{await F.addDoc(F.collection(F.db,'leagues',f.lid,'games'),{by:ON.user.uid,a:ON.user.uid,h:f.h,an:S.team.name+' ('+myName()+')',hn:f.hn,sc:f.rs||g.sc,res:sr,sw:f.sw||null,at:F.serverTimestamp()});
    S.toast=`친선전 시리즈 ${res==='w'?'승리':res==='l'?'패배':'무승부'} ${f.sw?f.sw[0]+':'+f.sw[1]:g.sc[0]+':'+g.sc[1]}${f.gl?' ('+f.gl.map(x=>x.sc.join('-')).join(', ')+')':''} · ${pay} 코인 · 리그 기록 반영`;await loadLeague()}
  catch(e){S.toast='결과 저장 실패: '+(e.code||e.message)}
  G=null;save();location.hash='online';render()}
function oTable(){const st={};const L=ON.leagues.find(l=>l.id===ON.cur);for(const u of L.members)st[u]={u,w:0,l:0,d:0,rs:0,ra:0};
  for(const g of ON.games){for(const [s,u] of [[0,g.a],[1,g.h]]){const x=st[u];if(!x)continue;x.rs+=g.sc[s];x.ra+=g.sc[1-s];if(g.res<0)x.d++;else if(g.res===s)x.w++;else x.l++}}
  return Object.values(st).map(x=>({...x,pct:x.w+x.l?x.w/(x.w+x.l):0})).sort((a,b)=>b.pct-a.pct||b.w-a.w)}
// SJ 2026-11-28: 친구 리그도 주간·연도별 리그와 같은 구조(감독실·라인업·일정·기록실·리그 정보 탭)
function vOnline(){useMode('on');
  const F=fb(),me=ON.user&&ON.user.uid,L=F&&ON.user?ON.leagues.find(l=>l.id===ON.cur):null,T=[['ofc','감독실'],['lu','라인업'],['sc','일정'],['st','기록실'],['lg','리그 정보']];
  const o=T.find(t=>t[0]===S.lgTab_on)||T[0],tb=`<div class="lgtabs2" role="tablist">${T.map(([k,n])=>`<button role="tab" aria-selected="${k===o[0]}" class="${k===o[0]?'on':''}" data-a="lgtab" data-g="on" data-k="${k}">${n}</button>`).join('')}</div>`;
  const tbl=L?oTable():[],rk=tbl.findIndex(x=>x.u===me)+1,my=tbl.find(x=>x.u===me)||{},f3=v=>v.toFixed(3).replace(/^0/,'');
  const pill=!F?'미리보기':!ON.user?'로그인 필요':L?`${esc(L.name)} · ${rk||'-'}위 · ${my.w||0}승 ${my.l||0}패`:'참가 리그 없음';
  const head=`<section class="ofc"><div class="ofhead"><h2>친구 리그</h2><span class="pill">${pill}</span>${tb}</div>${ON.msg?`<div class="toast">${esc(ON.msg)}</div>`:''}</section>`;
  if(o[0]==='lu')return head+vLineup();
  const gate=!F?`<section class="band"><p>친구 리그는 배포본에서만 열림. 미리보기에서는 라인업만 편집 가능.</p>${preHTML()}</section>`
    :!ON.user?`<section class="band"><p>Google 로그인 후 친구와 리그를 만들고 서로의 라인업에 도전.</p><button class="big" data-a="o-login">Google로 로그인</button>${preHTML()}</section>`:'';
  const info=`<section class="band"><div class="tools"><h3 style="margin:0">계정</h3><span class="mini">${esc(myName())} · ${esc(ON.sync||'')}</span><button data-a="o-save">지금 클라우드 저장</button><button data-a="o-logout" class="ghost">로그아웃</button></div>${preHTML()}
   <div class="cols" style="margin-top:10px"><div><h3>리그 만들기</h3><div class="btns"><input id="oln" maxlength="20" placeholder="리그 이름" aria-label="리그 이름"><button data-a="o-create">만들기</button></div></div>
   <div><h3>코드로 참가</h3><div class="btns"><input id="olc" maxlength="6" placeholder="6자리 코드" aria-label="리그 코드"><button data-a="o-join">참가</button></div></div></div>
   ${ON.leagues.length?`<h3 style="margin-top:12px">참가 중인 리그</h3><div class="btns">${ON.leagues.map(l=>`<button data-a="o-sel" data-l="${esc(l.id)}" class="${l.id===ON.cur?'big':'ghost'}">${esc(l.name)}</button>`).join('')}</div>`:'<p class="mini">참가한 리그 없음</p>'}
   ${L?`<p class="mini" style="margin-top:10px">${esc(L.name)} · 참가 코드 <b>${esc(L.code)}</b> · ${L.members.length}명 · 도전한 쪽 원정 · 컨디션은 내 팀만 · 승 300 · 무 150 · 패 100 코인</p>`:''}</section>`;
  if(gate)return head+(o[0]==='lg'||o[0]==='ofc'?gate:`<section class="band"><p class="note">로그인 후 사용</p></section>`);
  if(o[0]==='lg')return head+info;
  const noL=`<section class="band"><p class="note">참가한 리그 없음 · <button class="ghost" data-a="lgtab" data-g="on" data-k="lg">리그 정보</button>에서 만들기·참가</p></section>`;
  if(!L)return head+noL;
  const tname2=u=>{const t=ON.teams[u];return esc(t?t.name+' ('+t.owner+')':(L.memberNames||{})[u]||'?')};
  const chal=u=>`<button data-a="o-play" data-u="${esc(u)}" title="5판 3선승 · 마지막 경기 하이라이트">하이라이트</button><button class="ghost" data-a="o-quick" data-u="${esc(u)}" title="5판 3선승 결과만">결과만</button>`;
  const games=n=>ON.games.slice(0,n).map(g=>`<div class="${g.a===me||g.h===me?'me':''}"><span>${esc(g.an)}</span><b>${g.sw?`${g.sw[0]} : ${g.sw[1]} <small>(시리즈)</small>`:`${g.sc[0]} : ${g.sc[1]}`}</b><span>${esc(g.hn)}</span></div>`).join('')||'<p class="note">아직 경기 없음</p>';
  const full=`<section class="band"><div class="tools"><h3 style="margin:0">순위 · 도전</h3><button class="ghost" data-a="o-ref">새로고침</button></div><div class="scroll"><table class="tbl"><thead><tr><th>순위</th><th class="l">구단</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>득점</th><th>실점</th><th class="l">등록 라인업</th><th></th></tr></thead><tbody>
   ${tbl.map((x,k)=>{const t=ON.teams[x.u];return `<tr class="${x.u===me?'me':''}"><td>${k+1}</td><td class="l">${tname2(x.u)}</td><td>${x.w}</td><td>${x.l}</td><td>${x.d}</td><td>${f3(x.pct)}</td><td>${x.rs}</td><td>${x.ra}</td><td class="l">${t?`평균 ${t.ovr} · 코스트 ${t.cost}${t.fx?' · '+esc(t.fx):''}`:'<span class="mini">미등록</span>'}</td><td>${t&&x.u!==me?`<div class="btns">${chal(x.u)}</div>`:''}</td></tr>`}).join('')}</tbody></table></div></section>`;
  if(o[0]==='sc')return head+full;
  if(o[0]==='st')return head+`<section class="band"><h3>최근 경기</h3><div class="res">${games(20)}</div></section>`+myTeamHTML(null,'on');
  const mt=ON.teams[me],opp=tbl.filter(x=>x.u!==me&&ON.teams[x.u]);
  return head+`<section class="ofc"><div class="ofg">
   <div class="ofp"><h3>내 팀</h3><table class="oft"><tr><td>순위</td><td><b>${rk||'-'}위</b> <small>${my.w||0}승 ${my.l||0}패${my.d?' '+my.d+'무':''}</small></td></tr><tr><td>등록 라인업</td><td>${mt?`평균 ${mt.ovr} · 코스트 ${mt.cost}`:'미등록'}</td></tr><tr><td>득실</td><td>${my.rs||0} / ${my.ra||0}</td></tr></table><div class="tools" style="margin-top:8px"><button class="playb" data-a="o-reg">내 라인업 등록/갱신</button></div></div>
   <div class="ofp"><h3>도전 상대 <small>5판 3선승</small></h3>${opp.length?`<table class="oft">${opp.slice(0,5).map(x=>`<tr><td>${tname2(x.u)} <small>${x.w}승 ${x.l}패</small></td><td><div class="btns">${chal(x.u)}</div></td></tr>`).join('')}</table>`:'<p class="note">라인업 등록한 상대 없음</p>'}</div>
   <div class="ofp"><h3>최근 경기</h3><div class="res">${games(5)}</div></div>
   <div class="ofp"><h3>순위</h3><table class="tbl ofst"><thead><tr><th></th><th class="l">구단</th><th>승</th><th>패</th><th>승률</th></tr></thead><tbody>${tbl.map((x,k)=>`<tr class="${x.u===me?'me':''}"><td>${k+1}</td><td class="l">${tname2(x.u)}</td><td>${x.w}</td><td>${x.l}</td><td>${f3(x.pct)}</td></tr>`).join('')}</tbody></table></div>
   <div class="ofp"><h3>리그 정보</h3><p style="margin:0">${esc(L.name)} · 참가 코드 <b>${esc(L.code)}</b> · ${L.members.length}명</p><p class="mini">도전한 쪽 원정 · 컨디션은 내 팀만 · 승 300 · 무 150 · 패 100 코인</p></div>
  </div></section>`}
