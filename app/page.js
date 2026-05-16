import Hero from '@/components/Hero';
import Section from '@/components/Section';
import { fetchAniList, TRENDING_QUERY, POPULAR_QUERY, SEASONAL_QUERY, TOP_QUERY, getCurrentSeason } from '@/lib/anilist';

export default async function HomePage() {
  const { season, year } = getCurrentSeason();

  const [trending, popular, seasonal, top] = await Promise.all([
    fetchAniList(TRENDING_QUERY, { page: 1, perPage: 20 }),
    fetchAniList(POPULAR_QUERY,  { page: 1, perPage: 20 }),
    fetchAniList(SEASONAL_QUERY, { season, year, perPage: 20 }),
    fetchAniList(TOP_QUERY,      { page: 1, perPage: 20 }),
  ]);

  const trendingList = trending?.Page?.media || [];
  const popularList  = popular?.Page?.media  || [];
  const seasonalList = seasonal?.Page?.media || [];
  const topList      = top?.Page?.media      || [];

  return (
    <>
      <Hero list={trendingList} />
      <Section title="🔥 الأكثر رواجاً الآن"       list={trendingList} horizontal />
      <Section title="📅 موسم هذا العام"             list={seasonalList} horizontal alt />
      <Section title="👑 الأعلى تقييماً على الإطلاق" list={topList} ranked />
      <Section title="🌟 الأكثر شعبية"               list={popularList} horizontal alt />
    </>
  );
}
