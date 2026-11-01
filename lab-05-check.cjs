const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkLab05(){
 const dist=path.join(__dirname,'dist'),assets=path.join(dist,'assets/laboratoria/laboratorium-05'),html=fs.readFileSync(path.join(dist,'laboratoria/laboratorium-05.html'),'utf8');
 assert.equal((html.match(/<section aria-labelledby=/g)||[]).length,5);assert.equal((html.match(/<details\b/g)||[]).length,13);assert.ok(!/<details[^>]*\bopen\b/.test(html));assert.ok(!/<img\b|<canvas\b|<svg\b|data-mesh=|data-preview=/.test(html));
 const decode=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&');
 for(const [name,id]of [['program.py','laboratorium-05-program'],['porownanie.py','laboratorium-05-porownanie']]){const source=fs.readFileSync(path.join(assets,name),'utf8');assert.equal(decode(html.match(new RegExp('<pre data-example="'+id+'"><code>([\\s\\S]*?)</code></pre>'))[1]),source);assert.ok(source.includes('x*x + y*y <= 1')&&source.includes('pi = 4 * trafienia / n'));assert.ok(!/rysuj|input\(|class |ms2d|ms3d|msstat/.test(source));}
 const main=fs.readFileSync(path.join(assets,'program.py'),'utf8');assert.ok(main.includes('random.Random(2026)')&&main.includes('range(1, 10001)')&&main.includes('if n in (100, 1000, 10000):'));assert.ok(!main.includes('math.pi'));
 const manual=[[.1,.2],[.3,.4],[.4,.7],[.5,.5],[.6,.4],[.7,.6],[.8,.4],[.9,.3],[.9,.7],[.8,.8]];assert.equal(manual.filter(([x,y])=>x*x+y*y<=1).length,8);assert.equal(4*8/10,3.2);assert.equal(4*157/200,3.14);assert.ok(Math.abs(Math.abs(3.2-Math.PI)-.058407346410207)<1e-12);
 assert.ok(Math.abs(3.1468-Math.PI)<Math.abs(3.136-Math.PI));assert.ok(Math.abs(3.14-Math.PI)<Math.abs(3.1476-Math.PI));assert.equal(4*39386/50000,3.15088);
 const seed9=html.match(/<details class="lab05-seed9">([\s\S]*?)<\/details>/)[1];assert.ok(seed9.includes('3,1476')&&seed9.includes('nie gwarantuje'));assert.ok(html.includes('39386')||html.includes('39 386'));
 assert.ok(html.includes('<mfrac>')&&html.includes('M. Smółka')&&html.includes('nie wylosowano'));
 const index=fs.readFileSync(path.join(dist,'laboratoria/index.html'),'utf8');assert.equal((index.match(/class="lab-card lab05-text-card"/g)||[]).length,1);assert.ok(index.includes('laboratorium-05.html'));assert.ok(index.includes('assets/laboratoria/laboratorium-05/lab.css'));
 console.log('Laboratorium 05: programy, ćwiczenie ręczne, wyniki, błędy, 13 zwijanych sekcji i karta tekstowa: PASS.');
}
module.exports={checkLab05};if(require.main===module)checkLab05();
