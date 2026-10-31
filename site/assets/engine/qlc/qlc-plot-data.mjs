import { validateMeshPacket } from './qlc-mesh-data.mjs';
// Extended numeric-only wire format. Shared by Supervisor, relay and UI.
export const PLOT_LIMITS = Object.freeze({ functions: 6, points: 401, bytes: 128 * 1024, plots: 8, magnitude: 1e12,
  implicitGrid: 81, implicitContours: 128, implicitPoints: 3000, implicitScale: 100000, implicitSegments: 2400 });
export function validatePlot(value) {
  if(value?.version===5)return validateMeshPacket(value);
  if(value?.version===6)return validateStatPlot(value);
  if (value?.version === 4) return validateCombinedPlot(value);
  if (value?.version === 3) return validateImplicitPlot(value);
  const fail = () => { throw new TypeError('Invalid visualization packet'); };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 3 || !['version', 'curves', 'errors'].every(k => Object.hasOwn(value, k)) ||
      value.version !== 2 || !Array.isArray(value.curves) || value.curves.length < 1 || value.curves.length > PLOT_LIMITS.functions ||
      Object.keys(value.curves).length !== value.curves.length || !Array.isArray(value.errors) || value.errors.length !== value.curves.length ||
      Object.keys(value.errors).length !== value.errors.length) fail();
  const curves = Array.from(value.curves, (curve, index) => {
    if (!Array.isArray(curve) || curve.length !== PLOT_LIMITS.points || Object.keys(curve).length !== curve.length) fail();
    let missing = 0;
    const copy = Array.from(curve, point => {
      if (point === null) { missing++; return null; }
      if (typeof point !== 'number' || !Number.isFinite(point) || Math.abs(point) > PLOT_LIMITS.magnitude) fail();
      return point;
    });
    if (!Number.isSafeInteger(value.errors[index]) || value.errors[index] < 0 || value.errors[index] > missing) fail();
    return copy;
  });
  // Shape/length/type bounds are checked before serializing, bounding validation work.
  const result = { version: 2, curves, errors: [...value.errors] };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > PLOT_LIMITS.bytes) fail();
  return result;
}
function validateImplicitPlot(value) {
  const fail = () => { throw new TypeError('Invalid implicit visualization packet'); };
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 5 ||
      !['version','grid','contours','invalid','errors'].every(key=>Object.hasOwn(value,key)) || value.grid !== PLOT_LIMITS.implicitGrid ||
      !Number.isSafeInteger(value.invalid) || value.invalid < 0 || value.invalid > value.grid ** 2 ||
      !Number.isSafeInteger(value.errors) || value.errors < 0 || value.errors > value.invalid ||
      !Array.isArray(value.contours) || value.contours.length > PLOT_LIMITS.implicitContours || Object.keys(value.contours).length !== value.contours.length) fail();
  let count=0, segments=0;
  const contours=Array.from(value.contours,path=>{
    if (!Array.isArray(path) || path.length < 2 || (count+=path.length)>PLOT_LIMITS.implicitPoints || Object.keys(path).length !== path.length ||
        (segments+=path.length-1)>PLOT_LIMITS.implicitSegments) fail();
    return Array.from(path,point=>{
      if (!Array.isArray(point) || point.length!==2 || Object.keys(point).length!==2) fail();
      const pair=Array.from(point,coordinate=>{
        if (!Number.isSafeInteger(coordinate) || Math.abs(coordinate)>10*PLOT_LIMITS.implicitScale) fail();
        return coordinate;
      });
      return pair;
    });
  });
  const result={version:3,grid:value.grid,contours,invalid:value.invalid,errors:value.errors};
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>PLOT_LIMITS.bytes)fail();
  return result;
}

function validateCombinedPlot(value) {
  const fail=()=>{throw new TypeError('Invalid combined visualization packet');};
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||
    !['version','grid','series'].every(k=>Object.hasOwn(value,k))||value.grid!==81||!Array.isArray(value.series)||
    value.series.length<1||value.series.length>PLOT_LIMITS.functions||Object.keys(value.series).length!==value.series.length)fail();
  let contours=0,points=0,segments=0;
  const series=Array.from(value.series,item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).length!==4||
      !['kind','contours','invalid','errors'].every(k=>Object.hasOwn(item,k))||![1,2].includes(item.kind)||
      item.invalid>(item.kind===1?401:6561))fail();
    const checked=validateImplicitPlot({version:3,grid:81,contours:item.contours,invalid:item.invalid,errors:item.errors});
    contours+=checked.contours.length;
    for(const path of checked.contours){points+=path.length;segments+=path.length-1;}
    if(contours>128||points>3000||segments>2400)fail();
    return {kind:item.kind,contours:checked.contours,invalid:checked.invalid,errors:checked.errors};
  });
  const result={version:4,grid:81,series};
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>PLOT_LIMITS.bytes)fail();
  return result;
}

// Schema 6: only finite coordinates and integer counts; no HTML or labels.
function validateStatPlot(value) {
  const fail=()=>{throw new TypeError('Invalid statistical visualization packet');};
  const keys=['version','kind','x','counts','n'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==5||!keys.every(k=>Object.hasOwn(value,k))||
      ![0,1].includes(value.kind)||!Number.isSafeInteger(value.n)||value.n<1||value.n>10000)fail();
  const dense=(a,max)=>Array.isArray(a)&&a.length<=max&&Object.keys(a).length===a.length;
  if(!dense(value.counts,value.kind===0?64:32)||!dense(value.x,65)||value.counts.length<1||value.counts.length>(value.kind===0?64:32)||value.x.length!==value.counts.length+(value.kind===1?1:0))fail();
  const x=Array.from(value.x,n=>{if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e12)fail();return n;});
  if(x.some((n,i)=>i>0&&n<=x[i-1]))fail();
  const counts=Array.from(value.counts,n=>{if(!Number.isSafeInteger(n)||n<(value.kind===0?1:0)||n>value.n)fail();return n;});
  if(counts.reduce((a,b)=>a+b,0)!==value.n)fail();
  if(value.kind===1){const step=(x.at(-1)-x[0])/counts.length;if(x.some((n,i)=>i>0&&Math.abs((n-x[i-1])-step)>1e-9*step))fail();}
  const result={version:6,kind:value.kind,x,counts,n:value.n};
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>PLOT_LIMITS.bytes)fail();
  return result;
}
