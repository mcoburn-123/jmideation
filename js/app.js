import {load,save,uid,download} from "./storage.js";
import {renderGraph} from "./graph.js";
import {outcomeModal,reflectionModal} from "./outcome.js";
import {markdown,mermaid} from "./reports.js";
import {renderGame} from "./game.js";

const STAGES=["Source","Channel","Pool","Return"], THREADS=["Water","Healing","Infrastructure","Pedagogy"], TYPES=["Plant","Person","Place","Practice","Project","Pattern"];
let state=load(),mode="watershed",activeThread="All",reportType="Markdown",lastDialogFocus=null;
const app=document.querySelector("#app"),nav=document.querySelector("#modeNav");
nav.innerHTML=["Watershed","Field Round","Threads","Knowledge","Projects","Reports"].map(x=>`<button type="button" data-mode="${x.toLowerCase().replace(" ","-")}">${x}</button>`).join("");
document.addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(b){mode=b.dataset.mode;render(true)}});
document.querySelector("#newObservation").addEventListener("click",()=>editObservation());
document.querySelector("#openGuide").addEventListener("click",()=>openGuide(0));

function persist(message="Saved"){save(state);toast(message);render()}
function toast(message){const t=document.querySelector("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),5000)}
function safe(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(value){return safe(value)}
function hero(title,text,actions=""){return `<section class="hero"><div><h1>${safe(title)}</h1><p>${safe(text)}</p></div>${actions}</section>`}
function tags(values=[]){return `<div class="tags">${values.filter(x=>THREADS.includes(x)).map(x=>`<span class="tag ${x}">${safe(x)}</span>`).join("")}</div>`}
function observationCard(x){return `<article class="card" tabindex="0" role="button" data-item="${attr(x.id)}"><h3>${safe(x.title)}</h3><p>${safe(x.description)}</p>${tags(x.threads)}</article>`}
function render(focusView=false){nav.querySelectorAll("button").forEach(b=>{const current=b.dataset.mode===mode;b.classList.toggle("active",current);if(current)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});({watershed,"field-round":fieldRound,threads,knowledge,projects,reports}[mode]||watershed)();document.title=`${mode[0].toUpperCase()+mode.slice(1)} | The Blend Board`;if(focusView)requestAnimationFrame(()=>app.focus())}

function watershed(){
  const prompts=["What already exists? What repeats?","How does knowledge move?","Where does transformation occur?","What returns to the system?"];
  app.innerHTML=hero("What are we noticing?","Observations move like water: gathering, connecting, transforming and returning as living knowledge.",`<button type="button" class="ghost" id="seedReflection">↻ Reflect</button>`)+`<section class="flow panel"><svg class="flow-lines" aria-hidden="true"><path d="M80 120 C300 80 320 500 620 300 S1000 120 1400 430" fill="none" stroke="#3d9bff" stroke-width="3" opacity=".28"/></svg>${STAGES.map((s,i)=>`<section class="stage" aria-labelledby="stage-${i}"><div class="stage-head"><h2 id="stage-${i}">${s}</h2><small>${prompts[i]}</small></div>${state.observations.filter(x=>x.stage===s).map(observationCard).join("")}</section>`).join("")}</section>`;
  document.querySelector("#seedReflection").onclick=()=>reflect();
  app.querySelectorAll("[data-item]").forEach(el=>{const open=()=>editObservation(state.observations.find(o=>o.id===el.dataset.item));el.onclick=open;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}}});
}

function fieldRound(){renderGame(app,state,message=>{save(state);toast(message);fieldRound()})}

function threads(){
  const nodes=[...state.observations,...state.knowledge,...state.projects];
  app.innerHTML=hero("Threads","Follow relationships across water, healing, infrastructure and pedagogy.",`<div class="thread-buttons">${["All",...THREADS].map(t=>`<button type="button" class="chip ${t===activeThread?"active":""}" aria-pressed="${t===activeThread}" data-thread="${t}">${t}</button>`).join("")}</div>`)+`<section id="threadGraph" class="graph panel"></section>`;
  app.querySelectorAll("[data-thread]").forEach(b=>b.onclick=()=>{activeThread=b.dataset.thread;threads()});
  requestAnimationFrame(()=>renderGraph(document.querySelector("#threadGraph"),nodes,id=>toast(nodes.find(x=>x.id===id)?.title||"Node"),activeThread));
}

function knowledge(){
  app.innerHTML=hero("Living Knowledge","Plants, people, places, practices, projects and patterns form a local field guide.",`<button type="button" class="primary" id="addKnowledge">＋ Object</button>`)+`<div class="toolbar"><label class="sr-only" for="search">Search living knowledge</label><input id="search" placeholder="Search living knowledge…"><label class="sr-only" for="typeFilter">Filter by type</label><select id="typeFilter"><option>All types</option>${TYPES.map(x=>`<option>${x}</option>`).join("")}</select></div><section class="knowledge-grid" id="knowledgeGrid"></section>`;
  const draw=()=>{const q=document.querySelector("#search").value.toLowerCase(),ty=document.querySelector("#typeFilter").value;document.querySelector("#knowledgeGrid").innerHTML=state.knowledge.filter(x=>(ty==="All types"||x.type===ty)&&(`${x.title} ${x.description}`.toLowerCase().includes(q))).map(x=>`<article class="card" tabindex="0" role="button" data-k="${attr(x.id)}"><span class="type">${safe(x.type)}</span><h3>${safe(x.title)}</h3><p>${safe(x.description)}</p>${tags(x.threads)}<p>${x.observations?.length||0} observations · ${x.related?.length||0} relationships</p></article>`).join("")};
  draw();document.querySelector("#search").oninput=draw;document.querySelector("#typeFilter").onchange=draw;document.querySelector("#addKnowledge").onclick=()=>editKnowledge();
  const open=e=>{const c=e.target.closest("[data-k]");if(c)editKnowledge(state.knowledge.find(x=>x.id===c.dataset.k))};document.querySelector("#knowledgeGrid").onclick=open;document.querySelector("#knowledgeGrid").onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-k]")){e.preventDefault();open(e)}};
}

