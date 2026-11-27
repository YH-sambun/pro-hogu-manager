// ===== 프로호구 매니저 v2 : 카드 모델 + 덱 효과 + 스킬 블록 + 경기 엔진 =====
const LINE_COLOR={LG:'#b3134b',KIA:'#c8102e',두산:'#23214f',삼성:'#0a5fb4',롯데:'#16326b',한화:'#e8691b',SK:'#c22a2a',키움:'#7b1530',NC:'#1d4f8a',KT:'#2b2b2b',국가대표:'#0b3d91'};
const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
const PK={C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자',SP:'선발',RP:'불펜'};
const PS={C:'포',  '1B':'1루','2B':'2루','3B':'3루',SS:'유격',LF:'좌',CF:'중',RF:'우',DH:'지명'};
const BK=['con','pow','eye','bun','spd','def','men'],PKEY=['vel','stu','brk','ctl','sta','men'];
const SKN={con:'교타',pow:'장타',eye:'선구',bun:'번트',spd:'주력',def:'수비',men:'정신',vel:'구속',stu:'구위',brk:'변화',ctl:'제구',sta:'체력'};
const MVP=new Set('박철순1982 이만수1983 최동원1984 김성한1985 선동열1986 장효조1987 김성한1988 선동열1989 선동열1990 장종훈1991 장종훈1992 김성래1993 이종범1994 김상호1995 구대성1996 이승엽1997 우즈1998 이승엽1999 박경완2000 이승엽2001 이승엽2002 이승엽2003 배영수2004 손민한2005 류현진2006 리오스2007 김광현2008 김상현2009 이대호2010 윤석민2011 박병호2012 박병호2013 서건창2014 테임즈2015 니퍼트2016 양현종2017 김재환2018 린드블럼2019 로하스2020 미란다2021 이정후2022 페디2023 김도영2024'.split(' '));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)), X=v=>(v-70)/30;
let MEN_K=.4;const MEN_B=85,MEN_P=77; // 승부처(득점권·7회 이후 2점 차 이내) 정신력 계수(2026-11-27 SJ: .2→.4, 평균 정신력(타 85·투 77) 기준 차이만 2배라 리그 평균 득점은 그대로). 1루에만 주자면 절반
let rnd=Math.random;const pick=a=>a[Math.floor(rnd()*a.length)];
let CARDS=[],byId={},TEAMYEARS={};
const TIER={N:'노멀',S:'스타',L:'레전드'};
const GRADE=v=>v>=115?'SS+':v>=110?'SS':v>=100?'S+':v>=90?'S':v>=80?'A':v>=70?'B':v>=60?'C':'D';
const COND=[null,{n:'최악',m:-.2},{n:'나쁨',m:-.1},{n:'보통',m:0},{n:'좋음',m:.04},{n:'최상',m:.08}];
const baseId=id=>String(id).replace(/~\d+$/,''); // 보유 중복 카드 id는 '기본id~k'('#k'는 동명이인 접미사라 따로 씀)
// EX 제한(2026-11-24, SJ): 1군 25명 중 EX는 타자 1명·투수 1명까지
// 이름 붙은 라이벌 덱 효과(계보 키 기준)
const RIVALS=[['롯데','NC','낙동강 더비'],['SK','KT','통신사 더비'],['두산','LG','잠실 더비'],['삼성','롯데','클래식 시리즈'],['KIA','삼성','영호남 더비']];
// FA 이적 인연 덱 효과(A): 그 선수 카드(아무 시즌) 1장 이상 + 두 계보 각 10명 이상·합계 25명 이상(벤치 포함 25명). [선수, 계보A, 계보B]
const FA_LINKS=[['강민호','롯데','삼성'],['최형우','삼성','KIA'],['김현수','두산','LG'],['양의지','두산','NC'],['손아섭','롯데','NC'],['정근우','SK','한화'],['이용규','KIA','한화'],['박석민','삼성','NC'],['차우찬','삼성','LG'],['황재균','롯데','KT'],['민병헌','두산','롯데'],['채은성','LG','한화'],['박건우','두산','NC'],['나성범','NC','KIA'],['유강남','LG','롯데'],['홍성흔','두산','롯데'],['심정수','키움','삼성'],['박진만','키움','삼성'],['안치홍','KIA','롯데'],['오재일','두산','삼성'],['최주환','두산','SK'],['박해민','삼성','LG'],['정우람','SK','한화'],['손승락','키움','롯데'],['정수근','두산','롯데'],['김주찬','롯데','KIA'],['장원준','롯데','두산']];
// 묶음 계보 덱 효과: 엘롯기 = LG·롯데·KIA(각 4명 이상). 구도 인천 = 삼미·청보·태평양·현대·우리·히어로즈·넥센·키움(키움 계보) + 쌍방울·SK·SSG(SK 계보). 흥참동(흥행 참패 동맹) = SK·KT·키움·NC 계보(각 3명 이상)
// [이름, 계보들, 계보별 최소 인원]. 합계 25명 이상(벤치 포함)
const LINE_UNIONS=[ // 2026-11-26(SJ): 옛 '구도 인천'(키움+SK 계보) 폐기. 현대·넥센·키움은 인천이 아님 → 삼미·청보·태평양 시대 세트가 '구도 인천'
 ['엘롯기',['LG','롯데','KIA'],4,'LG·롯데·KIA'],['흥참동',['SK','KT','키움','NC'],3,'SSG·KT·키움·NC'],['아섭동맹',['롯데','NC','한화'],3,'손아섭이 뛴 롯데·NC·한화']];
// 이름 세트(SJ 2026-11-25): [이름, 계보(null이면 무관), 선수('이름' 또는 '이름:연도'), A 인원, S 인원]. 같은 선수는 1명으로 셈
// 히어로즈 메이저리거: 메이저리그로 가기 전 대표 시즌(강정호 2014 40홈런, 박병호 2015 53홈런, 김하성 2020 30홈런, 이정후 2022 MVP, 송성문 2025)
const NAME_SETS=[['히어로즈 메이저리거','키움',['강정호:2014','박병호:2015','김하성:2020','이정후:2022','송성문:2025'],4,5],
 ['작은 거인',null,['김선빈','김지찬','김성윤','정준재','이용규','정근우'],4,6,3]]; // 단신으로 유명한 선수들(SJ). 연도 무관. 3명 B
// 국가대표 우승(SJ 2026-11-25): 우승 대회 최종 명단의 '그해 카드'를 모으면 발동. 단일연도와 별개라 같은 팀 국대 멤버는 둘 다에 셈
// [이름, 카드 연도, 명단(공백 구분, '이름@계보/타입'으로 동명이인 구분)]. 출처: 위키백과 아시안게임 야구 메달리스트, OSEN·전북일보·경북매일·엑스포츠뉴스·서울신문 엔트리 기사(대체 발탁 반영)
const NAT_SETS=[["1998 방콕 AG 금메달",1998,"백재호 장영균 조인성 최원호 홍성흔 황우구 진갑용 강봉규 강철민 강혁 김병현 김동주 김원형 경헌호 이병규 임창용 박찬호 박한이 박재홍 서재응 심재학 신명철"],["2002 부산 AG 금메달",2002,"노장진 이승호 송진우 박명환 임창용 김진우 조용준 정재복 이상훈@LG/P 김상훈 홍성흔 장성호 박진만 김한수 김동주 김민재 김종국 이승엽 이종범 이병규 이영우 박재홍"],["2008 베이징 올림픽 금메달",2008,"윤석민 오승환 송승준 한기주 김광현 류현진 권혁 봉중근 장원삼 정대현 진갑용 강민호 정근우 김동주 고영민 김민재 박진만 이대호 이승엽 이진영 김현수 이종욱 이용규 이택근"],["2010 광저우 AG 금메달",2010,"류현진 임태훈 양현종 봉중근 윤석민 안지만 송은범 김명성 정대현 고창성 박경완 강민호 김태균 이대호 정근우 최정 조동찬 손시헌 강정호 김현수 이종욱 이용규 김강민 추신수"],["2014 인천 AG 금메달",2014,"안지만 유원상 이태양@한화 홍성무 김광현 봉중근 양현종 차우찬 이재학 임창용 한현희 강민호 이재원 박병호 오재원 김민성 황재균 강정호 김상수 김현수 민병헌 나성범 나지완 손아섭"],["2015 프리미어12 우승",2015,"장원준 이대은 이태양@NC 우규민 차우찬 김광현 심창민 조상우 조무근 임창민 정대현 정우람 이현승 양의지 강민호 박병호 이대호 정근우 오재원 박석민 황재균 김상수 김재호 민병헌 나성범 김현수 손아섭 이용규"],["2018 자카르타 AG 금메달",2018,"박병호 김현수 양현종 양의지 김재환 손아섭 정우람 안치홍 오지환 박해민 김하성 박민우 이용찬 임찬규 박종훈 임기영 박치국 최충연 함덕주 이재원 이정후 황재균 최원태 장필준"],["2022 항저우 AG 금메달",2023,"고우석 정우영 박영현 원태인 나균안 박세웅 곽빈 문동주 장현석 최지민 김영규 김동헌 김형준 박성한 김혜성 문보경 강백호 김주원 김지찬 노시환 최지훈 최원준@KIA/B 김성윤 윤동희"],["2026 나고야 AG 금메달",2026,"김영우 조병현 배찬승 박영현 소형준 오원석 최준용 김진욱 성영탁 곽빈 최민석 조형우 김건희 문보경 노시환 정준재 이재현 김주원 김도영 박준순 문현빈 김지찬 윤동희 박재현"]];
const natHit=(c,y,e)=>{const [n,q]=e.split('@'),[l,t]=(q||'').split('/');return c.year===y&&(c.on||c.name)===n&&(!l||c.line===l)&&(!t||c.type===t)};
// 우승 멤버(SJ 2026-11-26): 그해 한국시리즈 우승팀(1985 삼성은 통합우승) 카드. 구단 섞어도 됨. 팀명 기준이라 현대 우승은 현대 카드만(키움 계보여도 히어로즈 카드는 아님)
const CHAMPS={1982:'OB',1983:'해태',1984:'롯데',1985:'삼성',1986:'해태',1987:'해태',1988:'해태',1989:'해태',1990:'LG',1991:'해태',1992:'롯데',1993:'해태',1994:'LG',1995:'OB',1996:'해태',1997:'해태',1998:'현대',1999:'한화',2000:'현대',2001:'두산',2002:'삼성',2003:'현대',2004:'현대',2005:'삼성',2006:'삼성',2007:'SK',2008:'SK',2009:'KIA',2010:'SK',2011:'삼성',2012:'삼성',2013:'삼성',2014:'삼성',2015:'두산',2016:'두산',2017:'KIA',2018:'SK',2019:'두산',2020:'NC',2021:'KT',2022:'SSG',2023:'LG',2024:'KIA',2025:'LG',2026:'삼성'};
const isChamp=c=>!!c&&CHAMPS[c.year]===c.team;
const nsHit=(c,e)=>{const [n,y]=e.split(':');return (c.on||c.name)===n&&(!y||c.year===+y)};
// 시대 덱 효과: [이름, 계보, 시작 연도, 끝 연도, 필요 인원(벤치 포함 25명 중)]. 비밀번호 8888577 = 롯데 2001~2007 순위(8·8·8·8·5·7·7)
const ERA_SETS=[['비밀번호 8888577','롯데',2001,2007,25],
 // 2026-11-26(SJ): 사라진 구단 전 연도 묶음. 6번째 값은 추천 목록 표시용 구단명(계보 이름 대신)
 ['구도 인천','키움',1982,1995,25,'삼미·청보·태평양',15],['방울이돌격대','SK',1991,1999,25,'쌍방울',15]]; // 7번째 값: 정신력 추가 보너스(SJ 2026-11-26: 15, 승부처 능력치 약 +3)
// Again 우승년도 덱(SJ 2026-11-26): 구단별 세 해에서 해마다 최대 7명(21명) + 같은 계열 EX·커하·영구결번 와일드 2장 = 23명이면 발동(S칸).
// [구단 표시명, 팀명들, 세 해, 와일드 계보(l), 와일드 팀명(계보 대신)]. 균형: 와일드 포함 추정 76.1~77.5 (notes/우승덱_조합.md)
const AGAIN_Y=7,AGAIN_NEED=23,HERO=['우리','히어로즈','넥센','키움'];
const AGAIN_SETS=[['해태',['해태'],[1987,1989,1991],'KIA'],['KIA',['KIA'],[2002,2017,2024],'KIA'],['삼성',['삼성'],[2003,2014,2026],'삼성'],['OB',['OB'],[1982,1990,1995],'두산'],['두산',['두산'],[2001,2013,2015],'두산'],
 ['SK',['SK'],[2007,2008,2010],'SK'],['SSG',['SSG'],[2022,2025,2026],'SK'],['LG',['LG'],[1994,2007,2023],'LG'],['현대',['현대'],[1998,2000,2007],null,['삼미','청보','태평양','현대']],['롯데',['롯데'],[1984,1992,2008],'롯데'],
 ['빙그레',['빙그레'],[1989,1991,1992],'한화'],['한화',['한화'],[1999,2006,2007],'한화'],['KT',['KT'],[2021,2023,2026],'KT'],['NC',['NC'],[2014,2020,2021],'NC'],['넥센',['우리','히어로즈','넥센'],[2011,2013,2014],null,HERO],['키움',['키움'],[2019,2021,2022],null,HERO]];
