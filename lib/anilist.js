// ══════════════════════════════════════════════════════════════════════════════
//  lib/anilist.js  —  Dual API System (AniList + Jikan fallback)
// ══════════════════════════════════════════════════════════════════════════════
//
//  كيف يشتغل النظام:
//  1. يحاول أولاً مع AniList (GraphQL)
//  2. إذا فشل AniList → يتحول تلقائياً لـ Jikan (MyAnimeList)
//  3. المستخدم ما يشوف أي خطأ
//
//  🧪 طريقة اختبار Jikan يدوياً:
//  في المتصفح أو في الكود اكتب:
//    localStorage.setItem('forceJikan', 'true')   ← يجبر Jikan
//    localStorage.setItem('forceJikan', 'false')  ← يرجع AniList
//  أو استخدم:
//    import { setForceJikan } from '@/lib/anilist'
//    setForceJikan(true)   ← من أي مكان في الكود
// ══════════════════════════════════════════════════════════════════════════════

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_URL   = 'https://api.jikan.moe/v4';

// ── حالة مصدر البيانات (للعرض في الـ UI اختيارياً) ───────────────────────────
export let activeSource = 'anilist'; // 'anilist' | 'jikan'

// ── وضع الاختبار (يجبر استخدام Jikan) ───────────────────────────────────────
let _forceJikan = false;
export function setForceJikan(val) { _forceJikan = val; }

// ══════════════════════════════════════════════════════════════════════════════
//  1. AniList Fetcher
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. Jikan Fetcher + Data Normalizer
//     يحول بيانات Jikan لنفس شكل AniList عشان باقي الكود ما يتغير
// ══════════════════════════════════════════════════════════════════════════════

