import {MeshRenderer} from './mesh-renderer.mjs';
import {previewData} from './preview-data.js';
const host=document.getElementById('sphere-model')||document.querySelector('[data-mesh]'),status=document.getElementById('model-status')||host.parentElement.querySelector('.model-status');
const modelName=host.dataset.mesh||'sfera-r3';
let renderer=null;
const dataPromise=previewData(modelName,'mesh',2*1024*1024).then(data=>{
 const {vertices:v,triangles:t}=data;
 if(data.schemaVersion!==1||(modelName==='sfera-r3'&&data.radius!==3)||data.grid!==33||data.extent!==6||data.scale!==100000||!Array.isArray(v)||!Array.isArray(t)||!v.length||!t.length||v.length%3||t.length%3||v.length>72000||t.length>144000)throw Error('Niepoprawny model.');
 if(v.some(x=>!Number.isSafeInteger(x)||Math.abs(x)>600000)||t.some(x=>!Number.isSafeInteger(x)||x<0||x>=v.length/3))throw Error('Niepoprawne współrzędne modelu.');
 return {vertices:new Float32Array(v.map(x=>x/100000)),triangles:new Uint32Array(t),count:v.length/3,faces:t.length/3};
});
async function mount(){
 try{
  const mesh=await dataPromise;host.replaceChildren();
  renderer=new MeshRenderer(host,[mesh],text=>{status.textContent=text;});
  const state=renderer.canvas.dataset.state;host.dataset.state=state;
  if(state==='ready'){renderer.fit();renderer.initial=structuredClone(renderer.camera);}
  renderer.canvas.setAttribute('aria-label',(modelName==='sfera-r3'?'Interaktywna sfera o promieniu 3.':document.querySelector('h1').textContent+'.')+' Strzałki obracają, plus i minus przybliżają, Home przywraca widok. Tab opuszcza model.');
  status.textContent=state==='ready'?`Model składa się z ${mesh.faces} trójkątów. Łączą się one w ${mesh.count} punktach nazywanych wierzchołkami.`:state==='unavailable'?'Podgląd wymaga WebGL2, czyli obsługi grafiki 3D w przeglądarce. Kod możesz nadal skopiować do edytora.':'Nie udało się przygotować modelu.';
 }catch(error){host.dataset.state='error';status.textContent=error.message+' Spróbuj odświeżyć stronę.';}
}
mount();
window.addEventListener('pagehide',()=>{renderer?.dispose();renderer=null;});
window.addEventListener('pageshow',event=>{if(event.persisted&&!renderer)mount();});
