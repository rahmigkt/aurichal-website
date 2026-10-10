import {MOTIFS} from './motifs.js';
import {clamp,smooth,inOut,outBack,mix,lum} from './film-core.js';
import {pathLen} from './prim.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER} from './palettes.js';
import {brocadeOver as brocade} from './cloth.js';

const W=1080,H=1350,CX=540,CY=640,STEP=2.4,INTRO=2.5,HOLD=1.4,GROUND=5,SWATCH=5.2,DRAPE=0,OUTRO=3.5,FADE=1.0;
const cv=document.getElementById('c'),mctx=cv.getContext('2d');let ctx=mctx,MODE='all';
const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d',{willReadFrequently:true});
const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=W;ca.height=cb.height=H;
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e';
const P0={ink:'#efe6d2',accent:'#e0a84a',soft:'#5fb8c8',ground:'#3a4a6a',paper:'#f7f2e6'};
const STAGE0=()=>({...P0,...(M.p0||{}),n:'',dye:'',wk:null,wv:0});
const STAGES=()=>[STAGE0(),...HISTORIC_ORDER.map((k,i)=>({...HISTORIC[k],paper:mix(HISTORIC[k].ground,HISTORIC[k].ink,.22),wk:weaveFor(i),wv:1}))];
let ST;
const id=new URLSearchParams(location.search).get('m');
let M,cache,bb,TL;
/** two whole frames are cross-faded, so motif and ground never pass through the same tone */
const pal=(t)=>{
 if(t<TL.g)return {A:ST[0],B:null,w:0};
 if(t<TL.ge)return {A:ST[0],B:ST[1],w:smooth((t-TL.g)/GROUND)};
 for(let k=1;k<ST.length-1;k++){const c=TL.c+k*SWATCH,u=(t-(c-FADE/2))/FADE;if(u<0)return {A:ST[k],B:null,w:0};if(u<1)return {A:ST[k],B:ST[k+1],w:smooth(u)};}
 return {A:ST[ST.length-1],B:null,w:0};
};
function shapesAt(n){if(!cache.has(n))cache.set(n,M.build(n));return cache.get(n);}
function bboxOf(shs){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const s of shs)for(const p of s.pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}return {cx:(x0+x1)/2,cy:(y0+y1)/2,hw:(x1-x0)/2,hh:(y1-y0)/2};}
function setup(k){
 M=MOTIFS[k];cache=new Map();const fin=shapesAt(M.counts.at(-1));bb=bboxOf(fin);
 const nSteps=M.counts.length,a=INTRO,ae=a+nSteps*STEP+HOLD,m=ae,me=m+(M.noRepeat?0:8),g=me,ge=g+GROUND,c=ge,ce=c+(HISTORIC_ORDER.length-1)*SWATCH+3.5;
 TL={a,ae,m,me,g,ge,c,ce,w:ce,we:ce+DRAPE,total:ce+DRAPE+OUTRO};ST=STAGES();
}
const lerpPts=(A,B,u)=>B.map((p,i)=>{const q=A[i]||p;return [q[0]+(p[0]-q[0])*u,q[1]+(p[1]-q[1])*u];});
const sup=n=>String(n);
function toScreen(p,cx,cy,s){return [cx+s*(p[0]-bb.cx),cy-s*(p[1]-bb.cy)];}
function drawShape(sh,pts,cx,cy,s,P,alpha,prog=1){
 if(alpha<=0||prog<=0||MODE==='ui')return;
 const col=P[sh.tone],ec=P[sh.edge||sh.tone];ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(1.1,s*(sh.edge?.004:.0075));
 const n=pts.length,upto=sh.fill?n-1:Math.max(1,Math.floor((n-1)*prog));
 ctx.beginPath();for(let i=0;i<=upto;i++){const [x,y]=toScreen(pts[i],cx,cy,s);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
 if(sh.closed&&prog>=.999)ctx.closePath();
 if(sh.fill){
  if(sh.tone2){let y0=1e9,y1=-1e9;for(const p of pts){const y=toScreen(p,cx,cy,s)[1];y0=Math.min(y0,y);y1=Math.max(y1,y);}const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,col);g.addColorStop(1,P[sh.tone2]);ctx.fillStyle=g;}else ctx.fillStyle=col;
  ctx.globalAlpha=alpha*smooth(prog*1.4-.2);ctx.fill();ctx.globalAlpha=alpha;
 }
 ctx.strokeStyle=sh.tone2?P[sh.tone2]:ec;ctx.stroke();ctx.restore();
}
function centroid(p){let x=0,y=0;for(const q of p){x+=q[0];y+=q[1];}return [x/p.length,y/p.length];}
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){if(MODE==='cloth')return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=mctx.createPattern(weaveTile(k,7),'repeat');
const weaveOver=(P,y0,y1,al=.85)=>{if(!P.wk)return;ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=al*P.wv;ctx.fillRect(0,y0,W,y1-y0);ctx.restore();};
function stageFrame(P,t,wr){
 const bg=P.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410';
 ctx.setTransform(1,0,0,1,0,0);if(MODE!=='ui'){ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);}
 const S0=Math.min(400/bb.hw,470/bb.hh);let label='',sub='',l1='',l2='';
 if(t<TL.a){const a=smooth(t/1.2)*(1-smooth((t-2)/.5));text('NAKIŞ',CX,CY-40,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text(M.title,CX,CY+30,56,fg,{align:'center',alpha:a});text(M.tag,CX,CY+90,26,fg,{align:'center',alpha:a*.6,font:SANS,style:'normal'});}
 else if(t<TL.m||M.noRepeat&&t<TL.g){
  const tt=Math.min(t,TL.ae)-TL.a,k=clamp(Math.floor(tt/STEP),0,M.counts.length-1),u=inOut((tt-k*STEP)/(STEP*.6)),n=M.counts[k],cur=shapesAt(n);
  let sc=S0,cx=CX,cy=CY;
  if(M.fit==='auto'){const bk=bboxOf(cur),R=k?bboxOf(shapesAt(M.counts[k-1])):bk,fitK=Math.min(400/bk.hw,470/bk.hh),fitP=Math.min(400/R.hw,470/R.hh);sc=fitP+(fitK-fitP)*u;if(t>=TL.ae){sc=fitK*(1+smooth((t-TL.ae)/Math.max(.1,TL.g-TL.ae||1))*0);}}
  if(k===0){cur.forEach((sh,i)=>{const p=smooth((tt-i*.06)/.9);drawShape(sh,sh.pts,cx,cy,sc,P,Math.min(1,p*2),p);});}
  else{
   const prev=new Map(shapesAt(M.counts[k-1]).map(s=>[s.id,s]));
   const curIds=new Set(cur.map(s=>s.id));
   for(const [i,s] of prev)if(!curIds.has(i))drawShape(s,s.pts,cx,cy,sc,P,1-u);
   cur.forEach(sh=>{const o=prev.get(sh.id);
    if(o&&o.pts.length===sh.pts.length)drawShape(sh,lerpPts(o.pts,sh.pts,u),cx,cy,sc,P,1);
    else{const c=centroid(sh.pts),pts=sh.pts.map(p=>[c[0]+(p[0]-c[0])*(.3+.7*u),c[1]+(p[1]-c[1])*(.3+.7*u)]);drawShape(sh,pts,cx,cy,sc,P,smooth(u*1.5),u);}});
  }
  label=M.title.toUpperCase();sub=M.blurb;const f=M.f(n);l1=f[0];l2=f[1];var l3=f[2];
  if(t>=TL.m){ /* noRepeat zoom handled by fit */ }
  text(l3||'',W-70,1235,34,GOLD,{align:'right',alpha:t<TL.m?1:0});
 }else{
  const w=300,h=375,q=Math.min(.46*w/bb.hw,.46*h/bb.hh),hu=inOut((t-TL.m)/3),S=S0+(q-S0)*hu,hy=CY+(675-CY)*hu,all=shapesAt(M.counts.at(-1));
  if(!M.noRepeat)for(let m=-4;m<=4;m++)for(let n=-5;n<=5;n++){if(!m&&!n)continue;const d=Math.hypot(m,n),u=(t-TL.m-1.2-d*.45)/1.2;if(u<=0)continue;
   const x=390+(m+.5)*w,y=487.5+(n+.5)*h+(Math.abs(m%2)===1?h/2:0),sc=q*outBack(u);all.forEach(sh=>drawShape(sh,sh.pts,x,y,sc,P,smooth(u*2)));}
  if(M.noRepeat){const fk=Math.min(400/bb.hw,470/bb.hh);const z=1+1.0*smooth((t-TL.ae)/ (TL.g-TL.ae+GROUND));all.forEach(sh=>drawShape(sh,sh.pts,CX,CY,fk*z,P,1));}
  else all.forEach(sh=>drawShape(sh,sh.pts,CX,hy,S,P,1));
  if(t<TL.g){label='REPEAT';sub='Half-drop repeat: every other column shifts down by half a height';}
  else if(t<TL.c){label='WOVEN INTO THE CLOTH';sub='The figure is woven, not printed: one structure for the figure, another for the ground';}
  else{label=`${P.n.toUpperCase()} · ${WEAVES[P.wk].name.toUpperCase()}`;sub='Same geometry, new dye, new weave';}
  l1=M.noRepeat?'pₘₙ = 2a(m + n/2,  n·√3/2)':'pₘₙ = q + (w(m+½), h(n+½) + ½h·(m mod 2))';l2='m, n ∈ ℤ';
 }
 if(t>=TL.a)brocade(ctx,W,H,P);
 if(MODE==='cloth')return;
 if(t>=TL.a){
  if(t>=TL.m){ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();if(MODE==='all'&&t>=TL.a)weaveOver(P,0,175,.3),weaveOver(P,1050,H,.3);}
  text(label,70,100,34,GOLD,{font:SANS,style:'normal',weight:'500'});text(sub,70,148,27,fg,{alpha:.8});
  const fa=1-smooth((t-(TL.total-OUTRO))/1);
  if(t<TL.m){text(l1,70,1135,40,fg,{alpha:fa});text(l2,70,1235,84,CORAL,{style:'normal',alpha:fa});}
  else if(t<TL.c){text(l1,70,1135,40,fg,{alpha:fa});text(l2,70,1235,84,dark?GOLD:'#8a5a10',{style:'normal',alpha:fa});}
  else{const wv=WEAVES[P.wk],gold=dark?GOLD:'#8a5a10';text(P.dye,70,1112,27,fg,{alpha:.85*fa});text(P.n,70,1200,76,gold,{style:'normal',alpha:fa});text(wv.name,70,1258,40,fg,{alpha:fa});text(`damask structure · figure in ${WEAVES[MOTIF_WEAVE[P.wk]].name}`,70,1298,23,fg,{alpha:.6*fa,font:SANS,style:'normal'});
   draft(wv,W-70,1068,fg,fa);}
 }
 if(t>TL.total-OUTRO)text('NAKIŞ — '+M.title,CX,1180,44,fg,{align:'center',alpha:smooth((t-(TL.total-OUTRO))/1)});
 text('Hüseyin Rahmi Göktaş · Global Science Advancement',W-40,1328,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}
function draft(wv,x1,y0,fg,al=1){const n=Math.min(wv.P,16),c=Math.floor(150/n);if(MODE==='cloth')return;ctx.save();
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const X=x1-n*c+i*c,Y=y0+j*c;if(wv.top(i,j)){ctx.fillStyle=fg;ctx.globalAlpha=.9*al;ctx.fillRect(X,Y,c-1,c-1);}else{ctx.strokeStyle=fg;ctx.globalAlpha=.35*al;ctx.lineWidth=1;ctx.strokeRect(X+.5,Y+.5,c-2,c-2);}}
 ctx.restore();text('interlacing draft (■ warp over weft)',x1,y0+n*c+26,19,fg,{align:'right',alpha:.6*al,font:SANS,style:'normal'});}
function frame(t){
 const st=pal(t);
 MODE='all';
 if(!st.B){ctx=mctx;stageFrame(st.A,t,false);return;}
 ctx=ca.getContext('2d');stageFrame(st.A,t,false);ctx=cb.getContext('2d');stageFrame(st.B,t,false);ctx=mctx;
 mctx.setTransform(1,0,0,1,0,0);mctx.globalAlpha=1;mctx.drawImage(ca,0,0);mctx.globalAlpha=st.w;mctx.drawImage(cb,0,0);mctx.globalAlpha=1;
}
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null;
function show(t){now=clamp(t,0,TL.total);frame(now);$('seek').value=Math.round(now/TL.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=TL.total){playing=false;$('pp').textContent='▶';if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
const sel=$('m');for(const [k,v] of Object.entries(MOTIFS)){const o=document.createElement('option');o.value=k;o.textContent=`${v.tag} · ${v.title}`;sel.appendChild(o);}
const start=MOTIFS[id]?id:Object.keys(MOTIFS)[0];sel.value=start;setup(start);
sel.onchange=e=>{setup(e.target.value);history.replaceState(null,'','?m='+e.target.value);now=0;playing=true;$('pp').textContent='⏸';};
$('pp').onclick=()=>{if(now>=TL.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*TL.total);};
$('rec').onclick=()=>{if(!window.MediaRecorder)return;const ch=[],r=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:12e6});r.ondataavailable=e=>ch.push(e.data);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download=`nakis-${sel.value}.webm`;a.click();};rec=r;r.start();show(0);playing=true;$('pp').textContent='⏸';};
window.renderAt=t=>{playing=false;show(t);return TL.total;};window.filmTotal=()=>TL.total;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
