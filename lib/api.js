// lib/api.js — Client-side API helper with AniList + Jikan fallback
// استخدم هذا الملف في الـ 'use client' components بدل fetch مباشر

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_URL   = 'https://api.jikan.moe/v4';

// ── وضع الاختبار (يجبر استخدام Jikan) ───────────────────────────────────────
// في المتصفح اكتب:
//   window.__forceJikan = true   ← يجبر Jikan
//   window.__forceJikan = false  ← يرجع AniList

function isForceJikan() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('forceJikan') === 'true';
}

// ── AniList fetch ─────────────────────────────────────────────────────────────
async function anilistFetch(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Jikan fetch ───────────────────────────────────────────────────────────────
async function jikanFetch(endpoint) {
  await new Promise(r => setTimeout(r, 350)); // rate limit protection
  const res = await fetch(`${JIKAN_URL}${endpoint}`);
  if (!res.ok) throw new Error(`Jikan: ${res.status}`);
  return res.json();
}

// ── Normalizer ────────────────────────────────────────────────────────────────
function normalizeJikan(a) {
  const statusMap = {
    'Finished Airing': 'FINISHED',
    'Currently Airing': 'RELEASING',
    'Not yet aired': 'NOT_YET_RELEASED',
  };
  return {
    id: a.mal_id,
    title: { english: a.title_english || a.title, romaji: a.title },
    coverImage: {
      extraLarge: a.images?.jpg?.large_image_url,
      large:      a.images?.jpg?.image_url,
      color:      null,
    },
    genres:      (a.genres || []).map(g => g.name),
    episodes:    a.episodes,
    status:      statusMap[a.status] || 'FINISHED',
    averageScore: a.score ? Math.round(a.score * 10) : null,
    season:      a.season?.toUpperCase() || null,
    seasonYear:  a.year,
    nextAiringEpisode: a.broadcast?.time
      ? { episode: null, airingAt: null, _broadcastStr: a.broadcast.string }
      : null,
  };
}

// ── Fallback wrapper ──────────────────────────────────────────────────────────
async function withFallback(anilistFn, jikanFn) {
  if (isForceJikan()) {
    console.log('🧪 [Test Mode] Using Jikan API');
    return jikanFn();
  }
  try {
    return await anilistFn();
  } catch (err) {
    console.warn('⚠️ AniList failed → Jikan', err.message);
    return jikanFn();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  Public functions
// ══════════════════════════════════════════════════════════════════════════════

export async function apiBrowse({ genre, sort, page }) {
  const sortMap = {
    SCORE_DESC:      'score',
    POPULARITY_DESC: 'members',
    TRENDING_DESC:   'members',
    START_DATE_DESC: 'start_date',
  };

  const anilistQuery = `
    query($genre: String, $sort: [MediaSort], $page: Int) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage }
        media(type: ANIME, genre: $genre, sort: $sort, status_not: NOT_YET_RELEASED) {
          id title { romaji english }
          coverImage { extraLarge large color }
          genres episodes status averageScore season seasonYear
        }
      }
    }`;

  return withFallback(
    async () => {
      const variables = { sort: [sort], page };
      if (genre !== 'الكل') variables.genre = genre;
      const data = await anilistFetch(anilistQuery, variables);
      return {
        media:      data.Page.media,
        hasNextPage: data.Page.pageInfo?.hasNextPage || false,
      };
    },
    async () => {
      const params = new URLSearchParams({ page, limit: 24, order_by: sortMap[sort] || 'score', sort: 'desc', status: 'complete' });
      if (genre !== 'الكل') params.set('genres', genre);
      const data = await jikanFetch(`/anime?${params}`);
      return {
        media:       (data.data || []).map(normalizeJikan),
        hasNextPage: data.pagination?.has_next_page || false,
      };
    }
  );
}

export async function apiSearch({ search, genre, sort, status, year, minScore }) {
  const anilistQuery = `
    query($search: String, $genre: String, $sort: [MediaSort], $status: MediaStatus, $year: Int, $score: Int) {
      Page(perPage: 40) {
        media(search: $search, type: ANIME, genre: $genre, sort: $sort, status: $status, seasonYear: $year, averageScore_greater: $score) {
          id title { romaji english }
          coverImage { extraLarge large color }
          genres episodes status averageScore season seasonYear
        }
      }
    }`;

  return withFallback(
    async () => {
      const variables = { sort: [sort] };
      if (search)       variables.search = search;
      if (genre)        variables.genre  = genre;
      if (status)       variables.status = status;
      if (year)         variables.year   = parseInt(year);
      if (minScore > 0) variables.score  = minScore * 10;
      const data = await anilistFetch(anilistQuery, variables);
      return data.Page.media || [];
    },
    async () => {
      const params = new URLSearchParams({ limit: 40 });
      if (search) params.set('q', search);
      if (genre)  params.set('genres', genre);
      if (year)   params.set('start_date', `${year}0101`);
      if (status === 'RELEASING')        params.set('status', 'airing');
      if (status === 'FINISHED')         params.set('status', 'complete');
      if (status === 'NOT_YET_RELEASED') params.set('status', 'upcoming');
      const data = await jikanFetch(`/anime?${params}`);
      return (data.data || []).map(normalizeJikan);
    }
  );
}

export async function apiSchedule() {
  const anilistQuery = `
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

  return withFallback(
    async () => {
      const data = await anilistFetch(anilistQuery);
      return data.Page.media || [];
    },
    async () => {
      const data = await jikanFetch('/schedules?limit=25');
      return (data.data || []).map(normalizeJikan);
    }
  );
}
