const assert=require('node:assert/strict');
const {validateFormula,renderFormula}=require('./catalog-math.cjs');
const groups=[['2d-explicit','ms2d',14],['2d-implicit','ms2d',12],['3d-surfaces','ms3d',20],['stat-calculations','msstat',8],['stat-visualizations','msstat',2],['stat-normal','msstat',1]];
const polishOrder=new Intl.Collator('pl-PL',{usage:'sort',sensitivity:'variant'});
function functionsForGroup(c,id){return c.functions.filter(f=>id==='stat-all'?f.module==='msstat':f.group===id).sort((a,b)=>polishOrder.compare(a.displayName,b.displayName));}
// Keep technical classifications in metadata; present a simpler student catalog.
function catalogGroups(c){return [...c.groups.filter(g=>g.module!=='msstat').map(g=>({...g,title:g.id==='2d-explicit'?'Funkcje':g.id==='3d-surfaces'?'Powierzchnie':g.title})),{id:'stat-all',module:'msstat',section:'Statystyka',title:'Statystyka'}];}
function statisticsLabels(f){return f.module!=='msstat'?[]:f.group==='stat-calculations'?['Obliczenia']:['Wizualizacja'];}
function articlesForSection(c,section){return c.articles.filter(a=>a.section===section).sort((a,b)=>polishOrder.compare(c.pages.find(p=>p.id===a.page).title,c.pages.find(p=>p.id===b.page).title));}
const groupAnchor=id=>'catalog-group-'+id;
const sectionAnchor=module=>'catalog-section-'+module;
function renderCatalogToc(c,esc){
 const python=articlesForSection(c,'Python');
 const sections=[];
 if(python.length)sections.push({title:'Python',links:[{id:sectionAnchor('python'),title:'Artykuły',count:python.length}]});
 for(const group of catalogGroups(c)){
  let section=sections.find(s=>s.title===group.section);
  if(!section){section={title:group.section,links:[]};sections.push(section);}
  section.links.push({id:group.id==='stat-all'?sectionAnchor('msstat'):groupAnchor(group.id),title:group.title,count:functionsForGroup(c,group.id).length});
 }
 return `<nav class="catalog-toc" aria-labelledby="catalog-toc-title"><h2 id="catalog-toc-title">Przejdź do działu</h2><div class="catalog-toc-groups">${sections.map(s=>`<div class="catalog-toc-section"><h3>${esc(s.title)}</h3><ul>${s.links.map(link=>`<li><a href="#${esc(link.id)}">${esc(link.title)} (${link.count})</a></li>`).join('')}</ul></div>`).join('')}</div></nav>`;
}
function validateFunctions(c,pages){
 const api=require('./api.json');
 assert.equal(api.length,57);assert.equal(c.functions.length,57);
 assert.deepEqual(c.groups.map(g=>[g.id,g.module]),groups.map(g=>g.slice(0,2)));
 const ids=new Set(),articles=new Set(),names=new Set();
 for(const f of c.functions){
  assert.ok(!ids.has(f.id),'Duplicate function');ids.add(f.id);
  const expected=api.find(a=>a.id===f.id);assert.ok(expected,'Function absent from __all__');
  for(const key of ['module','name','signature','parameters','defaults','examples'])assert.deepEqual(f[key],expected[key],f.id+': '+key);
  const group=c.groups.find(g=>g.id===f.group);assert.ok(group&&group.module===f.module);
  assert.equal(f.section,group.section,'Function section must match its group');
  assert.ok(typeof f.displayName==='string'&&f.displayName===f.displayName.trim()&&f.displayName.length>=2&&f.displayName.length<=100,'Missing Polish name');
  assert.ok(!f.displayName.includes(f.module+'.')&&!f.displayName.includes('_'),'Use a Polish title');
  assert.ok(!names.has(f.group+':'+f.displayName),'Duplicate Polish name');names.add(f.group+':'+f.displayName);
  assert.ok(typeof f.description==='string'&&f.description===f.description.trim()&&f.description.length>=50&&f.description.length<=400,'Missing concise basic description');
  assert.ok([2,3].includes((f.description.match(/[.!?](?=\s|$)/g)||[]).length),'Use two or three sentences');
  assert.ok(typeof f.mathDescription==='string'&&f.mathDescription===f.mathDescription.trim()&&f.mathDescription.length>=30&&f.mathDescription.length<=700,'Missing concise mathematical explanation');
  validateFormula(f.mathFormula);
  assert.ok(f.description!==f.mathDescription,'Descriptions must serve different levels');
  assert.ok(!/fabryk|[—–\uFFFD]/iu.test(f.displayName+' '+f.description+' '+f.mathDescription),'Invalid editorial wording');
  const index=api.filter(a=>a.module===f.module).findIndex(a=>a.id===f.id);
  const expectedGroup=f.module==='ms2d'?(index<14?'2d-explicit':'2d-implicit'):f.module==='ms3d'?'3d-surfaces':index<8?'stat-calculations':index<10?'stat-visualizations':'stat-normal';
  assert.equal(f.group,expectedGroup,'Incorrect function grouping');
  assert.ok(['ready','pending'].includes(f.status));
  if(f.status==='pending')assert.equal(f.article,null);
  else{assert.ok(pages.has(f.article)&&pages.get(f.article).kind==='article');assert.ok(!articles.has(f.article),'One source article per function');articles.add(f.article);assert.ok(c.articles.some(a=>a.page===f.article));}
 }
 assert.deepEqual([...ids].sort(),api.map(f=>f.id).sort());
 const articleIds=new Set();
 for(const a of c.articles){
  assert.ok(!articleIds.has(a.page),'Duplicate article metadata');articleIds.add(a.page);
  assert.equal(pages.get(a.page)?.kind,'article');
  const f=c.functions.find(f=>f.article===a.page);
  if(f)assert.equal(a.section,f.section,'Article and function must share a section');
  else assert.equal(a.section,'Python','An unmapped library article would disappear from the catalog');
 }
 assert.deepEqual([...articleIds].sort(),c.pages.filter(p=>p.kind==='article').map(p=>p.id).sort());
 for(const [id,,count]of groups)assert.equal(c.functions.filter(f=>f.group===id).length,count);
 assert.deepEqual(c.articlePattern,{first:['example','parameter-change','visualization'],disclosures:['formula','domain','parameter-limits','python-definition','lambda-if-applicable']});
}
function renderFunctions(c,href,esc){
 let section='';
 const python=articlesForSection(c,'Python');
 const pythonHtml=python.length?`<h2 id="${sectionAnchor('python')}">Python</h2><ul class="function-list" data-article-group="Python">${python.map(a=>`<li data-article="${esc(a.page)}"><h3 class="function-name">${esc(c.pages.find(p=>p.id===a.page).title)}</h3><p class="function-description">${esc(a.description)}</p><p class="article-status"><a href="${href(a.page)}">Czytaj opis</a></p></li>`).join('')}</ul>`:'';
 const search='<form class="catalog-search" role="search" aria-label="Wyszukiwarka funkcji" hidden><label class="search-label" for="function-search">Szukaj funkcji</label><input id="function-search" type="search" placeholder="Szukaj funkcji..." autocomplete="off" aria-controls="function-results"><button type="button" class="search-clear" disabled>Wyczyść</button><span class="search-count" role="status" aria-live="polite" aria-atomic="true"></span></form>';
 return renderCatalogToc(c,esc)+search+'<div class="function-catalog" id="function-results">'+pythonHtml+catalogGroups(c).map(g=>{
  const functions=functionsForGroup(c,g.id);
  const heading=section!==g.section?`<h2 id="${sectionAnchor(g.module)}">${esc(g.section)}${g.id==='stat-all'?` (${functions.length})`:''}</h2>`:'';section=g.section;
  const items=functions.map(f=>`<li data-function="${esc(f.id)}"><h4 class="function-name"><span class="function-label">${esc(f.displayName)}</span>${statisticsLabels(f).map(label=>` <span class="function-tag ${label==='Obliczenia'?'function-tag-calculation':'function-tag-visualization'}">${esc(label)}</span>`).join('')}</h4><p class="function-description">${esc(f.description)}</p><code>${esc(f.signature)}</code><details class="function-math"><summary>Wyjaśnienie matematyczne</summary>${renderFormula(f.mathFormula,esc)}<p>${esc(f.mathDescription)}</p></details><p class="function-status">${f.status==='ready'?`<a href="${href(f.article)}" aria-label="Czytaj opis: ${esc(f.displayName)}">Czytaj opis</a>`:'Pełny artykuł w przygotowaniu'}</p></li>`).join('');
  return `${heading}${g.id==='stat-all'?'':`<h3 id="${groupAnchor(g.id)}">${esc(g.title)} (${functions.length})</h3>`}<ul class="function-list" data-function-group="${esc(g.id)}">${items}</ul>`;
 }).join('')+'</div>';
}
module.exports={validateFunctions,renderFunctions,functionsForGroup,articlesForSection,renderCatalogToc,catalogGroups,statisticsLabels};
