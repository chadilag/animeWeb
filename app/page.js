import Hero from '@/components/Hero';
import Section from '@/components/Section';
import { getTrending, getPopular, getSeasonal, getTop, getCurrentSeason } from '@/lib/anilist';

export default async function HomePage() {
  const { season, year } = getCurrentSeason();

  const [trendingList, popularList, seasonalList, topList] = await Promise.all([
    getTrending({ page: 1, perPage: 20 }),
    getPopular({ page: 1, perPage: 20 }),
    getSeasonal({ season, year, perPage: 20 }),
    getTop({ page: 1, perPage: 20 }),
  ]);

  return (
    <>
      <Hero list={trendingList} />
      <Section title="🔥 الأكثر رواجاً الآن"        list={trendingList} horizontal />
      <Section title="📅 موسم هذا العام"              list={seasonalList} horizontal alt />
      <Section title="👑 الأعلى تقييماً على الإطلاق"  list={topList}      horizontal ranked />
      <Section title="🌟 الأكثر شعبية"                list={popularList}  horizontal alt />
    </>
  );
}
