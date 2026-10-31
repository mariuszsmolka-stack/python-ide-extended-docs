import { validatePlot, PLOT_LIMITS } from './qlc/qlc-plot-data.mjs';
import { initialView, validateView, fitView, zoomView, panView, clipSegment, sampleX } from './plot-view.mjs';
import { aspectView, geometryZoom, geometryPan } from './plot-geometry.mjs';
import { analyticalFrame } from './analytical-frame.mjs';
import { poleModels, poleExtensions } from './plot-discontinuity.mjs';
import { renderMeshPacket, clearMeshes } from './mesh-ui.js';
import { renderStatPlot, resizeStatChart } from './stat-ui.js';
export { abortMeshTransfer } from './mesh-ui.js';
const NS = 'http://www.w3.org/2000/svg', right = 24, top = 25, bottom = 55;
const chartData = new WeakMap();
function svg(name, attributes = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function ticks(min, max, count = 6) {
  const raw = (max-min)/count, power = 10**Math.floor(Math.log10(raw)), part = raw/power;
  const step = (part<=1?1:part<=2?2:part<=5?5:10)*power, result = [], first = Math.ceil(min/step);
  for (let i=0;i<16;i++) {
    let value=(first+i)*step;
    if (!Number.isFinite(value) || value>max && value-max>step*1e-8) break;
    if (Math.abs(value)<step*1e-8) value=0;
    result.push({ value, text:label(value,step) });
  }
  return result;
}
function label(value, step) {
  if (value===0) return '0';
  const digits=Math.min(15,Math.max(2,Math.ceil(Math.log10(Math.abs(value)/step))+2));
  if (Math.abs(value)>=1e5 || Math.abs(value)<1e-3) return value.toExponential(digits-1).replace(/(\.\d*?)0+e/,'$1e').replace(/\.e/,'e');
  return new Intl.NumberFormat('pl-PL',{maximumFractionDigits:Math.min(12,Math.max(0,-Math.floor(Math.log10(step))+1))}).format(value);
}
function refresh(entry, message='') {
  entry.status.textContent=message;
  entry.legendButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(entry.visible[i])));
  resizeChart(entry.card,true);
  for (const [key,input] of Object.entries(entry.inputs)) input.value=String(entry.view[key]);
}
const zoom=(entry,factor,anchor)=>entry.implicit?geometryZoom(entry.view,factor,anchor):zoomView(entry.view,factor,anchor);
const pan=(entry,view,dx,dy)=>entry.implicit?geometryPan(view,dx,dy):panView(view,dx,dy);
function changeView(entry, action) {
  try {
    const next=validateView(action(),!entry.implicit);
    if(entry.implicit){
      aspectView(next,entry.frame.width,entry.frame.height);
      entry.requested=next;
    }
    entry.view=next; refresh(entry);
  }
  catch (error) { refresh(entry,error.message); }
}
function resizeChart(card, force=false) {
  if(card.classList.contains('stat-card')){resizeStatChart(card,force);return;}
  const entry=chartData.get(card), results=card.parentElement;
  if (!entry || !results.clientWidth || !results.clientHeight) return;
  const W=Math.max(240,Math.floor(results.clientWidth));
  const extra=Math.ceil(card.getBoundingClientRect().height-entry.chart.getBoundingClientRect().height);
  const H=Math.max(200,Math.floor(results.clientHeight-extra-1));
  if (!force && entry.width===W && entry.height===H) return;
  entry.width=W; entry.height=H; drawChart(entry,W,H);
}
const resultsPanel=document.getElementById('plot');
new ResizeObserver(()=>{
  const cards=Array.from(resultsPanel.children), anchor=cards.findLast(card=>card.offsetTop<=resultsPanel.scrollTop+1);
  const offset=anchor?resultsPanel.scrollTop-anchor.offsetTop:0;
  cards.forEach(card=>resizeChart(card));
  if (anchor) resultsPanel.scrollTop=anchor.offsetTop+offset;
}).observe(resultsPanel);
export function clearPlot(message='Zdefiniuj funkcje Python i wywołaj rysuj(f) lub rysuj(f, k, ...).') {
  clearMeshes();
  resultsPanel.replaceChildren(); resultsPanel.scrollTop=0;
  document.getElementById('plot-status').textContent=message;
}
function button(text,name,action) {
  const item=document.createElement('button'); item.type='button'; item.textContent=text;
  item.setAttribute('aria-label',name); item.title=name; item.addEventListener('click',action); return item;
}
export function renderPlot(raw) {
  if(raw?.version===6){renderStatPlot(raw,resultsPanel);return;}
  if(raw?.version===5){renderMeshPacket(raw,resultsPanel);return;}
  const data=validatePlot(raw), number=resultsPanel.childElementCount+1;
  if (number>PLOT_LIMITS.plots) throw new RangeError('Limit wykresów w wynikach');
  const card=document.createElement('article'); card.className='plot-card';
  const initial=initialView(data);
  const implicit=data.version===3||data.version===4, series=implicit?(data.series||[data]):null, seriesCount=implicit?series.length:data.curves.length;
  const entry={card,data,number,initial,implicit,series,seriesCount,requested:{...initial},view:{...initial},visible:Array(seriesCount).fill(true),inputs:{},legendButtons:[],width:0,height:0};
  entry.poles=implicit?null:data.curves.map(poleModels);
  entry.breaks=entry.poles?.map(models=>new Set(models.filter(p=>p.index!==null).map(p=>p.index)));
  const bar=document.createElement('div'); bar.className='plot-titlebar';
  const heading=document.createElement('h3'); heading.textContent=`Wykres ${number}`;
  const tools=document.createElement('div'); tools.className='plot-tools'; tools.setAttribute('role','group'); tools.setAttribute('aria-label',`Widok wykresu ${number}`);
  tools.append(button('+','Przybliż',()=>changeView(entry,()=>zoom(entry,.8))),
    button('−','Oddal',()=>changeView(entry,()=>zoom(entry,1.25))),
    button('Dopasuj','Dopasuj do widocznych funkcji w bieżącym zakresie X',()=>{
      const fit=fitView(data,entry.visible,entry.view.xMin,entry.view.xMax);
      if (fit) changeView(entry,()=>fit);
      else refresh(entry,entry.visible.some(Boolean)?'Brak poprawnych próbek w widocznym zakresie X.':'Wszystkie funkcje są ukryte. Włącz funkcję w legendzie.');
    }));
  if(!implicit)tools.append(button('Kadr analityczny','Zaproponuj kadr na podstawie zapisanych próbek widocznych funkcji',()=>{
    const proposal=analyticalFrame(data,entry.visible);
    if(proposal.view)changeView(entry,()=>proposal.view);
    refresh(entry,proposal.reason);
  }));
  tools.append(button('Reset','Przywróć początkowe zakresy osi',()=>changeView(entry,()=>({...initial}))));
  const settings=document.createElement('details'); settings.className='plot-settings';
  const summary=document.createElement('summary'); summary.textContent='Zakresy';
  const form=document.createElement('form'); form.noValidate=true; form.className='plot-ranges';
  for (const [key,text] of [['xMin','X min'],['xMax','X max'],['yMin','Y min'],['yMax','Y max']]) {
    const caption=document.createElement('label'); caption.textContent=text;
    const input=document.createElement('input'); input.type='text'; input.inputMode='decimal'; input.name=key; input.autocomplete='off'; input.spellcheck=false;
    caption.append(input); form.append(caption); entry.inputs[key]=input;
  }
  const hint=document.createElement('p'); hint.textContent=implicit?'Podany obszar pozostaje widoczny; oś rozszerza się do proporcji panelu. Dane tylko w [−10,10]².':'X: tylko −10…10. Zakresy nie tworzą nowych próbek.';
  const apply=document.createElement('button'); apply.type='submit'; apply.textContent='Zastosuj';
  const formError=document.createElement('p'); formError.className='plot-range-error'; formError.setAttribute('role','alert');
  form.append(hint,apply,formError); settings.append(summary,form); tools.append(settings);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try {
      const next=validateView(Object.fromEntries(Object.entries(entry.inputs).map(([key,input])=>[key,input.value])),!implicit);
      if(implicit){
        aspectView(next,entry.frame.width,entry.frame.height);
        entry.requested=next;
      }
      entry.view=next;
      formError.textContent=''; settings.open=false; refresh(entry);
    } catch (error) { formError.textContent=error.message; }
  });
  bar.append(heading,tools);
  const legend=document.createElement('div'); legend.className='plot-legend';
  Array.from({length:seriesCount}).forEach((_,index)=>{
    const item=button(`Funkcja ${index+1}`,`Pokaż lub ukryj funkcję ${index+1}`,()=>{
      entry.visible[index]=!entry.visible[index];
      refresh(entry,entry.visible.some(Boolean)?'Widoczność zmieniona. Dopasuj dobiera Y do włączonych funkcji.':'Wszystkie funkcje są ukryte. Włącz funkcję w legendzie.');
    });
    item.className=`legend-toggle legend-${index+1}`; legend.append(item); entry.legendButtons.push(item);
  });
  const scale=document.createElement('span'); scale.className='plot-view-summary'; legend.append(scale); entry.summary=scale;
  const chart=svg('svg',{class:'plot-chart',role:'img',tabindex:0,'aria-labelledby':`plot-title-${number}`,'aria-description':'Przeciągnij widok. Strzałki przesuwają, plus i minus przybliżają, Home resetuje. Ctrl i kółko przybliża pod kursorem.'}); entry.chart=chart;
  const status=document.createElement('p'); status.className='plot-view-status'; status.setAttribute('role','status'); entry.status=status;
  const missing=implicit?series.map(item=>item.invalid):data.curves.map(curve=>curve.filter(v=>v===null).length);
  const notes=missing.map((count,i)=>count?`Funkcja ${i+1}: pominięte punkty ${count}, w tym wyjątki Python ${implicit?series[i].errors:data.errors[i]}.`:'').filter(Boolean);
  const note=document.createElement('p'); note.className='plot-note';
  const hasValues=implicit?series.some(item=>item.contours.length>0):data.curves.some(curve=>curve.some(value=>value!==null));
  note.textContent=(implicit?`F: siatka 81×81; f: 401 próbek · krzywe: ${seriesCount}, kontury: ${series.reduce((n,item)=>n+item.contours.length,0)}. Jednakowa skala X i Y. `:hasValues?'401 próbek/funkcję, Δx = 0,05. Zoom nie dodaje danych. Przeciągnij widok; Ctrl+kółko: zoom. ':'Brak poprawnych wartości do narysowania. ')+notes.join(' ');
  const breakCount=entry.breaks?.reduce((n,b)=>n+b.size,0)||0;
  if(breakCount)note.textContent+=` Wykryte prawdopodobne asymptoty: ${breakCount}. Pominięto tylko łączące odcinki; próbki zachowano. Detekcja jest heurystyczna.`;
  if(entry.poles?.some(models=>models.length))note.textContent+=' Przedłużenie ku granicy jest wizualizacją lokalnego modelu, nie nowymi próbkami Pythona ani obliczeniem nieskończoności.';
  if(implicit&&!hasValues)note.textContent+=' Nie znaleziono konturu poziomu zero w poprawnych komórkach siatki.';
  const details=document.createElement('details'); details.className='plot-details';
  const more=document.createElement('summary'); more.textContent='Szczegóły wykresu';details.append(more,note);
  const warning=document.createElement('p');warning.className='plot-data-warning';warning.hidden=!notes.length;
  warning.textContent=notes.length?'Niepełne dane: pominięte próbki lub wyjątki funkcji. Liczby w szczegółach wykresu.':'';
  const domain=document.createElement('p');domain.className='plot-domain-note';domain.hidden=!implicit;
  domain.textContent='Dane obliczone w [−10,10]². Poza tym obszarem krzywe nie są przedłużane.';
  card.append(bar,legend,chart,status,warning,domain,details); chartData.set(card,entry); resultsPanel.append(card);
  details.addEventListener('toggle',()=>resizeChart(card,true));
  installNavigation(entry); refresh(entry); resultsPanel.scrollTop=card.offsetTop;
  document.getElementById('plot-status').textContent=`Liczba wykresów: ${number}. ${hasValues?notes.join(' '):implicit?'Brak konturów poziomu zero.':'Brak poprawnych wartości do narysowania.'}`;
}
function installNavigation(entry) {
  const chart=entry.chart; let dragging=null;
  function relative(event) {
    const rect=chart.getBoundingClientRect(), frame=entry.frame;
    return {x:((event.clientX-rect.x)*entry.width/rect.width-frame.left)/frame.width,y:((event.clientY-rect.y)*entry.height/rect.height-frame.top)/frame.height};
  }
  chart.addEventListener('wheel',event=>{
    if (!event.ctrlKey && !event.metaKey) return;
    const point=relative(event);
    if (point.x<0||point.x>1||point.y<0||point.y>1) return;
    event.preventDefault(); changeView(entry,()=>zoom(entry,event.deltaY<0?.8:1.25,{x:point.x,y:1-point.y}));
  },{passive:false});
  chart.addEventListener('pointerdown',event=>{
    if (event.button!==0) return;
    const point=relative(event);
    if (point.x<0||point.x>1||point.y<0||point.y>1) return;
    event.preventDefault(); chart.focus({preventScroll:true}); chart.setPointerCapture(event.pointerId);
    dragging={id:event.pointerId,x:event.clientX,y:event.clientY,view:{...entry.view},frame:{...entry.frame}};
    chart.classList.add('is-panning');
  });
  chart.addEventListener('pointermove',event=>{
    if (dragging?.id===event.pointerId) changeView(entry,()=>pan(entry,dragging.view,-(event.clientX-dragging.x)/dragging.frame.width,(event.clientY-dragging.y)/dragging.frame.height));
  });
  const end=()=>{dragging=null;chart.classList.remove('is-panning');};
  for (const type of ['pointerup','pointercancel','lostpointercapture']) chart.addEventListener(type,end);
  chart.addEventListener('keydown',event=>{
    const action={ArrowLeft:()=>pan(entry,entry.view,-.1,0),ArrowRight:()=>pan(entry,entry.view,.1,0),ArrowUp:()=>pan(entry,entry.view,0,.1),ArrowDown:()=>pan(entry,entry.view,0,-.1),'+':()=>zoom(entry,.8),'=':()=>zoom(entry,.8),'-':()=>zoom(entry,1.25),Home:()=>({...entry.initial})}[event.key];
    if (action) {event.preventDefault();changeView(entry,action);}
  });
}
function drawChart(entry,W,H) {
  const {chart,data,number}=entry;
  let view=entry.implicit?entry.requested:entry.view;
  let yTicks=ticks(view.yMin,view.yMax,Math.max(2,Math.min(8,Math.floor((H-top-bottom)/45))));
  let left=Math.max(68,Math.min(W-140,Math.max(...yTicks.map(t=>t.text.length),1)*8+18));
  let frameTop=top,width=W-left-right,height=H-top-bottom;
  if(entry.implicit){
    // Fill the whole frame; expand the camera instead of letterboxing the grid.
    for(let i=0;i<4;i++){
      width=W-left-right;
      view=aspectView(entry.requested,width,height);
      yTicks=ticks(view.yMin,view.yMax,Math.max(2,Math.min(8,Math.floor(height/45))));
      const needed=Math.max(68,Math.min(W-140,Math.max(...yTicks.map(t=>t.text.length),1)*8+18));
      if(needed<=left)break;
      left=needed;
    }
    width=W-left-right;view=aspectView(entry.requested,width,height);entry.view=view;
    for(const [key,input]of Object.entries(entry.inputs))input.value=String(view[key]);
  }
  const frameRight=left+width,frameBottom=frameTop+height;
  entry.frame={left,top:frameTop,width,height}; chart.replaceChildren();
  chart.setAttribute('viewBox',`0 0 ${W} ${H}`);chart.setAttribute('width',W);chart.setAttribute('height',H);
  for (const [key,value] of Object.entries(view)) chart.dataset[key]=String(value);
  entry.summary.textContent=`X: ${label(view.xMin,Math.min(.01,(view.xMax-view.xMin)/6))}…${label(view.xMax,Math.min(.01,(view.xMax-view.xMin)/6))} · Y: ${label(view.yMin,Math.min(.01,(view.yMax-view.yMin)/6))}…${label(view.yMax,Math.min(.01,(view.yMax-view.yMin)/6))}`;
  entry.summary.title=`X: [${view.xMin}, ${view.xMax}], Y: [${view.yMin}, ${view.yMax}]`;
  const x=value=>left+(value-view.xMin)/(view.xMax-view.xMin)*width;
  const y=value=>frameTop+(view.yMax-value)/(view.yMax-view.yMin)*height;
  const clipId=`plot-clip-${number}`;
  chart.append(svg('title',{id:`plot-title-${number}`},`Wykres ${number}, ${entry.implicit?'F(x,y)=0':'funkcje Python: '+data.curves.length}`),svg('desc',{},entry.implicit?'Kontury obliczone w CPythonie, jednakowa skala jednostek X i Y.':'Tylko obliczone próbki X od -10 do 10. Przerwy oznaczają brak wartości.'));
  const definitions=svg('defs'),clip=svg('clipPath',{id:clipId});clip.append(svg('rect',{x:left,y:frameTop,width,height}));definitions.append(clip);chart.append(definitions);
  const grid=svg('g',{class:'plot-grid'});chart.append(grid);
  let xTicks=ticks(view.xMin,view.xMax,Math.max(2,Math.min(10,Math.floor(width/70))));
  const labelWidth=Math.max(...xTicks.map(t=>t.text.length),1)*8+16;
  if(labelWidth>70)xTicks=ticks(view.xMin,view.xMax,Math.max(2,Math.min(10,Math.floor(width/labelWidth))));
  for (const tick of xTicks) {
    grid.append(svg('line',{x1:x(tick.value),y1:frameTop,x2:x(tick.value),y2:frameBottom}));
    const px=x(tick.value), align=px+tick.text.length*4>W-4?'end':'middle';
    chart.append(svg('text',{x:px,y:frameBottom+25,'text-anchor':align,class:'plot-tick'},tick.text));
  }
  for (const tick of yTicks) {
    grid.append(svg('line',{x1:left,y1:y(tick.value),x2:frameRight,y2:y(tick.value)}));
    chart.append(svg('text',{x:left-12,y:y(tick.value)+5,'text-anchor':'end',class:'plot-tick'},tick.text));
  }
  chart.append(svg('rect',{x:left,y:frameTop,width,height,class:'plot-frame'}));
  if(view.yMin<=0&&view.yMax>=0)chart.append(svg('line',{x1:left,y1:y(0),x2:frameRight,y2:y(0),class:'plot-axis'}));
  if(view.xMin<=0&&view.xMax>=0)chart.append(svg('line',{x1:x(0),y1:frameTop,x2:x(0),y2:frameBottom,class:'plot-axis'}));
  chart.append(svg('text',{x:frameRight,y:frameBottom+47,'text-anchor':'end',class:'plot-axis-label'},'X'),svg('text',{x:left-18,y:frameTop-9,class:'plot-axis-label'},'Y'));
  if(entry.implicit){
    entry.series.forEach((item,curveIndex)=>item.contours.forEach((contour,index)=>{
      let path='',pen=null;
      for(let i=1;i<contour.length;i++){
        const a=contour[i-1].map(n=>n/PLOT_LIMITS.implicitScale),b=contour[i].map(n=>n/PLOT_LIMITS.implicitScale),part=clipSegment(...a,...b,view);
        if(!part){pen=null;continue;}
        const from=`${x(part[0]).toFixed(2)},${y(part[1]).toFixed(2)}`,to=`${x(part[2]).toFixed(2)},${y(part[3]).toFixed(2)}`;
        path+=`${pen===from?'':'M'+from}L${to} `;pen=to;
      }
      chart.append(svg('path',{d:path.trim(),class:`plot-curve curve-${curveIndex+1}`,'clip-path':`url(#${clipId})`,'data-curve':curveIndex+1,'data-contour':index+1,visibility:entry.visible[curveIndex]?'visible':'hidden'}));
    }));
    return;
  }
  data.curves.forEach((curve,index)=>{
    let path='',pen=null;
    const appendSegment=(a,b)=>{
      const part=clipSegment(...a,...b,view);
      if(!part){pen=null;return false;}
      const from=`${x(part[0]).toFixed(2)},${y(part[1]).toFixed(2)}`,to=`${x(part[2]).toFixed(2)},${y(part[3]).toFixed(2)}`;
      path+=`${pen===from?'':'M'+from}L${to} `;pen=to;return true;
    };
    curve.forEach((value,i)=>{
      if(value===null){pen=null;return;}
      if(i&&curve[i-1]!==null&&!entry.breaks[index].has(i)){
        appendSegment([sampleX(i-1),curve[i-1]],[sampleX(i),value]);
      }else pen=null;
      if((!i||curve[i-1]===null)&&(i===curve.length-1||curve[i+1]===null)&&sampleX(i)>=view.xMin&&sampleX(i)<=view.xMax&&value>=view.yMin&&value<=view.yMax)chart.append(svg('circle',{cx:x(sampleX(i)),cy:y(value),r:2.5,class:`plot-point curve-${index+1}`,visibility:entry.visible[index]?'visible':'hidden','clip-path':`url(#${clipId})`}));
    });
    let extensionCount=0;
    for(const extension of poleExtensions(entry.poles[index],curve,view)){
      pen=null;let drawn=false;
      for(let i=1;i<extension.points.length;i++)drawn=appendSegment(extension.points[i-1],extension.points[i])||drawn;
      if(drawn)extensionCount++;
    }
    chart.append(svg('path',{d:path.trim(),class:`plot-curve curve-${index+1}`,'clip-path':`url(#${clipId})`,'data-curve':index+1,'data-extensions':extensionCount,visibility:entry.visible[index]?'visible':'hidden'}));
  });
}
