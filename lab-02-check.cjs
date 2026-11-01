const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkLab02(){const dist=path.join(__dirname,'dist'),assets=path.join(dist,'assets/laboratoria/laboratorium-02'),html=fs.readFileSync(path.join(dist,'laboratoria/laboratorium-02.html'),'utf8');
 assert.equal((html.match(/<section aria-labelledby=/g)||[]).length,5);assert.equal((html.match(/class="lab02-figure"/g)||[]).length,6);assert.equal((html.match(/<math display="block"/g)||[]).length,9);
 for(const name of ['przekroj-h0.svg','przekroj-h3.svg','przekroj-h4.svg','porownanie.svg','sfera.png','miniatura.png','program.py','wynik-eksperymentu.pdf','lab.css'])assert.ok(fs.statSync(path.join(assets,name)).size>100,name);
 for(const h of [0,3,4]){const svg=fs.readFileSync(path.join(assets,`przekroj-h${h}.svg`),'utf8');assert.equal((svg.match(/class="plot-curve /g)||[]).length,1);assert.ok(!/<script\b|<foreignObject\b|\bon\w+=/i.test(svg));}
 assert.equal((fs.readFileSync(path.join(assets,'porownanie.svg'),'utf8').match(/class="plot-curve /g)||[]).length,3);
 assert.equal(fs.readFileSync(path.join(assets,'wynik-eksperymentu.pdf')).subarray(0,5).toString(),'%PDF-');
 assert.ok(html.includes('Wynik eksperymentu w PDF')&&html.includes('Pobierz przykładowy wynik eksperymentu (PDF)'));
 assert.ok(!html.includes('jak-zakonczyc-program.pdf'));
 const program=fs.readFileSync(path.join(assets,'program.py'),'utf8');assert.ok(program.includes('wysokosci = [0, 3, 4]')&&program.includes('r = math.sqrt(R**2 - h**2)')&&program.includes('L = 2 * math.pi * r'));assert.ok(!program.includes('3.14'));
 const printed=html.match(/<pre data-example="laboratorium-02-program"><code>([\s\S]*?)<\/code><\/pre>/)[1].replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');assert.equal(printed,program);
 const index=fs.readFileSync(path.join(dist,'laboratoria/index.html'),'utf8');assert.ok(index.includes('laboratorium-02.html')&&index.includes('../assets/laboratoria/laboratorium-02/miniatura.png'));
 console.log('Sprawdzono Laboratorium 02: wzory, program, sześć ilustracji, miniaturę i PDF.');
}
module.exports={checkLab02};if(require.main===module)checkLab02();