function projects(){
  app.innerHTML=hero("Projects","Move projects through the watershed. Entering Pool requires outcome tracing.",`<button type="button" class="primary" id="addProject">＋ Project</button>`)+`<section class="board">${STAGES.map(s=>`<section class="lane" data-stage="${s}" aria-labelledby="lane-${s.toLowerCase()}"><h2 id="lane-${s.toLowerCase()}">${s}</h2>${state.projects.filter(x=>x.stage===s).map(projectCard).join("")}</section>`).join("")}</section>`;
  document.querySelector("#addProject").onclick=()=>editProject();
  app.querySelectorAll("[draggable]").forEach(c=>c.ondragstart=e=>e.dataTransfer.setData("text/plain",c.dataset.p));
  app.querySelectorAll(".lane").forEach(l=>{l.ondragover=e=>{e.preventDefault();l.classList.add("drag")};l.ondragleave=()=>l.classList.remove("drag");l.ondrop=e=>{e.preventDefault();l.classList.remove("drag");moveProject(e.dataTransfer.getData("text/plain"),l.dataset.stage)}});
  app.querySelectorAll(".stage-select").forEach(select=>select.onchange=()=>moveProject(select.dataset.p,select.value));
}
function projectCard(x){return `<article class="card project-card" draggable="true" data-p="${attr(x.id)}"><h3>${safe(x.title)}</h3><p>${safe(x.description)}</p>${tags(x.threads)}<label class="move-label">Move to stage<select class="stage-select" data-p="${attr(x.id)}">${STAGES.map(s=>`<option ${s===x.stage?"selected":""}>${s}</option>`).join("")}</select></label></article>`}
function moveProject(id,nextStage){
  const project=state.projects.find(x=>x.id===id);if(!project||project.stage===nextStage){render();return}
  if(nextStage==="Pool"){
    outcomeModal(project,outcome=>{project.stage="Pool";project.outcomes=project.outcomes||[];project.outcomes.push(outcome);state.history.push({type:"outcome",project:project.id,data:outcome});persist("Outcome traced and project moved")},()=>{toast("Move canceled");render()});
  }else{project.stage=nextStage;persist("Project moved")}
}

