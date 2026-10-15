// NAKIŞ Studio — rotating-hexagon lattice figure (after the Fazlıoğlu dot-and-line morph).
// Exact part: honeycomb of hexagons, circumradius 1 (= the unit L of the triangular lattice),
// centres c(i,j)=√3·(i·e30 + j·e90); vertices v_m = c + R(θ)(cos 60m, sin 60m).
// Approximate part: all tiles share one angle θ(t); the original's tangled transitions are not reproduced.
const S3=Math.sqrt(3),D=Math.PI/180;
export const TYPES={
 ring:{tr:'Halka',en:'Ring',ch:[]},
 spokes:{tr:'Işın',en:'Spokes',ch:[],spk:1},
 star:{tr:'Yıldız {6/2}',en:'Star {6/2}',ch:[2]},
 asanoha:{tr:'Asanoha',en:'Asanoha',ch:[2],spk:1},
 web:{tr:'Ağ',en:'Web',ch:[2,3],spk:0}
};
export const TYPE_ORDER=Object.keys(TYPES);
export const SHAPES={triangle:{tr:'Üçgen (C3)',en:'Triangle (C3)'},disc:{tr:'Disk (C6)',en:'Disc (C6)'}};
// tile centres inside the clip, symmetric about the origin (a tile centre)
export function centres(size,shape){
 const out=[],e30=[S3*Math.cos(30*D),S3*Math.sin(30*D)],e90=[0,S3],R=size*S3+.01;
 for(let i=-size-2;i<=size+2;i++)for(let j=-size-2;j<=size+2;j++){
  const x=i*e30[0]+j*e90[0],y=i*e30[1]+j*e90[1];
  if(shape==='disc'){if(Math.hypot(x,y)<=R)out.push([x,y]);}
  else{ // equilateral triangle, inradius = size·√3/2·... apex up
   const r=size*S3*.5+.01,ok=[90,210,330].every(a=>x*Math.cos(a*D)+y*Math.sin(a*D)>=-r&&true);
   // three half-planes with outward normals at -90,30,150 deg
   const inside=[-90,30,150].every(a=>x*Math.cos(a*D)+y*Math.sin(a*D)<=r);
   if(inside)out.push([x,y]);
  }
 }
 return out;
}
// returns {dots:[[x,y]], edges:[[x1,y1,x2,y2,len]]} in units of L, for hexagon angle theta (radians)
export function build({size=3,shape='triangle',type='asanoha',theta=0,omega=0}){
 const T=TYPES[type],dots=new Map(),edges=[],key=(x,y)=>Math.round(x*500)+','+Math.round(y*500);
 const add=(x,y)=>{dots.set(key(x,y),[x,y]);};
 const rot=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
 for(const [cx,cy] of centres(size,shape)){
  const v=[];for(let m=0;m<6;m++){const a=theta+m*60*D;v.push([cx+Math.cos(a),cy+Math.sin(a)]);}
  v.forEach(p=>add(p[0],p[1]));
  const E=(p,q)=>edges.push([p[0],p[1],q[0],q[1],Math.hypot(p[0]-q[0],p[1]-q[1])]);
  for(let m=0;m<6;m++)E(v[m],v[(m+1)%6]);
  if(T.spk){add(cx,cy);for(let m=0;m<6;m++)E([cx,cy],v[m]);}
  for(const k of T.ch)for(let m=0;m<(k===3?3:6);m++)E(v[m],v[(m+k)%6]);
 }
 const f=(p)=>omega?rot(p[0],p[1],omega):p;
 return {dots:[...dots.values()].map(f),edges:edges.map(e=>{const a=f([e[0],e[1]]),b=f([e[2],e[3]]);return [a[0],a[1],b[0],b[1],e[4]];})};
}
// holds: theta steps 0 → 30°, 1 s hold + 1.4 s smooth turn; type advances at every hold
export const HOLDS=[0,30*D];
export function timeline(t,cycle){
 const hold=1,turn=1.4,per=hold+turn,k=Math.floor(t/per),u=t-k*per,s=u<hold?0:(()=>{const x=(u-hold)/turn;return x*x*(3-2*x);})();
 const th=(k+s)*30*D;return {theta:th,type:cycle[k%cycle.length],k};
}
export function stats(g){
 const set=new Map();for(const e of g.edges){const l=Math.round(e[4]*1000)/1000;set.set(l,(set.get(l)||0)+1);}
 return {dots:g.dots.length,edges:g.edges.length,lens:[...set.entries()].sort((a,b)=>a[0]-b[0])};
}
