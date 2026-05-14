'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTitle, cleanDesc, STATUS_AR, SEASON_AR } from '@/lib/anilist';
import styles from './Hero.module.css';

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
          <button className={styles.btnGhost}>+ قائمتي</button>
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
