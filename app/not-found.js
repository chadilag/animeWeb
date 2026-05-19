import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.code}>404</div>
      <div className={styles.emoji}>⛩</div>
      <h1 className={styles.title}>الصفحة غير موجودة</h1>
      <p className={styles.sub}>يبدو أن هذه الصفحة اختفت مثل أنمي انتهى فجأة...</p>
      <Link href="/" className={styles.btn}>← العودة للرئيسية</Link>
    </div>
  );
}
