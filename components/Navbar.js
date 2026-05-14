'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const links = [
    { href: '/', label: 'الرئيسية' },
    { href: '/browse', label: 'تصفح' },
    { href: '/top', label: 'الأعلى تقييماً' },
  ];

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.logo} onClick={() => router.push('/')}>⛩ أنمي ستريم</div>

      <div className={styles.links}>
        {links.map(l => (
          <button
            key={l.href}
            onClick={() => router.push(l.href)}
            className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="ابحث عن أنمي..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className={styles.searchInput}
        />
      </form>
    </nav>
  );
}
