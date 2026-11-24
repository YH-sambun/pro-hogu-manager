{
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='diamond-chronicle-v2';
let ltab='B',S=null,G=null,packOut=null,flt={type:'',tier:'',line:'',year:'',q:'',sort:'ovr',all:false,lim:120},modal=null,selB=null;
const save=()=>{S.ts=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(typeof cloudPush==='function')cloudPush()};
const own=t=>Object.keys(S.owned).map(id=>byId[id]).filter(c=>c&&(!t||c.type===t));
const yy=y=>"'"+String(y).slice(2);
const rollCond=()=>{S.cond={};for(const id in S.owned){const u=Math.random();S.cond[id]=u<.08?1:u<.25?2:u<.6?3:u<.88?4:5}};
const gainBlock=(t,g)=>{const b=mkBlock(t||pick(['B','P']),g);S.blocks.push(b);return b};
function fresh(){
  S={locks:[],tq:{b1:1,p1:1,c1:1},sq:{s1:1,s3:1},coins:3000,owned:{},team:{name:'내 구단',lineup:[],bench:[],rot:[],pen:[],rotIdx:0},cond:{},gp:{},blocks:[],season:null,last:[]};
  const used=new Set(),add=c=>{if(!c)return;S.owned[c.id]=1;used.add(c.pk)};
  const cheap=f=>{const L=CARDS.filter(x=>f(x)&&x.cost<=2&&!used.has(x.pk)&&x.ovr>=58);return L.length?pick(L):pick(CARDS.filter(x=>f(x)&&!used.has(x.pk)&&x.cost<=4))};
  for(const p of ['C','1B','2B','3B','SS','LF','CF','RF'])add(cheap(x=>x.type==='B'&&x.ps&&x.ps[p]!=null));
  for(let i=0;i<6;i++)add(cheap(x=>x.type==='B'));for(let i=0;i<5;i++)add(cheap(x=>x.pos==='SP'));for(let i=0;i<6;i++)add(cheap(x=>x.pos==='RP'));
  for(let i=0;i<3;i++)gainBlock(i<2?'B':'P');
  autoSet();rollCond();newSeason()}
function autoSet(){Object.assign(S.team,bestLineup(Object.keys(S.owned)))}
const clean=T=>({...T,rot:T.rot.filter(Boolean),pen:T.pen.filter(Boolean),bench:(T.bench||[]).filter(Boolean)});
const userT=()=>({...clean(S.team),color:'#e07a45',blocks:S.blocks,abSt:S.abSt||{}});
const starters=T=>{T=clean(T);return [...T.lineup.map(x=>x.id),...T.rot,...T.pen].filter(Boolean).map(id=>byId[id])};
const regCards=T=>{T=clean(T);return [...starters(T),...T.bench.map(id=>byId[id])]};
function validate(){
  const T=S.team,e=[],ps=T.lineup.map(x=>x.pos);
  if(T.lineup.length!==9||T.lineup.some(x=>!x.id))e.push('타순 9자리를 모두 채워 주세요');
  for(const p of POS)if(!ps.includes(p))e.push(`${PK[p]} 자리가 없습니다`);
  for(const x of T.lineup){const c=byId[x.id];if(c&&!canPlay(c,x.pos))e.push(`${c.name}은(는) ${PK[x.pos]}을(를) 볼 수 없어요 (가능: ${c.ps?Object.keys(c.ps).map(k=>PK[k]).join('·')+'·':''}지명타자)`)}
  if(T.rot.filter(Boolean).length<5)e.push('선발 5명을 채워 주세요');
  if(!T.pen.filter(Boolean).length)e.push('불펜에 최소 1명이 필요합니다');
  const nm={};for(const c of regCards(T))nm[pkt(c)]=(nm[pkt(c)]||0)+1;for(const k in nm)if(nm[k]>1)e.push(`${k.split('|')[0]} 선수가 중복 등록됐습니다`);
  const cost=regCards(T).reduce((s,c)=>s+c.cost,0);if(cost>COST_CAP)e.push(`1군 코스트 ${cost} / 상한 ${COST_CAP} 초과`);
  return e}
// ===== 카드 =====
const SIL={B:'<path d="M50 30a11 11 0 1 1 0 .1zM36 26h28l-3 6H39z"/><path d="M34 52c4-8 28-8 32 0l6 48H28z"/><path d="M64 46l26-34 4 3-26 35z"/>',
  P:'<path d="M48 32a11 11 0 1 1 0 .1zM34 28h28l-3 6H37z"/><path d="M32 54c4-8 28-8 32 0l4 46H28z"/><path d="M62 52l18-20 8-14 5 3-8 15-19 22z"/>'};
const photo=c=>(S&&S.photos&&S.photos[c.id])||(c.img&&c.img.f)||null;
function effRaw(c){const r={...c.r},sk=S&&S.owned[c.id]?skillOf(c.id,S.blocks):{};for(const k in sk)r[k]=Math.min(120,r[k]+sk[k]);return {r,sk}}
function cardHTML(c,o={}){
  const {r,sk}=effRaw(c),col=LINE_COLOR[c.line]||'#444';
  const rows=c.type==='B'?BK.map(k=>[SKN[k],r[k],sk[k]]):PKEY.map(k=>[SKN[k],r[k],sk[k]]);
  const cd=o.cond?COND[o.cond]:null,posTxt=c.type==='B'?(c.ps?Object.keys(c.ps).map(p=>PS[p]).join('·'):PK[c.pos]):PK[c.pos];
  return `<div class="card t-${c.tier}${o.dim?' dim':''}" data-card="${esc(c.id)}" style="--tc:${col}" tabindex="0">
  <div class="ph">${photo(c)?`<img src="${esc(photo(c))}" alt="" loading="lazy">`:`<svg viewBox="0 0 100 100" aria-hidden="true">${SIL[c.type]}</svg>`}<b class="yr">${yy(c.year)}</b><span class="cs">${c.cost}</span>
  ${c.mvp?'<i class="mv">MVP</i>':''}${cd?`<i class="cd c${o.cond}">${cd.n}</i>`:''}<span class="tm">${esc(c.team)} · ${esc(posTxt)}</span></div>
  <div class="nm"><strong>${esc(c.name)}</strong><span>${c.ovr}</span></div>
  <div class="st">${rows.map(([k,v,b])=>`<div><em>${k}</em><i style="width:${Math.round(Math.min(100,v/1.2))}%"></i><b>${Math.round(v)}${b?`<sup>+${b}</sup>`:''}</b></div>`).join('')}</div>
  <div class="ft"><span>${TIER[c.tier]}</span><span class="stars">${'★'.repeat(c.cost)}<u>${'★'.repeat(10-c.cost)}</u></span></div>
  ${o.badge?`<p class="bd">${o.badge}</p>`:''}</div>`}
const statLine=c=>c.type==='B'?`타율 ${c.s[0].toFixed(3).replace(/^0/,'')} · ${c.s[1]}홈런 · ${c.s[2]}타점 · ${c.s[3]}도루 · ${c.s[4]}경기`:`평균자책 ${c.s[0].toFixed(2)} · ${c.s[1]}승 ${c.s[2]}패 · ${c.s[3]}세이브 · ${c.s[4]}홀드 · ${c.s[5]}탈삼진 · ${c.s[6]}이닝`;
const kmh=c=>c.kmh;
// ===== 카드 상세 (뒷면 스킬 격자) =====
function vModal(){if(!modal)return '';const c=byId[modal],owned=S.owned[c.id],gp=S.gp[c.id]||0,open=openCount(c,gp);
  const inv=S.blocks.filter(b=>!b.on&&b.t===c.type),placed=S.blocks.filter(b=>b.on===c.id),sb=selB&&S.blocks.find(b=>b.u===selB);
  const cellOwner={};for(const b of placed)for(const [r,q] of cellsOf(b))cellOwner[(r+b.at[0])+','+(q+b.at[1])]=b;
  const grid=[];for(let r=0;r<GRID;r++)for(let q=0;q<GRID;q++){const b=cellOwner[r+','+q],op=isOpen(c,gp,r,q);
    grid.push(`<button class="gc ${op?'op':''} ${b?'g'+b.g:''}" data-a="cell" data-r="${r}" data-q="${q}" ${!owned||(!op&&!b)?'disabled':''} aria-label="${r+1}행 ${q+1}열">${b?esc(b.g):''}</button>`)}
  const bl=b=>{const cs=cellsOf(b),h=Math.max(...cs.map(x=>x[0]))+1,w=Math.max(...cs.map(x=>x[1]))+1;
    return `<button class="blk ${selB===b.u?'on':''}" data-a="pickb" data-u="${b.u}"><span class="shape" style="grid-template-columns:repeat(${w},12px)">${Array.from({length:h*w},(_,i)=>`<i class="${cs.some(x=>x[0]===Math.floor(i/w)&&x[1]===i%w)?'g'+b.g:''}"></i>`).join('')}</span><b>${b.g}</b><small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')}</small></button>`};
  return `<div class="ov" data-a="close"><div class="mdl" role="dialog" aria-label="${esc(c.name)} 카드 상세">
   <button class="x" data-a="close" aria-label="닫기">닫기</button>
   <div class="mcols"><div>${cardHTML(c,{cond:S.cond[c.id]})}</div><div>
    <h2>${esc(c.name)} <small>${c.year} ${esc(c.team)}</small></h2><p class="mini">${esc(statLine(c))}</p>
    <p class="cred">${S.photos&&S.photos[c.id]?'사진: 직접 올린 이미지 (이 브라우저에만 저장)':c.img?`사진: ${esc(c.img.a)} · ${esc(c.img.l)} · <a href="${esc(c.img.u)}" target="_blank" rel="noopener">위키미디어 공용</a>`:'사진 없음'}
    <label class="up">내 이미지로 바꾸기 <input type="file" accept="image/*" data-up="${esc(c.id)}"></label>${S.photos&&S.photos[c.id]?` <button data-a="rmphoto">원래대로</button>`:''}</p>
    ${c.type==='B'?`<p class="chips">${Object.entries(c.ps||{}).map(([p,v])=>`<span>${PK[p]} <b>${GRADE(v)}</b></span>`).join('')||'<span>지명타자</span>'}</p>`:
      `<p class="chips"><span>최고구속 <b>${kmh(c)}km/h</b></span>${Object.entries(c.pt||{}).map(([k,g])=>`<span>${esc(k)} <b>${g}</b></span>`).join('')}</p>`}
    <h3>스킬 블록 <small>16칸 모두 열림</small></h3>
    ${owned?'':'<p class="warn">보유한 카드만 블록을 끼울 수 있어요.</p>'}
    <div class="grid4">${grid.join('')}</div>
    ${owned?`<p class="mini">${sb?`<b>${sb.g}급 블록</b>을 놓을 칸(왼쪽 위 기준)을 누르세요. <button data-a="rot">회전</button>`:'아래에서 블록을 고르고 칸을 누르면 끼워져요. 끼운 블록을 누르면 빠져요.'}</p>
    <div class="inv">${inv.map(bl).join('')||'<p class="mini">이 유형(타자/투수)용 블록이 없어요. 카드팩에서 블록팩을 사거나 경기에서 이기면 얻어요.</p>'}</div>`:''}
   </div></div></div></div>`}
// ===== 화면 =====
const view=()=>{const h=location.hash.slice(1);return ['season','years','lineup','packs','cards','synth','game','online'].includes(h)?h:'season'};
function head(){const s=S.season;return `<header class="top"><div class="logo">프로호구 매니저<small>KBO 1982–2026 선수카드 매니저 · ${CARDS.length.toLocaleString()}장</small></div>
 <div class="wallet"><span>${S.coins.toLocaleString()} 코인</span><span>블록 ${S.blocks.filter(b=>!b.on).length}</span><span>${s.tier?tierName(s.tier):'시즌 '+s.n} · ${Math.min(s.round+1,s.sched.length)}/${s.sched.length}</span></div>
 <nav>${[['season','주간 리그'],['years','연도별 리그'],['lineup','라인업'],['packs','카드팩'],['cards','컬렉션'],['synth','합성'],['game','경기장'],['online','친구 리그']].map(([k,n])=>`<a href="#${k}" class="${view()===k?'on':''}">${n}</a>`).join('')}</nav></header>${S.toast?`<div class="toast">${esc(S.toast)}</div>`:''}`}
function fxHTML(T){const tc=teamColor(regCards(T));return tc.fx.length?`<span class="fxchips">${tc.fx.map(f=>`<span class="fxc fx-${f.g}" title="${FX_FAM[f.fam]} 계열"><i>${f.g}</i>${esc(f.name)} · ${esc(f.d)} <b>야수 +${f.b} / 투수 +${f.p}</b></span>`).join('')}</span>`:`덱 효과 없음 · 가장 많은 연도·구단 ${esc(tc.top.year?tc.top.year[0]:'-')} ${tc.top.year?tc.top.year[1]:0}명 (12명부터)`}
const lab=c=>`${c.name} ${yy(c.year)} ${c.team} ${c.type==='B'?(c.ps?Object.keys(c.ps).join('/'):'DH'):c.pos} · ${c.ovr} · ${c.cost}코`;
function opt(list,cur){return `<option value="">—</option>`+list.map(c=>`<option value="${esc(c.id)}" ${c.id===cur?'selected':''}>${esc(lab(c))}</option>`).join('')}
const MTN=[['power','타격 방침','단타','장타'],['steal','도루','소극','적극'],['bunt','번트','소극','적극'],['ph','대타 기용','소극','적극'],['hook','선발 교체','느리게','빠르게'],['relief','중계·마무리','느리게','빠르게'],['ibb','고의4구','적게','자주'],['shift','시프트·전진수비','적게','자주']];
const MSTY={small:'스몰볼',big:'빅볼',speed:'발야구',trust:'믿음의 야구',pen:'불펜 야구',data:'데이터 야구'},MGRADE={L:'레전드',S:'스타',N:'노멀'};
function vTac(){const T=S.team,m=MGR_BY[T.mgr];
  return `<div class="cols"><div><h3>감독 선택 <small>작전은 감독 경향대로 나와요 · KBO 역대 감독 별명, 성향은 게임용 해석</small></h3>
   <div class="btns" style="flex-wrap:wrap">${MANAGERS.map(x=>`<button data-a="mgr" data-m="${x.id}" class="${T.mgr===x.id?'big':''}" title="${esc(x.sn+': '+x.se)}">${esc(x.n)} <small>${MSTY[x.st]}·${MGRADE[x.g]}</small></button>`).join('')}</div>
   <h3>다음 경기 작전 카드 <small>1장 · 리그 경기(주간·연도·친구)마다 소모, 단판 도전은 소모 없음</small></h3>
   <div class="btns" style="flex-wrap:wrap">${TCARDS.filter(x=>(S.tq||{})[x[0]]>0).map(x=>{const on=T.tsel===x[0],rel=[x[7].length?'무효화→'+x[7].map(i=>TC_BY[i][1]).join(','):'',x[8].length?'상쇄↔'+x[8].map(i=>TC_BY[i][1]).join(','):'',TCARDS.filter(q=>q[7].includes(x[0])).map(q=>q[1]+'에 무효화됨').join(',')].filter(Boolean).join(' · ');
     return `<button data-a="tsel" data-c="${x[0]}" class="${on?'big':''}" aria-pressed="${on}" title="${esc(x[4]+' → '+x[5]+(rel?' | '+rel:''))}">${esc(x[1])} <small>${x[2]}·${x[3]} ×${S.tq[x[0]]}</small></button>`}).join('')||'<p class="mini">작전 카드가 없어요. 카드팩에서 작전 카드 팩을 사세요.</p>'}</div>
   <h3>서포트 카드 <small>선수 ${(T.sup||[]).filter(x=>x.left>0).length}/${SUP_MAX}명 · 리그 경기마다 남은 경기 1 감소 · 단판 도전에는 적용 안 됨</small></h3>
   ${(T.sup||[]).filter(x=>x.left>0).map((x,i)=>`<p class="mini"><b>${esc(SUP_BY[x.id][1])}</b> → ${esc(byId[x.cid]?byId[x.cid].name:'?')} · ${esc(SUP_BY[x.id][3])} · ${x.left}경기 남음 <button data-a="supx" data-i="${i}">해제(카드 돌려받기)</button></p>`).join('')}
   ${(T.sup||[]).filter(x=>x.left>0).length<SUP_MAX?`<div class="btns"><select id="sups" aria-label="서포트 카드">${SUPS.filter(x=>(S.sq||{})[x[0]]>0).map(x=>`<option value="${x[0]}">${esc(x[1])} (${esc(x[3])}, ${x[4]}경기) ×${S.sq[x[0]]}</option>`).join('')}</select>
    <select id="supc" aria-label="받을 선수">${regCards(T).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} ${yy(c.year)} ${c.type==='B'?'타':'투'}</option>`).join('')}</select><button data-a="supgo">주기</button></div>`:''}
   <h3>배터리 궁합 <small>주전 포수 기준</small></h3>${batteryHTML()}</div>
   <div>${m?`<h3>${esc(m.n)} 감독 <small>${MSTY[m.st]} · ${MGRADE[m.g]}</small></h3><p><b>[${esc(m.sn)}]</b> ${esc(m.se)}</p>
   <table class="tbl"><tbody>${MTN.map(([k,n,l,r])=>`<tr><td class="l">${n}</td><td class="mini">${l}</td><td style="width:45%"><div class="bar"><i style="width:${m.t[k]*25}%"></i></div></td><td class="mini">${r}</td><td>${m.t[k]}</td></tr>`).join('')}</tbody></table>
   <p class="mini">모든 경기는 이 경향대로 감독이 작전을 내며 자동으로 진행돼요. '하이라이트 보기'는 득점·홈런·교체 장면을, '결과만 보기'는 점수만 보여 줘요.</p>`:'<h3>감독 없음</h3><p class="mini">감독을 고르지 않으면 모든 경향이 보통(2)이고 고유 능력이 없어요.</p>'}</div></div>`}
function batteryHTML(){const T=S.team,ci=T.lineup.find(x=>x.pos==='C'),cat=ci&&byId[ci.id];if(!cat)return '<p class="mini">포수가 없어요.</p>';
  const P=[...T.rot.map((id,i)=>['선발'+(i+1),id]),['마무리',T.pen[0]],['셋업',T.pen[1]],...[2,3,4,5].map(j=>['중계'+(j-1),T.pen[j]])].filter(x=>x[1]&&byId[x[1]]);
  return `<p class="mini">포수 ${esc(cat.name)} ${yy(cat.year)}. 70 이상 좋음(제구·구위 소폭 +), 40 미만 나쁨(소폭 -).</p><table class="tbl"><tbody>${P.map(([l,id])=>{const c=byId[id],b=battery(c,cat);
   return `<tr><td>${l}</td><td class="l">${esc(c.name)} ${yy(c.year)}</td><td><b style="color:${b.v>=70?'#7fd18b':b.v<40?'#e0705a':'inherit'}">${b.v}</b></td><td class="l mini">${b.why.join(' · ')||'연결고리 없음'}</td></tr>`}).join('')}</tbody></table>`}
function vLineup(){
  const T=S.team,bats=own('B').sort((a,b)=>b.ovr-a.ovr),ps=own('P').sort((a,b)=>b.ovr-a.ovr),e=validate(),cost=regCards(T).reduce((s,c)=>s+c.cost,0);
  const cd=id=>id&&S.cond[id]?`<i class="cdt c${S.cond[id]}">${COND[S.cond[id]].n}</i>`:'';
  const row=(lbl,k,i,cur,list)=>`<tr><td>${lbl}</td><td class="l"><div class="pc"><select data-k="${k}" data-i="${i}" aria-label="${lbl}">${opt(list,cur)}</select>${cd(cur)}</div></td></tr>`;
  return `<section class="band"><div class="lhead"><h1>라인업</h1><div class="btns"><button data-a="autoset">자동 편성</button></div></div>
  <div class="meter"><div><span>1군 코스트 (25명 전체)</span><b class="${cost>COST_CAP?'bad':''}">${cost} / ${COST_CAP}</b></div><div class="bar"><i style="width:${Math.min(100,cost/COST_CAP*100)}%" class="${cost>COST_CAP?'bad':''}"></i></div>
  <p class="mini">${fxHTML(T)}</p><p class="mini">연도 계열(단일연도 B 12명·A 20명·S 25명, 원년 82~87 묶음, 연도 듀얼 A), 구단 계열(단일구단 B 15명·A 25명, 라이벌 듀얼 B, 지역 B), 인연 계열(고교 동문 B 4명·A 6명, 대학 동문 B 5명). 계열마다 하나씩 겹쳐 적용돼요.</p></div>
  ${e.length?`<ul class="errs">${e.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  <div class="btns" role="tablist" style="margin:8px 0"><button data-a="ltab" data-t="B" class="${ltab==='B'?'big':''}" role="tab" aria-selected="${ltab==='B'}">야수</button><button data-a="ltab" data-t="P" class="${ltab==='P'?'big':''}" role="tab" aria-selected="${ltab==='P'}">투수</button><button data-a="ltab" data-t="T" class="${ltab==='T'?'big':''}" role="tab" aria-selected="${ltab==='T'}">감독·궁합</button></div>
  ${ltab==='T'?vTac():''}
  <div class="cols" style="${ltab==='T'?'display:none':''}"><div style="${ltab==='P'?'display:none':''}"><h3>타순</h3><table class="tbl ln"><tbody>${T.lineup.map((x,i)=>{const c=byId[x.id];return `<tr><td>${i+1}</td>
   <td><select data-k="pos" data-i="${i}" aria-label="${i+1}번 수비 위치">${POS.filter(p=>!c||canPlay(c,p)||p===x.pos).map(p=>`<option value="${p}" ${p===x.pos?'selected':''}>${PK[p]}</option>`).join('')}</select></td>
   <td class="l"><div class="pc"><select data-k="bat" data-i="${i}" aria-label="${i+1}번 타자">${opt(bats.filter(b=>canPlay(b,x.pos)||b.id===x.id),x.id)}</select>${cd(x.id)}${c&&x.pos!=='DH'?`<i class="cdt ${canPlay(c,x.pos)?'c4':'c2'}">수비 ${GRADE(effDef(c,x.pos))}${canPlay(c,x.pos)?'':' (불가)'}</i>`:''}</div></td>
   <td class="mv2"><button data-a="up" data-i="${i}" aria-label="위로">▲</button><button data-a="dn" data-i="${i}" aria-label="아래로">▼</button></td></tr>`}).join('')}</tbody></table>
   <h3>벤치 <small>(코스트 포함, 대타 가능)</small></h3><table class="tbl ln"><tbody>${[0,1,2,3,4].map(i=>row('벤치'+(i+1),'bench',i,T.bench[i],bats)).join('')}</tbody></table></div>
  <div style="${ltab==='B'?'display:none':''}"><h3>투수진</h3><table class="tbl ln"><tbody>${[0,1,2,3,4].map(i=>row('선발'+(i+1),'rot',i,T.rot[i],ps)).join('')}
   ${['마무리','셋업','중계1','중계2','중계3','중계4'].map((l,i)=>row(l,'pen',i,T.pen[i],ps)).join('')}</tbody></table></div></div></section>
  <section class="band"><h3>1군 선수 <small>카드를 누르면 상세·스킬 블록</small></h3><div class="grid">${regCards(T).map(c=>cardHTML(c,{cond:S.cond[c.id]})).join('')}</div></section>`}
const LINES=()=>[...new Set(CARDS.map(c=>c.line))];
const YEARS=()=>[...new Set(CARDS.map(c=>c.year))].sort((a,b)=>a-b);
const PACKS=[{k:'n',n:'일반 팩',p:500,cnt:5,d:'5장 · 1982~2026 전체에서 무작위'},{k:'p',n:'프리미엄 팩',p:1800,cnt:5,d:'5장 · 4코스트 이상만'},
  {k:'t',n:'구단 팩',p:800,cnt:5,d:'5장 · 고른 구단 계보 선수만'},{k:'y',n:'연도 팩',p:800,cnt:5,d:'5장 · 고른 연도 선수만'},{k:'b',n:'블록 팩',p:400,cnt:3,d:'스킬 블록 3개'},{k:'tc',n:'작전 카드 팩',p:600,cnt:3,d:'작전 카드 3장 (일반 75% · 특수 20% · 황금 5%)'},{k:'sp',n:'서포트 카드 팩',p:500,cnt:3,d:'서포트 카드 3장'}];
const W=c=>[0,30,22,18,12,8,5,3,1.6,.8,.35][c.cost];
function draw(pk){let pool=CARDS;if(pk.k==='p')pool=CARDS.filter(c=>c.cost>=4);if(pk.k==='t'){const l=$('#pl').value;pool=CARDS.filter(c=>c.line===l)}if(pk.k==='y'){const y=+$('#py').value;pool=CARDS.filter(c=>c.year===y)}
  const tot=pool.reduce((s,c)=>s+W(c),0),out=[];for(let i=0;i<pk.cnt;i++){let u=Math.random()*tot;out.push(pool.find(c=>(u-=W(c))<0)||pool[0])}return out}
function vPacks(){
  return `<section class="band"><h1>카드팩</h1><p class="mini">이미 가진 카드가 나오면 코스트 × 50 코인으로 바뀌어요. 같은 선수라도 연도가 다르면 다른 카드예요.</p>
  <div class="packs">${PACKS.map(p=>`<div class="pack p-${p.k}"><div class="pk-art"><b>${p.n}</b><span>${p.k==='b'?'블록 ':''}${p.cnt}${p.k==='b'?'개':'장'}</span></div><p>${p.d}</p>
   ${p.k==='t'?`<select id="pl" aria-label="구단 계보">${LINES().map(l=>`<option>${esc(l)}</option>`).join('')}</select>`:''}
   ${p.k==='y'?`<select id="py" aria-label="연도">${YEARS().map(y=>`<option>${y}</option>`).join('')}</select>`:''}
   <button class="big" data-a="buy" data-p="${p.k}" ${S.coins<p.p?'disabled':''}>${p.p.toLocaleString()} 코인</button></div>`).join('')}</div></section>
  ${packOut?`<section class="band"><h3>개봉 결과</h3>${packOut.msg?`<p>${esc(packOut.msg)}</p>`:packOut.blocks?`<div class="inv">${packOut.blocks.map(b=>`<div class="blk"><b>${b.g}급 ${b.t==='B'?'타자':'투수'}</b><small>${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')}</small></div>`).join('')}</div>`:
   `<div class="grid reveal">${packOut.map((x,i)=>`<div class="flip" style="--d:${i*120}ms">${cardHTML(x.c,{badge:x.dup?`중복 · 보유 ${x.dup}장`:'NEW'})}</div>`).join('')}</div>`}</section>`:''}`}
let synK='p',synSel=[],synOut=null;
function synPool(){const T=S.team,inR=new Set(regCards(T).map(c=>c.id));
  if(synK==='p'){const L=[];for(const c of own().sort((a,b)=>b.cost-a.cost||b.ovr-a.ovr)){const n=(S.owned[c.id]|0)-(inR.has(c.id)?1:0);for(let i=0;i<n;i++)L.push([c.id+'#'+i,`${c.name} ${yy(c.year)} ${c.team} · ${c.cost}코 · ${c.ovr}${S.owned[c.id]>1?` (보유 ${S.owned[c.id]})`:''}`])}return L.slice(0,300)}
  if(synK==='b')return S.blocks.filter(b=>!b.on).map(b=>[b.u,`${b.name||b.sh} · ${b.g}급 ${b.t==='B'?'타자':'투수'}용 · ${Object.entries(b.st).map(([k,v])=>SKN[k]+'+'+v).join(' ')}`]);
  if(synK==='s'){const L=[];for(const [id,n] of Object.entries(S.sq||{}))for(let i=0;i<n;i++)L.push([id+'#'+i,`${SUP_BY[id][1]} · ${SUP_BY[id][3]}`]);return L}
  const L=[];for(const [id,n] of Object.entries(S.tq||{}))for(let i=0;i<n;i++)L.push([id+'#'+i,`${TC_BY[id][1]} · ${TC_BY[id][3]}`]);return L}
function doSynth(){const need=synK==='b'?2:3;if(synSel.length!==need)return;const base=synSel.map(v=>v.split('#')[0]);
  const mats=synK==='b'?base.map(u=>S.blocks.find(b=>b.u===u)):base;const r=synth(synK,mats,S.locks||[]);if(r.err){S.toast=r.err;render();return}
  if(synK==='p'){for(const id of base){S.owned[id]=(S.owned[id]|0)-1;if(S.owned[id]<=0)delete S.owned[id]}S.owned[r.out]=(S.owned[r.out]|0)+1;if(!S.cond[r.out])S.cond[r.out]=3;synOut=`새 선수: ${byId[r.out].name} ${byId[r.out].year} ${byId[r.out].team} (코스트 ${r.cost})`}
  if(synK==='b'){S.blocks=S.blocks.filter(b=>!base.includes(b.u));S.blocks.push(r.out);synOut=`새 블록: ${r.out.name} ${r.out.g}급`}
  if(synK==='s'){S.sq[base[0]]-=3;S.sq[r.out]=(S.sq[r.out]||0)+1;synOut=`새 서포트 카드: ${SUP_BY[r.out][1]} (${SUP_BY[r.out][3]}, ${SUP_BY[r.out][4]}경기)`}
  if(synK==='t'){for(const id of base)S.tq[id]--;S.tq[r.out]=(S.tq[r.out]||0)+1;if(S.team.tsel&&!(S.tq[S.team.tsel]>0))S.team.tsel=null;synOut=`새 작전 카드: ${TC_BY[r.out][1]} (${r.grade})`}
  synSel=[];save();render()}
function vSynth(){const L=synPool(),need=synK==='b'?2:3;
  return `<section class="band"><h1>합성</h1><div class="btns">${[['p','선수 3장'],['b','스킬 블록 2개'],['s','서포트 카드 3장'],['t','작전 카드 3장']].map(([k,n])=>`<button data-a="syk" data-k="${k}" class="${synK===k?'big':''}">${n}</button>`).join('')}</div>
  <p class="mini">${{p:'1군에 없는 선수 3장 → 평균 코스트 +1(70%)/+2(25%)/+3(5%) 선수 1장 (최대 10)',b:'같은 종류 블록 2개 → 같은 등급이면 한 단계 위 60%·같은 등급 40%, 다르면 높은 등급. 모양은 새로',s:'같은 서포트 카드 3장 → 강화판(효과 1.5배, 3경기)',t:'같은 등급 작전 카드 3장 → 일반이면 특수 80%·황금 20%, 특수면 황금'}[synK]}</p>
  ${synOut?`<div class="toast">${esc(synOut)}</div>`:''}<p class="mini">선택 ${synSel.length}/${need} <button class="big" data-a="sygo" ${synSel.length===need?'':'disabled'}>합성</button></p>
  <div class="btns" style="flex-wrap:wrap">${L.map(([v,t])=>`<button data-a="sypick" data-v="${esc(v)}" class="${synSel.includes(v)?'big':''}">${esc(t)}</button>`).join('')||'<p class="mini">재료가 없어요.</p>'}</div></section>`}
function vCards(){const n=Object.keys(S.owned).length;
  const q=flt.q.trim();let L=(flt.all?CARDS:own()).filter(c=>(!flt.type||c.type===flt.type)&&(!flt.tier||c.tier===flt.tier)&&(!flt.line||c.line===flt.line)&&(!flt.year||c.year===+flt.year)&&(!q||c.name.includes(q)));
  L=[...L].sort(flt.sort==='year'?(a,b)=>a.year-b.year||b.ovr-a.ovr:flt.sort==='cost'?(a,b)=>b.cost-a.cost||b.ovr-a.ovr:(a,b)=>b.ovr-a.ovr);
  const sl=(k,o,l)=>`<select data-f="${k}" aria-label="${l}">${o.map(([v,t])=>`<option value="${v}" ${String(flt[k])===String(v)?'selected':''}>${t}</option>`).join('')}</select>`;
  return `<section class="band"><div class="lhead"><h1>컬렉션 <small>${n.toLocaleString()} / ${CARDS.length.toLocaleString()}</small></h1></div>
  <div class="filters"><input data-f="q" value="${esc(flt.q)}" placeholder="선수 이름" aria-label="선수 이름 검색">${sl('type',[['','타자+투수'],['B','타자'],['P','투수']],'유형')}${sl('tier',[['','모든 등급'],['N','노멀'],['S','스타'],['L','레전드']],'등급')}
  ${sl('line',[['','모든 구단'],...LINES().map(l=>[l,l])],'구단')}${sl('year',[['','모든 연도'],...YEARS().map(y=>[y,y])],'연도')}${sl('sort',[['ovr','능력순'],['cost','코스트순'],['year','연도순']],'정렬')}
  <label class="chk"><input type="checkbox" data-f="all" ${flt.all?'checked':''}> 미보유 카드도 보기</label></div>
  <p class="mini">${L.length.toLocaleString()}장</p><div class="grid">${L.slice(0,flt.lim).map(c=>cardHTML(c,{dim:!S.owned[c.id]})).join('')||'<p>조건에 맞는 카드가 없어요.</p>'}</div>
  ${L.length>flt.lim?`<div class="btns" style="margin-top:16px"><button data-a="more">더 보기</button></div>`:''}</section>`}
function diamond(g){const on=i=>g.bases[i]?'on':'';return `<svg viewBox="0 -12 200 182" class="dia" role="img" aria-label="주자 상황">
  <path d="M100 150 L30 80 L100 10 L170 80 Z" class="turf"/><circle cx="100" cy="82" r="9" class="mound"/>
  <rect x="160" y="70" width="20" height="20" transform="rotate(45 170 80)" class="base ${on(0)}"/><rect x="90" y="0" width="20" height="20" transform="rotate(45 100 10)" class="base ${on(1)}"/>
  <rect x="20" y="70" width="20" height="20" transform="rotate(45 30 80)" class="base ${on(2)}"/><path d="M92 142h16v8l-8 8-8-8z" class="plate"/></svg>`}
function logHTML(g){const HK=['i','r','hr','c','h','e'];let gr=[];for(const x of g.log){if(g.hl&&!HK.includes(x.k)&&!/보살|실책|저지/.test(x.txt))continue;if(x.k==='i'||!gr.length)gr.push([]);gr[gr.length-1].push(x)}if(g.hl)gr=gr.filter(a=>a.length>1||a[0].k!=='i');
  return gr.reverse().slice(0,30).map(a=>{const h=a[0].k==='i'?a[0]:null,rest=(h?a.slice(1):a).reverse();return (h?`<li class="i">${esc(h.txt)}</li>`:'')+rest.map(x=>`<li class="${x.k}">${esc(x.txt)}</li>`).join('')}).join('')}
function vGame(){
  if(!G)return `<section class="hero"><h1>진행 중인 경기가 없어요</h1><p><a href="#season">시즌 화면</a>에서 경기장에 입장하세요.</p></section>`;
  const g=G,n=Math.max(9,g.line[0].length),bat=g.half,cur=g.done?null:g.t[bat].lu[g.idx[bat]].c,P=g.done?null:g.pit[1-bat].c,myBat=bat===g.me,B=g.bases;
  const ls=s=>Array.from({length:n},(_,i)=>g.line[s][i]??(i===g.inn-1&&g.half===s&&!g.done?g.hr:''));
  const box=s=>`<table class="tbl"><thead><tr><th class="l">${esc(g.t[s].name)}</th><th>타수</th><th>안타</th><th>홈런</th><th>타점</th><th>득점</th><th>볼넷</th><th>삼진</th><th>보살</th><th>실책</th></tr></thead><tbody>${Object.values(g.bx[s]).map(b=>`<tr><td class="l">${esc(b.c.name)} <small>${PK[b.pos]}</small></td><td>${b.ab}</td><td>${b.h}</td><td>${b.hr}</td><td>${b.rbi}</td><td>${b.r}</td><td>${b.bb}</td><td>${b.k}</td><td>${b.a||0}</td><td>${b.e||0}</td></tr>`).join('')}</tbody></table>
   <table class="tbl"><thead><tr><th class="l">투수</th><th>이닝</th><th>피안타</th><th>실점</th><th>볼넷</th><th>삼진</th></tr></thead><tbody>${g.px[s].map(p=>`<tr><td class="l">${esc(p.c.name)}</td><td>${Math.floor(p.outs/3)}.${p.outs%3}</td><td>${p.h}</td><td>${p.r}</td><td>${p.bb}</td><td>${p.k}</td></tr>`).join('')}</tbody></table>`;
  const tk=g.done?'':myBat?`<div class="btns tk"><span class="mini">작전</span>${(B[0]||B[1])&&g.outs<2?'<button data-a="tk" data-k="bunt">희생번트</button>':''}${(B[0]&&!B[1])||(B[1]&&!B[2])?'<button data-a="tk" data-k="steal">도루</button>':''}
    ${g.t[bat].bench.length?`<select id="phs" aria-label="대타">${g.t[bat].bench.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} ${yy(c.year)} (${c.ovr})</option>`).join('')}</select><button data-a="tk" data-k="ph">대타</button>`:''}${g.pending?`<b class="mini">예약: ${{bunt:'희생번트',steal:'도루',ph:'대타',ibb:'고의4구'}[g.pending.kind]}</b>`:''}</div>`
    :`<div class="btns tk"><span class="mini">수비 작전</span><button data-a="tk" data-k="ibb">고의4구</button>${g.pending?'<b class="mini">예약: 고의4구</b>':''}</div>`;
  return `<section class="board"><div class="scroll"><table class="ls"><thead><tr><th class="l">${g.done?'경기 종료':`${g.inn}회${g.half?'말':'초'}`}</th>${Array.from({length:n},(_,i)=>`<th>${i+1}</th>`).join('')}<th class="rr">R</th><th>H</th></tr></thead>
  <tbody>${[0,1].map(s=>`<tr class="${!g.done&&g.half===s?'up':''}"><td class="l"><i class="dot" style="background:${g.t[s].color}"></i>${esc(g.t[s].name)}</td>${ls(s).map(v=>`<td>${v}</td>`).join('')}<td class="rr">${g.sc[s]}</td><td>${g.hits[s]}</td></tr>`).join('')}</tbody></table></div>
  <div class="field">${diamond(g)}<div class="outs">아웃 ${[0,1,2].map(i=>`<i class="${i<g.outs?'on':''}"></i>`).join('')}</div>
   <div class="duel">${cur?`<div><small>타자</small><b>${esc(cur.name)}</b><span>${yy(cur.year)} ${esc(cur.team)} · 교타 ${Math.round(cur.r.con)} 장타 ${Math.round(cur.r.pow)}</span></div><div><small>투수</small><b>${esc(P.name)}</b><span>${g.pit[1-bat].bf}타자 상대 · 구위 ${Math.round(P.r.stu)} 제구 ${Math.round(P.r.ctl)}</span></div>`:`<div><b class="final">${g.res<0?'무승부':esc(g.t[g.res].name)+' 승리'}</b></div>`}</div></div>
  ${tk}<div class="btns gb">${g.done?`<button class="big" data-a="fin">${g.friendly?'친선전 결과 저장':'결과 반영하고 다음 라운드'}</button>`:`<button class="big" data-a="pa">다음 타석</button><button data-a="inn">이닝 끝까지</button><button data-a="end">경기 끝까지</button>`}</div></section>
  <section class="band cols2"><div><h3>${g.hl?'하이라이트 <small>득점·홈런·보살·실책·교체</small>':'문자 중계'}</h3><ol class="log">${logHTML(g)}</ol></div><div><details open><summary>박스스코어</summary>${box(0)}${box(1)}</details></div></section>`}
/*MODES*/
/*ONLINE*/
function render(){if(S&&S.season&&!G){weekTick();ylTick()}const v=view();const y=scrollY;app.innerHTML=head()+({season:vSeason,years:vYears,lineup:vLineup,packs:vPacks,cards:vCards,synth:vSynth,game:vGame,online:vOnline}[v])()+vModal();S.toast='';
  const sv=$('#sv');if(sv)sv.value=btoa(unescape(encodeURIComponent(JSON.stringify(S))));if(modal)scrollTo(0,y)}
app.addEventListener('click',ev=>{
  const cd=ev.target.closest('[data-card]');if(cd&&!ev.target.closest('.mdl')){modal=cd.dataset.card;selB=null;render();return}
  const b=ev.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,i=+b.dataset.i,T=S.team;if(a.startsWith('o-')){oAct(a,b);return}if(a.startsWith('m-')){mAct(a,b);return}
  if(a==='close'){if(ev.target===b||b.classList.contains('x')){modal=null;selB=null;render()}return}
  if(a==='start')startGame(false);else if(a==='auto')startGame(true);else if(a==='newseason'){newSeason();render()}
  else if(a==='pa'){pa(G,true);render()}else if(a==='inn'){const h=G.half,n=G.inn;let k=0;while(!G.done&&G.half===h&&G.inn===n&&k++<300)pa(G);render()}
  else if(a==='end'){simAll(G);render()}else if(a==='fin'){if(G.friendly)oFinish();else endGame()}
  else if(a==='tk'){const k=b.dataset.k;tactic(G,k,k==='ph'?$('#phs').value:null);if(k!=='ph')pa(G);else pa(G);render()}
  else if(a==='tsel'){T.tsel=T.tsel===b.dataset.c?null:b.dataset.c;save();render()}
  else if(a==='supgo'){const id=$('#sups')&&$('#sups').value,cid=$('#supc').value,x=SUP_BY[id],c=byId[cid];if(!x||!c)return;if(x[2]!=='all'&&x[2]!==c.type){S.toast=`${x[1]}은(는) ${x[2]==='B'?'타자':'투수'}에게만 줄 수 있어요`;render();return}
    T.sup=(T.sup||[]).filter(y=>y.left>0&&y.cid!==cid);if(T.sup.length>=SUP_MAX)return;T.sup.push({id,cid,left:x[4]});S.sq[id]--;save();render()}
  else if(a==='supx'){const L=(T.sup||[]).filter(x=>x.left>0),x=L[i];if(x&&x.left===SUP_BY[x.id][4])S.sq[x.id]=(S.sq[x.id]||0)+1;T.sup=L.filter((_,k)=>k!==i);save();render()}
  else if(a==='syk'){synK=b.dataset.k;synSel=[];synOut=null;render()}
  else if(a==='sypick'){const v=b.dataset.v,k=synSel.indexOf(v);if(k>=0)synSel.splice(k,1);else synSel.push(v);render()}
  else if(a==='sygo'){doSynth()}
  else if(a==='ltab'){ltab=b.dataset.t;render()}
  else if(a==='mgr'){T.mgr=T.mgr===b.dataset.m?'':b.dataset.m;delete T.tac;save();render()}
  else if(a==='autoset'){autoSet();save();render()}
  else if(a==='up'&&i>0){[T.lineup[i-1],T.lineup[i]]=[T.lineup[i],T.lineup[i-1]];save();render()}
  else if(a==='dn'&&i<8){[T.lineup[i+1],T.lineup[i]]=[T.lineup[i],T.lineup[i+1]];save();render()}
  else if(a==='more'){flt.lim+=240;render()}
  else if(a==='buy'){const pk=PACKS.find(p=>p.k===b.dataset.p);if(S.coins<pk.p)return;S.coins-=pk.p;
    if(pk.k==='b'){packOut={blocks:[gainBlock('B'),gainBlock('P'),gainBlock()]}}
    else if(pk.k==='tc'){S.tq=S.tq||{};const got=[];for(let i=0;i<3;i++){const u=Math.random(),g=u<.05?'황금':u<.25?'특수':'일반',x=pick(TCARDS.filter(t=>t[3]===g));S.tq[x[0]]=(S.tq[x[0]]||0)+1;got.push(x[1]+'('+g+')')}packOut={msg:'작전 카드: '+got.join(', ')}}
    else if(pk.k==='sp'){S.sq=S.sq||{};const got=[];for(let i=0;i<3;i++){const x=pick(SUPS.filter(t=>!t[0].endsWith('+')));S.sq[x[0]]=(S.sq[x[0]]||0)+1;got.push(x[1])}packOut={msg:'서포트 카드: '+got.join(', ')}}
    else packOut=draw(pk).map(c=>{const dup=S.owned[c.id]|0;S.owned[c.id]=dup+1;if(!dup)S.cond[c.id]=3;return {c,dup:dup?dup+1:0}});
    if(!['b','tc','sp'].includes(pk.k)&&Math.random()<.3){gainBlock()}save();render()}
  else if(a==='pickb'){selB=selB===b.dataset.u?null:b.dataset.u;render()}
  else if(a==='rmphoto'){delete S.photos[modal];save();render()}
  else if(a==='rot'){const sb=S.blocks.find(x=>x.u===selB);if(sb){sb.rot=((sb.rot||0)+1)%4;render()}}
  else if(a==='cell'){const c=byId[modal],r=+b.dataset.r,q=+b.dataset.q,gp=S.gp[c.id]||0;
    const on=S.blocks.find(x=>x.on===c.id&&cellsOf(x).some(([a2,d])=>a2+x.at[0]===r&&d+x.at[1]===q));
    if(on){on.on=null;on.at=null;save();render();return}
    const sb=S.blocks.find(x=>x.u===selB);if(sb&&canPlace(c,gp,S.blocks,sb,r,q)){sb.on=c.id;sb.at=[r,q];selB=null;save();render()}
    else if(sb){b.classList.add('no');setTimeout(()=>b.classList.remove('no'),400)}}
  else if(a==='copy'){const t=$('#sv').value;navigator.clipboard?.writeText(t).then(()=>{b.textContent='복사됨'},()=>{$('#sv').select()})}
  else if(a==='load'){try{const o=JSON.parse(decodeURIComponent(escape(atob($('#sv').value.trim()))));if(o&&o.team&&o.season){S=o;save();render()}}catch(e){b.textContent='코드를 읽지 못했어요'}}
  else if(a==='reset'){if(b.dataset.c){fresh();packOut=null;G=null;render()}else{b.dataset.c=1;b.textContent='한 번 더 누르면 초기화'}}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&modal){modal=null;render()}else if(ev.key==='Enter'&&ev.target.dataset&&ev.target.dataset.card){modal=ev.target.dataset.card;render()}});
app.addEventListener('change',ev=>{const t=ev.target,k=t.dataset.k,i=+t.dataset.i,T=S.team;
  if(t.dataset.up&&t.files&&t.files[0]){const id=t.dataset.up,img=new Image();img.onload=()=>{const W=240,H=Math.round(img.height*W/img.width),cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(img,0,0,W,H);
    S.photos=S.photos||{};S.photos[id]=cv.toDataURL('image/jpeg',.82);try{save()}catch(e){};render()};img.src=URL.createObjectURL(t.files[0]);return}
  if(k==='pos')T.lineup[i].pos=t.value;else if(k==='bat')T.lineup[i].id=t.value;else if(k==='rot')T.rot[i]=t.value;else if(k==='pen')T.pen[i]=t.value;else if(k==='bench')T.bench[i]=t.value;
  else if(t.dataset.f){flt[t.dataset.f]=t.type==='checkbox'?t.checked:t.value;flt.lim=120}
  else if(t.id==='tn')T.name=t.value.trim()||'내 구단';else return;save();render()});
addEventListener('hashchange',render);
app.innerHTML='<section class="hero"><h1>선수 카드 불러오는 중…</h1><p class="mini">KBO 1982~2026 기록으로 만든 카드 약 1만 5천 장</p></section>';
fetch('cards.json').then(r=>r.json()).then(j=>{loadCards(j);
  try{const t=localStorage.getItem(KEY);if(t){S=JSON.parse(t);if(!S.season||!S.team)S=null}}catch(e){S=null}
  if(!S)fresh();else{for(const id in S.owned)if(!byId[id])delete S.owned[id];S.blocks=S.blocks||[];S.gp=S.gp||{};S.tq=S.tq||{};S.sq=S.sq||{};S.team.bench=S.team.bench||[]}
  render();fbBoot()}).catch(e=>{app.innerHTML=`<section class="hero"><h1>카드 데이터를 불러오지 못했어요</h1><p>${esc(e.message)}</p></section>`});
}
