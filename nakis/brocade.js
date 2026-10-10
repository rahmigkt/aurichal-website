// Damask principle: the figure is woven in a different structure from the ground.
// Pixels that differ from the ground colour take the figure weave's thread shading (and a little sheen);
// all other pixels take the ground weave's shading. A soft relief rim lights the figure from the upper left.
// base: RGBA bytes edited in place. tileG / tileF: {w,h,g:Uint8Array} gray weave shading.
export function brocade(base,W,H,gr,tileG,tileF,{alpha=.85,sheen=14,relief=26,thr=28}={}){
 const m=new Float32Array(W*H);
 for(let i=0,o=0;i<m.length;i++,o+=4){const d=Math.abs(base[o]-gr[0])+Math.abs(base[o+1]-gr[1])+Math.abs(base[o+2]-gr[2]);const v=(d-thr)/70;m[i]=v<0?0:v>1?1:v;}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,o=i*4,mm=m[i];
  const gG=tileG.g[(y%tileG.h)*tileG.w+(x%tileG.w)]/255,gF=tileF.g[(y%tileF.h)*tileF.w+(x%tileF.w)]/255,g=gG+(gF-gG)*mm;
  const xa=x>1?x-2:0,ya=y>1?y-2:0,xb=x<W-2?x+2:W-1,yb=y<H-2?y+2:H-1,rim=(m[ya*W+xa]-m[yb*W+xb])*relief+mm*sheen;
  for(let q=0;q<3;q++){const c=base[o+q]/255,ov=c<.5?2*c*g:1-2*(1-c)*(1-g),r=(c+(ov-c)*alpha)*255+rim;base[o+q]=r;}
 }
}
