'use client';
import { useState, useEffect } from 'react';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

const GENRES = [
  'الكل','Action','Adventure','Comedy','Drama','Fantasy',
  'Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports',
  'Supernatural','Thriller','Psychological','Historical','Music',
];

const GENRE_AR = {
  'الكل':'الكل','Action':'أكشن','Adventure':'مغامرة','Comedy':'كوميدي',
  'Drama':'دراما','Fantasy':'فانتازيا','Horror':'رعب','Mystery':'غموض',
  'Romance':'رومانسي','Sci-Fi':'خيال علمي','Slice of Life':'يومي',
  'Sports':'رياضي','Supernatural':'خيال خارق','Thriller':'إثارة',
  'Psychological':'نفسي','Historical':'تاريخي','Music':'موسيقي',
};

const SORTS = [
  { val: 'SCORE_DESC', ar: 'الأعلى تقييماً' },
  { val: 'POPULARITY_DESC', ar: 'الأكثر شعبية' },
  { val: 'TRENDING_DESC', ar: 'الأكثر رواجاً' },
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
            id title { romaji english arabic }
            coverImage { extraLarge large color }
            genres episodes status averageScore season seasonYear
          }
        }
      }`;
    const variables = { sort: [s], page: p };
    if (g !== 'الكل') variables.genre = g;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    const media = data?.data?.Page?.media || [];
    setHasMore(data?.data?.Page?.pageInfo?.hasNextPage || false);
    setList(prev => append ? [...prev, ...media] : media);
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
      </div>

      {/* GENRE FILTER */}
      <div className={styles.filterBar}>
        {GENRES.map(g => (
          <button
            key={g}
            className={`${styles.fBtn} ${genre === g ? styles.active : ''}`}
            onClick={() => setGenre(g)}
          >
            {GENRE_AR[g] || g}
          </button>
        ))}
      </div>

      {/* SORT */}
      <div className={styles.sortBar}>
        <span style={{ color: 'var(--sub)', fontSize: 13 }}>ترتيب حسب:</span>
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
        ) : (
          <>
            <div className={styles.grid}>
              {list.map(a => <AnimeCard key={a.id} anime={a} />)}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button className={styles.loadMore} onClick={loadMore} disabled={loading}>
                  {loading ? '⏳ تحميل...' : '⬇ تحميل المزيد'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
