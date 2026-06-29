/**
 * lib/episodes.js
 * مصادر البث المحدثة 2025/2026
 * VidNest + MegaPlay + Anikoto API
 */

const JIKAN    = 'https://api.jikan.moe/v4';
const ANIKOTO  = 'https://anikotoapi.site';

// ── جلب قائمة الحلقات من Jikan ───────────────────────────────────────────────
export async function fetchEpisodeList(malId, totalEpisodes) {
  if (!malId) return buildEpisodeList(totalEpisodes);

  try {
    const all = [];
    let page  = 1;
    // نكمل الجلب حتى ما تكون هناك صفحات — بدون حد أقصى ثابت
    // هذا يحل مشكلة الأنمي الطويل مثل One Piece (1100+ حلقة)
    while (page <= 20) {
      await delay(400); // احترام rate limit جيكان (3 req/sec)
      let res;
      try {
        res = await fetch(`${JIKAN}/anime/${malId}/episodes?page=${page}`, {
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        break; // timeout أو network error
      }

      if (res.status === 429) {
        // rate limited — انتظر ثانية ثم أعد
        await delay(1200);
        continue;
      }
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

      // لو الصفحة أقل من 100 عنصر = الصفحة الأخيرة
      if (data.data.length < 100) break;
      // لو عندنا مجموع يساوي totalEpisodes = اكتملنا
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

// ── جلب Anikoto episode_embed_id ─────────────────────────────────────────────
// Anikoto يستخدم نفس IDs القديمة لـ HiAnime
export async function fetchAnikotoEpisodes(malId) {
  if (!malId) return null;
  try {
    // البحث بـ MAL ID عبر Anikoto
    const res  = await fetch(`${ANIKOTO}/series/mal-${malId}`, {
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

// ── بناء مصادر البث لكل حلقة ─────────────────────────────────────────────────
export function getEmbedSources(anilistId, malId, epNumber) {
  const sources = [];

  // ── 1. VidNest — المصدر الرئيسي ──────────────────────────────────────────
  if (anilistId) {
    sources.push({
      name:     'VidNest',
      label:    'VidNest — Sub',
      url:      `https://vidnest.fun/anime/${anilistId}/${epNumber}/sub`,
      lang:     'sub',
      provider: 'vidnest',
    });
    sources.push({
      name:     'VidNest Pahe',
      label:    'VidNest Pahe',
      url:      `https://vidnest.fun/animepahe/${anilistId}/${epNumber}/sub`,
      lang:     'sub',
      provider: 'vidnest',
    });
    sources.push({
      name:     'VidNest Dub',
      label:    'VidNest — Dub',
      url:      `https://vidnest.fun/anime/${anilistId}/${epNumber}/dub`,
      lang:     'dub',
      provider: 'vidnest',
    });
  }

  // ── 2. 2Anime — بديل جيد ─────────────────────────────────────────────────
  if (anilistId) {
    sources.push({
      name:     '2Anime',
      label:    '2Anime — Sub',
      url:      `https://2anime.xyz/embed/${anilistId}/${epNumber}`,
      lang:     'sub',
      provider: '2anime',
    });
  }

  // ── 3. AnimePahe مباشر ────────────────────────────────────────────────────
  if (malId) {
    sources.push({
      name:     'AnimeOwl',
      label:    'AnimeOwl',
      url:      `https://animeowl.live/embed?mal=${malId}&ep=${epNumber}`,
      lang:     'sub',
      provider: 'animeowl',
    });
  }

  return sources;
}

// ── جلب episode_embed_id من Anikoto ثم بناء رابط MegaPlay s-2 ───────────────
// هذا الرابط هو الأكثر ضماناً لأنه يستخدم الـ ID المباشر
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
      name:     'Anikoto Direct',
      label:    'Anikoto — Sub',
      url:      `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/${lang}`,
      lang,
      provider: 'anikoto',
    };
  } catch {
    return null;
  }
}

// ── جلب MAL ID من AniList ─────────────────────────────────────────────────────
export async function getMalId(anilistId) {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        query:     `query($id:Int){Media(id:$id){idMal}}`,
        variables: { id: anilistId },
      }),
    });
    const data = await res.json();
    return data?.data?.Media?.idMal || null;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
