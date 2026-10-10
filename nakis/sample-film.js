import {RULES,build} from './iter-core.js';
import {clamp,smooth,inOut,outBack,mix,lum} from './film-core.js';
import {WEAVES,WEAVE_ORDER,MOTIF_WEAVE,weaveFor,weaveTile} from './weave.js';
import {HISTORIC,HISTORIC_ORDER} from './palettes.js';
import {brocadeOver as brocade} from './cloth.js';

const W=1080,H=1350,CX=540,CY=640,SEED=1.2,STEPN=2.2,INTRO=3,MULT=8,GROUND=5,SWATCH=5.2,DRAPE=0,OUTRO=3.5;
const cv=document.getElementById('c'),mctx=cv.getContext('2d');let ctx=mctx;
const oc=document.createElement('canvas');oc.width=W;oc.height=H;const octx=oc.getContext('2d');
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif',GOLD='#f2c14e',CORAL='#ff6b5e';
const CURVES={
 levy:{rule:'levy',arms:4,col:'#ff6b5e',title:'Lévy C Curve',max:8,blurb:'Each segment becomes two smaller ones, joined at a right angle'},
 dragon:{rule:'dragon',arms:4,col:'#4fd1c5',title:'Dragon Curve',max:8,blurb:'Folds alternate direction; four arms tile the plane without gaps'},
 twin:{rule:'dragon',arms:2,col:'#f1ece0',title:'Twin Dragon',max:8,blurb:'Two dragons grow back to back from one point'},
 terdragon:{rule:'terdragon',arms:4,col:'#f2c14e',title:'Terdragon',max:7,blurb:'Each segment becomes three smaller ones, turning 120°'}
};
const P0={n:'',dye:'',ground:'#121212',ink:'#efe6d2',accent:'#e0a84a',soft:'#5fb8c8',wk:null,wv:0};
const STAGES=[P0,...HISTORIC_ORDER.map((k,i)=>({...HISTORIC[k],wk:weaveFor(i),wv:1}))];
const key=new URLSearchParams(location.search).get('c'),CK=CURVES[key]?key:'dragon',C=CURVES[CK],R=RULES[C.rule],MAXN=C.max;
const T={a:INTRO};T.ae=T.a+SEED+MAXN*STEPN+1;T.m=T.ae;T.me=T.m+MULT;T.g=T.me;T.ge=T.g+GROUND;T.c=T.ge;T.ce=T.c+(STAGES.length-2)*SWATCH+3.5;T.w=T.ce;T.we=T.w+DRAPE;T.total=T.we+OUTRO;
const cache=new Map();
const arms=N=>{if(!cache.has(N))cache.set(N,build(R,N,C.arms));return cache.get(N);};
let bx,by,half;{const all=arms(MAXN).flatMap(a=>a.full);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of all){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}bx=(x0+x1)/2;by=(y0+y1)/2;half=Math.max(x1-x0,y1-y0)/2;}
const tiles={};for(const k of WEAVE_ORDER)tiles[k]=mctx.createPattern(weaveTile(k,7),'repeat');

