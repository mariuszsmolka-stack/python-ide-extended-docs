// Progressive enhancement only: static navigation and readable code work without JS.
function highlight(code,source){
 const tokens=/(#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:import|from|def|return|lambda|for|in|if|else|print)\b|\b(?:math|ms3d|rysuj_3|hypot)\b|\b\d+(?:\.\d+)?\b)/g;
 const fragment=document.createDocumentFragment();let end=0;
 for(const match of source.matchAll(tokens)){
  fragment.append(document.createTextNode(source.slice(end,match.index)));const token=document.createElement('span'),text=match[0];
  token.className='py-'+(text.startsWith('#')?'comment':/^['"]/.test(text)?'string':/^\d/.test(text)?'number':/^(math|ms3d|rysuj_3|hypot)$/.test(text)?'name':'keyword');token.textContent=text;fragment.append(token);end=match.index+text.length;
 }
 fragment.append(document.createTextNode(source.slice(end)));code.replaceChildren(fragment);
}
for(const pre of document.querySelectorAll('pre[data-example]')){
 const code=pre.querySelector('code'),source=code.textContent;highlight(code,source);
 const tools=document.createElement('div');tools.className='code-tools';
 const copy=document.createElement('button');copy.type='button';copy.textContent='Kopiuj kod';copy.setAttribute('aria-label','Kopiuj kod: '+pre.dataset.example);
 const ide=document.createElement('button');ide.type='button';ide.disabled=true;ide.className='ide-unavailable';ide.textContent='Otwórz Python IDE Extended';
 const status=document.createElement('p');status.className='copy-status';status.setAttribute('role','status');
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(source);status.textContent='Skopiowano. Wklej kod do edytora i wybierz Uruchom.';}
  catch{const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Zaznaczono kod. Naciśnij Ctrl+C, aby go skopiować.';}
 });
 tools.append(copy,ide);pre.after(tools,status);
}

// Search the existing catalog DOM; never load another API or duplicate its data.
const catalog=document.querySelector('.function-catalog');
const search=document.querySelector('.catalog-search');
if(catalog&&search){
 const input=search.querySelector('input'),clear=search.querySelector('button'),status=search.querySelector('[role="status"]');
 const queryLimit=256;
 input.maxLength=queryLimit;
 // Native disclosures keep chapters usable by keyboard and touch. The static
 // catalog remains fully readable when JavaScript is unavailable.
 const chapters=[];
 for(const heading of [...catalog.querySelectorAll(':scope > h2')]){
  const chapter=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('div');
  chapter.className='catalog-chapter';chapter.open=true;content.className='catalog-chapter-content';
  heading.before(chapter);let next=heading.nextElementSibling;
  while(next&&next.tagName!=='H2'){const following=next.nextElementSibling;content.append(next);next=following;}
  summary.append(heading);chapter.append(summary,content);chapters.push(chapter);
 }
 const normalize=text=>text.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
 const entries=[...catalog.querySelectorAll('[data-function]')].map(row=>({row,chapter:row.closest('.catalog-chapter'),text:normalize([...row.querySelectorAll('.function-label,:scope > code,.function-description,.function-math')].map(e=>e.textContent).join(' '))}));
 const groups=[...catalog.querySelectorAll('[data-function-group]')].map(list=>({list,heading:list.previousElementSibling?.tagName==='H3'?list.previousElementSibling:null}));
 let previous=null;
 function filter(){
  // Enforce the bound before normalization, including programmatically set values.
  if(input.value.length>queryLimit)input.value=input.value.slice(0,queryLimit);
  const terms=normalize(input.value).trim().split(/\s+/).filter(Boolean),active=terms.length>0;
  if(active&&!previous)previous=new Map(chapters.map(chapter=>[chapter,chapter.open]));
  let count=0;
  for(const entry of entries){const match=terms.every(term=>entry.text.includes(term));entry.row.hidden=!match;if(match)count++;}
  for(const {list,heading}of groups){const empty=active&&![...list.children].some(row=>!row.hidden);list.hidden=empty;if(heading)heading.hidden=empty;}
  for(const chapter of chapters){
   chapter.hidden=active&&!entries.some(entry=>entry.chapter===chapter&&!entry.row.hidden);
   if(active&&!chapter.hidden)chapter.open=true;
   else if(!active&&previous)chapter.open=previous.get(chapter);
  }
  if(!active)previous=null;
  clear.disabled=input.value.length===0;
  status.textContent=count?`Znaleziono: ${count} z ${entries.length}`:'Nie znaleziono funkcji.';
 }
 function reset(){input.value='';filter();input.focus();}
 input.addEventListener('input',filter);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();reset();}});
 clear.addEventListener('click',reset);search.addEventListener('submit',event=>event.preventDefault());
 // A catalog anchor remains usable even if its target was filtered or collapsed.
 function revealTarget(id){const target=document.getElementById(id);if(!target||!catalog.contains(target))return;
  if(previous){input.value='';filter();}
  for(let parent=target.parentElement;parent&&parent!==catalog;parent=parent.parentElement)if(parent.matches('details.catalog-chapter'))parent.open=true;
 }
 document.querySelector('.catalog-toc')?.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link)revealTarget(decodeURIComponent(link.hash.slice(1)));});
 // Back/forward fragment navigation also reveals a collapsed target.
 window.addEventListener('hashchange',()=>revealTarget(decodeURIComponent(location.hash.slice(1))));
 search.hidden=false;filter();
 if(location.hash)revealTarget(decodeURIComponent(location.hash.slice(1)));
}
