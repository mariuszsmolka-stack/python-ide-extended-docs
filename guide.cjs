const assert=require('node:assert/strict'),guide=require('./guide.json');
function validateGuide(){
 assert.equal(guide.width,1920);assert.equal(guide.height,1080);assert.equal(guide.image,'ide-fale-koncentryczne.png');
 const ids=new Set();for(const topic of guide.topics){assert.match(topic.id,/^[a-z][a-z-]*$/);assert.ok(!ids.has(topic.id));ids.add(topic.id);assert.ok(topic.name&&topic.text&&topic.tip);assert.ok(topic.areas.length);
  for(const area of topic.areas){assert.equal(area.length,4);assert.ok(area.every(Number.isFinite));const[x,y,w,h]=area;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100);}
 }assert.equal(ids.size,20);
}
function renderGuide(esc){
 validateGuide();const buttons=guide.topics.flatMap((topic,index)=>topic.areas.map((area,part)=>`<button type="button" class="guide-hotspot" data-topic="${topic.id}" data-area="${area.join(',')}" aria-label="${esc(topic.name)}${topic.areas.length>1?' - '+(part===0?'szerokość':'wysokość'):''}" aria-controls="guide-explanation" aria-pressed="false" hidden><span aria-hidden="true">${index+1}</span></button>`)).join('');
 return `<div class="guide-workspace"><figure class="ide-guide-figure"><div class="guide-scroller" tabindex="0" role="region" aria-label="Mapa IDE - przewijaj obraz, aby obejrzeć pozostałe obszary"><div class="guide-stage"><img src="assets/${guide.image}" width="${guide.width}" height="${guide.height}" alt="Python IDE Extended z edytorem, panelem przykładów, konsolą i falami koncentrycznymi 3D">${buttons}</div></div><figcaption class="image-credit"><span>Rzeczywisty widok aplikacji. Obraz można przewijać.</span><span class="image-signature" aria-label="Mariusz Smółka">MS</span></figcaption></figure><section id="guide-explanation" class="guide-explanation" aria-live="polite" aria-atomic="true"><h2>Wybierz element obrazu</h2><p>Wskaż lub kliknij element interfejsu na obrazie.</p><p class="guide-tip"></p><div class="guide-controls"><button type="button" id="guide-overview" aria-pressed="false">Pokaż całość</button></div></section></div><details class="guide-text"><summary>Lista elementów i opisów</summary><dl>${guide.topics.map(topic=>`<div data-guide-description="${topic.id}"><dt>${esc(topic.name)}</dt><dd><p class="guide-description">${esc(topic.text)}</p><p class="guide-advice">${esc(topic.tip)}</p></dd></div>`).join('')}</dl></details>`;
}
module.exports={renderGuide,validateGuide};
