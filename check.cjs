const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validate}=require('./build.cjs'),{checkEncoding}=require('./encoding-check.cjs'),catalog=require('./catalog.json');
const root=__dirname,dist=path.join(root,'dist');
validate(catalog);checkEncoding();assert.equal(catalog.pages.length,66);assert.equal(catalog.functions.length,57);assert.equal(catalog.articles.length,58);
assert.equal(catalog.functions.filter(f=>f.module==='ms2d').length,26);assert.equal(catalog.functions.filter(f=>f.module==='ms3d').length,20);assert.equal(catalog.functions.filter(f=>f.module==='msstat').length,11);
assert.ok(catalog.functions.every(f=>f.status==='ready'));assert.equal(new Set(catalog.functions.map(f=>f.article)).size,57);
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'assets/previews.json'),'utf8'));
assert.equal(Object.keys(manifest.items).length,49);
for(const value of Object.values(manifest.items)){assert.ok(fs.existsSync(path.join(dist,'assets',value.file)));assert.ok(catalog.pages.some(p=>p.id===value.article));}
for(const page of catalog.pages){
 const html=fs.readFileSync(path.join(dist,page.file),'utf8');assert.ok(!html.includes('{{'));assert.match(html,/<html lang="pl">/);assert.match(html,/<meta charset="utf-8">/);
 for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const u=new URL(m[1],'https://mariuszsmolka-stack.github.io/python-ide-extended-docs/'+page.file);
  if(u.origin!=='https://mariuszsmolka-stack.github.io')continue;
  assert.ok(u.pathname.startsWith('/python-ide-extended-docs/'));
  const file=path.join(dist,decodeURIComponent(u.pathname.slice('/python-ide-extended-docs/'.length)));assert.ok(fs.existsSync(file),m[1]);
  if(u.hash)assert.ok(fs.readFileSync(file,'utf8').includes(`id="${decodeURIComponent(u.hash.slice(1))}"`),m[1]);
 }
 assert.ok(html.includes('https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pl'));
}
console.log('Sprawdzono 66 stron, 57 funkcji, 58 artykułów, 49 podglądów i odnośniki.');

require('./lab-check.cjs').checkLab();

require('./lab-02-check.cjs').checkLab02();
