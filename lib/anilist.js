// ══════════════════════════════════════════════════════════════════════════════
//  lib/anilist.js  —  واجهة الصفحات السيرفر (Server Components)
//  كل المنطق الفعلي موجود بـ lib/sources.js — هذا الملف يستخدمه فقط
// ══════════════════════════════════════════════════════════════════════════════

import {
  fetchAniList, fetchJikan, buildJikanParams, normalizeJikanAnime, withFallback,
  TRENDING_QUERY, POPULAR_QUERY, SEASONAL_QUERY, TOP_QUERY, DETAIL_QUERY,
  SEARCH_QUERY, SCHEDULE_QUERY, MAL_ID_QUERY,
  getCurrentSeason, getTitle, cleanDesc, STATUS_AR, SEASON_AR, setForceJikan,
} from './sources';

// إعادة تصدير الأساسيات عشان باقي الملفات القديمة ما تنكسر
export {
  fetchAniList,
  TRENDING_QUERY, POPULAR_QUERY, SEASONAL_QUERY, TOP_QUERY, DETAIL_QUERY, SEARCH_QUERY,
  getCurrentSeason, getTitle, cleanDesc, STATUS_AR, SEASON_AR, setForceJikan,
};

// ══════════════════════════════════════════════════════════════════════════════
//  Public Functions
// ══════════════════════════════════════════════════════════════════════════════

export async function getTrending({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => (await fetchAniList(TRENDING_QUERY, { page, perPage })).Page.media,
    async () => {
      const data = await fetchJikan(`/top/anime?filter=airing&page=${page}&limit=${Math.min(perPage, 25)}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getPopular({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => (await fetchAniList(POPULAR_QUERY, { page, perPage })).Page.media,
    async () => {
      const data = await fetchJikan(`/top/anime?filter=bypopularity&page=${page}&limit=${Math.min(perPage, 25)}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getSeasonal({ season, year, perPage = 20 } = {}) {
  return withFallback(
    async () => (await fetchAniList(SEASONAL_QUERY, { season, year, perPage })).Page.media,
    async () => {
      const s = season?.toLowerCase() || 'spring';
      const y = year || new Date().getFullYear();
      const data = await fetchJikan(`/seasons/${y}/${s}?limit=${Math.min(perPage, 25)}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getTop({ page = 1, perPage = 20 } = {}) {
  return withFallback(
    async () => (await fetchAniList(TOP_QUERY, { page, perPage })).Page.media,
    async () => {
      const data = await fetchJikan(`/top/anime?page=${page}&limit=${Math.min(perPage, 25)}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function getAnimeDetail(id) {
  return withFallback(
    async () => (await fetchAniList(DETAIL_QUERY, { id: parseInt(id) })).Media,
    async () => normalizeJikanAnime((await fetchJikan(`/anime/${id}/full`)).data)
  );
}

export async function searchAnime({ search, genre, sort = 'SCORE_DESC', status, year, minScore, page = 1 } = {}) {
  return withFallback(
    async () => {
      const variables = { sort: [sort], page, perPage: 25 };
      if (search)                    variables.search = search;
      if (genre && genre !== 'الكل') variables.genre  = genre;
      if (status)                    variables.status = status;
      if (year)                      variables.year   = parseInt(year);
      if (minScore > 0)              variables.score  = minScore * 10;

      const data = await fetchAniList(SEARCH_QUERY, variables);
      return {
        media:       data.Page.media,
        hasNextPage: data.Page.pageInfo?.hasNextPage || false,
        total:       data.Page.pageInfo?.total || 0,
      };
    },
    async () => {
      const params = buildJikanParams({ search, genre, year, status, page });
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
    async () => (await fetchAniList(SCHEDULE_QUERY)).Page.media,
    async () => {
      const data = await fetchJikan('/schedules?limit=25');
      return (data.data || []).map(a => ({
        ...normalizeJikanAnime(a),
        nextAiringEpisode: a.broadcast?.time
          ? { episode: null, airingAt: null, timeUntilAiring: null, _broadcastStr: a.broadcast.string }
          : null,
      }));
    }
  );
}

// fallback أخير نادر الاستخدام (الأفضل دايماً استخدام anime.idMal الراجع من getAnimeDetail)
export async function getMalId(anilistId) {
  return withFallback(
    async () => (await fetchAniList(MAL_ID_QUERY, { id: anilistId })).Media?.idMal || null,
    async () => null // ما فيه طريقة عكسية من Jikan لمعرفة AniList ID
  );
}