const againName=(t,ys)=>`Again ${t} ${ys.map(y=>String(y%100).padStart(2,'0')).join('·')}`,againHit=(a,c)=>a[1].includes(c.team)&&a[2].includes(c.year),againWild=(a,c)=>(c.v==='EX'||c.v==='CH'||c.v==='RN')&&!againHit(a,c)&&(a[4]?a[4].includes(c.team):c.line===a[3]);
function againCount(a,cards){const yc={};let k=0,w=0;for(const c of cards){if(!c)continue;if(againHit(a,c)){yc[c.year]=(yc[c.year]||0)+1;if(yc[c.year]<=AGAIN_Y)k++}else if(againWild(a,c)&&w<2){w++;k++}}return k} // 2026-11-25(SJ): 벤치 포함 25명 전원. EX·영구결번·커리어하이(같은 계보)는 와일드카드로 셈
// 덱 추천 목표(SJ 2026-11-25): 원하는 덱 효과를 고르면 그 조건에 맞는 카드를 우선. m=조건 카드, s=꼭 넣을 선수(FA 이적)
const FX_LINES=['KIA','KT','LG','NC','SK','두산','롯데','삼성','키움','한화'],FX_LN={SK:'SSG(SK)',키움:'키움(현대·넥센)'};
const FX_TARGETS=[...FX_LINES.map(l=>({k:'L:'+l,g:'단일구단',n:FX_LN[l]||l,m:c=>c.line===l,ls:[l]})),
 ...LINE_UNIONS.map(([n,ls,mn,lb])=>({k:'U:'+n,g:'묶음',n:`${n} (${lb||ls.join('·')})`,m:c=>ls.includes(c.line),ls,q:Object.fromEntries(ls.map(l=>[l,mn||1]))})),
 ...RIVALS.map(([a,b,n])=>({k:'R:'+n,g:'라이벌',n:`${n} (${FX_LN[a]||a}·${FX_LN[b]||b})`,m:c=>c.line===a||c.line===b,ls:[a,b],q:{[a]:10,[b]:10}})),
 ...AGAIN_SETS.map(a=>({k:'A:'+a[0],g:'우승년도',n:againName(a[0],a[2]),m:c=>againHit(a,c),wild:c=>againWild(a,c)&&c.v!=='RN',ls:a[4]?[]:[a[3]],ycap:AGAIN_Y})),
 ...ERA_SETS.map(([n,l,y0,y1,need,lb])=>({k:'E:'+n,g:'시대',n:`${n} (${lb||l} ${y0}~${y1})`,m:c=>c.line===l&&c.year>=y0&&c.year<=y1,ls:[l]})),
 {k:'S:AS',g:'특별',n:'올스타덱',m:c=>c.v==='AS'},{k:'S:GG',g:'특별',n:'골든글러브덱',m:c=>c.v==='GG'},
 // 이름 세트: 풀은 전체 카드(loose), 명단 선수는 must로 꼭 넣음. 좌완 왕국·좌타 라인업: 투수/타자만 왼손으로 제한(EX 와일드카드 없음)
 ...NAME_SETS.map(([n,l,names])=>({k:'N:'+n,g:'특별',n,m:c=>(!l||c.line===l)&&names.some(e=>nsHit(c,e)),loose:1,must:names})),
 ...NAT_SETS.map(([n,y,ls])=>{const L=ls.split(' ');return {k:'K:'+n,g:'국가대표',n,m:c=>c.year===y,ls:[],must:L,mhit:(c,e)=>natHit(c,y,e)}}),
 {k:'H:잠수함 군단',g:'특별',n:'잠수함 군단 (언더·사이드 투수)',m:c=>c.type!=='P'||!!c.arm,ls:[]},{k:'H:좌완 왕국',g:'특별',n:'좌완 왕국 (투수 전원 좌투)',m:c=>c.type!=='P'||c.ph==='L',ls:[]},{k:'H:좌타 라인업',g:'특별',n:'좌타 라인업 (타자 전원 좌타·스위치)',m:c=>c.type!=='B'||c.bh==='L'||c.bh==='S',ls:[]},
 ...FA_LINKS.map(([p,a,b])=>({k:'F:'+p,g:'FA 이적',n:`${p} (${a}·${b})`,m:c=>c.line===a||c.line===b,ls:[a,b],s:p,q:{[a]:10,[b]:10}}))];
const FX_T_BY=Object.fromEntries(FX_TARGETS.map(t=>[t.k,t]));
const CH_WILD=1; // 커리어하이: 연도 무관으로 단일연도 인원에 넣을 수 있는 장수
const EX_MAX={B:1,P:1},exCount=ids=>{const n={B:0,P:0};for(const id of ids){const c=byId[baseId(id)];if(c&&c.v==='EX')n[c.type]++}return n},
  exErr=ids=>{const n=exCount(ids),e=[];if(n.B>EX_MAX.B)e.push(`EX 타자는 ${EX_MAX.B}명까지 쓸 수 있어요(지금 ${n.B}명)`);if(n.P>EX_MAX.P)e.push(`EX 투수는 ${EX_MAX.P}명까지 쓸 수 있어요(지금 ${n.P}명)`);return e},
  exTrim=cs=>{const keep=new Set();for(const t of ['B','P']){const x=cs.filter(c=>c&&c.v==='EX'&&c.type===t).sort((a,b)=>b.ovr-a.ovr).slice(0,EX_MAX[t]);x.forEach(c=>keep.add(c))}return cs.filter(c=>c&&(c.v!=='EX'||keep.has(c)))};
