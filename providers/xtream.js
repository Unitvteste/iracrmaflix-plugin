'use strict';

function getConfig(value) {
  if (value && typeof value === 'object') return value;
  return typeof globalThis !== 'undefined' ? (globalThis.SCRAPER_SETTINGS || globalThis.scraperSettings || {}) : {};
}
function text(value) { return String(value || '').trim(); }
function baseConfig(value) {
  const c = getConfig(value);
  return { base: text(c.xtreamUrl).replace(/\/$/, ''), user: text(c.xtreamUsername), pass: text(c.xtreamPassword) };
}
function headers() { return { accept: 'application/json', 'user-agent': 'IracemaFlix-Nuvio-Xtream/1.0' }; }
function stream(url, title, type) {
  return { url, title, name: title, provider: 'Xtream', sourceName: 'Xtream', type, behaviorHints: { notWebReady: false } };
}
async function api(action, value, extra = {}) {
  const c = baseConfig(value);
  if (!c.base || !c.user || !c.pass) return null;
  const u = new URL(`${c.base}/player_api.php`);
  u.searchParams.set('username', c.user);
  u.searchParams.set('password', c.pass);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, String(v));
  try {
    const r = await fetch(u.href, { headers: headers(), redirect: 'follow' });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
}
function onSettings() {
  return [
    { type: 'text', key: 'xtreamUrl', label: 'URL base Xtream', defaultValue: '' },
    { type: 'text', key: 'xtreamUsername', label: 'Usuário Xtream', defaultValue: '' },
    { type: 'password', key: 'xtreamPassword', label: 'Senha Xtream', defaultValue: '' }
  ];
}
function liveUrl(c, id, extension = 'm3u8') { return `${c.base}/live/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
function movieUrl(c, id, extension = 'mp4') { return `${c.base}/movie/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
function episodeUrl(c, id, extension = 'mp4') { return `${c.base}/series/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
async function getStreams(id, mediaType, season, episode, value) {
  const c = baseConfig(value); if (!c.base || !c.user || !c.pass) return [];
  const key = text(id);
  if (season != null || episode != null) {
    const episodeId = key.replace(/^xtream-(?:series|episode)-/i, '');
    if (!/^\d+$/.test(episodeId)) return [];
    return [stream(episodeUrl(c, episodeId), `Xtream • Série S${season}E${episode}`, 'mp4')];
  }
  if (/^xtream-(?:movie|vod)-/i.test(key)) {
    const vodId = key.replace(/^xtream-(?:movie|vod)-/i, '');
    return /^\d+$/.test(vodId) ? [stream(movieUrl(c, vodId), 'Xtream • Filme', 'mp4')] : [];
  }
  const liveId = key.replace(/^xtream-(?:live|channel)-/i, '');
  if (/^\d+$/.test(liveId) && String(mediaType).toLowerCase() === 'tv') return [stream(liveUrl(c, liveId), 'Xtream • TV ao vivo', 'hls')];
  return [];
}
async function parseLiveSearchResults(query, value) {
  const q = text(query).toLowerCase();
  const rows = await api('get_live_streams', value);
  return (Array.isArray(rows) ? rows : []).filter(x => !q || `${x.name || ''} ${x.category_name || ''}`.toLowerCase().includes(q)).map(x => ({
    id: `xtream-live-${x.stream_id}`,
    type: 'tv', name: x.name || `Canal ${x.stream_id}`, logo: x.stream_icon || '', description: x.category_name || 'Xtream',
    category: x.category_name || 'TV ao vivo'
  }));
}
module.exports = { getStreams, onSettings, parseLiveSearchResults };
