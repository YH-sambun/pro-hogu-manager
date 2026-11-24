// 위키미디어 공용 사진 묶음 -> v2/img/*.jpg + cards.json 의 img 필드
const fs=require('fs'),crypto=require('crypto');
const [,,photos,cardsIn,outDir]=process.argv;
const P=JSON.parse(fs.readFileSync(photos,'utf8')),C=JSON.parse(fs.readFileSync(cardsIn,'utf8'));
const KW={LG:['LG','MBC'],KIA:['KIA','해태'],두산:['두산','OB'],삼성:['삼성'],롯데:['롯데'],한화:['한화','빙그레'],현대:['현대','태평양','삼미','청보'],SK:['SK','SSG','쌍방울'],키움:['히어로즈','넥센','우리','키움'],NC:['NC'],KT:['KT','kt']};
fs.mkdirSync(outDir+'/img',{recursive:true});
const byKey={};for(const w of P.WD){const nm=w.n.replace(/\s*\(.*\)$/,''),parts=nm.split(' ');const keys=new Set([nm,parts[parts.length-1],parts.join('')]);for(const k of keys)(byKey[k]=byKey[k]||[]).push(w)}
let matched=new Set(),cardsWith=0;const saved={};
for(const c of C.cards){const n=c.n.replace(/#\d+$/,'');const cand=(byKey[n]||[]).filter(w=>KW[c.l]&&KW[c.l].some(k=>w.teams.includes(k)));
  if(cand.length!==1)continue;const w=cand[0],m=P.META[w.img],d=P.IMGS[w.img];if(!m||!d)continue;
  if(!saved[w.img]){const h=crypto.createHash('md5').update(w.img).digest('hex').slice(0,10),ext=d.startsWith('data:image/png')?'png':d.startsWith('data:image/webp')?'webp':'jpg';
    fs.writeFileSync(`${outDir}/img/${h}.${ext}`,Buffer.from(d.split(',')[1],'base64'));saved[w.img]=`img/${h}.${ext}`}
  c.img={f:saved[w.img],a:m.author||'작자 미상',l:m.lic,u:m.page};cardsWith++;matched.add(w.q)}
fs.writeFileSync(cardsIn,JSON.stringify(C));
console.log({players:matched.size,cardsWith,files:Object.keys(saved).length});
