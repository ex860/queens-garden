// Offline puzzle authoring. Deductions use candidates only, never the seeded answer.
const fs = require('node:fs');
const path = require('node:path');
const adjacent = i => [i%8 ? i-1 : -1, i%8<7 ? i+1 : -1, i-8, i+8].filter(j=>j>=0&&j<64);
const conflicts = (a,b) => (a>>3)===(b>>3)||a%8===b%8||(Math.abs((a>>3)-(b>>3))<=1&&Math.abs(a%8-b%8)<=1);

function reason(reg) {
  let domains=Array.from({length:8},(_,g)=>reg.flatMap((v,i)=>v===g?[i]:[]));
  const steps=[];
  for(let round=0;round<64;round++) {
    const next=domains.map(d=>[...d]);
    // A cell is impossible when every candidate in another color attacks it.
    for(let g=0;g<8;g++) next[g]=next[g].filter(a=>domains.every((d,h)=>h===g||d.some(b=>!conflicts(a,b))));
    // Every row/column needs a queen. If only one color can occupy it, that
    // color's queen is confined to that row/column (including naked singles).
    for(let axis=0;axis<2;axis++)for(let line=0;line<8;line++) {
      const onLine=i=>(axis ? i%8 : i>>3)===line;
      const groups=domains.flatMap((d,g)=>d.some(onLine)?[g]:[]);
      if(groups.length===1)next[groups[0]]=next[groups[0]].filter(onLine);
    }
    if(next.some(d=>!d.length))return {valid:false,domains:next,steps};
    const removed=domains.reduce((n,d,g)=>n+d.length-next[g].length,0);
    if(!removed)break;
    steps.push({removed,forced:next.filter(d=>d.length===1).length});domains=next;
  }
  return {valid:true,domains,steps,opening:steps[0]?.removed||0,rounds:steps.length,
    eliminated:64-domains.flat().length,forced:domains.filter(d=>d.length===1).length};
}

function shape(reg) {
  const sizes=[],irregular=[];
  for(let g=0;g<8;g++) {
    const cells=reg.flatMap((v,i)=>v===g?[i]:[]);sizes.push(cells.length);
    const rows=cells.map(i=>i>>3),cols=cells.map(i=>i%8);
    const box=(Math.max(...rows)-Math.min(...rows)+1)*(Math.max(...cols)-Math.min(...cols)+1);
    irregular.push(cells.length<box);
    const seen=new Set([cells[0]]),todo=[cells[0]];
    while(todo.length)for(const j of adjacent(todo.pop()))if(reg[j]===g&&!seen.has(j)){seen.add(j);todo.push(j)}
    if(seen.size!==cells.length)return {valid:false};
  }
  return {valid:Math.min(...sizes)>=2&&Math.max(...sizes)<=18,sizes,irregular:irregular.filter(Boolean).length};
}

function solutions(reg,limit=2) {
  const answers=[],q=[];
  function visit(r,cols,groups) {
    if(answers.length>=limit)return;
    if(r===8){answers.push([...q]);return}
    for(let c=0;c<8;c++){const g=reg[r*8+c];if((cols&(1<<c))||(groups&(1<<g))||(r&&Math.abs(q[r-1]-c)<=1))continue;q.push(c);visit(r+1,cols|(1<<c),groups|(1<<g));q.pop()}
  }
  visit(0,0,0);return answers;
}

function acceptable(reg) {
  const s=shape(reg);if(!s.valid||s.irregular<5)return null;
  const r=reason(reg);
  if(!r.valid||r.opening<6||r.rounds<3||r.forced<2||r.eliminated<24)return null;
  return {opening:r.opening,rounds:r.rounds,forced:r.forced,eliminated:r.eliminated,irregular:s.irregular};
}

