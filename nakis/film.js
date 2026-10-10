import {TAU,COUNTS,analyze,chain,trace,relativeError} from './fourier.js';
import {palettes,motif} from './geometry.js';
import {clamp,smooth,inOut,outBack,mix,lum,timeline,partState,STEP} from './film-core.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER} from './palettes.js';

const W=1080,H=1350,CX=540,CY=610,S0=420,N=768;
const SWATCH=5.2,DRAPE=0,OUTRO=3.5,FADE=1.0;
const cv=document.getElementById('c'),mctx=cv.getContext('2d');let ctx=mctx,MODE='all';
const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d',{willReadFrequently:true});
const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=W;ca.height=cb.height=H;
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif';
const CORAL='#ff6b5e',TEAL='#4fd1c5',GOLD='#f2c14e';
let shapes,models,order,mainIdx,TL,recon=new Map();

function build(kind){
 shapes=motif(kind,8);models=shapes.map(p=>analyze(p,256));recon=new Map();
 let best=-1,area=-1;
 shapes.forEach((p,i)=>{if(!p.closed)return;const xs=p.pts.map(q=>q.x),ys=p.pts.map(q=>q.y),a=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));if(a>area){area=a;best=i;}});
 mainIdx=Math.max(0,best);order=[mainIdx,...shapes.map((_,i)=>i).filter(i=>i!==mainIdx)];
 TL=timeline(order.length-1);TL.ce=TL.s5+(HISTORIC_ORDER.length-1)*SWATCH+3.5;TL.w=TL.ce;TL.total=TL.ce+DRAPE+OUTRO;
}
function rc(i,c){const k=i+':'+c;if(!recon.has(k))recon.set(k,trace(models[i],c,N));return recon.get(k);}

const STAGES=[{...palettes.madder,ground:'#121212',n:'',dye:'',wk:null,wv:0},...HISTORIC_ORDER.map((k,i)=>({...HISTORIC[k],wk:weaveFor(i),wv:1}))];
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=mctx.createPattern(weaveTile(k,7),'repeat');
const weaveOver=(P,y0,y1)=>{if(!P.wk)return;ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=.85*P.wv;ctx.fillRect(0,y0,W,y1-y0);ctx.restore();};
/** two whole frames are cross-faded, so motif and ground never pass through the same tone */
function stagePair(t){
 if(t<TL.s4)return {A:STAGES[0],B:null,w:0};
 if(t<TL.s4e)return {A:STAGES[0],B:STAGES[1],w:smooth((t-TL.s4)/(TL.s4e-TL.s4))};
 for(let k=1;k<STAGES.length-1;k++){const c=TL.s5+k*SWATCH,u=(t-(c-FADE/2))/FADE;if(u<0)return {A:STAGES[k],B:null,w:0};if(u<1)return {A:STAGES[k],B:STAGES[k+1],w:smooth(u)};}
 return {A:STAGES[STAGES.length-1],B:null,w:0};
}
function draft(wv,x1,y0,fg,al=1){const n=Math.min(wv.P,16),c=Math.floor(150/n);if(MODE==='cloth')return;ctx.save();
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const X=x1-n*c+i*c,Y=y0+j*c;if(wv.top(i,j)){ctx.fillStyle=fg;ctx.globalAlpha=.9*al;ctx.fillRect(X,Y,c-1,c-1);}else{ctx.strokeStyle=fg;ctx.globalAlpha=.35*al;ctx.lineWidth=1;ctx.strokeRect(X+.5,Y+.5,c-2,c-2);}}
 ctx.restore();text('interlacing draft (■ warp over weft)',x1,y0+n*c+26,19,fg,{align:'right',alpha:.6*al,font:SANS,style:'normal'});}

function pathPts(pts,cx,cy,S,upto,close){ctx.beginPath();for(let i=0;i<=upto;i++){const q=pts[i];i?ctx.lineTo(cx+S*q.x,cy+S*q.y):ctx.moveTo(cx+S*q.x,cy+S*q.y);}if(close)ctx.closePath();}

