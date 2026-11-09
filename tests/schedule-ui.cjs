const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={setProperty(){}};this.dataset={};this.value='';this.checked=false;this.textContent='';this.listeners={};this.hidden=false;this.classList={add(){}}}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=[...nodes]}setAttribute(){}addEventListener(name,callback){this.listeners[name]=callback}querySelectorAll(){return[]}querySelector(selector){return this.children.find(n=>n.tagName===selector.toUpperCase())}click(){this.onclick?.()}
}
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),ids={},fields=[],metas=[],methods=[];
for(const m of html.matchAll(/\bid="([^"]+)"/g))ids[m[1]]=new Element();
for(const m of html.matchAll(/<(input|select)[^>]*data-field="([^"]+)"/g)){const n=new Element(m[1]);n.dataset.field=m[2];fields.push(n)}
for(const m of html.matchAll(/data-meta="([^"]+)"/g)){const n=new Element('input');n.dataset.meta=m[1];metas.push(n)}
for(const m of html.matchAll(/data-method="([^"]+)"/g)){const n=new Element('button');n.dataset.method=m[1];methods.push(n)}
const captured=[],ctx={Blob,structuredClone,crypto:{randomUUID:()=>String(Math.random())},scrollTo(){},confirm:()=>true,window:{addEventListener(){}},navigator:{clipboard:{writeText(text){captured.push(text);return Promise.resolve()}}},document:{getElementById:id=>ids[id],createElement:tag=>new Element(tag),querySelectorAll:selector=>selector==='[data-field]'?fields:selector==='[data-meta]'?metas:selector==='[data-method]'?methods:[],querySelector:selector=>metas.find(n=>selector.includes('"'+n.dataset.meta+'"'))}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../js/schedule.js','utf8'),ctx);
let source=fs.readFileSync(__dirname+'/../js/app.js','utf8').replace('window.addEventListener("beforeunload"','globalThis.api={load,calc,nav,save,sim,copy,results,getProject:()=>p};window.addEventListener("beforeunload"');vm.runInContext(source,ctx);const api=ctx.api;
const inputs={peso:'15',horizontal:'25',vertical:'50',desplazamiento:'25',asimetria:'0',frecuencia:'3',agarre:'bueno',unaMano:'no',dosPersonas:'no',extension:'8',grupoDuracion:'corta',controlDestino:'no',duracion:'45',recuperacion:'45'};
const project={application:'MMC Analyzer',module:'simple',version:2,meta:{},tasks:[{id:'first',name:'Tarea uno',inputs},{id:'second',name:'Tarea dos',inputs:{...inputs}}],simulations:{}};
const allText=node=>[node.textContent,...node.children.map(allText)].join(' '),field=key=>fields.find(n=>n.dataset.field===key);
(async()=>{
 await api.load({name:'antiguo.json',text:async()=>JSON.stringify(project)});api.nav(2);assert.match(allText(ids.scheduleFeedback),/Duración no determinada/);assert.equal(api.getProject().tasks[0].inputs.grupoDuracion,'');
 ids.shiftStart.value='08:00';ids.shiftStart.oninput();ids.shiftEnd.value='12:00';ids.shiftEnd.oninput();
 const entries=[['08:00','08:50','mmc'],['08:50','09:00','pausa'],['09:00','09:50','mmc'],['09:50','10:00','pausa'],['10:00','10:50','mmc'],['10:50','12:00','pausa']];
 for(const [i,[from,to,type]] of entries.entries()){ids.addScheduleBlock.click();const row=ids.scheduleBlocks.children[i];row.children[1].children[0].value=from;row.children[1].children[0].oninput();row.children[2].children[0].value=to;row.children[2].children[0].oninput();row.children[3].children[0].value=type;row.children[3].children[0].oninput()}
 assert.match(allText(ids.scheduleFeedback),/LARGA/);assert.match(allText(ids.scheduleBreakdown),/170 min/);assert.equal(api.getProject().tasks[0].inputs.duracion,'170');api.nav(3);assert.equal(field('grupoDuracion').value,'larga');assert.equal(field('grupoDuracion').disabled,true);assert.equal(field('duracion').readOnly,true);api.nav(4);assert.match(allText(ids.summary),/1,17/);assert.match(allText(ids.summary),/MMC total: 150,00/);
 let saved;ctx.window.showSaveFilePicker=async()=>({name:'horarios.json',createWritable:async()=>({write:async text=>saved=JSON.parse(text),close:async()=>{}})});await api.save(false);assert.equal(saved.version,3);assert.equal(saved.tasks[0].inputs.horario.blocks.length,6);await api.load({name:'horarios.json',text:async()=>JSON.stringify(saved)});api.nav(2);assert.equal(ids.scheduleBlocks.children.length,6);assert.match(allText(ids.scheduleFeedback),/LARGA/);
 ids.scheduleTask.value='second';ids.scheduleTask.onchange({target:ids.scheduleTask});assert.equal(ids.shiftStart.value,'');assert.equal(ids.scheduleBlocks.children.length,0);ids.scheduleTask.value='first';ids.scheduleTask.onchange({target:ids.scheduleTask});assert.equal(ids.shiftStart.value,'08:00');
 api.nav(3);ids.simTask.value='first';api.sim();let weight=ids.simInputs.children.find(n=>n.textContent==='peso').children[0];weight.value='10';weight.oninput();assert.match(ids.simResults.textContent,/1,17 → 0,78/);assert.equal(api.getProject().tasks[0].inputs.peso,'15');const category=ids.simInputs.children.find(n=>n.textContent==='Categoría automática').children[0];assert.equal(category.disabled,true);ids.resetSim.click();assert.match(ids.simResults.textContent,/1,17 → 1,17/);
 api.copy('intermediate');await Promise.resolve();assert.match(captured[0],/170,00 min/);assert.match(captured[0],/MMC total: 150,00/);
 console.log(JSON.stringify({ok:true,legacyRequiresSchedule:true,scheduleEditing:true,manualExample:true,perTaskIsolation:true,automaticFields:true,results:true,saveAndReload:true,simulation:true,wordExport:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