const COST_CAP=150,ROSTER={bat:9,bench:5,sp:5,rp:6} // 불펜: [마무리, 셋업, 중계1~4];
// 투구폼(SJ 2026-11-25): 언더핸드(U)·사이드암(S) 투수. 공개 기사·위키 명단 기준(스포츠경향·OSEN·위키백과 '사이드암'), 나머지는 오버·스리쿼터로 봄
// [이름, U/S, 계보 제한, 시작 연도]. 동명이인은 계보·연도로 거름
const ARM_LIST=[["이강철","U"],["박충식","U"],["박정현","U",["키움"]],["한희민","U"],["정대현","U",["SK","롯데"]],["김병현","U"],["박종훈","U",["SK"]],["고영표","U"],["우규민","U"],["이재곤","U"],["양현","U"],["김대우","U",["키움","삼성"],2011],["임창용","S"],["김현욱","S",["삼성","KIA"]],["조웅천","S"],["권오준","S"],["심창민","S"],["임경완","S"],["배장호","S"],["유동훈","S"],["손영민","S"],["마정길","S"],["나승현","S"],["조용훈","S"],["신정락","S"],["신승현","S"],["한현희","S"],["김성배","S"],["이재학","S"],["이태양","S",["NC"]],["임기영","S"],["서준원","S"],["최원준","S",["두산"],2017],["박민호","S"],["박준표","S"],["원종현","S"],["박치국","S"],["정우영","S"],["엄상백","S"],["강재민","S"],["신재영","S"],["오현택","S"],["신용운","S"],["임치영","S"],["김선규","S"],["정재원","S",["한화"]],["정대훈","S"],["김재영","S",["한화"]],["김기표","S"],["김동혁","S",["키움"]],["전우엽","S"],["변시원","S"],["박진태","S"],["박민석","S"],["이정호","S",["두산"]],["이강준","S"],["이영욱","S",["삼성","SK"]],["김대유","S"],["김창훈","S"],["임현준","S"]];
const ARM_IDX={};for(const [n,f,ls,y0] of ARM_LIST)(ARM_IDX[n]=ARM_IDX[n]||[]).push([f,ls,y0]);
const armOf=c=>{for(const [f,ls,y0] of ARM_IDX[c.name]||[])if((!ls||ls.includes(c.line))&&(!y0||c.year>=y0))return f;return null};
const ARM_N={U:'언더핸드',S:'사이드암'};
const ALIAS={'오재원|야탑고':'오세원','이호성|광주제일고':'이호진','정형식|진흥고':'정형민','임태훈|서울고':'임태건','박현준|전주고':'박현석','김성현|P':'김선혁','문우람|광주동성고':'문우진'};
// 계보·연도까지 봐야 하는 동명이인(이태양: 넥센 2011~2012·NC 2013~2016만, 한화 이태양은 제외)
const ALIAS2=[['이태양|P',c=>c.line==='NC'||(c.line==='키움'&&c.year<=2012),'이태민']];
const aliasOf=c=>ALIAS[c.pk]||(ALIAS2.find(([k,f])=>k===c.pk&&f(c))||[])[2];
function loadCards(json){
  // MVP는 이름+연도가 같은 기본 카드 중 OVR이 가장 높은 1장만(동명이인·투타 겸업 다른 카드는 제외)
  const MB={};for(const c of json.cards){if(c.v||c.tx)continue;const k=c.n.replace(/#\d+$/,'')+c.y;if(MVP.has(k)&&(!MB[k]||c.o>MB[k].o))MB[k]=c}const MK=new Set(Object.values(MB).map(c=>c.y+'|'+c.t+'|'+c.n));
  {const A={};for(const c of json.cards){if(c.v||c.k!=='B'||!c.x)continue;const a=A[c.y]=A[c.y]||[0,0,0];a[0]+=c.x[3];a[1]+=c.x[4];a[2]+=c.x[2]-c.x[5]}LGX={};for(const y in A)if(A[y][2])LGX[y]=[A[y][0]/A[y][2],A[y][1]/A[y][2]]}
  CARDS=json.cards.map(c=>{
    const name=c.n.replace(/#\d+$/,''),r={},keys=c.k==='B'?BK:PKEY;keys.forEach((k,i)=>r[k]=c.r[i]);
    const mvp=MK.has(c.y+'|'+c.t+'|'+c.n);if(mvp)for(const k in r)if(k!=='sta')r[k]=Math.min(99,r[k]+3);
    const cost=Math.min(10,c.c+(mvp?1:0));
    return {id:c.y+'-'+c.t+'-'+c.n+(c.v?'·'+c.v:''),v:c.v||null,gg:c.gg||null,name,year:c.y,team:c.t,line:c.l,type:c.k,pos:c.p,ps:c.ps||null,r,pt:c.pt||null,pu:c.pu||null,pe:c.pe||null,s:c.s,cost,ovr:c.o+(mvp?2:0),mvp,
      tier:cost>=9?'L':cost>=6?'S':'N',kmh:c.k==='P'?Math.round(128+c.r[0]*.27):null,img:c.img||null,hs:c.hs||null,reg:RGRP[c.rg]||c.rg||null,rg0:c.rg||null,pat:c.pat!=null?c.pat:null,b:c.b||null,un:c.un||null,mx:c.mx?1:null,sx:c.sx||null,pz:c.pz||0,h:c.h||null,ph:c.h?('def'.includes(c.h)?'L':'R'):null,bh:c.h?({a:'R',b:'L',c:'S',d:'R',e:'L',f:'S'})[c.h]:null,tw:c.tw?1:0,gm:c.gm||null,sm:c.sm||null,dh:c.dh||null,st:rates(c.x),xb:c.k==='B'?xbhOf(c.x,c.y):null,bo:c.k==='B'?boOf(r,rates(c.x)):null}});
  // 선수 단위 키: 이름+출신고. 1군 중복 검사는 pkt(c)=pk+유형으로 함(투타 겸업 선수는 타자 1장+투수 1장 가능). 출신고가 없으면 같은 이름·같은 유형 카드에 출신고가 하나뿐일 때 그 값을, 아니면 유형을 씀
  const HS={};for(const c of CARDS)if(c.hs){const k=c.name+'|'+c.type;(HS[k]=HS[k]||new Set()).add(c.hs)}
  for(const c of CARDS){const h=HS[c.name+'|'+c.type];c.pk=c.name+'|'+(c.hs||(h&&h.size===1?[...h][0]:c.type))}
  const TP={};for(const c of CARDS){if(c.v)continue;const k=c.year+c.team+c.pk+c.type;(TP[k]=TP[k]||[]).push(c)}for(const k in TP)if(TP[k].length>1)for(const c of TP[k]){const m=c.id.match(/#\d+$/);if(m)c.pk+=m[0]} // 같은 팀·연도 동명이인은 따로
  {const bp={};for(const c of CARDS)if(!c.v)bp[c.id]=c.pk;for(const c of CARDS)if(c.v){const b=bp[c.id.split('·')[0]];if(b)c.pk=b}}
  for(const c of CARDS)if(c.type==='P'){const a=armOf(c);if(a)c.arm=a}
  // 가명 처리(SJ 2026-11-25): 화면 이름과 사진만 바꿈. 원래 이름은 c.on에 남겨 국가대표·이름 세트 판정에 씀. id는 저장 호환 때문에 유지
  for(const c of CARDS){const a=aliasOf(c);if(a){c.on=c.name;c.name=a;c.img=null}}
  byId=Object.fromEntries(CARDS.map(c=>[c.id,c]));TEAMYEARS={};
  for(const c of CARDS)if(!c.v)(TEAMYEARS[c.year+' '+c.team]=TEAMYEARS[c.year+' '+c.team]||[]).push(c.id)}
// 시뮬레이션용 능력치로 변환
// 구종별 땅볼 성향(등급 S~D 배율). 싱커·포크·스플리터·체인지업은 땅볼, 하이 패스트볼(직구)은 뜬공
const PT_GB={'싱커':.11,'포크':.07,'스플리터':.07,'체인지업':.045,'커브':.03,'커터':.02,'슬라이더':-.01,'직구':-.045},PT_G={S:1.5,A:1.25,B:1,C:.7,D:.4};
// 구종 등급: 카드 기본 등급 값 + 능력치 상승분(변화구는 변화, 직구는 구속. 덱 효과·스킬·서포트·유학). 97 이상은 SS·SSS·SSS+로 올라감
const PT_V={'SSS+':112,SSS:106,SS:100,S:95,A:87,B:78,C:68,D:58},PT_CUT=[[109,'SSS+'],[103,'SSS'],[97,'SS'],[91,'S'],[83,'A'],[73,'B'],[63,'C'],[0,'D']];
const ptLetter=v=>PT_CUT.find(x=>v>=x[0])[1];
function ptGrades(c,brkNow,velNow){const d=(n,k)=>n!=null&&c.r&&c.r[k]!=null?n-c.r[k]:0,up=d(brkNow,'brk'),uv=d(velNow,'vel');return Object.entries(c.pt||{}).map(([k,g])=>{const v=(PT_V[g]||68)+(k==='직구'?uv:up);return [k,ptLetter(v),v]})}
// 땅볼 성향은 등급 값이 높을수록 강해짐(B=1배). 직구는 구속이 맡음
const gbOf=(c,r)=>cl(.45+(c.arm==='U'?.05:c.arm==='S'?.03:0)+ptGrades(c,r.brk,r.vel).reduce((s,[k,,v])=>s+(PT_GB[k]||0)*Math.max(.3,v/78),0)-(r.vel-70)*.0015,.3,.66);
// 결정구 보너스: 가장 좋은 변화구가 S(95)를 넘으면 그만큼 탈삼진력 추가
const ptAce=(c,r)=>{const v=Math.max(0,...ptGrades(c,r.brk,r.vel).filter(x=>x[0]!=='직구').map(x=>x[2]));return Math.max(0,v-95)*.5};
// ── 능력치 구간 효과(SJ 2026-11-26) ── 연속 효과 위에 A(80+)·S(90+)·S+(100+) 구간을 넘으면 추가 효과
// 수비는 포지션 수비값(보통 80~100, 90이 평균)이라 A 92+·S 97+·S+ 102+. 구종은 변화구 최고 등급 S(95)·SS(100)·SSS(106)
const RTIER=v=>v>=100?3:v>=90?2:v>=80?1:0,DTIER=v=>v>=102?3:v>=97?2:v>=92?1:0;
const TIER_FX={con:'안타 확률 +0.4%p·삼진 -0.3%p',pow:'홈런 확률 +0.2%p',eye:'볼넷 확률 +0.4%p',spd:'도루 성공률 +3%p',def:'팀 피안타(BABIP) -0.08%p',kv:'탈삼진 +1%p',hv:'피안타 -0.25%p·피홈런 -0.15%p',ctl:'볼넷 허용 -0.4%p',pt:'탈삼진 +0.8%p'}; // 구간 1단계당
const ptTier=(c,r)=>{const v=Math.max(0,...ptGrades(c,r.brk,r.vel).filter(x=>x[0]!=='직구').map(x=>x[2]));return v>=106?3:v>=100?2:v>=95?1:0};

// ===== 구종 2.0 (SJ 2026-11-27) =====
// 구종별 [땅볼, 헛스윙(탈삼진), 실투 피홈런, 계열 F=직구류 B=변화구]. 등급은 C→B→A→S 단계마다 고르게 효과(PT_KC), 낮은 등급(72 미만)은 실투 피홈런
const PTX={'직구':[-.09,0,.15,'F'],'투심':[.10,.2,.08,'F'],'싱커':[.20,.3,.05,'B'],'포크':[.12,1.2,.1,'B'],'스플리터':[.12,1.15,.1,'B'],'체인지업':[.08,1,.12,'B'],'팜볼':[.10,.8,.08,'B'],'커브':[.05,1,.2,'B'],'커터':[.04,.6,.1,'B'],'슬라이더':[0,1.2,.25,'B'],'너클볼':[.03,1,.3,'B'],'스위퍼':[-.06,1.2,.25,'B']};
// 투타 6조합: RR·RL·LL·LR(정통파 투수손+타자손), US·UX(언더·사이드 같은 손·반대 손). [구사 배율, 효과 배율] — MLB Statcast 공개 투타별 구사율·헛스윙률 경향 기준(KBO 자료 생기면 교체)
const MUK=['RR','RL','LL','LR','US','UX'];
// PTM[구종][케이스]=[구사 배수, 효과 배수]. 케이스 RR 우투-우타, RL 우투-좌타, LL 좌투-좌타, LR 좌투-우타, US 언더·사이드-같은손, UX 언더·사이드-반대손
// 스위퍼(2026-11-27): Savant 2025 Sweeper — 우투 wOBA 같은손 .257/반대손 .337(슬라이더 .288/.314), 좌투 .222/.284. 구사도 같은손 쏠림이 슬라이더보다 큼
// 구사 배수: Baseball Savant 2025 정규시즌 (투수손×타자손×팔각도 30도 미만=사이드·언더) 구종 비중 ÷ 6케이스 평균, 0.35~2.0으로 자름
// 효과 배수: Savant 케이스 안 상대 효과(wOBA 60%+헛스윙 40%)와 아래 Cross 계수 기반 값을 반반
// 효과 배수 근거(2026-11-27): Cross 'Forecasting Pitcher Platoon Splits'(THT) 구종 10%p당 wOBA 스플릿 계수
//  우투: 슬라이더 +2.2, 싱커 +1.8, 커브 -5.1, 스플리터 -6.4, 체인지업 -4.0, 커터 -1.3, 너클 -18 / 좌투: 슬라이더 +4.9, 싱커 +2.3, 커브 0, 스플리터 -3.0, 체인지업 -9.1, 커터 -0.9
//  Marchi 'Platoon splits 2.0': 싱커·슬라이더 스플릿 큼, 커브·체인지업은 중립~역스플릿. 너클은 좌우 차이 없음(표에 없음 = 1배)
const PTM={'직구':[[0.96,1],[1.19,1],[0.91,0.95],[1.11,1],[0.79,1.07],[1.04,1.04]],
 '싱커':[[1.04,1.04],[0.47,0.97],[1.3,1.08],[0.63,0.97],[1.65,1.02],[0.91,0.96]],
 '투심':[[1.04,1.01],[0.47,1],[1.3,1.05],[0.63,1],[1.65,1],[0.91,0.96]],
 '커터':[[1.1,1.02],[1.22,1],[0.84,1],[1.13,1],[0.7,0.98],[1.01,0.92]],
 '슬라이더':[[1.26,1.06],[0.63,0.92],[1.4,1.13],[0.7,0.88],[1.26,1.09],[0.76,0.85]],
 '커브':[[0.77,0.98],[1.38,1.03],[0.79,1.01],[1.33,1],[0.63,0.99],[1.09,1.02]],
 '체인지업':[[0.47,0.91],[1.37,1.07],[0.35,0.89],[1.75,1.12],[0.55,0.9],[1.55,1.09]],
 '팜볼':[[0.68,0.96],[1.22,1.04],[0.58,0.99],[1.45,1.05],[0.73,0.98],[1.33,1.01]],
 '스플리터':[[1.26,0.96],[2.0,1.09],[0.35,0.93],[0.72,1],[0.5,0.92],[0.95,0.96]],
 '포크':[[1.26,0.96],[2.0,1.09],[0.35,0.93],[0.72,1],[0.5,0.92],[0.95,0.96]],
 '스위퍼':[[1.45,1.09],[0.55,0.83],[1.5,1.16],[0.6,0.79],[1.45,1.12],[0.55,0.77]]};
// 스위퍼 인플레이 피안타율(BABIP) 배수, 슬라이더 대비 (FanGraphs 'The Secret Benefit (And Cost) Of Sweeping Sliders', Statcast 우투수: 같은손 .246 vs .277, 반대손 .284 vs .268). 케이스 순서 MUK와 같음
const PTBA={'스위퍼':[.89,1.06,.89,1.06,.89,1.06]};;
let PT_KC=.0015,PT_GB0=.47,PT_C=66,PT_HR0=.88;
const muKey=(pc,bh)=>{const ph=pc.ph||'R',b=bh==='S'?(ph==='R'?'L':'R'):(bh||'R');return pc.arm?(b===ph?'US':'UX'):ph+b};
function arsOf(pc,bh){const key=muKey(pc,bh);pc._ar=pc._ar||{};if(pc._ar[key])return pc._ar[key];const r=pc.r,A=r.ars||[['직구','C',68]],mi=MUK.indexOf(key);
  const m=t=>(PTM[t]||[])[mi]||[1,1],fam={F:[],B:[]},PU=r.pu,PE=r.pe,si=key==='RR'||key==='LR'||(pc.arm&&((pc.ph||'R')==='R')===(key==='US'))?0:1; // 실제 구사율: 우타자 상대[0], 좌타자 상대[1]
  for(const [t,,v] of A){const x=PTX[t]||PTX['커브'];fam[x[3]].push({t,v,x,u:PU?((PU[t]?PU[t][si]:1)+.5):m(t)[0]*Math.exp((v-78)/15),e:m(t)[1]*(PE&&PE[t]?PE[t][si]:1)})} // PE: 투수별 실측 좌우 헛스윙 배수
  let fB=.5;if(PU&&fam.B.length){const sF=fam.F.reduce((s,p)=>s+p.u,0),sB=fam.B.reduce((s,p)=>s+p.u,0);fB=cl(sB/(sF+sB||1),.25,.75)}
  let ba=1,k=0,gb=PT_GB0+(pc.arm==='U'?.05:pc.arm==='S'?.03:0)-((r.vel!=null?r.vel:70)-70)*.0015,hr=1,wp=1;
  for(const f of ['F','B']){const L=fam[f],W=L.reduce((s,p)=>s+p.u,0)||1,tot=fam.B.length?(f==='B'?fB:1-fB):f==='F'?1:0;
    for(const p of L){const sh=tot*p.u/W;k+=sh*p.x[1]*p.e*(p.v-PT_C)*PT_KC;gb+=sh*p.x[0]*(p.x[0]>0?p.e*Math.max(.3,p.v/78):1);hr+=sh*p.x[2]*Math.max(0,72-p.v)/10;if(PTBA[p.t])ba+=sh*(PTBA[p.t][mi]-1);if(p.t==='너클볼')wp+=sh*1.6}}
  return pc._ar[key]={k,gb:cl(gb,.3,.66),hr:hr*PT_HR0,wp,ba}}
function simR(c,r){r=r||c.r;return c.type==='B'?{con:r.con,pow:r.pow,eye:r.eye,spd:r.spd,def:r.def,men:r.men,bun:r.bun}:{stu:r.vel*.3+r.stu*.35+r.brk*.35,kv:r.vel*.55+r.brk*.45,ars:ptGrades(c,r.brk,r.vel),pu:c.pu||null,pe:c.pe||null,hv:r.stu,bk:r.brk,gb:gbOf(c,r),ctl:r.ctl,sta:r.sta,men:r.men,ptT:ptTier(c,r)}}
// 타순 적성: T 테이블세터(1·2번), C 클린업(3~6번), L 하위 타선(7~9번, 누구나 가능). 적성 밖 타순이면 교타·장타·선구 -10%
// 실제 기록 기준: 100타석 이상에서 출루율 .330 이상 → 테이블세터, OPS .700 이상 → 클린업(둘 다 가능). 기록이 없으면 능력치로 추정
const pkt=c=>c.pk+'|'+c.type;
const BO_PEN=.9,BO_TH=65,BO_PA=100,BO_OBP=.330,BO_OPS=.700,boScore=R=>({T:R.con*.4+R.eye*.25+R.spd*.35,C:R.pow*.55+R.con*.25+R.eye*.2});
// XBH(SJ 2026-11-26): 실제 기록의 2루타·3루타 비율(홈런 뺀 안타 중)을 리그 평균(2루타 .19, 3루타 .02) 대비 배수로. 표본이 적으면 평균 쪽으로 당김
// 2026-11-26: 리그 평균은 그해 기준(80년대는 2루타가 적었음). LGX[연도]=[2루타 비율, 3루타 비율]
let LGX={};const xbhOf=(x,y)=>{if(!x)return [1,1];const [,,h,d,t,hr]=x,n=Math.max(0,h-hr),c=(v,a,b)=>Math.max(a,Math.min(b,v)),[ld,lt]=LGX[y]||[.19,.02];return [c((d+60*ld)/(ld*n+60*ld),.6,1.6),c((t+150*lt)/(lt*n+150*lt),.3,3)]};
function rates(x){if(!x)return null;const [pa,ab,h,d,t,hr,bb,hbp]=x,obp=(h+bb+hbp)/Math.max(1,ab+bb+hbp),slg=(h+d+2*t+3*hr)/Math.max(1,ab),r=v=>Math.round(v*1000)/1000;return {pa,obp:r(obp),slg:r(slg),ops:r(obp+slg)}}
function boOf(R,st){if(st){if(st.pa<BO_PA)return ['L'];const o=[];if(st.obp>=BO_OBP)o.push('T');if(st.ops>=BO_OPS)o.push('C');return o.length?o:['L']}
  const s=boScore(R),m=Math.max(s.T,s.C);if(m<BO_TH)return ['L'];return ['T','C'].filter(k=>s[k]>=BO_TH&&m-s[k]<=3)}
const boKey=(c,k)=>c.st?(k==='T'?c.st.obp:c.st.ops)*100:boScore(c.r)[k];
// 타선 인접 궁합: 바로 앞뒤 타자(9번-1번도 이어짐)와의 쌍 점수 = 팀 점수(같은 팀·연도 +2, 아니면 같은 계보 +1) + 출신 점수(같은 고교 +3, 아니면 같은 대학 +2, 아니면 같은 지역 +1)
// 타자 점수 = 양쪽 이웃 쌍 점수 합. 점수 1당 교타·장타·선구 +ADJ_PCT%
// 출신 지역 묶음(SJ 2026-11-26): 같은 지역 보너스는 이 6개 권역 단위로 셈. 세부 지역(rg0)은 표시용
const RGRP={서울:'서울',부산:'부산경남',경남:'부산경남',울산:'부산경남',대구:'경북',경북:'경북',광주:'전라',전북:'전라',전남:'전라',제주:'전라',충남:'충청',충북:'충청',대전:'충청',세종:'충청',강원:'강원경기인천',경기:'강원경기인천',인천:'강원경기인천'};
const ADJ={team:2,line:1,hs:3,un:2,reg:1},ADJ_PCT=.15;
// EX 카드는 같은 계보(line)면 같은 팀·연도로 침(덱 효과와 같은 규칙)
const sameTY=(a,b)=>(a.year===b.year&&a.team===b.team)||((a.v==='EX'||b.v==='EX')&&a.line===b.line)||a.v==='RN'||b.v==='RN'; // 영구결번(RN)은 누구와도 같은 팀·연도로 침
const adjPair=(a,b)=>{if(!a||!b)return 0;const t=sameTY(a,b)?ADJ.team:a.line===b.line?ADJ.line:0;
  const o=a.hs&&a.hs===b.hs?ADJ.hs:a.un&&a.un===b.un?ADJ.un:a.reg&&a.reg===b.reg?ADJ.reg:0;return t+o};
const adjBonus=(L,i)=>{const n=L.length;if(n<2)return 0;return adjPair(L[i],L[(i+n-1)%n])+adjPair(L[i],L[(i+1)%n])};
// ===== 유학 =====
// 카드 연도 기준 나이 25세 이하 또는 35세 이상만. 실제 시간(시간 단위) 동안 등록 불가, 끝나면 결과 확인. 재료: 같은 카드 사본
const ABD=[['d1','국내 2군 캠프',null,2,1,['con','eye','ctl','men'],'처음부터 열림'],['d2','호주 윈터리그','ai3',4,1,['con','pow','eye','spd','def','vel','stu','brk','ctl','sta'],'AI 시즌 3위 안'],
 ['d3','일본 캠프','aiW',8,2,['con','eye','bun','ctl','brk'],'AI 시즌 우승'],['d4','도미니카 윈터리그','aiW2',12,2,['spd','def','pow','vel','sta'],'AI 시즌 2회 우승 또는 승률 6할'],['d5','미국 캠프','fr',24,3,['pow','con','vel','stu'],'친구 리그 우승']];
const AB_BY=Object.fromEntries(ABD.map(d=>[d[0],d])),AB_CAP=12,ABG=[['대성공',.15,6],['성공',.6,4],['보통',1,2]];
// 코스트별 유학 효율(2026-11-24, SJ): 저코스트일수록 상승 폭·상한이 크고 고코스트는 미미. 등급별 기본 상승치 × AB_MUL[코스트](반올림, 최소 1), 상한 = 20 × min(배율,1.5)(최소 2)
const AB_MUL=[0,1.6,1.45,1.3,1.15,1,.8,.6,.45,.3,.2],abMul=c=>AB_MUL[Math.min(10,Math.max(1,c|0))],abGain=(g,c)=>g>0?Math.max(1,Math.round(g*abMul(c))):0,abCap=c=>Math.max(2,Math.round(20*Math.min(1.5,abMul(c))));
// 숨은 잠재력(c.pz 0~2, tools/adv.js): 클래식 기록은 평범했지만 세이버 지표가 좋았던 선수. 유학 상승치·한도, 장비 보너스 ×1.25/×1.5
const potMul=c=>1+.25*((c&&c.pz)|0),abCapC=c=>Math.round(abCap(c.cost)*potMul(c));
const ageOf=c=>c&&c.b?c.year-c.b:null,abAge=c=>{if(c&&(c.v==='IR'||c.v==='RY'||c.v==='RN'))return false;const a=ageOf(c);return a!=null&&(a<=25||a>=35)};
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
// 2026-11-28(SJ): 수비 히든(포구·송구·범위). 보이는 수비 = 기본 + 포지션 가중합. 엔진은 용도별로 기본 + 해당 히든을 씀
const DHW={C:[.4,.6,0],'1B':[.7,0,.3],'2B':[.3,.2,.5],SS:[.25,.3,.45],'3B':[.35,.4,.25],LF:[.3,.25,.45],CF:[.2,.2,.6],RF:[.2,.45,.35]};
function defH(c,pos,i){const v=effDef(c,pos),d=c.dh,w=DHW[pos];if(!d||!w)return v;return v+d[i]-(w[0]*d[0]+w[1]*d[1]+w[2]*d[2])}
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
function teamColor(cards,sel,bench){
  // 2026-11-26(SJ 확정): 팀컬러 기본은 벤치 포함 25명. 25명이 불가능한 올스타덱·골든글러브덱만 주전 20명(st).
  // 국가대표·이름 세트·좌완/좌타/잠수함·동문은 명단·보직 기준이라 주전(st)으로 셈. 코스트 보너스도 주전 기준 그대로
  const st=cards;cards=[...cards,...(bench||[]).filter(c=>c&&!cards.includes(c))];
  const cnt=f=>{const m={};for(const c of cards){const k=f(c);if(k)m[k]=(m[k]||0)+1}return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  // EX 카드는 같은 계보의 가장 많은 연도에 들어가 단일연도 인원으로 셈
  // 커리어하이(CH)는 CH_WILD장까지 같은 계보 최다 연도에 합류(EX와 같은 방식), 영구결번(RN)은 계보와 무관하게 최다 연도에 합류
  // 2026-11-25(SJ): EX도 영구결번처럼 어떤 덱이든 만족(계보·연도 무관하게 최다 연도·최다 구단에 합류). 커리어하이만 같은 계보 한정
  // 2026-11-27(SJ): EX는 같은 계보 덱 인원으로만 셈(카드 설명대로). 같은 계보 최다 연도에 합류(커리어하이와 같은 방식, 장수 제한은 1군 EX 한도). 계보 무관 와일드는 영구결번만
  // 2026-11-28(SJ): 영구결번·커리어하이·EX 모두 원 소속 계보로만 셈(구단은 항상 같아야). 연도만 같은 계보 최다 연도에 합류. 계보 무관 와일드는 없음
  const chW=new Set([...cards.filter(c=>c.v==='CH').slice(0,CH_WILD),...cards.filter(c=>c.v==='EX'||c.v==='RN')]),wild=c=>chW.has(c),any=c=>false;
  const yk=(()=>{const m={};for(const c of cards)if(!wild(c)&&!any(c)){const k=yearKey(c);m[k]=(m[k]||0)+1}
    for(const c of cards)if(wild(c)){let b=null;for(const k in m)if(k.split(' ')[1]===c.line&&(!b||m[k]>m[b]))b=k;b=b||yearKey(c);m[b]=(m[b]||0)+1}
    for(const c of cards)if(any(c)){let b=null;for(const k in m)if(!b||m[k]>m[b])b=k;b=b||yearKey(c);m[b]=(m[b]||0)+1}
    return Object.entries(m).sort((a,b)=>b[1]-a[1])})(),ln=(()=>{const a=cnt(c=>any(c)?null:c.line),n=cards.filter(any).length;if(n){if(a[0])a[0][1]+=n;else a.push([cards.find(any).line,n])}return a})(),rg=cnt(REGION_OF),cost=st.reduce((s,c)=>s+c.cost,0),fx=[];
  // 표시용 이름: 계보 키 대신 실제 구단명(그 연도 카드에서 가장 많은 팀)
  const tname=k=>{const [yr,l]=k.split(' '),m={};for(const c of cards)if(c.line===l&&yearKey(c).startsWith(yr+' '))m[c.team]=(m[c.team]||0)+1;
    return yr+' '+(Object.entries(m).sort((a,b)=>b[1]-a[1])[0]||[l])[0]};
  const lname=l=>{const m={};for(const c of cards)if(c.line===l)m[c.team]=(m[c.team]||0)+1;return (Object.entries(m).sort((a,b)=>b[1]-a[1])[0]||[l])[0]};
  const mk=(fam,g,name,d,b,p)=>({fam,g,name,d,b,p,key:name+'|'+d,n:`${name} ${g} (${d})`});
  // 2026-11-25(SJ): 덱 효과는 1군 주전 20명(타순 9·선발 5·불펜 6) 기준. 계열 구분 없이 달성한 효과(all) 중 등급(S·A·B)별로 하나씩, 최대 3개(sel=고른 key, 없으면 그 등급 최고 자동)
  const byLine={};for(const [k,n] of yk){const l=k.split(' ')[1];(byLine[l]=byLine[l]||[]).push([k,n])}
  const [l1,m1]=ln[0]||[],lc=Object.fromEntries(ln);
  const uniq=f=>{const m={};for(const c of st){const k=f(c);if(!k)continue;(m[k]=m[k]||new Set()).add(c.pk)}return Object.entries(m).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1])};
  const hs=uniq(c=>c.hs),un=uniq(c=>c.un),nv=v=>st.filter(c=>c.v===v).length;
  const all=[];const add=x=>{if(x&&!all.some(y=>y.key===x.key))all.push(x)};
  {const yy=yk[0];if(yy){const n=yy[1];if(n>=25)add(mk('Y','S','단일연도',tname(yy[0]),8,6));else if(n>=20)add(mk('Y','A','단일연도',tname(yy[0]),5,4));else if(n>=12)add(mk('Y','B','단일연도',tname(yy[0]),3,2))}}
  for(const l in byLine){const a=byLine[l];if(a.length>=2&&a[0][1]>=9&&a[1][1]>=9&&a[0][1]+a[1][1]>=25)add(mk('Y','A','연도 듀얼',`${a[0][0].split(' ')[0]}+${a[1][0].split(' ')[0]} ${lname(l)}`,5,4))}
  if(m1>=25)add(mk('F','A','단일구단',lname(l1),5+(cost>=125?2:0),3+(cost>=125?2:0)));else if(m1>=15)add(mk('F','B','단일구단',lname(l1),3,2));
  // 이름 붙은 라이벌(A): 두 구단 각 8명 이상, 합계 20명 이상. 그 외 두 구단 조합은 일반 라이벌 듀얼(B)
  {const nm=new Set(cards.map(c=>c.name));for(const [p,a,b] of FA_LINKS)if(nm.has(p)&&(lc[a]||0)>=10&&(lc[b]||0)>=10&&lc[a]+lc[b]>=25)add(mk('F','A','FA 이적: '+p,`${lname(a)}+${lname(b)}`,5,4))}
  for(const [a,b,n] of RIVALS)if((lc[a]||0)>=10&&(lc[b]||0)>=10&&lc[a]+lc[b]>=25)add(mk('F','A',n,`${lname(a)}+${lname(b)}`,5,4));
  if(ln.length>=2&&ln[0][1]>=10&&ln[1][1]>=10&&ln[0][1]+ln[1][1]>=25&&!all.some(x=>x.fam==='F'&&x.g==='A'&&x.name!=='단일구단'))add(mk('F','B','라이벌 듀얼',`${lname(ln[0][0])}+${lname(ln[1][0])}`,3,2));
  // 2026-11-27(SJ): 지역 효과는 구단 연고지가 아니라 선수 출신 지역(c.reg, 고교 기준). 1군 25명 중 같은 출신 6명 이상이면 B, 보너스는 그 출신 선수에게만
  {const m={};for(const c of cards)if(c.reg){(m[c.reg]=m[c.reg]||new Set()).add(c.pk)}const r=Object.entries(m).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1])[0];
   if(r&&r[1]>=6){const x=mk('E','B','출신 지역',`${r[0]} 출신 ${r[1]}명 · 해당 선수만`,3,2);x.only='reg:'+r[0];add(x)}}
  // 투타 조합(SJ 2026-11-27, 시뮬로 크기 맞춤): 타순 9명 중 우투좌타 6명 이상 B, 스위치히터 4명 이상 B(+ 투수 손 상관없이 플래툰 유리). 보너스는 해당 선수만 야수 +3
  {const B=st.filter(c=>c.type==='B'),rl=B.filter(c=>c.ph==='R'&&c.bh==='L').length,sw=B.filter(c=>c.bh==='S').length;
   if(rl>=6){const x=mk('E','B','우투좌타',`우투좌타 ${rl}명 · 해당 선수만`,3,0);x.only='RL';add(x)}
   if(sw>=4){const x=mk('E','B','스위치히터',`스위치 ${sw}명 · 해당 선수만 · 투수 손 무관 유리`,3,0);x.only='SW';add(x)}}
  // 묶음 계보(A): 여러 계보를 합쳐 20명 이상(각 계보 1명 이상)
  for(const [n,ls,mn,lb] of LINE_UNIONS){const t=ls.reduce((x,l)=>x+(lc[l]||0),0);if(t>=25&&ls.every(l=>(lc[l]||0)>=(mn||1)))add(mk('F','A',n,lb||ls.map(lname).join('+'),5,4))}
  // 시대 세트는 S 칸(SJ 2026-11-25): 같은 구단이라 A 칸의 단일구단과 함께 켤 수 있게
  for(const [n,l,y0,y1,need,lb,men] of ERA_SETS){const k=cards.filter(c=>c&&(any(c)||c.line===l&&(chW.has(c)||c.year>=y0&&c.year<=y1))).length;if(k>=need){const x=mk('Y','S',n,`${y0}~${y1} ${lb||lname(l)} ${k}명${men?` · 정신력 +${men}`:''}`,5,4);if(men)x.men=men;add(x)}}
  // Again 우승년도 덱: 해마다 최대 7명 + 같은 계열 와일드 2장 = 23명
  for(const a of AGAIN_SETS){const k=againCount(a,cards);if(k>=AGAIN_NEED)add(mk('Y','S',againName(a[0],a[2]),`우승년도 ${k}명`,5,4))}
  // 올스타덱·골든글러브덱: 연도·구단이 섞여도 특별 카드 장수로
  // 2026-11-25(SJ): 주전 20명을 다 채우면 최고 등급(S). EX·영구결번도 와일드카드로 셈
  {const w=nv('RN'); // 2026-11-27(SJ): EX는 계보 덱 전용이라 올스타·골든글러브덱 와일드에서 뺌
  {const n=nv('AS')+w;if(n>=20)add(mk('E','S','올스타덱',`올스타 ${n}명`,8,6));else if(n>=12)add(mk('E','A','올스타덱',`올스타 ${n}명`,5,4));else if(n>=8)add(mk('E','B','올스타덱',`올스타 ${n}명`,3,2))}
  {const n=nv('GG')+w;if(n>=20)add(mk('E','S','골든글러브덱',`골든글러브 ${n}명`,8,6));else if(n>=8)add(mk('E','A','골든글러브덱',`골든글러브 ${n}명`,5,4));else if(n>=5)add(mk('E','B','골든글러브덱',`골든글러브 ${n}명`,3,2))}}
  // 이름 세트: 지정 선수들을 계보 안에서 모으기
  for(const [n,l,names,na,ns,nb] of NAME_SETS){const k=new Set(st.filter(c=>(!l||c.line===l)&&names.some(e=>nsHit(c,e))).map(c=>c.name)).size;if(k>=ns)add(mk('E','S',n,`${k}/${names.length}명`,6,5));else if(k>=na)add(mk('E','A',n,`${k}/${names.length}명`,4,3));else if(nb&&k>=nb)add(mk('E','B',n,`${k}/${names.length}명`,2,1))}
  // 국가대표 우승: 15명 S · 10명 A · 6명 B
  for(const [n,y,ls] of NAT_SETS){const L=ls.split(' '),k=new Set(st.filter(c=>L.some(x=>natHit(c,y,x))).map(c=>c.pk)).size;if(k>=15)add(mk('E','S',n,`국가대표 ${k}명`,6,5));else if(k>=10)add(mk('E','A',n,`국가대표 ${k}명`,4,3));else if(k>=6)add(mk('E','B',n,`국가대표 ${k}명`,2,2))}
  // 잠수함 군단(SJ 2026-11-25): 투수 중 언더·사이드 수
  {const n=st.filter(c=>c.type==='P'&&c.arm).length;if(n>=6)add(mk('E','A','잠수함 군단',`언더·사이드 ${n}명`,1,6));else if(n>=4)add(mk('E','B','잠수함 군단',`언더·사이드 ${n}명`,0,3))}
  // 좌완 왕국·좌타 라인업(SJ 2026-11-25): 투수 11명·타자 9명 중 왼손 수. 스위치히터는 좌타로 셈
  {const P=st.filter(c=>c.type==='P'),B=st.filter(c=>c.type==='B'),lp=P.filter(c=>c.ph==='L').length,lb=B.filter(c=>c.bh==='L'||c.bh==='S').length;
   if(P.length>=11&&lp===P.length)add(mk('E','A','좌완 왕국',`좌투수 ${lp}명`,1,7));else if(lp>=8)add(mk('E','B','좌완 왕국',`좌투수 ${lp}명`,0,4));
   if(B.length>=9&&lb===B.length)add(mk('E','A','좌타 라인업',`좌타자 ${lb}명`,7,1));else if(lb>=7)add(mk('E','B','좌타 라인업',`좌타자 ${lb}명`,4,0))}
  if(hs[0]&&hs[0][1]>=6)add(mk('E','A','고교 동문',hs[0][0],3,2));else if(hs[0]&&hs[0][1]>=4)add(mk('E','B','고교 동문',hs[0][0],2,1));
  if(un[0]&&un[0][1]>=5)add(mk('E','B','대학 동문',un[0][0],2,1));
  // 2026-11-28(SJ): 못 채운 효과도 보여주기. near=[{g,name,d,k(부족 인원)}], 같은 이름이 그 등급에 이미 달성됐으면 뺌
  const near=[],nr=(g,name,d,k)=>{if(k>0&&!all.some(x=>x.g===g&&x.name===name))near.push({g,name,d,k})},sh=(a,b,ma,mb,tot)=>Math.max(Math.max(0,ma-a)+Math.max(0,mb-b),tot-a-b),best=(arr)=>arr.filter(x=>x.p!==0).sort((x,y)=>x.k-y.k)[0]; // p: 지금 해당 인원(0이면 아직 시작도 안 한 세트라 안 보여줌)
  {const yy=yk[0];if(yy){const n=yy[1],d=tname(yy[0]);nr('S','단일연도',d,25-n);nr('A','단일연도',d,20-n);nr('B','단일연도',d,12-n)}}
  if(l1){nr('A','단일구단',lname(l1),25-m1);nr('B','단일구단',lname(l1),15-m1)}
  if(ln[1])nr('B','라이벌 듀얼',`${lname(ln[0][0])}+${lname(ln[1][0])}`,sh(ln[0][1],ln[1][1],10,10,25));
  if(l1&&byLine[l1]&&byLine[l1][1]){const a=byLine[l1];nr('A','연도 듀얼',`${a[0][0].split(' ')[0]}+${a[1][0].split(' ')[0]} ${lname(l1)}`,sh(a[0][1],a[1][1],9,9,25))}
  {const r=best(RIVALS.map(([a,b,n])=>({n,d:`${lname(a)}+${lname(b)}`,p:Math.min(lc[a]||0,lc[b]||0),k:sh(lc[a]||0,lc[b]||0,10,10,25)})));if(r)nr('A',r.n,r.d,r.k)}
  {const r=best(LINE_UNIONS.map(([n,ls,mn,lb])=>({n,d:lb||ls.map(lname).join('+'),p:ls.filter(l=>lc[l]).length>=2?1:0,k:Math.max(25-ls.reduce((x,l)=>x+(lc[l]||0),0),ls.reduce((x,l)=>x+Math.max(0,(mn||1)-(lc[l]||0)),0))})));if(r)nr('A',r.n,r.d,r.k)}
  {const r=best(ERA_SETS.map(([n,l,y0,y1,need,lb])=>({n,d:`${y0}~${y1} ${lb||lname(l)}`,p:cards.filter(c=>c&&c.line===l&&c.year>=y0&&c.year<=y1).length,k:need-cards.filter(c=>c&&(any(c)||c.line===l&&(chW.has(c)||c.year>=y0&&c.year<=y1))).length})));if(r)nr('S',r.n,r.d,r.k)}
  {const r=best(AGAIN_SETS.map(a=>{const c=againCount(a,cards);return {n:againName(a[0],a[2]),p:c,k:AGAIN_NEED-c}}));if(r)nr('S',r.n,'우승년도',r.k)}
  {const m={};for(const c of cards)if(c.reg)(m[c.reg]=m[c.reg]||new Set()).add(c.pk);const r=Object.entries(m).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1])[0];if(r)nr('B','출신 지역',r[0]+' 출신',6-r[1])}
  {const B=st.filter(c=>c.type==='B'),P=st.filter(c=>c.type==='P'),lp=P.filter(c=>c.ph==='L').length,lb=B.filter(c=>c.bh==='L'||c.bh==='S').length,ar=P.filter(c=>c.arm).length;
   nr('B','우투좌타','타순 우투좌타',6-B.filter(c=>c.ph==='R'&&c.bh==='L').length);nr('B','스위치히터','타순 스위치',4-B.filter(c=>c.bh==='S').length);
   nr('A','잠수함 군단','언더·사이드 투수',6-ar);nr('B','잠수함 군단','언더·사이드 투수',4-ar);nr('A','좌완 왕국','투수 11명 전원 좌투',11-lp);nr('B','좌완 왕국','좌투수',8-lp);nr('A','좌타 라인업','타자 9명 전원 좌타',9-lb);nr('B','좌타 라인업','좌타자',7-lb)}
  {const w=nv('RN'),a=nv('AS')+w,g2=nv('GG')+w;if(a){nr('S','올스타덱','올스타',20-a);nr('A','올스타덱','올스타',12-a);nr('B','올스타덱','올스타',8-a)}if(g2){nr('S','골든글러브덱','골든글러브',20-g2);nr('A','골든글러브덱','골든글러브',8-g2);nr('B','골든글러브덱','골든글러브',5-g2)}}
  if(hs[0]){nr('A','고교 동문',hs[0][0],6-hs[0][1]);nr('B','고교 동문',hs[0][0],4-hs[0][1])}if(un[0])nr('B','대학 동문',un[0][0],5-un[0][1]);
  {const r=best(NAT_SETS.map(([n,y,ls])=>{const L=ls.split(' ');return {n,k:new Set(st.filter(c=>L.some(x=>natHit(c,y,x))).map(c=>c.pk)).size}}).map(x=>({...x,k0:x.k,p:x.k,k:15-x.k})));if(r){nr('S',r.n,'국가대표',15-r.k0);nr('A',r.n,'국가대표',10-r.k0);nr('B',r.n,'국가대표',6-r.k0)}}
  {const r=best(NAME_SETS.map(([n,l,names,na,ns])=>{const k=new Set(st.filter(c=>(!l||c.line===l)&&names.some(e=>nsHit(c,e))).map(c=>c.name)).size;return {n,k0:k,p:k,na,ns,k:ns-k}}));if(r){nr('S',r.n,'지정 선수',r.ns-r.k0);nr('A',r.n,'지정 선수',r.na-r.k0)}}
  near.sort((a,b)=>a.k-b.k);
  const S2=new Set(sel||[]);for(const g of ['S','A','B']){const c=all.filter(x=>x.g===g);if(!c.length)continue;fx.push(c.find(x=>S2.has(x.key))||c.sort((a,b)=>(b.b+b.p)-(a.b+a.p))[0])}
  const only=fx.filter(x=>x.only).map(x=>({k:x.only,b:x.b,p:x.p}));return {fx,all,near,only,bat:fx.reduce((s,x)=>s+(x.only?0:x.b),0),pit:fx.reduce((s,x)=>s+(x.only?0:x.p),0),men:fx.reduce((s,x)=>s+(x.men||0),0),top:{year:yk[0]&&[tname(yk[0][0]),yk[0][1]],line:ln[0]},cost}}