function drawSet(cx,cy,S,st,pal,alpha=1){
 if(MODE==='ui')return;
 ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(1,S*.011);
 for(let i=0;i<shapes.length;i++){
  const s=st[i];if(s.p<=0)continue;const pts=rc(i,255),sh=shapes[i],col=pal[sh.tone],full=s.p>=.999;
  if(sh.fill&&sh.closed&&s.f>0){ctx.globalAlpha=alpha*s.f;ctx.fillStyle=col;pathPts(pts,cx,cy,S,N,true);ctx.fill();}
  ctx.globalAlpha=alpha;ctx.strokeStyle=col;pathPts(pts,cx,cy,S,Math.max(1,Math.floor(s.p*N)),full&&sh.closed);ctx.stroke();
 }
 ctx.restore();
}
function circles(model,count,tau,cx,cy,S,alpha=1,maxDraw=1e9){
 const p=chain(model,count,tau);ctx.save();ctx.lineWidth=1.4;
 p.links.slice(0,maxDraw).forEach(l=>{const r=l.r*S;if(r<.8)return;ctx.strokeStyle=TEAL;ctx.globalAlpha=.28*alpha;ctx.beginPath();ctx.arc(cx+S*l.x,cy+S*l.y,r,0,TAU);ctx.stroke();
  ctx.globalAlpha=.85*alpha;ctx.beginPath();ctx.moveTo(cx+S*l.x,cy+S*l.y);ctx.lineTo(cx+S*l.nx,cy+S*l.ny);ctx.stroke();});
 ctx.restore();return p;
}
function dot(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){if(MODE==='cloth')return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
function box(x,y,w,h,col){if(MODE==='cloth')return;ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(x,y,w,h,12);ctx.stroke();ctx.restore();}

function stageFrame(pal,t,wr){
 const tl=TL,bg=pal.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410',gold=dark?GOLD:'#8a5a10';
 ctx.setTransform(1,0,0,1,0,0);if(MODE!=='ui'){ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);}

 const st=shapes.map((_,i)=>{
  if(i===mainIdx)return {p:t>=tl.s1e?1:0,f:smooth((t-tl.s1e)/.8)};
  return partState(tl,t,order.indexOf(i)-1);
 });
 let label='',sub='',eq1='',eq2='',err=null;

 if(t<tl.s1){ // intro
  const a=smooth(t/1.2)*(1-smooth((t-2)/.5));
  text('NAKIŞ',CX,CY-10,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});
  text('The Geometry of Transformation',CX,CY+60,46,fg,{align:'center',alpha:a});
  text('nakış: Turkish for pattern and embroidery',CX,CY+112,22,fg,{align:'center',alpha:a*.45,font:SANS,style:'normal'});
 }else if(t<tl.s1e){ // Fourier steps on the main contour
  const k=Math.min(COUNTS.length-1,Math.floor((t-tl.s1)/STEP)),u=(t-tl.s1)/STEP-k,c=COUNTS[k],M=models[mainIdx],end=M.closed?1:.5;
  const grow=smooth(u/.1),tau=inOut((u-.1)/.78),tt=tau*end;
  ctx.save();ctx.setLineDash([6,10]);ctx.strokeStyle='#fff';ctx.globalAlpha=.1;ctx.lineWidth=1.5;pathPts(rc(mainIdx,255),CX,CY,S0,N,true);ctx.stroke();ctx.restore();
  if(k>0){ctx.save();ctx.strokeStyle=CORAL;ctx.globalAlpha=.4;ctx.lineWidth=2.5;pathPts(rc(mainIdx,COUNTS[k-1]),CX,CY,S0,N,true);ctx.stroke();ctx.restore();}
  const tr=rc(mainIdx,c),upto=Math.floor(tau*N);
  ctx.save();ctx.strokeStyle=GOLD;ctx.lineWidth=4;ctx.lineJoin='round';pathPts(tr,CX,CY,S0,Math.max(1,upto),tau>=.999);ctx.stroke();ctx.restore();
  const p=circles(M,c,tt,CX,CY,S0,grow);dot(CX+S0*p.x,CY+S0*p.y,7,GOLD);
  label='FROM CIRCLES TO FLOWER';sub='Each circle turns at constant speed; the tip of the chain draws the motif';
  eq1='f(t) = c₀ + Σ cₖ exp(2πikt)';eq2=`n = ${c}`;err=relativeError(M,c);
 }else if(t<tl.s3){ // remaining contours
  const j=clamp(Math.floor((t-tl.s2-.5)/1.3),0,order.length-2),i=order[j+1],s=st[i];
  if(s.p>0&&s.p<1){const M=models[i],p=circles(M,255,s.p*(M.closed?1:.5),CX,CY,S0,.8,12);dot(CX+S0*p.x,CY+S0*p.y,6,GOLD);}
  label='EVERY LINE HAS ITS OWN CIRCLES';sub=`Part ${Math.min(j+1,order.length-1)} / ${order.length-1}`;
  eq1='f(t) = c₀ + Σ cₖ exp(2πikt)';eq2='n = 255';
 }
 // the motif itself (hero) and, from the multiplication phase on, the lattice
 const w=300,h=375,q=w*.42;
 if(t<tl.s3)drawSet(CX,CY,S0,st,pal);
 else{
  const hu=inOut((t-tl.s3)/3),S=S0+(q-S0)*hu,hy=CY+(675-CY)*hu;
  const all=shapes.map(()=>({p:1,f:1}));
  for(let m=-4;m<=4;m++)for(let n=-5;n<=5;n++){
   if(!m&&!n)continue;
   const d=Math.hypot(m,n),u=(t-tl.s3-1.2-d*.45)/1.2;if(u<=0)continue;
   const x=390+(m+.5)*w,y=487.5+(n+.5)*h+(Math.abs(m%2)===1?h/2:0);
   drawSet(x,y,q*outBack(u),all,pal,smooth(u*2));
  }
  drawSet(CX,hy,S,all,pal);
  if(t<tl.s4){label='REPEAT';sub='Half-drop repeat: every other column shifts down by half a height';}
  else if(t<tl.s5){label='CLOTH GROUND';sub='The repeated motif becomes a woven surface';}
  else{label=`${pal.n.toUpperCase()} · ${WEAVES[pal.wk].name.toUpperCase()}`;sub='Same geometry, new dye, new weave';}
  eq1='pₘₙ = q + (w(m+½), h(n+½) + ½h·(m mod 2))';eq2='m, n ∈ ℤ';
 }

 if(MODE!=='ui'&&t>=tl.s3)weaveOver(pal,0,H);
 if(MODE==='cloth')return;
 // typography
 if(t>=tl.s1){
  const panel=t>=tl.s3;
  if(panel){ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();if(MODE==='all')weaveOver(pal,0,175),weaveOver(pal,1050,H);}
  text(label,70,100,34,GOLD,{font:SANS,style:'normal',weight:'500'});
  text(sub,70,148,30,fg,{alpha:.8});
  const fa=1-smooth((t-(TL.total-OUTRO))/1);
  if(eq1&&t<tl.s5){text(eq1,70,1135,44,fg,{alpha:fa});text(eq2,70,1235,84,t>=tl.s3?gold:CORAL,{style:'normal',alpha:fa});}
  else if(t>=tl.s5){const wv=WEAVES[pal.wk];text(pal.dye,70,1112,27,fg,{alpha:.85*fa});text(pal.n,70,1200,76,gold,{style:'normal',alpha:fa});text(wv.name,70,1258,40,fg,{alpha:fa});text(wv.spec,70,1298,23,fg,{alpha:.6*fa,font:SANS,style:'normal'});draft(wv,W-70,1068,fg,fa);}
  if(err!==null){const s=`ε = ${err.toFixed(2)} %`;text(s,W-90,1235,60,gold,{align:'right'});ctx.save();ctx.font=`italic 60px ${SERIF}`;const bw=ctx.measureText(s).width;ctx.restore();box(W-90-bw-24,1178,bw+48,82,gold);}
  if(err!==null&&t>tl.s1+(COUNTS.length-1)*STEP+STEP*.85)text('exact match at 256 sample points',W-70,1290,26,fg,{align:'right',alpha:.7});
 }
 if(t>tl.total-OUTRO){const a=smooth((t-(tl.total-OUTRO))/1);text('NAKIŞ — The Geometry of Transformation',CX,1180,44,fg,{align:'center',alpha:a});}
 text('Hüseyin Rahmi Göktaş · Global Science Advancement',W-40,1328,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}

