// 국가대표 카드(v:'NT', mx:1 미션 전용). 국대 우승 멤버 중 그해 KBO 카드가 없는 해외파·아마추어 선수용
// 사용: node tools/nt.js data/cards.json data/kbo_raw_1982_2026.json   (special.js 등 v 카드를 다시 만드는 도구 뒤에 실행. 기존 NT는 지우고 다시 만듦)
// 해외파: 그해 해외 리그 기록을 convert.js와 같은 공식(그해 KBO 리그 평균 기준)으로 환산하고 리그 수준 보정(MLB +6, NPB +3, 타격·구위 능력치)
//   출처: NPB 공식(npb.jp/bis), statscrew.com(MLB). 수비 위치·구종·출신 정보는 같은 선수의 가장 가까운 KBO 카드에서 가져옴
// 아마추어: 가장 가까운 KBO 시즌 카드를 복사하고 능력치 -3(체력 제외). 기록 표시는 그 카드의 기록
// KBO 기록이 없는 선수(장현석)는 기본값
const fs=require('fs'),[,,cp,rp]=process.argv,D=JSON.parse(fs.readFileSync(cp)),raw=JSON.parse(fs.readFileSync(rp));
const num=v=>{if(v==null||v==='-'||v==='')return 0;v=String(v).replace(/,/g,'');const m=v.match(/^(\d+)\s+(\d)\/3$/);if(m)return +m[1]+m[2]/3;const f=v.match(/^(\d)\/3$/);if(f)return f[1]/3;return +v||0};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),R=v=>Math.round(cl(v,25,99));
const hash=s=>{let h=2166136261;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
const srand=s=>{let x=hash(s)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}};
function lgOf(y){const Y=raw[y];let L={pa:0,ab:0,h:0,d:0,t:0,hr:0,bb:0,hbp:0,so:0,sb:0,cs:0},Lp={tbf:0,so:0,bb:0,hr:0,er:0,ip:0,h:0};
  for(const t in Y){for(const r of Y[t].H||[]){const [n,tm,avg,g,pa,ab,h,d,tr,hr,rbi,sb,cs,bb,hbp,so]=r.map((v,i)=>i<2?v:num(v));L.pa+=pa;L.ab+=ab;L.h+=h;L.d+=d;L.t+=tr;L.hr+=hr;L.bb+=bb;L.hbp+=hbp;L.so+=so;L.sb+=sb;L.cs+=cs}
    for(const r of Y[t].P||[]){Lp.tbf+=num(r[11]);Lp.ip+=num(r[12]);Lp.so+=num(r[17]);Lp.h+=num(r[13]);Lp.bb+=num(r[15]);Lp.hr+=num(r[14]);Lp.er+=num(r[19])}}
  return {avg:L.h/L.ab,iso:(L.d+2*L.t+3*L.hr)/L.ab,bb:L.bb/L.pa,k:L.so/L.pa,sba:(L.sb+L.cs)/(L.h+L.bb+L.hbp),tr:L.t/L.ab,pk:Lp.so/Lp.tbf,pbb:Lp.bb/Lp.tbf,phr:Lp.hr/Lp.tbf,ph:Lp.h/Lp.tbf,era:Lp.er*9/Lp.ip}}
