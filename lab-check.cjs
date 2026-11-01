const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkLab(){
 const root=__dirname,asset=path.join(root,'dist/assets/laboratoria/laboratorium-01');
 const lab=fs.readFileSync(path.join(root,'dist/laboratoria/laboratorium-01.html'),'utf8');
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
 assert.equal(catalog.functions.length,57);assert.equal(catalog.articles.length,58);
 assert.equal(catalog.pages.filter(p=>p.file.startsWith('laboratoria/')).length,6);
 assert.equal((lab.match(/<section aria-labelledby=/g)||[]).length,5);
 assert.equal((lab.match(/class="lab-step"/g)||[]).length,6);
 assert.equal((lab.match(/<li><span class="lab-swatch/g)||[]).length,6);
 assert.equal((lab.match(/<math display="block"/g)||[]).length,6);
 const legend=lab.match(/<ol class="lab-legend">([\s\S]*?)<\/ol>/)[1];
 const formulas=[...legend.matchAll(/<span class="lab-formula">([^<]+)<\/span>/g)].map(m=>m[1]);
 assert.deepEqual(formulas,['y = x²','y = 2x²','y = (x + 2)²','y = x² − 4x','y = −x²','y = −x² − 4x + 3']);
 assert.ok(!legend.includes('<math'));
 for(let i=1;i<=6;i++){
  const svg=fs.readFileSync(path.join(asset,`krok-${i}.svg`),'utf8');
  assert.equal((svg.match(/class="plot-curve /g)||[]).length,1);
  assert.ok(!/<script\b|<foreignObject\b|\bon\w+=/i.test(svg));
 }
 const combined=fs.readFileSync(path.join(asset,'porownanie.svg'),'utf8');assert.equal((combined.match(/class="plot-curve /g)||[]).length,6);
 const index=fs.readFileSync(path.join(root,'dist/laboratoria/index.html'),'utf8');assert.ok(index.includes('../assets/laboratoria/laboratorium-01/porownanie.svg'));
 const program=fs.readFileSync(path.join(asset,'program.py'),'utf8');
 assert.ok(program.includes('ms2d.parabola(a=1, b=0, c=0)')&&program.includes('lambda x: 2 * x**2')&&program.includes('def parabola_w_dol(x):'));
 assert.equal((program.match(/input\(/g)||[]).length,6);assert.equal((program.match(/rysuj\(/g)||[]).length,7);assert.ok(!/\bfor\b|funkcje\[|rysuj\(\*/.test(program));
 assert.deepEqual([...program.matchAll(/rysuj\(([^)]+)\)/g)].map(m=>m[1]),['f1','f2','f3','f4','f5','f6','f1, f2, f3, f4, f5, f6']);
 assert.equal((lab.match(/<details\b/g)||[]).length,14);assert.ok(!/<details[^>]*\bopen\b/.test(lab));
 const code=lab.match(/<pre data-example="laboratorium-01-program"><code>([\s\S]*?)<\/code><\/pre>/)[1].replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');assert.equal(code,program);
 console.log('Sprawdzono Laboratorium 01: sześć wzorów i wykresów, wspólny wykres, miniaturę oraz kompletny kod.');
}
module.exports={checkLab};if(require.main===module)checkLab();