function frame(t){
 const st=stagePair(t);
 MODE='all';
 if(!st.B){ctx=mctx;stageFrame(st.A,t,false);return;}
 ctx=ca.getContext('2d');stageFrame(st.A,t,false);ctx=cb.getContext('2d');stageFrame(st.B,t,false);ctx=mctx;
 mctx.setTransform(1,0,0,1,0,0);mctx.globalAlpha=1;mctx.drawImage(ca,0,0);mctx.globalAlpha=st.w;mctx.drawImage(cb,0,0);mctx.globalAlpha=1;
}
// ---- player ----
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null;
function show(t){now=clamp(t,0,TL.total);frame(now);$('seek').value=Math.round(now/TL.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} / ${Math.floor(TL.total/60)}:${String(Math.floor(TL.total%60)).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=TL.total){playing=false;$('pp').textContent='▶';if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
$('pp').onclick=()=>{if(now>=TL.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*TL.total);};
$('kind').onchange=e=>{build(e.target.value);now=0;playing=true;$('pp').textContent='⏸';};
$('rec').onclick=()=>{
 if(!window.MediaRecorder){alert('This browser cannot record.');return;}
 const chunks=[],r=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:12e6});
 r.ondataavailable=e=>chunks.push(e.data);
 r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download='nakis-film.webm';a.click();};
 rec=r;r.start();show(0);playing=true;$('pp').textContent='⏸';
};
build(new URLSearchParams(location.search).get('kind')||'tulip');
$('kind').value=new URLSearchParams(location.search).get('kind')||'tulip';
window.renderAt=t=>{playing=false;show(t);return TL.total;};
window.filmTotal=()=>TL.total;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