// ===== 스킬 블록 =====
const SHAPES={I2:[[0,0],[0,1]],I3:[[0,0],[0,1],[0,2]],V3:[[0,0],[1,0],[1,1]],O:[[0,0],[0,1],[1,0],[1,1]],I4:[[0,0],[0,1],[0,2],[0,3]],T:[[0,0],[0,1],[0,2],[1,1]],L:[[0,0],[1,0],[2,0],[2,1]],J:[[0,1],[1,1],[2,1],[2,0]],S:[[0,1],[0,2],[1,0],[1,1]],Z:[[0,0],[0,1],[1,1],[1,2]]};
const GRADES={C:{m:.75,w:50},B:{m:1,w:30},A:{m:1.25,w:15},S:{m:1.5,w:5}};
const GRID=4;
// 블록은 모두 4칸(SJ 2026-11-26): 16칸에 최대 4개
const SH4=Object.keys(SHAPES).filter(k=>SHAPES[k].length===4);
let BLK_SEQ=0;/* 같은 ms에 여러 개 만들어도 u가 겹치지 않게 */
function mkBlock(t,g){const sh=pick(SH4);
  if(!g){let u=rnd()*100;g='C';for(const k of ['S','A','B','C']){if((u-=GRADES[k].w)<0){g=k;break}}}
  const keys=t==='B'?BK:PKEY,pts=Math.max(1,Math.round(SHAPES[sh].length*GRADES[g].m)),ks=[...keys].sort(()=>rnd()-.5).slice(0,g==='S'?2:1),st={};
  for(let i=0;i<pts;i++){const k=ks[i%ks.length];st[k]=(st[k]||0)+1}
  const main=Object.entries(st).sort((a,b)=>b[1]-a[1])[0][0];
  return {u:'b'+Date.now().toString(36)+(++BLK_SEQ).toString(36)+Math.floor(Math.random()*1e6).toString(36),sh,g,t,st,rot:0,on:null,at:null,name:`${SKN_E[main]||main} 연마-${sh}형`}}
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
const SK_MUL={GG:1.25,EX:1.25,RN:1.25,IR:1.5}; // 골든글러브·EX ×1.25, 철인 ×1.5 스킬 블록 효과 (올스타는 능력치 +3만)
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
 ['m10','국민감독','trust','12100211','L','믿음의 야구','선발 체력 +5, 선발 투구 한계 +15%',{ssta:5,shook:1.15}],
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
 ['p3','좌완 원 포인트','투','일반','좌타자 상대','투수 제구 +6',20,[],['b3']],['p4','위기 탈출','투','일반','득점권 위기','투수 정신력 +8',30,[],['b2']],
 ['p5','첫 이닝 집중','투','일반','1회','선발 구위·제구 +6',20,[],['b1']],['p6','클로저 본능','투','특수','9회 세이브 상황','마무리 구위 +6, 이 이닝 상대 대타 효과 무효',50,[],[]],
 ['p7','삼진 쇼','투','황금','언제나','상대 전 타자 교타 –4',80,[],['b8']],
 ['b1','에이스 사냥','야','일반','상대 선발이 스타 이상','전 타자 교타 +5',30,[],['p5']],['b2','득점권 해결사','야','일반','득점권','교타 +6',30,[],['p4']],
 ['b3','좌완 공략','야','일반','상대 투수가 좌투','장타 +5',20,[],['p3']],['b4','선발 흔들기','야','일반','1~3회','상대 선발 제구 –5',30,[],['p1']],
 ['b5','막판 뒤집기','야','일반','8회 이후 지고 있음','교타·장타 +6',30,[],[]],['b6','기동력 야구','야','일반','1루 주자 있음','도루 성공률 +20%',20,[],[]],
 ['b7','대타 신공','야','특수','6회 이후 대타','대타 교타 +10, 대타 다음 타자 선구 +5',50,[],[]],['b8','4번 타자의 무게','야','황금','4번 타석','상대 투수 구위 –6',80,[],['p7']],
 ['c1','홈 응원단','공','일반','홈 경기','전원 정신력 +5',20,[],[]],['c2','승리의 각오','공','일반','동점 또는 1점 차','전원 능력 +2',30,[],[]],
 ['c3','데이터 분석','공','일반','같은 상대와 두 번째 경기','전원 선구·제구 +3',30,[],[]],['c4','견제 강화','공','특수','상대 1루 주자','상대 도루 –20%, 견제사 확률 +',40,['b6'],[]],
 ['c5','징크스 깨기','공','특수','연패 중','전원 컨디션 +1단계',50,[],[]],
 ['c6','원정 응원단','공','일반','원정 경기','전원 정신력 +5',20,[],[]]]; // 2026-11-27(SJ): 홈 응원단의 원정판
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
  if(all(c=>c.v==='GG'||c.v==='EX'||c.v==='AS'||c.v==='CH')){gg=true;L.push({n:'특별 카드 3장(골글·올스타·커하·EX) → 특별판 25% (골글판, 없으면 커하판)'})}
  const player=L.some(x=>x.player)?c=>c.pk===cs[0].pk&&!cs.some(m=>m.year===c.year):null;return {list:L,up,gg,player}}
