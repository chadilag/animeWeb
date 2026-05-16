'use client';
import { useEffect, useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import { getWatchlist, LIST_TYPES, getTotalCount } from '@/lib/watchlist';
import styles from './page.module.css';

export default function WatchlistPage() {
  const [wl, setWl] = useState({});
  const [activeTab, setActiveTab] = useState('watching');

  const load = () => setWl(getWatchlist());

  useEffect(() => {
    load();
    window.addEventListener('watchlist-updated', load);
    return () => window.removeEventListener('watchlist-updated', load);
  }, []);

  const total = Object.values(wl).reduce((s, a) => s + (a?.length || 0), 0);
  const activeList = wl[activeTab] || [];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>🎌 قائمتي</h1>
        {total > 0 && <span className={styles.total}>{total} أنمي</span>}
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        {Object.entries(LIST_TYPES).map(([key, val]) => (
          <button
            key={key}
            className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(key)}
            style={activeTab === key ? { borderColor: val.color, color: val.color } : {}}
          >
            {val.icon} {val.label}
            {wl[key]?.length > 0 && (
              <span
                className={styles.badge}
                style={activeTab === key ? { background: val.color } : {}}
              >
                {wl[key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {total === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p>قائمتك فارغة</p>
          <p className={styles.sub}>أضف أنمي من خلال الضغط على ＋ في أي كارت</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>{LIST_TYPES[activeTab].icon}</div>
          <p>لا يوجد أنمي في "{LIST_TYPES[activeTab].label}"</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {activeList.map(a => <AnimeCard key={a.id} anime={a} />)}
        </div>
      )}
    </div>
  );
}