function reports(){
  const output=reportType==="Markdown"?markdown(state):reportType==="JSON"?JSON.stringify(state,null,2):mermaid(state);
  app.innerHTML=hero("Reports","Export living documentation only after closing the reflection loop.",`<button type="button" class="primary" id="export">Reflect & Export</button>`)+`<section class="report-grid"><div class="panel" style="padding:18px"><h3>Format</h3>${["Markdown","JSON","Mermaid"].map(x=>`<button type="button" class="chip ${x===reportType?"active":""}" aria-pressed="${x===reportType}" data-report="${x}">${x}</button>`).join("")}<p>Each export records a session reflection. New-source reflections become observations automatically.</p></div><pre class="panel output">${safe(output)}</pre></section>`;
  app.querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>{reportType=b.dataset.report;reports()});
  document.querySelector("#export").onclick=()=>reflect(()=>download(`blend-board.${reportType==="Markdown"?"md":reportType==="JSON"?"json":"mmd"}`,reportType==="Markdown"?markdown(state):reportType==="JSON"?JSON.stringify(state,null,2):mermaid(state)));
}

function editObservation(x={}){formModal(x.id?"Edit observation":"What are we noticing?",`<label>Title<input name="title" required value="${attr(x.title)}"></label><label>Description<textarea name="description" placeholder="Describe the pattern…">${safe(x.description)}</textarea></label><label>Stage${select("stage",STAGES,x.stage||"Source")}</label>${threadChecks(x.threads)}`,f=>{const o={id:x.id||uid("o"),created:x.created||Date.now(),title:f.title.value.trim(),description:f.description.value.trim(),stage:f.stage.value,threads:checked(f,"threads")};x.id?Object.assign(x,o):state.observations.push(o);persist()})}
function editKnowledge(x={}){
  const relationshipChoices=state.knowledge.filter(k=>k.id!==x.id).map(k=>`<label><input type="checkbox" name="related" value="${attr(k.id)}" ${(x.related||[]).includes(k.id)?"checked":""}> ${safe(k.title)} <small>${safe(k.type)}</small></label>`).join("")||"<small>Add another knowledge object before creating relationships.</small>";
  formModal(x.id?"Edit knowledge object":"Add knowledge object",`<label>Title<input name="title" required value="${attr(x.title)}"></label><label>Description<textarea name="description">${safe(x.description)}</textarea></label><label>Type${select("type",TYPES,x.type||"Plant")}</label>${threadChecks(x.threads)}<fieldset class="field"><legend>Related objects</legend><div class="relation-list">${relationshipChoices}</div></fieldset><label>Observations<textarea name="observations" placeholder="One observation per line">${safe((x.observations||[]).join("\n"))}</textarea></label>`,f=>{const o={id:x.id||uid("k"),title:f.title.value.trim(),description:f.description.value.trim(),type:f.type.value,threads:checked(f,"threads"),related:checked(f,"related"),observations:f.observations.value.split("\n").map(v=>v.trim()).filter(Boolean)};x.id?Object.assign(x,o):state.knowledge.push(o);persist()})
}
function editProject(x={}){formModal(x.id?"Edit project":"Create project from relationships",`<label>Title<input name="title" required value="${attr(x.title)}"></label><label>Description<textarea name="description">${safe(x.description)}</textarea></label>${threadChecks(x.threads)}`,f=>{const o={id:x.id||uid("p"),title:f.title.value.trim(),description:f.description.value.trim(),stage:x.stage||"Source",threads:checked(f,"threads"),outcomes:x.outcomes||[]};x.id?Object.assign(x,o):state.projects.push(o);persist()})}
function reflect(done){reflectionModal(r=>{state.reflections.push(r);state.history.push({type:"reflection",data:r});if(r.newSource.trim())state.observations.push({id:uid("o"),title:r.newSource.trim(),description:`Created from reflection on ${new Date().toLocaleDateString()}.`,stage:"Source",threads:[],created:Date.now()});save(state);toast(r.newSource?"Reflection saved; new source created":"Reflection saved");render();done?.()},()=>{})}
function formModal(title,body,onSave){
 const root=document.querySelector("#modalRoot");lastDialogFocus=document.activeElement;setBackgroundInert(true);const titleId=`form-dialog-title-${Date.now()}`;
 root.innerHTML=`<div class="modal-back"><form class="modal panel" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><div class="modal-title-row"><h2 id="${titleId}">${safe(title)}</h2><button type="button" class="ghost icon-close" aria-label="Close dialog">×</button></div><div class="field">${body}</div><div class="actions"><button type="button" class="ghost cancel">Cancel</button><button class="primary">Save</button></div></form></div>`;
 const form=root.querySelector("form");const close=()=>{root.innerHTML="";setBackgroundInert(false);restoreDialogFocus()};
 form.querySelectorAll(".cancel,.icon-close").forEach(b=>b.onclick=close);
 form.onsubmit=e=>{e.preventDefault();onSave(form);root.innerHTML="";setBackgroundInert(false);restoreDialogFocus()};
 form.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();close();return}if(e.key!=="Tab")return;const items=[...form.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')].filter(x=>x.offsetParent!==null);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};
 form.querySelector("input,textarea,select,button")?.focus()
}
function setBackgroundInert(value){document.querySelectorAll("header,main").forEach(el=>{if(value)el.setAttribute("inert","");else el.removeAttribute("inert")})}
function restoreDialogFocus(){if(lastDialogFocus?.isConnected)lastDialogFocus.focus();else app.focus()}
function select(name,items,value){return `<select name="${name}">${items.map(x=>`<option ${x===value?"selected":""}>${safe(x)}</option>`).join("")}</select>`}
function threadChecks(values=[]){return `<fieldset class="field"><legend>Threads</legend><div class="checks">${THREADS.map(x=>`<label><input type="checkbox" name="threads" value="${x}" ${values?.includes(x)?"checked":""}> ${x}</label>`).join("")}</div></fieldset>`}
function checked(form,name){return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value)}

