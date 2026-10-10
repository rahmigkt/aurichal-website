import {MODES,F0,freq,u,Sand,tileMask,nodalSegments,timeline,modeIndex,freqAt,gainAt,SEG,clamp,smooth} from './chladni-core.js';
import {mix,lum,inOut,outBack} from './film-core.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER} from './palettes.js';
import {brocade} from './brocade.js';

const W=1080,H=1350,PX=140,PY=200,PS=800,GRAINS=32000,FDT=1/30;
const SWATCH2=3.4,DRAPE=0,OUTRO2=3.5,FADE=1.0;
const cv=document.getElementById('c'),mctx=cv.getContext('2d');let ctx=mctx,MODE='all';
const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d',{willReadFrequently:true});
const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=W;ca.height=cb.height=H;
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e',SAND='#f3d98a';
const P0={ink:'#efe6d2',soft:'#5fb8c8',ground:'#26304a',accent:'#e0a84a'};
const STAGES=[{...P0,n:'',dye:'',wk:null,wv:0},...HISTORIC_ORDER.map((k,i)=>({...HISTORIC[k],wk:weaveFor(i),wv:1}))];
const TL=timeline(0),FINAL=MODES.at(-1);TL.ce=TL.c+(HISTORIC_ORDER.length-1)*SWATCH2+3.5;TL.w=TL.ce;TL.total=TL.ce+DRAPE+OUTRO2;
const KEYS=['ground','ink','soft','accent'];
const nodal=MODES.map(([n,m,s])=>nodalSegments(n,m,s,140));
const mask=tileMask(FINAL[0],FINAL[1],FINAL[2],PS,2.6);
const spr=document.createElement('canvas');spr.width=spr.height=PS;const sctx=spr.getContext('2d'),simg=sctx.createImageData(PS,PS);
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function paintSprite(P){const c=[hexRgb(P.ink),hexRgb(P.ground),hexRgb(P.soft)],d=simg.data;for(let i=0;i<mask.length;i++){const k=mask[i],o=i*4,r=c[k];d[o]=r[0];d[o+1]=r[1];d[o+2]=r[2];d[o+3]=255;}sctx.putImageData(simg,0,0);}
/** two whole frames are cross-faded, so sand, plate and ground never pass through the same tone */
function pal(t){
 if(t<TL.g)return {A:STAGES[0],B:null,w:0};
 if(t<TL.ge)return {A:STAGES[0],B:STAGES[1],w:smooth((t-TL.g)/(TL.ge-TL.g))};
 for(let k=1;k<STAGES.length-1;k++){const c=TL.c+k*SWATCH2,u=(t-(c-FADE/2))/FADE;if(u<0)return {A:STAGES[k],B:null,w:0};if(u<1)return {A:STAGES[k],B:STAGES[k+1],w:smooth(u)};}
 return {A:STAGES[STAGES.length-1],B:null,w:0};
}
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=mctx.createPattern(weaveTile(k,7),'repeat');
const grayOf=k=>{const c=weaveTile(k,7),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,g=new Uint8Array(c.width*c.height);for(let i=0;i<g.length;i++)g[i]=d[i*4];return {w:c.width,h:c.height,g};};
const GRAY={};for(const k of WEAVE_ORDER)GRAY[k]=grayOf(k);
/** weave the figure into the cloth: figure in one structure, ground in another (damask principle) */
function brocadeOver(P){if(!P.wk)return;const img=ctx.getImageData(0,0,W,H);brocade(img.data,W,H,hexRgb(P.ground),GRAY[P.wk],GRAY[MOTIF_WEAVE[P.wk]]);ctx.putImageData(img,0,0);}
const weaveOver=(P,y0,y1,al=.85)=>{if(!P.wk)return;ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=al*P.wv;ctx.fillRect(0,y0,W,y1-y0);ctx.restore();};
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){if(MODE==='cloth')return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

// ---- sand state advanced in fixed frame steps (deterministic) ----
let sand,simFrame;
function resetSim(){sand=new Sand(GRAINS,7);simFrame=0;}
function simTo(t){const target=Math.floor(clamp(t,0,TL.ae)/FDT);if(target<simFrame)resetSim();
 while(simFrame<target){const tt=simFrame*FDT;if(tt>=TL.a){const [n,m,s]=MODES[modeIndex(TL,tt)];sand.step(n,m,s);sand.step(n,m,s);}simFrame++;}}

function drawWave(f,n,m,t,col,y0,hgt,alpha){
 const x0=70,x1=W-70,mid=y0+hgt/2,T=1/F0;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();
 for(let i=0;i<=900;i++){const x=x0+(x1-x0)*i/900,ph=2*Math.PI*f*(T*i/900)-t*2.0;const y=mid-Math.sin(ph)*hgt*.42;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
 ctx.globalAlpha=alpha*.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,mid);ctx.lineTo(x1,mid);ctx.stroke();ctx.restore();
}
function drawCell(P,cx,cy,size,fx,fy,alpha){if(MODE==='ui')return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);ctx.scale(fx*size/PS,fy*size/PS);ctx.drawImage(spr,-PS/2,-PS/2);ctx.restore();}

