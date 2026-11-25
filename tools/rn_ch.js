// 영구결번(RN)·커리어하이(CH) 카드 추가. 사용: node tools/rn_ch.js data/cards.json  (special·hand·number 뒤에 실행. 카드 끝에 붙여서 기존 카드 순서 유지)
// RN: 구단 실제 영구결번 선수(2025년까지 지정, 18명 중 1호 김영신은 기록이 적어 제외) + 영구결번이 없는 키움·NC·KT는 상징 선수 1명.
//     그 계보에서 OVR이 가장 높은 시즌 기준, 능력치 +5(상한 120)·OVR +4·코스트 +1(상한 10). mx:1(미션 완료 보상 전용: 팩·확정권·합성에서 안 나옴). 덱 효과에서는 어느 연도·구단에도 1명으로 셈
// CH: 통산 7시즌 이상 선수의 최고 시즌 OVR이 그 선수 평균보다 8.5 이상(약 150~200장 목표) 높을 때 그 시즌을 별도 카드로. 능력치 +3(상한 120)·OVR +2(올스타와 같은 방식)
const fs=require('fs'),cp=process.argv[2]||'data/cards.json',D=JSON.parse(fs.readFileSync(cp));
D.cards=D.cards.filter(c=>c.v!=='RN'&&c.v!=='CH');for(const c of D.cards)delete c.mx;
const nm=c=>c.n.replace(/#\d+$/,''),base=D.cards.filter(c=>!c.v&&!c.tx);
const RN=[['두산','박철순'],['KIA','선동열'],['KIA','이종범'],['LG','김용수'],['LG','이병규'],['LG','박용택'],['삼성','이만수'],['삼성','양준혁'],['삼성','이승엽'],['삼성','오승환'],
 ['롯데','최동원'],['롯데','이대호'],['한화','장종훈'],['한화','정민철'],['한화','송진우'],['한화','김태균'],['SK','박경완'],['키움','이정후'],['NC','테임즈'],['KT','강백호']];
const add=[],miss=[];
for(const [l,n] of RN){const L=base.filter(c=>c.l===l&&nm(c)===n);if(!L.length){miss.push(l+' '+n);continue}
  const c=L.sort((a,b)=>b.o-a.o)[0];add.push({...c,v:'RN',mx:1,r:c.r.map(v=>Math.min(120,v+5)),o:c.o+4,c:Math.min(10,c.c+1)})}
const G={};for(const c of base){const k=c.n+'|'+c.k+'|'+(c.hs||'');(G[k]=G[k]||[]).push(c)}
for(const k in G){const L=G[k],ys=new Set(L.map(c=>c.y));if(ys.size<7)continue;const avg=L.reduce((s,c)=>s+c.o,0)/L.length,b=L.slice().sort((a,b)=>b.o-a.o)[0];
  if(b.o-avg>=8.5)add.push({...b,v:'CH',r:b.r.map(v=>Math.min(120,v+3)),o:b.o+2})}
D.cards.push(...add);fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
fs.writeFileSync(require('path').join(__dirname,'../data/no_namu.bin'),Buffer.from(D.cards.map(c=>c.no!=null&&c.no<255?c.no+1:0)));
console.log('RN',add.filter(c=>c.v==='RN').map(c=>c.y+' '+c.t+' '+nm(c)).join(', '),'| CH',add.filter(c=>c.v==='CH').length,'| 못 찾음',miss.join(', ')||'없음','| 총',D.cards.length)
