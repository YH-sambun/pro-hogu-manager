// ===== 친구 리그 (Firebase: Google 로그인 + Firestore) =====
// window.FB 는 Firebase 배포본의 module 스크립트가 채워 넣는다. 없으면 안내만 보여 준다.
const ON={user:null,leagues:[],cur:null,teams:{},games:[],msg:'',busy:false,sync:'',lastPush:0};
const fb=()=>window.FB;
const stripS=()=>{const o={...S};delete o.photos;delete o.photoTs;delete o.phPull;return o}; // 사진·사진 동기화 상태는 기기별(사진은 photos 하위 문서로 따로 연동)
let pushT=null;
function cloudPush(now){const F=fb();if(!F||!ON.user)return;clearTimeout(pushT);
  pushT=setTimeout(async()=>{try{S.uid=ON.user.uid;const j=JSON.stringify(stripS());await F.setDoc(F.doc(F.db,'users',ON.user.uid),{json:j,ts:S.ts||Date.now(),name:ON.user.displayName||''});try{await photoSync()}catch(e){ON.sync='사진 연동 실패: '+e.code}ON.sync=ON.sync&&ON.sync.startsWith('사진')?ON.sync:'클라우드 저장됨 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});if(view()==='online')render()}catch(e){ON.sync='클라우드 저장 실패: '+e.code}},now?0:2500)}
// 직접 올린 사진(S.photos) 기기 간 연동: users/{uid}/photos/{cardId} = {d: dataURL, ts}. 본문 문서(1MB 한도)와 분리.
// S.photoTs[id]=올린 시각, S.phPull=마지막으로 클라우드 사진을 받은 시각. ON.ph=클라우드에 있다고 아는 사진(id→dataURL)
ON.ph=ON.ph||null;
async function photoSync(){const F=fb();if(!F||!ON.user||!ON.ph||!F.deleteDoc)return;S.photos=S.photos||{};S.photoTs=S.photoTs||{};const col=['users',ON.user.uid,'photos'];
  for(const id in S.photos){if(ON.ph[id]===S.photos[id])continue;const d=S.photos[id];if(d.length>190000){ON.sync='사진이 커서 기기 연동에서 빠졌어요';continue}
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
async function cloudPull(){const F=fb(),u=ON.user;try{
  const d=await F.getDoc(F.doc(F.db,'users',u.uid));
  if(d.exists()){const c=d.data();if(S.uid!==u.uid||(c.ts||0)>(S.ts||0)){const o=JSON.parse(c.json);const ph=S.photos,pt=S.photoTs,pp=S.phPull;S=o;S.photos=ph;S.photoTs=pt;S.phPull=pp;S.uid=u.uid;for(const id in S.owned)if(!byId[id])delete S.owned[id];
      try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){};ON.sync='클라우드 저장 데이터를 불러왔어요';G=null;packOut=null}else cloudPush(true)}
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
async function oAct(a,b){const F=fb(),u=ON.user;ON.msg='';
  try{
  if(a==='o-login'){await F.signInWithPopup(F.auth,new F.GoogleAuthProvider());return}
  if(a==='o-logout'){await F.signOut(F.auth);return}
  if(a==='o-save'){cloudPush(true);return}
  if(a==='o-sel'||a==='o-ref'){if(b.dataset.l)ON.cur=b.dataset.l;await loadLeagues()}
  else if(a==='o-create'){const nm=($('#oln').value||'').trim().slice(0,20);if(!nm){ON.msg='리그 이름을 적어 주세요';return}
    let code=code6();for(let i=0;i<5&&(await F.getDoc(F.doc(F.db,'leagues',code))).exists();i++)code=code6();
    await F.setDoc(F.doc(F.db,'leagues',code),{name:nm,code,owner:u.uid,members:[u.uid],memberNames:{[u.uid]:S.team.name+' ('+myName()+')'},created:F.serverTimestamp()});
    ON.cur=code;await loadLeagues();ON.msg=`리그를 만들었어요. 친구에게 코드 ${code} 를 알려 주세요.`}
  else if(a==='o-join'){const code=($('#olc').value||'').trim().toUpperCase();const ref=F.doc(F.db,'leagues',code),d=await F.getDoc(ref);
    if(!d.exists()){ON.msg='그 코드의 리그가 없어요';return}
    if(!d.data().members.includes(u.uid))await F.updateDoc(ref,{members:F.arrayUnion(u.uid),['memberNames.'+u.uid]:S.team.name+' ('+myName()+')'});
    ON.cur=code;await loadLeagues();ON.msg=`${d.data().name} 리그에 들어왔어요. 라인업을 등록하면 친구들이 도전할 수 있어요.`}
  else if(a==='o-reg'){const e=validate();if(e.length){ON.msg='라인업 오류: '+e[0];return}
    const T=clean(S.team),ids=new Set(regCards(T).map(c=>c.id)),blocks=S.blocks.filter(x=>x.on&&ids.has(x.on));
    await F.setDoc(F.doc(F.db,'leagues',ON.cur,'teams',u.uid),{name:S.team.name,owner:myName(),json:JSON.stringify({name:S.team.name,lineup:T.lineup,bench:T.bench,rot:T.rot,pen:T.pen,blocks,abSt:S.abSt||{},mgr:S.team.mgr||'',tsel:(S.tq||{})[S.team.tsel]>0?S.team.tsel:null,sup:(S.team.sup||[]).filter(x=>x.left>0)}),ovr:teamOvr(T),cost:regCards(T).reduce((s,c)=>s+c.cost,0),fx:teamColor(regCards(T)).fx.map(f=>f.n).join(', '),updated:F.serverTimestamp()});
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
    S.toast=`친선전 ${res==='w'?'승리':res==='l'?'패배':'무승부'} ${g.sc[0]}:${g.sc[1]} · ${pay} 코인 · 리그 기록에 반영됐어요`;await loadLeague()}
  catch(e){S.toast='결과 저장 실패: '+(e.code||e.message)}
  G=null;save();location.hash='online';render()}
function oTable(){const st={};const L=ON.leagues.find(l=>l.id===ON.cur);for(const u of L.members)st[u]={u,w:0,l:0,d:0,rs:0,ra:0};
  for(const g of ON.games){for(const [s,u] of [[0,g.a],[1,g.h]]){const x=st[u];if(!x)continue;x.rs+=g.sc[s];x.ra+=g.sc[1-s];if(g.res<0)x.d++;else if(g.res===s)x.w++;else x.l++}}
  return Object.values(st).map(x=>({...x,pct:x.w+x.l?x.w/(x.w+x.l):0})).sort((a,b)=>b.pct-a.pct||b.w-a.w)}
function vOnline(){
  const F=fb();
  if(!F)return `<section class="hero"><h1>친구 리그</h1><p>친구 리그는 Firebase에 올린 배포본에서만 열려요. 이 미리보기에서는 혼자 시즌만 할 수 있어요.</p></section>`;
  if(!ON.user)return `<section class="hero"><h1>친구 리그</h1><p>Google 계정으로 로그인하면 구단이 클라우드에 저장되고, 친구와 리그를 만들어 서로의 라인업에 도전할 수 있어요.</p><button class="big" data-a="o-login">Google로 로그인</button>${ON.msg?`<p class="warn">${esc(ON.msg)}</p>`:''}</section>`;
  const L=ON.leagues.find(l=>l.id===ON.cur),me=ON.user.uid;
  return `<section class="band"><div class="lhead"><h1>친구 리그</h1><div class="btns"><span class="mini">${esc(myName())} · ${esc(ON.sync||'')}</span><button data-a="o-save">지금 클라우드 저장</button><button data-a="o-logout" class="ghost">로그아웃</button></div></div>
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