const FADE=1.0;
/** stage pair and crossfade weight at time t: whole frames are blended, so motif and ground never pass through the same tone */
function pal(t){
 if(t<T.g)return {A:STAGES[0],B:null,w:0};
 if(t<T.ge)return {A:STAGES[0],B:STAGES[1],w:smooth((t-T.g)/(T.ge-T.g))};
 for(let k=1;k<STAGES.length-1;k++){const c=T.c+k*SWATCH,u=(t-(c-FADE/2))/FADE;if(u<0)return {A:STAGES[k],B:null,w:0};if(u<1)return {A:STAGES[k],B:STAGES[k+1],w:smooth(u)};}
 return {A:STAGES[STAGES.length-1],B:null,w:0};
}
function stroke(A,u,cx,cy,s,colors,lw,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
 const path=a=>{for(let i=0;i<a.full.length;i++){const p=a.flat[i],q=a.full[i],x=p[0]+(q[0]-p[0])*u,y=p[1]+(q[1]-p[1])*u,X=cx+s*(x-bx),Y=cy-s*(y-by);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}};
 if(typeof colors==='string'){ctx.strokeStyle=colors;ctx.beginPath();A.forEach(path);ctx.stroke();}
 else A.forEach((a,i)=>{ctx.strokeStyle=colors[i%colors.length];ctx.beginPath();path(a);ctx.stroke();});
 ctx.restore();
}
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const fmt=n=>n.toLocaleString('en-US');
function overlay(P){if(!P.wk)return;ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=.85*P.wv;ctx.fillRect(0,0,W,H);ctx.restore();}
/** interlacing draft: filled square = warp thread over weft */
function draft(wv,x1,y0,fg,al=1){const n=Math.min(wv.P,16),c=Math.floor(150/n);ctx.save();
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const X=x1-n*c+i*c,Y=y0+j*c;if(wv.top(i,j)){ctx.fillStyle=fg;ctx.globalAlpha=.9*al;ctx.fillRect(X,Y,c-1,c-1);}else{ctx.strokeStyle=fg;ctx.globalAlpha=.35*al;ctx.lineWidth=1;ctx.strokeRect(X+.5,Y+.5,c-2,c-2);}}
 ctx.restore();text('interlacing draft (■ warp over weft)',x1,y0+n*c+26,19,fg,{align:'right',alpha:.6*al,font:SANS,style:'normal'});}