function draft(wv,x1,y0,fg,al=1){const n=Math.min(wv.P,16),c=Math.floor(150/n);if(MODE==='cloth')return;ctx.save();
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const X=x1-n*c+i*c,Y=y0+j*c;if(wv.top(i,j)){ctx.fillStyle=fg;ctx.globalAlpha=.9*al;ctx.fillRect(X,Y,c-1,c-1);}else{ctx.strokeStyle=fg;ctx.globalAlpha=.35*al;ctx.lineWidth=1;ctx.strokeRect(X+.5,Y+.5,c-2,c-2);}}
 ctx.restore();text('interlacing draft (■ warp over weft)',x1,y0+n*c+26,19,fg,{align:'right',alpha:.6*al,font:SANS,style:'normal'});}
function stageFrame(P,t,wr){
 const bg=P.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410',gold=dark?GOLD:'#8a5a10';
 ctx.setTransform(1,0,0,1,0,0);if(MODE!=='ui'){ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);}
 let label='',sub='',l1='',l2='';
 if(t<TL.a){const a=smooth(t/1.2)*(1-smooth((t-2.4)/.5));text('NAKIŞ',W/2,600,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text('Sound and Pattern',W/2,675,58,fg,{align:'center',alpha:a});text('Chladni figures',W/2,735,28,fg,{align:'center',alpha:a*.6,font:SANS,style:'normal'});text('nakış: Turkish for pattern and embroidery',W/2,780,22,fg,{align:'center',alpha:a*.45,font:SANS,style:'normal'});}
 else if(t<TL.m){
  simTo(t);const k=modeIndex(TL,t),[n,m,s]=MODES[k],f=freq(n,m),tt=t-(TL.a+k*SEG);
  // plate
  ctx.save();ctx.strokeStyle='#8a8f9c';ctx.globalAlpha=.7;ctx.lineWidth=2;ctx.strokeRect(PX,PY,PS,PS);ctx.restore();
  ctx.save();ctx.fillStyle=SAND;ctx.globalAlpha=.8;ctx.beginPath();for(let i=0;i<sand.N;i++)ctx.rect(PX+sand.x[i]*PS-.8,PY+sand.y[i]*PS-.8,1.7,1.7);ctx.fill();ctx.restore();
  const show=smooth((tt-SEG+2.2)/1.2);if(show>0){ctx.save();ctx.strokeStyle=CORAL;ctx.lineWidth=2.6;ctx.globalAlpha=show;ctx.lineCap='round';ctx.beginPath();for(const [a,b] of nodal[k]){ctx.moveTo(PX+a[0]*PS,PY+a[1]*PS);ctx.lineTo(PX+b[0]*PS,PY+b[1]*PS);}ctx.stroke();ctx.restore();}
  label='SOUND  →  PATTERN';
  text('u = cos(nπx)cos(mπy)',70,98,40,fg);text(`${s>0?'+':'−'} cos(mπx)cos(nπy)`,70,150,40,fg);
  text(show>.3?'sand rests on the line u(x,y) = 0':'',W-70,98,30,CORAL,{align:'right',alpha:show});
  const fz=freqAt(TL,t);
  text('(n, m) =',70,1085,56,fg);text(`(${n}, ${m})`,300,1085,60,GOLD,{style:'normal',font:SERIF});
  text('f =',560,1085,56,fg);text(`${Math.round(fz)}`,640,1085,64,GOLD,{style:'normal'});text('Hz',640+ctx.measureText(String(Math.round(fz))).width*0+150,1085,48,fg);
  text(`f = f₀·(n² + m²) = 27 · ${n*n+m*m}`,70,1140,34,fg,{alpha:.85});
  drawWave(f,n,m,t,GOLD,1170,130,smooth(tt/.6));
  text(`${n*n+m*m} oscillations in 37 ms`,W-70,1150,26,GOLD,{align:'right',alpha:.9});
  sub=`${k+1} / ${MODES.length}`;
 }else{
  // sand → coloured plate → mirror lattice
  paintSprite(P);
  const cell=270,hu=inOut((t-TL.m-1.3)/3),size=PS+(cell-PS)*hu,hx=PX+PS/2+((135+270)-(PX+PS/2))*hu,hy=PY+PS/2+(675-(PY+PS/2))*hu,fade=smooth((t-TL.m)/1.3);
  if(t<TL.m+1.6){simTo(TL.ae);ctx.save();ctx.fillStyle=SAND;ctx.globalAlpha=.8*(1-fade);ctx.beginPath();for(let i=0;i<sand.N;i++)ctx.rect(PX+sand.x[i]*PS-.8,PY+sand.y[i]*PS-.8,1.7,1.7);ctx.fill();ctx.restore();}
  for(let j=0;j<5;j++)for(let i=0;i<4;i++){if(i===1&&j===2)continue;const d=Math.hypot(i-1,j-2),uu=(t-TL.m-1.6-d*.45)/1.1;if(uu<=0)continue;
   drawCell(P,135+270*i,135+270*j,cell*(.4+.6*outBack(uu)),(i-1)%2?-1:1,(j-2)%2?-1:1,smooth(uu*2));}
  drawCell(P,hx,hy,size,1,1,fade);
  if(t<TL.g){label='MIRROR REPEAT';sub='Slope is zero at a free edge: the mirror image continues without a seam';}
  else if(t<TL.c){label='WOVEN INTO THE CLOTH';sub='The figure is woven, not printed: one structure for the figure, another for the ground';}
  else{label=`${P.n.toUpperCase()} · ${WEAVES[P.wk].name.toUpperCase()}`;sub='Same frequency, new dye, new weave';}
  l1=`u(x,y) = u(−x,y) = u(2−x,y)`;l2=`(n, m) = (${FINAL[0]}, ${FINAL[1]})   f = ${freq(FINAL[0],FINAL[1])} Hz`;
  if(MODE!=='ui')brocadeOver(P);
  if(MODE==='cloth')return;
  ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();weaveOver(P,0,175,.3),weaveOver(P,1050,H,.3);
  const fa=1-smooth((t-(TL.total-OUTRO2))/1);
  if(t<TL.c){text(l1,70,1135,40,fg,{alpha:fa});text(l2,70,1235,50,gold,{style:'normal',alpha:fa});}
  else{const wv=WEAVES[P.wk];text(P.dye,70,1112,27,fg,{alpha:.85*fa});text(P.n,70,1200,76,gold,{style:'normal',alpha:fa});text(wv.name,70,1258,40,fg,{alpha:fa});text(`damask structure · figure in ${WEAVES[MOTIF_WEAVE[P.wk]].name}`,70,1298,23,fg,{alpha:.6*fa,font:SANS,style:'normal'});draft(wv,W-70,1068,fg,fa);}
 }
 if(t>=TL.a){text(label,70,t<TL.m?45:100,t<TL.m?26:34,gold,{font:SANS,style:'normal',weight:'500'});if(t>=TL.m)text(sub,70,148,27,fg,{alpha:.8});else text(sub,W-70,45,24,fg,{align:'right',alpha:.6,font:SANS,style:'normal'});}
 if(t>TL.total-OUTRO2)text('NAKIŞ — Sound and Pattern',W/2,1180,44,fg,{align:'center',alpha:smooth((t-(TL.total-OUTRO2))/1)});
 text('Hüseyin Rahmi Göktaş · Global Science Advancement',W-40,1332,22,fg,{align:'right',alpha:.5,style:'normal',font:SANS});
}

