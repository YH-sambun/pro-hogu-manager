// 투타 겸업 확장: 반대쪽 기록이 1경기라도 있으면 부 포지션 카드(tx=1)를 만듦. convert.js와 같은 산식.
// 사용: node tools/convert_tw.js data/kbo_raw_1982_2026.json data/cards.json data/birth_raw.txt
const fs=require('fs');
const [,,inp,outp,braw]=process.argv;let OV={};
const raw=JSON.parse(fs.readFileSync(inp,'utf8'));
const num=v=>{if(v==null||v==='-'||v==='')return 0;v=String(v).replace(/,/g,'');const m=v.match(/^(\d+)\s+(\d)\/3$/);if(m)return +m[1]+m[2]/3;const f=v.match(/^(\d)\/3$/);if(f)return f[1]/3;return +v||0};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const POSN={'포수':'C','1루수':'1B','2루수':'2B','3루수':'3B','유격수':'SS','좌익수':'LF','중견수':'CF','우익수':'RF','투수':'P'};
// 시드 난수 (이름+연도로 고정)
const hash=s=>{let h=2166136261;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
const srand=s=>{let x=hash(s)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}};
const PITCHES=['슬라이더','커브','포크','체인지업','싱커','커터','스플리터'];
const FAMOUS={ // 잘 알려진 주무기 보정 (선수명: {구종:등급})
 '선동열':{'직구':'S','슬라이더':'S'},'오승환':{'직구':'S','슬라이더':'A'},'류현진':{'체인지업':'S','직구':'A','커브':'A'},
 '김광현':{'슬라이더':'S','직구':'A'},'윤석민':{'슬라이더':'S','직구':'A'},'박철순':{'너클볼':'A','직구':'A'},'임창용':{'직구':'S','슬라이더':'A'},
 '최동원':{'직구':'S','커브':'S'},'안우진':{'직구':'S','슬라이더':'A'},'양현종':{'직구':'A','체인지업':'A'},'정대현':{'싱커':'S'},
 '구대성':{'슬라이더':'A','체인지업':'A'},'손민한':{'싱커':'A','슬라이더':'A'},'페디':{'슬라이더':'S','싱커':'A'},'이상훈':{'직구':'A','슬라이더':'A'}};
const GR=s=>s>=92?'S':s>=84?'A':s>=74?'B':s>=64?'C':'D';
function pitchSet(name,year,stu){const r=srand(name+year+'p'),out={'직구':GR(stu+(r()*12-6))},n=2+Math.floor(r()*2),pool=[...PITCHES];
  for(let i=0;i<n;i++){const k=pool.splice(Math.floor(r()*pool.length),1)[0];out[k]=GR(stu+(r()*16-10))}
  const f=FAMOUS[name];if(f&&stu>=80)Object.assign(out,f);return out}
