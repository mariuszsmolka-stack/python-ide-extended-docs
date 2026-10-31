// Read-only, bounded heuristic over the existing uniform 401 samples.
// A pole must fit c + a/(u-p) on SIX neighbours, not merely have a large slope.
// Reuses the fitted pole for gaps and optional graphic tails; no Python calls.
export function poleModels(curve) {
  const result=[];
  if(!Array.isArray(curve)||curve.length!==401)return result;
  for(let i=3;i<curve.length-2;i++){
    const samples=curve.slice(i-3,i+3);
    if(!samples.every(Number.isFinite))continue;
    const left=samples[2]-samples[1],middle=samples[3]-samples[2],right=samples[4]-samples[3];
    if(!(left*middle<0&&right*middle<0))continue;
    const l=left/middle,r=right/middle;
    if(!(l>-1&&l<0&&r>-1&&r<0))continue;
    // Two independent secant-ratio estimates must locate the same internal pole.
    const pLeft=(1+l)/(1-l),pRight=-2*r/(1-r);
    if(Math.abs(pLeft-pRight)>.02)continue;
    const p=(pLeft+pRight)/2;
    if(!(p>0&&p<1))continue;
    const amplitude=middle*p*(1-p),base=samples[2]+middle*(1-p);
    const positions=[-2,-1,0,1,2,3];
    if(fitsModel(samples,positions,p,amplitude,base))result.push(model(i,i-1,i,i-1,p,amplitude,base,samples,positions));
  }
  // A single missing node can hide a pole (1/x, cot at zero). Require three
  // finite neighbours on EACH side and the same six-point rational evidence.
  for(let i=3;i<398;i++){
    if(curve[i]!==null)continue;
    const samples=[...curve.slice(i-3,i),...curve.slice(i+1,i+4)];
    if(!samples.every(Number.isFinite))continue;
    const left=samples[2]-samples[1],middle=(samples[3]-samples[2])/2,right=samples[4]-samples[3];
    if(!(left*middle<0&&right*middle<0))continue;
    const positions=[-3,-2,-1,1,2,3];
    const pLeft=estimatePole(positions.slice(1,4),samples.slice(1,4));
    const pRight=estimatePole(positions.slice(2,5),samples.slice(2,5));
    if(!Number.isFinite(pLeft)||!Number.isFinite(pRight)||Math.abs(pLeft)>.02||Math.abs(pRight)>.02)continue;
    const p=(pLeft+pRight)/2,amplitude=middle*(1-p*p),base=samples[2]+amplitude/(1+p);
    if(fitsModel(samples,positions,p,amplitude,base))result.push(model(null,i-1,i+1,i,p,amplitude,base,samples,positions));
  }
  return result;
}


export function poleBreaks(curve) {
  return new Set(poleModels(curve).filter(p=>p.index!==null).map(p=>p.index));
}
function estimatePole(u,y) {
  const ratio=((y[1]-y[0])/(u[1]-u[0]))/((y[2]-y[1])/(u[2]-u[1]));
  return (u[2]-ratio*u[0])/(1-ratio);
}
function fitsModel(samples,positions,p,amplitude,base) {
  return samples.every((value,j)=>{
    const observed=value-base,predicted=amplitude/(positions[j]-p);
    const roundoff=64*Number.EPSILON*Math.max(Math.abs(base),Math.abs(value));
    return Number.isFinite(predicted)&&Math.abs(observed-predicted)<=.02*Math.max(Math.abs(observed),Math.abs(predicted))+roundoff;
  });
}
function model(index,left,right,origin,p,amplitude,base,samples,positions) {
  const estimates=Array.from({length:4},(_,i)=>estimatePole(positions.slice(i,i+3),samples.slice(i,i+3)));
  const uncertainty=Math.max(1e-8,...estimates.map(e=>Number.isFinite(e)?Math.abs(e-p):Infinity))/20;
  return {index,left,right,pole:-10+(origin+p)/20,amplitude:amplitude/20,base,uncertainty};
}

// Graphic control points, not new Python samples. The anchor is an unchanged
// data point. Solve its shifted rational model for the current Y boundary.
export function poleExtensions(models,curve,view) {
  const extensions=[];
  for(const m of models){
    if(m.pole<view.xMin||m.pole>view.xMax||!Number.isFinite(m.uncertainty))continue;
    for(const [index,side] of [[m.left,-1],[m.right,1]]){
      if(extensions.length>=32)return extensions; // <=1024 graphic segments/curve
      const x0=-10+index/20,y0=curve[index],q0=x0-m.pole;
      const direction=Math.sign(m.amplitude/q0),neighbour=curve[index+side];
      if(!(side*q0>0)||!Number.isFinite(neighbour)||direction*(y0-neighbour)<=0)continue;
      const boundary=direction>0?view.yMax:view.yMin;
      if(!(direction*(boundary-y0)>0))continue;
      const qTarget=m.amplitude/(boundary-y0+m.amplitude/q0),ratio=qTarget/q0;
      if(!(ratio>0&&ratio<1)||Math.abs(qTarget)<=2*m.uncertainty)continue;
      const xTarget=m.pole+qTarget;
      if(!(side*(xTarget-m.pole)>0)||xTarget===x0)continue;
      const points=[[x0,y0]];
      for(let j=1;j<=32;j++){
        const q=q0*Math.pow(ratio,j/32);
        points.push(j===32?[xTarget,boundary]:[m.pole+q,y0+m.amplitude*(1/q-1/q0)]);
      }
      if(points.every(p=>p.every(Number.isFinite)))extensions.push({pole:m.pole,side,boundary,points});
    }
  }
  return extensions;
}
