// ===== 프로호구 매니저 v2 : 카드 모델 + 덱 효과 + 스킬 블록 + 경기 엔진 =====
const LINE_COLOR={LG:'#b3134b',KIA:'#c8102e',두산:'#23214f',삼성:'#0a5fb4',롯데:'#16326b',한화:'#e8691b',SK:'#c22a2a',키움:'#7b1530',NC:'#1d4f8a',KT:'#2b2b2b'};
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const PK={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발',RP:'불펜'};
const PS={C:'포',  '1B':'1루','2B':'2루','3B':'3루',SS:'유격',LF:'좌',CF:'중',RF:'우',DH:'지명'};
const BK=['con','pow','eye','bun','spd','def','men'],PKEY=['vel','stu','brk','ctl','sta','men'];
const SKN={con:'교타',pow:'장타',eye:'선구',bun:'번트',spd:'주력',def:'수비',men:'정신',vel:'구속',stu:'구위',brk:'변화',ctl:'제구',sta:'체력'};
const MVP=new Set('박철순1982 이만수1983 최동원1984 김성한1985 선동열1986 장효조1987 김성한1988 선동열1989 선동열1990 장종훈1991 장종훈1992 김성래1993 이종범1994 김상호1995 구대성1996 이승엽1997 우즈1998 이승엽1999 박경완2000 이승엽2001 이승엽2002 이승엽2003 배영수2004 손민한2005 류현진2006 리오스2007 김광현2008 김상현2009 이대호2010 윤석민2011 박병호2012 박병호2013 서건창2014 테임즈2015 니퍼트2016 양현종2017 김재환2018 린드블럼2019 로하스2020 미란다2021 이정후2022 페디2023 김도영2024'.split(' '));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)), X=v=>(v-70)/30;
let rnd=Math.random;const pick=a=>a[Math.floor(rnd()*a.length)];
let CARDS=[],byId={},TEAMYEARS={};
const TIER={N:'노멀',S:'스타',L:'레전드'};
const GRADE=v=>v>=115?'SS+':v>=110?'SS':v>=100?'S+':v>=90?'S':v>=80?'A':v>=70?'B':v>=60?'C':'D';
const COND=[null,{n:'최악',m:-.2},{n:'나쁨',m:-.1},{n:'보통',m:0},{n:'좋음',m:.04},{n:'최상',m:.08}];
const baseId=id=>String(id).replace(/~\d+$/,''); // 보유 중복 카드 id는 '기본id~k'('#k'는 동명이인 접미사라 따로 씀)
// EX 제한(2026-11-24, SJ): 1군 25명 중 EX는 타자 1명·투수 1명까지
const EX_MAX={B:1,P:1},exCount=ids=>{const n={B:0,P:0};for(const id of ids){const c=byId[baseId(id)];if(c&&c.v==='EX')n[c.type]++}return n},
  exErr=ids=>{const n=exCount(ids),e=[];if(n.B>EX_MAX.B)e.push(`EX 타자는 ${EX_MAX.B}명까지 쓸 수 있어요(지금 ${n.B}명)`);if(n.P>EX_MAX.P)e.push(`EX 투수는 ${EX_MAX.P}명까지 쓸 수 있어요(지금 ${n.P}명)`);return e},
  exTrim=cs=>{const keep=new Set();for(const t of ['B','P']){const x=cs.filter(c=>c&&c.v==='EX'&&c.type===t).sort((a,b)=>b.ovr-a.ovr).slice(0,EX_MAX[t]);x.forEach(c=>keep.add(c))}return cs.filter(c=>c&&(c.v!=='EX'||keep.has(c)))};
