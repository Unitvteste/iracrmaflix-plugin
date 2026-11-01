'use strict';

function settings(value) {
  if (value && typeof value === 'object') return value;
  if (typeof globalThis !== 'undefined') return globalThis.SCRAPER_SETTINGS || globalThis.scraperSettings || {};
  return {};
}

function backendUrl(value) {
  const configured = String(settings(value).backendUrl || '').trim();
  return configured.replace(/\/$/, '');
}

function normalizeType(value) {
  return String(value || '').toLowerCase() === 'movie' ? 'movie' : 'series';
}

function normalizeStreams(payload) {
  const raw = Array.isArray(payload) ? payload : Array.isArray(payload?.streams) ? payload.streams : [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const url = String(item?.url || item?.streamUrl || item?.link || '').trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const type = String(item?.type || '').toLowerCase();
    const stream = { ...item, url };
    if (!stream.title && !stream.name) stream.title = stream.sourceName || stream.provider || 'IracemaFlix';
    if (!stream.type) stream.type = /\.m3u8?(?:[?#]|$)/i.test(url) ? 'hls' : type === 'hls' ? 'hls' : 'mp4';
    out.push(stream);
  }
  return out;
}

function onSettings() {
  return [{
    type: 'text',
    key: 'backendUrl',
    label: 'URL pública do backend IracemaFlix',
    description: 'Exemplo: https://seu-dominio.example. Não inclua /manifest.json.',
    defaultValue: ''
  }];
}

async function getStreams(tmdbId, mediaType, season, episode, options) {
  const base = backendUrl(options);
  const id = encodeURIComponent(String(tmdbId || '').trim());
  if (!base || !id) return [];
  const type = normalizeType(mediaType);
  const suffix = type === 'series'
    ? `/${encodeURIComponent(String(season || 1))}/${encodeURIComponent(String(episode || 1))}`
    : '';
  const url = `${base}/stream/${type}/${id}${suffix}.json`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow'
    });
    if (!response.ok) return [];
    return normalizeStreams(await response.json());
  } catch (_) {
    return [];
  }
}

module.exports = { getStreams, onSettings };
