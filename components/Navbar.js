'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  return (
    <nav className={styles.nav}>
      {/* زر موبايل */}
      <button className={styles.menuBtn} onClick={toggleSidebar}>☰</button>

      {/* اللوغو */}
      <div className={styles.logo} onClick={() => router.push('/')}>
        <span className={styles.logoIcon}>⛩</span>
        <span className={styles.logoText}>أنمي ستريم</span>
      </div>

      {/* البحث */}
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
