'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getTotalCount } from '@/lib/watchlist';
import styles from './Sidebar.module.css';

const NAV_LINKS = [
  { href: '/',         icon: '🏠', label: 'الرئيسية' },
  { href: '/browse',   icon: '🗂', label: 'تصفح' },
  { href: '/schedule', icon: '📅', label: 'جدول البث' },
  { href: '/top',      icon: '👑', label: 'الأعلى تقييماً' },
];

const USER_LINKS = [
  { href: '/watchlist', icon: '🎌', label: 'قائمتي', highlight: true },
  { href: '/history',   icon: '🕐', label: 'السجل' },
  { href: '/stats',     icon: '📊', label: 'إحصائياتي' },
];

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [watchCount, setWatchCount] = useState(0);
  // افتراضي: مفتوح دائماً — يتذكر اختيار المستخدم
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [noAnim, setNoAnim]         = useState(true); // يمنع الانيميشن عند أول تحميل

  // تحميل الحالة المحفوظة بعد الـ hydration
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
    // نفعّل الانيميشن بعد أن يستقر الـ state الأولي
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoAnim(false));
    });
  }, []);

  // حفظ الحالة عند كل تغيير
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('sidebar-collapsed', String(collapsed));
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '64px' : '220px');
  }, [collapsed, mounted]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', '220px');
  }, []);

  useEffect(() => {
    const update = () => setWatchCount(getTotalCount());
    update();
    window.addEventListener('watchlist-updated', update);
    return () => window.removeEventListener('watchlist-updated', update);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = () => setMobileOpen(p => !p);
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  const navigate = (href) => { router.push(href); setMobileOpen(false); };

  const surprise = async () => {
    try {
      const query = `query { Page(page: 1, perPage: 50) { media(type: ANIME, sort: POPULARITY_DESC, status: FINISHED, averageScore_greater: 70) { id } } }`;
      const res   = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const list = data?.data?.Page?.media || [];
      if (list.length > 0) navigate(`/anime/${list[Math.floor(Math.random() * list.length)].id}`);
    } catch(e) { console.error(e); }
  };

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''} ${noAnim ? styles.noAnim : ''}`}>

        <div className={styles.topRow}>
          <button className={styles.collapseBtn}
            onClick={() => setCollapsed(p => !p)}
            title={collapsed ? 'توسيع' : 'تصغير'}>
            {collapsed ? '‹' : '›'}
          </button>
        </div>

        <div className={styles.section}>
          {!collapsed && <div className={styles.sectionLabel}>القائمة</div>}
          {NAV_LINKS.map(l => (
            <button key={l.href} onClick={() => navigate(l.href)}
              className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
              title={collapsed ? l.label : ''}>
              <span className={styles.icon}>{l.icon}</span>
              {!collapsed && <span className={styles.label}>{l.label}</span>}
              {pathname === l.href && <span className={styles.activeBar} />}
            </button>
          ))}
        </div>

        <button className={styles.surpriseBtn} onClick={surprise} title="أنمي عشوائي">
          <span className={styles.icon}>🎲</span>
          {!collapsed && <span className={styles.label}>فاجئني!</span>}
        </button>

        <div className={styles.divider} />

        <div className={styles.section}>
          {!collapsed && <div className={styles.sectionLabel}>حسابي</div>}
          {USER_LINKS.map(l => (
            <button key={l.href} onClick={() => navigate(l.href)}
              className={`${styles.link} ${pathname === l.href ? styles.active : ''} ${l.highlight ? styles.highlightLink : ''}`}
              title={collapsed ? l.label : ''}>
              <span className={styles.icon}>{l.icon}</span>
              {!collapsed && (
                <span className={styles.label}>
                  {l.href === '/watchlist' && watchCount > 0 ? `${l.label} (${watchCount})` : l.label}
                </span>
              )}
              {collapsed && l.href === '/watchlist' && watchCount > 0 && (
                <span className={styles.badge}>{watchCount}</span>
              )}
              {pathname === l.href && <span className={styles.activeBar} />}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
