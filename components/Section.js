'use client';
import { useState, useRef } from 'react';
import AnimeCard from './AnimeCard';
import styles from './Section.module.css';

const DEFAULT_COUNT = 8;

export default function Section({ title, list, ranked = false, wide = false, alt = false, horizontal = false }) {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  if (horizontal) {
    return (
      <section className={`${styles.sec} ${alt ? styles.alt : ''}`}>
        <div className={styles.header}>
          <div className={styles.line} />
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.scrollBtns}>
            <button className={styles.scrollBtn} onClick={() => scroll(1)}>‹</button>
            <button className={styles.scrollBtn} onClick={() => scroll(-1)}>›</button>
          </div>
        </div>
        <div className={styles.hScroll} ref={scrollRef}>
          {list.map((anime, i) => (
            <div key={anime.id} className={styles.hCard}>
              <AnimeCard anime={anime} rank={ranked ? i + 1 : undefined} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const displayed = showAll ? list : list.slice(0, DEFAULT_COUNT);

  return (
    <section className={`${styles.sec} ${alt ? styles.alt : ''}`}>
      <div className={styles.header}>
        <div className={styles.line} />
        <h2 className={styles.title}>{title}</h2>
        {list.length > DEFAULT_COUNT && (
          <button className={styles.moreBtn} onClick={() => setShowAll(p => !p)}>
            {showAll ? '← عرض أقل' : `عرض الكل (${list.length}) ←`}
          </button>
        )}
      </div>
      <div className={`${styles.grid} ${wide ? styles.wide : ''}`}>
        {displayed.map((anime, i) => (
          <AnimeCard key={anime.id} anime={anime} rank={ranked ? i + 1 : undefined} />
        ))}
      </div>
      {showAll && list.length > DEFAULT_COUNT && (
        <div className={styles.collapseWrap}>
          <button className={styles.collapseBtn} onClick={() => setShowAll(false)}>↑ عرض أقل</button>
        </div>
      )}
    </section>
  );
}
