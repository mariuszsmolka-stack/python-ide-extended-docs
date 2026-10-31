// Statistical cards use the existing ordered results panel, SVG and resize lifecycle.
import { validatePlot } from './qlc/qlc-plot-data.mjs';
const entries=new WeakMap(),NS='http://www.w3.org/2000/svg';
function element(name,attributes={},text){const e=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attributes))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
const number=n=>n!==0&&(Math.abs(n)>=1e7||Math.abs(n)<1e-4)?n.toExponential(5).replace('.',','):new Intl.NumberFormat('pl-PL',{maximumSignificantDigits:7}).format(n);
const exact=n=>String(n).replace('.',',');
function interval(data,i){return `[${exact(data.x[i])}; ${exact(data.x[i+1])}${i===data.counts.length-1?']':')'}`;}
export function renderStatPlot(raw,results){
 const data=validatePlot(raw);if(data.version!==6)throw new TypeError('Expected statistical chart');
 if(results.childElementCount>=8)throw new RangeError('Limit 8 wyników na uruchomienie');
 const card=document.createElement('article');card.className='plot-card stat-card';
 const title=document.createElement('h3');title.textContent=`${data.kind===0?'Liczebności':'Histogram'} ${results.childElementCount+1} · n = ${data.n}`;
 const chart=element('svg',{class:'stat-chart',role:'img','aria-label':data.kind===0?'Wykres słupkowy liczebności':'Histogram liczebności'});
 const note=document.createElement('p');note.className='plot-note';note.textContent=data.kind===0?'Oddzielne kategorie liczbowe; oś liczebności zaczyna się od zera.':'Równe klasy [a,b), ostatnia [a,b]. Liczebności, nie gęstość. Oś Y od zera.';
 const details=document.createElement('details');details.className='plot-details';const summary=document.createElement('summary');summary.textContent='Dane wykresu';
 const table=document.createElement('table');table.className='stat-table';const caption=document.createElement('caption');caption.textContent='Dane przygotowane w Pythonie';table.append(caption);
 const header=document.createElement('tr');for(const text of [data.kind===0?'Wartość':'Przedział','Liczebność']){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}table.append(header);
 data.counts.forEach((count,i)=>{const tr=document.createElement('tr');for(const text of [data.kind===0?String(data.x[i]):interval(data,i),String(count)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}table.append(tr);});
 details.append(summary,table);card.append(title,chart,note,details);results.append(card);entries.set(card,{data,chart,width:0,height:0});
 details.addEventListener('toggle',()=>resizeStatChart(card,true));resizeStatChart(card,true);results.scrollTop=card.offsetTop;
 document.getElementById('plot-status').textContent=`Wyniki w bieżącym uruchomieniu: ${results.childElementCount}. Wykres statystyczny gotowy.`;
}
export function resizeStatChart(card,force=false){
 const e=entries.get(card),results=card.parentElement;if(!e||!results?.clientWidth||!results.clientHeight)return;
 const width=Math.max(240,Math.floor(results.clientWidth));
 const extra=Math.ceil(card.getBoundingClientRect().height-e.chart.getBoundingClientRect().height);
 const height=Math.max(200,Math.floor(results.clientHeight-extra-1));if(!force&&e.width===width&&e.height===height)return;e.width=width;e.height=height;
 const {chart,data}=e;chart.replaceChildren();chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.setAttribute('width',width);chart.setAttribute('height',height);
 const left=64,right=24,top=28,bottom=66,w=width-left-right,h=height-top-bottom,max=Math.max(...data.counts);
 const raw=max/5,power=10**Math.floor(Math.log10(raw)),part=raw/power;
 const step=Math.max(1,(part<=1?1:part<=2?2:part<=5?5:10)*power),yMax=Math.max(1,Math.ceil(max/step)*step),y=c=>top+h*(1-c/yMax);
 chart.dataset.yMin='0';chart.dataset.yMax=String(yMax);chart.dataset.n=String(data.n);chart.dataset.kind=String(data.kind);
 chart.append(element('title',{},data.kind===0?'Liczebności wartości':'Histogram liczebności'));
 for(let c=0;c<=yMax;c+=step){chart.append(element('line',{x1:left,y1:y(c),x2:left+w,y2:y(c),class:'stat-grid'}),element('text',{x:left-9,y:y(c)+4,'text-anchor':'end',class:'plot-tick'},String(c)));}
 const count=data.counts.length,category=i=>left+w*(i+.5)/count;
 const lo=data.x[0],hi=data.x.at(-1),x=v=>left+w*(v-lo)/(hi-lo);
 data.counts.forEach((c,i)=>{
  const x0=data.kind===0?left+w*(i+.14)/count:x(data.x[i]),x1=data.kind===0?left+w*(i+.86)/count:x(data.x[i+1]);
  const bar=element('rect',{x:x0,y:y(c),width:x1-x0,height:top+h-y(c),class:'stat-bar','data-index':i,'data-count':c,'data-left':data.x[i],'data-right':data.kind===1?data.x[i+1]:data.x[i]});
  bar.append(element('title',{},`${data.kind===0?exact(data.x[i]):interval(data,i)}: ${c}`));chart.append(bar);
  if(w/count>=28&&c>0)chart.append(element('text',{x:(x0+x1)/2,y:y(c)-6,'text-anchor':'middle',class:'plot-tick stat-count'},String(c)));
 });
 const format=data.x.some((v,i)=>i>0&&number(v)===number(data.x[i-1]))?exact:number;
 const labelWidth=Math.max(95,...data.x.map(v=>format(v).length*7+16));
 const capacity=Math.max(2,Math.floor(w/labelWidth)-1),total=data.kind===0?count:count+1;
 const indices=new Set([0,total-1]);
 if(capacity>2)for(let i=0;i<total;i+=Math.ceil(total/capacity))indices.add(i);
 for(const i of [...indices].sort((a,b)=>a-b))chart.append(element('text',{x:data.kind===0?category(i):x(data.x[i]),y:top+h+24,'text-anchor':i===0?'start':i===total-1?'end':'middle',class:'plot-tick'},format(data.x[i])));
 chart.append(element('rect',{x:left,y:top,width:w,height:h,class:'plot-frame'}),element('text',{x:left,y:16,class:'plot-axis-label'},'Liczebność'),element('text',{x:left+w,y:height-10,'text-anchor':'end',class:'plot-axis-label'},data.kind===0?'Wartość (kategorie)':'Przedziały wartości'));
}
