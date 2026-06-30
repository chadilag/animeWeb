import { getAnimeDetail, getTitle } from '@/lib/anilist';
import AnimePageClient from './AnimePage';

export async function generateMetadata({ params }) {
  const anime = await getAnimeDetail(parseInt(params.id));
  const title = getTitle(anime);
  return { title: `${title} | أنمي ستريم` };
}

export default async function AnimePage({ params }) {
  const anime = await getAnimeDetail(parseInt(params.id));
  if (!anime) return <div style={{ padding: 60, textAlign: 'center' }}>الأنمي غير موجود</div>;
  return <AnimePageClient anime={anime} />;
}
