// One definition, attached to functions through catalog metadata.
const assert=require('node:assert/strict');
const notes={
 'corners-2d':{
  title:'Ograniczenie wizualizacji',
  text:'Narożniki figury mogą wyglądać na lekko ścięte. Wynika to z numerycznego sposobu rysowania. Poprawę planujemy w kolejnej wersji.',
  link:'Więcej o ograniczeniach',page:'ograniczenia',anchor:'figury-geometryczne'
 }
};
function validateNotes(c,pages){
 for(const f of c.functions){
  if(f.visualizationNotes===undefined)continue;
  assert.ok(Array.isArray(f.visualizationNotes)&&new Set(f.visualizationNotes).size===f.visualizationNotes.length,'Invalid visualization notes');
  assert.ok(f.status==='ready'&&pages.has(f.article),'A visualization note requires an article');
  for(const id of f.visualizationNotes){assert.ok(Object.hasOwn(notes,id),'Unknown visualization note');assert.equal(pages.get(notes[id].page)?.kind,'reference');}
 }
}
function renderNotes(c,page,href,esc){
 const ids=c.functions.find(f=>f.article===page.id)?.visualizationNotes||[];
 return ids.map(id=>{const note=notes[id];return `<aside class="visualization-note" data-visualization-note="${esc(id)}" aria-label="${esc(note.title)}"><p><strong>${esc(note.title)}</strong></p><p>${esc(note.text)}</p><a href="${href(note.page)}#${esc(note.anchor)}">${esc(note.link)}</a></aside>`;}).join('');
}
module.exports={notes,validateNotes,renderNotes};
