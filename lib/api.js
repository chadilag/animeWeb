// ══════════════════════════════════════════════════════════════════════════════
//  lib/api.js  —  واجهة الصفحات Client-Side ('use client')
//  كل المنطق الفعلي موجود بـ lib/sources.js — هذا الملف يستخدمه فقط
// ══════════════════════════════════════════════════════════════════════════════

import {
  fetchAniList, fetchJikan, buildJikanParams, normalizeJikanAnime, withFallback,
  BROWSE_QUERY, SEARCH_QUERY, SCHEDULE_QUERY,
} from './sources';

// ══════════════════════════════════════════════════════════════════════════════
//  Public Functions
// ══════════════════════════════════════════════════════════════════════════════

export async function apiBrowse({ genre, sort, page }) {
  return withFallback(
    async () => {
      const variables = { sort: [sort], page };
      if (genre !== 'الكل') variables.genre = genre;
      const data = await fetchAniList(BROWSE_QUERY, variables);
      return {
        media:       data.Page.media,
        hasNextPage: data.Page.pageInfo?.hasNextPage || false,
      };
    },
    async () => {
      const sortMap = {
        SCORE_DESC:      'score',
        POPULARITY_DESC: 'members',
        TRENDING_DESC:   'members',
        START_DATE_DESC: 'start_date',
      };
      const params = buildJikanParams({ genre, page });
      params.set('order_by', sortMap[sort] || 'score');
      params.set('sort', 'desc');
      params.set('status', 'complete');

      const data = await fetchJikan(`/anime?${params.toString()}`);
      return {
        media:       (data.data || []).map(normalizeJikanAnime),
        hasNextPage: data.pagination?.has_next_page || false,
      };
    }
  );
}

export async function apiSearch({ search, genre, sort, status, year, minScore }) {
  return withFallback(
    async () => {
      const variables = { sort: [sort] };
      if (search)                    variables.search = search;
      if (genre && genre !== 'الكل') variables.genre  = genre;
      if (status)                    variables.status = status;
      if (year)                      variables.year   = parseInt(year);
      if (minScore > 0)              variables.score  = minScore * 10;
      const data = await fetchAniList(SEARCH_QUERY, variables);
      return data.Page.media || [];
    },
    async () => {
      const params = buildJikanParams({ search, genre, year, status });
      const data = await fetchJikan(`/anime?${params.toString()}`);
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}

export async function apiSchedule() {
  return withFallback(
    async () => (await fetchAniList(SCHEDULE_QUERY)).Page.media || [],
    async () => {
      const data = await fetchJikan('/schedules?limit=25');
      return (data.data || []).map(normalizeJikanAnime);
    }
  );
}
