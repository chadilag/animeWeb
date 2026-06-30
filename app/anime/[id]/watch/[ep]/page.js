import { getAnimeDetail, getTitle } from '@/lib/anilist';
import { fetchEpisodeList, getMalId, getEmbedSources } from '@/lib/episodes';
import WatchPage from './WatchPage';

export async function generateMetadata({ params }) {
  const ep = parseInt(params.ep);
  const anime = await getAnimeDetail(parseInt(params.id));
  const title = getTitle(anime);
  return { title: `${title} — الحلقة ${ep} | أنمي ستريم` };
}

export default async function WatchRoute({ params }) {
  const anilistId = parseInt(params.id);
  const epNumber  = parseInt(params.ep);

  const anime = await getAnimeDetail(anilistId);

  if (!anime) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--sub)' }}>
        الأنمي غير موجود
      </div>
    );
  }

  const malId    = anime.idMal || await getMalId(anilistId);
  const episodes = await fetchEpisodeList(malId, anime.episodes);
  const sources  = getEmbedSources(anilistId, malId, epNumber);

  return (
    <WatchPage
      anime={anime}
      episodes={episodes}
      currentEp={epNumber}
      initialSources={sources}
      anilistId={anilistId}
      malId={malId}
    />
  );
}
