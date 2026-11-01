'use strict';
const HOME='https://embedcanais.online/';
function st(url,title){return /^https?:\/\//i.test(String(url||''))?{url:String(url),title,name:title,provider:'Embed Canais',sourceName:'Embed Canais',type:/\.m3u8?(?:[?#]|$)/i.test(url)?'hls':'iframe',behaviorHints:{notWebReady:true}}:null}
async function catalog(){try{const r=await fetch(HOME,{headers:{accept:'text/html','user-agent':'Mozilla/5.0'}});if(!r.ok)return[];const h=await r.text(),m=h.match(/(?:const|var)\s+CHANNELS\s*=\s*(\[[\s\S]*?\]);/i);return m?JSON.parse(m[1]):[]}catch(_){return[]}}
async function getStreams(id){const key=String(id||'').replace(/^iracematv_(?:embedcanais_)?/i,'');const rows=await catalog();const x=rows.find(a=>String(a.id||a.slug||a.name)===key||String(a.slug||'')===key);if(!x)return[];const urls=[x.url,x.embed_url,x.player_url,...(x.embeds||[]).map(a=>typeof a==='string'?a:a?.embed_url||a?.url)];return urls.map(u=>st(u,x.name||key)).filter(Boolean)}
async function parseLiveSearchResults(q){const z=String(q||'').toLowerCase();return(await catalog()).filter(a=>!z||`${a.name||''} ${a.id||''}`.toLowerCase().includes(z)).map(a=>({id:`iracematv_embedcanais_${a.id||a.slug}`,type:'tv',name:a.name||a.title||a.id,logo:a.logo||a.logo_url,description:a.description||''}))}
module.exports={getStreams,parseLiveSearchResults,onSettings:()=>[]};
