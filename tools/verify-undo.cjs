const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
function boot(saved=null){
  class E{constructor(){this.children=[];this.dataset={};this.handlers={};this.style={setProperty(){}};this.flags=new Set();this.classList={add:k=>this.flags.add(k),toggle:(k,on)=>on?this.flags.add(k):this.flags.delete(k)}}addEventListener(k,f){this.handlers[k]=f}setAttribute(){}append(el){this.children.push(el)}set innerHTML(v){this.children=[]}setPointerCapture(){}contains(el){return this.children.includes(el)}}
  const elements={},data={value:saved};const c={document:{querySelector:s=>elements[s]??(elements[s]=new E),createElement:()=>new E,elementFromPoint:()=>c.hit},localStorage:{getItem:()=>data.value,setItem:(k,v)=>data.value=v},setInterval(){},confirm:()=>true,Date,Math,Set,Array,JSON,assert};vm.createContext(c);vm.runInContext(source,c);return {c,data,elements,run:code=>vm.runInContext(code,c)};
}
const a=boot();
a.run(`assert.equal(document.querySelector('#undo').disabled,true);cycle(0);cycle(0);cycle(0);assert.equal(marks[0],0);undo();assert.equal(marks[0],1);undo();assert.equal(marks[0],2);undo();assert.equal(marks[0],0);assert.equal(document.querySelector('#undo').disabled,true);undo();`);
console.log('PASS: three click states undo in reverse; empty history safely disables undo.');
a.run(`newGame();cycle(63);const before=marks.join();gesture={id:1,start:0,drag:true,visited:new Set()};paint(0);paint(1);paint(2);paint(2);assert.equal(history.length,2);assert.equal(document.querySelector('#undo').disabled,true);finishGesture();assert.equal(document.querySelector('#undo').disabled,false);undo();assert.equal(marks.join(),before);undo();assert.equal(marks[63],0);gesture={visited:new Set()};marks[5]=2;paint(5);finishGesture();assert.equal(history.length,0);`);
console.log('PASS: a full drag is one undo; earlier marks survive; painting existing manual X adds no step.');
a.run(`newGame();assist=true;cycle(10);cycle(10);assert.equal(marks[10],1);assert.ok(autoMarks.size>0);undo();assert.equal(marks[10],2);assert.equal(autoMarks.size,0);undo();assert.equal(marks[10],0);`);
console.log('PASS: undo restores manual X and recomputes automatic exclusions.');
a.run(`newGame();marks.fill(0);solution.slice(0,7).forEach((c,r)=>marks[r*8+c]=1);const last=56+solution[7];update(false);cycle(last);cycle(last);assert.equal(won,true);assert.ok(board.children.every(el=>el.disabled));undo();assert.equal(won,false);assert.ok(board.children.every(el=>!el.disabled));assert.equal(marks[last],2);assert.ok(!board.children.some(el=>el.flags.has('celebrate')));newGame();assert.equal(history.length,0);cycle(0);document.querySelector('#reset').onclick();assert.equal(history.length,0);`);
console.log('PASS: undo after victory unlocks board and clears animation; new attempts clear old history.');
a.run(`newGame();assist=false;cycle(4);cycle(4);`);
const b=boot(a.data.value);b.run(`assert.equal(marks[4],1);assert.equal(history.length,2);undo();assert.equal(marks[4],2);undo();assert.equal(marks[4],0);`);
const legacy=JSON.parse(a.data.value);delete legacy.history;boot(JSON.stringify(legacy)).run(`assert.equal(history.length,0);assert.equal(marks[4],1);`);
console.log('PASS: history survives reload; older saved games load without losing progress.');
a.run(`newGame();for(let i=0;i<240;i++)cycle(0);assert.equal(history.length,200);`);
console.log('PASS: history is bounded to the latest 200 steps.');
