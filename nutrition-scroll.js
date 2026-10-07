/* MOVVA · Stage 5. Bounded Nutrition presentation, 0.435 < p < 0.595.
 * The Stage 4 controller is delegated unchanged outside this interval.
 * No new render loop, scroll interception, dependencies or account-data access.
 */
(() => {
'use strict';
const stage=document.querySelector('#stage'), scene=document.querySelector('#nutrition');
const original=window.MOVVA_INTRO;
if(!stage||!scene||!original)return;
const copy=scene.querySelector('.copy'), steps=[...scene.querySelectorAll('.nutrition-chapters span')];
const readout=scene.querySelector('.nutrition-readout'), note=scene.querySelector('.micro-note');
const number=document.querySelector('#water-number'), fill=document.querySelector('#water-fill');
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const ramp=(p,a,b)=>ease((p-a)/(b-a));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const inside=p=>p>.435&&p<.595;
let slot=null,touched=false,lastColor=null;
const surface=document.createElement('div');surface.className='nutrition-surface';surface.setAttribute('aria-hidden','true');stage.insertBefore(surface,document.querySelector('#world'));
function measure(){
 const vw=stage.clientWidth,vh=stage.clientHeight;if(!vw||!vh)return;
 const tall=vw<=760,gutter=parseFloat(getComputedStyle(stage).getPropertyValue('--gutter'))||24;
 const header=document.querySelector('.header').offsetHeight,bar=document.querySelector('.chapter-bar');
 const bottom=vh-(bar.offsetHeight||32)-27;
 const top=tall?scene.offsetTop+copy.offsetTop+copy.offsetHeight+22:header+34;
 const x=tall?28:gutter+8,width=tall?vw-56:vw*.39;
 slot={x,y:top,width,height:Math.max(60,bottom-top),vw,vh,tall};
 surface.style.left=(x+width/2)+'px';surface.style.top=(top+(bottom-top)/2)+'px';
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
 const previous=original.fit(p,base,compose,hw,hh);
 if(!inside(p)||!slot)return previous;
 const w=ramp(p,.435,.466)*(1-ramp(p,.565,.595));
 const{x,y,width:sw,height:sh,vw,vh,tall}=slot,cx=x+sw/2,cy=y+sh/2;
 const orbit=ramp(p,.469,.553),ry=-.12+.32*orbit,rx=-.045+.025*orbit,rz=tall?-.025:-.028+.055*orbit;
 let pose=[cx/vw*2-1,1-cy/vh*2,Math.min(sh/(vh/(2*hh)*6.25),sw/(vw/(2*hw)*3.2)),rx,ry,rz];
 for(let i=0;i<3;i++){
  const r=bounds(pose,compose,hw,hh);
  pose[0]+=(cx-(r.left+r.right)/2)/(vw/2);pose[1]-=(cy-(r.top+r.bottom)/2)/(vh/2);
  pose[2]*=Math.min(sw*.94/(r.right-r.left),sh*.94/(r.bottom-r.top),1.02);
 }
 return mix(previous,pose,w);
}
function background(p,base){
 const previous=original.background(p,base);if(!inside(p)){lastColor=null;return previous;}
 const t=ramp(p,.435,.46)*(1-ramp(p,.567,.595));
 lastColor=mix(previous,[242,233,217],t).map(Math.round);return lastColor;
}
function panel(p,chapter,base){
 const previous=original.panel(p,chapter,base);
 if(!inside(p)||chapter!==3)return previous;
 const target=slot&&slot.vw>=1100?ramp(p,.495,.527)*(1-ramp(p,.551,.580))*.79:0;
 const weight=ramp(p,.435,.456)*(1-ramp(p,.577,.595));
 return previous+(target-previous)*weight;
}
function reset(){
 stage.classList.remove('nutrition-active');
 if(!touched)return;touched=false;
 stage.style.removeProperty('--nutrition-presence');stage.style.removeProperty('--nutrition-orbit');
 [...steps,readout,note].forEach(el=>{el.style.removeProperty('opacity');el.style.removeProperty('transform');});
}
function visual(p){
 original.visual(p);if(!inside(p)){reset();return;}
 touched=true;stage.classList.add('nutrition-active');
 const presence=ramp(p,.442,.47)*(1-ramp(p,.565,.595));
 stage.style.setProperty('--nutrition-presence',presence.toFixed(5));
 stage.style.setProperty('--nutrition-orbit',ramp(p,.46,.57).toFixed(5));
 if(lastColor){const dark=lastColor.reduce((s,v)=>s+v,0)/3<120;stage.classList.toggle('dark',dark);document.querySelector('.header').classList.toggle('dark',dark);}
 steps.forEach((el,i)=>{const t=ramp(p,.463+i*.009,.487+i*.009);el.style.opacity=String(.45+.55*t);el.style.transform=`translateY(${(1-t)*5}px)`;});
 const reveal=ramp(p,.474,.494);readout.style.opacity=String(reveal);readout.style.transform=`translateY(${(1-reveal)*8}px)`;
 const progress=ramp(p,.491,.549);
 number.textContent=(2*progress).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
 fill.style.width=(progress*100*2/2.7)+'%';
 note.style.opacity=String(ramp(p,.507,.528));
}
window.MOVVA_NUTRITION={measure,fit,background,panel,visual,reset,get layout(){return slot?{...slot}:null},scope:[.435,.595]};
window.MOVVA_INTRO=Object.assign(Object.create(original),{
 measure(){original.measure();measure();},fit,background,panel,visual,
 reset(){original.reset();reset();}
});
const observer=new ResizeObserver(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});observer.observe(copy);
document.fonts?.ready.then(()=>{measure();window.dispatchEvent(new Event('movva:hero-layout'));});
})();