const COST_CAP=150,ROSTER={bat:9,bench:5,sp:5,rp:6} // 불펜: [마무리, 셋업, 중계1~4];
function loadCards(json){
  CARDS=json.cards.map(c=>{
    const name=c.n.replace(/#\d+$/,''),r={},keys=c.k==='B'?BK:PKEY;keys.forEach((k,i)=>r[k]=c.r[i]);
    const mvp=MVP.has(name+c.y);if(mvp)for(const k in r)if(k!=='sta')r[k]=Math.min(99,r[k]+3);
    const cost=Math.min(10,c.c+(mvp?1:0));
    return {id:c.y+'-'+c.t+'-'+c.n+(c.v?'·'+c.v:''),v:c.v||null,gg:c.gg||null,name,year:c.y,team:c.t,line:c.l,type:c.k,pos:c.p,ps:c.ps||null,r,pt:c.pt||null,s:c.s,cost,ovr:c.o+(mvp?2:0),mvp,
      tier:cost>=9?'L':cost>=6?'S':'N',kmh:c.k==='P'?Math.round(128+c.r[0]*.27):null,img:c.img||null,hs:c.hs||null,reg:c.rg||null,pat:c.pat!=null?c.pat:null,b:c.b||null,un:c.un||null,h:c.h||null,ph:c.h?('def'.includes(c.h)?'L':'R'):null,bh:c.h?({a:'R',b:'L',c:'S',d:'R',e:'L',f:'S'})[c.h]:null,tw:c.tw?1:0,st:rates(c.x),bo:c.k==='B'?boOf(r,rates(c.x)):null}});
  // 선수 단위 키: 이름+출신고. 1군 중복 검사는 pkt(c)=pk+유형으로 함(투타 겸업 선수는 타자 1장+투수 1장 가능). 출신고가 없으면 같은 이름·같은 유형 카드에 출신고가 하나뿐일 때 그 값을, 아니면 유형을 씀
  const HS={};for(const c of CARDS)if(c.hs){const k=c.name+'|'+c.type;(HS[k]=HS[k]||new Set()).add(c.hs)}
  for(const c of CARDS){const h=HS[c.name+'|'+c.type];c.pk=c.name+'|'+(c.hs||(h&&h.size===1?[...h][0]:c.type))}
  const TP={};for(const c of CARDS){if(c.v)continue;const k=c.year+c.team+c.pk+c.type;(TP[k]=TP[k]||[]).push(c)}for(const k in TP)if(TP[k].length>1)for(const c of TP[k]){const m=c.id.match(/#\d+$/);if(m)c.pk+=m[0]} // 같은 팀·연도 동명이인은 따로
  {const bp={};for(const c of CARDS)if(!c.v)bp[c.id]=c.pk;for(const c of CARDS)if(c.v){const b=bp[c.id.split('·')[0]];if(b)c.pk=b}}
  byId=Object.fromEntries(CARDS.map(c=>[c.id,c]));TEAMYEARS={};
  for(const c of CARDS)if(!c.v)(TEAMYEARS[c.year+' '+c.team]=TEAMYEARS[c.year+' '+c.team]||[]).push(c.id)}
// 시뮬레이션용 능력치로 변환
function simR(c,r){r=r||c.r;return c.type==='B'?{con:r.con,pow:r.pow,eye:r.eye,spd:r.spd,def:r.def,men:r.men,bun:r.bun}:{stu:r.vel*.3+r.stu*.35+r.brk*.35,ctl:r.ctl,sta:r.sta,men:r.men}}
// 타순 적성: T 테이블세터(1·2번), C 클린업(3~6번), L 하위 타선(7~9번, 누구나 가능). 적성 밖 타순이면 교타·장타·선구 -10%
// 실제 기록 기준: 100타석 이상에서 출루율 .330 이상 → 테이블세터, OPS .700 이상 → 클린업(둘 다 가능). 기록이 없으면 능력치로 추정
const pkt=c=>c.pk+'|'+c.type;
const BO_PEN=.9,BO_TH=65,BO_PA=100,BO_OBP=.330,BO_OPS=.700,boScore=R=>({T:R.con*.4+R.eye*.25+R.spd*.35,C:R.pow*.55+R.con*.25+R.eye*.2});
function rates(x){if(!x)return null;const [pa,ab,h,d,t,hr,bb,hbp]=x,obp=(h+bb+hbp)/Math.max(1,ab+bb+hbp),slg=(h+d+2*t+3*hr)/Math.max(1,ab),r=v=>Math.round(v*1000)/1000;return {pa,obp:r(obp),slg:r(slg),ops:r(obp+slg)}}
function boOf(R,st){if(st){if(st.pa<BO_PA)return ['L'];const o=[];if(st.obp>=BO_OBP)o.push('T');if(st.ops>=BO_OPS)o.push('C');return o.length?o:['L']}
  const s=boScore(R),m=Math.max(s.T,s.C);if(m<BO_TH)return ['L'];return ['T','C'].filter(k=>s[k]>=BO_TH&&m-s[k]<=3)}
const boKey=(c,k)=>c.st?(k==='T'?c.st.obp:c.st.ops)*100:boScore(c.r)[k];
// 타선 인접 궁합: 바로 앞뒤 타자(9번-1번도 이어짐)와의 쌍 점수 = 팀 점수(같은 팀·연도 +2, 아니면 같은 계보 +1) + 출신 점수(같은 고교 +3, 아니면 같은 대학 +2, 아니면 같은 지역 +1)
// 타자 점수 = 양쪽 이웃 쌍 점수 합. 점수 1당 교타·장타·선구 +ADJ_PCT%
const ADJ={team:2,line:1,hs:3,un:2,reg:1},ADJ_PCT=.15;
// EX 카드는 같은 계보(line)면 같은 팀·연도로 침(덱 효과와 같은 규칙)
const sameTY=(a,b)=>(a.year===b.year&&a.team===b.team)||((a.v==='EX'||b.v==='EX')&&a.line===b.line);
const adjPair=(a,b)=>{if(!a||!b)return 0;const t=sameTY(a,b)?ADJ.team:a.line===b.line?ADJ.line:0;
  const o=a.hs&&a.hs===b.hs?ADJ.hs:a.un&&a.un===b.un?ADJ.un:a.reg&&a.reg===b.reg?ADJ.reg:0;return t+o};
const adjBonus=(L,i)=>{const n=L.length;if(n<2)return 0;return adjPair(L[i],L[(i+n-1)%n])+adjPair(L[i],L[(i+1)%n])};
// ===== 유학 =====
// 카드 연도 기준 나이 25세 이하 또는 35세 이상만. 실제 시간(시간 단위) 동안 등록 불가, 끝나면 결과 확인. 재료: 같은 카드 사본
const ABD=[['d1','국내 2군 캠프',null,2,1,['con','eye','ctl','men'],'처음부터 열림'],['d2','호주 윈터리그','ai3',4,1,['con','pow','eye','spd','def','vel','stu','brk','ctl','sta'],'AI 시즌 3위 안'],
 ['d3','일본 캠프','aiW',8,2,['con','eye','bun','ctl','brk'],'AI 시즌 우승'],['d4','도미니카 윈터리그','aiW2',12,2,['spd','def','pow','vel','sta'],'AI 시즌 2회 우승 또는 승률 6할'],['d5','미국 캠프','fr',24,3,['pow','con','vel','stu'],'친구 리그 우승']];
const AB_BY=Object.fromEntries(ABD.map(d=>[d[0],d])),AB_CAP=12,ABG=[['대성공',.15,6],['성공',.6,4],['보통',1,2]];
const ageOf=c=>c&&c.b?c.year-c.b:null,abAge=c=>{if(c&&(c.v==='IR'||c.v==='RY'))return false;const a=ageOf(c);return a!=null&&(a<=25||a>=35)};
// used: 이 카드의 지금까지 유학 상승 합계. 반환 {g:등급, st:{능력:+n}}
function abRoll(d,c,used){d=AB_BY[d]||d;const u=rnd(),g=ABG.find(x=>u<x[1]),keys=Object.keys(c.r).filter(k=>d[5].includes(k));let pts=Math.max(0,Math.min(g[2]+(d[4]-1),AB_CAP-(used||0)));const st={};
  while(pts>0&&keys.length){const k=keys[Math.floor(rnd()*keys.length)];st[k]=(st[k]||0)+1;pts--}return {g:g[0],st}}
const slotBo=i=>i<2?'T':i<6?'C':'L',boOk=(c,i)=>!c.bo||slotBo(i)==='L'||c.bo.includes(slotBo(i)); // 하위 타선(7~9번)은 누구나 가능
const batVal=c=>c.r.con*.35+c.r.pow*.35+c.r.eye*.2+c.r.spd*.1;
function effDef(c,pos){if(pos==='DH')return 0;if(c.ps&&c.ps[pos]!=null)return c.ps[pos];const d=c.r.def,m=c.pos;
  const IF=['2B','3B','SS'],OF=['LF','CF','RF'];
  if(pos==='C')return d*.35;if(pos==='1B')return d*.8;if(m==='DH')return d*.5;
  if(IF.includes(pos)&&IF.includes(m))return d*.85;if(OF.includes(pos)&&OF.includes(m))return d*(pos==='CF'?.85:.92);
  if(m==='1B')return d*.6;return d*.65}
const canPlay=(c,pos)=>pos==='DH'||(c.ps?c.ps[pos]!=null:c.pos===pos);
function order(slots){ // 클린업 적성 4명(4번 최고) → 테이블세터 2명 → 나머지 하위. 적성자가 모자라면 점수 순으로 채움
  let R=[...slots];const sc=(x,k)=>boKey(x.c,k),take=(k,n)=>{const has=x=>x.c.bo&&x.c.bo.includes(k);
    const A=R.filter(has).sort((a,b)=>sc(b,k)-sc(a,k)).slice(0,n);if(A.length<n)A.push(...R.filter(x=>!A.includes(x)&&!has(x)).sort((a,b)=>sc(b,k)-sc(a,k)).slice(0,n-A.length));R=R.filter(x=>!A.includes(x));return A};
  const C=take('C',4),T=take('T',2),L=R.sort((a,b)=>batVal(b.c)-batVal(a.c));
  return [...T,C[1],C[0],C[2],C[3],...L].filter(Boolean)}
// ===== 덱 효과 (팀컬러) =====
// 1군 25명(타자 9 + 벤치 4 + 선발 5 + 불펜 7) 기준. 연도 계열 최고 1개 + 구단 계열 최고 1개가 겹쳐 적용.
const REGION_OF=(c)=>{const t=c.team;if(['MBC','LG','OB','두산','넥센','히어로즈','우리','키움'].includes(t))return '서울';if(['롯데','NC'].includes(t))return '부산·경남';
  if(['해태','KIA','쌍방울'].includes(t))return '호남';if(t==='삼성')return '대구·경북';if(['삼미','청보','태평양','SK','SSG'].includes(t)||(t==='현대'&&c.year<2000))return '인천';
  if(['현대','KT'].includes(t))return '경기';return '충청'};
const yearKey=c=>(c.year<=1987?'1982-87':String(c.year))+' '+c.line;
// 덱 효과(팀컬러): 계열마다 하나씩, 등급 S>A>B. Y=연도 계열, F=구단 계열, E=인연 계열(동문)
const FX_FAM={Y:'연도',F:'구단',E:'인연'};
function teamColor(cards){
  const cnt=f=>{const m={};for(const c of cards){const k=f(c);if(k)m[k]=(m[k]||0)+1}return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  // EX 카드는 같은 계보의 가장 많은 연도에 들어가 단일연도 인원으로 셈
  const yk=(()=>{const m={};for(const c of cards)if(c.v!=='EX'){const k=yearKey(c);m[k]=(m[k]||0)+1}
    for(const c of cards)if(c.v==='EX'){let b=null;for(const k in m)if(k.split(' ')[1]===c.line&&(!b||m[k]>m[b]))b=k;b=b||yearKey(c);m[b]=(m[b]||0)+1}
    return Object.entries(m).sort((a,b)=>b[1]-a[1])})(),ln=cnt(c=>c.line),rg=cnt(REGION_OF),cost=cards.reduce((s,c)=>s+c.cost,0),fx=[];
  // 표시용 이름: 계보 키 대신 실제 구단명(그 연도 카드에서 가장 많은 팀)
  const tname=k=>{const [yr,l]=k.split(' '),m={};for(const c of cards)if(c.line===l&&yearKey(c).startsWith(yr+' '))m[c.team]=(m[c.team]||0)+1;
    return yr+' '+(Object.entries(m).sort((a,b)=>b[1]-a[1])[0]||[l])[0]};
  const lname=l=>{const m={};for(const c of cards)if(c.line===l)m[c.team]=(m[c.team]||0)+1;return (Object.entries(m).sort((a,b)=>b[1]-a[1])[0]||[l])[0]};
  const mk=(fam,g,name,d,b,p)=>({fam,g,name,d,b,p,n:`${name} ${g} (${d})`});
  // 연도 계열
  let Y=null;const [y1,n1]=yk[0]||[];
  if(n1>=25)Y=mk('Y','S','단일연도',tname(y1),8,6);else if(n1>=20)Y=mk('Y','A','단일연도',tname(y1),5,4);else if(n1>=12)Y=mk('Y','B','단일연도',tname(y1),3,2);
  const byLine={};for(const [k,n] of yk){const l=k.split(' ')[1];(byLine[l]=byLine[l]||[]).push([k,n])}
  for(const l in byLine){const a=byLine[l];if(a.length>=2&&a[0][1]>=8&&a[1][1]>=8&&a[0][1]+a[1][1]>=25&&(!Y||Y.b<5))Y=mk('Y','A','연도 듀얼',`${a[0][0].split(' ')[0]}+${a[1][0].split(' ')[0]} ${lname(l)}`,5,4)}
  // 구단 계열
  let F=null;const [l1,m1]=ln[0]||[];
  if(m1>=25)F=mk('F','A','단일구단',lname(l1),5+(cost>=140?2:0),3+(cost>=140?2:0));else if(m1>=15)F=mk('F','B','단일구단',lname(l1),3,2);
  if(!F&&ln.length>=2&&ln[0][1]>=10&&ln[1][1]>=10&&ln[0][1]+ln[1][1]>=25)F=mk('F','B','라이벌 듀얼',`${lname(ln[0][0])}+${lname(ln[1][0])}`,3,2);
  if((!F||F.b<3)&&rg[0]&&rg[0][1]>=25)F=mk('F','B','지역',rg[0][0],3,2);
  // 인연 계열: 같은 고교 동문(투타 겸업 등 같은 선수는 한 명으로 셈), 없으면 같은 대학
  const uniq=f=>{const m={};for(const c of cards){const k=f(c);if(!k)continue;(m[k]=m[k]||new Set()).add(c.pk)}return Object.entries(m).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1])};
  const hs=uniq(c=>c.hs),un=uniq(c=>c.un);let E=null;
  if(hs[0]&&hs[0][1]>=6)E=mk('E','A','고교 동문',hs[0][0],3,2);else if(hs[0]&&hs[0][1]>=4)E=mk('E','B','고교 동문',hs[0][0],2,1);
  if(!E&&un[0]&&un[0][1]>=5)E=mk('E','B','대학 동문',un[0][0],2,1);
  if(Y)fx.push(Y);if(F)fx.push(F);if(E)fx.push(E);
  return {fx,bat:fx.reduce((s,x)=>s+x.b,0),pit:fx.reduce((s,x)=>s+x.p,0),top:{year:yk[0]&&[tname(yk[0][0]),yk[0][1]],line:ln[0]},cost}}
// ===== 스킬 블록 =====
const SHAPES={I2:[[0,0],[0,1]],I3:[[0,0],[0,1],[0,2]],V3:[[0,0],[1,0],[1,1]],O:[[0,0],[0,1],[1,0],[1,1]],I4:[[0,0],[0,1],[0,2],[0,3]],T:[[0,0],[0,1],[0,2],[1,1]],L:[[0,0],[1,0],[2,0],[2,1]],J:[[0,1],[1,1],[2,1],[2,0]],S:[[0,1],[0,2],[1,0],[1,1]],Z:[[0,0],[0,1],[1,1],[1,2]]};
const GRADES={C:{m:.75,w:50},B:{m:1,w:30},A:{m:1.25,w:15},S:{m:1.5,w:5}};
const GRID=4;
function mkBlock(t,g){const sh=pick(Object.keys(SHAPES));
  if(!g){let u=rnd()*100;g='C';for(const k of ['S','A','B','C']){if((u-=GRADES[k].w)<0){g=k;break}}}
  const keys=t==='B'?BK:PKEY,pts=Math.max(1,Math.round(SHAPES[sh].length*GRADES[g].m)),ks=[...keys].sort(()=>rnd()-.5).slice(0,g==='S'?2:1),st={};
  for(let i=0;i<pts;i++){const k=ks[i%ks.length];st[k]=(st[k]||0)+1}
  const main=Object.entries(st).sort((a,b)=>b[1]-a[1])[0][0];
  return {u:'b'+Date.now().toString(36)+Math.floor(rnd()*1e6).toString(36),sh,g,t,st,rot:0,on:null,at:null,name:`${SKN_E[main]||main} 연마-${sh}형`}}
const SKN_E={con:'교타',pow:'장타',eye:'선구',bun:'번트',spd:'주력',def:'수비',men:'정신',vel:'구속',stu:'구위',brk:'변화',ctl:'제구',sta:'체력'};
function cellsOf(b){let c=SHAPES[b.sh].map(x=>[...x]);for(let i=0;i<(b.rot||0)%4;i++)c=c.map(([r,q])=>[q,-r]);
  const mr=Math.min(...c.map(x=>x[0])),mc=Math.min(...c.map(x=>x[1]));return c.map(([r,q])=>[r-mr,q-mc])}
// 열린 칸: 카드마다 기본 모양(PAT 0~4, c.pat)이 있고 정해진 순서로 열림. 노멀 6, 스타 7, 레전드 8 + 출전 8경기마다 1칸, 최대 16
const PAT=[['계단형','좌하단',[[1,0],[2,0],[2,1],[3,0],[3,1],[3,2],[3,3],[2,2],[1,1],[0,0],[1,2],[2,3],[0,1],[1,3],[0,2],[0,3]]],
 ['직사각형','우상단',[[0,1],[0,2],[0,3],[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[0,0],[1,0],[2,0],[3,1],[3,2],[3,3],[3,0]]],
 ['모자형','상단',[[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[0,0],[0,3],[2,1],[2,2],[2,0],[2,3],[3,1],[3,2],[3,0],[3,3]]],
 ['손가락형','하단',[[2,0],[2,3],[3,0],[3,1],[3,2],[3,3],[2,1],[2,2],[1,0],[1,3],[1,1],[1,2],[0,0],[0,3],[0,1],[0,2]]],
 ['물고기형','좌상단',[[0,0],[0,1],[0,2],[1,0],[1,1],[2,1],[1,2],[2,0],[2,2],[0,3],[1,3],[3,1],[3,0],[3,2],[2,3],[3,3]]]];
const patOf=c=>c.pat!=null?c.pat:(()=>{let h=0;for(const ch of c.name+c.year)h=(h*31+ch.charCodeAt(0))>>>0;return h%5})();
const openCount=()=>16; // 스킬 칸은 처음부터 16칸 모두 열림
const isOpen=(c,gp,r,q)=>{const n=openCount(c,gp),seq=PAT[patOf(c)][2];for(let i=0;i<n;i++)if(seq[i][0]===r&&seq[i][1]===q)return true;return false};
function canPlace(card,gp,blocks,b,r0,q0){for(const [r,q] of cellsOf(b)){const R=r+r0,Q=q+q0;if(R<0||Q<0||R>=GRID||Q>=GRID||!isOpen(card,gp,R,Q))return false;
  if(blocks.some(o=>o.on===card.id&&o.u!==b.u&&cellsOf(o).some(([a,d])=>a+o.at[0]===R&&d+o.at[1]===Q)))return false}return true}
const SK_MUL={GG:1.25,EX:1.25,IR:1.5}; // 골든글러브·EX ×1.25, 철인 ×1.5 스킬 블록 효과 (올스타는 능력치 +3만)
function skillOf(id,blocks){const s={},m=(byId[id]&&SK_MUL[byId[id].v])||1;for(const b of blocks||[])if(b.on===id)for(const k in b.st)s[k]=(s[k]||0)+b.st[k];if(m!==1)for(const k in s)s[k]=Math.round(s[k]*m*10)/10;return s}
// ===== 시뮬레이션 팀 =====
// T={name,color,lineup:[{id,pos}],rot:[id],pen:[id],rotIdx,blocks?}, cond: id->1..5
// ===== 작전(T.tac 0~4, 2=보통) · 감독 성향(T.mgr) · 배터리 궁합 =====
// 감독 20명(가상 인물). 경향 8개 = power steal bunt ph hook relief ibb shift (0~4), 고유 능력 fx
const MTK=['power','steal','bunt','ph','hook','relief','ibb','shift'];
const MANAGERS=[ // 이름은 KBO 역대 감독의 별명, 성향·능력은 그 감독의 알려진 운영 스타일을 게임용으로 해석한 것
 ['m1','야신','small','13444434','L','벌떼 작전 야구','모든 야수 번트 +5, 불펜 구위 +2',{bun:5,rstu:2}],
 ['m2','여우','small','13431212','S','한 점 짜내기','득점권 교타 +3',{clutch:3}],
 ['m3','야왕','small','22432123','N','진루타 장인','땅볼 때 주자 진루 확률 +15%p',{adv:.15}],
 ['m4','코끼리','big','31112311','L','선 굵은 야구','모든 야수 장타 +4',{pow:4}],
 ['m5','노 피어','big','40002211','S','노 피어','홈런 확률 +0.6%p, 삼진 +1%p',{hrp:.006,kp:.01}],
 ['m6','헐크','big','31112201','N','초구 공략','장타 +2, 홈런 확률 +0.2%p',{pow:2,hrp:.002}],
 ['m7','뚝심','speed','24111212','L','육상부','모든 야수 주력 +5',{spd:5}],
 ['m8','꾀돌이','speed','14332111','S','히트앤런','히트앤런 성공률 +15%p',{hnr:.15}],
 ['m9','오리궁둥이','big','31122212','N','타격 지도','장타 +1, 득점권 교타 +2',{pow:1,clutch:2}],
 ['m10','국민감독','trust','12100211','L','믿음의 야구','선발 체력 +5',{ssta:5}],
 ['m11','형님','trust','23000020','S','형님 리더십','부진한 선수 컨디션 +1단계',{cond:1}],
 ['m12','곰탈여우','trust','32111211','N','승부사','선발 투구 한계 +12%',{shook:1.12}],
 ['m13','국보','pen','22224442','L','지키는 야구','불펜 구위 +4',{rstu:4}],
 ['m14','강철매직','pen','11324433','S','위기 관리','득점권 피안타율 -2%p',{risp:.02}],
 ['m15','어린왕자','pen','32124432','N','조기 마무리','8회 리드 때 마무리 조기 투입',{close8:1}],
 ['m16','염갈량','data','23243423','L','데이터 야구','모든 야수 선구 +5',{eye:5}],
 ['m17','국민유격수','data','22143434','S','수비 시프트','모든 야수 수비 +3',{def:3}],
 ['m18','맷 더 배트','data','32144314','N','상대 분석','능력 75 이상 투수 상대 교타 +4',{ace:4}],
 ['m19','국민타자','big','31123212','N','해결사','득점권 교타 +1, 홈런 확률 +0.3%p',{clutch:1,hrp:.003}],
 ['m20','꽃범호','speed','24122222','N','그린라이트','도루 성공률 +4%p, 시도 +30%',{steal:.03,stry:1.2}]]
 .map(([id,n,st,t,g,sn,se,fx])=>({id,n,st,g,sn,se,fx,t:Object.fromEntries(MTK.map((k,i)=>[k,+t[i]]))}));
const MGR_BY=Object.fromEntries(MANAGERS.map(m=>[m.id,m]));
const TAC_DEF={power:2,steal:2,bunt:2,ph:2,hook:2,relief:2,ibb:2,shift:2};
const mgrOf=T=>MGR_BY[T&&T.mgr]||null;
// 작전 카드: [id,이름,등급,면,조건,효과,무효화하는 카드,상쇄되는 카드]
// 작전 카드 20장: [id,이름,면(투/야/공),등급(일반/특수/황금),조건,효과,가격(P),무효화하는 카드,상쇄되는 카드]
// 좌우 투타: c.ph(던지는 손 R/L), c.bh(타석 R/L/S). 정보가 없는 카드는 p3·b3가 발동하지 않음(약 11%)
const TCARDS=[
 ['p1','완투 의지','투','일반','선발 등판 경기','선발 체력 +10, 구위 +3',30,[],['b4']],['p2','철벽 불펜','투','일반','7회 이후','불펜 구위 +5',30,['b5'],[]],
 ['p3','좌완 원 포인트','투','일반','좌타자 상대','투수 제구 +6',20,[],[]],['p4','위기 탈출','투','일반','득점권 위기','투수 정신력 +8',30,[],['b2']],
 ['p5','첫 이닝 집중','투','일반','1회','선발 구위·제구 +6',20,[],[]],['p6','클로저 본능','투','특수','9회 세이브 상황','마무리 구위 +6, 이 이닝 상대 대타 효과 무효',50,[],[]],
 ['p7','삼진 쇼','투','황금','언제나','상대 전 타자 교타 –4',80,[],[]],
 ['b1','에이스 사냥','야','일반','상대 선발이 스타 이상','전 타자 교타 +5',30,[],[]],['b2','득점권 해결사','야','일반','득점권','교타 +6',30,[],['p4']],
 ['b3','좌완 공략','야','일반','상대 투수가 좌투','장타 +5',20,[],[]],['b4','선발 흔들기','야','일반','1~3회','상대 선발 제구 –5',30,[],['p1']],
 ['b5','막판 뒤집기','야','일반','8회 이후 지고 있음','교타·장타 +6',30,[],[]],['b6','기동력 야구','야','일반','1루 주자 있음','도루 성공률 +20%',20,[],[]],
 ['b7','대타 신공','야','특수','6회 이후 대타','대타 교타 +10, 대타 다음 타자 선구 +5',50,[],[]],['b8','4번 타자의 무게','야','황금','4번 타석','상대 투수 구위 –6',80,[],[]],
 ['c1','홈 응원단','공','일반','홈 경기','전원 정신력 +5',20,[],[]],['c2','승리의 각오','공','일반','동점 또는 1점 차','전원 능력 +2',30,[],[]],
 ['c3','데이터 분석','공','일반','같은 상대와 두 번째 경기','전원 선구·제구 +3',30,[],[]],['c4','견제 강화','공','특수','상대 1루 주자','상대 도루 –20%, 견제사 확률 +',40,['b6'],[]],
 ['c5','징크스 깨기','공','특수','연패 중','전원 컨디션 +1단계',50,[],[]]];
const TC_BY=Object.fromEntries(TCARDS.map(x=>[x[0],x]));
// 서포트 카드: [id,이름,대상(B/P/all),효과,경기 수,fx]. 합성 강화판은 id+'+' (효과 1.5배, 3경기)
const SUPS=[['s1','특타 훈련','B','교타 +5',2,{con:5}],['s2','장타 특훈','B','장타 +5',2,{pow:5}],['s3','휴식','all','컨디션 +1단계',2,{cond:1}],
 ['s4','불펜 피칭','P','구위·제구 +4',2,{stu:4,ctl:4}],['s5','주루 코치','B','주력 +6',2,{spd:6}],['s6','멘탈 코칭','all','정신력 +8',2,{men:8}]];
for(const x of SUPS.slice())SUPS.push([x[0]+'+',x[1]+'+','',x[3].replace(/\d+/g,d=>String(Math.round(d*1.5))).replace('+2단계','+2단계'),3,Object.fromEntries(Object.entries(x[5]).map(([k,v])=>[k,k==='cond'?1:Math.round(v*1.5)]))]);
SUPS.forEach(x=>{if(!x[2])x[2]=SUPS.find(y=>y[0]===x[0].slice(0,-1))[2]});
const SUP_BY=Object.fromEntries(SUPS.map(x=>[x[0],x]));
const SUP_MAX=2;
// 합성: kind p(선수 3장)·b(블록 3개)·s(같은 서포트 3장)·t(같은 등급 작전 카드 3장). 결과만 돌려주고 재료 차감은 호출하는 쪽에서
// 선수 합성 조합 규칙: 재료 3장이 공통점을 가지면 결과가 그 범위에서 나오거나 확률이 오른다. 여러 규칙이 겹치면 모두 적용
// up = [+1, +2, +3] 확률(기본 70/25/5)
function synthRules(cs){const all=f=>cs.length===3&&cs.every(f),same=k=>all(c=>c[k]!=null&&c[k]===cs[0][k]),L=[];let up=[.70,.25,.05],gg=false;
  if(same('pk'))L.push({n:'같은 선수 3장 → 목표 코스트 안에서 그 선수의 다른 시즌 카드',player:1});
  else{
    if(same('year')&&same('team'))L.push({n:`같은 팀(${cs[0].year} ${cs[0].team}) → 그 팀 선수`,f:c=>c.year===cs[0].year&&c.team===cs[0].team});
    else{if(same('line'))L.push({n:`같은 구단 계보(${cs[0].line}) → 그 계보 선수`,f:c=>c.line===cs[0].line});
      if(same('year'))L.push({n:`같은 연도(${cs[0].year}) → 그해 선수`,f:c=>c.year===cs[0].year});
      else{const dec=c=>Math.floor(c.year/10)*10;if(all(c=>dec(c)===dec(cs[0])))L.push({n:`같은 연대(${dec(cs[0])}년대) → 그 연대 선수`,f:c=>dec(c)===dec(cs[0])})}}
    if(same('hs'))L.push({n:`같은 고교(${cs[0].hs}) → 그 고교 출신`,f:c=>c.hs===cs[0].hs});
    if(same('pos'))L.push({n:`같은 포지션(${PK[cs[0].pos]||cs[0].pos}) → 같은 포지션`,f:c=>c.pos===cs[0].pos});
    else if(same('type'))L.push({n:cs[0].type==='B'?'타자 3장 → 타자':'투수 3장 → 투수',f:c=>c.type===cs[0].type})}
  const TY=same('year')&&same('team');
  if(TY&&same('cost')){up=[.40,.40,.20];L.push({n:'같은 팀·같은 코스트 3장 → +2 이상 확률 60%'})}
  else if(TY){up=[.55,.35,.10];L.push({n:'같은 연도·같은 팀 3장 → +2 이상 확률 45%'})}
  else if(same('cost')){up=[.55,.35,.10];L.push({n:'같은 코스트 3장 → +2 이상 확률 45%'})}
  {const n=cs.filter(c=>c.v==='EX').length,s=cs.filter(c=>c.v==='GG'||c.v==='AS').length;if(n===3)L.unshift({n:'EX 3장 → EX 1장 확정 (평균 코스트 이상'+(cs.every(c=>c.line===cs[0].line)?', 같은 구단':'')+')'});else if(n===2)L.unshift({n:'EX 2장 → EX 50%'});else if(n===1&&s===2)L.unshift({n:'EX 1장 + 특별 2장 → EX 25%, 실패해도 골든글러브판'})}
  if(all(c=>c.v==='GG'||c.v==='EX'||c.v==='AS')){gg=true;L.push({n:'특별 카드 3장 → 골든글러브판 25%'})}
  const player=L.some(x=>x.player)?c=>c.pk===cs[0].pk&&!cs.some(m=>m.year===c.year):null;return {list:L,up,gg,player}}
const L3same=cs=>cs.every(c=>c.line===cs[0].line);
// opt.ex: 결과에서 뺄 구단 계보(line) 목록, 최대 SYN_EX_MAX개. 걸러서 후보가 없으면 제외를 무시
const SYN_EX_MAX=3;
function synth(kind,mats,locks,opt){
  if(locks&&locks.length){const L=new Set(locks),k=m=>kind==='b'?(m&&'b'+m.u):baseId(m);if(mats.some(m=>L.has(k(m))))return {err:'잠긴 카드·블록은 합성 재료로 쓸 수 없어요'}}
  if(kind!=='b'&&mats.length!==3)return {err:'재료 3개가 필요해요'};
  if(kind==='p'){const cs=mats.map(id=>byId[baseId(id)]);if(cs.some(c=>!c))return {err:'없는 카드'};
    const EXL=new Set(((opt&&opt.ex)||[]).slice(0,SYN_EX_MAX)),okL=c=>!EXL.has(c.line),exf=P=>{const Q=P.filter(okL);return Q.length?Q:P},exN=EXL.size?`제외: ${[...EXL].join(', ')}`:'';
    const R=synthRules(cs),a=Math.round(cs.reduce((s,c)=>s+c.cost,0)/3),u=rnd(),up=R.up;
    // EX 합성(사용자 확정): EX 3장 → 평균 코스트 이상 EX 확정(같은 구단 3장이면 그 구단) · EX 2장+아무 1장 → EX 50% · EX 1장+골글/올스타 2장 → EX 25%, 실패 시 골글판 이상 확정
    {const nEX=cs.filter(c=>c.v==='EX').length,nSP=cs.filter(c=>c.v==='GG'||c.v==='AS').length,EXS=exf(CARDS.filter(c=>c.v==='EX'));
     const exOut=(lineOnly)=>{let P=EXS.filter(c=>c.cost>=Math.min(a,10));const L=cs.filter(c=>c.v==='EX').map(c=>c.line);
       if(lineOnly){const Q=P.filter(c=>c.line===L[0]);if(Q.length)P=Q}if(!P.length)P=EXS;return pick(P)};
     const done=(c,n)=>({kind,out:c.id,cost:c.cost,rules:exN?[n,exN]:[n]});
     if(nEX===3)return done(exOut(L3same(cs)),'EX 3장 → EX 확정'+(L3same(cs)?` (${cs[0].line})`:''));
     if(nEX===2&&u<.5)return done(exOut(cs.filter(c=>c.v==='EX').every((c,i,A)=>c.line===A[0].line)),'EX 2장 → EX 50% 성공');
     if(nEX===1&&nSP===2){if(u<.25)return done(exOut(false),'EX+특별 2장 → EX 25% 성공');
       const G=exf(CARDS.filter(c=>c.v==='GG'&&c.cost>=a)).sort((x,y)=>x.cost-y.cost);if(G.length){const lo=G[0].cost;return done(pick(G.filter(c=>c.cost<=Math.max(lo,a+1))),'EX+특별 2장 → 실패, 골든글러브판 확정')}}}
    const t=Math.min(10,a+(u<up[2]?3:u<up[2]+up[1]?2:1));
    // 규칙의 조건(f)을 모두 만족하는 카드 중 목표 코스트. 없으면 조건을 뒤에서부터 하나씩 풀고, 그래도 없으면 가장 가까운 코스트
    let fs=R.list.filter(x=>x.f).map(x=>x.f),out=null;const base=c=>c.v!=='EX'&&c.v!=='AS'&&okL(c);
    // 같은 선수 3장: 그 선수 다른 시즌 중 목표 코스트(평균+1~3) 이하에서 가장 높은 카드. 없으면 일반 규칙으로(예전엔 코스트 무시하고 최고 카드라 1코 3장→8~9코가 나왔음)
    if(R.player){const P=CARDS.filter(c=>base(c)&&R.player(c)&&c.cost>a&&c.cost<=t).sort((x,y)=>y.cost-x.cost);if(P.length){out=P[0];fs=[]}}
    if(!out)for(;;){const P=CARDS.filter(c=>base(c)&&fs.every(f=>f(c)));if(P.length){const T=P.filter(c=>c.cost===t);if(T.length){out=pick(T);break}
        const hi=P.filter(c=>c.cost>a&&c.cost<=t).sort((x,y)=>Math.abs(x.cost-t)-Math.abs(y.cost-t));if(hi.length){out=pick(hi.filter(c=>c.cost===hi[0].cost));break}}
      if(!fs.length){const Z=CARDS.filter(c=>base(c)&&c.cost===t);out=pick(Z.length?Z:CARDS.filter(c=>c.v!=='EX'&&c.v!=='AS'&&c.cost===t));break}fs=fs.slice(0,-1)}
    if(R.gg&&rnd()<.25){const g=CARDS.find(c=>c.v==='GG'&&c.pk===out.pk&&c.year===out.year);if(g)out=g}
    return {kind,out:out.id,cost:out.cost,rules:R.list.filter(x=>R.player?x.player&&out.pk===cs[0].pk:(!x.f||fs.includes(x.f))).map(x=>x.n).concat(exN?[exN]:[])}}
  if(kind==='b'){if(mats.length!==2)return {err:'블록 2개가 필요해요'};const t=mats[0].t;if(mats.some(b=>b.t!==t))return {err:'같은 종류(타자용/투수용) 블록만 합성할 수 있어요'};
    const order='CBAS',a=order.indexOf(mats[0].g),b=order.indexOf(mats[1].g);const g=a===b?(rnd()<.6?order[Math.min(3,a+1)]:order[a]):order[Math.max(a,b)];return {kind,out:mkBlock(t,g)}}
  if(kind==='s'){if(mats.some(x=>x!==mats[0]))return {err:'같은 서포트 카드 3장이 필요해요'};if(mats[0].endsWith('+'))return {err:'강화판은 더 합성할 수 없어요'};return {kind,out:mats[0]+'+'}}
  if(kind==='t'){const gs=mats.map(id=>TC_BY[id]&&TC_BY[id][3]);if(gs.some(g=>g!==gs[0]))return {err:'같은 등급 카드 3장이 필요해요'};if(gs[0]==='황금')return {err:'황금 카드는 더 합성할 수 없어요'};
    const g=gs[0]==='특수'?'황금':(rnd()<.2?'황금':'특수');return {kind,out:pick(TCARDS.filter(x=>x[3]===g))[0],grade:g}}
  return {err:'알 수 없는 합성'}}
function clash(mine,opp){return (mine||[]).filter(id=>TC_BY[id]).map(id=>{const c=TC_BY[id];for(const o of opp||[]){const q=TC_BY[o];if(!q)continue;
  if(q[7].includes(id))return [id,'무효화',o];if(c[8].includes(o))return [id,'상쇄',o]}return [id,'발동',null]})}
function battery(p,c){const why=[];let v=45;if(!p||!c)return {v:0,why};
  if(sameTY(p,c)){v+=25;why.push('같은 팀·연도')}else if(p.line===c.line){v+=12;why.push('같은 구단')}
  if(p.hs&&p.hs===c.hs){v+=15;why.push('같은 고교')}if(p.reg&&p.reg===c.reg){v+=8;why.push('같은 지역')}
  return {v:Math.min(100,v),why}}
const batAdj=v=>v>=70?(v-60)/10:v<40?-1.5:0; // 궁합 → 제구 보정(구위는 60%)
// 신인왕(RY) 카드는 컨디션이 보통(3) 아래로 안 떨어짐. UI의 컨디션 롤도 Math.max(condMin(id), 값)으로 씀
const condMin=id=>byId[id]&&byId[id].v==='RY'?3:1;
function simTeam(T,cond){
  const all=[...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean);
  const M=mgrOf(T),tac=M?{...M.t}:{...TAC_DEF},fx=M?M.fx:{};
  const SP={};for(const x of (T.sup||[]).filter(x=>x.left>0&&SUP_BY[x.id]).slice(0,SUP_MAX))SP[x.cid]=SUP_BY[x.id][5];
  const AS=T.abSt||{},tc=teamColor(all),mod=c=>{const raw={...c.r};for(const k in AS[c.id]||{})if(raw[k]!=null)raw[k]=Math.min(120,raw[k]+AS[c.id][k]);sk=skillOf(c.id,T.blocks);const bon=c.type==='B'?tc.bat:tc.pit;const spx=SP[c.id]||{};for(const k in raw){if(k!=='sta')raw[k]+=bon;if(spx[k])raw[k]+=spx[k];if(c.type==='B'&&fx[k]&&k!=='def'&&k!=='men')raw[k]+=fx[k];raw[k]=Math.min(115,raw[k]+(sk[k]||0))}
    const c5=(T.tcards||[]).includes('c5')&&((T.ctx||{}).streak||0)<=-2?1:0,r=simR(c,raw),m=COND[Math.min(5,(l=>l<3?l+(fx.cond||0):l)(Math.max(condMin(c.id),(cond&&cond[c.id])||3))+c5+((SP[c.id]||{}).cond||0))].m;if(c.type==='B'){r.con*=1+m;r.eye*=1+m/2}else{r.ctl*=1+m;r.stu*=1+m/2}
    const ps=c.ps?Object.fromEntries(Object.entries(c.ps).map(([p,v])=>[p,v+bon+(sk.def||0)])):null;if(c.type==='P'&&fx.ssta&&c.pos==='SP')r.sta+=fx.ssta;return {...c,r,ps,rawr:raw}};
  const LC=T.lineup.map(x=>byId[x.id]);
  const lu=T.lineup.map((x,i)=>{const c=mod(byId[x.id]);let m=1;if(!boOk(c,i)){m*=BO_PEN;c.boBad=1}const a=adjBonus(LC,i);if(a){m*=1+a*ADJ_PCT/100;c.adj=a}
    if(m!==1)c.r={...c.r,con:c.r.con*m,pow:c.r.pow*m,eye:c.r.eye*m};return {c,pos:x.pos}});
  const w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1,fld=lu.filter(x=>x.pos!=='DH');
  const def=fld.reduce((s,x)=>s+effDef(x.c,x.pos)*w(x.pos),0)/fld.reduce((s,x)=>s+w(x.pos),0)+(fx.def||0);
  return {name:T.name,color:T.color,lu,bench:(T.bench||[]).map(id=>byId[id]).filter(Boolean).map(mod),sp:mod(byId[T.rot[(T.rotIdx||0)%T.rot.length]]),pen:T.pen.map(id=>mod(byId[id])),def,tc,tac,fx,mgr:T.mgr||'',tcards:(T.tsel?[T.tsel]:(T.tcards||[])).slice(0,5),ctx:T.ctx||{}}}

function newPit(g,s,c,starter){if(starter&&g.ta[s].has('p1'))c={...c,r:{...c.r,sta:c.r.sta+10,stu:c.r.stu+3}};const T=g.t[s],tac=T.tac||TAC_DEF,fx=T.fx||{},cat=(T.lu.find(x=>x.pos==='C')||{}).c,bt=battery(c,cat);
  const L=starter?(16+c.r.sta*.16)*[1.2,1.1,1,.92,.85][tac.hook]*(fx.shook||1):(3+c.r.sta/20)*[1.2,1.1,1,.95,.9][tac.relief];
  const p={c,starter,bf:0,outs:0,h:0,r:0,bb:0,k:0,hr:0,L,bat:bt.v,badj:batAdj(bt.v)};g.px[s].push(p);g.used[s].add(c.id);return p}
function mkGame(A,H){
  const tcx=[clash(A.tcards,H.tcards),clash(H.tcards,A.tcards)];
  const g={tcx,ta:tcx.map(l=>new Set(l.filter(x=>x[1]==='발동').map(x=>x[0]))),ctrl:null,t:[A,H],inn:1,half:0,outs:0,bases:[null,null,null],sc:[0,0],line:[[],[]],hits:[0,0],idx:[0,0],hr:0,done:false,log:[],px:[[],[]],used:[new Set(),new Set()],bx:[{},{}],pit:[]};
  for(const s of [0,1]){g.pit[s]=newPit(g,s,g.t[s].sp,true);for(const x of g.t[s].lu)g.bx[s][x.c.id]={c:x.c,pos:x.pos,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,sb:0,r:0,e:0,a:0}}
  say(g,`${g.t[0].name}(원정) 선발 ${A.sp.name}, ${g.t[1].name}(홈) 선발 ${H.sp.name}`,'h');
  for(const s of [0,1])if(tcx[s].length)say(g,`${g.t[s].name} 작전 카드: ${tcx[s].map(([id,st])=>TC_BY[id][1]+(st==='발동'?'':` (${st})`)).join(', ')}`,'h');
  say(g,'1회초','i');return g}
function say(g,txt,k){g.log.push({inn:g.inn,half:g.half,txt,k:k||''})}
const lim=p=>p.L;
function manage(g,f){
  const T=g.t[f],p=g.pit[f],lead=g.sc[f]-g.sc[1-f],closer=T.pen[0],tac=T.tac||TAC_DEF,cv=tac.relief,fx=T.fx||{},clean=g.outs===0&&!g.bases.some(Boolean);
  const lo=[1,1,1,0,-1][cv],hi=[3,3,4,4,4][cv],cfree=closer&&!g.used[f].has(closer.id)&&p.c.id!==closer.id;
  if(cfree&&((g.inn>=9&&lead>=lo&&lead<=hi&&(clean||cv>=1)&&(lead>0||f===1||g.inn>9))||((cv>=4||fx.close8)&&g.inn===8&&(g.outs===2||fx.close8)&&lead>0&&lead<=(fx.close8?3:2)))){bring(g,f,closer,'마무리');return}
  const setup=T.pen[1];if(g.inn===8&&lead>0&&lead<=3&&g.outs===0&&setup&&!g.used[f].has(setup.id)&&!(p.starter&&p.bf<lim(p)*.8)){bring(g,f,setup,'셋업');return}
  const need=p.bf>=lim(p)||(p.starter&&p.r>=[8,7,6,5,4][tac.hook])||(!p.starter&&p.r>=[4,3,3,2,2][tac.relief]&&p.bf>=3);
  if(!need)return;
  const nx=T.pen.slice(2).find(c=>!g.used[f].has(c.id))||(T.pen[1]&&!g.used[f].has(T.pen[1].id)?T.pen[1]:null)||(closer&&!g.used[f].has(closer.id)&&g.inn>=8?closer:null);
  if(nx)bring(g,f,nx,'')}
function bring(g,f,c,role){g.pit[f]=newPit(g,f,c,false);say(g,`투수 교체: ${g.t[f].name} ${role?role+' ':''}${c.name}`,'c')}
function score(g,r){g.sc[g.half]++;g.hr++;r.p.r++;g.bx[g.half][r.c.id].r++}
function out(g,n){g.outs+=n;g.pit[1-g.half].outs+=n}
const DIR=['좌','중','우'];
function aiOff(g,bat){const T=g.t[bat],tac=T.tac||TAC_DEF,B=g.bases,b=T.lu[g.idx[bat]].c,d=g.sc[bat]-g.sc[1-bat],late=g.inn>=7;
  if(late&&Math.abs(d)<=2&&(B[1]||B[2])&&T.bench.length&&!(g.ta[1-bat].has('p6')&&g.inn>=9)){const best=T.bench.reduce((a,c)=>batVal(c)>batVal(a)?c:a);if(batVal(best)-batVal(b)>[999,12,5,1,-3][tac.ph])return {kind:'ph',arg:best.id}}
  if((B[0]||B[1])&&!B[2]&&g.outs<2&&d>=-2&&d<=1&&b.r.pow<75&&rnd()<[0,.04,.1,.2,.35][tac.bunt]*(b.r.pow<65?1.5:1)*(late?1.5:1))return {kind:'bunt'};
  if(B[0]&&!B[1]&&g.outs<2&&rnd()<[0,.03,.07,.12,.2][tac.steal]*(tac.power>=3?.6:1))g.hnr=true;return null}
function aiDef(g,f){const T=g.t[f],tac=T.tac||TAC_DEF,B=g.bases,b=g.t[1-f].lu[g.idx[1-f]].c,close=Math.abs(g.sc[0]-g.sc[1])<=2;
  if(B[2]&&g.outs<2&&close&&g.inn>=[99,9,7,5,1][tac.shift])g.inf=true;
  if(!B[0]&&(B[1]||B[2])&&g.inn>=7&&close&&b.r.pow>=[999,100,92,85,78][tac.ibb])return {kind:'ibb'};return null}
// 선수 교체: 대주자(공격)·대수비(수비). 바뀐 선수는 박스에 새 줄로 기록하고 팀 수비력을 다시 계산
const reDef=T=>{const w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1,fl=T.lu.filter(x=>x.pos!=='DH');if(fl.length)T.def=fl.reduce((s,x)=>s+effDef(x.c,x.pos)*w(x.pos),0)/fl.reduce((s,x)=>s+w(x.pos),0)+((T.fx||{}).def||0)};
function subIn(g,s,i,nb,pos){const T=g.t[s],k=T.bench.findIndex(x=>x.id===nb.id);if(k<0)return;T.bench.splice(k,1);T.lu[i]={c:nb,pos};g.bx[s][nb.id]={c:nb,pos,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,sb:0,r:0,e:0,a:0};reDef(T)}
// 대주자: 7회 이후 2점 차 이내(지고 있거나 동점·1점 리드), 느린 주자를 벤치의 빠른 선수로. 감독 대타(ph) 성향이 높을수록 적극적
function aiPR(g,bat){const T=g.t[bat],tac=T.tac||TAC_DEF,B=g.bases,d=g.sc[bat]-g.sc[1-bat];
  if(g.inn<7||d<-2||d>1||!T.bench.length||tac.ph===0||(T.bench.length<2&&g.inn<9))return;
  const thr=[999,22,15,10,6][tac.ph];
  for(const i of [2,1,0]){const r=B[i];if(!r)continue;const li=T.lu.findIndex(x=>x.c.id===r.c.id);if(li<0)continue;
    const best=T.bench.reduce((a,c)=>c.r.spd>a.r.spd?c:a);if(best.r.spd-r.c.r.spd<thr)continue;
    if(g.inn<8&&batVal(r.c)>batVal(best)+8)continue; // 7회엔 중심타자를 빼지 않음
    const pos=T.lu[li].pos;subIn(g,bat,li,best,pos);B[i]={c:best,p:r.p};say(g,`대주자: ${r.c.name} → ${best.name}`,'c');return}}
// 대수비: 수비 시작 때 ①못 맡는 포지션에 선 선수(대타·대주자)는 점수와 상관없이 교체 ②8회 이후 1~3점 리드면 수비가 크게 처지는 자리를 교체(감독 수비 성향 shift)
function aiDefSub(g,f){const T=g.t[f],tac=T.tac||TAC_DEF,key=g.inn*2+g.half;if(g.dsub&&g.dsub[f]===key)return;(g.dsub=g.dsub||[0,0])[f]=key;
  if(!T.bench.length)return;const lead=g.sc[f]-g.sc[1-f],w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1;
  for(let i=0;i<T.lu.length&&T.bench.length;i++){const x=T.lu[i];if(x.pos==='DH'||canPlay(x.c,x.pos))continue;
    const cs=T.bench.filter(c=>canPlay(c,x.pos));if(!cs.length)continue;const nb=cs.reduce((a,c)=>effDef(c,x.pos)>effDef(a,x.pos)?c:a);
    subIn(g,f,i,nb,x.pos);say(g,`대수비: ${x.c.name} → ${nb.name} (${PK[x.pos]||x.pos})`,'c')}
  if(g.inn<8||lead<1||lead>3||!T.bench.length)return;const thr=[999,14,9,6,4][tac.shift];let n=0;
  const opts=T.lu.map((x,i)=>{if(x.pos==='DH')return null;const cs=T.bench.filter(c=>canPlay(c,x.pos));if(!cs.length)return null;const nb=cs.reduce((a,c)=>effDef(c,x.pos)>effDef(a,x.pos)?c:a);return {i,x,nb,gain:(effDef(nb,x.pos)-effDef(x.c,x.pos))*w(x.pos)}}).filter(o=>o&&o.gain>=thr).sort((a,b)=>b.gain-a.gain);
  for(const o of opts){if(n>=2)break;if(!T.bench.includes(o.nb))continue;subIn(g,f,o.i,o.nb,o.x.pos);n++;say(g,`대수비: ${o.x.c.name} → ${o.nb.name} (${PK[o.x.pos]||o.x.pos})`,'c')}}
function pa(g,manual){
  if(g.done)return;
  const bat=g.half,f=1-bat;manage(g,f);g.hnr=false;g.inf=false;
  let tk=g.pending;g.pending=null;const mine=s=>manual&&g.ctrl===s;
  if(!mine(f)&&g.outs===0&&!g.bases.some(Boolean))aiDefSub(g,f);if(!mine(bat))aiPR(g,bat);
  if(!tk&&!mine(bat))tk=aiOff(g,bat);if(!tk&&!mine(f))tk=aiDef(g,f);
  const OT=g.t[bat],DT=g.t[f],ofx=OT.fx||{},dfx=DT.fx||{},otac=OT.tac||TAC_DEF,dtac=DT.tac||TAC_DEF,po=dtac.shift,OA=g.ta[bat],DA=g.ta[f];
  // 개인 수비: 수비 위치의 야수와 그 포지션 수비값. 보살(a)·실책(e)은 수비팀 박스에 기록
  const fld=p=>{const x=DT.lu.find(y=>y.pos===p);return x?{c:x.c,d:effDef(x.c,p),p}:null},cr=F=>{const o=g.bx[f][F.c.id];if(o)o.a=(o.a||0)+1},ce=F=>{const o=g.bx[f][F.c.id];if(o)o.e=(o.e||0)+1};
  const DX=d=>(d-90)/10,OFP={'좌':'LF','중':'CF','우':'RF'},CAT=fld('C'),cArm=CAT?DX(CAT.d):0; // 포지션 수비값은 대개 80~100, 90이 보통
  // 보살: 추가 진루를 노린 주자를 외야 송구로 잡을 확률(외야 수비↑, 주자 주력↓). 포수 수비는 도루 성공률을 낮춤
  const armOut=(F,s,base)=>F&&rnd()<cl(base+.02*DX(F.d)-.03*X(s.c.r.spd),.005,.15);
  const stealP=s=>cl((.6+.25*X(s.c.r.spd)+(ofx.steal||0)-.04*po-.04*cArm)*(OA.has('b6')?1.2:1)*(DA.has('c4')?.8:1),.05,.95);
  if(tk&&tk.kind==='ph'){const T0=g.t[bat],i=T0.bench.findIndex(x=>x.id===tk.arg);if(i>=0){const nb=T0.bench.splice(i,1)[0],slot=T0.lu[g.idx[bat]];
    say(g,`대타: ${slot.c.name} → ${nb.name}`,'c');g.phNow=nb.id;g.phPrev=(g.idx[bat]+1)%9;T0.lu[g.idx[bat]]={c:nb,pos:slot.pos};reDef(T0);g.bx[bat][nb.id]={c:nb,pos:slot.pos,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,sb:0,r:0,e:0,a:0}}}
  const T=g.t[bat],b=T.lu[g.idx[bat]].c,P=g.pit[f],pc=P.c,B=g.bases,bs=g.bx[bat][b.id],run={c:b,p:P};
  if(tk&&tk.kind==='steal'){const fr=B[1]&&!B[2]?1:B[0]&&!B[1]?0:-1;if(fr>=0){const s=B[fr];
    if(rnd()<stealP(s)){B[fr+1]=s;B[fr]=null;g.bx[bat][s.c.id].sb++;say(g,`${s.c.name} ${fr+2}루 도루 성공`)}else{B[fr]=null;out(g,1);if(CAT)cr(CAT);say(g,`${s.c.name} ${fr+2}루 도루 실패${CAT?` (포수 ${CAT.c.name} 저지)`:''}`);if(g.outs>=3){endHalf(g);return}}}}
  if(tk&&tk.kind==='ibb'){P.bf++;const n=force(g,run);bs.bb++;P.bb++;bs.rbi+=n;say(g,`${b.name}: 고의4구${n?` — ${n}점`:''}`);g.idx[bat]=(g.idx[bat]+1)%9;
    if(g.half===1&&g.inn>=9&&g.sc[1]>g.sc[0]){g.line[1].push(g.hr);say(g,`끝내기! ${g.t[1].name} 승리`,'e');finish(g)}return}
  if(tk&&tk.kind==='bunt'&&(B[0]||B[1])&&g.outs<2){P.bf++;bs.ab++;
    if(rnd()<.06+.04*X(b.r.spd)){bs.h++;P.h++;g.hits[bat]++;const n=force(g,run);bs.rbi+=n;say(g,`${b.name}: 기습번트 안타`)}
    else if(rnd()<cl(.6+.3*X(b.r.bun||60)+(ofx.bunt||0),.3,.95)){out(g,1);if(B[2]&&B[1]){}if(B[1]&&!B[2]){B[2]=B[1];B[1]=null}if(B[0]&&!B[1]){B[1]=B[0];B[0]=null}bs.ab--;say(g,`${b.name}: 희생번트 성공`)}
    else{const lead=B[1]?1:0;out(g,1);if(rnd()<.5){B[lead]=null;if(lead===1&&B[0]){B[1]=B[0]}B[0]=run;say(g,`${b.name}: 번트 실패, 선행 주자 아웃`)}else say(g,`${b.name}: 번트 실패 (뜬공)`)}
    g.idx[bat]=(g.idx[bat]+1)%9;if(g.outs>=3)endHalf(g);return}
  if(DA.has('c4')&&B[0]&&rnd()<.012){const s=B[0];B[0]=null;out(g,1);say(g,`견제사: ${s.c.name}`);if(g.outs>=3){endHalf(g);return}}
  // 도루
  if(!mine(bat)&&!g.hnr&&B[0]&&!B[1]&&g.outs<2&&B[0].c.r.spd>=[200,88,80,72,64][otac.steal]&&rnd()<(.03+.12*X(B[0].c.r.spd))*[0,.5,1,1.6,2.4][otac.steal]*(ofx.stry||1)){
    const s=B[0];if(rnd()<stealP(s)+.02){B[1]=s;B[0]=null;g.bx[bat][s.c.id].sb++;say(g,`${s.c.name} 2루 도루 성공`)}
    else{B[0]=null;out(g,1);if(CAT)cr(CAT);say(g,`${s.c.name} 2루 도루 실패${CAT?` (포수 ${CAT.c.name} 저지)`:''}`);if(g.outs>=3){endHalf(g);return}}}
  const clutch=(g.inn>=7&&Math.abs(g.sc[0]-g.sc[1])<=2)||!!B[1]||!!B[2],L=lim(P),fat=cl((P.bf-L*.7)/(L*.6),0,1),pmen=pc.r.men+(P.starter?(dfx.smen||0):0)+(DA.has('c1')&&f===1?5:0)+(DA.has('p4')&&(B[1]||B[2])?8:0);
  const close1=Math.abs(g.sc[0]-g.sc[1])<=1,dc2=DA.has('c2')&&close1?2:0,dc3=DA.has('c3')&&(DT.ctx||{}).rematch?3:0,svs=g.inn>=9&&P.c.id===(DT.pen[0]||{}).id&&g.sc[f]-g.sc[bat]>=1&&g.sc[f]-g.sc[bat]<=3;
  const p5=DA.has('p5')&&P.starter&&g.inn===1?6:0,stu=pc.r.stu-14*fat+(P.starter?0:(dfx.rstu||0)+(DA.has('p2')&&g.inn>=7?5:0))+P.badj*.6+p5+dc2+(DA.has('p6')&&svs?6:0)-(OA.has('b8')&&g.idx[bat]===3?6:0),ctl=pc.r.ctl-10*fat-(P.starter&&OA.has('b4')&&g.inn<=3?5:0)+(clutch?(pmen-70)*.2:0)+P.badj+p5+dc2+dc3+(DA.has('p3')&&b.bh==='L'?6:0),risp=!!(B[1]||B[2]);const vsSP=P.starter,home=bat===1;
  let b0=b.r;{const m={},ad=(k,v)=>{m[k]=(m[k]||0)+v},oc2=OA.has('c2')&&close1;
   if(vsSP&&OA.has('b1')&&pc.cost>=6)ad('con',5);if(OA.has('b2')&&risp)ad('con',6);if(OA.has('b3')&&pc.ph==='L')ad('pow',5);if(OA.has('b5')&&g.inn>=8&&g.sc[bat]<g.sc[f]){ad('con',6);ad('pow',6)}
   if(OA.has('b7')&&g.inn>=6){if(g.phNow===b.id)ad('con',10);else if(g.phPrev===g.idx[bat])ad('eye',5)}if(OA.has('c1')&&home)ad('men',5);if(oc2){ad('con',2);ad('pow',2);ad('eye',2)}
   if(OA.has('c3')&&(OT.ctx||{}).rematch)ad('eye',3);if(DA.has('p7')&&!(DA.has('p6')&&svs&&false))ad('con',-4);
   if(Object.keys(m).length){b0={...b0};for(const k in m)b0[k]+=m[k]}}
  let br=clutch?{...b0,con:b0.con+(b0.men-70)*.2+(risp?(ofx.clutch||0):0)}:b0;if(ofx.ace&&pc.ovr>=75)br={...br,con:br.con+ofx.ace};
  const def=g.t[f].def,sw=otac.power-2,sh=dtac.shift-2;
  const pBB=cl(.08+.035*X(br.eye)-.03*X(ctl)-.003*sw+.002*po+0,.02,.18),pK=cl(.18+.08*X(stu)-.06*X(br.con)-.02*X(br.eye)+.006*sw+(g.hnr?.015:0)+(ofx.kp||0)+0,.05,.38),
    pHR=cl((.026+.032*X(br.pow)-.012*X(stu)+.004*sw+(ofx.hrp||0))*1,.003,.09),pHit=cl(.29+.06*X(br.con)-.03*X(stu)-.04*X(def)+.015*X(br.spd)+(g.inf?.03:0)-.003*sw-.004*sh-(risp?(dfx.risp||0):0),.2,.45);
  P.bf++;let u=rnd(),txt='',n=0,big='';const sb=g.sc[bat];
  if(u<pBB+.007){const hbp=u>=pBB;n=force(g,run);bs.bb++;P.bb++;txt=hbp?'몸에 맞는 공':'볼넷'}
  else if((u-=pBB+.007)<pK){bs.ab++;bs.k++;P.k++;out(g,1);txt=rnd()<.7?'헛스윙 삼진':'루킹 삼진';
    if(g.hnr&&B[0]&&g.outs<3){const s=B[0];if(rnd()<.55+.25*X(s.c.r.spd)-.04*po+(ofx.hnr||0)){B[1]=s;B[0]=null;g.bx[bat][s.c.id].sb++;txt+=` (히트앤런, ${s.c.name} 2루 안착)`}else{B[0]=null;out(g,1);txt+=` (히트앤런 실패, ${s.c.name} 아웃)`}}}
  else if((u-=pK)<pHR){bs.ab++;bs.h++;bs.hr++;P.h++;P.hr++;g.hits[bat]++;const on=B.filter(Boolean).length;
    for(const r of B)if(r)score(g,r);score(g,run);g.bases=[null,null,null];n=on+1;txt=`${pick(DIR)}월 ${['솔로','투런','스리런','만루'][on]} 홈런!`;big='hr'}
  else{bs.ab++;
    if(rnd()<pHit){bs.h++;P.h++;g.hits[bat]++;const t=rnd(),p3=.02+.03*Math.max(0,X(br.spd)),p2=.18+.07*X(br.pow);
      if(t<p3){for(const r of B)if(r)score(g,r);n=B.filter(Boolean).length;g.bases=[null,null,run];txt=`${pick(DIR)}중간 3루타`}
      else if(t<p3+p2){const nb=[null,run,null],dd=pick(['좌익선상','좌중간','우중간','우익선상']),F=fld(dd[0]==='좌'?'LF':dd==='우익선상'?'RF':'CF');let ex='';if(B[2]){score(g,B[2]);n++}if(B[1]){score(g,B[1]);n++}
        if(B[0]){if(rnd()<.45+.2*X(B[0].c.r.spd)){if(armOut(F,B[0],.03)){out(g,1);cr(F);ex=` (${F.c.name} 홈 보살, ${B[0].c.name} 아웃)`}else{score(g,B[0]);n++}}else nb[2]=B[0]}g.bases=nb;txt=`${dd} 2루타${ex}`}
      else{const nb=[run,null,null],dr=pick(DIR),F=fld(OFP[dr]);let ex='';if(B[2]){score(g,B[2]);n++}
        if(B[1]){if(rnd()<.65+.2*X(B[1].c.r.spd)+(ofx.xb||0)){if(g.outs<3&&armOut(F,B[1],.035)){out(g,1);cr(F);ex=` (${F.c.name} 홈 보살, ${B[1].c.name} 아웃)`}else{score(g,B[1]);n++}}else nb[2]=B[1]}
        if(B[0]&&g.outs<3){if(!nb[2]&&rnd()<.27+.15*X(B[0].c.r.spd)+(g.hnr?.35+(ofx.hnr||0):0)+(ofx.xb||0)){if(armOut(F,B[0],.02)){out(g,1);cr(F);ex+=` (${F.c.name} 3루 보살, ${B[0].c.name} 아웃)`}else nb[2]=B[0]}else nb[1]=B[0]}g.bases=g.outs<3?nb:[null,null,null];txt=`${dr}전 안타${ex}`}}
    else{const o0=g.outs,gb=rnd()<.48,fp=gb?pick(['P','1B','2B','SS','3B','SS','2B']):pick(['LF','CF','RF','LF','CF','RF','2B','SS']),FD=fld(fp);
      // 실책: 그 타구를 처리한 야수의 수비가 낮을수록 잦음(수비 90 기준 2.5%)
      if(FD&&rnd()<cl(.025-.012*DX(FD.d),.006,.07)){ce(FD);if(B[2]&&B[1]&&B[0]){n=force(g,run)}else{if(B[2]){score(g,B[2]);n++}const nb=[run,B[0]||null,B[1]||null];g.bases=nb}txt=`${PK[fp]} 실책으로 출루`}
      else if(gb){
        if(B[0]&&o0<2&&rnd()<(.28-.1*X(br.spd))*(g.hnr?.25:1)){out(g,2);B[0]=null;txt='병살타';if(g.outs<3){if(B[2]){score(g,B[2])}B[2]=B[1];B[1]=null}}
        else{out(g,1);txt=`${fp==='P'?'투수':PK[fp]} 땅볼`;
          const adv=ofx.adv||0;if(g.outs<3){if(B[2]&&rnd()<(g.inf?.12:.45)+(ofx.sf||0)+adv){score(g,B[2]);n++;B[2]=null}if(B[1]&&!B[2]&&rnd()<.5+adv){B[2]=B[1];B[1]=null}if(B[0]&&!B[1]&&rnd()<.5+adv){B[1]=B[0];B[0]=null}}}}
      else{out(g,1);txt=`${PK[fp]} ${rnd()<.2?'파울 ':''}플라이 아웃`;
        if(g.outs<3&&B[2]&&rnd()<.6+.2*X(B[2].c.r.spd)+(ofx.sf||0)){if(['LF','CF','RF'].includes(fp)&&armOut(FD,B[2],.03)){const s3=B[2];out(g,1);cr(FD);B[2]=null;txt+=` (${FD.c.name} 홈 보살, ${s3.c.name} 태그아웃)`}else{score(g,B[2]);n++;B[2]=null;txt+=' (희생플라이)'}}}}}
  bs.rbi+=n;const ran=g.sc[bat]-sb;
  say(g,`${b.name}: ${txt}${ran?` — ${ran}점 (${g.sc[0]}:${g.sc[1]})`:''}`,big||(ran?'r':''));
  g.idx[bat]=(g.idx[bat]+1)%9;
  if(g.half===1&&g.inn>=9&&g.sc[1]>g.sc[0]){g.line[1].push(g.hr);say(g,`끝내기! ${g.t[1].name} 승리`,'e');finish(g);return}
  if(g.outs>=3)endHalf(g)}
function force(g,run){const B=g.bases;let n=0;if(B[0]){if(B[1]){if(B[2]){score(g,B[2]);n++}B[2]=B[1]}B[1]=B[0]}B[0]=run;return n}
function endHalf(g){
  g.line[g.half].push(g.hr);g.hr=0;g.outs=0;g.bases=[null,null,null];
  if(g.half===0){if(g.inn>=9&&g.sc[1]>g.sc[0]){g.line[1].push('X');finish(g);return}g.half=1}
  else{if(g.inn>=9&&g.sc[0]!==g.sc[1]){finish(g);return}if(g.inn>=12){finish(g);return}g.inn++;g.half=0}
  say(g,`${g.inn}회${g.half?'말':'초'}`,'i')}
function finish(g){g.done=true;const [a,h]=g.sc;g.res=a>h?0:h>a?1:-1;
  say(g,`경기 종료 ${g.t[0].name} ${a} : ${h} ${g.t[1].name}${g.res<0?' (12회 무승부)':''}`,'e')}
function tactic(g,kind,arg){g.pending={kind,arg}}
function simAll(g){let k=0;while(!g.done&&k++<2000)pa(g);return g}

function bestLineup(ids){
  const cs=exTrim(ids.map(id=>byId[id]).filter(Boolean)),bats=cs.filter(c=>c.type==='B'),used=new Set(),slots=[];
  for(const p of ['C','SS','2B','CF','3B','RF','LF','1B']){let b=null,bs=-1e9;for(const c of bats){if(used.has(pkt(c))||!canPlay(c,p))continue;const s=batVal(c)+effDef(c,p)*.6;if(s>bs){bs=s;b=c}}if(b){slots.push({c:b,pos:p});used.add(pkt(b))}}
  let dh=null;for(const c of bats)if(!used.has(pkt(c))&&(!dh||batVal(c)>batVal(dh)))dh=c;if(dh){slots.push({c:dh,pos:'DH'});used.add(pkt(dh))}
  const ps=cs.filter(c=>c.type==='P').sort((a,b)=>b.ovr-a.ovr),rot=[],pen=[];
  for(const c of ps)if(c.pos==='SP'&&rot.length<5&&!used.has(pkt(c))){rot.push(c.id);used.add(pkt(c))}
  const rps=ps.filter(c=>c.pos==='RP'&&!used.has(pkt(c))).sort((a,b)=>(b.r.men+b.ovr)-(a.r.men+a.ovr));
  for(const c of rps)if(pen.length<6){pen.push(c.id);used.add(pkt(c))}
  for(const c of ps)if(!used.has(pkt(c))){if(rot.length<5)rot.push(c.id);else if(pen.length<6)pen.push(c.id);else continue;used.add(pkt(c))}
  const bench=bats.filter(c=>!used.has(pkt(c))).sort((a,b)=>b.ovr-a.ovr).slice(0,5).map(c=>{used.add(pkt(c));return c.id});
  return {lineup:order(slots).map(x=>({id:x.c.id,pos:x.pos})),bench,rot,pen}}
function teamYear(key){const [y,t]=key.split(' '),ids=TEAMYEARS[key],c=byId[ids[0]];
  return {name:`${y} ${t}`,full:`${y} ${t}`,key,color:LINE_COLOR[c.line]||'#555',...bestLineup(ids),rotIdx:0}}
function teamOvr(T){const cs=[...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean);return Math.round(cs.reduce((s,c)=>s+c.ovr,0)/Math.max(1,cs.length))}
function rr(n){const t=[...Array(n).keys()],R=[];for(let r=0;r<n-1;r++){const pr=[];for(let i=0;i<n/2;i++){const a=t[i],b=t[n-1-i];pr.push(r%2?[a,b]:[b,a])}R.push(pr);t.splice(1,0,t.pop())}return R}
if(typeof module!=='undefined'&&typeof window==='undefined')module.exports={EX_MAX,exCount,exErr,exTrim,SYN_EX_MAX,baseId,condMin,sameTY,FX_FAM,pkt,ADJ,ADJ_PCT,adjPair,adjBonus,ABD,AB_BY,AB_CAP,ABG,ageOf,abAge,abRoll,SK_MUL,BO_PEN,BO_TH,BO_PA,BO_OBP,BO_OPS,rates,boKey,boScore,boOf,slotBo,boOk,PAT,patOf,openCount,isOpen,TCARDS,TC_BY,SUPS,SUP_BY,synth,clash,battery,TAC_DEF,MANAGERS,tactic,loadCards,get CARDS(){return CARDS},get byId(){return byId},get TEAMYEARS(){return TEAMYEARS},simTeam,mkGame,pa,simAll,teamYear,bestLineup,teamOvr,rr,teamColor,mkBlock,cellsOf,canPlace,skillOf,setRnd:f=>{rnd=f}};
