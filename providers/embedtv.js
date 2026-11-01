'use strict';
const BASE='https://embedtv.cc';
async function data(path){try{const r=await fetch(BASE+path,{headers:{accept:'application/json','user-agent':'Mozilla/5.0'},redirect:'follow'});if(!r.ok)return[];const x=await r.json();return Array.isArray(x)?x:(x?.channels||x?.events||x?.data||[])}catch(_){return[]}}
function st(url,title){return /^https?:\/\//i.test(String(url||''))?{url:String(url),title,name:title,provider:'EmbedTV',sourceName:'EmbedTV',type:/\.m3u8?(?:[?#]|$)/i.test(url)?'hls':'iframe',behaviorHints:{notWebReady:true}}:null}
async function getStreams(id){const key=String(id||'').replace(/^iracematv_embedtv_(?:channel_)?/i,'');const rows=await data('/api/channels');const x=rows.find(a=>String(a.id)===key||String(a.slug||'')===key);if(!x)return[];return[...(Array.isArray(x.players)?x.players:[]),x.url,x.embed_url].map(u=>st(typeof u==='object'?(u.url||u.embed_url):u,x.name||key)).filter(Boolean)}
async function parseLiveSearchResults(q){const x=await data('/api/channels');const z=String(q||'').toLowerCase();return x.filter(a=>!z||`${a.name||''} ${a.id||''}`.toLowerCase().includes(z)).map(a=>({id:`iracematv_embedtv_channel_${a.id}`,type:'tv',name:a.name||a.id,logo:a.logo||a.logo_url,description:a.description||''}))}
module.exports={getStreams,parseLiveSearchResults,onSettings:()=>[]};
