'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getTitle, STATUS_AR } from '@/lib/anilist';
import styles from './AnimeCard.module.css';

export default function AnimeCard({ anime, rank }) {
  const title = getTitle(anime);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const img = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const airing = anime.status === 'RELEASING';
  const [inList, setInList] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setInList(saved.some(a => a.id === anime.id));
  }, [anime.id]);

  const toggleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem('watchlist') || '[]');
    let updated;
    if (inList) {
      updated = saved.filter(a => a.id !== anime.id);
    } else {
      updated = [...saved, anime];
    }
    localStorage.setItem('watchlist', JSON.stringify(updated));
    setInList(!inList);
    window.dispatchEvent(new Event('watchlist-updated'));
  };

  return (
    <Link href={`/anime/${anime.id}`} className={styles.card}>
      {rank && <div className={styles.rank}>#{rank}</div>}

      <div className={styles.imgWrap}>
        {img
          ? <img src={img} alt={title} className={styles.img} loading="lazy" />
          : <div className={styles.imgPh} style={{ background: anime.coverImage?.color || 'var(--card2)' }} />}
        <div className={styles.hoverLayer}>
          <div className={styles.chips}>
            {(anime.genres || []).slice(0, 3).map(g => (
              <span key={g} className={styles.chip}>{g}</span>
            ))}
          </div>
        </div>
        <button
          className={`${styles.heartBtn} ${inList ? styles.heartActive : ''}`}
          onClick={toggleWatchlist}
          title={inList ? 'إزالة من القائمة' : 'إضافة للقائمة'}
        >
          {inList ? '❤️' : '🤍'}
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        <div className={styles.foot}>
          {score
            ? <span className={styles.score}>⭐ {score}</span>
            : <span />}
          <span className={`${styles.dot} ${!airing ? styles.dotOff : ''}`}
            title={STATUS_AR[anime.status]} />
        </div>
      </div>
    </Link>
  );
}