const L3same=cs=>cs.every(c=>c.line===cs[0].line);
// opt.ex: 결과에서 뺄 구단 계보(line) 목록, 최대 SYN_EX_MAX개. 걸러서 후보가 없으면 제외를 무시
const SYN_EX_MAX=3,SYN_EX10=.05;
function synth(kind,mats,locks,opt){
  if(locks&&locks.length){const L=new Set(locks),k=m=>kind==='b'?(m&&'b'+m.u):m;/* 선수는 장 단위(중복 2장째 'id~2')로 잠금 확인 */if(mats.some(m=>L.has(k(m))))return {err:'잠긴 카드·블록은 재료 불가'}}
  if(kind!=='b'&&mats.length!==3)return {err:'재료 3개 필요'};
  if(kind==='p'){const cs=mats.map(id=>byId[baseId(id)]);if(cs.some(c=>!c))return {err:'없는 카드'};
    const EXL=new Set(((opt&&opt.ex)||[]).slice(0,SYN_EX_MAX)),okL=c=>!EXL.has(c.line),exf=P=>{const Q=P.filter(okL);return Q.length?Q:P},exN=EXL.size?`제외: ${[...EXL].join(', ')}`:'';
    const R=synthRules(cs),a=Math.round(cs.reduce((s,c)=>s+c.cost,0)/3),u=rnd(),up=R.up;
    // EX 합성(사용자 확정): EX 3장 → 평균 코스트 이상 EX 확정(같은 구단 3장이면 그 구단) · EX 2장+아무 1장 → EX 50% · EX 1장+골글/올스타 2장 → EX 25%, 실패 시 골글판 이상 확정
    {const nEX=cs.filter(c=>c.v==='EX').length,nSP=cs.filter(c=>c.v==='GG'||c.v==='AS').length,EXS=exf(CARDS.filter(c=>c.v==='EX'&&!c.mx)); // 미션 전용 EX(mx)는 합성으로 안 나옴
    
     const exOut=(lineOnly)=>{let P=EXS.filter(c=>c.cost>=Math.min(a,10));const L=cs.filter(c=>c.v==='EX').map(c=>c.line);
       if(lineOnly){const Q=P.filter(c=>c.line===L[0]);if(Q.length)P=Q}if(!P.length)P=EXS;return pick(P)};
     const done=(c,n)=>({kind,out:c.id,cost:c.cost,rules:exN?[n,exN]:[n]});
     // 10코스트 3장(EX 없음) → 5% 확률로 EX(같은 구단 3장이면 그 구단 EX). SJ 2026-11-26
     if(nEX===0&&cs.every(c=>c.cost===10)&&rnd()<SYN_EX10){let P=EXS.filter(c=>c.cost>=10);if(L3same(cs)){const Q=P.filter(c=>c.line===cs[0].line);if(Q.length)P=Q}if(!P.length)P=EXS;return done(pick(P),'10코스트 3장 → EX 5% 성공'+(L3same(cs)?` (${cs[0].line})`:''))}
     if(nEX===3)return done(exOut(L3same(cs)),'EX 3장 → EX 확정'+(L3same(cs)?` (${cs[0].line})`:''));
     if(nEX===2&&u<.5)return done(exOut(cs.filter(c=>c.v==='EX').every((c,i,A)=>c.line===A[0].line)),'EX 2장 → EX 50% 성공');
     if(nEX===1&&nSP===2){if(u<.25)return done(exOut(false),'EX+특별 2장 → EX 25% 성공');
       const G=exf(CARDS.filter(c=>c.v==='GG'&&c.cost>=a)).sort((x,y)=>x.cost-y.cost);if(G.length){const lo=G[0].cost;return done(pick(G.filter(c=>c.cost<=Math.max(lo,a+1))),'EX+특별 2장 → 실패, 골든글러브판 확정')}}}
    const t=Math.min(10,a+(u<up[2]?3:u<up[2]+up[1]?2:1));
    // 규칙의 조건(f)을 모두 만족하는 카드 중 목표 코스트. 없으면 조건을 뒤에서부터 하나씩 풀고, 그래도 없으면 가장 가까운 코스트
    let fs=R.list.filter(x=>x.f).map(x=>x.f),out=null;const base=c=>c.v!=='EX'&&c.v!=='AS'&&!c.mx&&okL(c); // 미션 전용(mx: 영구결번·국가대표)은 합성 결과에서 제외
    // 같은 선수 3장: 그 선수 다른 시즌 중 목표 코스트(평균+1~3) 이하에서 가장 높은 카드. 없으면 일반 규칙으로(예전엔 코스트 무시하고 최고 카드라 1코 3장→8~9코가 나왔음)
    if(R.player){const P=CARDS.filter(c=>base(c)&&R.player(c)&&c.cost>a&&c.cost<=t).sort((x,y)=>y.cost-x.cost);if(P.length){out=P[0];fs=[]}}
    if(!out)for(;;){const P=CARDS.filter(c=>base(c)&&fs.every(f=>f(c)));if(P.length){const T=P.filter(c=>c.cost===t);if(T.length){out=pick(T);break}
        const hi=P.filter(c=>c.cost>a&&c.cost<=t).sort((x,y)=>Math.abs(x.cost-t)-Math.abs(y.cost-t));if(hi.length){out=pick(hi.filter(c=>c.cost===hi[0].cost));break}}
      if(!fs.length){const Z=CARDS.filter(c=>base(c)&&c.cost===t);out=pick(Z.length?Z:CARDS.filter(c=>c.v!=='EX'&&c.v!=='AS'&&c.cost===t));break}fs=fs.slice(0,-1)}
    if(R.gg&&out.v!=='GG'&&out.v!=='CH'&&rnd()<.25){const g=CARDS.find(c=>c.v==='GG'&&c.pk===out.pk&&c.year===out.year)||CARDS.find(c=>c.v==='CH'&&c.pk===out.pk&&c.year===out.year&&okL(c));if(g)out=g;else{const Q=CARDS.filter(c=>(c.v==='GG'||c.v==='CH')&&!c.mx&&okL(c)&&c.cost===out.cost&&c.type===out.type);if(Q.length)out=pick(Q)}} // 같은 선수 특별판이 없으면 같은 코스트·같은 투타의 골글/커하 중 하나
    return {kind,out:out.id,cost:out.cost,rules:R.list.filter(x=>R.player?x.player&&out.pk===cs[0].pk:(!x.f||fs.includes(x.f))).map(x=>x.n).concat(exN?[exN]:[])}}
  if(kind==='b'){if(mats.length!==2)return {err:'블록 2개 필요'};const t=mats[0].t;if(mats.some(b=>b.t!==t))return {err:'같은 종류(타자용/투수용) 블록만 합성 가능'};
    const order='CBAS',a=order.indexOf(mats[0].g),b=order.indexOf(mats[1].g);const g=a===b?(rnd()<.6?order[Math.min(3,a+1)]:order[a]):order[Math.max(a,b)];return {kind,out:mkBlock(t,g)}}
  if(kind==='s'){if(mats.some(x=>x!==mats[0]))return {err:'같은 서포트 카드 3장 필요'};if(mats[0].endsWith('+'))return {err:'강화판은 합성 불가'};return {kind,out:mats[0]+'+'}}
  if(kind==='t'){const gs=mats.map(id=>TC_BY[id]&&TC_BY[id][3]);if(gs.some(g=>g!==gs[0]))return {err:'같은 등급 카드 3장 필요'};if(gs[0]==='황금')return {err:'황금 카드는 합성 불가'};
    const g=gs[0]==='특수'?'황금':(rnd()<.2?'황금':'특수');return {kind,out:pick(TCARDS.filter(x=>x[3]===g))[0],grade:g}}
  return {err:'알 수 없는 합성'}}
