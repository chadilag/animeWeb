import { fetchAniList, DETAIL_QUERY, getTitle, cleanDesc, STATUS_AR, SEASON_AR } from '@/lib/anilist';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

export async function generateMetadata({ params }) {
  const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(params.id) });
  const title = getTitle(data?.Media);
  return { title: `${title} | أنمي ستريم` };
}

export default async function AnimePage({ params }) {
  const data = await fetchAniList(DETAIL_QUERY, { id: parseInt(params.id) });
  const a = data?.Media;
  if (!a) return <div style={{ padding: 60, textAlign: 'center' }}>الأنمي غير موجود</div>;

  const title = getTitle(a);
  const desc  = cleanDesc(a.description || '');
  const score = a.averageScore ? (a.averageScore / 10).toFixed(1) : null;
  const mainStudio = a.studios?.nodes?.find(s => s.isAnimationStudio)?.name || a.studios?.nodes?.[0]?.name;
  const related = a.relations?.edges?.filter(e => e.node.type === 'ANIME').slice(0, 6) || [];
  const recs = a.recommendations?.nodes?.map(n => n.mediaRecommendation).filter(Boolean).slice(0, 6) || [];

  return (
    <div className={styles.page}>
      {/* BANNER */}
      <div className={styles.banner}>
        {a.bannerImage && <img src={a.bannerImage} alt="" className={styles.bannerImg} />}
        <div className={styles.bannerFog} />
      </div>

      {/* MAIN */}
      <div className={styles.main}>
        {/* LEFT: POSTER */}
        <div className={styles.posterWrap}>
          {a.coverImage?.extraLarge
            ? <img src={a.coverImage.extraLarge} alt={title} className={styles.poster} />
            : <div className={styles.posterPh} />}
          <button className={styles.addBtn}>+ أضف للقائمة</button>
        </div>

        {/* RIGHT: INFO */}
        <div className={styles.info}>
          <h1 className={styles.title}>{title}</h1>
          {a.title?.romaji && <div className={styles.titleSub}>{a.title.romaji}</div>}
          {a.title?.native && <div className={styles.titleSub}>{a.title.native}</div>}

          {/* STATS */}
          <div className={styles.stats}>
            {score && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>التقييم</span>
                <span className={styles.statValue} style={{ color: '#ffd700' }}>⭐ {score}</span>
              </div>
            )}
            {a.episodes && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>الحلقات</span>
                <span className={styles.statValue}>{a.episodes}</span>
              </div>
            )}
            {a.status && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>الحالة</span>
                <span className={styles.statValue}>{STATUS_AR[a.status] || a.status}</span>
              </div>
            )}
            {a.season && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>الموسم</span>
                <span className={styles.statValue}>{SEASON_AR[a.season]} {a.seasonYear}</span>
              </div>
            )}
            {mainStudio && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>الاستوديو</span>
                <span className={styles.statValue}>{mainStudio}</span>
              </div>
            )}
            {a.duration && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>مدة الحلقة</span>
                <span className={styles.statValue}>{a.duration} دقيقة</span>
              </div>
            )}
            {a.popularity && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>المتابعون</span>
                <span className={styles.statValue}>{a.popularity.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* AIRING */}
          {a.nextAiringEpisode && (
            <div className={styles.airing}>
              🕐 الحلقة {a.nextAiringEpisode.episode} تُبَث خلال{' '}
              {Math.floor(a.nextAiringEpisode.timeUntilAiring / 86400)} يوم
            </div>
          )}

          {/* GENRES */}
          {a.genres?.length > 0 && (
            <div className={styles.genres}>
              {a.genres.map(g => <span key={g} className={styles.genre}>{g}</span>)}
            </div>
          )}

          {/* DESC */}
          {desc && <p className={styles.desc}>{desc}</p>}
        </div>
      </div>

      {/* CHARACTERS */}
      {a.characters?.nodes?.length > 0 && (
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>🎭 الشخصيات الرئيسية</h2>
          <div className={styles.chars}>
            {a.characters.nodes.map(c => (
              <div key={c.name.full} className={styles.char}>
                {c.image?.medium && <img src={c.image.medium} alt={c.name.full} className={styles.charImg} />}
                <div className={styles.charName}>{c.name.full}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RELATED */}
      {related.length > 0 && (
        <div className={styles.block} style={{ background: 'var(--bg2)' }}>
          <div style={{ padding: '0 28px' }}>
            <h2 className={styles.blockTitle}>🔗 أنمي مرتبط</h2>
            <div className={styles.relGrid}>
              {related.map(e => (
                <div key={e.node.id}>
                  <div className={styles.relType}>{e.relationType}</div>
                  <AnimeCard anime={{ ...e.node, coverImage: { extraLarge: e.node.coverImage?.medium } }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS */}
      {recs.length > 0 && (
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>💡 قد يعجبك أيضاً</h2>
          <div className={styles.relGrid}>
            {recs.map(r => (
              <AnimeCard key={r.id} anime={{ ...r, coverImage: { extraLarge: r.coverImage?.medium } }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
