'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function SchedulePage() {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().getDay());

  useEffect(() => {
    const query = `
      query {
        Page(perPage: 50) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
            id title { romaji english }
            coverImage { large medium color }
            nextAiringEpisode { episode timeUntilAiring airingAt }
            averageScore genres
          }
        }
      }`;

    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then(r => r.json())
      .then(d => {
        const media = d?.data?.Page?.media || [];
        const grouped = {};
        for (let i = 0; i < 7; i++) grouped[i] = [];
        media.forEach(anime => {
          if (!anime.nextAiringEpisode) return;
          const date = new Date(anime.nextAiringEpisode.airingAt * 1000);
          grouped[date.getDay()].push({ ...anime, airingDate: date });
        });
        Object.keys(grouped).forEach(d => {
          grouped[d].sort((a, b) => a.airingDate - b.airingDate);
        });
        setSchedule(grouped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const todayIdx = new Date().getDay();

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>📅 جدول البث الأسبوعي</h1>
        <p className={styles.sub}>مواعيد بث الأنميات الجارية هذا الأسبوع</p>
      </div>

      {/* DAYS TABS */}
      <div className={styles.tabs}>
        {DAYS_AR.map((day, i) => (
          <button
            key={i}
            className={`${styles.tab} ${activeDay === i ? styles.tabActive : ''}`}
            onClick={() => setActiveDay(i)}
          >
            <span className={styles.dayName}>{day}</span>
            {i === todayIdx && <span className={styles.todayBadge}>اليوم</span>}
            {schedule[i]?.length > 0 && (
              <span className={styles.count}>{schedule[i].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className={styles.skels}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skel} />)}
        </div>
      ) : (schedule[activeDay] || []).length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📭</div>
          <p>لا يوجد بث هذا اليوم</p>
        </div>
      ) : (
        <div className={styles.list}>
          {(schedule[activeDay] || []).map((anime, idx) => {
            const title = anime.title?.english || anime.title?.romaji;
            const img = anime.coverImage?.large || anime.coverImage?.medium;
            const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
            return (
              <Link key={anime.id} href={`/anime/${anime.id}`} className={styles.item}>
                <div className={styles.indexNum}>{idx + 1}</div>

                <div className={styles.timeCol}>
                  <span className={styles.time}>{formatTime(anime.airingDate)}</span>
                </div>

                <div className={styles.divider} />

                <div className={styles.imgWrap}>
                  {img
                    ? <img src={img} alt={title} className={styles.thumb} />
                    : <div className={styles.thumbPh} style={{ background: anime.coverImage?.color || 'var(--card2)' }} />}
                </div>

                <div className={styles.info}>
                  <div className={styles.title}>{title}</div>
                  <div className={styles.meta}>
                    <span className={styles.ep}>الحلقة {anime.nextAiringEpisode.episode}</span>
                    {score && <span className={styles.score}>⭐ {score}</span>}
                  </div>
                  <div className={styles.genres}>
                    {(anime.genres || []).slice(0, 3).map(g => (
                      <span key={g} className={styles.genre}>{g}</span>
                    ))}
                  </div>
                </div>

                <span className={styles.arrow}>←</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}