function clash(mine,opp){return (mine||[]).filter(id=>TC_BY[id]).map(id=>{const c=TC_BY[id];for(const o of opp||[]){const q=TC_BY[o];if(!q)continue;
  if(q[7].includes(id))return [id,'무효화',o];if(c[8].includes(o))return [id,'상쇄',o]}return [id,'발동',null]})}
function battery(p,c){const why=[];let v=45;if(!p||!c)return {v:0,why};
  if(sameTY(p,c)){v+=25;why.push('같은 팀·연도')}else if(p.line===c.line){v+=12;why.push('같은 구단')}
  if(p.hs&&p.hs===c.hs){v+=15;why.push('같은 고교')}if(p.reg&&p.reg===c.reg){v+=8;why.push('같은 지역')}
  return {v:Math.min(100,v),why}}
// 투수 리드(SJ 2026-11-26): 포수 수비(포수 자리)·정신 평균이 75보다 10 높을 때마다 투수 제구 +1, -1~+2 (구위에는 안 붙음)
const leadOf=c=>c?cl(Math.round(((effDef(c,'C')+((c.r&&c.r.men)||60))/2-75)/10*2)/2,-1,2):0;
const batAdj=v=>v>=70?(v-60)/10:v<40?-1.5:0; // 궁합 → 제구 보정(구위는 60%)
// 신인왕(RY) 카드는 컨디션이 보통(3) 아래로 안 떨어짐. UI의 컨디션 롤도 Math.max(condMin(id), 값)으로 씀
const condMin=id=>byId[id]&&byId[id].v==='RY'?3:1;
// 투수 피로도(SJ 2026-11-25): 리그에서 경기 사이에 쌓이고(던진 타자 수 ÷ 투구 한계) 체력에 비례해 하루마다 회복. 0~100
// 선발은 등판하면 60+(던진 비율×40), 피로 15 미만이어야 등판(아니면 다음 순번), 피로 20을 넘으면 구위·제구 최대 −30%·투구 한계 감소, 불펜은 피로 55 이상이면 그날 등판 불가
// 2026-11-27(SJ): 선발은 하루 20씩 일정하게 회복 → 등판 뒤 5일 쉬면 완전 회복(5선발 돌고 월요일 휴식이 끼면 딱 5일). 4일만 쉬면 피로가 남고, 선발은 남은 피로만큼 바로 감점(pen0 없음)
const FAT={spOk:15,spFlex:20,rpOut:55,pen0:20,penMax:.3,spRec:20},fatCap=(c,st)=>st?16+c.r.sta*.16:3+c.r.sta/20,fatMul=f=>f>FAT.pen0?1-Math.min(FAT.penMax,(f-FAT.pen0)/80*FAT.penMax):1;
function fatAdd(fat,g,s){for(const p of g.px[s]){const add=p.starter?60+40*Math.min(1,p.bf/fatCap(p.c,1)):p.bf/fatCap(p.c,0)*30;fat[p.c.id]=Math.round(Math.min(100,(fat[p.c.id]||0)+add))}}
function fatRest(fat){for(const id in fat){const c=byId[id];fat[id]=Math.round(Math.max(0,fat[id]-(c&&c.pos==='SP'?FAT.spRec:15+((c&&c.r.sta)||60)*.1)));if(!fat[id])delete fat[id]}}
function fatSP(T,fat){const R=(T.rot||[]).filter(Boolean),i=(T.rotIdx||0)%Math.max(1,R.length);if(T.rotMode==='flex'&&fat&&R.length){const ok=R.filter(id=>(fat[id]||0)<FAT.spFlex&&byId[id]);if(ok.length)return ok[0]} /* 2026-11-28 SJ: 선발 운용 '유연' = 체력 회복된 선발 중 로테이션 앞 번호 우선(능력순이면 하위 선발이 아예 안 나오는 문제) */if(!fat||!R.length)return R[i];for(let k=0;k<R.length;k++){const id=R[(i+k)%R.length];if((fat[id]||0)<FAT.spOk)return id}return R.slice().sort((a,b)=>(fat[a]||0)-(fat[b]||0))[0]}
function simTeam(T,cond,fat){
  const all=[...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean);
  const M=mgrOf(T),tac=M?{...M.t}:{...TAC_DEF},fx=M?M.fx:{};
  const SP={};for(const x of (T.sup||[]).filter(x=>x.left>0&&SUP_BY[x.id]).slice(0,SUP_MAX))SP[x.cid]=SUP_BY[x.id][5];
  const AS=T.abSt||{},tc=teamColor([...T.lineup.map(x=>x.id),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean),T.fxsel,(T.bench||[]).map(id=>byId[id]).filter(Boolean)),mod=c=>{const raw={...c.r};for(const k in AS[c.id]||{})if(raw[k]!=null)raw[k]=Math.min(120,raw[k]+AS[c.id][k]);sk=skillOf(c.id,T.blocks);const onlyHit=k=>k==='RL'?c.type==='B'&&c.ph==='R'&&c.bh==='L':k==='SW'?c.type==='B'&&c.bh==='S':k.startsWith('reg:')&&c.reg===k.slice(4),bon=(c.type==='B'?tc.bat:tc.pit)+(tc.only||[]).reduce((s,o)=>s+(onlyHit(o.k)?(c.type==='B'?o.b:o.p):0),0);const spx=SP[c.id]||{},eqx=(T.eq||{})[c.id]||{};for(const k in eqx)if(raw[k]!=null)raw[k]=Math.min(120,raw[k]+eqx[k]);for(const k in raw){if(k!=='sta')raw[k]+=bon;if(k==='men'&&tc.men)raw[k]+=tc.men;if(spx[k])raw[k]+=spx[k];if(c.type==='B'&&fx[k]&&k!=='def'&&k!=='men')raw[k]+=fx[k];raw[k]=Math.min(120,raw[k]+(sk[k]||0)) /* 2026-11-26: 화면 상한(120)과 통일 */}
    const c5=(T.tcards||[]).includes('c5')&&((T.ctx||{}).streak||0)<=-2?1:0,r=simR(c,raw),m=COND[Math.min(5,(l=>l<3?l+(fx.cond||0):l)(Math.max(condMin(c.id),(cond&&cond[c.id])||3))+c5+((SP[c.id]||{}).cond||0))].m;if(c.type==='B'){r.con*=1+m;r.eye*=1+m/2}else{r.ctl*=1+m;r.stu*=1+m/2;r.kv*=1+m/2;r.hv*=1+m/2}
    const ps=c.ps?Object.fromEntries(Object.entries(c.ps).map(([p,v])=>[p,v+(raw.def!=null&&c.r.def!=null?raw.def-c.r.def:bon+(sk.def||0))])):null /* 2026-11-26: 유학·장비·특훈 수비 상승도 포지션 수비에 반영(전에는 덱 보너스·스킬만) */;if(c.type==='P'&&fx.ssta&&c.pos==='SP')r.sta+=fx.ssta;const fv=fat&&fat[c.id]||0,p0=c.pos==='SP'?0:FAT.pen0;if(c.type==='P'&&fv>p0){const fm=1-Math.min(FAT.penMax,(fv-p0)/80*FAT.penMax);r.stu*=fm;r.ctl*=fm;r.kv*=fm;r.hv*=fm;r.sta*=1-fv/250}return {...c,r,ps,rawr:raw,fat:fv,swx:c.bh==='S'&&(tc.only||[]).some(o=>o.k==='SW')?1:0}};
  const LC=T.lineup.map(x=>byId[x.id]);
  const lu=T.lineup.map((x,i)=>{const c=mod(byId[x.id]);let m=1;if(!boOk(c,i)){m*=BO_PEN;c.boBad=1}const a=adjBonus(LC,i);if(a){m*=1+a*ADJ_PCT/100;c.adj=a}
    if(m!==1)c.r={...c.r,con:c.r.con*m,pow:c.r.pow*m,eye:c.r.eye*m};return {c,pos:x.pos}});
  const w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1,fld=lu.filter(x=>x.pos!=='DH');
  const def=fld.reduce((s,x)=>s+defH(x.c,x.pos,2)*w(x.pos),0)/fld.reduce((s,x)=>s+w(x.pos),0)+(fx.def||0);
  return {name:T.name,color:T.color,lu,bench:(T.bench||[]).map(id=>byId[id]).filter(Boolean).map(mod),sp:mod(byId[fatSP(T,fat)]),pen:T.pen.map(id=>mod(byId[id])),tired:fat?T.pen.filter(id=>(fat[id]||0)>=FAT.rpOut):[],def,tc,tac,fx,mgr:T.mgr||'',tcards:(T.tsel?[T.tsel]:(T.tcards||[])).slice(0,5),ctx:T.ctx||{}}}