const cards=[];
const LINE={MBC:'LG',LG:'LG',해태:'KIA',KIA:'KIA',OB:'두산',두산:'두산',삼성:'삼성',롯데:'롯데',빙그레:'한화',한화:'한화',삼미:'키움',청보:'키움',태평양:'키움',현대:'키움',쌍방울:'SK',SK:'SK',SSG:'SK',넥센:'키움',히어로즈:'키움',우리:'키움',키움:'키움',NC:'NC',KT:'KT'};
const stats={teamYears:0,short:[]};
for(const y of Object.keys(raw).sort()){
  const Y=raw[y],year=+y;
  // 리그 평균
  let L={pa:0,ab:0,h:0,d:0,t:0,hr:0,bb:0,hbp:0,so:0,sb:0,cs:0,e:0,g:0},Lp={tbf:0,so:0,bb:0,hr:0,er:0,ip:0,h:0};
  for(const t in Y){for(const r of Y[t].H||[]){const [n,tm,avg,g,pa,ab,h,d,tr,hr,rbi,sb,cs,bb,hbp,so,gdp,e]=r.map((v,i)=>i<2?v:num(v));
      L.pa+=pa;L.ab+=ab;L.h+=h;L.d+=d;L.t+=tr;L.hr+=hr;L.bb+=bb;L.hbp+=hbp;L.so+=so;L.sb+=sb;L.cs+=cs;L.e+=e;L.g+=g}
    for(const r of Y[t].P||[]){const tbf=num(r[11]),ip=num(r[12]);Lp.tbf+=tbf;Lp.ip+=ip;Lp.so+=num(r[17]);Lp.h+=num(r[13]);Lp.bb+=num(r[15]);Lp.hr+=num(r[14]);Lp.er+=num(r[19])}}
  const lg={avg:L.h/L.ab,iso:(L.d+2*L.t+3*L.hr)/L.ab,bb:L.bb/L.pa,k:L.so/L.pa,sba:(L.sb+L.cs)/(L.h+L.bb+L.hbp),tr:L.t/L.ab,e:L.e/L.g,
    pk:Lp.so/Lp.tbf,pbb:Lp.bb/Lp.tbf,phr:Lp.hr/Lp.tbf,ph:Lp.h/Lp.tbf,era:Lp.er*9/Lp.ip};
  for(const tname in Y){
    const T=Y[tname],line=LINE[tname]||tname;stats.teamYears++;
    const pit=(T.P||[]).map(r=>({n:r[0],era:num(r[2]),g:num(r[3]),cg:num(r[4]),w:num(r[6]),l:num(r[7]),sv:num(r[8]),hld:num(r[9]),tbf:num(r[11]),ip:num(r[12]),h:num(r[13]),hr:num(r[14]),bb:num(r[15]),so:num(r[17]),er:num(r[19])}));
    const pnames=new Set(pit.map(p=>p.n));
    const def={};for(const r of T.D||[]){const p=POSN[r[1]]||r[1];if(p==='P')continue;(def[r[0]]=def[r[0]]||{})[p]=(def[r[0]]?.[p]||0)+num(r[2])}
    let hit=(T.H||[]).map(r=>{const v=r.map((x,i)=>i<2?x:num(x));return {n:v[0],avg:v[2],g:v[3],pa:v[4],ab:v[5],h:v[6],d:v[7],t:v[8],hr:v[9],rbi:v[10],sb:v[11],cs:v[12],bb:v[13],hbp:v[14],so:v[15],e:v[17]}});
    const hitAll=hit,hnames=new Set(hit.map(b=>b.n));OV.n=(OV.n||0)+[...hnames].filter(n=>pnames.has(n)).length;OV.pa0=(OV.pa0||0)+hit.filter(b=>pnames.has(b.n)&&b.pa===0).length;
    hit=hit.filter(b=>!(pnames.has(b.n)&&b.pa<30));
    hit.sort((a,b)=>b.pa-a.pa);pit.sort((a,b)=>b.tbf-a.tbf);
    // 구단·연도당 최소 30명: 기본 기준(타석 10 / 상대타자 20) + 부족하면 출전 많은 순으로 채움
    let hs=hit.filter(b=>b.pa>=10),ps=pit.filter(p=>p.tbf>=20);
    while(hs.length+ps.length<30&&(hs.length<hit.length||ps.length<pit.length)){
      const nh=hit[hs.length],np=pit[ps.length];if(np&&(!nh||np.tbf>=nh.pa*1.5))ps.push(np);else if(nh)hs.push(nh);else ps.push(np)}
    if(hs.length+ps.length<30)stats.short.push(`${y} ${tname} ${hs.length+ps.length}`);
    const xH=hitAll.filter(b=>pnames.has(b.n)&&b.pa>=1&&!hs.includes(b)),xP=pit.filter(p=>hnames.has(p.n)&&p.g>=1&&!ps.includes(p));
    const seen={};const uid=n=>{seen[n]=(seen[n]||0)+1;return seen[n]>1?n+'#'+seen[n]:n};
    if(T.POS){ // 2000년 이전: 내야/외야 세부 포지션을 팀 안에서 성향으로 배정
      const prof=b=>{const ab=Math.max(1,b.ab);return {pow:(b.d+2*b.t+3*b.hr)/ab,spd:(b.sb+b.cs+3*b.t)/Math.max(1,b.h+b.bb)}};
      T._main={};const assign=(cls,slots,score)=>{const L=hs.filter(b=>T.POS[b.n]===cls).sort((a,b)=>b.pa-a.pa),free=[...slots];
        for(const b of L){const p=prof(b);let best=null,bs=-1e9;for(const s of (free.length?free:slots)){const v=score(s,p);if(v>bs){bs=v;best=s}}T._main[b.n]=best;const i=free.indexOf(best);if(i>=0)free.splice(i,1)}};
      assign('IF',['SS','2B','3B','1B'],(s,p)=>({SS:p.spd*3-p.pow*4,'2B':p.spd*2-p.pow*2,'3B':p.pow*2,'1B':p.pow*4-p.spd*2}[s]));
      assign('OF',['CF','LF','RF'],(s,p)=>({CF:p.spd*3,LF:p.pow*2,RF:p.pow*1.5+p.spd}[s]));}
    for(const b of [...hs,...xH]){const TX=xH.includes(b);
      const W=b.pa/(b.pa+200),bl=(o,p)=>W*o+(1-W)*p,ab=Math.max(1,b.ab),pa=Math.max(1,b.pa);
      // 부 포지션(투수의 타격): 표본이 작으면 '투수 타격' 수준의 낮은 사전값으로 수렴
      const Q=TX?{a:.09,i:.35,b:.5,k:1.8,s:.5}:{a:.03,i:.7,b:.85,k:1.15,s:.8};
      const avgR=bl(b.h/ab,lg.avg-Q.a),isoR=bl((b.d+2*b.t+3*b.hr)/ab,lg.iso*Q.i),bbR=bl(b.bb/pa,lg.bb*Q.b),kR=bl(b.so/pa,lg.k*Q.k);
      const sbaR=bl((b.sb+b.cs)/Math.max(1,b.h+b.bb+b.hbp),lg.sba*Q.s),trR=bl(b.t/ab,lg.tr);
      const con=70+(avgR-lg.avg)/.025*8-(kR-lg.k)/.04*4,pow=70+(isoR-lg.iso)/.04*9,eye=70+(bbR-lg.bb)/.025*8;
      const spd=50+20*Math.sqrt(Math.max(0,sbaR/lg.sba))+(trR-lg.tr)/.004*3;
      // 수비 포지션
      let posl={};const dd=def[b.n];
      const base=cl(60+22*Math.min(1,b.g/110)-35*((b.e/Math.max(1,b.g))-lg.e),35,95);
      if(dd){const tot=Object.values(dd).reduce((s,x)=>s+x,0);for(const p in dd)posl[p]=Math.round(base*(0.86+0.14*Math.min(1,dd[p]/Math.max(30,tot*.6))))}
      else if(T.POS&&T.POS[b.n]){const c=T.POS[b.n],ps2={C:['C'],IF:['1B','2B','3B','SS'],OF:['LF','CF','RF']}[c];
        // 내야/외야 세부 위치는 기록이 없어 타격 성향으로 주 포지션을 추정
        const main=(T._main&&T._main[b.n])||ps2[0];
        for(const p of ps2)posl[p]=Math.round(base*(p===main?1:.9))}
      const pos=Object.keys(posl).sort((a,c)=>posl[c]-posl[a]||0)[0]||'DH';
      const R=v=>Math.round(cl(v,25,99));
      const rr=srand(b.n+year+'m'),bunt=50+(spd-70)*.4+(70-pow)*.4+rr()*14-7,men=55+20*Math.min(1,b.pa/550)+(avgR-lg.avg)/.025*3+rr()*10-5;
      cards.push({n:uid(b.n),y:year,t:tname,l:line,k:'B',p:pos,ps:posl,r:[R(con),R(pow),R(eye),R(bunt),R(spd),R(posl[pos]||40),R(men)],
        s:[+(b.h/ab).toFixed(3),b.hr,b.rbi,b.sb,b.g,b.pa],...(TX?{tx:1,x:[b.pa,b.ab,b.h,b.d,b.t,b.hr,b.bb,b.hbp]}:{})});
    }
    for(const p of [...ps,...xP]){const TX=xP.includes(p);
      const W=p.tbf/(p.tbf+300),bl=(o,q)=>W*o+(1-W)*q,tbf=Math.max(1,p.tbf);
      // 부 포지션(야수의 등판): 표본이 작으면 '야수 투구' 수준의 낮은 사전값으로 수렴
      const Q=TX?{k:.6,b:1.5,h:1.5,e:2.5,hh:1.2}:{k:.85,b:1.15,h:1.15,e:.8,hh:1.08};
      const kR=bl(p.so/tbf,lg.pk*Q.k),bbR=bl(p.bb/tbf,lg.pbb*Q.b),hrR=bl(p.hr/tbf,lg.phr*Q.h),eraR=bl(p.ip?p.er*9/p.ip:lg.era*1.5,lg.era+Q.e);
      const hR=bl(p.h/tbf,lg.ph*Q.hh),rr=srand(p.n+year+'m');
      const R=v=>Math.round(cl(v,25,99));
      const velo=R(70+(kR-lg.pk)/.04*7+rr()*8-4+(lg.era-eraR)/.6*1.5);
      const stu=R(70-(hrR-lg.phr)/.008*4-(hR-lg.ph)/.03*5+(lg.era-eraR)/.6*3);
      const ctl=R(70-(bbR-lg.pbb)/.025*9+(lg.era-eraR)/.6*2);
      const ipg=p.ip/Math.max(1,p.g);let gs=null;
      for(const r of T.D||[])if(r[0]===p.n&&r[1]==='투수')gs=num(r[3]);
      const sp=gs!=null?gs/Math.max(1,p.g)>=.5:ipg>=3;
      const sta=sp?cl(40+9*ipg,45,99):cl(35+10*ipg,35,70);
      const pt=pitchSet(p.n,year,R(70+(kR-lg.pk)/.04*8+(lg.era-eraR)/.6*3)),gv={S:95,A:87,B:78,C:68,D:58},gl=Object.values(pt).map(g=>gv[g]).sort((a,b)=>b-a);
      const brk=R(gl.slice(0,3).reduce((s,x,i)=>s+x*[.5,.3,.2][i],0)/(gl.length>=3?1:[.5,.8,1][gl.length-1]));
      const men=R(55+20*Math.min(1,p.tbf/700)+(p.sv+p.hld)/40*10+(lg.era-eraR)/.6*3+rr()*10-5);
      cards.push({n:uid(p.n),y:year,t:tname,l:line,k:'P',p:sp?'SP':'RP',r:[velo,stu,brk,ctl,Math.round(sta),men],pt,
        s:[p.era,p.w,p.l,p.sv,p.hld,p.so,+p.ip.toFixed(1),p.g],...(TX?{tx:1}:{})});
    }
  }
}
function pick4(r){return ['2B','3B','SS','1B'][Math.floor(r()*4)]}
// OVR, 코스트 (전체 분포의 백분위로)
for(const c of cards){const r=c.r;c.o=Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)))}
// 코스트는 기존 기본 카드 분포 기준 백분위(새 카드가 분포를 바꾸지 않게)
const J=JSON.parse(fs.readFileSync(outp));J.cards=J.cards.filter(c=>!c.tx);const base=J.cards.filter(c=>!c.v);
const sorted=base.map(c=>c.o).sort((a,b)=>a-b),pct=o=>{let lo=0,hi=sorted.length;while(lo<hi){const m=(lo+hi)>>1;if(sorted[m]<o)lo=m+1;else hi=m}return lo/sorted.length};
const CUT=[.25,.42,.56,.68,.78,.86,.92,.96,.985];
// 출생연도 후보(동명이인 판별)
const R={};for(const line of fs.readFileSync(braw,'utf8').split('\n')){const i=line.indexOf('=');if(i<0)continue;
  R[line.slice(0,i)]=line.slice(i+1).split(';').filter(Boolean).map(x=>({by:(y=>y>30?1900+y:2000+y)(+x.slice(0,2)),k:x[2],hs:x.slice(3).split('/')[0]}))}
