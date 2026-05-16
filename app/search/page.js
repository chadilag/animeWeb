'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AnimeCard from '@/components/AnimeCard';
import styles from './page.module.css';

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror',
  'Mecha','Mystery','Romance','Sci-Fi','Slice of Life',
  'Sports','Supernatural','Thriller','Psychological','Music','Ecchi',
];
const GENRE_AR = {
  'Action':'أكشن','Adventure':'مغامرة','Comedy':'كوميدي','Drama':'دراما',
  'Fantasy':'فانتازيا','Horror':'رعب','Mecha':'ميكا','Mystery':'غموض',
  'Romance':'رومانسي','Sci-Fi':'خيال علمي','Slice of Life':'يومي',
  'Sports':'رياضي','Supernatural':'خيال خارق','Thriller':'إثارة',
  'Psychological':'نفسي','Music':'موسيقي','Ecchi':'إيتشي',
};
const SORTS = [
  { val: 'SCORE_DESC', ar: 'الأعلى تقييماً' },
  { val: 'POPULARITY_DESC', ar: 'الأكثر شعبية' },
  { val: 'TRENDING_DESC', ar: 'الأكثر رواجاً' },
  { val: 'START_DATE_DESC', ar: 'الأحدث' },
];
const STATUSES = [
  { val: '', ar: 'الكل' },
  { val: 'RELEASING', ar: 'يُبَث الآن' },
  { val: 'FINISHED', ar: 'منتهي' },
  { val: 'NOT_YET_RELEASED', ar: 'قريباً' },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => currentYear - i);

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('SCORE_DESC');
  const [status, setStatus] = useState('');
  const [year, setYear] = useState('');
  const [minScore, setMinScore] = useState(0);

  const search = useCallback(() => {
    if (!q && !genre && !year) { setDone(false); setResults([]); return; }
    setLoading(true); setDone(false); setResults([]);

    const gqlQuery = `
      query($search: String, $genre: String, $sort: [MediaSort], $status: MediaStatus, $year: Int, $score: Int) {
        Page(perPage: 40) {
          media(search: $search, type: ANIME, genre: $genre, sort: $sort, status: $status, seasonYear: $year, averageScore_greater: $score) {
            id title { romaji english }
            coverImage { extraLarge large color }
            genres episodes status averageScore season seasonYear
          }
        }
      }`;

    const variables = { sort: [sort] };
    if (q) variables.search = q;
    if (genre) variables.genre = genre;
    if (status) variables.status = status;
    if (year) variables.year = parseInt(year);
    if (minScore > 0) variables.score = minScore * 10;

    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gqlQuery, variables }),
    })
      .then(r => r.json())
      .then(d => { setResults(d?.data?.Page?.media || []); setLoading(false); setDone(true); })
      .catch(() => { setLoading(false); setDone(true); });
  }, [q, genre, sort, status, year, minScore]);

  useEffect(() => { search(); }, [search]);

  const resetFilters = () => { setGenre(''); setSort('SCORE_DESC'); setStatus(''); setYear(''); setMinScore(0); };
  const hasFilters = genre || status || year || minScore > 0 || sort !== 'SCORE_DESC';

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.headTop}>
          {q ? <h1>نتائج: <span className={styles.q}>"{q}"</span></h1> : <h1>🔍 البحث المتقدم</h1>}
          {done && <p className={styles.count}>{results.length} نتيجة</p>}
        </div>

        <div className={styles.filterToggleRow}>
          <button
            className={`${styles.filterToggleBtn} ${showFilters ? styles.filterToggleActive : ''}`}
            onClick={() => setShowFilters(p => !p)}
          >
            ⚙️ فلاتر متقدمة {hasFilters && <span className={styles.filterDot} />}
          </button>
          {hasFilters && <button className={styles.resetBtn} onClick={resetFilters}>✕ إعادة تعيين</button>}
        </div>

        {showFilters && (
          <div className={styles.filtersPanel}>
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>ترتيب حسب</div>
              <div className={styles.filterRow}>
                {SORTS.map(s => (
                  <button key={s.val} className={`${styles.pill} ${sort === s.val ? styles.pillActive : ''}`} onClick={() => setSort(s.val)}>{s.ar}</button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>الحالة</div>
              <div className={styles.filterRow}>
                {STATUSES.map(s => (
                  <button key={s.val} className={`${styles.pill} ${status === s.val ? styles.pillActive : ''}`} onClick={() => setStatus(s.val)}>{s.ar}</button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>التصنيف</div>
              <div className={styles.filterRow}>
                <button className={`${styles.pill} ${genre === '' ? styles.pillActive : ''}`} onClick={() => setGenre('')}>الكل</button>
                {GENRES.map(g => (
                  <button key={g} className={`${styles.pill} ${genre === g ? styles.pillActive : ''}`} onClick={() => setGenre(genre === g ? '' : g)}>{GENRE_AR[g] || g}</button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>السنة</div>
              <div className={styles.filterRow}>
                <button className={`${styles.pill} ${year === '' ? styles.pillActive : ''}`} onClick={() => setYear('')}>الكل</button>
                {YEARS.map(y => (
                  <button key={y} className={`${styles.pill} ${year === String(y) ? styles.pillActive : ''}`} onClick={() => setYear(year === String(y) ? '' : String(y))}>{y}</button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>
                الحد الأدنى للتقييم: <span className={styles.scoreVal}>{minScore > 0 ? `${minScore}+` : 'الكل'}</span>
              </div>
              <input type="range" min={0} max={9} step={1} value={minScore} onChange={e => setMinScore(Number(e.target.value))} className={styles.slider} />
              <div className={styles.sliderLabels}>
                {['الكل','1','2','3','4','5','6','7','8','9'].map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.grid}>{Array.from({ length: 12 }).map((_, i) => <div key={i} className={styles.skel} />)}</div>}
        {done && results.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>لا توجد نتائج</p>
            <p className={styles.emptySub}>جرب تغيير الفلاتر</p>
          </div>
        )}
        {results.length > 0 && (
          <div className={styles.grid}>{results.map(a => <AnimeCard key={a.id} anime={a} />)}</div>
        )}
      </div>
    </div>
  );
}
