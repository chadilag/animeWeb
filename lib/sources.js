// ══════════════════════════════════════════════════════════════════════════════
//  lib/sources.js  —  المصدر الموحّد لكل منطق AniList + Jikan
//
//  هذا الملف هو "نقطة الحقيقة الوحيدة" لكل استدعاءات الـ APIs الخارجية.
//  أي ملف ثاني (anilist.js, api.js) يستورد من هنا بدل ما يكرر نفس الكود.
//
//  يشتغل في بيئتين:
//   - السيرفر (Next.js Server Components) — يقرأ window === undefined
//   - المتصفح (Client Components)         — يقرأ من localStorage لوضع الاختبار
// ══════════════════════════════════════════════════════════════════════════════

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_URL    = 'https://api.jikan.moe/v4';
export const JIKAN_MAX_LIMIT = 25; // الحد الأقصى المسموح من Jikan v4

// ── حالة المصدر النشط (لعرضها بالـ UI لو حبيت لاحقاً) ────────────────────────
export let activeSource = 'anilist'; // 'anilist' | 'jikan'

// ══════════════════════════════════════════════════════════════════════════════
//  1. وضع الاختبار (Force Jikan)
//     - بالسيرفر: متغير بالذاكرة (يصفر بكل request جديد، وهذا طبيعي للسيرفر)
//     - بالمتصفح: localStorage (يبقى بين الصفحات)
// ══════════════════════════════════════════════════════════════════════════════

let _serverForceJikan = false;

export function setForceJikan(val) {
  _serverForceJikan = val;
}

