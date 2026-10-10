import {TAU} from './fourier.js';
import {palettes} from './geometry.js';
import {RULES,build} from './iter-core.js';
import {clamp,smooth,inOut,outBack,mix,lum,paletteAt,PALETTE_ORDER,SWATCH} from './film-core.js';

const W=1080,H=1350,CX=540,CY=610;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const SERIF='"Cormorant Garamond","Times New Roman",Georgia,serif',SANS='Poppins,system-ui,-apple-system,"Segoe UI",sans-serif';
const GOLD='#f2c14e',MAXN=8,SEED=1.2,STEPN=1.9;
const PANELS=[
 {rule:'levy',arms:4,col:'#ff6b5e',cx:300,cy:410,label:'Lévy C eğrisi'},
 {rule:'dragon',arms:4,col:'#4fd1c5',cx:780,cy:410,label:'Ejderha eğrisi'},
 {rule:'dragon',arms:2,col:'#f1ece0',cx:300,cy:880,label:'İkiz ejderha'},
 {rule:'terdragon',arms:4,col:GOLD,cx:780,cy:880,label:'Terdragon'}
];
const T={intro:2.5};T.a=T.intro;T.ae=T.a+SEED+MAXN*STEPN;T.pk=T.ae;T.pke=T.pk+3;T.m=T.pke;T.me=T.m+8;T.g=T.me;T.ge=T.g+5;T.c=T.ge;T.ce=T.c+(PALETTE_ORDER.length-1)*SWATCH;T.total=T.ce+3;
const TL={s5:T.c,s5e:T.ce};
const cache=new Map();
function arms(p,N){const k=p.rule+p.arms+':'+N;if(!cache.has(k))cache.set(k,build(RULES[p.rule],N,p.arms));return cache.get(k);}
for(const p of PANELS){const all=arms(p,MAXN).flatMap(a=>a.full);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of all){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}p.bx=(x0+x1)/2;p.by=(y0+y1)/2;p.half=Math.max(x1-x0,y1-y0)/2;p.s=195/p.half;}
const dragon=PANELS[1];

