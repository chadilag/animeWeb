'use client';
import { useEffect, useState } from 'react';
import { getWatchlist, LIST_TYPES } from '@/lib/watchlist';
import styles from './page.module.css';

const GENRE_AR = {
  'Action':'أكشن','Adventure':'مغامرة','Comedy':'كوميدي','Drama':'دراما',
  'Fantasy':'فانتازيا','Horror':'رعب','Mecha':'ميكا','Mystery':'غموض',
  'Romance':'رومانسي','Sci-Fi':'خيال علمي','Slice of Life':'يومي',
  'Sports':'رياضي','Supernatural':'خيال خارق','Thriller':'إثارة',
  'Psychological':'نفسي','Music':'موسيقي','Ecchi':'إيتشي',
  'Action & Adventure':'أكشن ومغامرة','Shounen':'شونن','Seinen':'سينن',
  'Shoujo':'شوجو','Isekai':'إيسيكاي','Harem':'هاريم',
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const wl = getWatchlist();
    const all = Object.values(wl).flat();
    if (all.length === 0) { setStats(null); return; }

    // توزيع القوائم
    const byStatus = {};
    Object.entries(LIST_TYPES).forEach(([key, val]) => {
      byStatus[key] = { ...val, count: wl[key]?.length || 0 };
    });

    // التصنيفات — بالعربي
    const genreCount = {};
    all.forEach(a => {
      (a.genres || []).forEach(g => {
        const arLabel = GENRE_AR[g] || g;
        genreCount[arLabel] = (genreCount[arLabel] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // إجمالي الحلقات — من كل القوائم (ليس فقط المنتهية)
    const completed = wl['completed'] || [];
    const watching  = wl['watching']  || [];
    const totalEps  = [...completed, ...watching].reduce((s, a) => s + (a.episodes || 0), 0);

    // متوسط التقييم
    const scored = all.filter(a => a.averageScore);
    const avgScore = scored.length
      ? (scored.reduce((s, a) => s + a.averageScore, 0) / scored.length / 10).toFixed(1)
      : null;

    // أعلى تقييماً
    const topAnime = [...all].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0)).slice(0, 3);

    // ساعات المشاهدة (متوسط 23 دقيقة للحلقة)
    const watchHours = Math.round(totalEps * 23 / 60);

    setStats({ byStatus, topGenres, totalEps, avgScore, total: all.length, topAnime, watchHours });
  }, []);

  if (!stats) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📊</div>
        <h1>إحصائياتك</h1>
        <p>لا توجد بيانات بعد — أضف أنمي لقائمتك أولاً</p>
      </div>
    );
  }

  const maxGenre = stats.topGenres[0]?.[1] || 1;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>📊 إحصائياتك</h1>

      {/* ملخص */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNum}>{stats.total}</div>
          <div className={styles.summaryLabel}>إجمالي الأنميات</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNum}>{stats.totalEps || '—'}</div>
          <div className={styles.summaryLabel}>حلقة (المنتهية + الجارية)</div>
        </div>
        {stats.avgScore && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryNum} style={{ color: '#ffd700' }}>⭐ {stats.avgScore}</div>
            <div className={styles.summaryLabel}>متوسط التقييم</div>
          </div>
        )}
        <div className={styles.summaryCard}>
          <div className={styles.summaryNum}>{stats.watchHours}</div>
          <div className={styles.summaryLabel}>ساعة مشاهدة تقريباً</div>
        </div>
      </div>

      {/* توزيع القوائم */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>توزيع القوائم</h2>
        <div className={styles.statusGrid}>
          {Object.entries(stats.byStatus).map(([key, val]) => (
            <div key={key} className={styles.statusCard} style={{ borderColor: val.color + '55' }}>
              <div className={styles.statusIcon}>{val.icon}</div>
              <div className={styles.statusCount} style={{ color: val.color }}>{val.count}</div>
              <div className={styles.statusLabel}>{val.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* التصنيفات المفضلة */}
      {stats.topGenres.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>التصنيفات المفضلة</h2>
          <div className={styles.genreList}>
            {stats.topGenres.map(([genre, count]) => (
              <div key={genre} className={styles.genreRow}>
                <div className={styles.genreName}>{genre}</div>
                <div className={styles.genreBarWrap}>
                  <div className={styles.genreBar} style={{ width: `${(count / maxGenre) * 100}%` }} />
                </div>
                <div className={styles.genreCount}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* الأعلى تقييماً */}
      {stats.topAnime.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>الأعلى تقييماً في قائمتك</h2>
          <div className={styles.topList}>
            {stats.topAnime.map((a, i) => {
              const img = a.coverImage?.large || a.coverImage?.extraLarge;
              const title = a.title?.english || a.title?.romaji;
              return (
                <div key={a.id} className={styles.topItem}>
                  <div className={styles.topRank}>#{i + 1}</div>
                  {img && <img src={img} alt={title} className={styles.topImg} />}
                  <div className={styles.topInfo}>
                    <div className={styles.topTitle}>{title}</div>
                    <div className={styles.topScore}>⭐ {(a.averageScore / 10).toFixed(1)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