function isForceJikan() {
  if (typeof window === 'undefined') return _serverForceJikan;
  try {
    return localStorage.getItem('forceJikan') === 'true';
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. AniList Fetcher
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    cache:   'no-store',
    body:    JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. Jikan Fetcher (مع حماية الـ rate limit + حد الـ limit الأقصى)
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchJikan(endpoint) {
  await new Promise(r => setTimeout(r, 350)); // حماية rate limit (3 req/sec)
  const res = await fetch(`${JIKAN_URL}${endpoint}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  return res.json();
}

// بناء query params آمنة لـ Jikan (يحترم الحد الأقصى ويتجاهل القيم الفاضية/الافتراضية)
export function buildJikanParams(opts = {}) {
  const { search, genre, year, status, page, limit } = opts;
  const params = new URLSearchParams({
    limit: Math.min(limit || JIKAN_MAX_LIMIT, JIKAN_MAX_LIMIT),
  });

  const cleanSearch = search?.trim();
  if (cleanSearch && cleanSearch.length >= 3) params.set('q', cleanSearch);
  if (genre && genre !== 'الكل')              params.set('genres', genre);
  if (year)                                    params.set('start_date', `${year}0101`);
  if (page)                                    params.set('page', page);

  if (status === 'RELEASING')        params.set('status', 'airing');
  if (status === 'FINISHED')         params.set('status', 'complete');
  if (status === 'NOT_YET_RELEASED') params.set('status', 'upcoming');

  return params;
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. Normalizer — يحول بيانات Jikan لنفس شكل بيانات AniList
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_MAP = {
  'Finished Airing':  'FINISHED',
  'Currently Airing': 'RELEASING',
  'Not yet aired':    'NOT_YET_RELEASED',
};

export function normalizeJikanAnime(a) {
  return {
    id:    a.mal_id,
    idMal: a.mal_id,
    title: {
      english: a.title_english || a.title,
      romaji:  a.title,
    },
    coverImage: {
      extraLarge: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
      large:      a.images?.jpg?.image_url,
      color:      null,
    },
    bannerImage:  null,
    description:  a.synopsis || '',
    genres:       (a.genres || []).map(g => g.name),
    episodes:     a.episodes,
    status:       STATUS_MAP[a.status] || 'FINISHED',
    averageScore: a.score ? Math.round(a.score * 10) : null, // Jikan /10 → AniList /100
    season:       a.season?.toUpperCase() || null,
    seasonYear:   a.year,
    popularity:   a.members,
    duration:     a.duration ? parseInt(a.duration) : null,
    studios:      { nodes: (a.studios || []).map(s => ({ name: s.name, isAnimationStudio: true })) },
    tags:         [],
    trailer:      a.trailer?.youtube_id ? { id: a.trailer.youtube_id, site: 'youtube' } : null,
    characters:        { nodes: [] },
    relations:         { edges: [] },
    recommendations:   { nodes: [] },
    nextAiringEpisode: a.broadcast?.time
      ? { episode: null, airingAt: null, timeUntilAiring: null, _broadcastStr: a.broadcast.string }
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. Fallback Wrapper — القلب الأساسي للنظام بأكمله
// ══════════════════════════════════════════════════════════════════════════════

export async function withFallback(anilistFn, jikanFn) {
  if (isForceJikan()) {
    console.log('🧪 [Test Mode] Using Jikan API');
    activeSource = 'jikan';
    return jikanFn();
  }

  try {
    const result = await anilistFn();
    activeSource = 'anilist';
    return result;
  } catch (err) {
    console.warn('⚠️ AniList failed, switching to Jikan...', err.message);
    activeSource = 'jikan';
    return jikanFn();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  6. GraphQL Queries (AniList) — مركزية بمكان واحد
// ══════════════════════════════════════════════════════════════════════════════

export const TRENDING_QUERY = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME, status_not: NOT_YET_RELEASED) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      bannerImage description genres episodes
      status averageScore season seasonYear popularity
    }
  }
}`;

export const POPULAR_QUERY = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const SEASONAL_QUERY = `
query($season: MediaSeason, $year: Int, $perPage: Int) {
  Page(perPage: $perPage) {
    media(season: $season, seasonYear: $year, type: ANIME, sort: SCORE_DESC) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const TOP_QUERY = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: SCORE_DESC, type: ANIME, status_not: NOT_YET_RELEASED) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const DETAIL_QUERY = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal title { romaji english native }
    coverImage { extraLarge large }
    bannerImage description genres episodes status
    averageScore popularity season seasonYear duration
    studios { nodes { name isAnimationStudio } }
    tags { name rank isGeneralSpoiler }
    trailer { id site }
    characters(perPage: 8, sort: ROLE) {
      nodes { name { full native } image { medium } }
    }
    relations {
      edges {
        relationType(version: 2)
        node { id title { romaji english } coverImage { large medium } type }
      }
    }
    recommendations(perPage: 6) {
      nodes {
        mediaRecommendation {
          id title { romaji english }
          coverImage { large medium }
          averageScore
        }
      }
    }
    nextAiringEpisode { episode timeUntilAiring }
  }
}`;

export const SEARCH_QUERY = `
query($search: String, $page: Int, $perPage: Int, $genre: String, $sort: [MediaSort], $status: MediaStatus, $year: Int, $score: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total hasNextPage }
    media(search: $search, type: ANIME, genre: $genre, sort: $sort, status: $status, seasonYear: $year, averageScore_greater: $score) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      genres episodes status averageScore season seasonYear
    }
  }
}`;

export const BROWSE_QUERY = `
query($genre: String, $sort: [MediaSort], $page: Int) {
  Page(page: $page, perPage: 24) {
    pageInfo { hasNextPage }
    media(type: ANIME, genre: $genre, sort: $sort, status_not: NOT_YET_RELEASED) {
      id idMal title { romaji english }
      coverImage { extraLarge large color }
      genres episodes status averageScore season seasonYear
    }
  }
}`;

export const SCHEDULE_QUERY = `
query {
  Page(perPage: 50) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      id idMal title { romaji english }
      coverImage { large medium color }
      nextAiringEpisode { episode timeUntilAiring airingAt }
      averageScore genres
    }
  }
}`;

export const MAL_ID_QUERY = `query($id: Int) { Media(id: $id) { idMal } }`;

// ══════════════════════════════════════════════════════════════════════════════
//  7. Helpers عامة (مشتركة بين anilist.js و api.js)
// ══════════════════════════════════════════════════════════════════════════════

export function getCurrentSeason() {
  const month = new Date().getMonth();
  const year  = new Date().getFullYear();
  const seasons = ['WINTER','WINTER','SPRING','SPRING','SPRING','SUMMER','SUMMER','SUMMER','FALL','FALL','FALL','WINTER'];
  return { season: seasons[month], year: month === 11 ? year + 1 : year };
}

export function getTitle(media) {
  return media?.title?.english || media?.title?.romaji || 'بدون عنوان';
}

export function cleanDesc(str = '') {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#039;/g,"'");
}

export const STATUS_AR = {
  FINISHED:         'منتهي',
  RELEASING:        'يُبَث الآن',
  NOT_YET_RELEASED: 'قريباً',
  CANCELLED:        'ملغي',
  HIATUS:           'متوقف',
};

export const SEASON_AR = {
  WINTER: 'شتاء', SPRING: 'ربيع', SUMMER: 'صيف', FALL: 'خريف',
};