function strokeArm(pts,u,flat,cx,cy,s,bx,by){ // morph between flat and full
 for(let i=0;i<pts.length;i++){const a=flat[i],b=pts[i],x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,X=cx+s*(x-bx),Y=cy+s*(y-by);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
}
function drawCurve(p,N,u,cx,cy,s,colors,lw,alpha=1){
 const A=arms(p,N);ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
 if(typeof colors==='string'){ctx.strokeStyle=colors;ctx.beginPath();for(const a of A)strokeArm(a.full,u,a.flat,cx,cy,s,p.bx,p.by);ctx.stroke();}
 else A.forEach((a,i)=>{ctx.strokeStyle=colors[i%colors.length];ctx.beginPath();strokeArm(a.full,u,a.flat,cx,cy,s,p.bx,p.by);ctx.stroke();});
 ctx.restore();
}
function text(s,x,y,size,col,{font=SERIF,style='italic',align='left',alpha=1,weight=''}={}){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.textAlign=align;ctx.font=`${style} ${weight} ${size}px ${font}`;ctx.fillText(s,x,y);ctx.restore();}
const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const weave=(()=>{const c=document.createElement('canvas');c.width=c.height=6;const g=c.getContext('2d');g.fillStyle='rgba(255,255,255,.05)';g.fillRect(0,0,6,3);g.fillStyle='rgba(0,0,0,.07)';g.fillRect(0,3,3,3);g.fillRect(3,0,3,3);return c;})();

function frame(t){
 const pal=paletteAt(TL,t,palettes),g=smooth((t-T.g)/(T.ge-T.g)),bg=mix('#121212',pal.ground,g),dark=lum(bg)<.55,fg=dark?'#efe6d2':'#1a1410';
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(g>0){ctx.save();ctx.globalAlpha=g;ctx.fillStyle=ctx.createPattern(weave,'repeat');ctx.fillRect(0,0,W,H);ctx.restore();}
 let label='',sub='',l1='',l2='';
 const tones=[pal.ink,pal.accent,pal.soft,pal.ink];
 if(t<T.a){const a=smooth(t/1.2)*(1-smooth((t-2)/.5));text('NAKIŞ',CX,CY-10,150,GOLD,{align:'center',alpha:a,style:'normal',weight:'500'});text('Kıvrımın Geometrisi',CX,CY+60,46,fg,{align:'center',alpha:a});}
 else if(t<T.pke){
  const tt=t-T.a,N=tt<SEED?0:Math.min(MAXN,1+Math.floor((tt-SEED)/STEPN)),u=N?inOut(((tt-SEED)-(N-1)*STEPN)/(STEPN*.8)):1,pk=clamp((t-T.pk)/3);
  PANELS.forEach(p=>{
   const isD=p===dragon,fade=isD?1:1-smooth(pk/.35);if(fade<=0)return;
   const e=isD?inOut(clamp((pk-.25)/.7)):0,cx=p.cx+(CX-p.cx)*e,cy=p.cy+(CY-p.cy)*e,s=p.s+(380/p.half-p.s)*e;
   const col=isD&&e>0?mix(p.col,'#ead5b1',smooth(pk)):p.col;
   if(fade*(1-(isD?e:0))>0.01||isD)text(p.label,p.cx+(isD?(CX-p.cx)*e:0),p.cy-225+(isD?(CY-p.cy)*e*0:0),34,p.col,{font:SANS,style:'normal',weight:'500',align:'center',alpha:fade*(isD?1-e:1)});
   if(isD&&e>0&&pk>.6){drawCurve(p,N,u,cx,cy,s,tones,Math.max(1.6,s*.012),smooth((pk-.6)/.4));drawCurve(p,N,u,cx,cy,s,col,Math.max(1.6,s*.012),1-smooth((pk-.6)/.4));}
   else drawCurve(p,N,u,cx,cy,s,col,1.8,fade);
  });
  if(t<T.pk){
   label='YİNELEMELİ DÖNÜŞÜM';sub='Her doğru parçası iki (ya da üç) küçük parçayla değiştirilir';
   l1=`N = ${N}`;
   l2=`parça: 4·2${sup(N)} = ${4*2**N}  ·  terdragon: 4·3${sup(N)} = ${4*3**N}`;
  }else{label='EJDERHADAN DESENE';sub='Dört ejderha bir merkezden çıkar, hiçbir kenarı ikinci kez kullanmaz';l1='N = 8';l2='parça: 4·2⁸ = 1024  ·  ℓ = (1/√2)⁸ = 1/16';}
 }else{
  const w=300,h=375,q=w*.42,hu=inOut((t-T.m)/3),S=380/dragon.half+(q/dragon.half-380/dragon.half)*hu,hy=CY+(675-CY)*hu,lw=Math.max(1.1,S*.012);
  for(let m=-4;m<=4;m++)for(let n=-5;n<=5;n++){if(!m&&!n)continue;const d=Math.hypot(m,n),u=(t-T.m-1.2-d*.45)/1.2;if(u<=0)continue;
   const x=390+(m+.5)*w,y=487.5+(n+.5)*h+(Math.abs(m%2)===1?h/2:0);drawCurve(dragon,MAXN,1,x,y,q/dragon.half*outBack(u),tones,lw,smooth(u*2));}
  drawCurve(dragon,MAXN,1,CX,hy,S,tones,lw,1);
  if(t<T.g){label='ÇOĞALTMA';sub='Yarım kaydırmalı tekrar: her sütun yarım boy aşağı';}else if(t<T.c){label='ZEMİN';sub='Motif tekrarı dokuma yüzeyine dönüşür';}else{label=pal.name[0].toUpperCase();sub='Aynı geometri, başka boya';}
  l1='pₘₙ = q + (w(m+½), h(n+½) + ½h·(m mod 2))';l2='m, n ∈ ℤ';
 }
 if(t>=T.a){
  if(t>=T.m){ctx.save();ctx.fillStyle=bg;ctx.globalAlpha=.86;ctx.fillRect(0,0,W,175);ctx.fillRect(0,1050,W,300);ctx.restore();}
  text(label,70,100,34,GOLD,{font:SANS,style:'normal',weight:'500'});text(sub,70,148,28,fg,{alpha:.8});
  if(t<T.m&&t<T.pk){text(l1,70,1235,84,'#ff6b5e',{style:'normal'});text(l2,70,1135,36,fg);}
  else if(t<T.m){text(l1,70,1235,84,'#ff6b5e',{style:'normal'});text(l2,70,1135,36,fg);}
  else{text(l1,70,1135,44,fg);text(l2,70,1235,84,GOLD,{style:'normal'});}
 }
 if(t>T.total-3){text('NAKIŞ — Kıvrımın Geometrisi',CX,1180,44,fg,{align:'center',alpha:smooth((t-(T.total-3))/1)});}
 text('Hüseyin Rahmi Göktaş · MUKANTARA',W-40,1328,22,fg,{align:'right',alpha:.55,style:'normal',font:SANS});
}
const $=id=>document.getElementById(id);
let now=0,playing=true,last=performance.now(),rec=null;
function show(t){now=clamp(t,0,T.total);frame(now);$('seek').value=Math.round(now/T.total*1000);const s=Math.floor(now);$('tm').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function loop(ts){const dt=(ts-last)/1000;last=ts;if(playing){if(now>=T.total){playing=false;$('pp').textContent='▶';if(rec){rec.stop();rec=null;}}else show(now+dt);}requestAnimationFrame(loop);}
$('pp').onclick=()=>{if(now>=T.total)now=0;playing=!playing;$('pp').textContent=playing?'⏸':'▶';};
$('seek').oninput=e=>{playing=false;$('pp').textContent='▶';show(e.target.value/1000*T.total);};
$('rec').onclick=()=>{if(!window.MediaRecorder)return;const ch=[],r=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm',videoBitsPerSecond:12e6});r.ondataavailable=e=>ch.push(e.data);r.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(ch,{type:'video/webm'}));a.download='nakis-kivrim.webm';a.click();};rec=r;r.start();show(0);playing=true;$('pp').textContent='⏸';};
window.renderAt=t=>{playing=false;show(t);return T.total;};window.filmTotal=()=>T.total;
if(location.search.includes('static'))playing=false;
show(0);requestAnimationFrame(ts=>{last=ts;loop(ts);});
