// 세부 지표(SJ 2026-11-26): KBO 기록실 원자료로 타자 BABIP·wRC+, 투수 WHIP·FIP·LOB%·피BABIP를 계산해 카드에 sx로 저장하고 능력치에 반영
// 사용: node tools/adv.js data/cards.json data/kbo_raw_1982_2026.json   (여러 번 돌려도 같은 결과: 처음 능력치를 r0에 보관하고 거기서 다시 계산)
// 반영 방식(능력치당 최대 ±12, 표본이 적으면 약하게)
//  타자: BABIP가 리그보다 높으면 운으로 보고 교타를 깎고 낮으면 올림. wRC+가 100보다 높으면 교타·장타·선구·멘탈을 조금 올림
//  투수: FIP가 좋으면 구위·구속↑, WHIP가 좋으면 제구·구위↑, 피BABIP가 높으면(불운) 구위↑, LOB%가 높으면 멘탈↑(불펜은 1.5배: 승계주자 기록이 원자료에 없어 잔루율로 대신)
//  이닝 소화력: 선발은 시즌 이닝 150 기준 ±(최대 +5/-3) 체력, 불펜은 경기당 이닝이 길수록 체력 조금↑
// wRC+는 구장 보정 없이 그해 리그 평균 기준(wOBA 가중치는 표준값), 득점은 리그 실점 합계로 근사. 희생플라이·고의사구 자료가 없어 근사값
// 기본 카드와 같은 연도·팀·선수의 특수 카드(올스타·GG·EX 등)에도 같은 변화량을 줌. 코스트는 그대로 두고 OVR만 다시 계산
const fs=require('fs'),[,,cp,rp]=process.argv,D=JSON.parse(fs.readFileSync(cp)),raw=JSON.parse(fs.readFileSync(rp));
const num=v=>{if(v==null||v==='-'||v==='')return 0;v=String(v).replace(/,/g,'');const m=v.match(/^(\d+)\s+(\d)\/3$/);if(m)return +m[1]+m[2]/3;const f=v.match(/^(\d)\/3$/);if(f)return f[1]/3;return +v||0};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),WT={b1:.89,b2:1.27,b3:1.62,hr:2.1,bb:.69,hbp:.72};
const H=r=>{const v=r.map((x,i)=>i<2?x:num(x));return {n:v[0],g:v[3],pa:v[4],ab:v[5],h:v[6],d:v[7],t:v[8],hr:v[9],bb:v[13],hbp:v[14],so:v[15]}};
const P=r=>({n:r[0],g:num(r[3]),tbf:num(r[11]),ip:num(r[12]),h:num(r[13]),hr:num(r[14]),bb:num(r[15]),hbp:num(r[16]),so:num(r[17]),r:num(r[18]),er:num(r[19])});
const woba=b=>(WT.b1*(b.h-b.d-b.t-b.hr)+WT.b2*b.d+WT.b3*b.t+WT.hr*b.hr+WT.bb*b.bb+WT.hbp*b.hbp)/Math.max(1,b.ab+b.bb+b.hbp);
const LG={};
for(const y in raw){const B={pa:0,ab:0,h:0,d:0,t:0,hr:0,bb:0,hbp:0,so:0},Q={tbf:0,ip:0,h:0,hr:0,bb:0,hbp:0,so:0,r:0,er:0};
  for(const t in raw[y]){for(const r of raw[y][t].H||[]){const b=H(r);for(const k in B)B[k]+=b[k]||0}for(const r of raw[y][t].P||[]){const p=P(r);for(const k in Q)Q[k]+=p[k]}}
  const obp=(B.h+B.bb+B.hbp)/(B.ab+B.bb+B.hbp),w=woba(B),era=Q.er*9/Q.ip;
  LG[y]={babip:(B.h-B.hr)/(B.ab-B.so-B.hr),obp,woba:w,scale:obp/w,rpa:Q.r/B.pa,era,whip:(Q.h+Q.bb)/Q.ip,cfip:era-(13*Q.hr+3*(Q.bb+Q.hbp)-2*Q.so)/Q.ip,
    lob:(Q.h+Q.bb+Q.hbp-Q.r)/(Q.h+Q.bb+Q.hbp-1.4*Q.hr),pbab:(Q.h-Q.hr)/(Q.tbf-Q.so-Q.bb-Q.hbp-Q.hr)}}
