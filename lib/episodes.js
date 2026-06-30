/**
 * lib/episodes.js
 * مصادر البث — نظام متعدد المصادر مع Fallback تلقائي
 * 
 * المصادر المتوفرة:
 *  1. VidNest      — الرئيسي (AniList ID)
 *  2. 2Anime       — بديل جيد (AniList ID)
 *  3. AnimeOwl     — بديل (MAL ID)
 *  4. VidSrc       — بديل قوي (MAL ID)
 *  5. AutoEmbed    — بديل (MAL ID)
 *  6. Anikoto      — مصدر مباشر عبر episode_embed_id
 */

const JIKAN   = 'https://api.jikan.moe/v4';
const ANIKOTO = 'https://anikotoapi.site';

// ══════════════════════════════════════════════════════════════════════════════
//  1. قائمة الحلقات (Jikan)
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchEpisodeList(malId, totalEpisodes) {
  if (!malId) return buildEpisodeList(totalEpisodes);

  try {
    const all = [];
    let page  = 1;
    while (page <= 20) {
      await delay(400);
      let res;
      try {
        res = await fetch(`${JIKAN}/anime/${malId}/episodes?page=${page}`, {
          signal: AbortSignal.timeout(8000),
        });
      } catch { break; }

      if (res.status === 429) { await delay(1200); continue; }
      if (!res.ok) break;

      const data = await res.json();
      if (!data.data?.length) break;

      data.data.forEach(ep => all.push({
        number:  ep.mal_id,
        title:   ep.title || `الحلقة ${ep.mal_id}`,
        titleJa: ep.title_japanese || '',
        filler:  ep.filler  || false,
        recap:   ep.recap   || false,
        score:   ep.score   || null,
      }));

      if (data.data.length < 100) break;
      if (totalEpisodes && all.length >= totalEpisodes) break;
      page++;
    }

    if (all.length > 0) return all;
  } catch (e) {
    console.warn('Jikan episodes failed:', e.message);
  }

  return buildEpisodeList(totalEpisodes);
}

function buildEpisodeList(total) {
  if (!total) return [];
  return Array.from({ length: total }, (_, i) => ({
    number:  i + 1,
    title:   `الحلقة ${i + 1}`,
    titleJa: '',
    filler:  false,
    recap:   false,
    score:   null,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. مصادر البث — getEmbedSources
//
//  الترتيب مهم: الأفضل أولاً
//  كل مصدر له:
//    name     — اسم داخلي
//    label    — اسم يظهر للمستخدم
//    url      — رابط الـ iframe
//    lang     — 'sub' | 'dub'
//    provider — للتصفية والتمييز
//    quality  — '1080p' | '720p' | '4K' (اختياري)
// ══════════════════════════════════════════════════════════════════════════════

export function getEmbedSources(anilistId, malId, epNumber) {
  const sources = [];

  // ── 1. VidNest (الرئيسي) ─────────────────────────────────────────────────
  if (anilistId) {
    sources.push({
      name:     'VidNest',
      label:    'VidNest',
      url:      `https://vidnest.fun/anime/${anilistId}/${epNumber}/sub`,
      lang:     'sub',
      provider: 'vidnest',
      quality:  '1080p',
    });
    sources.push({
      name:     'VidNest Dub',
      label:    'VidNest Dub',
      url:      `https://vidnest.fun/anime/${anilistId}/${epNumber}/dub`,
      lang:     'dub',
      provider: 'vidnest',
      quality:  '1080p',
    });
    sources.push({
      name:     'VidNest Pahe',
      label:    'VidNest Pahe',
      url:      `https://vidnest.fun/animepahe/${anilistId}/${epNumber}/sub`,
      lang:     'sub',
      provider: 'vidnest',
      quality:  '720p',
    });
  }

  // ── 2. 2Anime ────────────────────────────────────────────────────────────
  if (anilistId) {
    sources.push({
      name:     '2Anime',
      label:    '2Anime',
      url:      `https://2anime.xyz/embed/${anilistId}/${epNumber}`,
      lang:     'sub',
      provider: '2anime',
      quality:  '1080p',
    });
  }

  // ── 3. VidSrc (MAL ID) ───────────────────────────────────────────────────
  if (malId) {
    sources.push({
      name:     'VidSrc',
      label:    'VidSrc',
      url:      `https://vidsrc.me/embed/anime?mal=${malId}&episode=${epNumber}`,
      lang:     'sub',
      provider: 'vidsrc',
      quality:  '1080p',
    });
  }

  // ── 4. AutoEmbed (MAL ID) ────────────────────────────────────────────────
  if (malId) {
    sources.push({
      name:     'AutoEmbed',
      label:    'AutoEmbed',
      url:      `https://autoembed.cc/anime/mal/${malId}-${epNumber}`,
      lang:     'sub',
      provider: 'autoembed',
      quality:  '1080p',
    });
  }

  // ── 5. AnimeOwl (MAL ID) ─────────────────────────────────────────────────
  if (malId) {
    sources.push({
      name:     'AnimeOwl',
      label:    'AnimeOwl',
      url:      `https://animeowl.live/embed?mal=${malId}&ep=${epNumber}`,
      lang:     'sub',
      provider: 'animeowl',
      quality:  '720p',
    });
  }

  // ── 6. VidFast (MAL ID) ──────────────────────────────────────────────────
  if (malId) {
    sources.push({
      name:     'VidFast',
      label:    'VidFast',
      url:      `https://vidfast.pro/anime/${malId}/${epNumber}?autoPlay=true`,
      lang:     'sub',
      provider: 'vidfast',
      quality:  '4K',
    });
  }

  return sources;
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. Anikoto (مصدر مباشر عبر episode_embed_id)
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchAnikotoEpisodes(malId) {
  if (!malId) return null;
  try {
    const res = await fetch(`${ANIKOTO}/series/mal-${malId}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.episodes || null;
  } catch {
    return null;
  }
}

export async function getAnikotoSource(malId, epNumber, lang = 'sub') {
  try {
    const res = await fetch(`${ANIKOTO}/series/mal-${malId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const episodes = data?.episodes || [];
    const ep = episodes.find(e => e.number === epNumber || e.episode_number === epNumber);
    if (!ep?.episode_embed_id) return null;

    return {
      name:     'Anikoto',
      label:    'Anikoto',
      url:      `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/${lang}`,
      lang,
      provider: 'anikoto',
      quality:  '1080p',
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. Helpers
// ══════════════════════════════════════════════════════════════════════════════

export { getMalId } from './anilist';

// تصفية المصادر حسب اللغة
export function filterSourcesByLang(sources, lang) {
  if (lang === 'all') return sources;
  return sources.filter(s => s.lang === lang);
}

// تجميع المصادر حسب اللغة للعرض
export function groupSourcesByLang(sources) {
  return {
    sub: sources.filter(s => s.lang === 'sub'),
    dub: sources.filter(s => s.lang === 'dub'),
  };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
