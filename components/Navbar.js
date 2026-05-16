'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getTotalCount } from '@/lib/watchlist';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [watchCount, setWatchCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const update = () => setWatchCount(getTotalCount());
    update();
    window.addEventListener('watchlist-updated', update);
    return () => window.removeEventListener('watchlist-updated', update);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); setMobileOpen(false); }
  };

  const navigate = (href) => { router.push(href); setMobileOpen(false); };

  const links = [
    { href: '/', label: 'الرئيسية' },
    { href: '/browse', label: 'تصفح' },
    { href: '/schedule', label: '📅 الجدول' },
    { href: '/top', label: 'الأعلى تقييماً' },
    { href: '/history', label: '🕐 السجل' },
    {
      href: '/watchlist',
      label: watchCount > 0 ? `🎌 قائمتي (${watchCount})` : '🎌 قائمتي',
      highlight: true,
    },
  ];

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.logo} onClick={() => navigate('/')}>⛩ أنمي ستريم</div>

        <div className={styles.links}>
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => navigate(l.href)}
              className={`${styles.link} ${pathname === l.href ? styles.active : ''} ${l.highlight ? styles.highlight : ''}`}
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

        {/* Mobile menu button */}
        <button className={styles.menuBtn} onClick={() => setMobileOpen(p => !p)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={styles.drawer}>
          <form className={styles.drawerSearch} onSubmit={handleSearch}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="ابحث عن أنمي..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className={styles.searchInput}
            />
          </form>
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => navigate(l.href)}
              className={`${styles.drawerLink} ${pathname === l.href ? styles.drawerActive : ''}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
