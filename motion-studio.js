/* MOVVA Motion Studio: declarative 3D interface fragments, driven solely by native scroll. */
(()=>{'use strict';
const stage=document.getElementById('stage'),rig=document.getElementById('css3d-device');
if(!stage)return;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const root=document.createElement('div');
root.className='motion-studio';root.setAttribute('aria-hidden','true');
root.innerHTML='<div class="motion-atmosphere"><i class="m-orbit"></i><i class="m-orbit"></i><i class="m-orbit"></i></div>';
stage.appendChild(root);
const ring=root.querySelector('.motion-atmosphere');
// Normalised UV origins measured against the actual five MOVVA screenshot
// assets (320x696 and 480x1043). A card must leave the part of the screen
// representing its content, not a synthetic point near the phone's centre.
const screenOrigins={
 '0:activity':{screen:'home',u:.24,v:.59,label:'Atividade da semana'},
 '0:wellness':{screen:'home',u:.74,v:.59,label:'Wellness Score'},
 '1:features':{screen:'home',u:.43,v:.34,label:'Visao geral da Home'},
 '1:wellness':{screen:'home',u:.74,v:.59,label:'Wellness Score na Home'},
 '2:training':{screen:'training',u:.42,v:.15,label:'Programa de treino'},
 '2:run':{screen:'training',u:.43,v:.59,label:'Modalidade corrida'},
 '3:nutrition':{screen:'nutrition',u:.30,v:.25,label:'Resumo calorico'},
 '3:water':{screen:'nutrition',u:.50,v:.79,label:'Hidratacao'},
 '4:graph':{screen:'evolution',u:.49,v:.42,label:'Grafico de atividades'},
 '4:evo-score':{screen:'evolution',u:.24,v:.70,label:'Wellness Score'},
 '5:circle':{screen:'circle',u:.52,v:.26,label:'Atividade da comunidade'},
 '5:features':{screen:'circle',u:.69,v:.49,label:'Participantes do Circle'}
};
const items=[{"scene":0,"kind":"activity","side":-1,"level":-0.26,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 16V9m6 7V5m6 11v-7m4 7V3\"/></svg></span> Atividade da semana</div><strong>6 <small>de 7</small></strong><span class=\"subline\">dias ativos</span><div class=\"m-week\"><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"\">✓</i><i class=\"off\">·</i><i class=\"\">✓</i><i class=\"\">✓</i></div>"},{"scene":0,"kind":"wellness","side":1,"level":0.26,"delay":0.009,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Wellness Score</div><strong>52<small>/100</small></strong><span class=\"subline\">score parcial</span><div class=\"m-multi-meter\">Mov. <i><b style=\"width:100%\"></b></i>Nut. <i><b style=\"width:20%\"></b></i>Água <i><b style=\"width:37%\"></b></i></div>"},{"scene":1,"kind":"features","side":-1,"level":-0.19,"delay":0,"content":"<div class=\"fragment-eyebrow\">Tudo conectado</div><h3>Seu movimento, em conjunto.</h3><div class=\"m-pill-row\"><em>Treinos</em><em>Nutrição</em><em>Hábitos</em></div>"},{"scene":1,"kind":"wellness","side":1,"level":0.28,"delay":0.014,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Bem-estar</div><strong>4 <small>pilares</small></strong><span class=\"subline\">Uma mesma jornada.</span>"},{"scene":2,"kind":"training","side":-1,"level":-0.25,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 10v4m3-7v10m3-5h6m3-5v10m3-7v4\"/></svg></span> Training</div><h3>ABCD – MM</h3><span class=\"subline\">4 treinos · 21 exercícios</span><div class=\"m-pill-row\"><em>Força</em><em>Corrida</em><em>Bike</em></div>"},{"scene":2,"kind":"run","side":1,"level":0.28,"delay":0.018,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"13\" cy=\"4.3\" r=\"1.7\"/><path d=\"m11 8 3 2 3-1m-9 10 3-5 2-2 3 4m-5-8-4 3\"/></svg></span> Corrida</div><strong>28 <small>km</small></strong><span class=\"subline\">168 minutos registrados</span>"},{"scene":3,"kind":"nutrition","side":-1,"level":-0.22,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 3v8m3-8v8M3 3v5a4 4 0 0 0 7 0V3m-3 8v10M18 3c-3 3-4 7-4 10h4v8\"/></svg></span> Nutrição</div><strong><span data-nut-count>2.018</span><small> /2.331 kcal</small></strong><div class=\"m-meter\"><i style=\"width:86%\"></i></div><div class=\"m-nut-rings\"><span class=\"nr\"><i data-value=\"89%\" style=\"--ring-color:#da9737;--value:320deg\"></i>Carb.</span><span class=\"nr\"><i data-value=\"56%\" style=\"--ring-color:#bba987;--value:202deg\"></i>Prot.</span><span class=\"nr\"><i data-value=\"100%\" style=\"--ring-color:#c98283;--value:360deg\"></i>Gord.</span></div>"},{"scene":3,"kind":"water","side":1,"level":0.29,"delay":0.019,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z\"/></svg></span> Hidratação</div><strong><span data-water-card>2,0</span><small> /2,7 L</small></strong><span class=\"subline\">Água registrada</span><div class=\"m-meter m-blue\"><i data-water-meter style=\"width:74%\"></i></div>"},{"scene":4,"kind":"graph","side":-1,"level":-0.24,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m3 18 6-7 4 3 8-9M16 5h5v5\"/></svg></span> Sua evolução</div><strong><span data-minutes-card>425</span><small> min</small></strong><svg class=\"graph-svg\" viewBox=\"0 0 220 80\" aria-hidden=\"true\"><path class=\"axis\" d=\"M1 68 H218\"/><path class=\"trace\" d=\"M2 62 C30 44 42 66 68 45 S98 58 130 37 S176 61 217 11\"/></svg>"},{"scene":4,"kind":"evo-score","side":1,"level":0.29,"delay":0.018,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m12 6 1.5 5.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-.5z\"/></svg></span> Wellness Score</div><strong><span data-score-card>52</span><small>/100</small></strong><span class=\"subline\">Seu panorama · parcial</span><div class=\"m-meter m-mint\"><i data-score-meter style=\"width:52%\"></i></div>"},{"scene":5,"kind":"circle","side":-1,"level":-0.2,"delay":0,"content":"<div class=\"fragment-eyebrow\"><span class=\"m-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"8\" cy=\"8\" r=\"3\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M2 20a6 6 0 0 1 12 0m0 0a5 5 0 0 1 8 0\"/></svg></span> Circle</div><strong>1 <small>dia juntos</small></strong><span class=\"subline\">Movimento gera movimento.</span><div class=\"m-circle-dots\"><i></i><i></i><i></i></div>"},{"scene":5,"kind":"features","side":1,"level":0.28,"delay":0.018,"content":"<div class=\"fragment-eyebrow\">Seu espaço</div><strong>2–5 <small>pessoas</small></strong><span class=\"subline\">Consistência compartilhada</span>"}].map((c,i)=>{
 const n=document.createElement('div');
 n.className='motion-fragment';
 n.dataset.kind=c.kind;n.dataset.scene=String(c.scene);
 n.innerHTML=c.content;root.appendChild(n);
 return {...c,el:n,index:i,width:0,source:screenOrigins[c.scene+':'+c.kind]};
});
const phases=[[0,0.126],[0.128,0.278],[0.29,0.433],[0.435,0.595],[0.598,0.775],[0.778,0.937]];
// Cache intrinsic dimensions per viewport instead of forcing a layout read
// after writing card transforms on every scroll frame.
const layout={w:NaN,h:NaN,measurements:0};
const dynamic={
 score:[...root.querySelectorAll('[data-score-card]')],
 minutes:[...root.querySelectorAll('[data-minutes-card]')],
 scoreMeter:[...root.querySelectorAll('[data-score-meter]')],
 water:[...root.querySelectorAll('[data-water-card]')],
 waterMeter:[...root.querySelectorAll('[data-water-meter]')]
};
let lastGraph='';
const updateText=(elements,value)=>elements.forEach(el=>{if(el.textContent!==value)el.textContent=value;});
const updateWidth=(elements,value)=>elements.forEach(el=>{if(el.style.width!==value)el.style.width=value;});
function measureCards(w,h){
 if(layout.w===w&&layout.h===h)return;
 layout.w=w;layout.h=h;layout.measurements++;
 for(const item of items){
  item.width=item.el.offsetWidth||192;
  item.height=item.el.offsetHeight||106;
 }
}
document.fonts?.ready?.then(()=>{layout.w=NaN;});
document.fonts?.addEventListener?.('loadingdone',()=>{layout.w=NaN;});
// A deterministic, viewport-aware guard. Keep decorative fragments clear of
// live chapter copy (including hero actions) without breaking scroll reversal.
function protectCopy(x,y,w,h,copyRect,stageRect,limits){
 if(!copyRect)return {x,y,hidden:false};
 const left=copyRect.left-stageRect.left,right=copyRect.right-stageRect.left;
 const top=copyRect.top-stageRect.top,bottom=copyRect.bottom-stageRect.top;
 const pad=12;
 const collision=x+w/2>left-pad&&x-w/2<right+pad&&
                 y+h/2>top-pad&&y-h/2<bottom+pad;
 if(!collision)return{x,y,hidden:false};
 const candidates=[right+pad+w/2,left-pad-w/2]
  .filter(v=>v>=limits.left&&v<=limits.right)
  .sort((a,b)=>Math.abs(a-x)-Math.abs(b-x));
 if(candidates.length)return{x:candidates[0],y,hidden:false};
 const vertical=[bottom+pad+h/2,top-pad-h/2]
  .filter(v=>v>=limits.top&&v<=limits.bottom)
  .sort((a,b)=>Math.abs(a-y)-Math.abs(b-y));
 if(vertical.length)return{x,y:vertical[0],hidden:false};
 return{x,y,hidden:true};
}
function render(p,active,device){
 if(!document.documentElement.classList.contains('enhanced')){root.style.display='none';return;}
 root.style.display='';
 // This layout snapshot was measured before the 3D frame mutated transforms.
  const cached=window.MOVVA_DOM_DEVICE?.layout;
  const vw=cached?.width||stage.clientWidth,vh=cached?.height||stage.clientHeight,mobile=vw<=760;
 measureCards(vw,vh);
 let cx=vw*.5,cy=vh*.5,phoneH=430;
 if(rig&&document.documentElement.classList.contains('dom-device')){
  cx=parseFloat(rig.style.left)||vw*.5;
  cy=parseFloat(rig.style.top)||vh*.70;
  phoneH=window.MOVVA_DOM_DEVICE?.visualSize?.h||parseFloat(rig.style.height)||360;
 }else if(device){
  cx=vw*(device.nx+1)/2;
  cy=vh*(1-device.ny)/2;
  phoneH=Math.max(240,device.scale*(vh/(2*(14*Math.tan(Math.PI*32/360))))*6.0);
 }
 if(!mobile){
  ring.style.left=cx+'px';ring.style.top=cy+'px';ring.style.opacity='.46';
  ring.style.transform='translate(-50%,-50%) rotate('+(p*168).toFixed(2)+'deg) scale(1.04)';
 }
 // Every fragment is evaluated from scroll progress alone; reversing scroll
 // retraces exactly the same 3D path, with no time-based drift or autoplay.
 const fragmentSide=mobile?Math.min(vw*.345,130):Math.min(vw*.145,205);
 const phoneW=phoneH*(78/163.4);
 const leftGuard=mobile?(vw<=360?10:12):22;
 const stageRect=mobile?null:stage.getBoundingClientRect();
 const navRect=mobile?null:stage.querySelector('.chapter-bar')?.getBoundingClientRect();
 const navY=mobile?(cached?.barTop??vh-48):(navRect?navRect.top-stageRect.top:vh-48);
 const copyRect=mobile?null:stage.querySelector('.scene[aria-hidden="false"] .copy')?.getBoundingClientRect();
 const copyBottom=mobile?(cached?.sceneBottom?.[active]??0):(copyRect?.bottom-stageRect.top||0);
 let visible=0,protectedCards=0;
 for(const c of items){
  const [start,end]=phases[c.scene],time=(p-start)/(end-start),delay=c.delay;
  const arrive=c.scene===0?1:smooth((time-.035-delay)/.18);
  const leave=1-smooth((time-.73)/.26);
  const raw=clamp(arrive*leave);
  const sceneVisible=c.scene===active||raw>.005;
  const local=clamp(time);
  const amplitude=c.scene===0?clamp(1-smooth((p-.079)/.055)):(raw);
  const factor=amplitude;
  if(!sceneVisible||factor<.003){
   if(c.el.dataset.active==='1'){c.el.classList.remove('is-active');c.el.dataset.active='0';}
   c.el.style.opacity='0';c.el.style.visibility='hidden';continue;
  }
  if(c.el.dataset.active!=='1'){c.el.classList.add('is-active');c.el.dataset.active='1';}
  c.el.style.visibility='visible';
  // 6A: UI fragments originate from compact anchors inside the device
  // silhouette, then lift and unfold into the editorial layout. The exit
  // retraces the same path when scrolling upwards. The back-facing Connected
  // scene releases from the rear-glass silhouette; front scenes use the display.
  const release=smooth(factor);
  const extraction=c.scene===0?smooth((p-.012)/.078):smooth((factor-.065)/.855);
  const screenPoint=window.MOVVA_DOM_DEVICE?.projectScreenPoint(c.source?.u??.5,c.source?.v??.5);
  const anchorX=screenPoint?.x??(cx+c.side*phoneW*.13);
  const anchorY=screenPoint?.y??(cy+phoneH*c.level*.15);
  const offX=c.side*fragmentSide*(mobile?1:1.0);
  const offY=phoneH*c.level*(mobile?.70:.85);
  const orbit=Math.sin((local+.07*c.index)*Math.PI*2);
  const elWidth=c.width|| (mobile?132:190);
  const keepLeft=elWidth*.78+leftGuard,keepRight=vw-elWidth*.78-leftGuard;
  let px=clamp(cx+offX*factor+orbit*(mobile?1.5:3.5),keepLeft,keepRight);
  let py=cy+offY*factor+(1-factor)*(c.level<0?40:-35);
  // Keep the chapter navigation and the hero CTA accessible.
  const roomTop=mobile?Math.max(copyBottom+16,vh*.25):Math.max(80,vh*.11);
  const lower=navY-(mobile?13:18);
  const elHeight=c.height||80;
  py=clamp(py,roomTop+elHeight*.5,Math.max(roomTop+elHeight*.5,lower-elHeight*.5));
  const destinationScale=mobile?.58+.42*factor:.53+.47*factor;
  const scale=.16+(destinationScale-.16)*extraction;
  // Physical card depth follows the same strictly scroll-derived progress:
  // screen plane -> lifted, slightly pitched glass. No autoplay.
  const depth=-38+148*release*extraction;
  const perspectiveGain=1400/(1400-Math.max(0,depth));
  // Blend from a stable point on the handset to the safe, copy-protected
  // destination. This prevents cards materialising already detached in space.
  px=lerp(anchorX,px,extraction);
  py=lerp(anchorY,py,extraction);
  if(!mobile&&extraction>.78){
   // Include perspective/rotation headroom; fixes overlaps at ~880px laptops.
   const projected=scale*perspectiveGain;
   const protectedPos=protectCopy(px,py,elWidth*projected*1.16,elHeight*projected*1.2,
    copyRect,stageRect,{left:keepLeft,right:keepRight,
     top:roomTop+elHeight*scale*.58,bottom:lower-elHeight*scale*.58});
   if(protectedPos.hidden){c.el.style.opacity='0';c.el.style.visibility='hidden';continue;}
   if(Math.abs(protectedPos.x-px)>.5||Math.abs(protectedPos.y-py)>.5)protectedCards++;
   px=protectedPos.x;py=protectedPos.y;
  }
  const tilt=c.side*(mobile?-5:-10)+(1-factor)*c.side*18+orbit*(mobile?1.2:2)+c.side*(1-extraction)*54;
  const pitch=(c.level<0?-1:1)*(1-factor)*6+1.2*Math.sin(local*Math.PI);
  const roll=c.side*1.8+orbit*1.15;
  const opacity=Math.min(.98,(c.scene===0?.94:.98)*smooth((factor-.04)/.86)*smooth((extraction-.02)/.60));
  c.el.style.left=px.toFixed(2)+'px';c.el.style.top=py.toFixed(2)+'px';
  c.el.style.opacity=String(opacity);
  c.el.style.setProperty('--movva-card-depth',depth.toFixed(2));
  c.el.style.setProperty('--movva-extraction',extraction.toFixed(4));
  c.el.style.setProperty('--movva-anchor-x',anchorX.toFixed(2)+'px');
  c.el.style.setProperty('--movva-anchor-y',anchorY.toFixed(2)+'px');
  c.el.dataset.sourceScreen=c.source?.screen||'';
  c.el.dataset.sourceLabel=c.source?.label||'';
  c.el.style.transform='translate(-50%,-50%) translateZ('+depth.toFixed(2)+'px) rotateY('+(tilt*(1-factor*.32)).toFixed(2)+'deg) rotateX('+pitch.toFixed(2)+'deg) rotateZ('+roll.toFixed(2)+'deg) scale('+scale.toFixed(4)+')';
  visible++;
 }
 const evo=clamp((p-.674)/(.730-.674));
 const evoE=smooth(evo),graph=evoE.toFixed(4);
 if(graph!==lastGraph){root.style.setProperty('--graph-progress',graph);lastGraph=graph;}
 updateText(dynamic.score,String(Math.round(52*evoE)));
 updateText(dynamic.minutes,String(Math.round(425*smooth((p-.623)/(.662-.623)))));
 updateWidth(dynamic.scoreMeter,(52*evoE)+'%');
 const water=smooth((p-.466)/(.557-.466));
 updateText(dynamic.water,(2*water).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}));
 updateWidth(dynamic.waterMeter,(74*water)+'%');
 window.MOVVA_MOTION_QA={visible,protectedCards,active,progress:p,cards:items.length,extractionEnabled:true,phone:{x:cx,y:cy,h:phoneH},mobile,
  layoutMeasurements:layout.measurements};
}
function reset(){root.style.display='none';}
window.MOVVA_MOTION={render,reset,get cards(){return items.length},get origins(){return items.map(c=>({scene:c.scene,kind:c.kind,...c.source}))}};
})();
