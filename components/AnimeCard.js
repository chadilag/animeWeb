'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { getTitle, STATUS_AR } from '@/lib/anilist';
import { getAnimeStatus, setAnimeStatus, removeFromAll, LIST_TYPES } from '@/lib/watchlist';
import styles from './AnimeCard.module.css';

export default function AnimeCard({ anime, rank }) {
  const title = getTitle(anime);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const img = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const airing = anime.status === 'RELEASING';
  const [status, setStatus] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setStatus(getAnimeStatus(anime.id));
  }, [anime.id]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = (e, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (newStatus === status) {
      removeFromAll(anime.id);
      setStatus(null);
    } else {
      setAnimeStatus(anime, newStatus);
      setStatus(newStatus);
    }
    setShowMenu(false);
  };

  const toggleMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(prev => !prev);
  };

  const currentType = status ? LIST_TYPES[status] : null;

  return (
    <div className={styles.card}>
      {rank && <div className={styles.rank}>#{rank}</div>}

      <div className={styles.imgWrap}>
        <Link href={`/anime/${anime.id}`} className={styles.imgLink}>
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
        </Link>

        {/* زر القائمة */}
        <div ref={menuRef} className={styles.menuWrap}>
          <button
            className={`${styles.listBtn} ${status ? styles.listBtnActive : ''}`}
            onClick={toggleMenu}
            title="أضف للقائمة"
            style={currentType ? { background: currentType.color + '33', borderColor: currentType.color } : {}}
          >
            {currentType ? currentType.icon : '＋'}
          </button>

          {showMenu && (
            <div className={styles.dropdown}>
              {Object.entries(LIST_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  className={`${styles.dropItem} ${status === key ? styles.dropActive : ''}`}
                  onClick={(e) => handleStatusChange(e, key)}
                  style={status === key ? { color: val.color } : {}}
                >
                  <span>{val.icon}</span>
                  <span>{val.label}</span>
                  {status === key && <span className={styles.check}>✓</span>}
                </button>
              ))}
              {status && (
                <button
                  className={`${styles.dropItem} ${styles.dropRemove}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromAll(anime.id); setStatus(null); setShowMenu(false); }}
                >
                  <span>🗑</span>
                  <span>إزالة من القائمة</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Link href={`/anime/${anime.id}`} className={styles.body}>
        <div className={styles.title}>{title}</div>
        <div className={styles.foot}>
          {score ? <span className={styles.score}>⭐ {score}</span> : <span />}
          <span className={`${styles.dot} ${!airing ? styles.dotOff : ''}`} title={STATUS_AR[anime.status]} />
        </div>
        {currentType && (
          <div className={styles.statusTag} style={{ color: currentType.color }}>
            {currentType.icon} {currentType.label}
          </div>
        )}
      </Link>
    </div>
  );
}
