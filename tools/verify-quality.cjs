const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {acceptable,reason,solutions}=require('./level-quality.cjs');
const dir=path.join(__dirname,'..');
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(dir,'game.js'),'utf8').split('\n')[0]+';this.bank=puzzles;',sandbox);
const bank=sandbox.bank;assert.equal(bank.length,256);assert.equal(new Set(bank.map(p=>p.reg.join(','))).size,256);
assert.ok(new Set(bank.map(p=>p.q.join(','))).size>=32,'too few distinct seeded layouts');
let multiple=0,allAnswers=0;
for(const [n,p] of bank.entries()) {
  assert.ok(acceptable(p.reg),`level ${n+1} fails quality gate`);
  const r=reason(p.reg),answers=solutions(p.reg,50000);
  assert.ok(answers.length);if(answers.length>1)multiple++;
  assert.ok(answers.some(a=>a.every((c,row)=>c===p.q[row])),`seed answer invalid at ${n+1}`);
  // Exhaustive solutions independently verify that candidate deductions never
  // delete a valid answer, including on puzzles with multiple valid answers.
  for(const q of answers)for(let row=0;row<8;row++) {
    const i=row*8+q[row];assert.ok(r.domains[p.reg[i]].includes(i),`unsound deduction at ${n+1}`);
  }
  allAnswers+=answers.length;
}
assert.ok(multiple>0,'multi-solution puzzles must remain allowed');
console.log(`PASS: 256 distinct connected puzzles meet every logic/shape gate; ${multiple} allow multiple answers. Exhaustively checked ${allAnswers} valid answers against candidate deductions.`);
// Prevent accidental inflation of scores by a solver that silently guesses.
const stripes=Array.from({length:64},(_,i)=>i>>3),flat=reason(stripes);
assert.equal(flat.forced,0);assert.equal(flat.eliminated,0);assert.equal(acceptable(stripes),null);
console.log('PASS: uninformative rectangular row regions are rejected without guessed placements.');
