import { fetchAniList, DETAIL_QUERY, getTitle } from '@/lib/anilist';
import AnimePageClient from './AnimePage';

export async function generateMetadata({ params }) {
  const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(params.id) });
  const title = getTitle(data?.Media);
  return { title: `${title} | أنمي ستريم` };
}

export default async function AnimePage({ params }) {
  const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(params.id) });
  const anime = data?.Media;
  if (!anime) return <div style={{ padding: 60, textAlign: 'center' }}>الأنمي غير موجود</div>;
  return <AnimePageClient anime={anime} />;
}
