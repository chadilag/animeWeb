'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTitle, STATUS_AR, SEASON_AR, cleanDesc } from '@/lib/anilist';
import { getAnimeStatus, setAnimeStatus, removeFromAll, LIST_TYPES, addToHistory } from '@/lib/watchlist';
import { fetchEpisodeList, getMalId } from '@/lib/episodes';
import styles from './page.module.css';

/* ── زر الحالة ── */
function StatusBtn({ anime }) {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { setStatus(getAnimeStatus(anime.id)); addToHistory(anime); }, [anime.id]);
  const change = (s) => {
    if (s === status) { removeFromAll(anime.id); setStatus(null); }
    else { setAnimeStatus(anime, s); setStatus(s); }
    setOpen(false);
  };
  const cur = status ? LIST_TYPES[status] : null;
  return (
    <div style={{ position: 'relative' }}>
      <button className={styles.addBtn} onClick={() => setOpen(p => !p)}
        style={cur ? { background: cur.color + '22', borderColor: cur.color, color: cur.color } : {}}>
        {cur ? `${cur.icon} ${cur.label}` : '＋ أضف للقائمة'}
      </button>
      {open && (
        <div className={styles.statusMenu}>
          {Object.entries(LIST_TYPES).map(([key, val]) => (
            <button key={key} className={`${styles.statusItem} ${status === key ? styles.statusActive : ''}`}
              onClick={() => change(key)} style={status === key ? { color: val.color } : {}}>
              {val.icon} {val.label}
            </button>
          ))}
          {status && <button className={`${styles.statusItem} ${styles.statusRemove}`}
            onClick={() => { removeFromAll(anime.id); setStatus(null); setOpen(false); }}>🗑 إزالة</button>}
        </div>
      )}
    </div>
  );
}

/* ── مودال التريلر ── */
function TrailerModal({ trailer, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  if (!trailer?.id) return null;
  const src = trailer.site === 'youtube'
    ? `https://www.youtube.com/embed/${trailer.id}?autoplay=1`
    : `https://www.dailymotion.com/embed/video/${trailer.id}?autoplay=1`;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
        <iframe src={src} className={styles.trailerFrame} allowFullScreen allow="autoplay; fullscreen" title="Trailer" />
      </div>
    </div>
  );
}

/* ── كارت صغير ── */
function MiniCard({ anime }) {
  const title = getTitle(anime);
  const img = anime.coverImage?.large || anime.coverImage?.extraLarge;
  return (
    <Link href={`/anime/${anime.id}`} style={{ textDecoration: 'none', color: 'var(--text)' }}>
      <div className={styles.miniCard}>
        {img ? <img src={img} alt={title} className={styles.miniImg} loading="lazy" /> : <div className={styles.miniPh} />}
        <div className={styles.miniTitle}>{title}</div>
      </div>
    </Link>
  );
}

/* ── قسم الحلقات ── */
function EpisodesSection({ anime }) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [lastWatched, setLastWatched] = useState(null);
  const PER_PAGE = 50;

  useEffect(() => {
    // آخر حلقة شاهدها المستخدم
    try {
      const h = JSON.parse(localStorage.getItem('watchHistory') || '{}');
      if (h[anime.id]) setLastWatched(h[anime.id].ep);
    } catch {}

    // جلب قائمة الحلقات
    const load = async () => {
      const malId = anime.idMal || await getMalId(anime.id);
      const eps   = await fetchEpisodeList(malId, anime.episodes);
      setEpisodes(eps);
      setLoading(false);
    };
    load();
  }, [anime.id]);

  const totalPages = Math.ceil(episodes.length / PER_PAGE);
  const pageEps    = episodes.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const firstEp    = episodes[0]?.number || 1;
  const continueEp = lastWatched && lastWatched < (anime.episodes || 1) ? lastWatched + 1 : null;

  if (loading) return (
    <div className={styles.epsLoading}>
      <div className={styles.spinner} />
      <span>جارٍ تحميل قائمة الحلقات...</span>
    </div>
  );

  if (episodes.length === 0) return (
    <div className={styles.epsEmpty}>
      <div style={{ fontSize: 32 }}>📭</div>
      <p>لا توجد حلقات متوفرة حالياً</p>
    </div>
  );

  return (
    <div>
      {/* أزرار سريعة */}
      <div className={styles.epsActions}>
        <button className={styles.watchFirstBtn} onClick={() => router.push(`/anime/${anime.id}/watch/${firstEp}`)}>
          ▶ شاهد من البداية
        </button>
        {continueEp && (
          <button className={styles.watchContinueBtn} onClick={() => router.push(`/anime/${anime.id}/watch/${continueEp}`)}>
            ⏩ متابعة — الحلقة {continueEp}
          </button>
        )}
        {lastWatched && (
          <span className={styles.lastWatched}>آخر مشاهدة: الحلقة {lastWatched}</span>
        )}
      </div>

      {/* ترقيم الصفحات */}
      {totalPages > 1 && (
        <div className={styles.epPages}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${styles.epPageBtn} ${page === i + 1 ? styles.epPageActive : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i * PER_PAGE + 1} – {Math.min((i + 1) * PER_PAGE, episodes.length)}
            </button>
          ))}
        </div>
      )}

      {/* شبكة الحلقات */}
      <div className={styles.epGrid}>
        {pageEps.map(ep => {
          const watched = lastWatched && ep.number <= lastWatched;
          const current = ep.number === lastWatched;
          return (
            <Link
              key={ep.number}
              href={`/anime/${anime.id}/watch/${ep.number}`}
              className={`${styles.epCard} ${current ? styles.epCurrent : ''} ${watched ? styles.epWatched : ''} ${ep.filler ? styles.epFiller : ''}`}
              title={ep.title !== `الحلقة ${ep.number}` ? ep.title : ''}
            >
              <span className={styles.epCardNum}>{ep.number}</span>
              {watched && !current && <span className={styles.epWatchedDot}>✓</span>}
              {current && <span className={styles.epCurrentDot}>▶</span>}
              {ep.filler && <span className={styles.epFillerDot}>F</span>}
            </Link>
          );
        })}
      </div>

      <div className={styles.epLegend}>
        <span><span className={styles.legendWatched}>✓</span> شاهدت</span>
        <span><span className={styles.legendCurrent}>▶</span> آخر مشاهدة</span>
        <span><span className={styles.legendFiller}>F</span> Filler</span>
      </div>
    </div>
  );
}