const nm=c=>c.n.replace(/#\d+$/,''),key=c=>c.y+'|'+c.t+'|'+c.n+'|'+c.k;
const OV=c=>{const r=c.r;return Math.round(c.k==='B'?r[0]*.28+r[1]*.27+r[2]*.13+r[4]*.1+r[5]*.14+r[6]*.05+r[3]*.03:(c.p==='SP'?(r[0]*.15+r[1]*.2+r[2]*.2+r[3]*.25+r[4]*.15+r[5]*.05):(r[0]*.2+r[1]*.25+r[2]*.2+r[3]*.25+r[5]*.1)))};
// 원래 능력치 복원(재실행 대비)
for(const c of D.cards){if(c.r0){c.r=c.r0.slice();delete c.r0}delete c.sx;if(c.o0!=null){c.o=c.o0;delete c.o0}}
// 반영 강도(SJ 2026-11-26: 세게). 능력치당 최대 ±CAP
const STR=2,CAP=12;
const DEL={},SX={},LOWC=new Set(); // LOWC: 클래식 기록 기준 코스트 5 이하(기록이 평범했던 선수)
let ok=0,miss=0;
for(const c of D.cards){if(c.v||c.tx)continue;const T=(raw[c.y]||{})[c.t];const L=LG[c.y];if(!T||!L){miss++;continue}
  let rows;if(c.k==='B'){rows=(T.H||[]).map(H).filter(b=>b.n===nm(c));if(rows.length>1)rows=rows.filter(b=>b.pa===c.s[5]&&b.g===c.s[4])}
  else{rows=(T.P||[]).map(P).filter(p=>p.n===nm(c));if(rows.length>1)rows=rows.filter(p=>p.g===c.s[7]&&Math.abs(p.ip-c.s[6])<.2)}
  if(rows.length!==1){miss++;continue}ok++;const d=[0,0,0,0,0,0,0];
  if(c.k==='B'){const b=rows[0],bip=b.ab-b.so-b.hr,babip=bip>0?(b.h-b.hr)/bip:null,w=woba(b),wraa=(w-L.woba)/L.scale,wrc=Math.round(((wraa+L.rpa)/L.rpa)*100),W=b.pa/(b.pa+300);
    SX[key(c)]=[babip==null?null:+babip.toFixed(3),wrc];
    if(babip!=null)d[0]-=cl((babip-L.babip)/.03*2.5,-4,4)*W;const a=cl((wrc-100)/15,-4,4)*W;d[0]+=a*.5;d[1]+=a*.5;d[2]+=a*.5;d[6]+=a*.6}
  else{const p=rows[0];if(!p.ip){miss++;continue}const whip=(p.h+p.bb)/p.ip,fip=(13*p.hr+3*(p.bb+p.hbp)-2*p.so)/p.ip+L.cfip,den=p.h+p.bb+p.hbp-1.4*p.hr,lob=den>0?(p.h+p.bb+p.hbp-p.r)/den:null,
    pb=p.tbf-p.so-p.bb-p.hbp-p.hr,pbab=pb>0?(p.h-p.hr)/pb:null,W=p.tbf/(p.tbf+400);
    SX[key(c)]=[+whip.toFixed(2),+fip.toFixed(2),lob==null?null:Math.round(cl(lob,0,1)*1000)/10,pbab==null?null:+pbab.toFixed(3)];
    const f=cl((L.era-fip)/.5*2,-5,5)*W,wh=cl((L.whip-whip)/.15*1.5,-4,4)*W;d[1]+=f*.6+wh*.4;d[0]+=f*.4;d[3]+=wh*.6;
    if(pbab!=null)d[1]+=cl((pbab-L.pbab)/.03*1.5,-3,3)*W;if(lob!=null)d[5]+=cl((lob-L.lob)/.04*2,-4,4)*W*(c.p==='RP'?1.5:1);
    if(c.p==='SP')d[4]+=cl((p.ip-150)/25,-3,5);else d[4]+=cl((p.ip/Math.max(1,p.g)-1)/.3,-2,3)}
  DEL[key(c)]=d.map(v=>Math.round(cl(v*STR,-CAP,CAP)));if(c.c<=5)LOWC.add(key(c))}
// 숨은 잠재력 pz(0~2): 클래식 기록은 평범(기본 카드 코스트 5 이하)했지만 세이버 지표가 좋았던 선수(능력치 변화 합이 +3/+6 이상, 투수 체력 제외) → 유학·장비 상승치 ×1.25/×1.5
const PZ=(d,k)=>{const t=d.reduce((a,b,i)=>a+(k==='P'&&i===4?0:b),0); // 투수 체력(이닝 소화력)은 잠재력 판정에서 뺌
 return t>=6?2:t>=3?1:0};
let ch=0,dist={},pzN={};
for(const c of D.cards){const k=key(c),d=DEL[k];if(SX[k])c.sx=SX[k];delete c.pz;if(d&&LOWC.has(k)&&PZ(d,c.k)){c.pz=PZ(d,c.k);if(!c.v)pzN[c.pz]=(pzN[c.pz]||0)+1}if(!d||!d.some(Boolean))continue;c.r0=c.r.slice();c.o0=c.o;
  c.r=c.r.map((v,i)=>i<d.length?cl(v+d[i],25,c.v?120:99):v);const o=OV(c);const dO=o-OV({...c,r:c.r0});c.o=c.o0+dO;ch++;dist[dO]=(dist[dO]||0)+1}
fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
console.log({matched:ok,miss,changed:ch,ovrDelta:dist,potential:pzN});
