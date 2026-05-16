'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTitle, cleanDesc, STATUS_AR, SEASON_AR } from '@/lib/anilist';
import { getAnimeStatus, setAnimeStatus, removeFromAll, LIST_TYPES } from '@/lib/watchlist';
import styles from './Hero.module.css';

function HeroListBtn({ anime }) {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStatus(getAnimeStatus(anime.id));
  }, [anime.id]);

  const change = (e, newStatus) => {
    e.stopPropagation();
    if (newStatus === status) { removeFromAll(anime.id); setStatus(null); }
    else { setAnimeStatus(anime, newStatus); setStatus(newStatus); }
    setOpen(false);
  };

  const cur = status ? LIST_TYPES[status] : null;

  return (
    <div className={styles.listBtnWrap}>
      <button
        className={styles.btnGhost}
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        style={cur ? { borderColor: cur.color, color: cur.color } : {}}
      >
        {cur ? `${cur.icon} ${cur.label}` : '＋ قائمتي'}
      </button>
      {open && (
        <div className={styles.heroDropdown}>
          {Object.entries(LIST_TYPES).map(([key, val]) => (
            <button
              key={key}
              className={`${styles.heroDropItem} ${status === key ? styles.heroDropActive : ''}`}
              onClick={(e) => change(e, key)}
              style={status === key ? { color: val.color } : {}}
            >
              {val.icon} {val.label}
            </button>
          ))}
          {status && (
            <button
              className={`${styles.heroDropItem} ${styles.heroDropRemove}`}
              onClick={(e) => { e.stopPropagation(); removeFromAll(anime.id); setStatus(null); setOpen(false); }}
            >
              🗑 إزالة
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Hero({ list }) {
  const [idx, setIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!list?.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % Math.min(list.length, 8)), 6000);
    return () => clearInterval(t);
  }, [list]);

  if (!list?.length) return <div className={styles.placeholder} />;

  const a = list[idx];
  const title = getTitle(a);
  const desc = cleanDesc(a.description || '');
  const score = a.averageScore ? (a.averageScore / 10).toFixed(1) : null;

  return (
    <div className={styles.hero}>
      {a.bannerImage && (
        <img key={a.id} src={a.bannerImage} alt="" className={styles.bg} />
      )}
      <div className={styles.fog} />

      <div className={styles.content}>
        <div className={styles.badge}>🔥 الأكثر رواجاً</div>
        <h1 className={styles.title}>{title}</h1>
        {a.title?.romaji && a.title?.romaji !== title && (
          <div className={styles.titleEn}>{a.title.romaji}</div>
        )}

        <div className={styles.meta}>
          {score && <span className={styles.score}>⭐ {score}</span>}
          {a.episodes && <span className={styles.pill}>📺 {a.episodes} حلقة</span>}
          {a.season && <span className={styles.pill}>{SEASON_AR[a.season]} {a.seasonYear}</span>}
          {a.status && <span className={styles.pill}>{STATUS_AR[a.status] || a.status}</span>}
          {(a.genres || []).slice(0, 2).map(g => (
            <span key={g} className={styles.pill}>{g}</span>
          ))}
        </div>

        {desc && <p className={styles.desc}>{desc.slice(0, 260)}...</p>}

        <div className={styles.btns}>
          <button className={styles.btnMain} onClick={() => router.push(`/anime/${a.id}`)}>
            📋 تفاصيل
          </button>
          <HeroListBtn anime={a} />
        </div>

        <div className={styles.dots}>
          {list.slice(0, 8).map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
