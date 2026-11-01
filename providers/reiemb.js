'use strict';
const API='https://api.reidoscanais.si';
function st(url,title){return /^https?:\/\//i.test(String(url||''))?{url:String(url),title,name:title,provider:'Rei Emb',sourceName:'Rei Emb',type:/\.m3u8?(?:[?#]|$)/i.test(url)?'hls':'iframe',behaviorHints:{notWebReady:true}}:null}
async function rows(){try{const r=await fetch(API+'/channels',{headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});if(!r.ok)return[];const x=await r.json();return Array.isArray(x?.data)?x.data:[]}catch(_){return[]}}
async function getStreams(id){const key=String(id||'').replace(/^iracematv_(?:channel_)?/i,'');const x=(await rows()).find(a=>String(a.id)===key||String(a.slug||'')===key);if(!x)return[];return(Array.isArray(x.embeds)?x.embeds:[]).map(a=>st(typeof a==='string'?a:a?.embed_url||a?.url,`${x.name||key} • ${a?.quality||''}`.trim())).filter(Boolean)}
async function parseLiveSearchResults(q){const z=String(q||'').toLowerCase();return(await rows()).filter(a=>!z||`${a.name||''} ${a.id||''} ${a.category||''}`.toLowerCase().includes(z)).map(a=>({id:`iracematv_channel_${a.id}`,type:'tv',name:a.name||a.id,logo:a.logo_url,description:a.description||'',category:a.category||''}))}
module.exports={getStreams,parseLiveSearchResults,onSettings:()=>[]};
