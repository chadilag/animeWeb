'use client';
import { useState, useEffect } from 'react';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

const GENRES = [
  { val: 'الكل',       ar: 'الكل' },
  { val: 'Action',     ar: 'أكشن' },
  { val: 'Adventure',  ar: 'مغامرة' },
  { val: 'Comedy',     ar: 'كوميدي' },
  { val: 'Drama',      ar: 'دراما' },
  { val: 'Fantasy',    ar: 'فانتازيا' },
  { val: 'Horror',     ar: 'رعب' },
  { val: 'Mecha',      ar: 'ميكا' },
  { val: 'Mystery',    ar: 'غموض' },
  { val: 'Romance',    ar: 'رومانسي' },
  { val: 'Sci-Fi',     ar: 'خيال علمي' },
  { val: 'Slice of Life', ar: 'يومي' },
  { val: 'Sports',     ar: 'رياضي' },
  { val: 'Supernatural', ar: 'خيال خارق' },
  { val: 'Thriller',   ar: 'إثارة' },
  { val: 'Psychological', ar: 'نفسي' },
  { val: 'Music',      ar: 'موسيقي' },
  { val: 'Ecchi',      ar: 'إيتشي' },
  { val: 'Harem',      ar: 'هاريم' },
  { val: 'Mahou Shoujo', ar: 'ماهو شوجو' },
];

const SORTS = [
  { val: 'SCORE_DESC',      ar: 'الأعلى تقييماً' },
  { val: 'POPULARITY_DESC', ar: 'الأكثر شعبية' },
  { val: 'TRENDING_DESC',   ar: 'الأكثر رواجاً' },
  { val: 'START_DATE_DESC', ar: 'الأحدث' },
];

export default function BrowsePage() {
  const [genre, setGenre] = useState('الكل');
  const [sort, setSort] = useState('SCORE_DESC');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchData = async (g, s, p, append = false) => {
    setLoading(true);
    const query = `
      query($genre: String, $sort: [MediaSort], $page: Int) {
        Page(page: $page, perPage: 24) {
          pageInfo { hasNextPage }
          media(type: ANIME, genre: $genre, sort: $sort, status_not: NOT_YET_RELEASED) {
            id title { romaji english }
            coverImage { extraLarge large color }
            genres episodes status averageScore season seasonYear
          }
        }
      }`;
    const variables = { sort: [s], page: p };
    if (g !== 'الكل') variables.genre = g;

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      setHasMore(data?.data?.Page?.pageInfo?.hasNextPage || false);
      setList(prev => append ? [...prev, ...media] : media);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchData(genre, sort, 1, false);
  }, [genre, sort]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchData(genre, sort, next, true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>تصفح الأنمي</h1>
        {!loading && list.length > 0 && (
          <span className={styles.resultCount}>{list.length} نتيجة</span>
        )}
      </div>

      {/* GENRE FILTER */}
      <div className={styles.filterBar}>
        {GENRES.map(g => (
          <button
            key={g.val}
            className={`${styles.fBtn} ${genre === g.val ? styles.active : ''}`}
            onClick={() => setGenre(g.val)}
          >
            {g.ar}
          </button>
        ))}
      </div>

      {/* SORT */}
      <div className={styles.sortBar}>
        <span className={styles.sortLabel}>ترتيب حسب:</span>
        {SORTS.map(s => (
          <button
            key={s.val}
            className={`${styles.sortBtn} ${sort === s.val ? styles.active : ''}`}
            onClick={() => setSort(s.val)}
          >
            {s.ar}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className={styles.content}>
        {loading && list.length === 0 ? (
          <div className={styles.grid}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>لا توجد نتائج لهذا التصنيف</p>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {list.map(a => <AnimeCard key={a.id} anime={a} />)}
            </div>
            {loading && (
              <div className={styles.grid} style={{ marginTop: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} />
                ))}
              </div>
            )}
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className={styles.loadMore} onClick={loadMore}>
                  ⬇ تحميل المزيد
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
