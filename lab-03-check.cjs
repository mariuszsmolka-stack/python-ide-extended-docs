const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkLab03(){
 const dist=path.join(__dirname,'dist'),assets=path.join(dist,'assets/laboratoria/laboratorium-03');
 const html=fs.readFileSync(path.join(dist,'laboratoria/laboratorium-03.html'),'utf8');
 assert.equal((html.match(/<section aria-labelledby=/g)||[]).length,5);
 assert.equal((html.match(/<details\b/g)||[]).length,7);assert.ok(!/<details[^>]*\bopen\b/.test(html));
 const program=fs.readFileSync(path.join(assets,'program.py'),'utf8');
 assert.equal(program,'import math\n\ndef podstawowa(x):\n    return math.sin(x)\n\nwyzsza = lambda x: 2 * math.sin(x)\nczestsza = lambda x: math.sin(2 * x)\n\nrysuj(podstawowa, wyzsza, czestsza)\n');
 assert.equal(html.match(/<pre data-example="laboratorium-03-program"><code>([\s\S]*?)<\/code><\/pre>/)[1],program);
 assert.equal((html.match(/<math display="block"/g)||[]).length,3);
 assert.deepEqual([...html.matchAll(/class="lab-formula">([^<]+)</g)].map(m=>m[1]),['y = sin(x)','y = 2sin(x)','y = sin(2x)']);
 for(const [name,count]of [['funkcja-1.svg',1],['funkcja-2.svg',1],['funkcja-3.svg',1],['porownanie.svg',3]]){
  assert.ok(html.includes(`../assets/laboratoria/laboratorium-03/${name}`));
  const svg=fs.readFileSync(path.join(assets,name),'utf8');assert.equal((svg.match(/class="plot-curve /g)||[]).length,count);
  assert.ok(!/<script\b|<foreignObject\b|\bon\w+=/i.test(svg));assert.ok(svg.includes('142C43')||svg.includes('20, 44, 67'));
 }
 const index=fs.readFileSync(path.join(dist,'laboratoria/index.html'),'utf8');assert.equal((index.match(/<a class="lab-thumbnail" href="laboratorium-03.html"/g)||[]).length,1);assert.ok(index.includes('../assets/laboratoria/laboratorium-03/porownanie.svg'));
 assert.ok(html.includes('../assets/model.js')&&html.includes('data-mesh="lab03-fala"'));
 const manifest=JSON.parse(fs.readFileSync(path.join(dist,'assets/previews.json'),'utf8'));assert.deepEqual(manifest.items['lab03-fala'],{kind:'mesh',file:'lab03-fala.json',article:'laboratorium-03'});
 const mesh=JSON.parse(fs.readFileSync(path.join(dist,'assets/lab03-fala.json'),'utf8'));
 assert.equal(mesh.schemaVersion,1);assert.equal(mesh.grid,33);assert.equal(mesh.extent,6);assert.equal(mesh.scale,100000);
 assert.ok(mesh.vertices.length>0&&mesh.vertices.length%3===0&&mesh.triangles.length%3===0);
 assert.ok(mesh.triangles.every(i=>Number.isSafeInteger(i)&&i>=0&&i<mesh.vertices.length/3));
 assert.ok(mesh.vertices.every(v=>Number.isSafeInteger(v)&&Math.abs(v)<=600000));
 let maxError=0;for(let i=0;i<mesh.vertices.length;i+=3)maxError=Math.max(maxError,Math.abs(mesh.vertices[i+2]/mesh.scale-Math.sin(mesh.vertices[i]/mesh.scale)));assert.ok(maxError<.018);
 assert.ok(html.includes('M. Smółka')&&html.includes('umowny czas')&&html.includes('nieruchomy model'));
 console.log('Laboratorium 03: program, 4 wykresy, legenda, podpowiedzi, karta i model z = sin(x): PASS.');
}
module.exports={checkLab03};if(require.main===module)checkLab03();