function newPit(g,s,c,starter){if(starter&&g.ta[s].has('p1'))c={...c,r:{...c.r,sta:c.r.sta+10,stu:c.r.stu+3,kv:c.r.kv+3,hv:c.r.hv+3}};const T=g.t[s],tac=T.tac||TAC_DEF,fx=T.fx||{},cat=(T.lu.find(x=>x.pos==='C')||{}).c,bt=battery(c,cat);
  const L=starter?(16+c.r.sta*.16)*ERA_SP(c.year)*[1.2,1.1,1,.92,.85][tac.hook]*(fx.shook||1):(3+c.r.sta/20)*[1.2,1.1,1,.95,.9][tac.relief];
  const ld=leadOf(cat),p={c,starter,ent:g.sc[s]-g.sc[1-s],bf:0,outs:0,h:0,r:0,bb:0,k:0,hr:0,L,bat:bt.v,lead:ld,badj:batAdj(bt.v)};g.px[s].push(p);g.used[s].add(c.id);return p}
function mkGame(A,H){
  const tcx=[clash(A.tcards,H.tcards),clash(H.tcards,A.tcards)];
  const g={tcx,ta:tcx.map(l=>new Set(l.filter(x=>x[1]==='발동').map(x=>x[0]))),ctrl:null,t:[A,H],inn:1,half:0,outs:0,bases:[null,null,null],sc:[0,0],line:[[],[]],hits:[0,0],idx:[0,0],hr:0,done:false,log:[],px:[[],[]],used:[new Set(),new Set()],bx:[{},{}],pit:[]};
  for(const s of [0,1]){for(const id of (g.t[s].tired||[]))g.used[s].add(id);g.pit[s]=newPit(g,s,g.t[s].sp,true);for(const x of g.t[s].lu)g.bx[s][x.c.id]={c:x.c,pos:x.pos,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,sb:0,r:0,e:0,a:0}}
  say(g,`${g.t[0].name}(원정) 선발 ${A.sp.name}, ${g.t[1].name}(홈) 선발 ${H.sp.name}`,'h');
  for(const s of [0,1])if(tcx[s].length)say(g,`${g.t[s].name} 작전 카드: ${tcx[s].map(([id,st])=>TC_BY[id][1]+(st==='발동'?'':` (${st})`)).join(', ')}`,'h');
  say(g,'1회초','i');return g}
function say(g,txt,k){g.log.push({inn:g.inn,half:g.half,txt,k:k||''})}
const ERA_SP=y=>{y=+y||2026;const k=[[1985,1.27],[1995,1.12],[2005,0.82]];if(y<=k[0][0])return k[0][1];for(let i=1;i<k.length;i++)if(y<=k[i][0]){const [a,u]=k[i-1],[b,v]=k[i];return u+(v-u)*(y-a)/(b-a)}return k[k.length-1][1]}; // 2026-11-28 SJ: 시대별 선발 운용(실제 KBO 완투율·선발승 비율로 보정)
const lim=p=>p.L;
// 리그 기준(능력치 70일 때 비율). 엔진 안에서만 쓰는 값
const odd=(p,m)=>{const o=p/(1-p)*m;return o/(1+o)},SMX=b=>b.sm?cl((b.sm-1)*.08,-.06,.12):0; // 희생타 지수(리그 대비 희생번트+희생플라이 비율) → 주자 3루 땅볼·뜬공 득점, 진루타 확률
const LG={bb:.085,k:.175,hr:.025,babip:.3,gb:.45},log5=(b,p,l)=>{const o=b/(1-b)*p/(1-p)/(l/(1-l));return o/(1+o)};
function manage(g,f){
  const T=g.t[f],p=g.pit[f],lead=g.sc[f]-g.sc[1-f],closer=T.pen[0],tac=T.tac||TAC_DEF,cv=tac.relief,fx=T.fx||{},clean=g.outs===0&&!g.bases.some(Boolean);
  const lo=[1,1,1,0,-1][cv],hi=[3,3,4,4,4][cv],cfree=closer&&!g.used[f].has(closer.id)&&p.c.id!==closer.id;
  if(cfree&&!(p.starter&&ERA_SP(p.c.year)>1.05&&p.bf<lim(p)*.85)&&((g.inn>=9&&lead>=lo&&lead<=hi&&(clean||cv>=1)&&(lead>0||f===1||g.inn>9))||((cv>=4||fx.close8)&&g.inn===8&&(g.outs===2||fx.close8)&&lead>0&&lead<=(fx.close8?3:2)))){bring(g,f,closer,'마무리');return}
  const setup=T.pen[1];if(g.inn===8&&lead>0&&lead<=3&&g.outs===0&&setup&&!g.used[f].has(setup.id)&&!(p.starter&&p.bf<lim(p)*.8)){bring(g,f,setup,'셋업');return}
  const need=p.bf>=lim(p)||(p.starter&&p.r>=[8,7,6,5,4][tac.hook]+Math.round(Math.max(0,ERA_SP(p.c.year)-0.82)*5))||(!p.starter&&p.r>=[4,3,3,2,2][tac.relief]&&p.bf>=3);
  if(!need)return;
  const nx=T.pen.slice(2).filter(c=>!g.used[f].has(c.id)).sort((a,b)=>((a.fat||0)>=30)-((b.fat||0)>=30))[0]||(T.pen[1]&&!g.used[f].has(T.pen[1].id)?T.pen[1]:null)||(closer&&!g.used[f].has(closer.id)&&g.inn>=8?closer:null);
  if(nx)bring(g,f,nx,'')}
