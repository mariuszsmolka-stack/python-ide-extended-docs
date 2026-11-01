const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkLab04(){
 const dist=path.join(__dirname,'dist'),assets=path.join(dist,'assets/laboratoria/laboratorium-04'),html=fs.readFileSync(path.join(dist,'laboratoria/laboratorium-04.html'),'utf8');
 assert.equal((html.match(/<section aria-labelledby=/g)||[]).length,5);
 assert.equal((html.match(/class="lab04-figure"/g)||[]).length,5);assert.equal((html.match(/<details\b/g)||[]).length,9);assert.ok(!/<details[^>]*\bopen\b/.test(html));
 assert.ok(html.indexOf('laboratorium-04/styczna.svg')<html.indexOf('id="pytanie"'));
 const program=fs.readFileSync(path.join(assets,'program.py'),'utf8');assert.equal(html.match(/<pre data-example="laboratorium-04-program"><code>([\s\S]*?)<\/code><\/pre>/)[1],program);
 assert.ok(program.includes('return x * x')&&program.includes('return 2 * x - 0.9')&&program.includes('return 2 * x - 1.1'));assert.equal((program.match(/rysuj\(/g)||[]).length,1);assert.ok(program.endsWith('rysuj(parabola, prosta_a, styczna, prosta_b)\n'));
 const expected=[['styczna',[1,3]],['dwa-przeciecia',[1,2]],['bez-przeciec',[1,4]],['porownanie',[1,2,3,4]],['powiekszenie',[1,2,3,4]]];let ordinaryFrame;
 for(const [name,indices]of expected){const svg=fs.readFileSync(path.join(assets,name+'.svg'),'utf8');assert.ok(html.includes('laboratorium-04/'+name+'.svg'));assert.ok(!/<script\b|<foreignObject\b|\bon\w+=/i.test(svg));const visible=[...svg.matchAll(/<path\b[^>]*class="plot-curve curve-(\d+)"[^>]*visibility="visible"/g)].map(m=>Number(m[1]));assert.deepEqual(visible,indices);
 const geometry=[...svg.matchAll(/<rect\b[^>]*class="plot-frame"[^>]*>/g)].map(m=>m[0]);if(!ordinaryFrame)ordinaryFrame=geometry;assert.deepEqual(geometry,ordinaryFrame,'identical drawing area');}
 const index=fs.readFileSync(path.join(dist,'laboratoria/index.html'),'utf8');assert.equal((index.match(/<a class="lab-thumbnail" href="laboratorium-04.html"/g)||[]).length,1);assert.ok(index.includes('../assets/laboratoria/laboratorium-04/powiekszenie.svg'));
 assert.deepEqual([...html.matchAll(/class="lab-formula">([^<]+)</g)].map(m=>m[1]),['y = x²','y = 2x − 0,9','y = 2x − 1','y = 2x − 1,1']);
 assert.ok(html.includes('<msup>')&&html.includes('<msqrt>')&&html.includes('M. Smółka'));
 for(const x of [1-Math.sqrt(.1),1+Math.sqrt(.1)]){assert.ok(Math.abs(x*x-(2*x-.9))<1e-12);assert.ok(x>.5&&x<1.5&&x*x>-.125&&x*x<2.375);}
 assert.equal(1*1-(2*1-1),0);assert.equal(2*2-(4*2-4),0);
 for(let x=-10;x<=10;x+=.05){assert.ok(x*x-(2*x-1.1)>0);assert.ok(2*x*x-(2*x-1)>0);assert.ok(Math.abs((2*x*x-(2*x-1))-(2*(x-.5)**2+.5))<1e-12);}
 console.log('Laboratorium 04: program, 5 rzeczywistych wykresów, kolory, 9 ukrytych sekcji, karta i zależności matematyczne: PASS.');
}
module.exports={checkLab04};if(require.main===module)checkLab04();
