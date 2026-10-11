/* MOVVA Wellness — Stage 6B: scroll-scrubbed editorial choreography.
 * One render clock from experience.js; no independent animation loops or timers.
 * All demo data stays sourced from the existing static MOVVA presentation. */
(()=>{'use strict';
const stage=document.getElementById('stage');
const nutrition=document.querySelector('.motion-fragment[data-kind="nutrition"]');
const graph=document.querySelector('.motion-fragment[data-kind="graph"] .graph-svg');
const orbit=document.querySelector('.circle-orbit');
if(!stage)return;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const ramp=(v,a,b)=>smooth((v-a)/(b-a));
const chapters=[
 {id:'start',a:0,b:.01,stagger:.008},
 {id:'connected',a:.137,b:.168,stagger:.008},
 {id:'training',a:.292,b:.326,stagger:.009},
 {id:'nutrition',a:.446,b:.481,stagger:.009},
 {id:'evolution',a:.605,b:.640,stagger:.009},
 {id:'circle',a:.791,b:.827,stagger:.009},
 {id:'rhythm',a:.940,b:.976,stagger:.010}
];
const phrases=[];
for(const ch of chapters){
 const heading=document.querySelector('#'+ch.id+' .copy > h1, #'+ch.id+' .copy > h2');
 ch.lines=[];
 if(!heading)continue;
 // Wrap only bare heading text. Existing span/em elements retain their native
 // display rules and the <br> lines remain in precisely their original place.
 for(const node of [...heading.childNodes]){
  if(node.nodeType===3 && node.textContent.trim()){
   const wrapper=document.createElement('i');
   wrapper.className='movva-editorial-line movva-editorial-text';
   wrapper.textContent=node.textContent;
   heading.replaceChild(wrapper,node);
   ch.lines.push(wrapper);
  }else if(node.nodeType===1&&node.tagName!=='BR'){
   node.classList.add('movva-editorial-line');
   ch.lines.push(node);
  }
 }
 heading.classList.add('movva-editorial-heading');
 phrases.push(...ch.lines);
}
// Animated Nutrition visualization is decorative; canonical kcal totals stay
// exactly as written in the demo. Use already-existing ring and meter markup.
const rings=nutrition?[...nutrition.querySelectorAll('.m-nut-rings .nr i')]:[];
const amounts=rings.map(el=>parseFloat(el.style.getPropertyValue('--value'))||0);
const nutrientMeter=nutrition?.querySelector('.m-meter i');
const meterFull=nutrientMeter?(parseFloat(nutrientMeter.style.width)||86):86;
// The graph stroke is already scroll-controlled. Add a small marker that
// follows the real SVG path, without introducing another animation loop.
const trace=graph?.querySelector('.trace');
let marker=null;
let graphCoordinates=[];
if(trace){
 const total=trace.getTotalLength();
 graphCoordinates=Array.from({length:101},(_,i)=>{
  const pt=trace.getPointAtLength(total*i/100);
  return{x:pt.x,y:pt.y};
 });
 marker=document.createElementNS('http://www.w3.org/2000/svg','circle');
 marker.classList.add('movva-graph-marker');
 marker.setAttribute('r','3.2');
 marker.setAttribute('aria-hidden','true');
 graph.appendChild(marker);
}
// Four delicate paths physically connect the already existing Circle nodes.
const links=[];
if(orbit){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('movva-circle-connections');
 svg.setAttribute('viewBox','0 0 100 100');
 svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('aria-hidden','true');
 for(const [x,y] of [[6,29],[94,32],[18,95],[90,83]]){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.classList.add('movva-circle-connection');
  line.setAttribute('x1','51');line.setAttribute('y1','0');
  line.setAttribute('x2',String(x));line.setAttribute('y2',String(y));
  line.setAttribute('pathLength','1');
  svg.appendChild(line);links.push(line);
 }
 orbit.insertBefore(svg,orbit.firstChild);
}
const finale=document.querySelector('#rhythm h2');
if(finale)finale.classList.add('movva-finale-heading');
let lastProgress=null;
const updates={renders:0,headingWrites:0,dataWrites:0,circleWrites:0};
function render(p){
 if(!document.documentElement.classList.contains('enhanced'))return;
 p=clamp(p);
 if(lastProgress!==null&&Math.abs(lastProgress-p)<.00004)return;
 lastProgress=p;updates.renders++;
 for(const ch of chapters){
  for(const [i,line] of ch.lines.entries()){
   const t=ch.id==='start'?1:ramp(p,ch.a+i*ch.stagger,ch.b+i*ch.stagger);
   const value=t.toFixed(4);
   if(line.style.getPropertyValue('--movva-reveal')!==value){
    line.style.setProperty('--movva-reveal',value);updates.headingWrites++;
   }
  }
 }
 if(nutrition){
  const t=ramp(p,.456,.542);
  for(const [i,el] of rings.entries()){
   const value=(amounts[i]*ramp(t,.08*i,.72+.06*i)).toFixed(2)+'deg';
   if(el.style.getPropertyValue('--value')!==value){
    el.style.setProperty('--value',value);updates.dataWrites++;
   }
  }
  if(nutrientMeter){
   const width=(meterFull*t).toFixed(2)+'%';
   if(nutrientMeter.style.width!==width){
    nutrientMeter.style.width=width;updates.dataWrites++;
   }
  }
 }
 if(marker&&graphCoordinates.length){
  const t=ramp(p,.668,.737),v=t*100,low=Math.floor(v),high=Math.min(100,low+1);
  const a=graphCoordinates[low],b=graphCoordinates[high];
  const x=(a.x+(b.x-a.x)*(v-low)).toFixed(2);
  const y=(a.y+(b.y-a.y)*(v-low)).toFixed(2);
  const transform='translate('+x+'px,'+y+'px)';
  if(marker.style.transform!==transform){
   marker.style.transform=transform;updates.dataWrites++;
  }
  const opacity=ramp(p,.665,.695)*(1-ramp(p,.747,.777));
  marker.style.opacity=opacity.toFixed(3);
 }
 if(links.length){
  const t=ramp(p,.811,.875);
  for(const [i,line] of links.entries()){
   const strength=ramp(t,i*.085,.65+i*.08);
   const offset=(1-strength).toFixed(4);
   if(line.style.strokeDashoffset!==offset){
    line.style.strokeDashoffset=offset;updates.circleWrites++;
   }
  }
 }
 if(finale){
  const progress=ramp(p,.934,.985).toFixed(4);
  if(finale.style.getPropertyValue('--movva-finale-progress')!==progress){
   finale.style.setProperty('--movva-finale-progress',progress);
  }
 }
}
function reset(){
 lastProgress=null;
 for(const line of phrases)line.style.removeProperty('--movva-reveal');
 for(const [i,el] of rings.entries())el.style.setProperty('--value',amounts[i]+'deg');
 if(nutrientMeter)nutrientMeter.style.width=meterFull+'%';
 if(marker){marker.style.removeProperty('opacity');marker.style.removeProperty('transform');}
 for(const line of links)line.style.removeProperty('stroke-dashoffset');
 finale?.style.removeProperty('--movva-finale-progress');
}
window.MOVVA_CHAPTER_MOTION={render,reset,get metrics(){return {...updates}},get sections(){return chapters.map(c=>({id:c.id,lines:c.lines.length}))}};
})();