async function fetchJikan(endpoint) {
  // Jikan عنده rate limit (3 req/sec) — نضيف delay بسيط
  await new Promise(r => setTimeout(r, 350));
  const res = await fetch(`${JIKAN_URL}${endpoint}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  return res.json();
}

// تحويل anime من Jikan → شكل AniList
function normalizeJikanAnime(a) {
  const statusMap = {
    'Finished Airing': 'FINISHED',
    'Currently Airing': 'RELEASING',
    'Not yet aired': 'NOT_YET_RELEASED',
  };
  const seasonMap = { winter: 'WINTER', spring: 'SPRING', summer: 'SUMMER', fall: 'FALL' };

  return {
    id: a.mal_id,
    title: {
      english: a.title_english || a.title,
      romaji:  a.title,
    },
    coverImage: {
      extraLarge: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
      large:      a.images?.jpg?.image_url,
      color:      null,
    },
    bannerImage: null,
    description: a.synopsis || '',
    genres:      (a.genres || []).map(g => g.name),
    episodes:    a.episodes,
    status:      statusMap[a.status] || 'FINISHED',
    averageScore: a.score ? Math.round(a.score * 10) : null, // Jikan /10 → AniList /100
    season:      a.season ? seasonMap[a.season] : null,
    seasonYear:  a.year,
    popularity:  a.members,
    // حقول إضافية للصفحة التفصيلية
    duration:    a.duration ? parseInt(a.duration) : null,
    studios: { nodes: (a.studios || []).map(s => ({ name: s.name, isAnimationStudio: true })) },
    tags: [],
    trailer: a.trailer?.youtube_id ? { id: a.trailer.youtube_id, site: 'youtube' } : null,
    characters: { nodes: [] },
    relations: { edges: [] },
    recommendations: { nodes: [] },
    nextAiringEpisode: null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. Fallback Wrapper — القلب الأساسي للنظام
// ══════════════════════════════════════════════════════════════════════════════

async function withFallback(anilistFn, jikanFn) {
  // وضع الاختبار: تجاهل AniList واستخدم Jikan مباشرة
  if (_forceJikan) {
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
//  4. Public API Functions — نفس الشكل القديم + Fallback تلقائي
// ══════════════════════════════════════════════════════════════════════════════

export async function getTrending({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => {
      const data = await fetchAniList(TRENDING_QUERY, { page, perPage });
      return data.Page.media;
    },
    async () => {
      const data = await fetchJikan(`/top/anime?filter=airing&page=${page}&limit=${perPage}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getPopular({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => {
      const data = await fetchAniList(POPULAR_QUERY, { page, perPage });
      return data.Page.media;
    },
    async () => {
      const data = await fetchJikan(`/top/anime?filter=bypopularity&page=${page}&limit=${perPage}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getSeasonal({ season, year, perPage = 20 } = {}) {
  return withFallback(
    async () => {
      const data = await fetchAniList(SEASONAL_QUERY, { season, year, perPage });
      return data.Page.media;
    },
    async () => {
      const s = season?.toLowerCase() || 'spring';
      const y = year || new Date().getFullYear();
      const data = await fetchJikan(`/seasons/${y}/${s}?limit=${perPage}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getTop({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => {
      const data = await fetchAniList(TOP_QUERY, { page, perPage });
      return data.Page.media;
    },
    async () => {
      const data = await fetchJikan(`/top/anime?page=${page}&limit=${perPage}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getAnimeDetail(id) {
  return withFallback(
    async () => {
      const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(id) });
      return data.Media;
    },
    async () => {
      const data = await fetchJikan(`/anime/${id}/full`);
      return normalizeJikanAnime(data.data);
    }
  );
}

export async function searchAnime({ search, genre, sort = 'SCORE_DESC', status, year, minScore, page = 1 } = {}) {
  return withFallback(
    async () => {
      const variables = { sort: [sort], page, perPage: 40 };
      if (search) variables.search = search;
      if (genre)  variables.genre  = genre;
      if (status) variables.status = status;
      if (year)   variables.year   = parseInt(year);
      if (minScore > 0) variables.score = minScore * 10;

      const data = await fetchAniList(SEARCH_QUERY, variables);
      return {
        media:      data.Page.media,
        hasNextPage: data.Page.pageInfo?.hasNextPage || false,
        total:       data.Page.pageInfo?.total || 0,
      };
    },
    async () => {
      const params = new URLSearchParams({ limit: 40, page });
      if (search) params.set('q', search);
      if (genre)  params.set('genres', genre);
      if (status === 'RELEASING')         params.set('status', 'airing');
      if (status === 'FINISHED')          params.set('status', 'complete');
      if (status === 'NOT_YET_RELEASED')  params.set('status', 'upcoming');
      if (year)   params.set('start_date', `${year}0101`);

      const data = await fetchJikan(`/anime?${params.toString()}`);
      return {
        media:       (data.data || []).map(normalizeJikanAnime),
        hasNextPage: data.pagination?.has_next_page || false,
        total:       data.pagination?.items?.total || 0,
      };
    }
  );
}

export async function getSchedule() {
  return withFallback(
    async () => {
      const query = `
        query {
          Page(perPage: 50) {
            media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
              id title { romaji english }
              coverImage { large medium color }
              nextAiringEpisode { episode timeUntilAiring airingAt }
              averageScore genres
            }
          }
        }`;
      const data = await fetchAniList(query);
      return data.Page.media;
    },
    async () => {
      const data = await fetchJikan('/schedules?limit=25');
      return (data.data || []).map(a => ({
        ...normalizeJikanAnime(a),
        nextAiringEpisode: a.broadcast?.time
          ? {
              episode: null,
              airingAt: null,
              timeUntilAiring: null,
              _broadcastStr: a.broadcast.string,
            }
          : null,
      }));
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. GraphQL Queries (AniList)
// ══════════════════════════════════════════════════════════════════════════════

export const TRENDING_QUERY = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME, status_not: NOT_YET_RELEASED) {
      id title { romaji english }
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
      id title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const SEASONAL_QUERY = `
query($season: MediaSeason, $year: Int, $perPage: Int) {
  Page(perPage: $perPage) {
    media(season: $season, seasonYear: $year, type: ANIME, sort: SCORE_DESC) {
      id title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const TOP_QUERY = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: SCORE_DESC, type: ANIME, status_not: NOT_YET_RELEASED) {
      id title { romaji english }
      coverImage { extraLarge large color }
      bannerImage genres episodes status averageScore season seasonYear
    }
  }
}`;

export const DETAIL_QUERY = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
    id title { romaji english native }
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
      id title { romaji english }
      coverImage { extraLarge large color }
      genres episodes status averageScore season seasonYear
    }
  }
}`;

// ══════════════════════════════════════════════════════════════════════════════
//  6. Helpers
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