/* ── الصفحة الرئيسية ── */
export default function AnimePage({ anime: a }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const title      = getTitle(a);
  const desc       = cleanDesc(a.description || '');
  const score      = a.averageScore ? (a.averageScore / 10).toFixed(1) : null;
  const mainStudio = a.studios?.nodes?.find(s => s.isAnimationStudio)?.name || a.studios?.nodes?.[0]?.name;
  const related    = a.relations?.edges?.filter(e => e.node.type === 'ANIME').slice(0, 6) || [];
  const recs       = a.recommendations?.nodes?.map(n => n.mediaRecommendation).filter(Boolean).slice(0, 6) || [];
  const hasTrailer = !!a.trailer?.id;

  return (
    <div className={styles.page}>
      {showTrailer && <TrailerModal trailer={a.trailer} onClose={() => setShowTrailer(false)} />}

      {/* BANNER */}
      <div className={styles.banner}>
        {a.bannerImage && <img src={a.bannerImage} alt="" className={styles.bannerImg} />}
        <div className={styles.bannerFog} />
        {hasTrailer && (
          <button type="button" className={styles.trailerBannerBtn} onClick={() => setShowTrailer(true)}>
            ▶ شاهد التريلر
          </button>
        )}
      </div>

      {/* MAIN */}
      <div className={styles.main}>
        <div className={styles.posterWrap}>
          {a.coverImage?.extraLarge
            ? <img src={a.coverImage.extraLarge} alt={title} className={styles.poster} />
            : <div className={styles.posterPh} />}
          <StatusBtn anime={a} />
          {hasTrailer && (
            <button type="button" className={styles.trailerBtn} onClick={() => setShowTrailer(true)}>▶ التريلر</button>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{title}</h1>
          {a.title?.romaji && <div className={styles.titleSub}>{a.title.romaji}</div>}
          {a.title?.native && <div className={styles.titleSub}>{a.title.native}</div>}

          <div className={styles.stats}>
            {score && <div className={styles.stat}><span className={styles.statLabel}>التقييم</span><span className={styles.statValue} style={{ color: '#ffd700' }}>⭐ {score}</span></div>}
            {a.episodes && <div className={styles.stat}><span className={styles.statLabel}>الحلقات</span><span className={styles.statValue}>{a.episodes}</span></div>}
            {a.status && <div className={styles.stat}><span className={styles.statLabel}>الحالة</span><span className={styles.statValue}>{STATUS_AR[a.status] || a.status}</span></div>}
            {a.season && <div className={styles.stat}><span className={styles.statLabel}>الموسم</span><span className={styles.statValue}>{SEASON_AR[a.season]} {a.seasonYear}</span></div>}
            {mainStudio && <div className={styles.stat}><span className={styles.statLabel}>الاستوديو</span><span className={styles.statValue}>{mainStudio}</span></div>}
            {a.duration && <div className={styles.stat}><span className={styles.statLabel}>مدة الحلقة</span><span className={styles.statValue}>{a.duration} دقيقة</span></div>}
            {a.popularity && <div className={styles.stat}><span className={styles.statLabel}>المتابعون</span><span className={styles.statValue}>{a.popularity.toLocaleString()}</span></div>}
          </div>

          {a.nextAiringEpisode && (
            <div className={styles.airing}>
              🕐 الحلقة {a.nextAiringEpisode.episode} تُبَث خلال {Math.floor(a.nextAiringEpisode.timeUntilAiring / 86400)} يوم
            </div>
          )}

          {a.genres?.length > 0 && (
            <div className={styles.genres}>{a.genres.map(g => <span key={g} className={styles.genre}>{g}</span>)}</div>
          )}

          {desc && <p className={styles.desc}>{desc}</p>}
        </div>
      </div>

      {/* ── EPISODES ── */}
      <div className={styles.block} style={{ background: 'var(--bg2)' }}>
        <h2 className={styles.blockTitle}>📺 الحلقات</h2>
        <EpisodesSection anime={a} />
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
                  <MiniCard anime={{ ...e.node, coverImage: { large: e.node.coverImage?.large, extraLarge: e.node.coverImage?.large } }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECS */}
      {recs.length > 0 && (
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>💡 قد يعجبك أيضاً</h2>
          <div className={styles.relGrid}>
            {recs.map(r => <MiniCard key={r.id} anime={{ ...r, coverImage: { large: r.coverImage?.large, extraLarge: r.coverImage?.large } }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
