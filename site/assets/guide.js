const stage=document.querySelector('.guide-stage'),scroller=document.querySelector('.guide-scroller');
if(stage&&scroller){
 const buttons=[...stage.querySelectorAll('.guide-hotspot')],overview=document.querySelector('#guide-overview'),panel=document.querySelector('#guide-explanation');
 const topics=new Map([...document.querySelectorAll('[data-guide-description]')].map(node=>[node.dataset.guideDescription,{name:node.querySelector('dt').textContent,text:node.querySelector('.guide-description').textContent,tip:node.querySelector('.guide-advice').textContent}]));
 let active='run';
 function show(id){const topic=topics.get(id);if(!topic)return;panel.querySelector('h2').textContent=topic.name;panel.querySelector('p').textContent=topic.text;panel.querySelector('.guide-tip').textContent=topic.tip;}
 function reveal(button){if(!button)return;const area=button.getBoundingClientRect(),frame=scroller.getBoundingClientRect();
  if(area.left<frame.left||area.right>frame.right||area.top<frame.top||area.bottom>frame.bottom)scroller.scrollTo({left:button.offsetLeft+button.offsetWidth/2-scroller.clientWidth/2,top:button.offsetTop+button.offsetHeight/2-scroller.clientHeight/2,behavior:'auto'});
 }
 function activate(id,pan=true){if(!topics.has(id))return;active=id;for(const button of buttons){const chosen=button.dataset.topic===id;button.classList.toggle('is-active',chosen);button.setAttribute('aria-pressed',String(chosen));}show(id);if(pan)reveal(buttons.find(button=>button.dataset.topic===id));}
 for(const button of buttons){
  const[x,y,width,height]=button.dataset.area.split(',').map(Number);button.style.left=x+'%';button.style.top=y+'%';button.style.width=width+'%';button.style.height=height+'%';button.hidden=false;
  button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){button.classList.add('is-preview');show(button.dataset.topic);}});
  button.addEventListener('pointerleave',()=>{button.classList.remove('is-preview');show(active);});
  button.addEventListener('focus',()=>{button.classList.add('is-preview');show(button.dataset.topic);if(button.matches(':focus-visible'))reveal(button);});
  button.addEventListener('blur',()=>{button.classList.remove('is-preview');show(active);});
  button.addEventListener('click',event=>{activate(button.dataset.topic,false);if(matchMedia('(max-width:1000px)').matches){if(event.pointerType==='touch')reveal(button);panel.scrollIntoView({block:'nearest',behavior:'auto'});}});
 }
 overview.addEventListener('click',()=>{const full=stage.classList.toggle('is-overview');overview.setAttribute('aria-pressed',String(full));overview.textContent=full?'Czytelny widok':'Pokaż całość';requestAnimationFrame(()=>reveal(buttons.find(button=>button.dataset.topic===active)));});
 new ResizeObserver(()=>reveal(buttons.find(button=>button.dataset.topic===active))).observe(scroller);
 activate(active,false);requestAnimationFrame(()=>reveal(buttons.find(button=>button.dataset.topic===active)));
}
