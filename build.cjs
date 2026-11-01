const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'dist');
const {readUtf8,checkEncoding}=require('./encoding-check.cjs');
const catalog=JSON.parse(readUtf8(path.join(__dirname,'catalog.json')));
const {validateFunctions,renderFunctions}=require('./function-catalog.cjs');
const {validateNotes,renderNotes}=require('./visualization-notes.cjs');
const {renderGuide}=require('./guide.cjs');
const {renderFooter}=require('./site-footer.cjs');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validate(c){
 assert.equal(c.version,2);const pages=new Map(),letters=new Set(),colors=new Set(),ids=new Set();
 for(const p of c.pages){assert.match(p.id,/^[a-z][a-z0-9-]*$/);assert.match(p.file,/^(?:laboratoria\/)?[a-z][a-z0-9-]*\.html$/);assert.ok(!pages.has(p.id));pages.set(p.id,p);}
 for(const p of c.paths){assert.match(p.id,/^[a-z][a-z0-9-]*$/);assert.match(p.letter,/^[A-Z]$/);assert.match(p.color,/^#[0-9a-fA-F]{6}$/);assert.ok(['mathematical','geometric','experimental','python','neutral'].includes(p.kind));assert.ok(p.title&&p.intro);assert.ok(!ids.has(p.id)&&!letters.has(p.letter)&&!colors.has(p.color));ids.add(p.id);letters.add(p.letter);colors.add(p.color);assert.ok(p.steps.length>=2&&new Set(p.steps).size===p.steps.length);p.steps.forEach(id=>assert.ok(pages.has(id)));}
 for(const p of c.pages){assert.ok(c.paths.filter(x=>x.steps.includes(p.id)).length<=3,'At most three paths per page');(p.related||[]).forEach(id=>assert.ok(pages.has(id)));}
 c.articles.forEach(a=>assert.ok(pages.has(a.page)&&a.section&&a.description));
 assert.deepEqual(c.brand.palette,['#195B7B','#FFFFFF','#04212F','#095370','#0DBBE7','#E64E4E']);
 for(const p of [...c.paths,...c.pathPlans]){assert.ok(c.brand.palette.includes(p.color),'Path color must come from the brand palette');for(const key of ['foreground','background'])if(p[key])assert.ok(c.brand.palette.includes(p[key]));}
 for(const p of c.pathPlans){
  assert.match(p.id,/^[a-z][a-z0-9-]*$/);assert.match(p.letter,/^[A-Z]$/);assert.equal(p.status,'planned');assert.equal(p.kind,'neutral');
  assert.ok(p.title&&p.intro&&!ids.has(p.id)&&!letters.has(p.letter)&&!colors.has(p.color));ids.add(p.id);letters.add(p.letter);colors.add(p.color);
  assert.deepEqual(p.stages.map(s=>s.section),['python','2d','3d','statistics']);
  p.stages.forEach(s=>assert.ok(s.title&&(s.page===null||pages.has(s.page))));
 }
 validateFunctions(c,pages);validateNotes(c,pages);return pages;
}
const pages=validate(catalog);
const href=(id,track)=>pages.get(id).file+(track?'?sciezka='+encodeURIComponent(track):'');
function pathsFor(page){return catalog.paths.filter(p=>p.steps.includes(page.id)).map(p=>{
 const i=p.steps.indexOf(page.id),link=(id,label)=>`<a href="${href(id,p.id)}"><small>${label}</small>${esc(pages.get(id).title)}</a>`;
 return `<nav class="path-navigation path-${p.id}" aria-label="Ścieżka ${p.letter}: ${esc(p.title)}"><div class="path-intro"><span class="path-badge">${p.letter}</span><div><strong>${esc(p.title)}</strong><p>${esc(p.intro)}</p></div><small>Etap ${i+1} z ${p.steps.length}</small></div><div class="path-steps">${i?link(p.steps[i-1],'Poprzedni etap'):'<span>Początek ścieżki</span>'}${i<p.steps.length-1?link(p.steps[i+1],'Następny etap'):'<span>Koniec ścieżki</span>'}</div></nav>`;
 }).join('');}
function build(){
 checkEncoding({output:false});
 fs.mkdirSync(path.join(dist,'assets'),{recursive:true});
 fs.writeFileSync(path.join(dist,'.nojekyll'),'');
 fs.cpSync(path.join(__dirname,'site/assets'),path.join(dist,'assets'),{recursive:true});
 for(const page of catalog.pages){
  let content=readUtf8(path.join(__dirname,'site/pages',page.file));
  if(content.includes('{{IDE_GUIDE}}'))content=content.replaceAll('{{IDE_GUIDE}}',renderGuide(esc));
  const note=renderNotes(catalog,page,href,esc);
  assert.ok(!note||content.includes('{{VISUALIZATION_NOTES}}'),'Missing visualization note placement: '+page.id);
  content=content.replaceAll('{{VISUALIZATION_NOTES}}',note);
  const pathLinks=`<ul class="path-list">${catalog.paths.map(p=>`<li class="path-${p.id}"><span class="path-badge">${p.letter}</span><div><a href="${href(p.steps[0],p.id)}">${esc(p.title)}</a><p>${esc(p.intro)}</p></div></li>`).join('')}</ul>`;
  content=content.replaceAll('{{PATH_NAV}}',pathsFor(page)).replaceAll('{{FUNCTIONS}}',renderFunctions(catalog,href,esc)).replaceAll('{{PATH_LIST}}',pathLinks);
  content=content.replace(/\{\{STEPS:([a-z0-9-]+)\}\}/g,(_,id)=>{
   const p=catalog.paths.find(p=>p.id===id);assert.ok(p);
   return `<section class="path-sequence path-${p.id}" aria-labelledby="sequence-${p.id}"><h2 id="sequence-${p.id}"><span class="path-badge" aria-hidden="true">${p.letter}</span>${esc(p.title)}</h2><ol class="track-overview">${p.steps.map((id,i)=>`<li><a href="${href(id,p.id)}" aria-label="Ścieżka ${p.letter}, etap ${i+1} z ${p.steps.length}: ${esc(pages.get(id).title)}"><span class="step-marker" aria-hidden="true">${p.letter} ${i+1}</span><span class="step-title">${esc(pages.get(id).title)}</span></a></li>`).join('')}</ol></section>`;
  });
  content=content.replaceAll('{{RELATED}}',(page.related||[]).length?`<aside class="related"><h2>Czytaj dalej</h2><ul>${page.related.map(id=>`<li><a href="${href(id)}">${esc(pages.get(id).title)}</a></li>`).join('')}</ul></aside>`:'');
  assert.ok(!content.includes('{{'),'Unknown template token');
  const base=page.file.startsWith('laboratoria/')?'../':'';
  const html=`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Odkrywaj matematykę z Python IDE Extended. Materiały edukacyjne Mariusza Smółki."><title>${esc(page.title)} · Python IDE Extended</title><link rel="icon" href="${base}assets/favicon.ico"><link rel="stylesheet" href="${base}assets/docs.css"><link rel="stylesheet" href="${base}assets/paths.css"><link rel="stylesheet" href="${base}assets/preview.css">${page.plot?'<link rel="stylesheet" href="assets/stat.css"><script type="module" src="assets/preview.js"></script>':''}${page.model?'<link rel="stylesheet" href="assets/mesh.css"><script type="module" src="assets/model.js"></script>':''}${page.id==='instrukcja'?'<script type="module" src="assets/guide.js"></script>':''}${page.file.startsWith('laboratoria/')?'<link rel="stylesheet" href="'+base+'assets/laboratoria/laboratorium-01/lab.css">':''}<script type="module" src="${base}assets/docs.js"></script></head><body><a class="skip-link" href="#tresc">Przejdź do treści</a><header class="site-header"><a class="brand" href="${base}index.html">Python IDE Extended <span>Materiały</span></a><nav aria-label="Główna"><a href="${base}index.html"${page.id==='start'?' aria-current="page"':''}>Start</a><a href="${base}baza.html"${page.id==='baza'?' aria-current="page"':''}>Baza wiedzy</a><a href="${base}sciezka-m.html"${page.id==='sciezka-m'?' aria-current="page"':''}>Ścieżki</a><a href="${base}laboratoria/index.html"${page.file.startsWith('laboratoria/')?' aria-current="page"':''}>Laboratoria</a><a href="${base}instrukcja.html"${page.id==='instrukcja'?' aria-current="page"':''}>Instrukcja</a></nav></header><main id="tresc" class="${page.kind}">${content}</main>${renderFooter(base)}<noscript>Tekst i nawigacja działają bez JavaScript. Model 3D oraz przyciski kopiowania wymagają JavaScript.</noscript></body></html>`;
  fs.mkdirSync(path.dirname(path.join(dist,page.file)),{recursive:true});
  fs.writeFileSync(path.join(dist,page.file),html,'utf8');
 }
 checkEncoding();
 console.log(JSON.stringify({pages:catalog.pages.length,functions:catalog.functions.length}));
}
if(require.main===module)build();module.exports={build,validate};
