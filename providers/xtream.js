'use strict';

function getConfig(value) {
  if (value && typeof value === 'object') return value;
  return typeof globalThis !== 'undefined' ? (globalThis.SCRAPER_SETTINGS || globalThis.scraperSettings || {}) : {};
}
function text(value) { return String(value || '').trim(); }
const DEFAULT_XTREAM_SOURCES = [{"id":"one-tv","name":"One TV","base":"http://one-tv.sbs","user":"9a31d0691f","pass":"c9090c45007e"},{"id":"kasiner","name":"Kasiner","base":"http://kasiner.fun","user":"328525749768","pass":"543695573463"},{"id":"dvdplay2","name":"DVDPlay2","base":"http://dvdplay2.com","user":"047597","pass":"un7yWp"},{"id":"urlsync","name":"URLSync","base":"http://auth.urlsync.gy","user":"russo20","pass":"5a6bqe1w2qq"},{"id":"cms-central","name":"Smart CMS","base":"http://smart.cms-central.ovh:80","user":"78069211","pass":"fk7106"},{"id":"oneplayfastpro","name":"OnePlayFastPro","base":"http://oneplayfastpro.xyz:80","user":"11234bth","pass":"mrx38574"},{"id":"elite-factory","name":"Elite Factory","base":"http://elite.factoryexcelencia.online","user":"0107641","pass":"2355845"},{"id":"cdnplay","name":"CDNPlay","base":"http://cdnplay.pro:80","user":"123456789","pass":"123456789"},{"id":"gigatvs","name":"Giga TVs","base":"http://gigatvs.com","user":"asd97571830","pass":"Zaptv2024"},{"id":"clarotv","name":"Claro TV","base":"http://clarotv.org","user":"asd97571830","pass":"Zaptv2024"},{"id":"lbplay","name":"LB Play","base":"http://lbplay.ddns.me","user":"asd97571830","pass":"Zaptv2024"},{"id":"teleflixhd","name":"Teleflix HD","base":"http://teleflixhd.club","user":"asd97571830","pass":"Zaptv2024"},{"id":"ultclub","name":"Ult Club","base":"http://ultclub.click","user":"asd97571830","pass":"Zaptv2024"},{"id":"brasilplaytv","name":"Brasil Play TV","base":"http://brasilplaytv.com","user":"asd97571830","pass":"Zaptv2024"},{"id":"afg154","name":"AFG154","base":"http://afg154.life","user":"2517196817962","pass":"1854172424814"},{"id":"cdn4k-live-89625","name":"CDN4K.live 89625","base":"http://cdn4k.live:80","user":"89625u16","pass":"z17844a8"},{"id":"cdn4k-live-aripai","name":"CDN4K.live Aripai","base":"http://cdn4k.live:80","user":"aripai","pass":"i2p4t6v10"},{"id":"vaiagora","name":"Vai Agora","base":"http://vaiagora.vip:80","user":"NinoCaique","pass":"282TVWvdm"},{"id":"4kplay","name":"4KPlay","base":"http://4kplay33.icu","user":"76626mhc","pass":"grw21928"},{"id":"pfsv","name":"PFSV","base":"http://pfsv.io","user":"rodrigolobogf","pass":"Hstv1020"},{"id":"ua32tt","name":"UA32TT","base":"http://ua32tt.vip","user":"Carlindo02","pass":"dmss493Y1"},{"id":"sitiomacaco","name":"Sítio Macaco","base":"http://sitiomacaco.com","user":"cSjxZcw8Q","pass":"C1wBr5"},{"id":"beleco","name":"Beleco","base":"http://beleco.ddns.net","user":"002894","pass":"hejEm2"},{"id":"novomundo","name":"Novo Mundo","base":"http://novomundo.live:80","user":"41625496","pass":"52949419"}];
function baseConfig(value) {
  const c = getConfig(value);
  return { base: text(c.xtreamUrl).replace(/\/$/, ''), user: text(c.xtreamUsername), pass: text(c.xtreamPassword) };
}
function sourcesConfig(value) {
  const c = getConfig(value);
  const sources = [];
  try {
    const parsed = JSON.parse(text(c.xtreamSourcesJson));
    if (Array.isArray(parsed)) sources.push(...parsed);
  } catch (_) {}
  for (let i = 1; i <= 5; i += 1) {
    const base = text(c[`xtream${i}Url`]).replace(/\/$/, '');
    const user = text(c[`xtream${i}Username`]);
    const pass = text(c[`xtream${i}Password`]);
    const name = text(c[`xtream${i}Name`]) || `Xtream ${i}`;
    if (base && user && pass) sources.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, base, user, pass });
  }
  if (!sources.length) sources.push(...DEFAULT_XTREAM_SOURCES);
  if (!sources.length) {
    const one = baseConfig(value);
    if (one.base && one.user && one.pass) sources.push({ id: 'primary', name: 'Xtream', ...one });
  }
  return sources.map((x, i) => ({ id: text(x.id) || `source-${i + 1}`, name: text(x.name) || `Xtream ${i + 1}`, base: text(x.base || x.url).replace(/\/$/, ''), user: text(x.user || x.username), pass: text(x.pass || x.password) })).filter(x => x.base && x.user && x.pass);
}
function headers() { return { accept: 'application/json', 'user-agent': 'IracemaFlix-Nuvio-Xtream/1.0' }; }
function stream(url, title, type, meta = {}, sourceName = 'Xtream') {
  const textMeta = `${meta.quality || ''} ${meta.video_quality || ''} ${meta.resolution || ''} ${meta.name || ''}`;
  const quality = textMeta.match(/\b(2160p|1440p|1080p|720p|480p|360p|4k|uhd|fhd|hd|sd)\b/i)?.[1] || 'Auto';
  const language = meta.language || meta.lang || meta.audio || meta.audio_language || 'Não informado';
  const label = `${sourceName} • ${quality} • ${language}`;
  return { url, title: `${title} • ${label}`, name: title, provider: 'Xtream', sourceName, quality, resolution: quality, language, type, behaviorHints: { notWebReady: false } };
}
async function api(action, value, extra = {}, source = null) {
  const c = source || baseConfig(value);
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
async function cinemeta(id, mediaType) {
  if (!/^tt\d+$/i.test(text(id))) return { title: text(id), year: '' };
  try {
    const kind = String(mediaType).toLowerCase() === 'movie' ? 'movie' : 'series';
    const r = await fetch(`https://v3-cinemeta.strem.io/meta/${kind}/${encodeURIComponent(id)}.json`, { headers: { accept: 'application/json' } });
    const m = r.ok ? (await r.json()).meta || {} : {};
    return { title: text(m.name || m.originalName), year: text(m.year || m.releaseInfo).slice(0, 4), meta: m };
  } catch (_) { return { title: '', year: '' }; }
}
function sameTitle(a, b) {
  const norm = x => text(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const left = norm(a), right = norm(b); return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}
async function findMovie(source, info, value) {
  const rows = await api('get_vod_streams', value, {}, source);
  return (Array.isArray(rows) ? rows : []).find(x => sameTitle(x.name || x.title, info.title) && (!info.year || !x.year || String(x.year).includes(info.year)));
}
async function findEpisode(source, info, season, episode, value) {
  const shows = await api('get_series', value, {}, source);
  const show = (Array.isArray(shows) ? shows : []).find(x => sameTitle(x.name || x.title, info.title));
  if (!show) return null;
  const data = await api('get_series_info', value, { series_id: show.series_id }, source);
  const episodes = data?.episodes?.[String(season)] || data?.episodes?.[Number(season)] || [];
  return (Array.isArray(episodes) ? episodes : []).find(x => Number(x.episode_num) === Number(episode));
}
function onSettings() {
  const out = [
    { type: 'header', label: 'Xtream — fontes múltiplas' },
    { type: 'textarea', key: 'xtreamSourcesJson', label: 'Fontes Xtream em JSON (opcional)', defaultValue: '[{"id":"pfsv","name":"PFSV","base":"","user":"","pass":""}]' },
    { type: 'text', key: 'xtreamUrl', label: 'URL base Xtream', defaultValue: '' },
    { type: 'text', key: 'xtreamUsername', label: 'Usuário Xtream', defaultValue: '' },
    { type: 'password', key: 'xtreamPassword', label: 'Senha Xtream', defaultValue: '' }
  ];
  for (let i = 1; i <= 5; i += 1) out.push(
    { type: 'header', label: `Fonte Xtream ${i}` },
    { type: 'text', key: `xtream${i}Name`, label: `Nome da fonte ${i}`, defaultValue: '' },
    { type: 'text', key: `xtream${i}Url`, label: `URL base ${i}`, defaultValue: '' },
    { type: 'text', key: `xtream${i}Username`, label: `Usuário ${i}`, defaultValue: '' },
    { type: 'password', key: `xtream${i}Password`, label: `Senha ${i}`, defaultValue: '' }
  );
  return out;
}
function liveUrl(c, id, extension = 'm3u8') { return `${c.base}/live/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
function movieUrl(c, id, extension = 'mp4') { return `${c.base}/movie/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
function episodeUrl(c, id, extension = 'mp4') { return `${c.base}/series/${encodeURIComponent(c.user)}/${encodeURIComponent(c.pass)}/${encodeURIComponent(id)}.${extension}`; }
async function getStreams(id, mediaType, season, episode, value) {
  const sources = sourcesConfig(value); if (!sources.length) return [];
  const key = text(id);
  const sourceMatch = key.match(/^xtream-source-(.+?)__(?:live|movie|series|episode)-\d+$/i);
  const source = sourceMatch ? sources.find(x => x.id === sourceMatch[1]) : sources[0];
  const c = source || sources[0];
  const normalizedKey = sourceMatch ? `xtream-${key.slice(key.indexOf('__') + 2)}` : key;
  if (!/^xtream-/i.test(normalizedKey)) {
    const info = await cinemeta(key, mediaType); if (!info.title) return [];
    const found = [];
    for (const candidate of sources) {
      if (String(mediaType).toLowerCase() === 'movie' && season == null && episode == null) {
        const item = await findMovie(candidate, info, value);
        if (item?.stream_id != null) found.push(stream(movieUrl(candidate, item.stream_id), `Xtream • ${candidate.name} • ${item.name || info.title}`, 'mp4', item, candidate.name));
      } else if (season != null && episode != null) {
        const item = await findEpisode(candidate, info, season, episode, value);
        if (item?.id != null) found.push(stream(episodeUrl(candidate, item.id), `Xtream • ${candidate.name} • ${info.title} S${season}E${episode}`, 'mp4', item, candidate.name));
      }
    }
    return found;
  }
  if (season != null || episode != null) {
    const episodeId = normalizedKey.replace(/^xtream-(?:series|episode)-/i, '');
    if (!/^\d+$/.test(episodeId)) return [];
    return [stream(episodeUrl(c, episodeId), `Xtream • ${c.name || c.id} • Série S${season}E${episode}`, 'mp4', {}, c.name || c.id)];
  }
  if (/^xtream-(?:movie|vod)-/i.test(normalizedKey)) {
    const vodId = normalizedKey.replace(/^xtream-(?:movie|vod)-/i, '');
    return /^\d+$/.test(vodId) ? [stream(movieUrl(c, vodId), `Xtream • ${c.name || c.id} • Filme`, 'mp4', {}, c.name || c.id)] : [];
  }
  const liveId = normalizedKey.replace(/^xtream-(?:live|channel)-/i, '');
  if (/^\d+$/.test(liveId) && String(mediaType).toLowerCase() === 'tv') {
    const rows = await api('get_live_streams', value, {}, c);
    const item = (Array.isArray(rows) ? rows : []).find(x => String(x.stream_id) === liveId) || {};
    return [stream(liveUrl(c, liveId), `Xtream • ${c.name || c.id} • TV ao vivo`, 'hls', item, c.name || c.id)];
  }
  return [];
}
async function parseLiveSearchResults(query, value) {
  const q = text(query).toLowerCase();
  const out = [];
  for (const source of sourcesConfig(value)) {
    const rows = await api('get_live_streams', value, {}, source);
    for (const x of (Array.isArray(rows) ? rows : [])) if (!q || `${x.name || ''} ${x.category_name || ''}`.toLowerCase().includes(q)) out.push({
      id: `xtream-source-${source.id}__live-${x.stream_id}`, type: 'tv', name: `${x.name || `Canal ${x.stream_id}`} • ${source.name}`, logo: x.stream_icon || '', description: x.category_name || source.name, category: x.category_name || 'TV ao vivo'
    });
  }
  return out;
}
module.exports = { getStreams, onSettings, parseLiveSearchResults };