function bring(g,f,c,role){g.pit[f]=newPit(g,f,c,false);say(g,`투수 교체: ${g.t[f].name} ${role?role+' ':''}${c.name}`,'c')}
function score(g,r){g.sc[g.half]++;if(g.sc[g.half]===g.sc[1-g.half]+1){g.wrec=g.wrec||[null,null];g.wrec[g.half]=g.pit[g.half]} /* 2026-11-28 SJ: 승리 투수 = 마지막으로 리드를 잡을 때 그 팀 투수 */g.hr++;r.p.r++;g.bx[g.half][r.c.id].r++}
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
const reDef=T=>{const w=p=>p==='C'||p==='SS'||p==='CF'?1.3:1,fl=T.lu.filter(x=>x.pos!=='DH');if(fl.length)T.def=fl.reduce((s,x)=>s+defH(x.c,x.pos,2)*w(x.pos),0)/fl.reduce((s,x)=>s+w(x.pos),0)+((T.fx||{}).def||0)};
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
let PW_CH=.0003,PW_HB=.001,PW_BB=.0005,PW_CB=.0004,PW_C=84;const setPW=o=>{if(o.c!=null)PW_C=o.c;if(o.ch!=null)PW_CH=o.ch;if(o.hb!=null)PW_HB=o.hb;if(o.bb!=null)PW_BB=o.bb;if(o.cb!=null)PW_CB=o.cb};
function pa(g,manual){
  if(g.done)return;
  const bat=g.half,f=1-bat;manage(g,f);g.hnr=false;g.inf=false;
  let tk=g.pending;g.pending=null;const mine=s=>manual&&g.ctrl===s;
  if(!mine(f)&&g.outs===0&&!g.bases.some(Boolean))aiDefSub(g,f);if(!mine(bat))aiPR(g,bat);
  if(!tk&&!mine(bat))tk=aiOff(g,bat);if(!tk&&!mine(f))tk=aiDef(g,f);
  const OT=g.t[bat],DT=g.t[f],ofx=OT.fx||{},dfx=DT.fx||{},otac=OT.tac||TAC_DEF,dtac=DT.tac||TAC_DEF,po=dtac.shift,OA=g.ta[bat],DA=g.ta[f];
  // 개인 수비: 수비 위치의 야수와 그 포지션 수비값. 보살(a)·실책(e)은 수비팀 박스에 기록
  const fld=p=>{const x=DT.lu.find(y=>y.pos===p);return x?{c:x.c,d:defH(x.c,p,0),a:defH(x.c,p,1),p}:null},cr=F=>{const o=g.bx[f][F.c.id];if(o)o.a=(o.a||0)+1},ce=F=>{const o=g.bx[f][F.c.id];if(o)o.e=(o.e||0)+1};
  const DX=d=>(d-90)/10,OFP={'좌':'LF','중':'CF','우':'RF'},CAT=fld('C'),cArm=CAT?DX(CAT.a):0; // 포지션 수비값은 대개 80~100, 90이 보통
  // 보살: 추가 진루를 노린 주자를 외야 송구로 잡을 확률(외야 수비↑, 주자 주력↓). 포수 수비는 도루 성공률을 낮춤
  const armOut=(F,s,base)=>F&&rnd()<cl(base+.02*DX(F.a)-.03*X(s.c.r.spd),.005,.15);
  const pVel=()=>{const p=g.pit[f]&&g.pit[f].c;const r=p&&(p.rawr||p.r);return r&&r.vel!=null?r.vel:70}; // 2026-11-27 SJ: 구속 빠른 투수는 도루 저지에 유리
  const stealP=s=>cl((.6+.25*X(s.c.r.spd)+.03*RTIER(s.c.r.spd)+(ofx.steal||0)-.04*po-.04*cArm-.05*X(pVel()))*(OA.has('b6')?1.2:1)*(DA.has('c4')?.8:1),.05,.95);
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
  // 폭투·포일(2026-11-27 SJ): 주자 있을 때 원바운드 공 → 포수 블로킹 실패 → 주자는 주력·정신력으로 진루 판단. 제구 낮고 변화구 많을수록 잦고, 포수 수비가 막아 줌
  if(B[0]||B[1]||B[2]){const pr=pc.r,cd=CAT?CAT.d:85,pD=cl(.024*(1+(70-pr.ctl)*.02+((pr.bk!=null?pr.bk:70)-70)*.01),.005,.05)*arsOf(pc,b.bh).wp*cl(1-.5*DX(cd),.4,1.8);
   if(rnd()<pD){const pb=rnd()<cl(.15-.1*DX(cd),.05,.35),mv=[];for(let i=2;i>=0;i--){const s=B[i];if(!s)continue;if(i<2&&B[i+1])continue;
     if(rnd()<cl(.72+.25*X(s.c.r.spd)+.004*((s.c.r.men||70)-70)-(i===2?.1:0),.35,.97)){B[i]=null;if(i===2){score(g,s);mv.push(s.c.name+' 홈인')}else{B[i+1]=s;mv.push(`${s.c.name} ${i+2}루`)}}}
    if(mv.length){if(pb){if(CAT){const o=g.bx[f][CAT.c.id];if(o)o.pb=(o.pb||0)+1}}else P.wp=(P.wp||0)+1;g.wpb=(g.wpb||0)+1;say(g,`${pb?'포일':'폭투'}${pb&&CAT?` (포수 ${CAT.c.name})`:''}: ${mv.join(', ')}`);
     if(g.half===1&&g.inn>=9&&g.sc[1]>g.sc[0]){g.line[1].push(g.hr);say(g,`끝내기! ${g.t[1].name} 승리`,'e');finish(g);return}}}}
  const onB=!!(B[0]||B[1]||B[2]);
  const clutch=(g.inn>=7&&Math.abs(g.sc[0]-g.sc[1])<=2)||!!B[1]||!!B[2],press=clutch?1:onB?.5:0,L=lim(P),fat=cl((P.bf-L*.7)/(L*.6),0,1),pmen=pc.r.men+(P.starter?(dfx.smen||0):0)+(DA.has('c1')&&f===1?5:0)+(DA.has('c6')&&f===0?5:0)+(DA.has('p4')&&(B[1]||B[2])?8:0);
  const close1=Math.abs(g.sc[0]-g.sc[1])<=1,dc2=DA.has('c2')&&close1?2:0,dc3=DA.has('c3')&&(DT.ctx||{}).rematch?3:0,svs=g.inn>=9&&P.c.id===(DT.pen[0]||{}).id&&g.sc[f]-g.sc[bat]>=1&&g.sc[f]-g.sc[bat]<=3;
  const p5=DA.has('p5')&&P.starter&&g.inn===1?6:0,stu=pc.r.stu-14*fat+(P.starter?0:(dfx.rstu||0)+(DA.has('p2')&&g.inn>=7?5:0))+P.badj*.6+p5+dc2+(DA.has('p6')&&svs?6:0)-(OA.has('b8')&&g.idx[bat]===3?6:0),ctl=pc.r.ctl-10*fat-(P.starter&&OA.has('b4')&&g.inn<=3?5:0)+(.2*(MEN_P-70)+MEN_K*(pmen-MEN_P))*press+P.badj+(P.lead||0)+p5+dc2+dc3+(DA.has('p3')&&b.bh==='L'?6:0),risp=!!(B[1]||B[2]);const vsSP=P.starter,home=bat===1;
  let b0=b.r;{const m={},ad=(k,v)=>{m[k]=(m[k]||0)+v},oc2=OA.has('c2')&&close1;
   if(vsSP&&OA.has('b1')&&pc.cost>=6)ad('con',5);if(OA.has('b2')&&risp)ad('con',6);if(OA.has('b3')&&pc.ph==='L')ad('pow',5);if(OA.has('b5')&&g.inn>=8&&g.sc[bat]<g.sc[f]){ad('con',6);ad('pow',6)}
   if(OA.has('b7')&&g.inn>=6){if(g.phNow===b.id)ad('con',10);else if(g.phPrev===g.idx[bat])ad('eye',5)}if(OA.has('c1')&&home)ad('men',5);if(OA.has('c6')&&!home)ad('men',5);if(oc2){ad('con',2);ad('pow',2);ad('eye',2)}
   if(OA.has('c3')&&(OT.ctx||{}).rematch)ad('eye',3);if(DA.has('p7')&&!(DA.has('p6')&&svs&&false))ad('con',-4);
   if(Object.keys(m).length){b0={...b0};for(const k in m)b0[k]+=m[k]}}
  let br=press?{...b0,con:b0.con+(.2*(MEN_B-70)+MEN_K*(b0.men-MEN_B))*press+(risp?(ofx.clutch||0):0)}:b0;if(ofx.ace&&pc.ovr>=75)br={...br,con:br.con+ofx.ace};
  const def=g.t[f].def,sw=otac.power-2,sh=dtac.shift-2;
  // ── 타석 모델: 능력치 70 = 그 시즌 리그 평균(카드 변환식 기준). 타자·투수 각자의 비율을 log5로 합쳐 특징이 그대로 드러나게 ──
  const dS=stu-pc.r.stu,dV=onB?-cl(2-(pmen-70)*.05,.5,3)*.55:0 /* 주자 있으면 세트포지션: 구속 -2(정신력 높으면 덜) → 탈삼진 구성(kv)에 반영 */,kv=(pc.r.kv!=null?pc.r.kv:pc.r.stu)+dS+dV,hv=(pc.r.hv!=null?pc.r.hv:pc.r.stu)+dS,bk=(pc.r.bk!=null?pc.r.bk:70)+dS,AR=arsOf(pc,b.bh),pgb=AR.gb;
  const plat=(!b.bh||!pc.ph?0:b.bh==='S'?(b.swx?1:.5):b.bh===pc.ph?-1:1)*(pc.arm?1.8:1); // 같은 손 -1, 반대 손 +1, 스위치 +0.5. 언더·사이드는 좌우 차이가 1.8배
  const tC=RTIER(b.r.con),tP=RTIER(b.r.pow),tE=RTIER(b.r.eye),tKV=RTIER(pc.r.kv!=null?pc.r.kv:pc.r.stu),tHV=RTIER(pc.r.hv!=null?pc.r.hv:pc.r.stu),tCT=RTIER(pc.r.ctl),tPT=pc.r.ptT||0,
    defT=DT.lu.reduce((s,x)=>s+(x.pos==='DH'?0:DTIER(effDef(x.c,x.pos))),0); // 구간 효과
  const bBB=cl(LG.bb+(br.eye-70)*.0032+.004*tE,.02,.22),bK=cl(LG.k-(br.con-70)*.0042-(br.eye-70)*.0015+(br.pow-70)*.0018-.003*tC,.04,.4),bHR=cl(LG.hr+(br.pow-70)*.0016+.002*tP,.002,.1),
    bBA=cl(LG.babip+(br.con-70)*.0028+.004*tC,.2,.42),bGB0=cl(LG.gb-(br.pow-70)*.004+(br.spd-70)*.001,.28,.62),bGB=b.gm?cl(odd(LG.gb,b.gm),.25,.7):bGB0; // 2026-11-28(SJ): 실제 땅볼/뜬공(GO/AO) 비율. 타율·홈런 기대치는 기존 식(bGB0) 기준으로 유지하고 타구 구성만 바뀜
  const qBB=cl(LG.bb-(ctl-70)*.0045-.004*tCT,.015,.22),qK=cl(LG.k+(kv-70)*.011+.01*tKV+AR.k,.04,.45),qHR=cl(LG.hr-(hv-70)*.0005-(ctl-PW_C)*PW_CH-.0015*tHV,.008,.05)*AR.hr,qBA=cl(LG.babip-(hv-70)*PW_HB-(bk-PW_C)*PW_BB-(ctl-PW_C)*PW_CB-.0025*tHV,.24,.36)*AR.ba; // 2026-11-26(SJ): 제구는 실투(피홈런·피안타), 변화구는 약한 타구에도
  const pBB=cl(log5(bBB,qBB,LG.bb)-.003*sw+.002*po,.015,.25),pK=cl(log5(bK,qK,LG.k)*(1-.05*plat)+.006*sw+(g.hnr?.015:0)+(ofx.kp||0),.03,.45),
    pG=log5(bGB,pgb,LG.gb),pG0=log5(bGB0,pgb,LG.gb),pHR=cl(log5(bHR,qHR,LG.hr)*(1-pG0)/(1-LG.gb)*(1+.07*plat)*(1+.12*sw)+(ofx.hrp||0),.001,.11),
    pBA=log5(bBA,qBA,LG.babip)+.01*plat-.04*X(def)-.0008*defT+(g.inf?.03:0)-.003*sw-.004*sh-(risp?(dfx.risp||0):0);
  P.bf++;let u=rnd(),txt='',n=0,big='';const sb=g.sc[bat];
  if(u<pBB+.007){const hbp=u>=pBB;n=force(g,run);bs.bb++;P.bb++;txt=hbp?'몸에 맞는 공':'볼넷'}
  else if((u-=pBB+.007)<pK){bs.ab++;bs.k++;P.k++;out(g,1);txt=rnd()<.7?'헛스윙 삼진':'루킹 삼진';
    if(g.hnr&&B[0]&&g.outs<3){const s=B[0];if(rnd()<.55+.25*X(s.c.r.spd)-.04*po+(ofx.hnr||0)){B[1]=s;B[0]=null;g.bx[bat][s.c.id].sb++;txt+=` (히트앤런, ${s.c.name} 2루 안착)`}else{B[0]=null;out(g,1);txt+=` (히트앤런 실패, ${s.c.name} 아웃)`}}}
  else if((u-=pK)<pHR){bs.ab++;bs.h++;bs.hr++;P.h++;P.hr++;g.hits[bat]++;const on=B.filter(Boolean).length;
    for(const r of B)if(r)score(g,r);score(g,run);g.bases=[null,null,null];n=on+1;txt=`${pick(DIR)}월 ${['솔로','투런','스리런','만루'][on]} 홈런!`;big='hr'}
  else{bs.ab++;const gb=rnd()<pG; // 땅볼 타구는 안타가 덜 되고(주력이 빠르면 내야안타) 장타가 거의 없음. 뜬공·라인드라이브는 장타
    const pHit=cl(pBA+.065*(pG-pG0)+(gb?-.035+(br.spd-70)*.0015:.03),.15,.5);
    if(rnd()<pHit){bs.h++;P.h++;g.hits[bat]++;const t=rnd(),xb=b.xb||[1,1],p3=gb?.004*xb[1]:cl((.025+(br.spd-70)*.0012)*xb[1],.003,.1),p2=gb?cl((.06+(br.pow-70)*.002+(br.spd-70)*.001)*xb[0],.02,.15):cl((.262+(br.pow-70)*.006-(hv-70)*.002+(br.spd-70)*.002)*(.5+.5*xb[0]),.12,.55); // XBH: 순장타(파워)·주력 + 실제 2·3루타 비율
      if(t<p3){for(const r of B)if(r)score(g,r);n=B.filter(Boolean).length;g.bases=[null,null,run];txt=`${pick(DIR)}중간 3루타`}
      else if(t<p3+p2){const nb=[null,run,null],dd=pick(['좌익선상','좌중간','우중간','우익선상']),F=fld(dd[0]==='좌'?'LF':dd==='우익선상'?'RF':'CF');let ex='';if(B[2]){score(g,B[2]);n++}if(B[1]){score(g,B[1]);n++}
        if(B[0]){if(rnd()<.45+.2*X(B[0].c.r.spd)){if(armOut(F,B[0],.03)){out(g,1);cr(F);ex=` (${F.c.name} 홈 보살, ${B[0].c.name} 아웃)`}else{score(g,B[0]);n++}}else nb[2]=B[0]}g.bases=nb;txt=`${dd} 2루타${ex}`}
      else{const nb=[run,null,null],dr=pick(DIR),F=fld(OFP[dr]);let ex='';if(B[2]){score(g,B[2]);n++}
        if(B[1]){if(rnd()<.65+.2*X(B[1].c.r.spd)+(ofx.xb||0)){if(g.outs<3&&armOut(F,B[1],.035)){out(g,1);cr(F);ex=` (${F.c.name} 홈 보살, ${B[1].c.name} 아웃)`}else{score(g,B[1]);n++}}else nb[2]=B[1]}
        if(B[0]&&g.outs<3){if(!nb[2]&&rnd()<.27+.15*X(B[0].c.r.spd)+(g.hnr?.35+(ofx.hnr||0):0)+(ofx.xb||0)){if(armOut(F,B[0],.02)){out(g,1);cr(F);ex+=` (${F.c.name} 3루 보살, ${B[0].c.name} 아웃)`}else nb[2]=B[0]}else nb[1]=B[0]}g.bases=g.outs<3?nb:[null,null,null];txt=`${dr}전 안타${ex}`}}
    else{const o0=g.outs,fp=gb?pick(['P','1B','2B','SS','3B','SS','2B']):pick(['LF','CF','RF','LF','CF','RF','2B','SS']),FD=fld(fp);
      // 실책: 그 타구를 처리한 야수의 수비가 낮을수록 잦음(수비 90 기준 2.5%)
      if(FD&&rnd()<cl(.025-.012*DX(FD.d),.006,.07)){ce(FD);if(B[2]&&B[1]&&B[0]){n=force(g,run)}else{if(B[2]){score(g,B[2]);n++}const nb=[run,B[0]||null,B[1]||null];g.bases=nb}txt=`${PK[fp]} 실책으로 출루`}
      else if(gb){
        if(B[0]&&o0<2&&rnd()<(.28-.1*X(br.spd))*(g.hnr?.25:1)){out(g,2);B[0]=null;txt='병살타';if(g.outs<3){if(B[2]){score(g,B[2])}B[2]=B[1];B[1]=null}}
        else{out(g,1);txt=`${fp==='P'?'투수':PK[fp]} 땅볼`;
          const adv=ofx.adv||0;if(g.outs<3){if(B[2]&&rnd()<(g.inf?.12:.45)+(ofx.sf||0)+adv+SMX(b)){score(g,B[2]);n++;B[2]=null}if(B[1]&&!B[2]&&rnd()<.5+adv+SMX(b)){B[2]=B[1];B[1]=null}if(B[0]&&!B[1]&&rnd()<.5+adv+SMX(b)){B[1]=B[0];B[0]=null}}}}
      else{out(g,1);txt=`${PK[fp]} ${rnd()<.2?'파울 ':''}플라이 아웃`;
        if(g.outs<3&&B[2]&&rnd()<.6+.2*X(B[2].c.r.spd)+(ofx.sf||0)+SMX(b)){if(['LF','CF','RF'].includes(fp)&&armOut(FD,B[2],.03)){const s3=B[2];out(g,1);cr(FD);B[2]=null;txt+=` (${FD.c.name} 홈 보살, ${s3.c.name} 태그아웃)`}else{score(g,B[2]);n++;B[2]=null;txt+=' (희생플라이)'}}}}}
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
  const restB=bats.filter(c=>!used.has(pkt(c))).sort((a,b)=>b.ovr-a.ovr),bc=restB.find(c=>canPlay(c,'C'));
  const bench=[...(bc?[bc]:[]),...restB.filter(c=>c!==bc)].slice(0,5).map(c=>{used.add(pkt(c));return c.id});
  return {lineup:order(slots).map(x=>({id:x.c.id,pos:x.pos})),bench,rot,pen}}
function teamYear(key){const [y,t]=key.split(' '),ids=TEAMYEARS[key],c=byId[ids[0]];
  return {name:`${y} ${t}`,full:`${y} ${t}`,key,color:LINE_COLOR[c.line]||'#555',...bestLineup(ids),rotIdx:0}}
function teamOvr(T){const cs=[...T.lineup.map(x=>x.id),...(T.bench||[]),...T.rot,...T.pen].map(id=>byId[id]).filter(Boolean);return Math.round(cs.reduce((s,c)=>s+c.ovr,0)/Math.max(1,cs.length))}
function rr(n){const t=[...Array(n).keys()],R=[];for(let r=0;r<n-1;r++){const pr=[];for(let i=0;i<n/2;i++){const a=t[i],b=t[n-1-i];pr.push(r%2?[a,b]:[b,a])}R.push(pr);t.splice(1,0,t.pop())}return R}
if(typeof module!=='undefined'&&typeof window==='undefined')module.exports={setMEN:v=>{MEN_K=v},setPW,AGAIN_SETS,againCount,againName,CHAMPS,isChamp,RTIER,DTIER,TIER_FX,ptTier,potMul,abCapC,NAT_SETS,natHit,ARM_N,armOf,ptGrades,ptLetter,FAT,fatAdd,fatRest,fatSP,FX_TARGETS,FX_T_BY,FA_LINKS,ERA_SETS,LINE_UNIONS,RIVALS,CH_WILD,AB_MUL,abMul,abGain,abCap,EX_MAX,exCount,exErr,exTrim,SYN_EX_MAX,baseId,condMin,sameTY,FX_FAM,pkt,ADJ,ADJ_PCT,adjPair,adjBonus,ABD,AB_BY,AB_CAP,ABG,ageOf,abAge,abRoll,SK_MUL,BO_PEN,BO_TH,BO_PA,BO_OBP,BO_OPS,rates,boKey,boScore,boOf,slotBo,boOk,PAT,patOf,openCount,isOpen,TCARDS,TC_BY,SUPS,SUP_BY,synth,clash,battery,TAC_DEF,MANAGERS,tactic,loadCards,get CARDS(){return CARDS},get byId(){return byId},get TEAMYEARS(){return TEAMYEARS},simTeam,mkGame,pa,simAll,teamYear,bestLineup,teamOvr,rr,teamColor,mkBlock,cellsOf,canPlace,skillOf,setRnd:f=>{rnd=f}};
