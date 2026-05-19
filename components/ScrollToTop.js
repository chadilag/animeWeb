'use client';
import { useState, useEffect } from 'react';
import styles from './ScrollToTop.module.css';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  if (!visible) return null;

  return (
    <button
      className={styles.btn}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="العودة للأعلى"
    >
      ↑
    </button>
  );
}
