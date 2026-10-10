// Pure timeline maths for the NAKIŞ film (no DOM): every frame is a function of time t only.
import {COUNTS} from './fourier.js';
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const inOut=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
export const outBack=x=>{x=clamp(x);const c=1.5,d=c+1;return 1+d*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
export const STEP=3.6, INTRO=2.5, PART=1.3, MULT=8, GROUND=5, SWATCH=3.5, OUTRO=3;
export const PALETTE_ORDER=['madder','indigo','linen','night','madder'];
/** others = number of contours besides the main one */
export function timeline(others){
 const s1=INTRO, s1e=s1+COUNTS.length*STEP, s2=s1e, s2e=s2+.8+others*PART+.6;
 const s3=s2e, s3e=s3+MULT, s4=s3e, s4e=s4+GROUND, s5=s4e, s5e=s5+(PALETTE_ORDER.length-1)*SWATCH;
 return {s1,s1e,s2,s2e,s3,s3e,s4,s4e,s5,s5e,total:s5e+OUTRO};
}
export function hex(c){return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16));}
export function mix(a,b,u){const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*u).toString(16).padStart(2,'0')).join('');}
export function lum(c){const [r,g,b]=hex(c);return (.2126*r+.7152*g+.0722*b)/255;}
/** palette colour set at film time t (madder until the colour phase begins) */
export function paletteAt(tl,t,palettes){
 const f=clamp((t-tl.s5)/(tl.s5e-tl.s5))*(PALETTE_ORDER.length-1), i=Math.min(PALETTE_ORDER.length-2,Math.floor(f)), u=smooth(f-i);
 const A=palettes[PALETTE_ORDER[i]],B=palettes[PALETTE_ORDER[i+1]],o={};
 for(const k of ['ground','ink','accent','soft'])o[k]=mix(A[k],B[k],u);
 o.name=u<.5?A.name:B.name;return o;
}
/** trace progress p and fill progress f of the j-th non-main contour (0-based) */
export function partState(tl,t,j){const st=tl.s2+.5+j*PART;return {p:inOut((t-st)/(PART-.2)),f:smooth((t-st-(PART-.2))/.5)};}
