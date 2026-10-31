// Deterministic heuristic over stored rysuj() samples. No execution bridge.
import { sampleX, validateView } from './plot-view.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function quantile(values,p){const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*p;return a.length?a[Math.floor(i)]+(a[Math.ceil(i)]-a[Math.floor(i)])*(i%1):NaN;}
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function spread(values){return quantile(values,.9)-quantile(values,.1);}
export function analyticalFrame(data,visible){
  if(data.version!==2)return {view:null,reason:'Kadr analityczny jest dostępny tylko dla rysuj().'};
  const curves=data.curves.filter((_,i)=>visible[i]);
  if(!curves.length)return {view:null,reason:'Włącz przynajmniej jedną funkcję w legendzie.'};
  if(curves.some(c=>c.filter(finite).length<6))return {view:null,reason:'Za mało poprawnych próbek do zaproponowania kadru.'};
  const variable=curves.map(c=>spread(c.filter(finite))>Math.max(1e-9,Math.max(...c.filter(finite).map(Math.abs))*1e-12));
  if(!variable.some(Boolean))return {view:null,reason:'Funkcje stałe nie wskazują wyróżnionego obszaru. Widok bez zmian.'};
  const events=[],safe=curves.map(()=>[]);
  const add=(x,y,type,owners)=>{if(finite(x)&&finite(y))events.push({x,y,type,owners});};
  curves.forEach((c,k)=>{
    const scale=Math.max(1,quantile(c.filter(finite).map(Math.abs),.95));
    for(let i=1;i<c.length;i++){
      let ok=finite(c[i-1])&&finite(c[i]);
      if(ok){
        const jump=Math.abs(c[i]-c[i-1]),neighbors=[];
        for(let j=Math.max(1,i-3);j<=Math.min(c.length-1,i+3);j++)if(j!==i&&finite(c[j])&&finite(c[j-1]))neighbors.push(Math.abs(c[j]-c[j-1]));
        // Conservatively reject isolated large jumps, including unsampled poles.
        if(neighbors.length>=3&&jump>8*quantile(neighbors,.5)&&jump>scale*1e-8)ok=false;
      }
      safe[k][i]=ok;
      if(ok&&c[i-1]*c[i]<0){const t=c[i-1]/(c[i-1]-c[i]);add(sampleX(i-1)+.05*t,0,'zero',[k]);}
    }
    for(let i=1;i<c.length-1;i++)if(safe[k][i]&&safe[k][i+1]){
      if(c[i]===0&&(c[i-1]!==0||c[i+1]!==0))add(sampleX(i),0,'zero',[k]);
      if((c[i]-c[i-1])*(c[i+1]-c[i])<0)add(sampleX(i),c[i],'extremum',[k]);
    }
  });
  for(let a=0;a<curves.length;a++)for(let b=a+1;b<curves.length;b++){
    const u=curves[a],v=curves[b];
    for(let i=1;i<u.length;i++)if(safe[a][i]&&safe[b][i]){
      const p=u[i-1]-v[i-1],q=u[i]-v[i];
      if(p*q<0){const t=p/(p-q);add(sampleX(i-1)+.05*t,u[i-1]+t*(u[i]-u[i-1]),'intersection',[a,b]);}
      else if(q===0&&p!==0&&i<u.length-1&&safe[a][i+1]&&safe[b][i+1])add(sampleX(i),u[i],'intersection',[a,b]);
    }
  }
  // Bound candidate generation even for rapidly oscillating sampled functions.
  const features=[];
  for(const type of ['intersection','extremum','zero'])for(let k=0;k<curves.length;k++){
    const group=events.filter(e=>e.type===type&&e.owners[0]===k);
    for(let i=0;i<Math.min(24,group.length);i++)features.push(group[Math.floor(i*group.length/Math.min(24,group.length))]);
  }
  const sorted=[...features].sort((a,b)=>a.x-b.x),centers=new Set([0]);
  const weights=new Map(features.map(e=>[e,(e.type==='intersection'?3:e.type==='extremum'?2:1)/features.filter(f=>f.type===e.type&&f.owners[0]===e.owners[0]).length]));
  for(let i=0;i<Math.min(36,sorted.length);i++)centers.add(Math.round(sorted[Math.floor(i*sorted.length/Math.min(36,sorted.length))].x*20)/20);
  for(const type of ['intersection','extremum','zero']){
    const xs=features.filter(e=>e.type===type).map(e=>e.x);if(xs.length)centers.add(quantile(xs,.5));
  }
  let best=null;
  for(const width of [5,7,10,14,20])for(const center of centers){
    const xMin=clamp(center-width/2,-10,10-width),xMax=xMin+width;
    const start=Math.max(0,Math.ceil((xMin+10)*20-1e-8)),end=Math.min(400,Math.floor((xMax+10)*20+1e-8));
    const local=curves.map(c=>c.slice(start,end+1).filter(finite));
    if(local.some(c=>c.length<6))continue;
    const inside=features.filter(e=>e.x>=xMin&&e.x<=xMax),ys=inside.map(e=>e.y),ranges=[];
    const propose=(min,max)=>{
      if(!finite(min)||!finite(max))return;
      if(max-min<1e-8){const radius=Math.max(1,quantile(local.map(spread),.5)*.08);min-=radius;max+=radius;}
      const pad=(max-min)*.14;ranges.push([min-pad,max+pad]);
    };
    if(ys.length)propose(quantile(ys,.05),quantile(ys,.95));
    for(const c of local)propose(quantile(c,.05),quantile(c,.95));
    const pooled=local.flat();propose(quantile(pooled,.03),quantile(pooled,.97));
    for(const [yMin,yMax]of ranges){
      const span=yMax-yMin;if(!finite(span)||span<1e-9)continue;
      const fractions=[],details=[];
      for(let k=0;k<curves.length;k++){
        const points=local[k].filter(y=>y>=yMin&&y<=yMax);
        fractions.push(points.length/(end-start+1));
        if(variable[k])details.push(points.length>=6?clamp(spread(points)/span*3,0,1):0);
      }
      if(Math.min(...fractions)<.08||Math.min(...details)<.04)continue;
      const counts=curves.map(()=>({zero:0,extremum:0,intersection:0}));
      for(const e of inside)if(e.y>=yMin&&e.y<=yMax)for(const k of e.owners)counts[k][e.type]++;
      const featureScore=counts.reduce((s,c)=>s+Math.min(3,c.zero)/3+Math.min(2,c.extremum)/2+Math.min(3,c.intersection)/3,0)/curves.length;
      let close=0,pairs=0;
      for(let a=0;a<curves.length;a++)for(let b=a+1;b<curves.length;b++){
        let n=0,total=0;
        for(let i=start;i<=end;i++)if(finite(curves[a][i])&&finite(curves[b][i])){total++;if(curves[a][i]>=yMin&&curves[a][i]<=yMax&&curves[b][i]>=yMin&&curves[b][i]<=yMax&&Math.abs(curves[a][i]-curves[b][i])<span*.25)n++;}
        if(total){close+=n/total;pairs++;}
      }
      const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
      const selected=inside.filter(e=>e.y>=yMin&&e.y<=yMax),weight=selected.reduce((s,e)=>s+weights.get(e),0);
      const centrality=weight?selected.reduce((s,e)=>s+weights.get(e)*(1-Math.abs(e.x-(xMin+xMax)/2)/(width/2)),0)/weight:0;
      const resolved=[];
      for(let k=0;k<curves.length;k++){
        const own=selected.filter(e=>e.owners.includes(k));
        if(own.some(e=>e.type==='extremum')&&own.length>1){const ys=own.map(e=>e.y),range=Math.max(...ys)-Math.min(...ys);if(range>1e-8)resolved.push(clamp(range/span*4,0,1));}
      }
      const score=2*mean(fractions.map(Math.sqrt))+2*Math.sqrt(Math.min(...fractions))+3*Math.min(...details)+mean(details)+1.5*featureScore+(pairs?close/pairs:0)+.8*width/20+1.5*centrality+2*(resolved.length?mean(resolved):0);
      // Stable ties favor more context, then the center closer to the domain center.
      if(!best||score>best.score+1e-9||(Math.abs(score-best.score)<=1e-9&&(width>best.width||width===best.width&&Math.abs(center)<Math.abs(best.center))))best={view:{xMin,xMax,yMin,yMax},score,width,center};
    }
  }
  if(!best)return {view:null,features,reason:'Brak wiarygodnego kadru dla tych próbek. Widok bez zmian.'};
  return {view:validateView(best.view),features,score:best.score,reason:'Kadr analityczny: wybrany fragment danych, nie cały przebieg. Cechy są przybliżone (Δx = 0,05).'};
}