const nm=c=>c.n.replace(/#\d+$/,'');const idx={};for(const c of base)(idx[c.y+'|'+c.t+'|'+nm(c)+'|'+c.k]=idx[c.y+'|'+c.t+'|'+nm(c)+'|'+c.k]||[]).push(c);
const ACT={};for(const c of base)if(c.b)(ACT[c.y+'|'+nm(c)]=ACT[c.y+'|'+nm(c)]||new Set()).add(c.b);
const DUP=new Set(),cnt={};for(const c of cards){if(!c.tx)continue;const k=c.y+'|'+c.t+'|'+nm(c)+'|'+c.k;cnt[k]=(cnt[k]||0)+1;if(cnt[k]>1)DUP.add(k)}
const st={후보:0,추가:0,동명이인:0,반대카드없음:0,이미있음:0},homo=[],added=[];
for(const c of cards){if(!c.tx)continue;st.후보++;const n=nm(c),opp=idx[c.y+'|'+c.t+'|'+n+'|'+(c.k==='B'?'P':'B')]||[];
  if(idx[c.y+'|'+c.t+'|'+n+'|'+c.k]){st.이미있음++;continue}
  if(opp.length!==1){st.반대카드없음++;continue}const o=opp[0];
  const live=(R[n]||[]).filter(x=>c.y-x.by>=17&&c.y-x.by<=46);
  const act=x=>(ACT[c.y+'|'+n]||new Set()).has(x.by);
  const other=live.filter(x=>o.b?x.by!==o.b&&act(x):false);
  if(DUP.has(c.y+'|'+c.t+'|'+n+'|'+c.k)||(o.b&&other.length)||(!o.b&&live.filter(act).length>1)){st.동명이인++;homo.push(`${c.y} ${c.t} ${n}(${c.k}) 후보 ${live.map(x=>x.by+x.k+x.hs).join(',')}`);continue}
  const r=c.r;c.o=Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)));
  c.c=1+CUT.filter(x=>pct(c.o)>=x).length;c.l=o.l;for(const f of ['b','un','hs','rg','img'])if(o[f]!=null)c[f]=o[f];
  // 이름 접미사: 같은 팀·연도 안에서 겹치지 않게
  const used=new Set(J.cards.filter(x=>x.y===c.y&&x.t===c.t).map(x=>x.n));let nn=n,i=1;while(used.has(nn))nn=n+'#'+(++i);c.n=nn;
  J.cards.push(c);st.추가++;added.push(c)}
fs.writeFileSync(outp+'.tmp',JSON.stringify(J));fs.renameSync(outp+'.tmp',outp);
console.log({겹침_같은팀연도이름:OV.n,그중_타석0:OV.pa0,...st});
const cd=k=>added.filter(c=>c.k===k).reduce((m,c)=>(m[c.c]=(m[c.c]||0)+1,m),{});console.log('타자 부카드 코스트',cd('B'),'투수 부카드 코스트',cd('P'));
fs.writeFileSync(__dirname+'/../data/tw_report.txt','[추가]\n'+added.map(c=>`${c.y} ${c.t} ${c.n} ${c.k} ${c.c}코 OVR${c.o} ${c.k==='B'?c.s[5]+'타석 '+c.s[0]:c.s[7]+'경기 '+c.s[6]+'이닝 ERA'+c.s[0]} r=${c.r}`).join('\n')+'\n\n[동명이인 제외]\n'+homo.join('\n'));
