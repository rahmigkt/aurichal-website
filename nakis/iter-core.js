// Iterated segment replacement (Lévy C, Heighway dragon, terdragon…). Points are [x,y] pairs, y down on screen.
export const RULES={
 levy:{name:['Lévy C eğrisi','Lévy C curve'],g:[[.5,.5]],alt:false,ratio:Math.SQRT1_2,m:2},
 dragon:{name:['Ejderha eğrisi','Dragon curve'],g:[[.5,.5]],alt:true,ratio:Math.SQRT1_2,m:2},
 terdragon:{name:['Terdragon','Terdragon'],g:[[.5,-Math.sqrt(3)/6],[.5,Math.sqrt(3)/6]],alt:false,ratio:1/Math.sqrt(3),m:3}
};
/** one replacement step of a polyline; returns {full, flat}: flat keeps new vertices on their parent segment (for morphing) */
export function expand(pts,rule){
 const full=[pts[0]],flat=[pts[0]];
 for(let j=0;j<pts.length-1;j++){
  const [ax,ay]=pts[j],[bx,by]=pts[j+1],dx=bx-ax,dy=by-ay,f=rule.alt&&j%2?-1:1;
  for(const [gx,gy] of rule.g){
   full.push([ax+dx*gx-dy*gy*f,ay+dy*gx+dx*gy*f]);
   flat.push([ax+dx*gx,ay+dy*gx]);
  }
  full.push([bx,by]);flat.push([bx,by]);
 }
 return {full,flat};
}
/** arms: rotational copies (angles in radians) of the seed segment from the origin to (1,0) */
export function build(rule,N,arms=4,phase=0){
 const out=[];
 for(let a=0;a<arms;a++){
  const th=phase+a*2*Math.PI/arms;let pts=[[0,0],[Math.cos(th),Math.sin(th)]],flat=null;
  for(let n=0;n<N;n++){const r=expand(pts,rule);pts=r.full;flat=r.flat;}
  out.push({full:pts,flat:flat||pts});
 }
 return out;
}