function build(count=256,seed=20261105) {
  let state=seed>>>0,attempts=0;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
  const pick=a=>a[Math.floor(random()*a.length)];
  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  const bank=[],seen=new Set();
  while(bank.length<count&&attempts<300000) {
    attempts++;
    if(attempts%2000===0)console.log(`Screened ${attempts} candidates; accepted ${bank.length}`);
    let q,reg,sizes;
    if(bank.length&&random()<0.85) {
      const parent=pick(bank);q=[...pick(solutions(parent.reg,128))];reg=[...parent.reg];
      const symmetry=Math.floor(random()*8),turn=i=>{let r=i>>3,c=i%8;if(symmetry&1)[r,c]=[c,r];if(symmetry&2)r=7-r;if(symmetry&4)c=7-c;return r*8+c};
      const transformed=Array(64);for(let i=0;i<64;i++)transformed[turn(i)]=reg[i];reg=transformed;
      const moved=Array(8);q.forEach((c,r)=>{const i=turn(r*8+c);moved[i>>3]=i%8});q=moved;
      const queenCells=new Set(q.map((c,r)=>r*8+c));
      const changes=8+Math.floor(random()*24);
      for(let n=0;n<changes;n++) {
        const i=Math.floor(random()*64);if(queenCells.has(i))continue;
        const other=adjacent(i).filter(j=>reg[j]!==reg[i]);if(!other.length)continue;
        const previous=reg[i];reg[i]=reg[pick(other)];if(!shape(reg).valid)reg[i]=previous;
      }
      sizes=Array.from({length:8},(_,g)=>reg.filter(v=>v===g).length);
    } else {
    q=shuffle([0,1,2,3,4,5,6,7]);while(q.some((c,r)=>r&&Math.abs(c-q[r-1])<=1))shuffle(q);
    reg=Array(64).fill(-1);sizes=Array(8).fill(1);q.forEach((c,r)=>reg[r*8+c]=r);
    for(let n=0;n<56;n++) {
      const fronts=Array.from({length:8},()=>[]);
      for(let i=0;i<64;i++)if(reg[i]>=0)for(const j of adjacent(i))if(reg[j]===-1)fronts[reg[i]].push(j);
      const available=fronts.flatMap((f,g)=>f.length?[g]:[]);
      const weights=available.map(g=>1/Math.sqrt(sizes[g]));let chance=random()*weights.reduce((a,b)=>a+b,0),g=available.at(-1);
      for(let k=0;k<available.length;k++){chance-=weights[k];if(chance<=0){g=available[k];break}}
      reg[pick(fronts[g])]=g;sizes[g]++;
    }
    }
    if(Math.min(...sizes)<2||Math.max(...sizes)>18)continue;
    const key=reg.join(',');if(seen.has(key))continue;
    if(bank.some(p=>p.reg.reduce((n,v,i)=>n+(v!==reg[i]),0)<6))continue;
    const logic=acceptable(reg);if(!logic)continue;
    if(bank.filter(p=>p.q.every((c,r)=>c===q[r])).length>=8)continue;
    seen.add(key);bank.push({reg,q,logic});
    if(bank.length%32===0)console.log(`Accepted ${bank.length}/${count} after ${attempts} candidates`);
  }
  if(bank.length!==count)throw Error(`Only ${bank.length} quality puzzles after ${attempts} candidates`);
  // Gentler entries first, leaving more unresolved candidates in later puzzles.
  bank.sort((a,b)=>(b.logic.forced-a.logic.forced)||(b.logic.eliminated-a.logic.eliminated)||(a.logic.rounds-b.logic.rounds));
  return {bank,attempts};
}

if(require.main===module) {
  const {bank,attempts}=build();
  const game=path.join(__dirname,'..','game.js');
  fs.writeFileSync(game,fs.readFileSync(game,'utf8').replace(/^const puzzles=.*;\r?\n/,'const puzzles='+JSON.stringify(bank)+';\n'));
  const multiple=bank.filter(p=>solutions(p.reg).length>1).length;
  console.log(JSON.stringify({levels:bank.length,attempts,multiple,seedLayouts:new Set(bank.map(p=>p.q.join(','))).size,minOpening:Math.min(...bank.map(p=>p.logic.opening)),minRounds:Math.min(...bank.map(p=>p.logic.rounds)),minForced:Math.min(...bank.map(p=>p.logic.forced)),minIrregular:Math.min(...bank.map(p=>p.logic.irregular))}));
}
module.exports={reason,shape,solutions,acceptable,build};
