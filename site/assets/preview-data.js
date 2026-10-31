const manifest=fetch(new URL('./previews.json',import.meta.url)).then(async response=>{
 if(!response.ok)throw Error('Nie udało się pobrać spisu podglądów.');
 const text=await response.text();if(text.length>65536)throw Error('Niepoprawny spis podglądów.');
 const value=JSON.parse(text);if(value.schemaVersion!==1||!value.items||typeof value.items!=='object')throw Error('Niepoprawny spis podglądów.');return value.items;
});
export async function previewData(name,kind,limit){
 if(!/^[a-z][a-z0-9-]{0,63}$/.test(name))throw Error('Nieznany podgląd.');
 const items=await manifest,entry=Object.hasOwn(items,name)?items[name]:null;
 if(!entry||entry.kind!==kind||entry.file!==name+'.json')throw Error('Nieznany podgląd.');
 const response=await fetch(new URL('./'+entry.file,import.meta.url));
 if(!response.ok)throw Error('Nie udało się pobrać podglądu.');
 const text=await response.text();if(text.length>limit)throw Error('Zbyt duży podgląd.');
 return JSON.parse(text);
}
