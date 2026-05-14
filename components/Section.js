import AnimeCard from './AnimeCard';
import styles from './Section.module.css';

export default function Section({ title, list, ranked = false, wide = false, alt = false }) {
  return (
    <section className={`${styles.sec} ${alt ? styles.alt : ''}`}>
      <div className={styles.header}>
        <div className={styles.line} />
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={`${styles.grid} ${wide ? styles.wide : ''}`}>
        {list.map((anime, i) => (
          <AnimeCard key={anime.id} anime={anime} rank={ranked ? i + 1 : undefined} />
        ))}
      </div>
    </section>
  );
}