const NAT={1998:'1998 방콕 AG 금메달',2002:'2002 부산 AG 금메달',2008:'2008 베이징 올림픽 금메달',2010:'2010 광저우 AG 금메달',2014:'2014 인천 AG 금메달',2015:'2015 프리미어12 우승',2023:'2022 항저우 AG 금메달'};
// [이름, 연도, 유형, 근거 카드 조건(팀·출생연도), 해외 기록]
// 타자 기록: {lg,g,pa,ab,h,d,t,hr,rbi,sb,cs,bb,hbp,so}  투수 기록: {lg,g,gs,w,l,sv,hld,ip,tbf,h,hr,bb,so,er}
const LIST=[
 ['장영균',1998,'B'],['홍성흔',1998,'B'],['황우구',1998,'B'],['강봉규',1998,'B'],['강철민',1998,'P'],['강혁',1998,'B'],
 ['김병현',1998,'P'],['경헌호',1998,'P'],
 ['박찬호',1998,'P',{t:'한화'},{lg:'MLB',g:34,gs:34,w:15,l:9,sv:0,hld:0,ip:220+2/3,tbf:946,h:199,hr:16,bb:97,so:191,er:91}],
 ['박한이',1998,'B'],['서재응',1998,'P'],['신명철',1998,'B'],
 ['정재복',2002,'P'],
 ['이승엽',2008,'B',{t:'삼성'},{lg:'NPB',g:45,pa:170,ab:153,h:38,d:4,t:0,hr:8,rbi:27,sb:1,cs:0,bb:11,hbp:6,so:37}],
 ['김명성',2010,'P',{b:1988}],
 ['김태균',2010,'B',{t:'한화'},{lg:'NPB',g:141,pa:614,ab:527,h:141,d:22,t:0,hr:21,rbi:92,sb:0,cs:0,bb:74,hbp:4,so:140}],
 ['추신수',2010,'B',{},{lg:'MLB',g:144,pa:646,ab:550,h:165,d:31,t:2,hr:22,rbi:90,sb:22,cs:7,bb:83,hbp:11,so:118}],
 ['홍성무',2014,'P'],
 ['이대은',2015,'P',{},{lg:'NPB',g:37,w:9,l:9,sv:0,hld:4,ip:119+2/3,tbf:536,h:121,hr:11,bb:63,so:106,er:51}],
 ['이대호',2015,'B',{},{lg:'NPB',g:141,pa:584,ab:510,h:144,d:30,t:0,hr:31,rbi:98,sb:0,cs:1,bb:62,hbp:9,so:109}],
 ['장현석',2023,'P'],
];
const BON={MLB:6,NPB:3};
D.cards=D.cards.filter(c=>c.v!=='NT');
// 동명이인 출신 정보 정정(출생·출신고 수집 때 다른 선수 값이 붙음): 박찬호(한화 투수, 1973 공주고), 김태균(한화, 1982 북일고)
for(const c of D.cards){const n=c.n.replace(/#\d+$/,'');
  if(n==='박찬호'&&c.t==='한화'&&c.k==='P'){c.b=1973;c.hs='공주고';c.rg='충남';c.un='한양대'}
  if(n==='김태균'&&c.t==='한화'&&c.y<=2002&&c.b===1971){c.b=1982;c.hs='북일고';c.rg='충남';delete c.un}}
const base=D.cards.filter(c=>!c.v&&!c.tx),nm=c=>c.n.replace(/#\d+$/,'');
const sortedO=base.map(c=>c.o).sort((a,b)=>a-b),pct=o=>{let lo=0,hi=sortedO.length;while(lo<hi){const m=(lo+hi)>>1;if(sortedO[m]<o)lo=m+1;else hi=m}return lo/sortedO.length};
const CUT=[.25,.42,.56,.68,.78,.86,.92,.96,.985],costOf=o=>1+CUT.filter(x=>pct(o)>=x).length;
const ovrOf=c=>{const r=c.r;return Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)))};
const KEEP=['ps','p','pt','hs','rg','b','un','no','h','img'],out=[],log=[];
for(const [n,y,k,q={},st] of LIST){
  const L=base.filter(c=>nm(c)===n&&c.k===k&&(!q.t||c.t===q.t)&&(!q.b||c.b===q.b)).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y)||b.o-a.o),src=L[0];
  let c;
  if(!src){ // 기본값: 장현석(마산용마고, 2004년생, 우투우타). 강속구 고졸 투수
    c={n,y,k:'P',p:'RP',r:[80,64,63,56,55,55],pt:{'직구':'B','슬라이더':'C','커브':'D'},s:[0,0,0,0,0,0,0,0],hs:'마산용마고',rg:'경남',b:2004,h:'a'};log.push(`${n} ${y}: 기본값`)}
  else{c={n,y,k};for(const f of KEEP)if(src[f]!=null)c[f]=JSON.parse(JSON.stringify(src[f]));
    if(!st){c.r=src.r.map((v,i)=>k==='P'&&i===4?v:Math.max(25,v-3));c.s=src.s;if(src.x)c.x=src.x;log.push(`${n} ${y}: ${src.y} ${src.t} 카드 -3`)}
    else{const lg=lgOf(y),b=BON[st.lg],rr=srand(n+y+'m');
      if(k==='B'){const ab=st.ab,pa=st.pa,W=pa/(pa+200),bl=(o,p)=>W*o+(1-W)*p;
        const avgR=bl(st.h/ab,lg.avg-.03),isoR=bl((st.d+2*st.t+3*st.hr)/ab,lg.iso*.7),bbR=bl(st.bb/pa,lg.bb*.85),kR=bl(st.so/pa,lg.k*1.15),sbaR=bl((st.sb+st.cs)/Math.max(1,st.h+st.bb+st.hbp),lg.sba*.8),trR=bl(st.t/ab,lg.tr);
        const con=70+(avgR-lg.avg)/.025*8-(kR-lg.k)/.04*4+b,pow=70+(isoR-lg.iso)/.04*9+b,eye=70+(bbR-lg.bb)/.025*8+b,spd=50+20*Math.sqrt(Math.max(0,sbaR/lg.sba))+(trR-lg.tr)/.004*3;
        const bunt=50+(spd-70)*.4+(70-pow)*.4+rr()*14-7,men=55+20*Math.min(1,pa/550)+(avgR-lg.avg)/.025*3+rr()*10-5+2;
        c.r=[R(con),R(pow),R(eye),R(bunt),R(spd),src.r[5],R(men)];c.s=[+(st.h/ab).toFixed(3),st.hr,st.rbi,st.sb,st.g,pa];c.x=[pa,ab,st.h,st.d,st.t,st.hr,st.bb,st.hbp]}
      else{const tbf=st.tbf,W=tbf/(tbf+300),bl=(o,q)=>W*o+(1-W)*q;
        const kR=bl(st.so/tbf,lg.pk*.85),bbR=bl(st.bb/tbf,lg.pbb*1.15),hrR=bl(st.hr/tbf,lg.phr*1.15),eraR=bl(st.er*9/st.ip,lg.era+.8),hR=bl(st.h/tbf,lg.ph*1.08);
        const velo=70+(kR-lg.pk)/.04*7+rr()*8-4+(lg.era-eraR)/.6*1.5+b,stu=70-(hrR-lg.phr)/.008*4-(hR-lg.ph)/.03*5+(lg.era-eraR)/.6*3+b,ctl=70-(bbR-lg.pbb)/.025*9+(lg.era-eraR)/.6*2+b;
        const ipg=st.ip/st.g,sp=st.gs/st.g>=.5||(st.gs===undefined&&ipg>=3),sta=sp?cl(40+9*ipg,45,99):cl(35+10*ipg,35,70),men=55+20*Math.min(1,tbf/700)+(st.sv+st.hld)/40*10+(lg.era-eraR)/.6*3+rr()*10-5+2;
        c.p=sp?'SP':'RP';c.r=[R(velo),R(stu),src.r[2],R(ctl),Math.round(sta),R(men)];c.s=[+(st.er*9/st.ip).toFixed(2),st.w,st.l,st.sv,st.hld,st.so,+st.ip.toFixed(1),st.g]}
      log.push(`${n} ${y}: ${st.lg} 기록 환산 (수비·구종 ${src.y} ${src.t})`)}}
  c.t='국가대표';c.l='국가대표';c.v='NT';c.mx=1;c.nt=NAT[y];c.o=ovrOf(c);c.c=costOf(c.o);
  const ord=['n','y','t','l','k','p','ps','r','pt','s','o','c','x','v','mx','nt','img','hs','rg','b','un','no','h'],o={};for(const f of ord)if(c[f]!=null)o[f]=c[f];out.push(o)}
D.cards.push(...out);fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
for(const c of out)console.log(c.y,c.n,c.k,c.p,'OVR',c.o,'C',c.c,JSON.stringify(c.r));console.log(log.join('\n'));
