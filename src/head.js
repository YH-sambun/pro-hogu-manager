// ===== 프로호구 매니저 v2 : 카드 모델 + 덱 효과 + 스킬 블록 + 경기 엔진 =====
const LINE_COLOR={LG:'#b3134b',KIA:'#c8102e',두산:'#23214f',삼성:'#0a5fb4',롯데:'#16326b',한화:'#e8691b',현대:'#2f7d6d',SK:'#c22a2a',키움:'#7b1530',NC:'#1d4f8a',KT:'#2b2b2b'};
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
const COST_CAP=175,ROSTER={bat:9,bench:5,sp:5,rp:6} // 불펜: [마무리, 셋업, 중계1~4];
function loadCards(json){
  CARDS=json.cards.map(c=>{
    const name=c.n.replace(/#\d+$/,''),r={},keys=c.k==='B'?BK:PKEY;keys.forEach((k,i)=>r[k]=c.r[i]);
    const mvp=MVP.has(name+c.y);if(mvp)for(const k in r)if(k!=='sta')r[k]=Math.min(99,r[k]+3);
    const cost=Math.min(10,c.c+(mvp?1:0));
    return {id:c.y+'-'+c.t+'-'+c.n,name,year:c.y,team:c.t,line:c.l,type:c.k,pos:c.p,ps:c.ps||null,r,pt:c.pt||null,s:c.s,cost,ovr:c.o+(mvp?2:0),mvp,
      tier:cost>=9?'L':cost>=6?'S':'N',kmh:c.k==='P'?Math.round(128+c.r[0]*.27):null,img:c.img||null,hs:c.hs||null,reg:c.rg||null,pat:c.pat!=null?c.pat:null}});
  byId=Object.fromEntries(CARDS.map(c=>[c.id,c]));TEAMYEARS={};
  for(const c of CARDS)(TEAMYEARS[c.year+' '+c.team]=TEAMYEARS[c.year+' '+c.team]||[]).push(c.id)}
// 시뮬레이션용 능력치로 변환
function simR(c,r){r=r||c.r;return c.type==='B'?{con:r.con,pow:r.pow,eye:r.eye,spd:r.spd,def:r.def,men:r.men,bun:r.bun}:{stu:r.vel*.3+r.stu*.35+r.brk*.35,ctl:r.ctl,sta:r.sta,men:r.men}}
const batVal=c=>c.r.con*.35+c.r.pow*.35+c.r.eye*.2+c.r.spd*.1;
function effDef(c,pos){if(pos==='DH')return 0;if(c.ps&&c.ps[pos]!=null)return c.ps[pos];const d=c.r.def,m=c.pos;
  const IF=['2B','3B','SS'],OF=['LF','CF','RF'];
  if(pos==='C')return d*.35;if(pos==='1B')return d*.8;if(m==='DH')return d*.5;
  if(IF.includes(pos)&&IF.includes(m))return d*.85;if(OF.includes(pos)&&OF.includes(m))return d*(pos==='CF'?.85:.92);
  if(m==='1B')return d*.6;return d*.65}
const canPlay=(c,pos)=>pos==='DH'||(c.ps?c.ps[pos]!=null:c.pos===pos);
function order(slots){
  const L=[...slots].sort((a,b)=>batVal(b.c)-batVal(a.c)),rest=L.slice(3).sort((a,b)=>(b.c.r.spd+b.c.r.con)-(a.c.r.spd+a.c.r.con));
  const lead=rest.shift();return [lead,L[1],L[0],L[2],...rest].filter(Boolean)}
// ===== 덱 효과 (팀컬러) =====
// 1군 25명(타자 9 + 벤치 4 + 선발 5 + 불펜 7) 기준. 연도 계열 최고 1개 + 구단 계열 최고 1개가 겹쳐 적용.
const REGION_OF=(c)=>{const t=c.team;if(['MBC','LG','OB','두산','넥센','히어로즈','우리','키움'].includes(t))return '서울';if(['롯데','NC'].includes(t))return '부산·경남';
  if(['해태','KIA','쌍방울'].includes(t))return '호남';if(t==='삼성')return '대구·경북';if(['삼미','청보','태평양','SK','SSG'].includes(t)||(t==='현대'&&c.year<2000))return '인천';
  if(['현대','KT'].includes(t))return '경기';return '충청'};
const yearKey=c=>(c.year<=1987?'1982-87':String(c.year))+' '+c.line;
function teamColor(cards){
  const cnt=f=>{const m={};for(const c of cards){const k=f(c);m[k]=(m[k]||0)+1}return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const yk=cnt(yearKey),ln=cnt(c=>c.line),rg=cnt(REGION_OF),cost=cards.reduce((s,c)=>s+c.cost,0),fx=[];
  // 연도 계열
  let Y=null;const [y1,n1]=yk[0]||[];
  if(n1>=25)Y={n:`단일연도 S (${y1})`,b:8,p:6};else if(n1>=20)Y={n:`단일연도 A (${y1})`,b:5,p:4};else if(n1>=12)Y={n:`단일연도 B (${y1})`,b:3,p:2};
  const byLine={};for(const [k,n] of yk){const l=k.split(' ')[1];(byLine[l]=byLine[l]||[]).push([k,n])}
  for(const l in byLine){const a=byLine[l];if(a.length>=2&&a[0][1]>=8&&a[1][1]>=8&&a[0][1]+a[1][1]>=25&&(!Y||Y.b<5))Y={n:`연도 듀얼 (${a[0][0].split(' ')[0]}+${a[1][0].split(' ')[0]} ${l})`,b:5,p:4}}
  // 구단 계열
  let F=null;const [l1,m1]=ln[0]||[];
  if(m1>=25)F={n:`단일구단 A (${l1})`,b:5+(cost>=140?2:0),p:3+(cost>=140?2:0)};else if(m1>=15)F={n:`단일구단 B (${l1})`,b:3,p:2};
  if(!F&&ln.length>=2&&ln[0][1]>=10&&ln[1][1]>=10&&ln[0][1]+ln[1][1]>=25)F={n:`라이벌 듀얼 (${ln[0][0]}+${ln[1][0]})`,b:3,p:2};
  if((!F||F.b<3)&&rg[0]&&rg[0][1]>=25)F={n:`지역 (${rg[0][0]})`,b:3,p:2};
  if(Y)fx.push(Y);if(F)fx.push(F);
  return {fx,bat:fx.reduce((s,x)=>s+x.b,0),pit:fx.reduce((s,x)=>s+x.p,0),top:{year:yk[0],line:ln[0]},cost}}
// ===== 스킬 블록 =====
const SHAPES={I2:[[0,0],[0,1]],I3:[[0,0],[0,1],[0,2]],V3:[[0,0],[1,0],[1,1]],O:[[0,0],[0,1],[1,0],[1,1]],I4:[[0,0],[0,1],[0,2],[0,3]],T:[[0,0],[0,1],[0,2],[1,1]],L:[[0,0],[1,0],[2,0],[2,1]],J:[[0,1],[1,1],[2,1],[2,0]],S:[[0,1],[0,2],[1,0],[1,1]],Z:[[0,0],[0,1],[1,1],[1,2]]};
const GRADES={C:{m:.75,w:50},B:{m:1,w:30},A:{m:1.25,w:15},S:{m:1.5,w:5}};
const GRID=4;
function mkBlock(t,g){const sh=pick(Object.keys(SHAPES));
  if(!g){let u=rnd()*100;g='C';for(const k of ['S','A','B','C']){if((u-=GRADES[k].w)<0){g=k;break}}}
  const keys=t==='B'?BK:PKEY,pts=Math.max(1,Math.round(SHAPES[sh].length*GRADES[g].m)),ks=[...keys].sort(()=>rnd()-.5).slice(0,1+Math.floor(rnd()*3)),st={};
  for(let i=0;i<pts;i++){const k=ks[i%ks.length];st[k]=(st[k]||0)+1}
  return {u:'b'+Date.now().toString(36)+Math.floor(rnd()*1e6).toString(36),sh,g,t,st,rot:0,on:null,at:null}}
function cellsOf(b){let c=SHAPES[b.sh].map(x=>[...x]);for(let i=0;i<(b.rot||0)%4;i++)c=c.map(([r,q])=>[q,-r]);
  const mr=Math.min(...c.map(x=>x[0])),mc=Math.min(...c.map(x=>x[1]));return c.map(([r,q])=>[r-mr,q-mc])}
// 열린 칸: 등급 기본(노멀 6, 스타 9, 레전드 12) + 출전 8경기마다 1칸, 최대 16
const openCount=(c,gp)=>Math.min(16,({N:6,S:9,L:12}[c.tier])+Math.floor((gp||0)/8));
const isOpen=(c,gp,r,q)=>r*GRID+q<openCount(c,gp);
function canPlace(card,gp,blocks,b,r0,q0){for(const [r,q] of cellsOf(b)){const R=r+r0,Q=q+q0;if(R<0||Q<0||R>=GRID||Q>=GRID||!isOpen(card,gp,R,Q))return false;
  if(blocks.some(o=>o.on===card.id&&o.u!==b.u&&cellsOf(o).some(([a,d])=>a+o.at[0]===R&&d+o.at[1]===Q)))return false}return true}
function skillOf(id,blocks){const s={};for(const b of blocks||[])if(b.on===id)for(const k in b.st)s[k]=(s[k]||0)+b.st[k];return s}
// ===== 시뮬레이션 팀 =====
// T={name,color,lineup:[{id,pos}],rot:[id],pen:[id],rotIdx,blocks?}, cond: id->1..5
function simTeam(T,cond){
  const all=[...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean);
  const tc=teamColor(all),mod=c=>{const raw={...c.r},sk=skillOf(c.id,T.blocks);const bon=c.type==='B'?tc.bat:tc.pit;for(const k in raw){if(k!=='sta')raw[k]+=bon;raw[k]=Math.min(115,raw[k]+(sk[k]||0))}
    const r=simR(c,raw),m=COND[(cond&&cond[c.id])||3].m;if(c.type==='B'){r.con*=1+m;r.eye*=1+m/2}else{r.ctl*=1+m;r.stu*=1+m/2}
    const ps=c.ps?Object.fromEntries(Object.entries(c.ps).map(([p,v])=>[p,v+bon+(sk.def||0)])):null;return {...c,r,ps,rawr:raw}};
  const lu=T.lineup.map(x=>({c:mod(byId[x.id]),pos:x.pos}));
  const w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1,fld=lu.filter(x=>x.pos!=='DH');
  const def=fld.reduce((s,x)=>s+effDef(x.c,x.pos)*w(x.pos),0)/fld.reduce((s,x)=>s+w(x.pos),0);
  return {name:T.name,color:T.color,lu,sp:mod(byId[T.rot[(T.rotIdx||0)%T.rot.length]]),pen:T.pen.map(id=>mod(byId[id])),def,tc}}
