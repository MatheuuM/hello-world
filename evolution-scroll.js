/* MOVVA — Stage 6. Evolution only, 0.595 < progress < 0.775.
 * One native-scroll clock; real reference totals, never synthetic improvements.
 * Delegates the approved Stage 5/4 hooks unchanged outside this interval.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage'), scene=document.querySelector('#evolution');
const original=window.MOVVA_INTRO;if(!stage||!scene||!original)return;
const copy=scene.querySelector('.copy'), bars=[...scene.querySelectorAll('.activity-bar')];
const metrics=scene.querySelector('.evo-metrics'), note=scene.querySelector('.micro-note');
const status=scene.querySelector('.evo-status'), score=document.querySelector('#score-number');
const arc=document.querySelector('#score-arc'), total=document.querySelector('#activity-minutes');
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10);};
const ramp=(p,a,b)=>ease((p-a)/(b-a));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const inside=p=>p>.595&&p<.775;
const minutes=bars.map(b=>Number(b.dataset.minutes));
const maxMinutes=Math.max(...minutes),fullTotal=minutes.reduce((a,b)=>a+b,0);
let slot=null,touched=false;
const surface=document.createElement('div');surface.className='evolution-surface';surface.setAttribute('aria-hidden','true');stage.insertBefore(surface,document.querySelector('#world'));
function measure(){
 const vw=stage.clientWidth,vh=stage.clientHeight;if(!vw||!vh)return;
 const tall=vw<=760,gutter=parseFloat(getComputedStyle(stage).getPropertyValue('--gutter'))||24;
 const nav=document.querySelector('.header').offsetHeight,bar=document.querySelector('.chapter-bar');
 const bottom=vh-(bar.offsetHeight||32)-27;
 const y=tall?scene.offsetTop+copy.offsetTop+copy.offsetHeight+20:nav+33;
 const width=tall?vw-56:Math.min(vw*.385,vw-gutter*2),x=tall?28:vw-gutter-width;
 slot={x,y,width,height:Math.max(65,bottom-y),vw,vh,tall};
 surface.style.left=(x+width/2)+'px';surface.style.top=(y+(bottom-y)/2)+'px';
}
function bounds(pose,compose,hw,hh){
 const[nx,ny,s,rx,ry,rz]=pose,m=compose(nx*hw,ny*hh,0,rx,ry,rz,s),xs=[],ys=[];
 for(const x of [-1.45,1.45])for(const y of [-3.04,3.04])for(const z of [-.44,.27]){
  const tx=m[0]*x+m[4]*y+m[8]*z+m[12],ty=m[1]*x+m[5]*y+m[9]*z+m[13],tz=m[2]*x+m[6]*y+m[10]*z+m[14];
  xs.push((tx/(hw*(1-tz/14))+1)*slot.vw/2);ys.push((1-ty/(hh*(1-tz/14)))*slot.vh/2);
 }
 return{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
function fit(p,base,compose,hw,hh){
 const previous=original.fit(p,base,compose,hw,hh);if(!inside(p)||!slot)return previous;
 const weight=ramp(p,.595,.625)*(1-ramp(p,.741,.775));
 const {x,y,width:sw,height:sh,vw,vh,tall}=slot,cx=x+sw/2,cy=y+sh/2;
 const orbit=ramp(p,.630,.732),rx=-.05+.025*orbit,ry=-.24+.39*orbit,rz=tall?-.017:-.035+.058*orbit;
 // Keep a full revolution in the angular coordinates for a continuous hand-off.
 let pose=[cx/vw*2-1,1-cy/vh*2,Math.min(sh/(vh/(2*hh)*6.25),sw/(vw/(2*hw)*3.2)),rx,2*Math.PI+ry,rz];
 for(let i=0;i<3;i++){
  const r=bounds(pose,compose,hw,hh);
  pose[0]+=(cx-(r.left+r.right)/2)/(vw/2);pose[1]-=(cy-(r.top+r.bottom)/2)/(vh/2);
  pose[2]*=Math.min(sw*.94/(r.right-r.left),sh*.94/(r.bottom-r.top),1.02);
 }
 return mix(previous,pose,weight);
}
function background(p,base){
 const previous=original.background(p,base);if(!inside(p))return previous;
 const weight=ramp(p,.595,.626)*(1-ramp(p,.742,.775));
 return mix(previous,[227,234,220],weight).map(Math.round);
}
function panel(p,chapter,base){
 const previous=original.panel(p,chapter,base);if(!inside(p)||chapter!==4)return previous;
 const weight=ramp(p,.595,.62)*(1-ramp(p,.749,.775));
 // Only wide desktops get the extra real-UI layer; smaller screens retain clarity.
 const target=slot&&slot.vw>=1200?ramp(p,.688,.711)*(1-ramp(p,.730,.753))*.67:0;
 return previous+(target-previous)*weight;
}
function animateValues(p){
 let sum=0;
 bars.forEach((bar,i)=>{const v=minutes[i]*ramp(p,.626+i*.004,.651+i*.004),h=v/maxMinutes*78;sum+=v;bar.setAttribute('height',h.toFixed(4));bar.setAttribute('y',(88-h).toFixed(4));});
 total.textContent=String(Math.round(sum));
 const sp=ramp(p,.678,.728);score.textContent=String(Math.round(52*sp));arc.style.strokeDashoffset=(289.026*(1-.52*sp)).toFixed(5);
 // Decorative phases are hidden from assistive tech; source values remain readable.
 status.textContent=p<.678?'01 / SUA SEMANA, DIA A DIA':'02 / UMA VISÃO INTEGRADA';
 stage.style.setProperty('--evo-score-phase',sp.toFixed(5));
}
function reset(){
 stage.classList.remove('evolution-active');if(!touched)return;touched=false;
 ['--evolution-presence','--evolution-orbit','--evo-score-phase'].forEach(k=>stage.style.removeProperty(k));
 [metrics,note].forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});
 status.textContent='SUA SEMANA. MAIS CONTEXTO.';
}
function visual(p){
 original.visual(p);if(!inside(p)){reset();return;}
 touched=true;stage.classList.add('evolution-active');
 const presence=ramp(p,.605,.630)*(1-ramp(p,.738,.775));
 stage.style.setProperty('--evolution-presence',presence.toFixed(5));stage.style.setProperty('--evolution-orbit',ramp(p,.626,.742).toFixed(5));
 const reveal=ramp(p,.616,.637);metrics.style.opacity=String(reveal);metrics.style.transform=`translateY(${(1-reveal)*7}px)`;
 note.style.opacity=String(ramp(p,.63,.646));animateValues(p);
}
window.MOVVA_EVOLUTION={measure,fit,background,panel,visual,reset,scope:[.595,.775],reference:{score:52,partial:true,minutes:[...minutes],total:fullTotal},get layout(){return slot?{...slot}:null}};
window.MOVVA_INTRO=Object.assign(Object.create(original),{
 measure(){original.measure();measure();},fit,background,panel,visual,
 reset(){original.reset();reset();}
});
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});observer.observe(copy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
