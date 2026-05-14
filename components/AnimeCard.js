import Link from 'next/link';
import { getTitle, STATUS_AR } from '@/lib/anilist';
import styles from './AnimeCard.module.css';

export default function AnimeCard({ anime, rank }) {
  const title = getTitle(anime);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const img = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const airing = anime.status === 'RELEASING';

  return (
    <Link href={`/anime/${anime.id}`} className={styles.card}>
      {rank && <div className={styles.rank}>#{rank}</div>}

      <div className={styles.imgWrap}>
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
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        <div className={styles.foot}>
          {score
            ? <span className={styles.score}>⭐ {score}</span>
            : <span />}
          <span className={`${styles.dot} ${!airing ? styles.dotOff : ''}`}
            title={STATUS_AR[anime.status]} />
        </div>
      </div>
    </Link>
  );
}
