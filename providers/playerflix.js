'use strict';
function sourceLog() {}
function withTimeout(promise, timeoutMs, fallback) {
  let timer;
  return Promise.race([Promise.resolve(promise), new Promise(resolve => { timer=setTimeout(()=>resolve(fallback), timeoutMs); })]).finally(()=>clearTimeout(timer));
}
// PlayerFlix adapter embutido: headers, WatchPlay, VIP Player e extração HLS.
const PLAYERFLIX_AJAX = 'https://playerflix.ink/inc/Ajax.php';
const PLAYERFLIX_ORIGIN = 'https://playerflix.ink';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

function requestHeaders(referer) {
  return {
    accept: '*/*',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    priority: 'u=1, i',
    referer,
    'sec-ch-ua': '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': USER_AGENT,
    'x-requested-with': 'XMLHttpRequest'
  };
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new Error('PlayerFlix abortado');
}

function decodeEscaped(value) {
  return String(value || '')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/gi, '&');
}

function extractM3u8(html) {
  const text = decodeEscaped(html);
  const matches = text.match(/https?:\\?\/\\?\/[^"'\s<>\\]+\.m3u8(?:\?[^"'\s<>\\]*)?/gi) || [];
  return [...new Set(matches.map((value) => value.replace(/[\\"'<>),;]+$/, '')))];
}

async function readJson(url, headers, signal) {
  abortIfNeeded(signal);
  const response = await fetch(url, { headers, redirect: 'follow', signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.status !== true) return null;
  return payload;
}

async function readPlayerPage(url, referer, signal) {
  abortIfNeeded(signal);
  const response = await fetch(url, {
    headers: {
      ...requestHeaders(referer),
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      'x-requested-with': undefined
    },
    redirect: 'follow',
    signal
  });
  if (!response.ok) return { html: '', finalUrl: response.url || url };
  return { html: await response.text(), finalUrl: response.url || url };
}

async function extractVipPlayer(option, signal) {
  const match = option.embed.match(/\/video\/([a-f0-9]+)/i);
  if (!match) return [];
  const hash = match[1];
  const playerUrl = new URL(option.embed);
  const endpoint = new URL('/player/index.php', playerUrl.origin);
  endpoint.searchParams.set('data', hash);
  endpoint.searchParams.set('do', 'getVideo');
  const body = new URLSearchParams({ hash, r: '' });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...requestHeaders(option.embed),
      origin: playerUrl.origin,
      referer: option.embed,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body,
    redirect: 'follow',
    signal
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) return [];
  const url = decodeEscaped(payload.securedLink || payload.videoSource || '');
  if (!/^https?:\/\//i.test(url)) return [];
  return [{
    url,
    type: 'hls',
    label: option.label || 'VIP Player',
    quality: option.label || '',
    referer: option.embed,
    playerUrl: option.embed
  }];
}

function premiumCookieHeader(response, previous = '') {
  const values = typeof response?.headers?.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  const cookies = values.map((value) => String(value).split(';', 1)[0]).filter(Boolean);
  return [...new Set(`${previous || ''}; ${cookies.join('; ')}`.split(';').map((x) => x.trim()).filter(Boolean))].join('; ');
}
function premiumHeaders(referer, extra = {}) {
  return {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'user-agent': USER_AGENT,
    referer,
    ...extra
  };
}
async function premiumFetch(url, options = {}, signal = null) {
  return fetch(url, { redirect: 'follow', ...options, ...(signal ? { signal } : {}) });
}
async function getPlayerFlixStreams(tmdbId, mediaType = 'movie', season = null, episode = null, signal = null) {
  const numericId = /^\d+$/.test(String(tmdbId)) ? String(tmdbId) : '';
  if (!numericId) return [];
  const isSeries = mediaType === 'tv' || mediaType === 'series';
  if (isSeries && (!Number.isInteger(Number(season)) || !Number.isInteger(Number(episode)))) return [];

  const pagePath = isSeries
    ? `/serie/${numericId}/${Number(season)}/${Number(episode)}`
    : `/filme/${numericId}`;
  const pageReferer = `${PLAYERFLIX_ORIGIN}${pagePath}`;
  const params = new URLSearchParams({
    type: isSeries ? 'tv' : 'movie',
    id: numericId,
    season: isSeries ? String(Number(season)) : 'null',
    episode: isSeries ? String(Number(episode)) : 'null'
  });
  const payload = await readJson(`${PLAYERFLIX_AJAX}?${params}`, requestHeaders(pageReferer), signal);
  const options = Array.isArray(payload?.data?.options) ? payload.data.options : [];
  // Todos os players são testados simultaneamente, sem preferência. Premium
  // permanece desativado, mas não bloqueia os demais players.
  const streamGroups = await Promise.all(options.map((option) => withTimeout((async () => {
    if (!option?.embed || typeof option.embed !== 'string') return [];
    try {
      if (option.id === 'superflixapi' || /superflixapi\./i.test(option.embed)) return [];
      if (/\/video\/[a-f0-9]+/i.test(option.embed)) return extractVipPlayer(option, signal);
      const page = await readPlayerPage(option.embed, pageReferer, signal);
      return extractM3u8(page.html).slice(0, 3).map((url) => ({
        url,
        type: 'hls',
        label: option.label || option.id || 'PlayerFlix',
        quality: option.label || '',
        referer: page.finalUrl || option.embed,
        playerUrl: page.finalUrl || option.embed
      }));
    } catch (error) {
      if (signal?.aborted) throw error;
      sourceLog('playerflix-option-error', { id: option.id, label: option.label, message: String(error?.message || error).slice(0, 160) });
      return [];
    }
  })(), 8000, [])));
  const streams = streamGroups.flat();
  return [...new Map(streams.map((item) => [item.url, item])).values()];
}


async function resolveTmdbId(id, type) {
  if (/^\d+$/.test(String(id || ''))) return String(id);
  if (!/^tt\d+$/i.test(String(id || ''))) return '';
  try {
    const kind = type === 'movie' ? 'movie' : 'series';
    const r = await fetch(`https://v3-cinemeta.strem.io/meta/${id}.json`.replace('/meta/', `/meta/${kind}/`), { headers: { accept: 'application/json' } });
    const m = r.ok ? (await r.json()).meta || {} : {};
    return String(m.tmdb_id || m.id || '').match(/\d+/)?.[0] || '';
  } catch (_) { return ''; }
}
function qualityLabel(value) {
  const v = String(value || '').toLowerCase();
  if (/8k|4320p/.test(v)) return ['👑 Iracemaflix • 8K', '8K'];
  if (/4k|2160p|uhd/.test(v)) return ['💎 Iracemaflix • 4K', '4K'];
  if (/1440p|2k|qhd/.test(v)) return ['🔷 Iracemaflix • QHD', 'QHD'];
  if (/1080p|full[ ._-]?hd|fhd/.test(v)) return ['🎬 Iracemaflix • FULL HD', '1080p'];
  if (/720p|\bhd\b/.test(v)) return ['📺 Iracemaflix • HD', '720p'];
  if (/576p|480p|\bsd\b/.test(v)) return ['📼 Iracemaflix • SD', '480p'];
  return ['⚙️ Iracemaflix • Auto', ''];
}
async function decorateAddonVisual(streams, id, type, season, episode, provider) {
  let meta = {};
  try { const kind = type === 'movie' ? 'movie' : 'series'; const r = await fetch(`https://v3-cinemeta.strem.io/meta/${kind}/${String(id).split(':')[0]}.json`); meta = r.ok ? ((await r.json()).meta || {}) : {}; } catch (_) {}
  const title = meta.name || meta.originalName || 'Título não identificado';
  const year = String(meta.year || '').slice(0,4); const genres = Array.isArray(meta.genres) ? meta.genres.join(' • ') : 'Não informado';
  const ep = type === 'tv' || type === 'series' ? `🎞️ Temporada ${Number(season || 1)} • Episódio ${Number(episode || 1)} (S${String(Number(season || 1)).padStart(2,'0')}E${String(Number(episode || 1)).padStart(2,'0')})` : '';
  return (Array.isArray(streams) ? streams : []).map(stream => {
    const [name, quality] = qualityLabel(stream.quality || stream.label || stream.title || stream.url);
    const lang = /dub|pt[- ]?br|portugu[eê]s/i.test(`${stream.label||''} ${stream.language||''}`) ? 'Dublado' : /leg|sub|original|ja|en/i.test(`${stream.label||''} ${stream.language||''}`) ? 'Legendado' : (stream.language || 'Não informado');
    const server = stream.server || provider;
    return {...stream, provider, sourceName: provider, quality, language: lang, name, title: [`🎬 Título: ${title}${year ? ` (${year})` : ''}`, `🎭 Gênero: ${genres}`, ep, `🖥️ Servidor: ${server}`, `✨ Qualidade: ${quality || 'Automática'}`, `🔊 Áudio: ${lang}`].filter(Boolean).join('\n')};
  });
}
async function getStreams(id, type, season, episode, value) {
  const tmdb = await resolveTmdbId(id, type);
  if (!tmdb) return [];
  const raw = await getPlayerFlixStreams(tmdb, type === 'series' ? 'tv' : type, season, episode, null);
  return decorateAddonVisual(raw, id, type, season, episode, 'PlayerFlix');
}
module.exports = { getStreams, onSettings: () => [] };
