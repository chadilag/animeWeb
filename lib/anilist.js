const API = 'https://graphql.anilist.co';

export async function fetchAniList(query, variables = {}) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ── QUERIES ──────────────────────────────────────────────────────────────────

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
    coverImage { extraLarge }
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
        node { id title { romaji } coverImage { medium } type }
      }
    }
    recommendations(perPage: 6) {
      nodes { mediaRecommendation { id title { romaji } coverImage { medium } averageScore } }
    }
    nextAiringEpisode { episode timeUntilAiring }
  }
}`;

export const SEARCH_QUERY = `
query($search: String, $page: Int, $perPage: Int, $genre: String, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total hasNextPage }
    media(search: $search, type: ANIME, genre: $genre, sort: $sort) {
      id title { romaji english }
      coverImage { extraLarge large color }
      genres episodes status averageScore season seasonYear
    }
  }
}`;

// ── HELPERS ───────────────────────────────────────────────────────────────────

export function getCurrentSeason() {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
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
  FINISHED: 'منتهي',
  RELEASING: 'يُبَث الآن',
  NOT_YET_RELEASED: 'قريباً',
  CANCELLED: 'ملغي',
  HIATUS: 'متوقف',
};

export const SEASON_AR = {
  WINTER: 'شتاء', SPRING: 'ربيع', SUMMER: 'صيف', FALL: 'خريف',
};