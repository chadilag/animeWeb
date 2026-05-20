'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTitle } from '@/lib/anilist';
import { getEmbedSources, getAnikotoSource } from '@/lib/episodes';
import styles from './WatchPage.module.css';

// ── مستمع لأحداث المشغّل (auto-next, progress) ───────────────────────────────
function usePlayerEvents(onComplete, onProgress) {
  useEffect(() => {
    const handler = (event) => {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data) return;

      // VidNest / MegaPlay events
      if (data.event === 'complete') onComplete?.();
      if (data.event === 'time') onProgress?.(data.percent);
      if (data.type === 'watching-log') {
        const pct = data.currentTime / data.duration;
        onProgress?.(pct);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onComplete, onProgress]);
}

export default function WatchPage({ anime, episodes, currentEp, initialSources, anilistId, malId }) {
  const router    = useRouter();
  const iframeRef = useRef(null);

  const [sources, setSources]     = useState(initialSources);
  const [srcIdx, setSrcIdx]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [failed, setFailed]       = useState(false);
  const [epFilter, setEpFilter]   = useState('');
  const [showEps, setShowEps]     = useState(true);
  const [progress, setProgress]   = useState(0);
  const [autoNext, setAutoNext]   = useState(true);

  const title      = getTitle(anime);
  const totalEps   = anime.episodes || episodes.length;
  const epData     = episodes.find(e => e.number === currentEp);
  const prevEp     = currentEp > 1 ? currentEp - 1 : null;
  const nextEp     = currentEp < totalEps ? currentEp + 1 : null;
  const currentSrc = sources[srcIdx];
  const filteredEps = epFilter
    ? episodes.filter(e => String(e.number).includes(epFilter) || e.title?.includes(epFilter))
    : episodes;

  // ── حفظ المشاهدة في localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('watchHistory') || '{}');
      h[anilistId] = { ep: currentEp, title, updatedAt: Date.now() };
      localStorage.setItem('watchHistory', JSON.stringify(h));
    } catch {}
  }, [anilistId, currentEp, title]);

  // ── إضافة مصدر Anikoto في الخلفية (أكثر ضماناً) ──────────────────────────
  useEffect(() => {
    if (!malId) return;
    getAnikotoSource(malId, currentEp).then(src => {
      if (src) setSources(prev => [src, ...prev.filter(s => s.provider !== 'anikoto')]);
    });
  }, [malId, currentEp]);

  // ── إعادة ضبط عند تغيير الحلقة ──────────────────────────────────────────
  useEffect(() => {
    setSrcIdx(0);
    setLoading(true);
    setFailed(false);
    setProgress(0);
    setSources(getEmbedSources(anilistId, malId, currentEp));
  }, [currentEp, anilistId, malId]);

  // ── الانتقال للحلقة التالية تلقائياً ────────────────────────────────────
  const handleComplete = useCallback(() => {
    if (autoNext && nextEp) {
      setTimeout(() => router.push(`/anime/${anilistId}/watch/${nextEp}`), 1500);
    }
  }, [autoNext, nextEp, anilistId, router]);

  const handleProgress = useCallback((pct) => setProgress(pct * 100), []);

  usePlayerEvents(handleComplete, handleProgress);

  // ── تغيير المصدر تلقائياً عند الفشل ────────────────────────────────────
  const handleSrcFail = useCallback(() => {
    if (srcIdx + 1 < sources.length) {
      setSrcIdx(i => i + 1);
      setLoading(true);
    } else {
      setFailed(true);
      setLoading(false);
    }
  }, [srcIdx, sources.length]);

  const goToEp = (n) => router.push(`/anime/${anilistId}/watch/${n}`);

  return (
    <div className={styles.page}>

      {/* ── PLAYER SECTION ────────────────────────────────────────────────── */}
      <div className={styles.playerSection}>

        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href={`/anime/${anilistId}`} className={styles.breadLink}>{title}</Link>
          <span className={styles.sep}>›</span>
          <span>الحلقة {currentEp}</span>
          {epData?.title && epData.title !== `الحلقة ${currentEp}` && (
            <span className={styles.epName}> — {epData.title}</span>
          )}
        </div>

        {/* المشغّل */}
        <div className={styles.playerWrap}>
          {loading && !failed && (
            <div className={styles.loadOverlay}>
              <div className={styles.spinner} />
              <p>جارٍ تحميل الحلقة...</p>
              {srcIdx > 0 && <p className={styles.tryingNext}>جارٍ تجربة المصدر {srcIdx + 1}...</p>}
            </div>
          )}

          {failed ? (
            <div className={styles.failBox}>
              <div className={styles.failIcon}>📡</div>
              <p className={styles.failTitle}>تعذّر تحميل الحلقة من جميع المصادر</p>
              <p className={styles.failSub}>قد تكون الحلقة غير متوفرة حالياً</p>
              <div className={styles.failBtns}>
                <button className={styles.retryBtn}
                  onClick={() => { setSrcIdx(0); setFailed(false); setLoading(true); }}>
                  🔄 إعادة المحاولة
                </button>
                {nextEp && (
                  <button className={styles.skipBtn} onClick={() => goToEp(nextEp)}>
                    التالية ›
                  </button>
                )}
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={`${srcIdx}-${currentEp}`}
              src={currentSrc?.url}
              className={styles.iframe}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={handleSrcFail}
              title={`${title} - حلقة ${currentEp}`}
            />
          )}

          {/* شريط التقدم */}
          {progress > 0 && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* المصادر */}
        <div className={styles.sourcesRow}>
          <span className={styles.srcLabel}>🎬 المصدر:</span>
          <div className={styles.srcBtns}>
            {sources.map((src, i) => (
              <button key={i}
                className={`${styles.srcBtn} ${i === srcIdx ? styles.srcActive : ''}`}
                onClick={() => { setSrcIdx(i); setLoading(true); setFailed(false); }}
                title={src.url}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className={styles.controls}>
          <div className={styles.navRow}>
            {prevEp
              ? <button className={styles.navBtn} onClick={() => goToEp(prevEp)}>‹ الحلقة {prevEp}</button>
              : <div />}

            <Link href={`/anime/${anilistId}`} className={styles.detailBtn}>📋 صفحة الأنمي</Link>

            {nextEp
              ? <button className={styles.navBtn} onClick={() => goToEp(nextEp)}>الحلقة {nextEp} ›</button>
              : <div />}
          </div>

          {/* Auto-next toggle */}
          <div className={styles.autoNextRow}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={autoNext} onChange={e => setAutoNext(e.target.checked)} />
              <span className={styles.toggleSlider} />
              <span className={styles.toggleLabel}>التشغيل التلقائي للحلقة التالية</span>
            </label>
          </div>
        </div>

        {/* ملاحظة */}
        <div className={styles.notice}>
          ⚠️ إذا لم يعمل المصدر الحالي سيتم الانتقال تلقائياً للمصدر التالي — يمكنك أيضاً التبديل يدوياً
        </div>
      </div>

      {/* ── SIDEBAR قائمة الحلقات ─────────────────────────────────────────── */}
      <div className={`${styles.sidebar} ${showEps ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHead}>
          <h3>الحلقات ({totalEps})</h3>
          <button className={styles.closeEps} onClick={() => setShowEps(p => !p)}>
            {showEps ? '✕' : '☰'}
          </button>
        </div>

        <input
          className={styles.epSearch}
          placeholder="ابحث..."
          value={epFilter}
          onChange={e => setEpFilter(e.target.value)}
        />

        <div className={styles.epList}>
          {filteredEps.map(ep => (
            <button key={ep.number}
              className={`${styles.epItem}
                ${ep.number === currentEp ? styles.epActive : ''}
                ${ep.filler ? styles.epFiller : ''}`}
              onClick={() => goToEp(ep.number)}
            >
              <span className={styles.epNum}>{ep.number}</span>
              <div className={styles.epMeta}>
                <span className={styles.epTitle}>
                  {ep.title !== `الحلقة ${ep.number}` ? ep.title : `الحلقة ${ep.number}`}
                </span>
                <div className={styles.epTags}>
                  {ep.filler && <span className={styles.tagFiller}>Filler</span>}
                  {ep.recap  && <span className={styles.tagRecap}>Recap</span>}
                </div>
              </div>
              {ep.number === currentEp && <span className={styles.playIcon}>▶</span>}
            </button>
          ))}
          {filteredEps.length === 0 && (
            <div className={styles.noRes}>لا توجد نتائج</div>
          )}
        </div>
      </div>

      {/* زر موبايل */}
      <button className={styles.mobileBtn} onClick={() => setShowEps(p => !p)}>
        {showEps ? '✕ إخفاء' : '☰ الحلقات'}
      </button>
    </div>
  );
}
