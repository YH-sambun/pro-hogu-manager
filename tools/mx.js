// 미션 전용 EX(mx:1): 구단 계보마다 상징 선수 1장. 팩·확정권·합성에서 안 나옴(econ.js·core2.js)
const fs=require('fs'),cp=process.argv[2]||'data/cards.json',D=JSON.parse(fs.readFileSync(cp));
const MX=['1982-OB-박철순','2010-한화-류현진','2003-삼성-이승엽','1984-롯데-최동원','1994-해태-이종범','2022-키움-이정후','2008-SK-김광현','2015-NC-테임즈','2021-KT-강백호','1994-LG-이상훈'];
let n=0;for(const c of D.cards){delete c.mx;if(c.v==='EX'&&MX.includes(c.y+'-'+c.t+'-'+c.n.replace(/#\d+$/,''))){c.mx=1;n++}}
fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);console.log('미션 EX',n,'/',MX.length)
