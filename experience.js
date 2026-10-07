/* MOVVA Studio · 3D scroll experience. No external runtime dependencies.
 * Actual triangulated hardware, perspective projection, depth testing and
 * direction-dependent lighting. Screens are supplied app captures, not fake UI.
 * Native scroll is never intercepted. No analytics, forms or app-data access.
 */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const root=document.documentElement, canvas=$('#world'), stage=$('#stage'), experience=$('#experience');
const media=matchMedia('(prefers-reduced-motion: reduce)'), motion=$('#motion');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const range=(p,a,b)=>smooth((p-a)/(b-a));
const windows=[[0,.13],[.125,.275],[.27,.435],[.43,.595],[.59,.775],[.77,.935],[.93,1.05]];
const names=['SEU RITMO','TUDO CONECTADO','TRAINING','NUTRITION','EVOLUTION','CIRCLE','MOVVA'];
const scenes=$$('.scene'), dots=$$('.chapter-dots a');
let enabled=false, ready=false, disposed=false, raf=0, lastTime=0, position=0, target=0, width=0,height=0, mobile=false;
let pointer=[0,0], pointerTarget=[0,0], idle=0, gl=null;
let userMotion=true;
try { userMotion=sessionStorage.getItem('movva-motion')!=='off'; } catch(_){}
const mat={
 identity:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
 mul:(a,b)=>{const m=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;},
 translation:(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1],
 scale:s=>[s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1],
 rx:a=>{const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]},
 ry:a=>{const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]},
 rz:a=>{const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]},
 perspective:(f,a,n,z)=>{const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0]}
};
const mm=mat.mul;
function compose(x,y,z,rx=0,ry=0,rz=0,s=1){return mm(mat.translation(x,y,z),mm(mat.rz(rz),mm(mat.ry(ry),mm(mat.rx(rx),mat.scale(s)))));}
const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;
uniform mat4 uModel;uniform mat4 uViewProjection;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;
void main(){vec4 p=uModel*vec4(aPosition,1.);vPosition=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);vUV=aUV;gl_Position=uViewProjection*p;}`;
const fragment=`precision mediump float;
varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;
uniform vec3 uColor;uniform float uMetal;uniform float uShine;uniform float uMode;uniform float uMix;uniform vec4 uRect;
uniform sampler2D uTextureA;uniform sampler2D uTextureB;uniform float uDark;
void main(){
 vec3 N=normalize(vNormal),V=normalize(vec3(0.,0.,14.)-vPosition);
 vec3 L1=normalize(vec3(-5.,8.,10.)-vPosition),L2=normalize(vec3(6.,2.,7.)-vPosition),L3=normalize(vec3(-4.,-2.,-6.)-vPosition);
 vec3 R=reflect(-V,N);float fr=pow(1.-abs(dot(N,V)),3.);
 float d1=max(dot(N,L1),0.),d2=max(dot(N,L2),0.),d3=max(dot(N,L3),0.);
 float s1=pow(max(dot(N,normalize(L1+V)),0.),uShine),s2=pow(max(dot(N,normalize(L2+V)),0.),uShine*.5);
 float strip=pow(max(dot(R,normalize(vec3(-.65,.7,.15))),0.),22.)+pow(max(dot(R,normalize(vec3(.9,-.3,.1))),0.),32.);
 vec3 metal=vec3(.20,.21,.18)+vec3(.72,.70,.61)*smoothstep(-.45,.8,R.y)+vec3(.8,.78,.69)*strip;
 vec3 c=uColor*(.27+.52*d1+.24*d2+.18*d3);
 c=mix(c,c*.55+metal*uColor*.78,uMetal)+vec3(1.,.96,.85)*(s1*.62+s2*.35)*(uMetal*.8+.1)+fr*.10;
 if(uMode>.5&&uMode<1.5){vec2 uv=uRect.xy+vUV*uRect.zw;vec3 a=texture2D(uTextureA,uv).rgb;vec3 b=texture2D(uTextureB,uv).rgb;
 float wipe=smoothstep(uMix*1.5-.28,uMix*1.5+.12,1.-vUV.y);
 float blend=uMix<.001?0.:(uMix>.999?1.:1.-wipe);
 c=mix(a,b,blend);c=mix(c,vec3(1.,.99,.95),clamp((s1+s2)*.035+fr*.016,0.,.12));
 }
 if(uMode>1.5){if(texture2D(uTextureA,vUV).a<.08)discard;c*=.69;}
 gl_FragColor=vec4(c,1.);
}`;
let program, uniforms, attribs, viewProjection, meshes=[], panels=[], textures={}, drawCalls=0;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function makeProgram(){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
function contour(w,h,r,n=14){const out=[];[[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]].forEach(([x,y,a])=>{for(let j=0;j<=n;j++){const t=a+j/n*Math.PI/2;out.push([x+r*Math.cos(t),y+r*Math.sin(t),Math.cos(t),Math.sin(t)]);}});return out;}
function geometry(vertices){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);return{buffer,count:vertices.length/8};}
function box(w,h,d,r,bevel=.025){
 const out=[],bb=Math.min(bevel,d/3), layers=[[-d/2,w-bb*2,h-bb*2,Math.max(.001,r-bb),-1],[-d/2+bb,w,h,r,0],[d/2-bb,w,h,r,0],[d/2,w-bb*2,h-bb*2,Math.max(.001,r-bb),1]];
 const vs=(p,z,nx,ny,nz)=>[p[0],p[1],z,nx,ny,nz,p[0]/w+.5,p[1]/h+.5];
 for(let k=0;k<3;k++){const a=layers[k],b=layers[k+1],ca=contour(a[1],a[2],a[3]),cb=contour(b[1],b[2],b[3]);
 for(let i=0;i<ca.length;i++){let j=(i+1)%ca.length,nz=k===0?-.6:k===2?.6:0,xy=Math.sqrt(1-nz*nz);const v1=vs(ca[i],a[0],ca[i][2]*xy,ca[i][3]*xy,nz),v2=vs(ca[j],a[0],ca[j][2]*xy,ca[j][3]*xy,nz),v3=vs(cb[j],b[0],cb[j][2]*xy,cb[j][3]*xy,nz),v4=vs(cb[i],b[0],cb[i][2]*xy,cb[i][3]*xy,nz);out.push(...v1,...v2,...v3,...v1,...v3,...v4);}}
 for(const k of [0,3]){const layer=layers[k],c=contour(layer[1],layer[2],layer[3]),nz=k===0?-1:1;for(let i=0;i<c.length;i++){const j=(i+1)%c.length;out.push(0,0,layer[0],0,0,nz,.5,.5,...vs(c[i],layer[0],0,0,nz),...vs(c[j],layer[0],0,0,nz));}}
 return geometry(out);
}
function face(w,h,r){const c=contour(w,h,r,18),out=[];const v=p=>[p[0],p[1],0,0,0,1,p[0]/w+.5,p[1]/h+.5];for(let i=0;i<c.length;i++){out.push(0,0,0,0,0,1,.5,.5,...v(c[i]),...v(c[(i+1)%c.length]));}return geometry(out);}
function cylinder(r,d,n=42){const out=[];for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
 const va=[r*ca,r*sa,-d/2,ca,sa,0,0,0],vb=[r*cb,r*sb,-d/2,cb,sb,0,1,0],vc=[r*cb,r*sb,d/2,cb,sb,0,1,1],vd=[r*ca,r*sa,d/2,ca,sa,0,0,1];out.push(...va,...vb,...vc,...va,...vc,...vd);
 for(const z of [-d/2,d/2]){const nz=z<0?-1:1;out.push(0,0,z,0,0,nz,.5,.5,r*ca,r*sa,z,0,0,nz,ca*.5+.5,sa*.5+.5,r*cb,r*sb,z,0,0,nz,cb*.5+.5,sb*.5+.5);}}
 return geometry(out);
}
function object(geom,color,position=[0,0,0],metal=.0,shine=60,rotation=[0,0,0]){const o={geom,color,metal,shine,local:compose(...position,...rotation),mode:0,rect:[0,0,1,1]};meshes.push(o);return o;}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Asset unavailable: '+url));image.src=url;});}
function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
let screenMesh, backLogo;
async function build(){
 gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL unavailable');
 program=makeProgram();gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 attribs={};['aPosition','aNormal','aUV'].forEach(n=>attribs[n]=gl.getAttribLocation(program,n));
 uniforms={};['uModel','uViewProjection','uColor','uMetal','uShine','uMode','uMix','uRect','uTextureA','uTextureB','uDark'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
 const assetNames=['home','training','nutrition','evolution','circle'];
 await Promise.all(assetNames.map(async name=>{const image=await loadImage('/assets/'+name+'.webp');textures[name]=texture(image);}));
 object(box(2.80,6.00,.30,.38),[.65,.65,.59],[0,0,0],.95,95);
 object(box(2.715,5.915,.085,.35,.013),[.51,.51,.45],[0,0,-.15],.4,75);
 object(box(2.752,5.952,.045,.36,.007),[.065,.073,.057],[0,0,.158],.5,95);
 screenMesh=object(face(2.635,5.824,.31),[1,1,1],[0,0,.185]);screenMesh.mode=1;
 object(box(.72,.173,.027,.085,.006),[.018,.022,.014],[0,2.657,.205],.2,110);
 object(cylinder(.036,.013),[.040,.077,.078],[.25,2.657,.226],.8,150);
 object(cylinder(.016,.008),[.022,.041,.05],[.25,2.657,.235],.6,180);
 object(box(.64,.030,.014,.014,.003),[.22,.23,.19],[0,2.91,.191],.3,80);
 // Rear camera platform: actual layered volume, three metallic lens barrels.
 object(box(1.285,1.41,.095,.28,.012),[.48,.49,.425],[-.60,2.12,-.23],.75,90);
 [[-.94,2.48],[-.35,2.20],[-.94,1.88]].forEach(([x,y])=>{
  object(cylinder(.246,.103),[.42,.45,.39],[x,y,-.303],.98,145);
  object(cylinder(.219,.110),[.042,.045,.035],[x,y,-.316],.6,135);
  object(cylinder(.18,.008),[.040,.071,.070],[x,y,-.377],.78,190);
  object(cylinder(.091,.009),[.026,.037,.045],[x,y,-.384],.4,190);
  object(cylinder(.035,.007),[.082,.11,.12],[x-.047,y+.065,-.391],.45,170);
 });
 object(cylinder(.065,.030),[.90,.88,.73],[-.35,2.65,-.303],.15,40);
 object(cylinder(.05,.018),[.061,.068,.047],[-.35,1.78,-.291],.4,100);
 // Side buttons, antenna lines and a recessed port make the silhouette volumetric.
 object(box(.036,.56,.11,.015,.004),[.54,.55,.48],[1.405,1.04,0],.9,100);
 [-.02,.58].forEach(y=>object(box(.036,.42,.1,.015,.004),[.53,.54,.46],[-1.405,y+.54,0],.9,100));
 object(box(.036,.20,.1,.014,.004),[.52,.54,.48],[-1.405,1.64,0],.9,100);
 for(const y of [-2.30,2.27])for(const x of [-1.399,1.399])object(box(.012,.035,.235,.005,.001),[.33,.35,.30],[x,y,0],.08,40);
 object(box(.44,.027,.105,.012,.004),[.018,.023,.012],[0,-3.001,0],.1,80);
 for(const x of [-.78,-.66,-.54,.54,.66,.78])object(cylinder(.025,.015,16),[.025,.031,.023],[x,-3.008,0],.05,40,[Math.PI/2,0,0]);
 // A small brand mark on the back, using the supplied outline.
 try{const image=await loadImage('/assets/movva.svg');const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.drawImage(image,40,58,432,59);backLogo=texture(c);const logo=object(face(1.2,.38,.01),[1,1,1],[0,-.22,-.196],0,60,[0,Math.PI,0]);logo.mode=2;logo.fixedTexture=backLogo;}catch(_){/* Branding failure does not affect the app demonstration. */}
 // Cropped regions of real screenshots become solid, independently animated UI layers.
 panels=[
  {geom:face(2.15,1.04,.12),base:box(2.18,1.07,.048,.13,.006),tex:'training',rect:[.025,.554,.945,.188],chapter:2,x:1.05,y:.42,z:.90,rz:-.12},
  {geom:face(2.03,.95,.12),base:box(2.06,.98,.048,.13,.006),tex:'nutrition',rect:[.035,.09,.93,.154],chapter:3,x:1.19,y:-.73,z:1.12,rz:.09},
  {geom:face(2.14,1.32,.12),base:box(2.17,1.35,.048,.13,.006),tex:'evolution',rect:[.040,.39,.93,.292],chapter:4,x:-1.25,y:-.27,z:1.07,rz:-.08},
 ];
 ready=true;applyMode();
 window.__MOVVA_QA__={version:'studio-3d-1',engine:'WebGL triangulated geometry',ready:true,get progress(){return position},get enabled(){return enabled},get meshCount(){return meshes.length},get drawCalls(){return drawCalls},get textureCount(){return Object.keys(textures).length},setProgress(p){jump(clamp(p),false);}};
}
const poses=[
 // p, x normalized to half viewport, y, uniform scale, rx, ry, rz
 [0,.47,.05,.99,-.09,-.34,-.095], [.10,.45,.06,1.01,-.06,-.15,-.06],
 [.14,.46,.02,.95,.04,1.10,-.03], [.195,.47,.04,.98,-.07,3.30,.035],
 [.235,.46,.04,.91,.06,5.11,.09], [.28,-.45,.02,.93,-.055,6.63,.095],
 [.38,-.43,.035,.98,.05,6.86,-.08], [.425,-.44,.025,.92,-.04,6.12,-.05],
 [.47,-.45,.045,.96,-.08,5.99,.07], [.555,-.44,.025,.98,.025,6.54,-.05],
 [.60,.44,.035,.91,-.05,6.06,-.10], [.66,.45,.04,.96,-.08,6.01,-.06],
 [.735,.45,.03,.95,.02,6.59,.065], [.78,-.46,.03,.96,-.08,6.47,.075],
 [.855,-.45,.06,1.00,-.035,6.1,-.06], [.905,-.30,-.02,.83,.09,6.7,-.01],
 [.945,0,-.39,.62,.12,8.7,-.04], [1,0,-.42,.43,.08,9.42,0]
];
function poseAt(p){let i=0;while(i<poses.length-2&&p>poses[i+1][0])i++;let a=poses[i],b=poses[i+1],t=smooth((p-a[0])/(b[0]-a[0]));return a.slice(1).map((v,k)=>lerp(v,b[k+1],t));}
function weights(p){return windows.map(([a,b],i)=>{const ramp=.035;return (i===0?1:range(p,a,a+ramp))*(i===6?1:1-range(p,b-ramp,b));});}
const bgKeys=[[0,[242,239,230]],[.12,[242,239,230]],[.24,[233,231,218]],[.285,[35,43,34]],[.415,[35,43,34]],[.45,[238,230,215]],[.575,[238,230,215]],[.612,[221,230,213]],[.748,[221,230,213]],[.785,[235,228,215]],[.91,[235,228,215]],[.958,[243,240,230]],[1,[243,240,230]]];
function background(p){let i=0;while(i<bgKeys.length-2&&p>bgKeys[i+1][0])i++;const a=bgKeys[i],b=bgKeys[i+1],t=range(p,a[0],b[0]);return a[1].map((v,k)=>Math.round(lerp(v,b[1][k],t)));}
function bindTexture(t,unit){gl.activeTexture(unit===0?gl.TEXTURE0:gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);}
function draw(o,model,texA,texB,mix=0){gl.bindBuffer(gl.ARRAY_BUFFER,o.geom.buffer);for(const [n,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aUV',2,24]]){const at=attribs[n];gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,32,offset);}
 gl.uniformMatrix4fv(uniforms.uModel,false,new Float32Array(model));gl.uniform3fv(uniforms.uColor,o.color);gl.uniform1f(uniforms.uMetal,o.metal||0);gl.uniform1f(uniforms.uShine,o.shine||80);gl.uniform1f(uniforms.uMode,o.mode||0);gl.uniform1f(uniforms.uMix,mix);gl.uniform4fv(uniforms.uRect,o.rect||[0,0,1,1]);
 if(o.mode){const a=o.fixedTexture||texA,b=o.fixedTexture||texB||a;bindTexture(a,0);bindTexture(b,1);}
 gl.drawArrays(gl.TRIANGLES,0,o.geom.count);drawCalls++;
}
function render(p){
 const w=weights(p),bg=background(p),active=w.indexOf(Math.max(...w));
 stage.style.backgroundColor=`rgb(${bg})`;stage.classList.toggle('dark',active===2);$('.header').classList.toggle('dark',active===2);
 scenes.forEach((s,i)=>{const visible=w[i]>.002;s.style.opacity=w[i].toFixed(4);s.style.visibility=visible?'visible':'hidden';s.inert=i!==active;s.setAttribute('aria-hidden',String(i!==active));const cy=(1-w[i])*22;s.style.transform=`translateY(${cy}px)`;});
 dots.forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});
 $('#chapter-number').textContent=String(active+1).padStart(2,'0');$('#chapter-name').textContent=names[active];
 const ep=range(p,.626,.725),np=range(p,.47,.56);
 $('#score-number').textContent=Math.round(52*ep);$('#score-arc').style.strokeDashoffset=(289.026*(1-.52*ep)).toFixed(3);
 $('#water-number').textContent=(2*np).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});$('#water-fill').style.width=(np*74)+'%';
 $$('.activity-bar').forEach((bar,i)=>{const value=+bar.dataset.minutes, t=range(p,.64+i*.006,.728+i*.002);bar.setAttribute('height',(value/168*78*t).toFixed(2));bar.setAttribute('y',(88-value/168*78*t).toFixed(2));});$('#activity-minutes').textContent=Math.round(425*ep);
 let [nx,ny,scale,rx,ry,rz]=poseAt(p);
 if(mobile){nx=active===6?0:lerp(.1,-.08,range(p,.3,.7));ny=active===6?-.43:lerp(-.43,-.55,Math.max(w[3],w[4]));scale*=active===6?.95:.61;rx*=.6;rz*=.8;}
 const halfH=14*Math.tan(32*Math.PI/360),halfW=halfH*width/height;
 const model=compose(nx*halfW,ny*halfH,0,rx+pointer[1]*.025,ry+pointer[0]*.065,rz,scale);
 let ix=0,blend=0,transitions=[[.253,.275],[.421,.443],[.578,.60],[.753,.775]];
 for(let k=0;k<transitions.length;k++){const[a,b]=transitions[k];if(p>=b)ix=k+1;else if(p>a){ix=k;blend=range(p,a,b);break;}}
 const labels=['home','training','nutrition','evolution','circle'],txA=textures[labels[ix]],txB=textures[labels[Math.min(ix+1,4)]];
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(uniforms.uViewProjection,false,new Float32Array(viewProjection));gl.uniform1i(uniforms.uTextureA,0);gl.uniform1i(uniforms.uTextureB,1);gl.uniform1f(uniforms.uDark,active===2?1:0);drawCalls=0;bindTexture(txA,0);bindTexture(txB,1);
 meshes.forEach(o=>draw(o,mm(model,o.local),txA,txB,blend));
 // UI cut-outs rise out of the screen, not off a flat HTML mockup.
 if(!mobile)for(const o of panels){const a=w[o.chapter];if(a<.015)continue;const spread=smooth(a);const panelM=mm(model,compose(o.x*spread,o.y,.20+o.z*spread,.02,-.10*spread,o.rz*spread,lerp(.02,1,spread)));
 draw({geom:o.base,color:[.85,.85,.79],metal:.22,shine:80},panelM,txA,txA,0);
 draw({geom:o.geom,color:[1,1,1],mode:1,rect:o.rect},mm(panelM,mat.translation(0,0,.027)),textures[o.tex],textures[o.tex],0);
 }
 $('.ground-shadow').style.left=(50+nx*50)+'%';$('.ground-shadow').style.opacity=active===6?.3:1;
 $('.halo').style.transform=`translate(-50%,-50%) rotate(${p*110}deg) scale(${1+p*.08})`;
 $('.ghost-word').style.transform=`translateX(${-p*4}vw)`;
}
function resize(){width=stage.clientWidth;height=stage.clientHeight;mobile=width<=760;if(gl&&width&&height){const dpr=Math.min(devicePixelRatio||1,mobile?1.6:1.8);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);viewProjection=mm(mat.perspective(32*Math.PI/180,width/height,.1,60),mat.translation(0,0,-14));}requestTick();}
function measure(){const travel=experience.offsetHeight-stage.clientHeight;return travel>0?clamp((scrollY-experience.offsetTop)/travel):0;}
function requestTick(){if(enabled&&!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(t){raf=0;if(!enabled||document.hidden)return;const dt=Math.min(60,t-(lastTime||t-16));lastTime=t;target=measure();const k=1-Math.exp(-dt/85);position=lerp(position,target,k);pointer=pointer.map((v,i)=>lerp(v,pointerTarget[i],k));if(Math.abs(position-target)<.000006)position=target;render(position);
 const changing=Math.abs(position-target)>.000006||Math.abs(pointer[0]-pointerTarget[0])>.0005||Math.abs(pointer[1]-pointerTarget[1])>.0005;
 if(changing){idle=0;requestTick();}else if(idle++<2)requestTick();
}
function clearScenes(){scenes.forEach(s=>{s.style.opacity='';s.style.visibility='';s.style.transform='';s.inert=false;s.removeAttribute('aria-hidden')});stage.style.backgroundColor='';stage.classList.remove('dark');$('.header').classList.remove('dark');$('#score-number').textContent='52';$('#score-arc').style.strokeDashoffset='138.73';$('#water-number').textContent='2,0';$('#water-fill').style.width='74%';$$('.activity-bar').forEach(bar=>{const h=+bar.dataset.minutes/168*78;bar.setAttribute('height',h);bar.setAttribute('y',88-h)});$('#activity-minutes').textContent='425';}
function applyMode(){const short=innerWidth<=760&&innerHeight<640,landscape=innerHeight<560&&innerWidth>innerHeight;enabled=ready&&userMotion&&!media.matches&&!short&&!landscape;root.classList.toggle('enhanced',enabled);motion.setAttribute('aria-pressed',String(enabled));motion.setAttribute('aria-label',enabled?'Desativar animações':'Ativar animações');motion.title=enabled?'Trocar para leitura sem animações':'Experiência sem movimento';motion.querySelector('span').textContent=enabled?'Movimento':'Modo leve';if(enabled){resize();position=target=measure();requestTick();}else{if(raf)cancelAnimationFrame(raf);raf=0;clearScenes();}}
function jump(p,animated=true){if(!enabled)return;const top=experience.offsetTop+p*(experience.offsetHeight-stage.clientHeight);scrollTo({top,behavior:animated?'smooth':'instant'});target=p;requestTick();}
$$('[data-jump]').forEach(a=>a.addEventListener('click',e=>{if(!enabled)return;e.preventDefault();jump(parseFloat(a.dataset.jump));}));
motion.addEventListener('click',()=>{const previous=enabled,active=weights(position).indexOf(Math.max(...weights(position)));userMotion=!enabled;try{sessionStorage.setItem('movva-motion',userMotion?'on':'off')}catch(_){}applyMode();if(previous){scenes[active].scrollIntoView({behavior:'instant',block:'start'});}else if(enabled)jump(.0,false);});
addEventListener('scroll',()=>{if(enabled){$('.header').style.position=scrollY>experience.offsetHeight-100?'absolute':'fixed';requestTick();}},{passive:true});
let resizeId;addEventListener('resize',()=>{clearTimeout(resizeId);resizeId=setTimeout(()=>{applyMode();resize();},100);},{passive:true});
addEventListener('pointermove',e=>{if(!enabled||mobile||e.pointerType==='touch')return;pointerTarget=[clamp((e.clientX/innerWidth-.5)*2,-1,1),clamp((e.clientY/innerHeight-.5)*2,-1,1)];requestTick();},{passive:true});
addEventListener('pointerout',e=>{if(!e.relatedTarget){pointerTarget=[0,0];requestTick();}},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{lastTime=0;requestTick();}});
media.addEventListener?.('change',applyMode);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;applyMode();window.__MOVVA_QA__={ready:false,fallback:'context-lost'};});
// Default is complete, semantic, non-animated content until all essential assets succeed.
build().catch(err=>{console.warn('MOVVA: using accessible static experience.',err.message);ready=false;applyMode();window.__MOVVA_QA__={ready:false,fallback:err.message};});
})();
