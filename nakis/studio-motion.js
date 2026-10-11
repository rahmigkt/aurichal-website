import BezierEasing from './vendor/bezier-easing.js';

const limit=(v,a,b,d)=>Number.isFinite(+v)?Math.min(b,Math.max(a,+v)):d;
export const CHANNELS={x:[-2000,2000,0],y:[-2000,2000,0],size:[30,900,300],rot:[-1080,1080,0],opacity:[0,1,1],reveal:[0,1,1]};
export const EASINGS={linear:t=>t,ease:BezierEasing(.25,.1,.25,1),easeIn:BezierEasing(.42,0,1,1),easeOut:BezierEasing(0,0,.58,1),easeInOut:BezierEasing(.42,0,.58,1),hold:t=>t<1?0:1};
export function poseOf(value={}){value=value||{};return Object.fromEntries(Object.entries(CHANNELS).map(([k,[a,b,d]])=>[k,limit(value[k],a,b,d)]));}
export function motionSettings(value={}){value=value||{};return {enabled:value.enabled===true,duration:limit(value.duration,2,60,12),loop:value.loop===true};}
export function normaliseKeys(keys,duration,base){
 const byTime=new Map();
 for(const k of Array.isArray(keys)?keys.slice(0,128):[]){
  if(!k||!Number.isFinite(+k.t))continue;
  const t=Math.round(limit(k.t,0,duration,0)*1000)/1000;
  byTime.set(t,{t,pose:poseOf({...base,...(k.pose||{})}),ease:Object.hasOwn(EASINGS,k.ease)?k.ease:'easeInOut'});
 }
 return [...byTime.values()].sort((a,b)=>a.t-b.t);
}
export function samplePose(layer,time,duration){
 const base=poseOf(layer),keys=normaliseKeys(layer.keys,duration,base);
 if(!keys.length)return base;
 if(keys[0].t>0)keys.unshift({t:0,pose:base,ease:'easeInOut'});
 const t=limit(time,0,duration,0);
 if(t<=keys[0].t)return {...keys[0].pose};
 for(let i=1;i<keys.length;i++)if(t<=keys[i].t){
  const a=keys[i-1],b=keys[i],u=EASINGS[a.ease]((t-a.t)/(b.t-a.t));
  return poseOf(Object.fromEntries(Object.keys(CHANNELS).map(k=>[k,a.pose[k]+(b.pose[k]-a.pose[k])*u])));
 }
 return {...keys.at(-1).pose};
}
export function putKey(layer,time,pose,ease,duration){
 const t=Math.round(limit(time,0,duration,0)*1000)/1000;
 const existing=(layer.keys||[]).filter(k=>Math.abs(k.t-t)>.0005);
 if(existing.length>=128)throw RangeError('128 keyframes per layer');
 return normaliseKeys([...existing,{t,pose:poseOf(pose),ease}],duration,poseOf(layer));
}
export function trimLine(points,progress){
 if(progress>=1)return points;
 if(progress<=0||points.length<2)return points.slice(0,1);
 const lengths=[];let total=0;
 for(let i=1;i<points.length;i++){const d=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(d);total+=d;}
 let left=total*progress;const out=[points[0]];
 for(let i=1;i<points.length;i++){
  const d=lengths[i-1];
  if(left>=d){out.push(points[i]);left-=d;continue;}
  const u=d?left/d:0,a=points[i-1],b=points[i];out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);break;
 }
 return out;
}
export function createHistory(max=60){
 let states=[],index=-1,pending=null,timer=0;
 const commit=s=>{if(s===states[index])return;states=states.slice(0,index+1);states.push(s);if(states.length>max)states.shift();index=states.length-1;};
 const flush=()=>{clearTimeout(timer);if(pending!==null){commit(pending);pending=null;}};
 return {
  reset:p=>{clearTimeout(timer);pending=null;states=[JSON.stringify(p)];index=0;},
  schedule:p=>{pending=JSON.stringify(p);clearTimeout(timer);timer=setTimeout(flush,250);},
  undo:()=>{flush();return index>0?JSON.parse(states[--index]):null;},
  redo:()=>{flush();return index<states.length-1?JSON.parse(states[++index]):null;},
  flush
 };
}
