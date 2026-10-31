import { MeshStream, validateMeshPacket } from './qlc/qlc-mesh-data.mjs';
import { MeshRenderer, meshDiagnostics, MESH_PALETTES } from './mesh-renderer.mjs';
export { meshDiagnostics };
let gate=new MeshStream(),pending=null;
const scenes=new Set();
export function captureMesh(card){
  const item=[...scenes].find(item=>item.renderer.container.closest('.mesh-card')===card);
  if(!item)throw new Error('Scena 3D nie jest jeszcze gotowa do wydruku.');
  const renderer=item.renderer,canvas=renderer.capture(),surface=renderer.container;
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.setAttribute('viewBox',`0 0 ${surface.clientWidth} ${surface.clientHeight}`);overlay.classList.add('print-overlay');
  for(const node of renderer.axisLabels.children)overlay.append(node.cloneNode(true));
  const gizmo=renderer.gizmo.cloneNode(true);gizmo.removeAttribute('class');gizmo.setAttribute('x',String(surface.clientWidth-105));gizmo.setAttribute('y','0');gizmo.setAttribute('width','100');gizmo.setAttribute('height','100');overlay.append(gizmo);
  return {canvas,overlay};
}
function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
export function abortMeshTransfer(){
  if(!pending)return;
  pending.card.remove();pending=null;gate.abort();
  document.getElementById('plot-status').textContent='Przerwano nieukończony transfer sceny 3D. Wcześniejsze wyniki pozostają dostępne.';
}
export function clearMeshes(){abortMeshTransfer();for(const item of scenes){item.observer.disconnect();item.renderer.dispose();}scenes.clear();gate=new MeshStream();}
export function renderMeshPacket(raw,results){
  const p=validateMeshPacket(raw),admitted=gate.accept(p);
  if(p.op===0){
    if(results.childElementCount>=8)throw new RangeError('Limit 8 wyników na uruchomienie');
    const card=document.createElement('article');card.className='plot-card mesh-card';card.dataset.scene=String(p.scene);
    const heading=document.createElement('h3');heading.textContent=`Scena 3D ${results.childElementCount+1}`;heading.className='mesh-transfer-title';
    const status=document.createElement('p');status.className='mesh-transfer-status';status.textContent='Odbieranie ograniczonej geometrii 3D…';card.append(heading,status);results.append(card);results.scrollTop=card.offsetTop;
    pending={card,started:performance.now(),meta:p.surfaces,parts:0,meshes:p.surfaces.map(s=>({vertices:new Float32Array(s[0]*3),triangles:new Uint32Array(s[1]*3),v:0,t:0})),status};
  }else if(p.op===1){
    const m=pending.meshes[p.surface];if(p.kind===0){for(const value of p.data)m.vertices[m.v++]=value/100000;}else{m.triangles.set(p.data,m.t);m.t+=p.data.length;}
    pending.status.textContent=`Odbieranie geometrii 3D: część ${++pending.parts}/32 (limit).`;
  }else{
    const item=pending;pending=null;mount(item,results,admitted.bytes);
  }
}
function mount(item,results,bytes){
  const transfer=performance.now()-item.started,start=performance.now(),card=item.card,number=Array.from(results.children).indexOf(card)+1;
  card.replaceChildren();const bar=document.createElement('div');bar.className='plot-titlebar';const h=document.createElement('h3');h.textContent=`Scena 3D ${number}`;
  const tools=document.createElement('div');tools.className='plot-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label',`Kamera sceny 3D ${number}`);
  const legend=document.createElement('div');legend.className='plot-legend';
  const surface=document.createElement('div');surface.className='mesh-surface';
  const status=document.createElement('p');status.className='plot-view-status';status.setAttribute('role','status');
  const notify=text=>{status.textContent=text;queueMicrotask(()=>resize());};
  const help=document.createElement('p');help.className='mesh-help';help.textContent='Obrót: przeciągnij. Pan: Shift/pr. przycisk. Zoom: kółko. Obszar [−6,6]³; jednostki 1:1. Powierzchnie mogą być ucięte.';
  const details=document.createElement('details');details.className='plot-details';const summary=document.createElement('summary');summary.textContent='Szczegóły sceny';const note=document.createElement('p');note.className='plot-note';details.append(summary,note);
  bar.append(h,tools);card.append(bar,legend,surface,status,help,details);
  const renderer=new MeshRenderer(surface,item.meshes,notify);
  tools.append(button('+',()=>renderer.zoom(.8)),button('−',()=>renderer.zoom(1.25)),button('Dopasuj',()=>renderer.fit()),button('Reset',()=>renderer.reset()));
  const wire=button('Krawędzie',()=>{renderer.wire=!renderer.wire;wire.setAttribute('aria-pressed',String(renderer.wire));renderer.invalidate();});wire.setAttribute('aria-pressed','false');tools.append(wire);
  item.meshes.forEach((m,i)=>{
    const toggle=button(`Powierzchnia ${i+1}`,()=>{renderer.visible[i]=!renderer.visible[i];toggle.setAttribute('aria-pressed',String(renderer.visible[i]));renderer.invalidate();notify(renderer.visible.some(Boolean)?'Widoczność zmieniona. Geometria i położenie zachowane.':'Wszystkie powierzchnie są ukryte.');});
    toggle.className=`mesh-legend mesh-color-${i+1}`;toggle.style.setProperty('--mesh-palette',`linear-gradient(90deg, ${MESH_PALETTES[i].join(', ')})`);toggle.setAttribute('aria-pressed','true');legend.append(toggle);
  });
  const missing=item.meta.reduce((n,s)=>n+s[2],0),errors=item.meta.reduce((n,s)=>n+s[3],0),triangles=item.meta.reduce((n,s)=>n+s[1],0),vertices=item.meta.reduce((n,s)=>n+s[0],0);
  if(missing)notify(`Brakujące próbki: ${missing}, wyjątki funkcji: ${errors}. Komórki z brakami nie są łączone.`);
  if(!triangles)notify('Nie znaleziono powierzchni poziomu zero w obliczonym obszarze.');
  const prepare=performance.now()-start;
  note.textContent=`Marching Tetrahedra, siatka 33³, krok 0,375; obszar [−6,6]³. Wierzchołki: ${vertices}, trójkąty: ${triangles}; transfer: ${bytes} B w ${item.parts} częściach. Próbkowanie: ${item.meta.reduce((n,s)=>n+s[4],0).toFixed(1)} ms; geometria: ${item.meta.reduce((n,s)=>n+s[5],0).toFixed(1)} ms; transport: ${transfer.toFixed(1)} ms; przygotowanie: ${prepare.toFixed(1)} ms. Brakujące próbki: ${missing}, wyjątki: ${errors}. Powierzchnie mogą być ucięte granicą obszaru. Zoom nie dodaje danych.`;
  card.dataset.vertices=String(vertices);card.dataset.triangles=String(triangles);card.dataset.transferMs=String(transfer);card.dataset.prepareMs=String(prepare);
  note.textContent+=' Kolor oznacza względną wysokość Z w zakresie każdej powierzchni; powierzchnia pozioma ma kolor środkowy.';
  function resize(){if(!card.isConnected)return;const extra=card.getBoundingClientRect().height-surface.getBoundingClientRect().height;surface.setAttribute('data-height',String(Math.max(200,Math.floor(results.clientHeight-extra-1))));
    // CSSOM property assignment is CSP-compatible; no inline style text or HTML.
    surface.style.height=`${surface.dataset.height}px`;renderer.resize();
  }
  const observer=new ResizeObserver(resize);observer.observe(results);details.addEventListener('toggle',resize);scenes.add({renderer,observer});resize();
  document.getElementById('plot-status').textContent=`Wyniki w bieżącym uruchomieniu: ${results.childElementCount}. Scena 3D gotowa.`;results.scrollTop=card.offsetTop;
}
