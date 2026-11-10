"use strict";
(()=> {
const $=id=>document.getElementById(id), fields=["peso","horizontal","vertical","desplazamiento","asimetria","frecuencia","duracion","recuperacion","agarre","dosPersonas","unaMano","extension","grupoDuracion","controlDestino","verticalDestino","horizontalDestino","asimetriaDestino"],metas=["empresa","puesto","seccion","fecha"];
let p={application:"MMC Analyzer",version:3,module:"simple",meta:{},tasks:[],simulations:{}},sel="",page=1,dirty=false,handle=null,name="MMC-Simple.json";
const tables={vertical:{0:.77,25:.85,50:.93,75:1,100:.93,125:.85,150:.78},horizontal:{25:1,30:.83,40:.63,50:.5,55:.45,60:.42},desplazamiento:{25:1,30:.97,40:.93,50:.91,70:.88,100:.87,170:.86},asimetria:{0:1,30:.9,60:.81,90:.71,120:.52,135:.57}};
const freq=[0,.1,.2,.5,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],FM={larga:[1,.85,.85,.81,.75,.65,.55,.45,.35,.27,.22,.18,0,0,0,0,0,0,0],media:[1,.95,.95,.92,.88,.84,.79,.72,.6,.5,.42,.35,.3,.26,0,0,0,0,0],corta:[1,1,1,.97,.94,.91,.88,.84,.8,.75,.7,.6,.52,.45,.41,.37,0,0,0]};
const refs=[["Hombres 20–45",25],["Hombres fuera 20–45",20],["Mujeres 20–45",20],["Mujeres fuera 20–45",15]];
// Fuente exclusiva de FM: tabla del Excel LI simple, filas 37–56.
// Interpolación entre filas numéricas según el criterio acordado; sin tabla adicional CLI.
function frequencyMultiplier(input,category,height){
 if((typeof input!=="number"&&typeof input!=="string")||String(input).trim()==="")return undefined;
 const value=Number(input),vertical=Number(height);
 if(!Number.isFinite(value)||value<0||!Number.isFinite(vertical)||vertical<0||!FM[category])return undefined;
 if(value>15)return 0;
 // Tramos explícitos del Excel LI: <0,1; 0,1<=F<0,2; F=0,2.
 // No se interpola a través del salto de la baja frecuencia.
 if(value<.1)return 1;
 if(value<=.2)return FM[category][2];
 const column=FM[category];
 const upper=freq.findIndex(f=>f>=value);
 if(freq[upper]===value)return column[upper];
 const lower=upper-1,ratio=(value-freq[lower])/(freq[upper]-freq[lower]);
 // Conservar la precisión y redondear únicamente en la presentación.
 return column[lower]+ratio*(column[upper]-column[lower]);
}
function frequencyNote(r){
 if(!r.frequency||r.problems)return "";
 const factor=v=>v.toLocaleString("es-ES",{maximumFractionDigits:6});
 const detail=r.positions?.destination?"FM origen: "+factor(r.positions.origin.vals.FM)+"; FM destino: "+factor(r.positions.destination.vals.FM):"FM: "+factor(r.vals.FM);
 return "Frecuencia: "+factor(r.frequency.value)+" lev/min. "+detail+" ("+r.frequency.method+"). Fuente exclusiva: tabla del Excel LI, rotulada «área inferior a 75 cm».";

}
const fmt=v=>Number.isFinite(v)?v.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function blank(){return{...Object.fromEntries(fields.map(k=>[k,""])),horario:MMCSchedule.blank()}}function task(){return{id:crypto.randomUUID(),name:"",inputs:blank()}}
function changed(){dirty=true;$("status").textContent="Cambios sin guardar"}function screen(s){["welcome","methods","simple"].forEach(k=>$(k).hidden=k!==s);scrollTo(0,0)}
const temporalFields=["duracion","recuperacion","grupoDuracion","extension"];
function nav(n){page=Math.min(4,Math.max(1,n));for(let i=1;i<=4;i++)$("page"+i).hidden=i!==page;$("pageNum").textContent=page;$("prev").disabled=page===1;$("next").disabled=page===4;if(page===2)renderSchedule();if(page===3)inputs();if(page===4)results();scrollTo(0,0)}
function selector(){if(!p.tasks.some(t=>t.id===sel))sel=p.tasks[0]?.id||"";for(const id of ["taskSelect","scheduleTask","simTask"]){const e=$(id),previous=e.value;e.replaceChildren();p.tasks.forEach((t,i)=>{const o=document.createElement("option");o.value=t.id;o.textContent=(i+1)+". "+(t.name||"Sin nombre");e.append(o)});e.value=id==="simTask"&&p.tasks.some(t=>t.id===previous)?previous:sel}}
function render(){const list=$("taskList");list.replaceChildren();p.tasks.forEach((t,i)=>{const row=document.createElement("div");row.className="task";const label=document.createElement("span");label.textContent="Tarea "+(i+1);const inp=document.createElement("input");inp.value=t.name;inp.maxLength=150;inp.placeholder="Nombre";inp.oninput=()=>{t.name=inp.value;selector();changed()};const schedule=document.createElement("button");schedule.className="secondary";schedule.textContent="Horario";schedule.onclick=()=>{sel=t.id;nav(2)};const edit=document.createElement("button");edit.className="secondary";edit.textContent="Datos";edit.onclick=()=>{sel=t.id;nav(3)};const del=document.createElement("button");del.className="secondary";del.textContent="Eliminar";del.onclick=()=>{if(confirm("¿Eliminar tarea?")){p.tasks.splice(i,1);delete p.simulations[t.id];changed();render()}};row.append(label,inp,schedule,edit,del);list.append(row)});$("taskCount").textContent=p.tasks.length+" / 50";$("addTask").disabled=p.tasks.length>=50;selector()}
function syncTemporal(x){if(x?.horario&&typeof x.horario==="object")delete x.horario.postRecovery;const d=durationData(x),valid=!d.problems.length;x.duracion=valid?String(d.minutes):"";x.recuperacion=valid?String(d.recoveryMinutes):"";x.grupoDuracion=valid?d.category:"";x.extension=valid?String(d.extension):"";return d}
function inputs(){selector();const t=p.tasks.find(t=>t.id===sel);if(t)syncTemporal(t.inputs);document.querySelectorAll("[data-field]").forEach(e=>{const derived=temporalFields.includes(e.dataset.field);e.disabled=!t||(derived&&e.tagName==="SELECT");e.readOnly=derived;if(derived)e.classList.add("automatic-field");e.value=t?.inputs?.[e.dataset.field]??""});$("destination").hidden=!t||t.inputs.controlDestino!=="si";updateDurationFeedback(t?.inputs)}
function selectedTask(){return p.tasks.find(t=>t.id===sel)}
function scheduleClock(value){const n=((value%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")+(value>=1440?" (+1 día)":"")}
function scheduleChanged(){const t=selectedTask();if(!t)return;syncTemporal(t.inputs);changed();renderScheduleSummary();if(!$("simulation").hidden)sim()}
function renderSchedule(){
 selector();const t=selectedTask(),s=t?.inputs.horario;
 for(const [id,key] of [["shiftStart","start"],["shiftEnd","end"]]){$(id).disabled=!t;$(id).value=s?.[key]??""}
 $("shiftOvernight").disabled=!t;$("shiftOvernight").checked=s?.overnight===true;$("addScheduleBlock").disabled=!t||(s?.blocks?.length||0)>=200;
 const root=$("scheduleBlocks");root.replaceChildren();$("scheduleCount").textContent=(s?.blocks?.length||0)+" / 200 tramos";
 if(!t){renderScheduleSummary();return}
 if(!s||typeof s!=="object"||Array.isArray(s)||!Array.isArray(s.blocks)){t.inputs.horario=MMCSchedule.blank();renderSchedule();return}
 s.blocks.forEach((block,i)=>{
  if(!block||typeof block!=="object"||Array.isArray(block)){block={start:"",end:"",type:"",recovery:"",notes:""};s.blocks[i]=block;}
  const row=document.createElement("div");row.className="schedule-block";const heading=document.createElement("strong");heading.className="block-heading";heading.textContent="Tramo "+(i+1);row.append(heading);
  const field=(title,key,type)=>{const label=document.createElement("label");label.textContent=title;const input=document.createElement("input");input.type=type;input.value=block[key]??"";input.setAttribute("aria-label",title+" del tramo "+(i+1));if(type==="time")input.step="60";input.oninput=()=>{block[key]=input.value;scheduleChanged()};label.append(input);row.append(label);return label};
  field("Inicio","start","time");field("Fin","end","time");
  const typeLabel=document.createElement("label");typeLabel.textContent="Actividad";const type=document.createElement("select");type.setAttribute("aria-label","Actividad del tramo "+(i+1));for(const [value,label] of [["","Seleccione"],["mmc","Manipulación de cargas"],["pausa","Pausa / descanso"],["otra","Otra tarea sin MMC"]]){const o=document.createElement("option");o.value=value;o.textContent=label;type.append(o)}type.value=block.type??"";typeLabel.append(type);row.append(typeLabel);
  const recLabel=document.createElement("label");recLabel.textContent="¿Permite recuperación dorsolumbar?";const rec=document.createElement("select");rec.setAttribute("aria-label","Recuperación del tramo "+(i+1));for(const [value,label] of [["","Seleccione"],["si","Sí: descanso o trabajo ligero"],["no","No"]]){const o=document.createElement("option");o.value=value;o.textContent=label;rec.append(o)}
  const updateRecovery=()=>{rec.disabled=block.type!=="otra";rec.value=block.type==="pausa"?"si":block.type==="mmc"?"no":block.recovery??""};updateRecovery();rec.oninput=()=>{block.recovery=rec.value;scheduleChanged()};type.oninput=()=>{block.type=type.value;block.recovery="";updateRecovery();scheduleChanged()};recLabel.append(rec);row.append(recLabel);
  const notes=field("Descripción (opcional)","notes","text");notes.className="block-note";notes.querySelector("input").maxLength=200;
  const del=document.createElement("button");del.type="button";del.className="secondary";del.textContent="Eliminar tramo";del.setAttribute("aria-label","Eliminar tramo "+(i+1));del.onclick=()=>{s.blocks.splice(i,1);scheduleChanged();renderSchedule()};row.append(del);root.append(row);
 });renderScheduleSummary();
}
function renderScheduleSummary(){
 const out=$("scheduleFeedback"),detail=$("scheduleBreakdown");out.replaceChildren();detail.replaceChildren();const t=selectedTask();if(!t){out.textContent="Añada o seleccione una tarea para registrar su horario.";return}
 const d=syncTemporal(t.inputs);
 if(d.problems.length){const box=document.createElement("div");box.className="schedule-problems";const title=document.createElement("strong");title.textContent="Duración no determinada";const list=document.createElement("ul");d.problems.forEach(problem=>{const li=document.createElement("li");li.textContent=problem;list.append(li)});box.append(title,list);out.append(box);return}
 const success=document.createElement("p");success.className="schedule-success";success.textContent="Duración calculada: "+d.category.toUpperCase()+". Se utiliza la categoría más desfavorable de los períodos de esta tarea.";out.append(success);
 const metrics=document.createElement("div");metrics.className="schedule-metrics";for(const [label,value] of [["Jornada",d.shiftMinutes+" min"],["Manipulación total",d.totalMMC+" min"],["Período determinante",d.minutes+" min"],["Extensión temporal",d.totalMMC<=480?"Hasta 8 h":(d.extension-1)+"–"+d.extension+" h"]]){const card=document.createElement("div");card.className="schedule-metric";const title=document.createElement("span");title.textContent=label;const number=document.createElement("strong");number.textContent=value;card.append(title,number);metrics.append(card)}detail.append(metrics);
 const strip=document.createElement("div");strip.className="schedule-strip";strip.setAttribute("aria-label","Distribución de la jornada");for(const b of d.segments){const span=document.createElement("span");span.className=b.type==="otra"&&b.recovery?"ligera":b.type;span.style.flex=String(b.end-b.start);span.title=scheduleClock(b.start)+"–"+scheduleClock(b.end)+": "+(b.type==="mmc"?"MMC":b.type==="pausa"?"Pausa":b.recovery?"Otra tarea ligera":"Otra tarea sin recuperación");strip.append(span)}detail.append(strip);
 const legend=document.createElement("div");legend.className="schedule-legend";for(const [label,color] of [["MMC","#0078d4"],["Pausa","#2f855a"],["Otra tarea ligera","#8bd5bd"],["Sin recuperación","#a0aec0"]]){const span=document.createElement("span");span.textContent=label;span.style.setProperty("--swatch",color);legend.append(span)}detail.append(legend);
 const heading=document.createElement("h2");heading.textContent="Cómo se ha obtenido la duración";detail.append(heading);const list=document.createElement("ol");list.className="schedule-periods";for(const g of d.groups){const li=document.createElement("li");li.textContent=scheduleClock(g.start)+"–"+scheduleClock(g.end)+": "+g.minutes+" min de período evaluado; recuperación posterior "+g.recoveryMinutes+" min → "+g.category+".";list.append(li)}detail.append(list);const note=document.createElement("p");note.className="muted";note.textContent="El período evaluado incluye las pausas y otros tramos intermedios que no permiten separar bloques por recuperación suficiente. Las horas con MMC se obtienen solo de los tramos de manipulación.";detail.append(note);
}
function multiplier(key,val){
 if((typeof val!=="number"&&typeof val!=="string")||String(val).trim()==="")return undefined;
 const n=Number(val);if(!Number.isFinite(n)||n<0||!tables[key])return undefined;
 if(key==="horizontal"&&n<20)return undefined;
 const entries=Object.entries(tables[key]).map(([k,v])=>[Number(k),v]).sort((a,b)=>a[0]-b[0]);
 // Extremos con factor cero acordados para interpolar los últimos tramos.
 const endpoints={vertical:175,horizontal:63,desplazamiento:175};
 if(endpoints[key]!==undefined)entries.push([endpoints[key],0]);
 // Conservar los mínimos de aplicación ya existentes.
 if(key==="desplazamiento"&&n<=25)return 1;
 if(key==="horizontal"&&n<=25)return 1;
 const exact=entries.find(([k])=>k===n);if(exact)return exact[1];
 const maxima={vertical:175,horizontal:63,desplazamiento:175,asimetria:135};
 if(n>maxima[key])return 0;
 const lower=entries.filter(([k])=>k<n).at(-1),upper=entries.find(([k])=>k>n);
 // Interpolación lineal entre dos puntos numéricos del Excel LI.
 // V, H y D usan los extremos acordados de 175, 63 y 175 cm; por encima el factor es cero.
 // Sin ambos extremos, no extrapolar ni prolongar el último coeficiente.
 if(!lower||!upper)return undefined;
 return lower[1]+(n-lower[0])/(upper[0]-lower[0])*(upper[1]-lower[1]);
}
// Clasificación automática: horario, tabla 2.4 y ejemplo de las páginas 36–37 del manual aportado.
function durationData(x){return MMCSchedule.analyze(x?.horario)}
function durationNote(r){
 if(!r.duration||r.problems)return "";const d=r.duration;
 return "Duración automática "+d.category+": período determinante "+fmt(d.minutes)+" min; recuperación posterior "+fmt(d.recoveryMinutes)+" min. MMC total: "+fmt(d.totalMMC)+" min en una jornada de "+fmt(d.shiftMinutes)+" min. "+d.groups.map((g,i)=>"Período "+(i+1)+": "+scheduleClock(g.start)+"–"+scheduleClock(g.end)+", "+fmt(g.minutes)+" min + "+fmt(g.recoveryMinutes)+" min de recuperación, "+g.category+".").join(" ");
}
// Fuente exclusiva: Excel LI, Bueno=1 y Malo=0,9.
function couplingMultiplier(quality,height){
 if(!["bueno","malo"].includes(quality))return undefined;
 if((typeof height!=="number"&&typeof height!=="string")||String(height).trim()==="")return undefined;
 const vertical=Number(height);if(!Number.isFinite(vertical)||vertical<0)return undefined;
 return quality==="bueno"?1:.9;
}
function couplingNote(r){
 if(r.problems||!["bueno","malo"].includes(r.coupling))return "";
 return "Agarre "+r.coupling+". CM = "+fmt(r.vals.CM)+" (Excel LI).";
}
function geometryNote(r){return r.problems?"":"VM, HM, DM y AM: coeficientes tabulados del Excel LI e interpolación lineal entre puntos numéricos. Extremos acordados para interpolar: VM=0 a V=175 cm, HM=0 a H=63 cm y DM=0 a D=175 cm; por encima de cada límite el factor es cero. Sin dos extremos no se extrapola. Se mantienen los mínimos de aplicación de HM y DM.";}
function calculationNote(r){return[geometryNote(r),durationNote(r),frequencyNote(r),couplingNote(r),positionNote(r)].filter(Boolean).join(" ")}
function updateDurationFeedback(x){
 const out=$("durationFeedback");if(!out)return;
 if(!x){out.textContent="Seleccione una tarea para comprobar la duración.";return}
 const duration=durationData(x);
 out.textContent=duration.problems.length?duration.problems.join(" "):durationNote({duration});
}
function calc(x){
 const duration=durationData(x);x={...x,grupoDuracion:duration.category,extension:duration.extension===undefined?"":String(duration.extension)};
 const problems=[];
 for(const k of ["peso","horizontal","vertical","desplazamiento","asimetria","agarre","unaMano","dosPersonas"])if(x[k]===undefined||x[k]===null||String(x[k]).trim()==="")problems.push("Falta: "+k);
 problems.push(...duration.problems);
 if(x.agarre!==undefined&&x.agarre!==null&&String(x.agarre).trim()!==""&&!["bueno","malo"].includes(x.agarre))problems.push("Agarre no admitido en el Excel LI: seleccione Bueno o Malo.");
 if(Number.isFinite(Number(x.horizontal))&&Number(x.horizontal)<20)problems.push("Distancia horizontal en origen inferior al mínimo de 20 cm del manual.");
 if(x.controlDestino==="si"){
  const present=v=>v!==undefined&&v!==null&&String(v).trim()!=="";
  if(present(x.horizontalDestino)&&Number.isFinite(Number(x.horizontalDestino))&&Number(x.horizontalDestino)<20)problems.push("Distancia horizontal en destino inferior al mínimo de 20 cm del manual.");
  if([x.vertical,x.verticalDestino,x.desplazamiento].every(v=>present(v)&&Number.isFinite(Number(v))&&Number(v)>=0)){
   const expected=Math.abs(Number(x.verticalDestino)-Number(x.vertical));
   if(Math.abs(Number(x.desplazamiento)-expected)>1e-9)problems.push("Desplazamiento incoherente: D debe coincidir con |V destino − V origen| = "+fmt(expected)+" cm. Introduzca el recorrido real; el mínimo de 25 cm se aplica solo al factor DM.");
  }
 }
 if(problems.length)return{problems};
 const vals={VM:multiplier("vertical",x.vertical),HM:multiplier("horizontal",x.horizontal),DM:multiplier("desplazamiento",x.desplazamiento),AM:multiplier("asimetria",x.asimetria)};
 for(const [k,v] of Object.entries(vals))if(v===undefined)problems.push("Valor inválido o sin dos puntos tabulados para interpolar: "+k);else if(v===0)problems.push("Condición crítica: "+k);
 vals.FM=frequencyMultiplier(x.frecuencia,x.grupoDuracion,x.vertical);
 if(vals.FM===undefined)problems.push("No se puede determinar FM: revise frecuencia, altura y categoría de duración.");else if(vals.FM===0)problems.push("Frecuencia crítica en origen");
 vals.CM=couplingMultiplier(x.agarre,x.vertical);if(vals.CM===undefined)problems.push("No se puede determinar CM: revise el tipo de agarre y la altura de origen.");
 vals.M1=x.unaMano==="si"?.6:1;vals.M2=x.dosPersonas==="si"?.85:1;vals.EM={8:1,9:.97,10:.93,11:.89,12:.85}[x.extension];if(vals.EM===undefined)problems.push("Extensión temporal fuera de tabla");
 // Cada posición conserva su geometría completa. DM y los factores comunes se comparten.
 const destinationVals=x.controlDestino==="si"?{...vals}:null;
 if(destinationVals){
  for(const [field,table,factor] of [["verticalDestino","vertical","VM"],["horizontalDestino","horizontal","HM"],["asimetriaDestino","asimetria","AM"]]){
   const input=x[field];
   if(input===undefined||input===null||String(input).trim()===""){problems.push("Falta dato de destino: "+field);continue}
   const value=multiplier(table,input);
   if(value===undefined)problems.push("Valor de destino inválido o sin dos puntos tabulados para interpolar: "+field);
   else if(value===0)problems.push("Condición crítica en destino: "+field);
   destinationVals[factor]=value;
  }
  destinationVals.FM=frequencyMultiplier(x.frecuencia,x.grupoDuracion,x.verticalDestino);
  if(destinationVals.FM===undefined)problems.push("No se puede determinar FM en destino: revise frecuencia y altura de destino.");
  else if(destinationVals.FM===0)problems.push("Frecuencia crítica en destino");
  destinationVals.CM=couplingMultiplier(x.agarre,x.verticalDestino);
  if(destinationVals.CM===undefined)problems.push("No se puede determinar CM en destino: revise el tipo de agarre y la altura de destino.");
 }
 const w=Number(x.peso);if(!Number.isFinite(w)||w<=0)problems.push("Peso inválido");
 if(problems.length)return{problems,vals};
 const effective=w/(x.dosPersonas==="si"?2:1);
 const evaluate=factors=>{
  const product=Object.values(factors).reduce((a,b)=>a*b,1);
  return{vals:factors,product,indices:refs.map(([group,mass])=>({group,mass,recommended:mass*product,index:effective/(mass*product)}))};
 };
 const origin=evaluate(vals),destination=destinationVals?evaluate(destinationVals):null;
 // El menor peso recomendado determina el mayor índice para cada grupo de referencia.
 // En caso de igualdad se conserva origen; ambos resultados permanecen disponibles.
 const governingPosition=destination&&destination.product<origin.product?"destination":"origin";
 const selected=governingPosition==="destination"?destination:origin;
 const frequencyValue=Number(x.frecuencia),frequency={value:frequencyValue,method:frequencyValue<=.2?"tramo de baja frecuencia del Excel LI":freq.includes(frequencyValue)?"valor tabulado":"interpolación entre filas"};
 return{vals:selected.vals,weightTotal:w,weightPerPerson:effective,indices:selected.indices,positions:{origin,destination},governingPosition,duration,frequency,coupling:x.agarre};
}
function positionNote(r){
 if(!r.positions?.destination)return "";
 if(r.positions.origin.product===r.positions.destination.product)return "Control significativo en destino: origen y destino presentan el mismo índice.";
 return "Control significativo en destino: se han evaluado ambas posiciones por separado. El mayor índice corresponde a "+(r.governingPosition==="destination"?"destino":"origen")+".";
}
function factorText(r){
 if(r.problems)return r.problems.join("; ");
 if(r.positions?.destination)return "Origen: "+JSON.stringify(r.positions.origin.vals)+" | Destino: "+JSON.stringify(r.positions.destination.vals)+" | "+calculationNote(r);
 return JSON.stringify(r.vals)+" | "+calculationNote(r);
}
function resultLevel(value){
 // Informe de condiciones ergonomicas, apartado 2.1, pagina 6.
 // Aplicar los limites al valor sin redondear; redondear solo para mostrar.
 if(!Number.isFinite(value))return {label:"No calculable",color:"#e2e8f0",text:"#334155"};
 if(value<=1)return {label:"Muy bajo o tolerable",color:"#00ff00",text:"#111111"};
 if(value<=1.5)return {label:"Bajo",color:"#ffff00",text:"#111111"};
 if(value<=2)return {label:"Moderado",color:"#ff0000",text:"#ffffff"};
 if(value<=3)return {label:"Alto",color:"#c00000",text:"#ffffff"};
 return {label:"Muy alto",color:"#7030a0",text:"#ffffff"};
}
function copyTask(t,r){
 const groups=["Hombres 20–45","Hombres <20 o >45","Mujeres 20–45","Mujeres <20 o >45"];
 const rows=r.indices?r.indices.map((v,i)=>[groups[i],fmt(v.index),resultLevel(v.index).label]):[];
 const title=t.name||"Sin nombre";
 const head='<tr><th colspan="3" style="padding:8px;border:1px solid #8da9c3;background:#6f9ac2;color:#fff;text-align:left">Tarea: '+safe(title)+'</th></tr>';
 const headers='<tr>'+["Grupo","IR-MMC (IL)","Nivel de riesgo"].map(v=>'<th style="border:1px solid #b9cede;padding:5px;background:#dceaf6">'+safe(v)+'</th>').join("")+'</tr>';
 const body=rows.map((row,j)=>'<tr>'+row.map((val,i)=>{const level=r.indices?resultLevel(r.indices[j].index):null;return '<td style="border:1px solid #b9cede;padding:5px;'+(i===2&&level?'background:'+level.color+';color:'+level.text+';':'')+'">'+safe(val)+'</td>'}).join("")+'</tr>').join("");
 const error=r.problems?'<tr><td colspan="3" style="border:1px solid #b9cede;padding:5px">'+safe(r.problems.join("; "))+'</td></tr>':"";
 const note=calculationNote(r);
 const noteRow=note?'<tr><td colspan="3" style="border:1px solid #b9cede;padding:5px">'+safe(note)+'</td></tr>':"";
 const html='<table style="font-family:Arial,sans-serif;font-size:10pt;border-collapse:collapse;width:100%">'+head+noteRow+headers+body+error+'</table>';
 const plain="Tarea: "+title+(note?"\n"+note:"")+"\nGrupo\tIR-MMC (IL)\tNivel de riesgo\n"+(r.problems?r.problems.join("; "):rows.map(a=>a.join("\t")).join("\n"));
 if(navigator.clipboard?.write&&window.ClipboardItem){navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([plain],{type:"text/plain"})})]).then(()=>$("status").textContent="Tabla de "+title+" copiada para Word").catch(()=>$("status").textContent="No se ha podido copiar la tabla")}else if(navigator.clipboard?.writeText){navigator.clipboard.writeText(plain).then(()=>$("status").textContent="Texto de tabla copiado (sin formato)")}
 else $("status").textContent="La copia no está disponible en este navegador";
}
function results(){
 const root=$("summary");root.replaceChildren();if(!p.tasks.length){root.textContent="No hay tareas";return}
 const toolbar=document.createElement("div");toolbar.className="results-toolbar";
 const search=document.createElement("input");search.type="search";search.placeholder="Buscar tarea por nombre...";search.setAttribute("aria-label","Buscar tarea");
 const expand=document.createElement("button");expand.textContent="Desplegar todas";expand.className="secondary";
 const collapse=document.createElement("button");collapse.textContent="Contraer todas";collapse.className="secondary";
 toolbar.append(search,expand,collapse);root.append(toolbar);
 const container=document.createElement("div");container.className="result-cards";root.append(container);
 p.tasks.forEach((t,i)=>{
  const card=document.createElement("details");card.className="result-card";card.dataset.name=(t.name||"").toLowerCase();card.open=false;
  const header=document.createElement("summary");header.textContent=(i+1)+". "+(t.name||"Tarea sin nombre");
  const content=document.createElement("div");content.className="result-card-content";
  const r=calc(t.inputs),table=document.createElement("table");table.className="result-table task-result-table";
  const thead=document.createElement("thead");const taskHead=document.createElement("tr");const taskTitle=document.createElement("th");taskTitle.colSpan=3;taskTitle.className="task-table-title";taskTitle.textContent="Tarea: "+(t.name||"Sin nombre");taskHead.append(taskTitle);thead.append(taskHead);
  const columns=document.createElement("tr");["Grupo de referencia","IR-MMC (IL)","Nivel de riesgo"].forEach(c=>{const th=document.createElement("th");th.textContent=c;columns.append(th)});thead.append(columns);table.append(thead);
  const body=document.createElement("tbody");
  if(r.indices){const groups=["Hombres 20–45","Hombres <20 o >45","Mujeres 20–45","Mujeres <20 o >45"];r.indices.forEach((v,k)=>{const tr=document.createElement("tr");for(const [n,value] of [groups[k],fmt(v.index),resultLevel(v.index).label].entries()){const td=document.createElement("td");td.textContent=value;if(n===2){const level=resultLevel(v.index);td.style.backgroundColor=level.color;td.style.color=level.text;td.title="Clasificación ISO 11228-1 según informe de condiciones ergonómicas, apartado 2.1"}tr.append(td)}body.append(tr)})}else{const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent=(r.problems||["Cálculo no disponible"]).join("; ");tr.append(td);body.append(tr)}table.append(body);
  const btn=document.createElement("button");btn.className="secondary";btn.textContent="Copiar esta tabla a Word";btn.onclick=()=>copyTask(t,r);
  content.append(table);
  const note=calculationNote(r);if(note){const explanation=document.createElement("p");explanation.textContent=note;content.append(explanation)}
  content.append(btn);card.append(header,content);container.append(card);
 });
 search.oninput=()=>{const term=search.value.toLowerCase().trim();container.querySelectorAll(".result-card").forEach(c=>c.hidden=!c.dataset.name.includes(term))};
 expand.onclick=()=>container.querySelectorAll(".result-card:not([hidden])").forEach(c=>c.open=true);
 collapse.onclick=()=>container.querySelectorAll(".result-card").forEach(c=>c.open=false);
}
function detail(t,r){const d=$("detail");d.replaceChildren();const h=document.createElement("h2");h.textContent="Detalle: "+(t.name||"Tarea");d.append(h);if(r.problems){const v=document.createElement("p");v.textContent=r.problems.join("; ");d.append(v);return}const a=document.createElement("p");a.textContent="Peso total "+fmt(r.weightTotal)+" kg · Peso por persona "+fmt(r.weightPerPerson)+" kg";d.append(a);const b=document.createElement("p");b.textContent=Object.entries(r.vals).map(([k,v])=>k+"="+v).join(" | ");d.append(b);r.indices.forEach(i=>{const q=document.createElement("p");q.textContent=i.group+": peso recomendado "+fmt(i.recommended)+" kg · índice "+fmt(i.index);d.append(q)})}
async function save(as){try{p.tasks.forEach(t=>syncTemporal(t.inputs));Object.values(p.simulations).forEach(x=>{if(x&&typeof x==="object"&&!Array.isArray(x))syncTemporal(x)});if(!as&&handle){const w=await handle.createWritable();await w.write(JSON.stringify(p,null,2));await w.close()}else if(window.showSaveFilePicker){handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:"JSON",accept:{"application/json":[".json"]}}]});name=handle.name;const w=await handle.createWritable();await w.write(JSON.stringify(p,null,2));await w.close()}else{let n=prompt("Nombre del archivo",name);if(!n)return;name=n.endsWith(".json")?n:n+".json";const u=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}dirty=false;$("status").textContent="Guardado solicitado"}catch(e){if(e.name!=="AbortError")$("status").textContent=e.message}}
async function load(f){if(!f)return;try{const q=JSON.parse(await f.text());if(q.application!=="MMC Analyzer"||q.module!=="simple"||!Array.isArray(q.tasks)||q.tasks.length>50)throw Error("Proyecto incompatible");if(dirty&&!confirm("¿Descartar cambios?"))return;p={application:"MMC Analyzer",module:"simple",version:3,meta:q.meta||{},tasks:q.tasks.map(t=>({id:String(t.id),name:String(t.name||""),inputs:{...blank(),...t.inputs,horario:t.inputs?.horario||MMCSchedule.blank()}})),simulations:q.simulations||{}};metas.forEach(k=>document.querySelector('[data-meta="'+k+'"]').value=p.meta[k]||"");p.tasks.forEach(t=>syncTemporal(t.inputs));Object.values(p.simulations).forEach(x=>{if(x&&typeof x==="object"&&!Array.isArray(x))syncTemporal(x)});dirty=false;handle=null;name=f.name;render();nav(1);$("status").textContent="Proyecto cargado"+(p.tasks.some(t=>durationData(t.inputs).problems.length)?". Complete o revise el horario de cada tarea.":"")}catch(e){$("status").textContent=e.message}}
function sim(){const t=p.tasks.find(t=>t.id===$("simTask").value);if(!t)return;const current=p.simulations[t.id]||structuredClone(t.inputs);if(!current.horario)current.horario=structuredClone(t.inputs.horario);syncTemporal(current);const area=$("simInputs");area.replaceChildren();const hint=document.createElement("p");hint.textContent="Los tiempos se calculan desde el horario guardado en la simulación; restablézcala para tomar el horario actual de la tarea.";hint.className="muted";area.append(hint);for(const [k,v] of Object.entries(t.inputs)){if(k==="horario")continue;const lab=document.createElement("label");lab.textContent=({duracion:"Período calculado (min)",recuperacion:"Recuperación calculada (min)",grupoDuracion:"Categoría automática",extension:"Extensión temporal automática"}[k]||k);const inp=document.createElement(k==="agarre"?"select":"input");if(k==="agarre"){for(const [value,label] of [["","Sin indicar"],["bueno","Bueno"],["malo","Malo"]]){const option=document.createElement("option");option.value=value;option.textContent=label;inp.append(option)}}inp.value=current[k]??v;if(temporalFields.includes(k)){inp.readOnly=true;inp.disabled=true;inp.className="automatic-field"}else inp.oninput=()=>{current[k]=inp.value;p.simulations[t.id]=current;changed();showSim(t,current)};lab.append(inp);area.append(lab)}showSim(t,current)}
function showSim(t,x){const original=calc(t.inputs),mod=calc(x);$("simResults").textContent=original.indices&&mod.indices?original.indices.map((v,i)=>v.group+": "+fmt(v.index)+" → "+fmt(mod.indices[i].index)).join(" | "):"Simulación pendiente. "+(original.problems?"Datos originales: "+original.problems.join("; ")+". ":"")+(mod.problems?"Datos simulados: "+mod.problems.join("; "):"")}
function copy(type){let rows=[["Tarea","25 kg","20 kg H","20 kg M","15 kg"]];for(const t of p.tasks){const r=calc(t.inputs);rows.push([t.name,...(r.indices?r.indices.map(i=>fmt(i.index)):["—","—","—","—"])])}if(type==="intermediate")rows=[["Tarea","Factores"],...p.tasks.map(t=>{const r=calc(t.inputs);return[t.name,factorText(r)]})];if(type==="sim")rows=[["Tarea","Simulación"],...p.tasks.map(t=>[t.name,p.simulations[t.id]?JSON.stringify(p.simulations[t.id]):"Sin simulación"])];const markup='<table style="font-family:Arial;font-size:10pt;border-collapse:collapse">'+rows.map(row=>"<tr>"+row.map(cell=>'<td style="border:1px solid #ccc;padding:4px">'+safe(cell)+"</td>").join("")+"</tr>").join("")+"</table>";const plain=rows.map(r=>r.join("\t")).join("\n");if(navigator.clipboard?.write&&window.ClipboardItem){navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([markup],{type:"text/html"}),"text/plain":new Blob([plain],{type:"text/plain"})})]).then(()=>$("status").textContent="Tabla copiada").catch(()=>$("status").textContent="No se pudo copiar")}else navigator.clipboard?.writeText(plain).then(()=>$("status").textContent="Tabla copiada")}
$("enter").onclick=()=>screen("methods");$("backWelcome").onclick=()=>screen("welcome");document.querySelectorAll("[data-method]").forEach(b=>b.onclick=()=>b.dataset.method==="simple"?(screen("simple"),nav(1)):$("methodNote").textContent="Módulo en preparación");
$("home").onclick=()=>{if(dirty&&!confirm("Hay cambios sin guardar. ¿Salir?"))return;screen("welcome")};$("prev").onclick=()=>nav(page-1);$("next").onclick=()=>nav(page+1);
$("addTask").onclick=()=>{if(p.tasks.length>=50)return;const t=task();p.tasks.push(t);sel=t.id;changed();render()};$("taskSelect").onchange=e=>{sel=e.target.value;inputs()};
$("scheduleTask").onchange=e=>{sel=e.target.value;renderSchedule()};
$("editTaskSchedule").onclick=()=>nav(2);
for(const [id,key] of [["shiftStart","start"],["shiftEnd","end"]])$(id).oninput=()=>{const t=selectedTask();if(t){t.inputs.horario[key]=$(id).value;scheduleChanged()}};
$("shiftOvernight").onchange=()=>{const t=selectedTask();if(t){t.inputs.horario.overnight=$("shiftOvernight").checked;scheduleChanged()}};
$("addScheduleBlock").onclick=()=>{const t=selectedTask();if(!t)return;const s=t.inputs.horario;if(s.blocks.length>=200)return;s.blocks.push({id:crypto.randomUUID(),start:s.blocks.at(-1)?.end||s.start,end:s.end,type:"",recovery:"",notes:""});scheduleChanged();renderSchedule()};
document.querySelectorAll("[data-field]").forEach(e=>e.addEventListener("input",()=>{const t=p.tasks.find(t=>t.id===sel);if(t&&!temporalFields.includes(e.dataset.field)){t.inputs[e.dataset.field]=e.value;if(e.dataset.field==="controlDestino")$("destination").hidden=e.value!=="si";updateDurationFeedback(t.inputs);changed()}}));
document.querySelectorAll("[data-meta]").forEach(e=>e.addEventListener("input",()=>{p.meta[e.dataset.meta]=e.value;changed()}));
$("save").onclick=()=>save(false);$("saveAs").onclick=()=>save(true);$("load").onchange=e=>{load(e.target.files[0]);e.target.value=""};
$("openSimulation").onclick=()=>{$("simulation").hidden=!$("simulation").hidden;selector();sim()};
$("simTask").onchange=sim;$("resetSim").onclick=()=>{delete p.simulations[$("simTask").value];changed();sim()};
$("copyGeneral").onclick=()=>copy("general");$("copyIntermediate").onclick=()=>copy("intermediate");$("copySim").onclick=()=>copy("sim");
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});render();nav(1);
})();
