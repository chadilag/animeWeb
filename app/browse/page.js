'use client';
import { useState, useEffect } from 'react';
import AnimeCard from '@/components/AnimeCard';
import { apiBrowse } from '@/lib/api';
import styles from './page.module.css';

const GENRES = [
  { val: 'الكل',          ar: 'الكل' },
  { val: 'Action',        ar: 'أكشن' },
  { val: 'Adventure',     ar: 'مغامرة' },
  { val: 'Comedy',        ar: 'كوميدي' },
  { val: 'Drama',         ar: 'دراما' },
  { val: 'Fantasy',       ar: 'فانتازيا' },
  { val: 'Horror',        ar: 'رعب' },
  { val: 'Mecha',         ar: 'ميكا' },
  { val: 'Mystery',       ar: 'غموض' },
  { val: 'Romance',       ar: 'رومانسي' },
  { val: 'Sci-Fi',        ar: 'خيال علمي' },
  { val: 'Slice of Life', ar: 'شريحة من الحياة' },
  { val: 'Sports',        ar: 'رياضي' },
  { val: 'Supernatural',  ar: 'خيال خارق' },
  { val: 'Thriller',      ar: 'إثارة' },
  { val: 'Psychological', ar: 'نفسي' },
  { val: 'Music',         ar: 'موسيقي' },
  { val: 'Ecchi',         ar: 'إيتشي' },
  { val: 'Harem',         ar: 'هاريم' },
  { val: 'Mahou Shoujo',  ar: 'ماهو شوجو' },
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
    try {
      const result = await apiBrowse({ genre: g, sort: s, page: p });
      setHasMore(result.hasNextPage);
      setList(prev => append ? [...prev, ...result.media] : result.media);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { setPage(1); fetchData(genre, sort, 1, false); }, [genre, sort]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchData(genre, sort, next, true); };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>تصفح الأنمي</h1>
        {!loading && list.length > 0 && <span className={styles.resultCount}>{list.length} نتيجة</span>}
      </div>

      <div className={styles.filterBar}>
        {GENRES.map(g => (
          <button key={g.val} className={`${styles.fBtn} ${genre === g.val ? styles.active : ''}`} onClick={() => setGenre(g.val)}>
            {g.ar}
          </button>
        ))}
      </div>

      <div className={styles.sortBar}>
        <span className={styles.sortLabel}>ترتيب حسب:</span>
        {SORTS.map(s => (
          <button key={s.val} className={`${styles.sortBtn} ${sort === s.val ? styles.active : ''}`} onClick={() => setSort(s.val)}>
            {s.ar}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading && list.length === 0 ? (
          <div className={styles.grid}>
            {Array.from({ length: 24 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
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
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className={styles.loadMore} onClick={loadMore}>⬇ تحميل المزيد</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
