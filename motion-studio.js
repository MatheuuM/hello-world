/* MOVVA Motion Studio: declarative 3D interface fragments, driven solely by native scroll. */
(()=>{'use strict';
const stage=document.getElementById('stage'),rig=document.getElementById('css3d-device');
if(!stage)return;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const root=document.createElement('div');
root.className='motion-studio';root.setAttribute('aria-hidden','true');
root.innerHTML='<div class="motion-atmosphere"><i class="m-orbit"></i><i class="m-orbit"></i><i class="m-orbit"></i></div>';
stage.appendChild(root);
const ring=root.querySelector('.motion-atmosphere');
const items=[{"scene":0,"kind":"activity","side":-1,"level":-0.26,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 16V9m6 7V5m6 11v-7m4 7V3\"/></svg></span> Atividade da semana</div><strong>6 <small>de 7</small></strong><span class=\"subline\">dias ativos</span><div class=\"m-week\"><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"off\">·</i><i class=\"\">✓</i><i class=\"\">✓</i></div>"},{"scene":0,"kind":"wellness","side":1,"level":0.26,"delay":0.009,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Wellness Score</div><strong>52<small>/100</small></strong><span class=\"subline\">score parcial</span><div class=\"m-multi-meter\">Mov. <i><b style=\"width:100%\"></b></i>Nut. <i><b style=\"width:20%\"></b></i>Água <i><b style=\"width:37%\"></b></i></div>"},{"scene":1,"kind":"features","side":-1,"level":-0.19,"delay":0,"content":"<div class=\"fragment-eyebrow\">Tudo conectado</div><h3>Seu movimento, em conjunto.</h3><div class=\"m-pill-row\"><em>Treinos</em><em>Nutrição</em><em>Hábitos</em></div>"},{"scene":1,"kind":"wellness","side":1,"level":0.28,"delay":0.014,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Bem-estar</div><strong>4 <small>pilares</small></strong><span class=\"subline\">Uma mesma jornada.</span>"},{"scene":2,"kind":"training","side":-1,"level":-0.25,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 10v4m3-7v10m3-5h6m3-5v10m3-7v4\"/></svg></span> Training</div><h3>ABCD – MM</h3><span class=\"subline\">4 treinos · 21 exercícios</span><div class=\"m-pill-row\"><em>Força</em><em>Corrida</em><em>Bike</em></div>"},{"scene":2,"kind":"run","side":1,"level":0.28,"delay":0.018,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"13\" cy=\"4.3\" r=\"1.7\"/><path d=\"m11 8 3 2 3-1m-9 10 3-5 2-2 3 4m-5-8-4 3\"/></svg></span> Corrida</div><strong>28 <small>km</small></strong><span class=\"subline\">168 minutos registrados</span>"},{"scene":3,"kind":"nutrition","side":-1,"level":-0.22,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 3v8m3-8v8M3 3v5a4 4 0 0 0 7 0V3m-3 8v10M18 3c-3 3-4 7-4 10h4v8\"/></svg></span> Nutrição</div><strong><span data-nut-count>2.018</span><small> /2.331 kcal</small></strong><div class=\"m-meter\"><i style=\"width:86%\"></i></div><div class=\"m-nut-rings\"><span class=\"nr\"><i data-value=\"89%\" style=\"--ring-color:#da9737;--value:320deg\"></i>Carb.</span><span class=\"nr\"><i data-value=\"56%\" style=\"--ring-color:#bba987;--value:202deg\"></i>Prot.</span><span class=\"nr\"><i data-value=\"100%\" style=\"--ring-color:#c98283;--value:360deg\"></i>Gord.</span></div>"},{"scene":3,"kind":"water","side":1,"level":0.29,"delay":0.019,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z\"/></svg></span> Hidratação</div><strong><span data-water-card>2,0</span><small> /2,7 L</small></strong><span class=\"subline\">Água registrada</span><div class=\"m-meter m-blue\"><i data-water-meter style=\"width:74%\"></i></div>"},{"scene":4,"kind":"graph","side":-1,"level":-0.24,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m3 18 6-7 4 3 8-9M16 5h5v5\"/></svg></span> Sua evolução</div><strong><span data-minutes-card>425</span><small> min</small></strong><svg class=\"graph-svg\" viewBox=\"0 0 220 80\" aria-hidden=\"true\"><path class=\"axis\" d=\"M1 68 H218\"/><path class=\"trace\" d=\"M2 62 C30 44 42 66 68 45 S98 58 130 37 S176 61 217 11\"/></svg>"},{"scene":4,"kind":"evo-score","side":1,"level":0.29,"delay":0.018,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Wellness Score</div><strong><span data-score-card>52</span><small>/100</small></strong><span class=\"subline\">Seu panorama · parcial</span><div class=\"m-meter m-mint\"><i data-score-meter style=\"width:52%\"></i></div>"},{"scene":5,"kind":"circle","side":-1,"level":-0.2,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"8\" cy=\"8\" r=\"3\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M2 20a6 6 0 0 1 12 0m0 0a5 5 0 0 1 8 0\"/></svg></span> Circle</div><strong>1 <small>dia juntos</small></strong><span class=\"subline\">Movimento gera movimento.</span><div class=\"m-circle-dots\"><i></i><i></i><i></i></div>"},{"scene":5,"kind":"features","side":1,"level":0.28,"delay":0.018,"content":"<div class=\"fragment-eyebrow\">Seu espaço</div><strong>2–5 <small>pessoas</small></strong><span class=\"subline\">Consistência compartilhada</span>"}].map((c,i)=>{
 const n=document.createElement('div');
 n.className='motion-fragment';
 n.dataset.kind=c.kind;n.dataset.scene=String(c.scene);
 n.innerHTML=c.content;root.appendChild(n);
 return {...c,el:n,index:i,width:0};
});
const phases=[[0,0.126],[0.128,0.278],[0.29,0.433],[0.435,0.595],[0.598,0.775],[0.778,0.937]];
function render(p,active,device){
 if(!document.documentElement.classList.contains('enhanced')){root.style.display='none';return;}
 root.style.display='';
 const vw=stage.clientWidth,vh=stage.clientHeight,mobile=vw<=760;
 let cx=vw*.5,cy=vh*.5,phoneH=430;
 if(rig&&document.documentElement.classList.contains('dom-device')){
  cx=parseFloat(rig.style.left)||vw*.5;
  cy=parseFloat(rig.style.top)||vh*.70;
  phoneH=parseFloat(rig.style.height)||360;
 }else if(device){
  cx=vw*(device.nx+1)/2;
  cy=vh*(1-device.ny)/2;
  phoneH=Math.max(240,device.scale*(vh/(2*(14*Math.tan(Math.PI*32/360))))*6.0);
 }
 ring.style.left=cx+'px';ring.style.top=cy+'px';ring.style.opacity=String(mobile?.35:.46);
 ring.style.transform='translate(-50%,-50%) rotate('+(p*168).toFixed(2)+'deg) scale('+(mobile?.9:1.04)+')';
 const current=phases[active]||[.93,1],sceneProg=clamp((p-current[0])/(current[1]-current[0]));
 const delta=Math.sin(sceneProg*Math.PI);
 const fragmentSide=mobile?Math.min(vw*.345,130):Math.min(vw*.145,205);
 const leftGuard=mobile?(vw<=360?10:12):22;
 let visible=0;
 for(const c of items){
  const [start,end]=phases[c.scene],time=(p-start)/(end-start),delay=c.delay;
  const arrive=c.scene===0?1:smooth((time-.035-delay)/.18);
  const leave=1-smooth((time-.73)/.26);
  const raw=clamp(arrive*leave);
  const sceneVisible=c.scene===active||raw>.005;
  const local=clamp(time);
  const amplitude=c.scene===0?clamp(1-smooth((p-.079)/.055)):(raw);
  const factor=amplitude;
  if(!sceneVisible||factor<.003){c.el.style.opacity='0';c.el.style.visibility='hidden';continue;}
  c.el.style.visibility='visible';
  const offX=c.side*fragmentSide*(mobile?1:1.0);
  const offY=phoneH*c.level*(mobile?.70:.85);
  const wobble=Math.sin((local+.07*c.index)*Math.PI*2);
  const movement=.15*(1-factor);
  const elWidth=c.el.offsetWidth|| (mobile?132:190);
  const keepLeft=elWidth*.78+leftGuard,keepRight=vw-elWidth*.78-leftGuard;
  let px=clamp(cx+offX*factor+wobble*(mobile?3:7),keepLeft,keepRight);
  let py=cy+offY*factor+(1-factor)*(c.level<0?40:-35);
  const nav=document.querySelector('.chapter-bar'),navY=nav?nav.getBoundingClientRect().top-stage.getBoundingClientRect().top:vh-48;
  const copy=document.querySelector('.scene[aria-hidden="false"] .copy');
  const copyBottom=copy?.getBoundingClientRect().bottom-stage.getBoundingClientRect().top||0;
  // Never hide the hero CTA or the chapter selector.
  const roomTop=mobile?Math.max(copyBottom+16,vh*.25):Math.max(80,vh*.11);
  const lower=navY-(mobile?13:18);
  const elHeight=c.el.offsetHeight||80;
  py=clamp(py,roomTop+elHeight*.5,Math.max(roomTop+elHeight*.5,lower-elHeight*.5));
  const scale=mobile?.58+.42*factor:.53+.47*factor;
  const tilt=c.side*(mobile?-5:-10)+(1-factor)*c.side*18+wobble*(mobile?1.5:3);
  c.el.style.left=px.toFixed(2)+'px';c.el.style.top=py.toFixed(2)+'px';
  c.el.style.opacity=String(Math.min(.98,factor*(c.scene===0?.94:.98)));
  c.el.style.transform='translate(-50%,-50%) translateZ('+(factor*90).toFixed(2)+'px) rotateY('+(tilt*(1-factor*.3)).toFixed(2)+'deg) rotateZ('+(c.side*3+wobble*2).toFixed(2)+'deg) scale('+scale.toFixed(4)+')';
  visible++;
 }
 const evo=clamp((p-.674)/(.730-.674));
 const evoE=smooth(evo);
 root.style.setProperty('--graph-progress',evoE.toFixed(4));
 root.querySelectorAll('[data-score-card]').forEach(e=>e.textContent=String(Math.round(52*evoE)));
 root.querySelectorAll('[data-minutes-card]').forEach(e=>e.textContent=String(Math.round(425*smooth((p-.623)/(.662-.623)))));
 root.querySelectorAll('[data-score-meter]').forEach(e=>e.style.width=(52*evoE)+'%');
 const water=smooth((p-.466)/(.557-.466));
 root.querySelectorAll('[data-water-card]').forEach(e=>e.textContent=(2*water).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}));
 root.querySelectorAll('[data-water-meter]').forEach(e=>e.style.width=(74*water)+'%');
 window.MOVVA_MOTION_QA={visible,active,progress:p,cards:items.length,phone:{x:cx,y:cy,h:phoneH},mobile};
}
function reset(){root.style.display='none';}
window.MOVVA_MOTION={render,reset,get cards(){return items.length}};
})();
