/* MOVVA Studio · Stage 2. Actual hardware geometry and camera-dependent materials.
 * Native scroll, content, layouts and app metrics preserved. No app-data access.
 */
(() => {
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const root=document.documentElement,canvas=$('#world'),stage=$('#stage'),experience=$('#experience');
const media=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const range=(p,a,b)=>smooth((p-a)/(b-a));
const windows=[[0,.13],[.125,.275],[.27,.435],[.43,.595],[.59,.775],[.77,.935],[.93,1.05]];
const names=['SEU RITMO','TUDO CONECTADO','TRAINING','NUTRITION','EVOLUTION','CIRCLE','MOVVA'];
const scenes=$$('.scene'),dots=$$('.chapter-dots a');
let enabled=false,ready=false,disposed=false,raf=0,lastTime=0,position=0,target=0,width=0,height=0,mobile=false,domDevice=false;
let pointer=[0,0],pointerTarget=[0,0],idle=0,gl=null;
const launchParams=new URLSearchParams(location.search);
 const PRO_MAX_REFERENCE_ASPECT=78/163.4;
 const PRO_MAX_MODEL_Y=(2.8/6)/PRO_MAX_REFERENCE_ASPECT;
// The immersive presentation is on by default; old per-tab settings no longer disable it.
const mat={
 identity:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
 mul:(a,b)=>{const m=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;},
 translation:(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1],
 scale:s=>[s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1],
 scaleY:y=>[1,0,0,0,0,y,0,0,0,0,1,0,0,0,0,1],
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
const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;
uniform vec3 uColor;uniform float uMetal;uniform float uShine;uniform float uMode;uniform float uMix;uniform vec4 uRect;
uniform float uMaterial;uniform sampler2D uTextureA;uniform sampler2D uTextureB;uniform float uDark;
// Analytic studio softboxes: reflections respond to geometry and camera.
float card(vec3 ray,vec3 direction,vec3 up,vec2 size,float blur){
 vec3 n=normalize(direction),x=normalize(cross(up,n)),y=cross(n,x);
 float facing=dot(ray,n);vec2 q=vec2(dot(ray,x),dot(ray,y))/max(.01,facing);
 vec2 edge=vec2(1.)-smoothstep(size-blur,size+blur,abs(q));
 return edge.x*edge.y*smoothstep(.0,.18,facing);
}
vec3 studio(vec3 r,float rough){
 float blur=.025+rough*.46;
 vec3 e=mix(vec3(.17,.18,.18),vec3(.70,.69,.66),smoothstep(-.8,.9,r.y));
 e+=vec3(1.25,1.18,1.04)*card(r,vec3(-.9,.5,1.),vec3(0.,1.,0.),vec2(.17,1.8),blur);
 e+=vec3(.83,.91,1.02)*card(r,vec3(1.1,.15,.8),vec3(0.,1.,0.),vec2(.095,1.25),blur);
 e+=vec3(.91,.87,.77)*card(r,vec3(.1,1.,-.5),vec3(1.,0.,0.),vec2(.34,1.1),blur);
 e+=vec3(.77,.8,.85)*card(r,vec3(-.7,.1,-1.),vec3(0.,1.,0.),vec2(.18,1.2),blur);
 return e;
}
void main(){
 vec3 N=normalize(vNormal),V=normalize(vec3(0.,0.,14.)-vPosition),R=reflect(-V,N);
 float nv=max(abs(dot(N,V)),.001),fr=pow(1.-nv,5.);
 vec3 L1=normalize(vec3(-7.,8.,9.)-vPosition),L2=normalize(vec3(7.,2.,6.)-vPosition),L3=normalize(vec3(-5.,6.,-7.)-vPosition);
 float d1=max(dot(N,L1),0.),d2=max(dot(N,L2),0.),d3=max(dot(N,L3),0.);
 float rough=clamp(1.-uShine/240.,.08,.86);
 vec3 base=pow(uColor,vec3(2.2));
 vec3 diffuse=base*(.43+.54*d1+.27*d2+.58*d3);
 vec3 env=studio(R,rough);
 vec3 c=mix(diffuse,diffuse*.34+env*base*.8,uMetal);
 c+=env*fr*.18;
 if(uMaterial>1.5&&uMaterial<2.5){
  float grain=(fract(sin(dot(vUV,vec2(713.1,429.7)))*43758.545)-.5)*.012;
  c=diffuse*(1.+grain)+studio(R,.82)*(.055+fr*.06);
 }
 if(uMaterial>.5&&uMaterial<1.5){
  float grain=sin(vUV.y*4200.)*.012;
  c=base*(.24+.38*d1+.18*d2+.28*d3)+env*base*(.75+grain);
 }
 if(uMaterial>2.5&&uMaterial<3.5){
  vec2 q=(vUV-.5)*2.;float radius=length(q);
  float pupil=1.-smoothstep(.34,.46,radius);
  float coat=exp(-pow((radius-.69)/.12,2.));
  vec3 optical=mix(vec3(.006,.009,.013),vec3(.025,.043,.05),coat);
  optical=mix(optical,vec3(.002,.003,.005),pupil*.92);
  c=optical+studio(R,.12)*(.075+fr*.18);
  c+=vec3(.017,.023,.018)*exp(-pow((radius-.89)/.023,2.));
 }
 // Display pixels remain in their supplied sRGB space.
 if(uMode>.5&&uMode<1.5){
  vec2 uv=uRect.xy+vUV*uRect.zw;vec3 a=texture2D(uTextureA,uv).rgb,b=texture2D(uTextureB,uv).rgb;
  float wipe=smoothstep(uMix*1.5-.28,uMix*1.5+.12,1.-vUV.y);
  float blend=uMix<.001?0.:(uMix>.999?1.:1.-wipe);
  vec3 display=mix(a,b,blend);
  float gloss=card(R,vec3(-.9,.5,1.),vec3(0.,1.,0.),vec2(.17,1.8),.1)*.012;
  gl_FragColor=vec4(mix(display,vec3(.98,.98,.97),min(.07,gloss+fr*.045)),1.);return;
 }
 if(uMode>1.5){if(texture2D(uTextureA,vUV).a<.08)discard;c=base*(.30+.32*d1+.32*d3);}
 c=max(c,vec3(0.));c=c/(vec3(.72)+c);
 gl_FragColor=vec4(pow(c,vec3(1./2.2)),1.);
}`;
let program,uniforms,attribs,viewProjection,meshes=[],panels=[],textures={},textureSizes={},drawCalls=0,frameCount=0,lastModel=null;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function makeProgram(){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
function contour(w,h,r,n=14){const out=[];[[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]].forEach(([x,y,a])=>{for(let j=0;j<=n;j++){const t=a+j/n*Math.PI/2;out.push([x+r*Math.cos(t),y+r*Math.sin(t),Math.cos(t),Math.sin(t)]);}});return out;}
function geometry(vertices){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);return{buffer,count:vertices.length/8};}
// Five-segment rolled bevel with continuous normals on each edge.
function box(w,h,d,r,bevel=.025){
 const out=[],bb=Math.min(bevel,d*.49),layers=[],steps=5;
 for(let i=0;i<=steps;i++){const angle=-Math.PI/2+i/steps*Math.PI/2,offset=bb*(1-Math.cos(angle));layers.push([-d/2+bb+bb*Math.sin(angle),w-2*offset,h-2*offset,Math.max(.001,r-offset),Math.cos(angle),Math.sin(angle)]);}
 for(let i=0;i<=steps;i++){const angle=i/steps*Math.PI/2,offset=bb*(1-Math.cos(angle));layers.push([d/2-bb+bb*Math.sin(angle),w-2*offset,h-2*offset,Math.max(.001,r-offset),Math.cos(angle),Math.sin(angle)]);}
 const vs=(p,l)=>[p[0],p[1],l[0],p[2]*l[4],p[3]*l[4],l[5],p[0]/w+.5,p[1]/h+.5];
 for(let k=0;k<layers.length-1;k++){const a=layers[k],b=layers[k+1],ca=contour(a[1],a[2],a[3],20),cb=contour(b[1],b[2],b[3],20);
 for(let i=0;i<ca.length;i++){const j=(i+1)%ca.length;out.push(...vs(ca[i],a),...vs(ca[j],a),...vs(cb[j],b),...vs(ca[i],a),...vs(cb[j],b),...vs(cb[i],b));}}
 for(const k of [0,layers.length-1]){const l=layers[k],c=contour(l[1],l[2],l[3],20),nz=k===0?-1:1;
 for(let i=0;i<c.length;i++){const j=(i+1)%c.length;out.push(0,0,l[0],0,0,nz,.5,.5,...vs(c[i],l),...vs(c[j],l));}}
 return geometry(out);
}
function lensRing(inner,outer,depth){
 const profile=[[inner,-depth/2],[outer-.012,-depth/2],[outer,-depth/2+.012],[outer,depth/2-.012],[outer-.012,depth/2],[inner,depth/2],[inner,-depth/2]],out=[],n=72;
 for(let k=0;k<profile.length-1;k++){const[r1,z1]=profile[k],[r2,z2]=profile[k+1],len=Math.hypot(r2-r1,z2-z1),nr=(z2-z1)/len,nz=-(r2-r1)/len;
 const v=(r,z,t)=>[r*Math.cos(t),r*Math.sin(t),z,nr*Math.cos(t),nr*Math.sin(t),nz,Math.cos(t)*r/(outer*2)+.5,Math.sin(t)*r/(outer*2)+.5];
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;out.push(...v(r1,z1,a),...v(r1,z1,b),...v(r2,z2,b),...v(r1,z1,a),...v(r2,z2,b),...v(r2,z2,a));}}
 return geometry(out);
}
function face(w,h,r){const c=contour(w,h,r,18),out=[];const v=p=>[p[0],p[1],0,0,0,1,p[0]/w+.5,p[1]/h+.5];for(let i=0;i<c.length;i++){out.push(0,0,0,0,0,1,.5,.5,...v(c[i]),...v(c[(i+1)%c.length]));}return geometry(out);}
function cylinder(r,d,n=42){const out=[];for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
 const va=[r*ca,r*sa,-d/2,ca,sa,0,0,0],vb=[r*cb,r*sb,-d/2,cb,sb,0,1,0],vc=[r*cb,r*sb,d/2,cb,sb,0,1,1],vd=[r*ca,r*sa,d/2,ca,sa,0,0,1];out.push(...va,...vb,...vc,...va,...vc,...vd);
 for(const z of [-d/2,d/2]){const nz=z<0?-1:1;out.push(0,0,z,0,0,nz,.5,.5,r*ca,r*sa,z,0,0,nz,ca*.5+.5,sa*.5+.5,r*cb,r*sb,z,0,0,nz,cb*.5+.5,sb*.5+.5);}}
 return geometry(out);
}
function object(geom,color,position=[0,0,0],metal=0,shine=60,rotation=[0,0,0],material=0){const o={geom,color,metal,shine,material,local:compose(...position,...rotation),mode:0,rect:[0,0,1,1]};meshes.push(o);return o;}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Asset unavailable: '+url));image.src=url;});}
function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return t;}
let screenMesh,backLogo;
async function build(){
 gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL unavailable');
 program=makeProgram();gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 attribs={};['aPosition','aNormal','aUV'].forEach(n=>attribs[n]=gl.getAttribLocation(program,n));
 uniforms={};['uModel','uViewProjection','uColor','uMetal','uShine','uMode','uMix','uRect','uTextureA','uTextureB','uDark','uMaterial'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
 const assetNames=['home','training','nutrition','evolution','circle'];
 await Promise.all(assetNames.map(async name=>{const image=await loadImage('/assets/'+name+'.webp');textureSizes[name]=[image.naturalWidth,image.naturalHeight];textures[name]=texture(image);}));
 // MOVVA satin aluminum unibody, ceramic glass inset and flush front seal.
 object(box(2.80,6.00,.312,.415,.046),[.706,.744,.704],[0,0,0],.77,145,[0,0,0],1);
 object(box(2.749,5.945,.043,.391,.014),[.365,.405,.376],[0,0,-.166],.51,98);
 object(box(2.713,5.907,.035,.374,.015),[.805,.833,.793],[0,0,-.189],.12,72,[0,0,0],2);
 // Inset rear glass below the elevated camera plateau, visibly distinct.
 object(box(2.52,4.10,.014,.282,.006),[.870,.886,.854],[0,-.72,-.218],.11,112,[0,0,0],2);
 object(box(2.769,5.969,.021,.393,.007),[.72,.75,.714],[0,0,.154],.83,178,[0,0,0],1);
 object(box(2.731,5.931,.030,.375,.009),[.038,.046,.042],[0,0,.169],.18,165);
 screenMesh=object(face(2.626,5.813,.316),[1,1,1],[0,0,.190]);screenMesh.mode=1;
 // Compact current-generation Dynamic Island with optical sensor inset.
 object(box(.624,.132,.018,.065,.006),[.010,.014,.014],[0,2.78,.207],.08,110);
 object(cylinder(.029,.010),[.018,.031,.043],[.213,2.78,.220],.13,195,[0,0,0],3);
 object(box(.54,.020,.011,.009,.003),[.075,.089,.080],[0,2.927,.183],.14,80);
 // MOVVA flagship camera plateau: physical full-width raised upper deck.
 // Layers overlap through their depth instead of leaving air gaps.
 object(box(2.665,1.495,.018,.271,.005),
   [.31,.37,.33],[0,2.188,-.212],.27,120);
 object(box(2.650,1.481,.071,.268,.025),
   [.56,.635,.563],[0,2.188,-.237],.81,178,[0,0,0],1);
 object(box(2.600,1.426,.077,.253,.024),
   [.742,.798,.727],[0,2.188,-.282],.32,116,[0,0,0],2);
 // Three independently extruded barrels and recessed coated glass.
 const lensCenters=[[-.925,2.472],[-.318,2.172],[-.925,1.865]];
 lensCenters.forEach(([x,y])=>{
  object(cylinder(.266,.052,72),[.15,.175,.158],[x,y,-.337],.42,147);
  object(lensRing(.208,.252,.098),[.705,.765,.714],[x,y,-.378],.92,215,[0,0,0],1);
  object(lensRing(.184,.216,.064),[.058,.072,.066],[x,y,-.382],.56,193);
  object(cylinder(.189,.010,72),[.024,.045,.051],[x,y,-.406],.42,219,[0,0,0],3);
  object(lensRing(.157,.173,.014),[.214,.279,.260],[x,y,-.410],.43,170);
 });
 // Right-side flash, LiDAR and microphone, with real independent depth.
 object(lensRing(.057,.075,.022),[.62,.689,.622],[.938,2.505,-.338],.74,177,[0,0,0],1);
 object(cylinder(.056,.010,44),[.99,.911,.745],[.938,2.505,-.350],.03,59);
 object(lensRing(.052,.070,.018),[.419,.497,.433],[.935,1.850,-.337],.73,158,[0,0,0],1);
 object(cylinder(.048,.014,44),[.017,.035,.032],[.935,1.850,-.357],.2,153,[0,0,0],3);
 object(cylinder(.024,.012,28),[.023,.035,.028],[.675,1.795,-.348],.06,97);
 [[1.0,1.13,.55],[1.0,-1.18,.24],[-1.0,1.18,.43],[-1.0,.59,.43],[-1.0,1.9,.22]].forEach(([side,y,len])=>{
  object(box(.023,len+.035,.139,.009,.004),[.07,.08,.073],[side*1.4,y,0],.15,90);
  object(box(.036,len,.115,.014,.008),[.68,.674,.646],[side*1.407,y,.004],.9,175,[0,0,0],1);
 });
 for(const y of [-2.31,2.31])for(const x of [-1.397,1.397])object(box(.010,.023,.212,.004,.002),[.32,.32,.30],[x,y,0],.02,60);
 object(box(.424,.014,.107,.006,.003),[.015,.019,.018],[0,-3.005,0],.15,80);
 object(box(.309,.018,.03,.008,.003),[.43,.43,.40],[0,-3.008,.002],.6,150);
 for(const x of [-.98,-.87,-.76,-.65,-.54,.54,.65,.76,.87,.98])object(cylinder(.023,.012,20),[.015,.019,.017],[x,-3.005,0],.1,80,[Math.PI/2,0,0]);
 try{const image=await loadImage('/assets/movva.svg');const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.drawImage(image,40,58,432,59);backLogo=texture(c);const logo=object(face(1.2,.38,.01),[.59,.63,.577],[0,-.47,-.229],0,60,[0,Math.PI,0]);logo.mode=2;logo.fixedTexture=backLogo;}catch(_){}
 panels=[
  {geom:face(2.15,1.04,.12),base:box(2.18,1.07,.048,.13,.006),tex:'training',rect:[.025,.554,.945,.188],chapter:2,x:1.05,y:.42,z:.90,rz:-.12},
  {geom:face(2.03,.95,.12),base:box(2.06,.98,.048,.13,.006),tex:'nutrition',rect:[.035,.09,.93,.154],chapter:3,x:1.19,y:-.73,z:1.12,rz:.09},
  {geom:face(2.14,1.32,.12),base:box(2.17,1.35,.048,.13,.006),tex:'evolution',rect:[.040,.39,.93,.292],chapter:4,x:-1.25,y:-.27,z:1.07,rz:-.08}
 ];
 ready=true;applyMode();
 window.__MOVVA_QA__={version:'intro-stage4-1',engine:'WebGL triangulated geometry',ready:true,get progress(){return position},get enabled(){return enabled},get meshCount(){return meshes.length},get drawCalls(){return drawCalls},get textureCount(){return Object.keys(textures).length},get textureSizes(){return{...textureSizes}},get hardware(){return {reference:'18 Pro Max proportions',aspect:PRO_MAX_REFERENCE_ASPECT,cameraPlateau:'full-width',lensCount:3,physicalLensGeometry:true}},get frameCount(){return frameCount},get settled(){return Math.abs(position-measure())<.00003},get modelMatrix(){return lastModel?[...lastModel]:null},get renderSize(){return[canvas.width,canvas.height]},setProgress(p){jump(clamp(p),false);}};
}
const poses=[
 [0,.47,.05,.99,-.09,-.34,-.095],[.10,.45,.06,1.01,-.06,-.15,-.06],
 [.14,.46,.02,.95,.04,1.10,-.03],[.195,.47,.04,.98,-.07,3.30,.035],
 [.235,.46,.04,.91,.06,5.11,.09],[.28,-.45,.02,.93,-.055,6.63,.095],
 [.38,-.43,.035,.98,.05,6.86,-.08],[.425,-.44,.025,.92,-.04,6.12,-.05],
 [.47,-.45,.045,.96,-.08,5.99,.07],[.555,-.44,.025,.98,.025,6.54,-.05],
 [.60,.44,.035,.91,-.05,6.06,-.10],[.66,.45,.04,.96,-.08,6.01,-.06],
 [.735,.45,.03,.95,.02,6.59,.065],[.78,-.46,.03,.96,-.08,6.47,.075],
 [.855,-.45,.06,1.00,-.035,6.1,-.06],[.905,-.30,-.02,.83,.09,6.7,-.01],
 [.945,0,-.39,.62,.12,8.7,-.04],[1,0,-.42,.43,.08,9.42,0]
];
function poseAt(p){let i=0;while(i<poses.length-2&&p>poses[i+1][0])i++;const a=poses[i],b=poses[i+1],dt=b[0]-a[0],t=clamp((p-a[0])/dt);return a.slice(1).map((v,k)=>{if(k<4)return lerp(v,b[k+1],smooth(t));const left=poses[Math.max(0,i-1)],right=poses[Math.min(poses.length-1,i+2)],m0=(b[k+1]-left[k+1])/(b[0]-left[0])*.62,m1=(right[k+1]-a[k+1])/(right[0]-a[0])*.62;return(2*t*t*t-3*t*t+1)*v+(t*t*t-2*t*t+t)*dt*m0+(-2*t*t*t+3*t*t)*b[k+1]+(t*t*t-t*t)*dt*m1;});}
function weights(p){return windows.map(([a,b],i)=>{const ramp=.035;return(i===0?1:range(p,a,a+ramp))*(i===6?1:1-range(p,b-ramp,b));});}
const bgKeys=[[0,[242,239,230]],[.12,[242,239,230]],[.24,[233,231,218]],[.285,[35,43,34]],[.415,[35,43,34]],[.45,[238,230,215]],[.575,[238,230,215]],[.612,[221,230,213]],[.748,[221,230,213]],[.785,[235,228,215]],[.91,[235,228,215]],[.958,[243,240,230]],[1,[243,240,230]]];
function background(p){let i=0;while(i<bgKeys.length-2&&p>bgKeys[i+1][0])i++;const a=bgKeys[i],b=bgKeys[i+1],t=range(p,a[0],b[0]);return a[1].map((v,k)=>Math.round(lerp(v,b[1][k],t)));}
function bindTexture(t,unit){gl.activeTexture(unit===0?gl.TEXTURE0:gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);}
function draw(o,model,texA,texB,mix=0){gl.bindBuffer(gl.ARRAY_BUFFER,o.geom.buffer);for(const[n,size,offset]of[['aPosition',3,0],['aNormal',3,12],['aUV',2,24]]){const at=attribs[n];gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,32,offset);}
 gl.uniformMatrix4fv(uniforms.uModel,false,new Float32Array(model));gl.uniform3fv(uniforms.uColor,o.color);gl.uniform1f(uniforms.uMetal,o.metal||0);gl.uniform1f(uniforms.uShine,o.shine||80);gl.uniform1f(uniforms.uMaterial,o.material||0);gl.uniform1f(uniforms.uMode,o.mode||0);gl.uniform1f(uniforms.uMix,mix);gl.uniform4fv(uniforms.uRect,o.rect||[0,0,1,1]);
 if(o.mode){const a=o.fixedTexture||texA,b=o.fixedTexture||texB||a;bindTexture(a,0);bindTexture(b,1);}
 gl.drawArrays(gl.TRIANGLES,0,o.geom.count);drawCalls++;
}
function render(p){
 if(!domDevice&&(!gl||gl.isContextLost()))return;
 const intro=window.MOVVA_INTRO;
 const w=intro?intro.weights(p,weights(p)):weights(p),bg=intro?intro.background(p,background(p)):background(p);
 const selected=w.indexOf(Math.max(...w)),active=intro?intro.active(p,selected):selected;
 stage.style.backgroundColor=`rgb(${bg})`;stage.classList.toggle('dark',active===2);$('.header').classList.toggle('dark',active===2);
 scenes.forEach((s,i)=>{const visible=w[i]>.002;s.style.opacity=w[i].toFixed(4);s.style.visibility=visible?'visible':'hidden';s.inert=i!==active;s.setAttribute('aria-hidden',String(i!==active));const cy=(1-w[i])*22;s.style.transform=`translateY(${cy}px)`;});
 dots.forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});
 $('#chapter-number').textContent=String(active+1).padStart(2,'0');$('#chapter-name').textContent=names[active];
 const ep=range(p,.626,.725),np=range(p,.47,.56);
 $('#score-number').textContent=Math.round(52*ep);$('#score-arc').style.strokeDashoffset=(289.026*(1-.52*ep)).toFixed(3);
 $('#water-number').textContent=(2*np).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});$('#water-fill').style.width=(np*74)+'%';
 $$('.activity-bar').forEach((bar,i)=>{const value=+bar.dataset.minutes,t=range(p,.64+i*.006,.728+i*.002);bar.setAttribute('height',(value/168*78*t).toFixed(2));bar.setAttribute('y',(88-value/168*78*t).toFixed(2));});$('#activity-minutes').textContent=Math.round(425*ep);
 let[nx,ny,scale,rx,ry,rz]=poseAt(p);
 if(mobile){nx=active===6?0:lerp(.1,-.08,range(p,.3,.7));ny=active===6?-.43:lerp(-.43,-.55,Math.max(w[3],w[4]));scale*=active===6?.95:.61;rx*=.6;rz*=.8;}
 const halfH=14*Math.tan(32*Math.PI/360),halfW=halfH*width/height;
 // Stage 3 is restricted to the opening; the existing poses take over at .13.
 if(window.MOVVA_HERO)[nx,ny,scale,rx,ry,rz]=window.MOVVA_HERO.fit(p,[nx,ny,scale,rx,ry,rz],compose,halfW,halfH);
 if(intro)[nx,ny,scale,rx,ry,rz]=intro.fit(p,[nx,ny,scale,rx,ry,rz],compose,halfW,halfH);
 intro?.visual(p);
 // A slightly larger, more cinematic product keeps the phone central to the story.
 if(!mobile){const emphasis=active===0?1:active===6?.4:.72;scale*=1+.085*emphasis;}
 const model=compose(nx*halfW,ny*halfH,0,rx+pointer[1]*.025,ry+pointer[0]*.065,rz,scale);
 let ix=0,blend=0,transitions=[[.253,.275],[.421,.443],[.578,.60],[.753,.775]];
 for(let k=0;k<transitions.length;k++){const[a,b]=transitions[k];if(p>=b)ix=k+1;else if(p>a){ix=k;blend=range(p,a,b);break;}}
 const change=intro?.screen(p);if(change){ix=change.ix;blend=change.blend;}
 const labels=['home','training','nutrition','evolution','circle'],txA=textures[labels[ix]],txB=textures[labels[Math.min(ix+1,4)]];
 if(domDevice){window.MOVVA_DOM_DEVICE?.render(p,active,ix,blend);window.MOVVA_MOTION?.render(p,active,{nx,ny,scale});lastModel=model;drawCalls=0;frameCount++;return;}
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(uniforms.uViewProjection,false,new Float32Array(viewProjection));gl.uniform1i(uniforms.uTextureA,0);gl.uniform1i(uniforms.uTextureB,1);gl.uniform1f(uniforms.uDark,active===2?1:0);drawCalls=0;frameCount++;lastModel=model;bindTexture(txA,0);bindTexture(txB,1);
 const handsetModel=mm(model,mat.scaleY(PRO_MAX_MODEL_Y));
 meshes.forEach(o=>draw(o,mm(handsetModel,o.local),txA,txB,blend));
 if(!mobile)for(const o of panels){const a=intro?intro.panel(p,o.chapter,w[o.chapter]):w[o.chapter];if(a<.015)continue;const spread=smooth(a);const panelM=mm(model,compose(o.x*spread,o.y,.20+o.z*spread,.02,-.10*spread,o.rz*spread,lerp(.02,1,spread)));
 draw({geom:o.base,color:[.85,.85,.79],metal:.22,shine:80},panelM,txA,txA,0);
 draw({geom:o.geom,color:[1,1,1],mode:1,rect:o.rect},mm(panelM,mat.translation(0,0,.027)),textures[o.tex],textures[o.tex],0);
 }
 window.MOVVA_MOTION?.render(p,active,{nx,ny,scale});
 $('.ground-shadow').style.left=(50+nx*50)+'%';$('.ground-shadow').style.opacity=active===6?.3:1;
 $('.halo').style.transform=`translate(-50%,-50%) rotate(${p*110}deg) scale(${1+p*.08})`;
 $('.ghost-word').style.transform=`translateX(${-p*4}vw)`;
}
function resize(){window.MOVVA_HERO?.measure();window.MOVVA_INTRO?.measure();width=stage.clientWidth;height=stage.clientHeight;mobile=width<=760;if(gl&&width&&height){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);viewProjection=mm(mat.perspective(32*Math.PI/180,width/height,.1,60),mat.translation(0,0,-14));}requestTick();}
function measure(){const travel=experience.offsetHeight-stage.clientHeight;return travel>0?clamp((scrollY-experience.offsetTop)/travel):0;}
function requestTick(){if(enabled&&!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(t){raf=0;if(!enabled||document.hidden)return;const dt=Math.min(60,t-(lastTime||t-16));lastTime=t;target=measure();const k=1-Math.exp(-dt/85);position=lerp(position,target,k);pointer=pointer.map((v,i)=>lerp(v,pointerTarget[i],k));if(Math.abs(position-target)<.000006)position=target;
 try{render(position)}
 catch(err){
  console.warn('MOVVA 3D frame failed; activating compatible renderer.',err);
  if(!domDevice){
   activateDOM('Runtime WebGL frame failed');
   try{render(position)}catch(fallbackErr){console.warn('MOVVA compatible renderer also failed.',fallbackErr);ready=false;applyMode()}
  }else{ready=false;applyMode()}
 }
 const changing=Math.abs(position-target)>.000006||Math.abs(pointer[0]-pointerTarget[0])>.0005||Math.abs(pointer[1]-pointerTarget[1])>.0005;
 if(changing){idle=0;requestTick();}else if(idle++<2)requestTick();
}
function clearScenes(){window.MOVVA_MOTION?.reset();window.MOVVA_INTRO?.reset();stage.classList.remove('hero-active');scenes.forEach(s=>{s.style.opacity='';s.style.visibility='';s.style.transform='';s.inert=false;s.removeAttribute('aria-hidden')});stage.style.backgroundColor='';stage.classList.remove('dark');$('.header').classList.remove('dark');$('#score-number').textContent='52';$('#score-arc').style.strokeDashoffset='138.73';$('#water-number').textContent='2,0';$('#water-fill').style.width='74%';$$('.activity-bar').forEach(bar=>{const h=+bar.dataset.minutes/168*78;bar.setAttribute('height',h);bar.setAttribute('y',88-h)});$('#activity-minutes').textContent='425';}
function applyMode(){
 // Keep the phone and scroll-driven cards active at every viewport size.
 // WebGL failure is handled by the existing CSS3D renderer; static HTML remains
 // the last-resort fallback if JavaScript or both rendering paths are unavailable.
 enabled=ready;
 root.classList.toggle('enhanced',enabled);
 root.classList.toggle('dom-device',enabled&&domDevice);
 // Ensure the Motion Studio is visible even under OS-level reduced-motion settings.
 root.classList.toggle('motion-override',enabled&&media.matches);
 root.style.scrollBehavior=enabled?'auto':'';
 if(enabled){resize();position=target=measure();requestTick();}
 else{if(raf)cancelAnimationFrame(raf);raf=0;clearScenes();}
}
function jump(p,animated=true){if(!enabled)return;const top=experience.offsetTop+p*(experience.offsetHeight-stage.clientHeight);scrollTo({top,behavior:animated?'smooth':'auto'});target=p;requestTick();}
$$('[data-jump]').forEach(a=>a.addEventListener('click',e=>{if(!enabled)return;e.preventDefault();jump(parseFloat(a.dataset.jump));}));
addEventListener('scroll',()=>{if(enabled){$('.header').style.position=scrollY>experience.offsetHeight-100?'absolute':'fixed';requestTick();}},{passive:true});
addEventListener('movva:hero-layout',requestTick);
let resizeId;addEventListener('resize',()=>{clearTimeout(resizeId);resizeId=setTimeout(()=>{applyMode();resize();},100);},{passive:true});
addEventListener('pointermove',e=>{if(!enabled||mobile||e.pointerType==='touch')return;pointerTarget=[clamp((e.clientX/innerWidth-.5)*2,-1,1),clamp((e.clientY/innerHeight-.5)*2,-1,1)];requestTick();},{passive:true});
addEventListener('pointerout',e=>{if(!e.relatedTarget){pointerTarget=[0,0];requestTick();}},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{lastTime=0;requestTick();}});
media.addEventListener?.('change',applyMode);
canvas.addEventListener('webglcontextlost',e=>{
 e.preventDefault();
 if(!domDevice){console.warn('MOVVA: WebGL context lost; continuing with CSS 3D.');activateDOM('WebGL context lost')}
});
function activateDOM(reason){
 domDevice=true;ready=true;applyMode();
 window.__MOVVA_QA__={version:'safari-device-hotfix',engine:'CSS3D DOM',ready:true,get progress(){return position},get enabled(){return enabled},get meshCount(){return 0},get drawCalls(){return drawCalls},get textureCount(){return 5},get settled(){return Math.abs(position-measure())<.00003},get modelMatrix(){return lastModel?[...lastModel]:null},get frameCount(){return frameCount},get reason(){return reason},setProgress(p){jump(clamp(p),false)}};
}
// ?renderer=css3d uses the same 3D hardware presentation as mobile on desktop.
// Consistent with mobile: CSS3D is the default on desktop as well.
 // WebGL remains available as an explicit experimental opt-in on capable desktop browsers.
const preferDOM=launchParams.get('renderer')!=='webgl' || matchMedia('(max-width:760px)').matches || /iPad|iPhone|iPod/.test(navigator.userAgent);
window.MOVVA_3D_STATUS=()=>({
 engine:domDevice?'CSS3D DOM':'WebGL',
 ready,active:enabled,
 reducedMotionPreference:media.matches,
 motionPolicy:'always-on',
 renderingFallback:domDevice,
 viewport:[innerWidth,innerHeight]
});
if(preferDOM){activateDOM('mobile-safari-safe');}
else build().catch(err=>{console.warn('MOVVA: falling back to CSS 3D.',err.message);activateDOM('WebGL fallback: '+err.message);});
})();
