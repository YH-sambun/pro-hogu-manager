// node tools/school.js data/hs_raw.txt data/cards.json  → cards에 hs(출신 고교)·rg(지역) 추가
const fs=require('fs'),{region}=require('./region');
const [raw,cf]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));
const [g,m]=fs.readFileSync(raw,'utf8').split('\n##\n');const one={},multi={};
for(const line of g.split('\n')){if(!line.trim())continue;const i=line.indexOf(':'),hs=line.slice(0,i),rest=line.slice(i+1);const [t3,...o]=rest.split(',');
  for(let k=0;k<t3.length;k+=3)one[t3.slice(k,k+3)]=hs;for(const n of o)if(n)one[n]=hs}
for(const e of m.trim().split(';')){const mm=e.match(/^([가-힣]+?)(\d\d[PB].*)$/);if(!mm)continue;multi[mm[1]]=mm[2].split('/').map(x=>({y:+x.slice(0,2),k:x[2],hs:x.slice(3)}))}
const full=y=>y>30?1900+y:2000+y;let n1=0,nm=0,nr=0;const unk={};
const first={};for(const c of J.cards){const key=c.n+c.k+c.l;first[key]=Math.min(first[key]||9999,c.y)}
for(const c of J.cards){const n=c.n.replace(/#\d+$/,'');let hs=one[n];const fy=first[c.n+c.k+c.l];
  if(!hs&&multi[n]){const L=multi[n].map(x=>({...x,age:c.y-full(x.y),a0:fy-full(x.y)})).filter(x=>x.age>=17&&x.age<=46&&x.a0>=17&&x.a0<=36);
    const L2=L.filter(x=>x.k===c.k);const cand=(L2.length?L2:L).sort((p,q)=>Math.abs(p.age-28)-Math.abs(q.age-28));if(cand.length===1||(cand.length>1&&Math.abs(cand[0].age-28)+4<Math.abs(cand[1].age-28))){hs=cand[0].hs;nm++}}
  else if(hs)n1++;
  if(hs&&!/^(일본|미국|도미니카|베네수엘라|멕시코|파나마|호주|푸에르토리코)/.test(hs)){c.hs=hs;const r=region(hs);if(r){c.rg=r;nr++}else unk[hs]=(unk[hs]||0)+1}else{delete c.hs;delete c.rg}}
fs.writeFileSync(cf,JSON.stringify(J));
console.log('cards',J.cards.length,'hs single',n1,'hs multi',nm,'with region',nr);console.log('unknown',Object.entries(unk).sort((a,b)=>b[1]-a[1]).slice(0,60).map(x=>x.join(':')).join(' '))
