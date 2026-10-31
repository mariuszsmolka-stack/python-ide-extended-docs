const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const decoder=new TextDecoder('utf-8',{fatal:true});
function decodeUtf8(bytes,label='text'){
 let text;try{text=decoder.decode(bytes);}catch{throw Error(label+': invalid UTF-8');}
 assert.ok(!text.includes('\uFFFD'),label+': Unicode replacement character');return text;
}
const readUtf8=file=>decodeUtf8(fs.readFileSync(file),file);
const knownPaths={
 n:['Python i matematyka','Pierwszy program, parabola, sfera i histogram.'],
 m:['Od paraboli do powierzchni','Porównaj parabolę i paraboloidę eliptyczną.'],
 g:['Od okręgu do sfery','Odkryj kształty opisane odległością od środka.'],
 e:['Fale na wykresie i w przestrzeni','Zmieniaj amplitudę i porównuj fale w 2D i 3D.'],
};
function knownCatalog(c){for(const [id,[title,intro]]of Object.entries(knownPaths)){const p=c.paths.find(p=>p.id===id);assert.ok(p,'Missing path '+id);assert.equal(p.title,title);assert.equal(p.intro,intro);}}
function readableHtml(text,label){
 const visible=text.replace(/<[^>]*>/g,' ');
 // A question ending a sentence is valid. A question inside a word is not.
 assert.ok(!/\p{L}\?\p{L}/u.test(visible),label+': damaged word');
 assert.ok(!/(?:Por\?wnaj|parabol\?|paraboloid\?|eliptyczn\?|okr\?gu|kszta\?ty|odleg\?o\?ci\?|\?rodka|amplitud\?)/u.test(visible),label+': known damaged Polish word');
}
function checkTree(dir){let count=0;for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(['.git','dist','test-results','__pycache__','node_modules'].includes(e.name))continue;
 const file=path.join(dir,e.name);if(e.isDirectory())count+=checkTree(file);
 else if(/\.(?:html|json|css|js|mjs|cjs|py|md)$/.test(e.name)){const text=readUtf8(file);if(e.name.endsWith('.html'))readableHtml(text,file);count++;}
 }return count;}
function checkEncoding({output=true}={}){
 const sourceFiles=checkTree(__dirname),c=JSON.parse(readUtf8(path.join(__dirname,'catalog.json')));knownCatalog(c);
 let outputFiles=0;
 if(output){
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.(?:html|json|css|js|mjs)$/.test(e.name)){const text=readUtf8(file);if(e.name.endsWith('.html')){readableHtml(text,file);assert.match(text,/<meta charset="utf-8">/);}outputFiles++;}}}
  walk(path.join(__dirname,'dist'));
  for(const page of c.pages){const html=readUtf8(path.join(__dirname,'dist',page.file));assert.ok(html.includes(page.title),page.file+': title');
   for(const track of c.paths.filter(p=>p.steps.includes(page.id)||['start','baza','sciezka-m'].includes(page.id))){assert.ok(html.includes(knownPaths[track.id][0]),page.file+': path title');assert.ok(html.includes(knownPaths[track.id][1]),page.file+': path description');}}
 }
 return {sourceFiles,outputFiles};
}
module.exports={decodeUtf8,readUtf8,knownCatalog,knownPaths,readableHtml,checkEncoding};
if(require.main===module)console.log(JSON.stringify(checkEncoding()));