function cloth(P,t){ // the woven cloth with the motif, no captions
 const bg=P.ground,S0=400/half,tones=[P.ink,P.accent,P.soft,P.ink];
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(t<T.a||t<T.m&&false)return;
 if(t<T.m){const tt=t-T.a,N=tt<SEED?0:Math.min(MAXN,1+Math.floor((tt-SEED)/STEPN)),u=N?inOut(((tt-SEED)-(N-1)*STEPN)/(STEPN*.8)):1,segPx=S0*Math.pow(R.ratio,N);
  stroke(arms(N),u,CX,CY,S0,C.col===undefined?P.ink:C.col,Math.max(1.6,Math.min(3.6,.3*segPx)));return;}
 const w=300,h=375,q=Math.min(.46*w/half,.46*h/half),hu=inOut((t-T.m)/3),S=S0+(q-S0)*hu,hy=CY+(675-CY)*hu,lw=Math.max(1.5,Math.min(2.8,.3*q*Math.pow(R.ratio,MAXN)));
 const A=arms(MAXN);
 for(let m=-4;m<=4;m++)for(let n=-5;n<=5;n++){if(!m&&!n)continue;const d=Math.hypot(m,n),u=(t-T.m-1.2-d*.45)/1.2;if(u<=0)continue;
  const x=390+(m+.5)*w,y=487.5+(n+.5)*h+(Math.abs(m%2)===1?h/2:0);stroke(A,1,x,y,q*outBack(u),tones,lw,smooth(u*2));}
 stroke(A,1,CX,hy,S,tones,Math.max(lw,Math.min(3.4,.3*S*Math.pow(R.ratio,MAXN))),1);
 brocade(ctx,W,H,P);
}
function ui(P,t,wr){ // captions, bars, draft
 const bg=P.ground,dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410',gold=dark?GOLD:'#8a5a10',S0=400/half;
 const fa=1-smooth((t-(T.total-OUTRO))/1);
 if(t<T.a){const a=smooth(t/1.2)*(1-smooth((t-(T.a-.5))/.5));text('NAKIŞ',CX,CY-40,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text(C.title,CX,CY+30,58,fg,{align:'center',alpha:a});text('The Geometry of the Fold',CX,CY+86,26,fg,{align:'center',alpha:a*.6,font:SANS,style:'normal'});text('nakış: Turkish for pattern and embroidery',CX,CY+130,22,fg,{align:'center',alpha:a*.45,font:SANS,style:'normal'});}
 else{
  let label,sub;
  if(t<T.m){
   const tt=t-T.a,N=tt<SEED?0:Math.min(MAXN,1+Math.floor((tt-SEED)/STEPN));
   label=C.title.toUpperCase();sub=C.blurb;
   const parts=C.arms*R.m**N,l1=`N = ${N}`,l3=`segments: ${C.arms}·${R.m}${sup(N)} = ${fmt(parts)}`;
   const l2=R.m===2?`ℓ = (1/√2)${sup(N)} = 1/${fmt(Math.round(Math.pow(Math.SQRT2,N)*100)/100)}`:`ℓ = (1/√3)${sup(N)} = 1/${fmt(Math.round(Math.pow(Math.sqrt(3),N)*100)/100)}`;
   const dline=`d = ln ${R.m} / ln(1/r) = ${R.m===2?'ln 2 / ln √2':'ln 3 / ln √3'} = 2`;
   text(label,70,100,32,gold,{font:SANS,style:'normal',weight:'500'});text(sub,70,148,27,fg,{alpha:.8});
   text(l1,70,1235,84,CORAL,{style:'normal'});text(l3,70,1135,36,fg);text(l2,W-70,1235,40,fg,{align:'right',alpha:.9});text(dline,W-70,1290,26,GOLD,{align:'right',alpha:.9});
  }else{
   ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();
   if(!wr&&P.wk)overlay2(P);
   const rep=t<T.g,grd=t<T.c;
   if(grd){label=rep?'REPEAT':'WOVEN INTO THE CLOTH';sub=rep?'Half-drop repeat: every other column shifts down by half a height':'The figure is woven, not printed: one structure for the figure, another for the ground';
    text('pₘₙ = q + (w(m+½), h(n+½) + ½h·(m mod 2))',70,1135,40,fg,{alpha:fa});text('m, n ∈ ℤ',70,1235,84,gold,{style:'normal',alpha:fa});}
   else{label=`${P.n.toUpperCase()} · ${WEAVES[P.wk].name.toUpperCase()}`;sub='Same geometry, new dye, new weave';
    const wv=WEAVES[P.wk];text(P.dye,70,1112,27,fg,{alpha:.85*fa});text(P.n,70,1200,76,gold,{style:'normal',alpha:fa});text(wv.name,70,1258,40,fg,{alpha:fa});text(`damask structure · figure in ${WEAVES[MOTIF_WEAVE[P.wk]].name}`,70,1298,23,fg,{alpha:.6*fa,font:SANS,style:'normal'});
    draft(wv,W-70,1068,fg,fa);}
   text(label,70,100,32,gold,{font:SANS,style:'normal',weight:'500'});text(sub,70,148,27,fg,{alpha:.8});
  }
 }
 if(t>T.total-OUTRO)text('NAKIŞ — '+C.title,CX,1180,44,fg,{align:'center',alpha:smooth((t-(T.total-OUTRO))/1)});
 text('Hüseyin Rahmi Göktaş · Global Science Advancement',W-40,1332,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}
function overlay2(P){ // weave texture over the caption bars too
 ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle=tiles[P.wk];ctx.globalAlpha=.3*P.wv;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();}
const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=W;ca.height=cb.height=H;
function full(c,P,t){ctx=c.getContext('2d');cloth(P,t);ui(P,t,false);}
function frame(t){
 const st=pal(t);
 if(!st.B){ctx=mctx;cloth(st.A,t);ui(st.A,t,false);return;}
 full(ca,st.A,t);full(cb,st.B,t);
 mctx.setTransform(1,0,0,1,0,0);mctx.globalAlpha=1;mctx.drawImage(ca,0,0);mctx.globalAlpha=st.w;mctx.drawImage(cb,0,0);mctx.globalAlpha=1;
}
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null;
function show(t){now=clamp(t,0,T.total);frame(now);$('seek').value=Math.round(now/T.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=T.total){playing=false;$('pp').textContent='▶';if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
$('m').value=CK;$('m').onchange=e=>{location.search='?c='+e.target.value;};
$('pp').onclick=()=>{if(now>=T.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*T.total);};
$('rec').onclick=()=>{if(!window.MediaRecorder)return;const ch=[],r=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:12e6});r.ondataavailable=e=>ch.push(e.data);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download=`nakis-sample-${CK}.webm`;a.click();};rec=r;r.start();show(0);playing=true;$('pp').textContent='⏸';};
window.renderAt=t=>{playing=false;show(t);return T.total;};window.filmTotal=()=>T.total;window.TL=T;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
