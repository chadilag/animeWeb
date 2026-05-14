'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true); setDone(false); setResults([]);
    const query = `
      query($search: String) {
        Page(perPage: 30) {
          media(search: $search, type: ANIME) {
            id title { romaji english arabic }
            coverImage { extraLarge large color }
            genres episodes status averageScore season seasonYear
          }
        }
      }`;
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: q } }),
    })
      .then(r => r.json())
      .then(d => {
        setResults(d?.data?.Page?.media || []);
        setLoading(false); setDone(true);
      })
      .catch(() => { setLoading(false); setDone(true); });
  }, [q]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>نتائج البحث عن: <span className={styles.q}>"{q}"</span></h1>
        {done && <p className={styles.count}>{results.length} نتيجة</p>}
      </div>
      <div className={styles.content}>
        {loading && (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className={styles.skel} />)}
          </div>
        )}
        {done && results.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>لا توجد نتائج لـ "{q}"</p>
          </div>
        )}
        {results.length > 0 && (
          <div className={styles.grid}>
            {results.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