function frame(t){
 const st=pal(t);
 MODE='all';
 if(!st.B){ctx=mctx;stageFrame(st.A,t,false);return;}
 ctx=ca.getContext('2d');stageFrame(st.A,t,false);ctx=cb.getContext('2d');stageFrame(st.B,t,false);ctx=mctx;
 mctx.setTransform(1,0,0,1,0,0);mctx.globalAlpha=1;mctx.drawImage(ca,0,0);mctx.globalAlpha=st.w;mctx.drawImage(cb,0,0);mctx.globalAlpha=1;
}
// ---- player + live sound ----
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null,au=null;
function audioOn(){if(au)return;const A=new (window.AudioContext||window.webkitAudioContext)(),mg=A.createGain();mg.gain.value=0;mg.connect(A.destination);const os=[[1,1],[2,.28],[3,.12]].map(([h,a])=>{const o=A.createOscillator(),g=A.createGain();o.type='sine';g.gain.value=a;o.connect(g);g.connect(mg);o.start();return {o,h};});au={A,mg,os};}
function audioSet(t){if(!au)return;const f=freqAt(TL,t),gv=playing?gainAt(TL,t)*.35:0,T=au.A.currentTime;for(const {o,h} of au.os)o.frequency.setTargetAtTime(f*h,T,.02);au.mg.gain.setTargetAtTime(gv,T,.05);}
function show(t){now=clamp(t,0,TL.total);frame(now);audioSet(now);$('seek').value=Math.round(now/TL.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=TL.total){playing=false;$('pp').textContent='▶';audioSet(now);if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
$('pp').onclick=()=>{if(now>=TL.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';audioSet(now);};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*TL.total);};
$('snd').onclick=()=>{audioOn();au.A.resume();const on=$('snd').getAttribute('aria-pressed')!=='true';$('snd').setAttribute('aria-pressed',on);$('snd').textContent=on?'🔊 Sound on':'🔇 Sound off';if(!on&&au)au.mg.disconnect();else if(au)au.mg.connect(au.A.destination);};
$('rec').onclick=()=>{if(!window.MediaRecorder)return;const ch=[],st=cv.captureStream(30);if(au){const d=au.A.createMediaStreamDestination();au.mg.connect(d);d.stream.getAudioTracks().forEach(tr=>st.addTrack(tr));}const r=new MediaRecorder(st,{mimeType:'video/webm',videoBitsPerSecond:12e6});r.ondataavailable=e=>ch.push(e.data);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download='nakis-ses-ve-desen.webm';a.click();};rec=r;r.start();resetSim();show(0);playing=true;$('pp').textContent='⏸';};
resetSim();
window.renderAt=t=>{playing=false;show(t);return TL.total;};window.filmTotal=()=>TL.total;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
