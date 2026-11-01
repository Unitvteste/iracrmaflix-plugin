'use strict';

const DEFAULT_CHANNEL_API = 'https://api.reidoscanais.si';
const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36';

function cfg(value) {
  if (value && typeof value === 'object') return value;
  return typeof globalThis !== 'undefined' ? (globalThis.SCRAPER_SETTINGS || globalThis.scraperSettings || {}) : {};
}
function text(value) { return String(value || '').trim(); }
function settings() {
  return [
    { type: 'header', label: 'Canais públicos' },
    { type: 'text', key: 'channelApi', label: 'API de canais', defaultValue: DEFAULT_CHANNEL_API },
    { type: 'header', label: 'Xtream' },
    { type: 'text', key: 'xtreamUrl', label: 'URL base Xtream', defaultValue: '' },
    { type: 'text', key: 'xtreamUsername', label: 'Usuário Xtream', defaultValue: '' },
    { type: 'password', key: 'xtreamPassword', label: 'Senha Xtream', defaultValue: '' },
    { type: 'header', label: 'M3U' },
    { type: 'text', key: 'm3uUrl', label: 'URL da playlist M3U', defaultValue: '' }
  ];
}
function headers(referer) {
  return { accept: 'application/json, text/plain, */*', 'user-agent': DEFAULT_UA, ...(referer ? { referer } : {}) };
}
async function json(url, options = {}) {
  const response = await fetch(url, { redirect: 'follow', headers: headers(options.referer), ...options });
  if (!response.ok) return null;
  try { return await response.json(); } catch (_) { return null; }
}
function channelsFrom(payload) {
  const data = Array.isArray(payload) ? payload : payload?.data || payload?.channels || [];
  return Array.isArray(data) ? data : [];
}
function stream(url, title, provider, type = 'iframe') {
  if (!/^https?:\/\//i.test(text(url))) return null;
  return { url: text(url), title: title || provider, name: title || provider, provider, sourceName: provider, type, behaviorHints: { notWebReady: type === 'iframe' } };
}
async function publicChannels(value) {
  const base = text(cfg(value).channelApi || DEFAULT_CHANNEL_API).replace(/\/$/, '');
  const payload = await json(`${base}/channels`);
  return channelsFrom(payload);
}
async function getPublicChannel(id, value) {
  const key = text(id).replace(/^iracematv_(?:channel_|embedtv_channel_)?/i, '');
  if (!key) return [];
  const items = await publicChannels(value);
  const item = items.find(x => text(x.id).toLowerCase() === key.toLowerCase() || text(x.slug).toLowerCase() === key.toLowerCase());
  if (!item) return [];
  const embeds = Array.isArray(item.embeds) ? item.embeds : [];
  return embeds.map(x => stream(typeof x === 'string' ? x : x?.embed_url || x?.url, `${item.name || item.id} • ${x?.quality || ''}`.trim(), x?.provider || 'Canais')).filter(Boolean);
}
function parseM3U(textValue, wanted) {
  const lines = String(textValue || '').split(/\r?\n/);
  const out = [];
  let meta = null;
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) { meta = line; continue; }
    if (!meta || !/^https?:\/\//i.test(line.trim())) continue;
    const url = line.trim();
    const name = (meta.match(/,(.*)$/)?.[1] || '').trim();
    const id = (meta.match(/tvg-id="([^"]+)"/i)?.[1] || '').trim();
    const group = (meta.match(/group-title="([^"]+)"/i)?.[1] || '').trim();
    if (!wanted || [id, name, group].some(x => x.toLowerCase().includes(wanted.toLowerCase()))) out.push(stream(url, name || id || 'M3U', 'M3U', /\.m3u8?(?:[?#]|$)/i.test(url) ? 'hls' : 'mp4'));
    meta = null;
    if (out.length >= 20) break;
  }
  return out;
}
async function getM3U(id, value) {
  const url = text(cfg(value).m3uUrl);
  if (!url) return [];
  try { const response = await fetch(url, { redirect: 'follow', headers: headers() }); return response.ok ? parseM3U(await response.text(), text(id).replace(/^m3u-?/i, '')) : []; } catch (_) { return []; }
}
async function getXtream(id, value) {
  const c = cfg(value);
  const base = text(c.xtreamUrl).replace(/\/$/, '');
  const user = text(c.xtreamUsername), pass = text(c.xtreamPassword);
  if (!base || !user || !pass) return [];
  const raw = text(id).replace(/^xtream[-_]/i, '');
  if (!/^\d+$/.test(raw)) return [];
  const url = `${base}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${raw}.m3u8`;
  return [stream(url, `Xtream • ${raw}`, 'Xtream', 'hls')].filter(Boolean);
}
async function getStreams(id, mediaType, season, episode, value) {
  const key = text(id);
  if (season != null || episode != null) return [];
  if (/^xtream[-_]/i.test(key)) return getXtream(key, value);
  if (/^m3u[-_]/i.test(key)) return getM3U(key, value);
  if (String(mediaType || '').toLowerCase() === 'tv' || /^iracematv_/i.test(key)) return getPublicChannel(key, value);
  return [];
}
async function parseLiveSearchResults(query, value) {
  const q = text(query).toLowerCase();
  return (await publicChannels(value)).filter(x => !q || `${x.id} ${x.name} ${x.category}`.toLowerCase().includes(q)).map(x => ({ id: `iracematv_channel_${x.id}`, type: 'tv', name: x.name, logo: x.logo_url, description: x.description, category: x.category }));
}
module.exports = { getStreams, onSettings: settings, parseLiveSearchResults };
