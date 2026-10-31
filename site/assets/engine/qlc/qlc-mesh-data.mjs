// Numeric-only, bounded 3D transfer. Outer runId belongs to the existing protocol.
export const MESH_LIMITS=Object.freeze({bytes:128*1024,sceneBytes:2*1024*1024,runBytes:6*1024*1024,
  surfaces:3,vertices:24000,triangles:48000,runVertices:72000,runTriangles:144000,parts:32,partValues:9000,grid:33,scale:100000,extent:6});
const meshFail=()=>{throw new TypeError('Invalid 3D geometry packet or transfer limit');};
const meshKeys=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const meshInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const meshArray=(a,max)=>Array.isArray(a)&&a.length<=max&&Object.keys(a).length===a.length;
export function validateMeshPacket(v){
  if(!v||v.version!==5||!meshInt(v.scene,1,8)||!meshInt(v.op,0,2))meshFail();
  let result;
  if(v.op===0){
    if(!meshKeys(v,['version','op','scene','grid','surfaces'])||v.grid!==MESH_LIMITS.grid||!meshArray(v.surfaces,3)||!v.surfaces.length)meshFail();
    let vertices=0,triangles=0;
    const surfaces=Array.from(v.surfaces,s=>{
      if(!meshArray(s,6)||s.length!==6||!meshInt(s[0],0,24000)||!meshInt(s[1],0,48000)||(!s[0])!==(!s[1])||
        !meshInt(s[2],0,33**3)||!meshInt(s[3],0,s[2])||!Array.from(s).slice(4).every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=600000))meshFail();
      vertices+=s[0];triangles+=s[1];return [...s];
    });
    if(vertices>24000||triangles>48000)meshFail();
    result={version:5,op:0,scene:v.scene,grid:33,surfaces};
  }else if(v.op===1){
    if(!meshKeys(v,['version','op','scene','part','surface','kind','data'])||!meshInt(v.part,0,31)||!meshInt(v.surface,0,2)||!meshInt(v.kind,0,1)||!meshArray(v.data,9000)||!v.data.length||v.data.length%3)meshFail();
    const data=Array.from(v.data,n=>{if(!meshInt(n,v.kind===0?-600000:0,v.kind===0?600000:23999))meshFail();return n;});
    if(v.kind===1)for(let i=0;i<data.length;i+=3)if(data[i]===data[i+1]||data[i]===data[i+2]||data[i+1]===data[i+2])meshFail();
    result={version:5,op:1,scene:v.scene,part:v.part,surface:v.surface,kind:v.kind,data};
  }else{
    if(!meshKeys(v,['version','op','scene','parts'])||!meshInt(v.parts,0,32))meshFail();
    result={version:5,op:2,scene:v.scene,parts:v.parts};
  }
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MESH_LIMITS.bytes)meshFail();
  return result;
}
export class MeshStream{
  #active=null;#last=0;#bytes=0;#vertices=0;#triangles=0;
  get pending(){return this.#active!==null;}
  accept(packet){
    if(packet.version!==5){if(this.#active)meshFail();return {start:true,complete:true};}
    const p=validateMeshPacket(packet),bytes=new TextEncoder().encode(JSON.stringify(p)).byteLength;
    if(p.op===0){
      if(this.#active||p.scene!==this.#last+1)meshFail();
      const vertices=p.surfaces.reduce((n,s)=>n+s[0],0),triangles=p.surfaces.reduce((n,s)=>n+s[1],0);
      if(this.#vertices+vertices>MESH_LIMITS.runVertices||this.#triangles+triangles>MESH_LIMITS.runTriangles)meshFail();
      this.#vertices+=vertices;this.#triangles+=triangles;this.#last=p.scene;
      this.#active={scene:p.scene,surfaces:p.surfaces.map(s=>({v:s[0]*3,t:s[1]*3,gotV:0,gotT:0})),part:0,bytes:0};
    }else if(!this.#active||p.scene!==this.#active.scene)meshFail();
    const a=this.#active;
    if(a.bytes+bytes>MESH_LIMITS.sceneBytes||this.#bytes+bytes>MESH_LIMITS.runBytes)meshFail();
    a.bytes+=bytes;this.#bytes+=bytes;
    if(p.op===1){
      if(p.part!==a.part++)meshFail();
      const next=a.surfaces.findIndex(s=>s.gotV<s.v||s.gotT<s.t);
      if(next!==p.surface)meshFail();
      const s=a.surfaces[next];
      if(p.kind===0){if(s.gotT||s.gotV+p.data.length>s.v)meshFail();s.gotV+=p.data.length;}
      else {if(s.gotV!==s.v||s.gotT+p.data.length>s.t||p.data.some(n=>n>=s.v/3))meshFail();s.gotT+=p.data.length;}
    }
    if(p.op===2){
      if(p.parts!==a.part||a.surfaces.some(s=>s.gotV!==s.v||s.gotT!==s.t))meshFail();
      this.#active=null;return {start:false,complete:true,bytes:a.bytes};
    }
    return {start:p.op===0,complete:false};
  }
  abort(){this.#active=null;}
}
