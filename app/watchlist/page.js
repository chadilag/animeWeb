'use client';
import { useEffect, useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

export default function WatchlistPage() {
  const [list, setList] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setList(saved);
  }, []);

  const clear = () => {
    if (confirm('هل تريد مسح قائمتك كاملة؟')) {
      localStorage.removeItem('watchlist');
      setList([]);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>🎌 قائمتي</h1>
        {list.length > 0 && (
          <div className={styles.meta}>
            <span className={styles.count}>{list.length} أنمي</span>
            <button className={styles.clearBtn} onClick={clear}>مسح الكل</button>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>قائمتك فارغة</p>
          <p className={styles.sub}>أضف أنمي من خلال الضغط على ❤️ في أي كارت</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {list.map(a => <AnimeCard key={a.id} anime={a} />)}
        </div>
      )}
    </div>
  );
}
