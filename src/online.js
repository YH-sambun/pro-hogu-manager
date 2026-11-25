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
function cloudPush(now){const F=fb();if(!F||!ON.user)return;clearTimeout(pushT);
  pushT=setTimeout(async()=>{try{const uid=ON.user.uid,ref=(...p)=>F.doc(F.db,'users',uid,...p);S.uid=uid;const P=packSave(),L=ON.last||{};let n=0;
    if(F.writeBatch){try{const b=F.writeBatch(F.db);
      if(L.os!==P.os){b.set(ref('save','owned'),{c:P.owned});n++}
      if(L.team!==P.team){b.set(ref('save','team'),{j:P.team});n++}
      if(L.rest!==P.rest){b.set(ref('save','rest'),{j:P.rest});n++}
      b.set(ref(),{v:2,ts:S.ts||Date.now(),name:ON.user.displayName||'',cards:Object.keys(P.owned).length,...P.top});await b.commit();
      ON.last={os:P.os,team:P.team,rest:P.rest};S.cl=canon(P.top);n=-1}
     catch(e){if(e.code!=='permission-denied')throw e;ON.v1=1}} // 규칙을 아직 안 바꿨으면 예전 형식으로
    if(n!==-1)await F.setDoc(ref(),{json:JSON.stringify(stripS()),ts:S.ts||Date.now(),name:ON.user.displayName||''});
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
async function cloudPull(){const F=fb(),u=ON.user,ref=(...p)=>F.doc(F.db,'users',u.uid,...p);try{
  const d=await F.getDoc(ref());
  if(d.exists()){const c=d.data(),newer=S.uid!==u.uid||(c.ts||0)>(S.ts||0);
    if(c.v===2&&newer){const [o,t,r]=await Promise.all([F.getDoc(ref('save','owned')),F.getDoc(ref('save','team')),F.getDoc(ref('save','rest'))]);
      const x=r.exists()?JSON.parse(r.data().j):{};x.team=t.exists()?JSON.parse(t.data().j):S.team;x.owned=o.exists()?(o.data().c||{}):{};Object.assign(x,topOf(c));x.ts=c.ts||0;
      adoptCloud(x,u.uid);S.cl=canon(topOf(c));ON.last={os:canon(x.owned),team:r.exists()&&t.exists()?t.data().j:null,rest:r.exists()?r.data().j:null}}
    else if(c.v!==2&&c.json&&newer){adoptCloud(JSON.parse(c.json),u.uid);ON.last=null;cloudPush(true)} // 예전 형식 → 새 형식으로 다시 저장
    else{ // 이 기기 저장이 최신: 콘솔에서 요약 필드(pt 등)를 고쳤으면 반영 후 저장
      if(c.v===2){const ct=canon(topOf(c));if(S.cl&&ct!==S.cl){Object.assign(S,topOf(c));S.cl=ct;ON.sync='콘솔에서 바꾼 값을 반영했어요'}}
      cloudPush(true)}}
  else{S.uid=u.uid;cloudPush(true)}}catch(e){ON.sync='클라우드 불러오기 실패: '+e.code}
  try{await photoPull();cloudPush(true)}catch(e){ON.sync='사진 불러오기 실패: '+e.code}}
async function loadLeagues(){const F=fb();try{const q=F.query(F.collection(F.db,'leagues'),F.where('members','array-contains',ON.user.uid));
  ON.leagues=(await F.getDocs(q)).docs.map(d=>({id:d.id,...d.data()}));if(ON.cur&&!ON.leagues.find(l=>l.id===ON.cur))ON.cur=null;if(!ON.cur&&ON.leagues[0])ON.cur=ON.leagues[0].id;if(ON.cur)await loadLeague()}catch(e){ON.msg='리그 목록 오류: '+e.code}}
async function loadLeague(){const F=fb(),lid=ON.cur;
  const ts=await F.getDocs(F.collection(F.db,'leagues',lid,'teams'));ON.teams={};ts.forEach(d=>{ON.teams[d.id]=d.data()});
  const gs=await F.getDocs(F.query(F.collection(F.db,'leagues',lid,'games'),F.orderBy('at','desc'),F.limit(200)));ON.games=gs.docs.map(d=>d.data())}
async function afterLogin(){if(!S||!ON.user||ON.pulled===ON.user.uid)return;ON.pulled=ON.user.uid;await cloudPull();await loadLeagues();render()}
function fbBoot(){const F=fb();if(!F)return;if(fbBoot.done){afterLogin();return}fbBoot.done=1;
  F.onAuthStateChanged(F.auth,async u=>{ON.user=u;ON.pulled=null;ON.ready=1;if(S)render();if(u)await afterLogin();else{ON.leagues=[];ON.cur=null;if(S)render()}})}
addEventListener('fb-ready',fbBoot);
const code6=()=>Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const myName=()=>(ON.user&&(ON.user.displayName||ON.user.email||'').split('@')[0])||'나';
// ===== 미리 받기(2026-11-25) =====
// 카드 데이터(cards.json, 버전별)와 기본 선수 사진을 브라우저 캐시(Cache API 'phm-img')에 미리 받아 둠. 이후 접속 때는 다시 내려받지 않음(sw.js가 캐시에서 응답).
// 직접 올린 사진(S.photos, data: URL)은 캐시와 무관하고 항상 기본 사진보다 우선이라 업데이트로 덮어쓰이지 않음
ON.pre=ON.pre||null;
const preURLs=()=>[...new Set(CARDS.map(c=>c.img&&(typeof c.img==='string'?c.img:c.img.f)).filter(Boolean))];
async function preload(){if(!('caches' in window)){ON.pre={err:'이 브라우저는 미리 받기를 지원하지 않아요'};return}
  const c=await caches.open('phm-img'),L=preURLs(),P=ON.pre={done:0,skip:0,total:L.length,fail:0,run:1};let i=0;const tick=()=>{if(view()==='online')render()};
  const one=async u=>{try{if(await c.match(u)){P.skip++;return}const cross=/^https?:/.test(u)&&!u.startsWith(location.origin);const r=await fetch(u,cross?{mode:'no-cors'}:{});if(r.ok||r.type==='opaque')await c.put(u,r);else P.fail++}catch(e){P.fail++}finally{P.done++;if(P.done%40===0)tick()}};
  await Promise.all(Array.from({length:6},async()=>{while(i<L.length)await one(L[i++])}));P.run=0;try{localStorage.setItem(KEY+'-pre',String(Date.now()))}catch(e){}tick()}
function preHTML(){const P=ON.pre,t=+(localStorage.getItem(KEY+'-pre')||0);
  return `<div class="btns" style="margin-top:8px"><button class="ghost" data-a="o-pre" ${P&&P.run?'disabled':''}>사진 미리 받기</button><span class="mini">${P&&P.err?esc(P.err):P&&P.run?`받는 중 ${P.done}/${P.total}`:P?`완료 · 새로 ${P.done-P.skip-P.fail}장, 이미 있음 ${P.skip}장${P.fail?`, 실패 ${P.fail}장`:''}`:t?`마지막으로 받은 때 ${new Date(t).toLocaleDateString('ko-KR')}`:'기본 선수 사진을 한 번에 받아 두면 이후 접속 때는 다시 받지 않아요(와이파이에서 권장)'}</span></div>`}
async function oAct(a,b){const F=fb(),u=ON.user;ON.msg='';
  try{
  if(a==='o-login'){await F.signInWithPopup(F.auth,new F.GoogleAuthProvider());return}
  if(a==='o-logout'){await F.signOut(F.auth);return}
  if(a==='o-save'){cloudPush(true);return}
  if(a==='o-pre'){preload();return}
  if(a==='o-sel'||a==='o-ref'){if(b.dataset.l)ON.cur=b.dataset.l;await loadLeagues()}
  else if(a==='o-create'){const nm=($('#oln').value||'').trim().slice(0,20);if(!nm){ON.msg='리그 이름 필요';return}
    let code=code6();for(let i=0;i<5&&(await F.getDoc(F.doc(F.db,'leagues',code))).exists();i++)code=code6();
    await F.setDoc(F.doc(F.db,'leagues',code),{name:nm,code,owner:u.uid,members:[u.uid],memberNames:{[u.uid]:S.team.name+' ('+myName()+')'},created:F.serverTimestamp()});
    ON.cur=code;await loadLeagues();ON.msg=`리그를 만들었어요. 친구에게 코드 ${code} 를 알려 주세요.`}
  else if(a==='o-join'){const code=($('#olc').value||'').trim().toUpperCase();const ref=F.doc(F.db,'leagues',code),d=await F.getDoc(ref);
    if(!d.exists()){ON.msg='없는 리그 코드';return}
    if(!d.data().members.includes(u.uid))await F.updateDoc(ref,{members:F.arrayUnion(u.uid),['memberNames.'+u.uid]:S.team.name+' ('+myName()+')'});
    ON.cur=code;await loadLeagues();ON.msg=`${d.data().name} 리그에 들어왔어요. 라인업을 등록하면 친구들이 도전할 수 있어요.`}
  else if(a==='o-reg'){const e=validate();if(e.length){ON.msg='라인업 오류: '+e[0];return}
    const T=clean(S.team),ids=new Set(regCards(T).map(c=>c.id)),blocks=S.blocks.filter(x=>x.on&&ids.has(x.on));
    await F.setDoc(F.doc(F.db,'leagues',ON.cur,'teams',u.uid),{name:S.team.name,owner:myName(),json:JSON.stringify({name:S.team.name,lineup:T.lineup,bench:T.bench,rot:T.rot,pen:T.pen,blocks,abSt:S.abSt||{},mgr:S.team.mgr||'',fxsel:S.team.fxsel||[],eq:eqMap(),tsel:(S.tq||{})[S.team.tsel]>0?S.team.tsel:null,sup:(S.team.sup||[]).filter(x=>x.left>0)}),ovr:teamOvr(T),cost:regCards(T).reduce((s,c)=>s+c.cost,0),fx:teamColor(regCards(T)).fx.map(f=>f.n).join(', '),updated:F.serverTimestamp()});
    await loadLeague();ON.msg='현재 라인업을 리그에 등록했어요.'}
  else if(a==='o-play'||a==='o-quick'){const h=b.dataset.u,t=ON.teams[h];if(!t)return;const e=validate();if(e.length){ON.msg='라인업 오류: '+e[0];return}
    const T=JSON.parse(t.json);T.color='#3d7fd1';T.rotIdx=Math.floor(Math.random()*5);
    const prev=ON.games.filter(x=>(x.a===ON.user.uid&&x.h===h)||(x.h===ON.user.uid&&x.a===h)).length;let st=0;for(const x of ON.games.filter(x=>x.a===ON.user.uid||x.h===ON.user.uid)){const me=x.a===ON.user.uid?0:1;if(x.res===1-me){if(st<=0)st--;else break}else break}
    const U=userT('on');U.ctx={rematch:prev>0,streak:st};G=mkGame(simTeam(U,S.cond),simTeam(T));G.me=0;G.ctrl=null;G.pair=[0,1];G.friendly={lid:ON.cur,h,hn:t.name+' ('+t.owner+')'};
    simAll(G);if(a==='o-quick'){await oFinish();return}G.hl=1;location.hash='game'}
  }catch(e){ON.msg='오류: '+(e.code||e.message)}finally{render()}}
async function oFinish(){const F=fb(),g=G,f=g.friendly;
  const res=g.res<0?'d':g.res===0?'w':'l',pay={w:300,d:150,l:100}[res];S.pt=(S.pt||0)+pay;S.team.rotIdx++;
  // 대전 경기: 작전 카드 1장 소모, 서포트 남은 경기 1 감소
  const ts=S.team.tsel;if(ts&&S.tq[ts]>0){S.tq[ts]--;if(!S.tq[ts])S.team.tsel=null}
  S.team.sup=(S.team.sup||[]).map(x=>({...x,left:x.left-1})).filter(x=>x.left>0);
  for(const c of regCards(S.team))S.gp[c.id]=(S.gp[c.id]||0)+1;
  try{await F.addDoc(F.collection(F.db,'leagues',f.lid,'games'),{by:ON.user.uid,a:ON.user.uid,h:f.h,an:S.team.name+' ('+myName()+')',hn:f.hn,sc:g.sc,res:g.res,at:F.serverTimestamp()});
    S.toast=`친선전 ${res==='w'?'승리':res==='l'?'패배':'무승부'} ${g.sc[0]}:${g.sc[1]} · ${pay} 코인 · 리그 기록 반영`;await loadLeague()}
  catch(e){S.toast='결과 저장 실패: '+(e.code||e.message)}
  G=null;save();location.hash='online';render()}
function oTable(){const st={};const L=ON.leagues.find(l=>l.id===ON.cur);for(const u of L.members)st[u]={u,w:0,l:0,d:0,rs:0,ra:0};
  for(const g of ON.games){for(const [s,u] of [[0,g.a],[1,g.h]]){const x=st[u];if(!x)continue;x.rs+=g.sc[s];x.ra+=g.sc[1-s];if(g.res<0)x.d++;else if(g.res===s)x.w++;else x.l++}}
  return Object.values(st).map(x=>({...x,pct:x.w+x.l?x.w/(x.w+x.l):0})).sort((a,b)=>b.pct-a.pct||b.w-a.w)}
function vOnline(){
  const F=fb();
  if(!F)return `<section class="hero"><h1>친구 리그</h1><p>친구 리그는 Firebase에 올린 배포본에서만 열려요. 이 미리보기에서는 혼자 시즌만 할 수 있어요.</p>${preHTML()}</section>`;
  if(!ON.user)return `<section class="hero"><h1>친구 리그</h1><p>Google 계정으로 로그인하면 구단이 클라우드에 저장되고, 친구와 리그를 만들어 서로의 라인업에 도전할 수 있어요.</p><button class="big" data-a="o-login">Google로 로그인</button>${ON.msg?`<p class="warn">${esc(ON.msg)}</p>`:''}${preHTML()}</section>`;
  const L=ON.leagues.find(l=>l.id===ON.cur),me=ON.user.uid;
  return `<section class="band"><div class="lhead"><h1>친구 리그</h1><div class="btns"><span class="mini">${esc(myName())} · ${esc(ON.sync||'')}</span><button data-a="o-save">지금 클라우드 저장</button><button data-a="o-logout" class="ghost">로그아웃</button></div></div>${preHTML()}
   ${ON.msg?`<div class="toast">${esc(ON.msg)}</div>`:''}
   <div class="cols"><div><h3>리그 만들기</h3><div class="btns"><input id="oln" maxlength="20" placeholder="리그 이름" aria-label="리그 이름"><button data-a="o-create">만들기</button></div></div>
   <div><h3>코드로 참가</h3><div class="btns"><input id="olc" maxlength="6" placeholder="6자리 코드" aria-label="리그 코드"><button data-a="o-join">참가</button></div></div></div>
   ${ON.leagues.length?`<div class="btns" style="margin-top:12px">${ON.leagues.map(l=>`<button data-a="o-sel" data-l="${esc(l.id)}" class="${l.id===ON.cur?'big':''}">${esc(l.name)}</button>`).join('')}</div>`:'<p class="mini">아직 참가한 리그가 없어요.</p>'}</section>
  ${L?`<section class="band"><div class="lhead"><h2>${esc(L.name)} <small>참가 코드 <b>${esc(L.code)}</b> · ${L.members.length}명</small></h2><div class="btns"><button data-a="o-ref">새로고침</button><button class="big" data-a="o-reg">내 라인업 등록/갱신</button></div></div>
   <p class="mini">상대 팀은 친구가 마지막으로 등록한 라인업으로 움직여요. 도전한 쪽이 원정, 컨디션은 내 팀만 반영돼요. 승리 300 · 무 150 · 패 100 코인.</p>
   <div class="scroll"><table class="tbl"><thead><tr><th>순위</th><th class="l">구단</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>득점</th><th>실점</th><th class="l">등록 라인업</th><th></th></tr></thead><tbody>
   ${oTable().map((x,k)=>{const t=ON.teams[x.u];return `<tr class="${x.u===me?'me':''}"><td>${k+1}</td><td class="l">${esc(t?t.name+' ('+t.owner+')':(L.memberNames||{})[x.u]||'?')}</td><td>${x.w}</td><td>${x.l}</td><td>${x.d}</td><td>${x.pct.toFixed(3).replace(/^0/,'')}</td><td>${x.rs}</td><td>${x.ra}</td>
    <td class="l">${t?`평균 ${t.ovr} · 코스트 ${t.cost}${t.fx?' · '+esc(t.fx):''}`:'<span class="mini">미등록</span>'}</td>
    <td>${t&&x.u!==me?`<div class="btns"><button data-a="o-play" data-u="${esc(x.u)}">하이라이트</button><button data-a="o-quick" data-u="${esc(x.u)}">결과만</button></div>`:''}</td></tr>`}).join('')}</tbody></table></div></section>
  <section class="band"><h3>최근 경기</h3><div class="res">${ON.games.slice(0,20).map(g=>`<div class="${g.a===me||g.h===me?'me':''}"><span>${esc(g.an)}</span><b>${g.sc[0]} : ${g.sc[1]}</b><span>${esc(g.hn)}</span></div>`).join('')||'<p class="mini">아직 경기가 없어요.</p>'}</div></section>`:''}`}