const GUIDE_KEY="blend-board-guide-seen-v1";
const GUIDE_PAGES=[
 {kicker:"Welcome to The Blend Board",title:"Abundance springs from relationships.",body:"Every idea enters through a relationship. A conversation connects to a person. A person carries knowledge. Knowledge belongs to a place. A place reveals a pattern. A pattern may become a question, an introduction, an experiment, or an action. The Blend Board helps those relationships become visible without forcing them to move before conditions are ready.",visual:`<div class="guide-web" aria-hidden="true"><span>Person</span><span>Place</span><span>Practice</span><span>Knowledge</span><span>Possibility</span><svg viewBox="0 0 300 260"><path d="M49 65 Q150 25 247 70 M49 65 Q90 145 151 224 M247 70 Q210 155 151 224 M48 181 Q145 118 247 70 M48 181 Q105 205 151 224"/></svg></div>`,tip:"Do not begin by creating a project. Begin with a person, place, pattern, question, or possibility. Follow the connection before choosing the return."},
 {kicker:"The watershed",title:"Let ideas move before they become projects",body:"Observations enter Source. Relationships carry them through Channel. Transformation happens in Pool. Learning returns to the system through Return.",visual:`<div class="guide-flow"><b>Notice</b><i>→</i><b>Relate</b><i>→</i><b>Transform</b><i>→</i><b>Return</b></div>`,tip:"Use Threads to see how Water, Healing, Infrastructure, and Pedagogy connect across the board."},
 {kicker:"Field Round",title:"Reflection creates readiness, not pressure",body:"Choose Individual for private sense-making or Circle for facilitated reflection. The round checks relationships and responsibility before deciding what the reflection is ready to become.",visual:`<div class="guide-returns">${["Act","Ask","Connect","Gather","Hold"].map(x=>`<span>${x}</span>`).join("")}</div>`,tip:"Hold is a valid return. Not everything should become action immediately."},
 {kicker:"A responsible practice",title:"Protect people, knowledge, and context",body:"Set visibility before a round. Mark permission-sensitive knowledge. Treat the consent, reciprocity, ownership, and evidence prompts as preparation, not ethics approval.",visual:`<div class="guide-visibility"><span>Private</span><span>Internal group</span><span>Shareable</span><span>Permission needed</span></div>`,tip:"For a first session, keep visibility Private or Internal group until everyone agrees what can be shared."},
 {kicker:"A simple first session",title:"Try this in 15 minutes",body:"1. Add one observation. 2. Open Threads and inspect one relationship. 3. Complete a Field Round. 4. Choose Act, Ask, Connect, Gather, or Hold. 5. Visit Reports only after reviewing what is safe to share.",visual:`<div class="guide-time"><strong>15</strong><span>minutes</span></div>`,tip:"The board saves in this browser. Export a JSON backup before clearing browser data or moving devices."}
];
function openGuide(pageIndex=0){
 const root=document.querySelector("#modalRoot"),opener=document.activeElement;let index=Math.max(0,Math.min(pageIndex,GUIDE_PAGES.length-1));setBackgroundInert(true);
 const draw=()=>{const p=GUIDE_PAGES[index];root.innerHTML=`<div class="modal-back guide-back"><section class="modal panel guide-modal" role="dialog" aria-modal="true" aria-labelledby="guideTitle"><div class="guide-top"><span>${p.kicker}</span><button type="button" class="ghost guide-close" aria-label="Close starter guide">×</button></div><div class="guide-dots" aria-label="Guide progress">${GUIDE_PAGES.map((_,i)=>`<span class="${i===index?"active":""}">${i+1}</span>`).join("")}</div><div class="guide-content"><div class="guide-copy"><h2 id="guideTitle">${p.title}</h2><p>${p.body}</p><aside><strong>Field note</strong>${p.tip}</aside>${index===0?`<p class="guide-attribution">Inspired by Starhawk’s first social permaculture principle: “Abundance springs from relationships.”</p>`:""}</div><div class="guide-visual">${p.visual}</div></div><footer class="guide-footer"><button type="button" class="ghost guide-prev" ${index===0?"disabled":""}>Back</button><span>${index+1} of ${GUIDE_PAGES.length}</span><button type="button" class="primary guide-next">${index===GUIDE_PAGES.length-1?"Enter the watershed":"Continue"}</button></footer></section></div>`;
  const dialog=root.querySelector("[role=dialog]");const close=()=>{localStorage.setItem(GUIDE_KEY,"1");root.innerHTML="";setBackgroundInert(false);if(opener?.isConnected)opener.focus();else app.focus()};
  root.querySelector(".guide-close").onclick=close;root.querySelector(".guide-prev").onclick=()=>{index--;draw()};root.querySelector(".guide-next").onclick=()=>{if(index<GUIDE_PAGES.length-1){index++;draw()}else close()};
  dialog.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();close()}if(e.key==="Tab"){const items=[...dialog.querySelectorAll("button:not([disabled])")];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
  root.querySelector(index===0?".guide-next":".guide-close").focus();
 };draw();
}
render();
if(!localStorage.getItem(GUIDE_KEY))requestAnimationFrame(()=>openGuide(0));
