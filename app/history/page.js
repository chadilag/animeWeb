'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, clearHistory } from '@/lib/watchlist';
import { getTitle } from '@/lib/anilist';
import styles from './page.module.css';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => { setHistory(getHistory()); }, []);

  const handleClear = () => {
    if (confirm('هل تريد مسح سجل المشاهدة؟')) {
      clearHistory(); setHistory([]);
    }
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>🕐 سجل المشاهدة</h1>
        {history.length > 0 && (
          <button className={styles.clearBtn} onClick={handleClear}>مسح السجل</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📭</div>
          <p>السجل فارغ</p>
          <p className={styles.sub}>الأنميات التي تفتحها ستظهر هنا</p>
        </div>
      ) : (
        <div className={styles.list}>
          {history.map(anime => {
            const title = getTitle(anime);
            const img = anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium;
            return (
              <Link key={`${anime.id}-${anime.visitedAt}`} href={`/anime/${anime.id}`} className={styles.item}>
                <div className={styles.imgWrap}>
                  {img
                    ? <img src={img} alt={title} className={styles.thumb} />
                    : <div className={styles.thumbPh} />}
                </div>
                <div className={styles.info}>
                  <div className={styles.title}>{title}</div>
                  <div className={styles.meta}>
                    {anime.genres?.slice(0, 2).map(g => (
                      <span key={g} className={styles.genre}>{g}</span>
                    ))}
                  </div>
                </div>
                <div className={styles.time}>{timeAgo(anime.visitedAt)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
