'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTitle } from '@/lib/anilist';
import { getEmbedSources, getAnikotoSource, groupSourcesByLang } from '@/lib/episodes';
import { fetchSubtitleList, downloadSubtitle, parseSubtitle, getCurrentCue, translateCues, isArabic } from '@/lib/subtitles';
import styles from './WatchPage.module.css';

// ── هوك: استقبال أحداث المشغّل ───────────────────────────────────────────────
function usePlayerTime(onTime, onComplete) {
  useEffect(() => {
    const handler = (event) => {
      let d = event.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d) return;
      if (d.event === 'time' && d.time != null)         onTime?.(d.time);
      if (d.type === 'watching-log' && d.currentTime)   onTime?.(d.currentTime);
      if (d.event === 'complete')                        onComplete?.();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onTime, onComplete]);
}

// ── مكوّن الترجمة Overlay ─────────────────────────────────────────────────────
function SubtitleOverlay({ cues, currentTime, visible }) {
  const cue = getCurrentCue(cues, currentTime);
  if (!visible || !cue) return null;
  return (
    <div className={styles.subOverlay}>
      <div className={styles.subText} dir="auto">
        {cue.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );
}

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────────
export default function WatchPage({ anime, episodes, currentEp, initialSources, anilistId, malId }) {
  const router = useRouter();

  // مصادر البث
  const [sources, setSources]   = useState(initialSources);
  const [srcIdx, setSrcIdx]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [failed, setFailed]     = useState(false);
  const [langTab, setLangTab]   = useState('sub'); // 'sub' | 'dub'

  // الترجمة
  const [subList, setSubList]         = useState([]);
  const [subIdx, setSubIdx]           = useState(-1);
  const [cues, setCues]               = useState([]);
  const [subLoading, setSubLoading]   = useState(false);
  const [translateProgress, setTranslateProgress] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);

  // حلقات
  const [epFilter, setEpFilter] = useState('');
  const [showEps, setShowEps]   = useState(true);
  const [autoNext, setAutoNext] = useState(true);

  const title      = getTitle(anime);
  const totalEps   = anime.episodes || episodes.length;
  const epData     = episodes.find(e => e.number === currentEp);
  const prevEp     = currentEp > 1 ? currentEp - 1 : null;
  const nextEp     = currentEp < totalEps ? currentEp + 1 : null;

  // ── تصفية المصادر حسب اللغة ──────────────────────────────────────────────
  const grouped     = groupSourcesByLang(sources);
  const activeSrcs  = langTab === 'dub' && grouped.dub.length > 0 ? grouped.dub : grouped.sub;
  const currentSrc  = activeSrcs[srcIdx] || sources[0];
  const hasDub      = grouped.dub.length > 0;

  const filteredEps = epFilter
    ? episodes.filter(e => String(e.number).includes(epFilter) || e.title?.includes(epFilter))
    : episodes;

  // ── تحميل قائمة الترجمات ─────────────────────────────────────────────────
  useEffect(() => {
    if (!malId) return;
    setSubList([]); setSubIdx(-1); setCues([]);
    fetchSubtitleList(malId, currentEp).then(list => {
      setSubList(list);
      const arIdx = list.findIndex(s =>
        s.language === 'ar' || s.language === 'AR' ||
        s.language?.toLowerCase().includes('arab')
      );
      if (arIdx !== -1) setSubIdx(arIdx);
    });
  }, [malId, currentEp]);

  // ── تحميل ملف الترجمة ────────────────────────────────────────────────────
  useEffect(() => {
    if (subIdx === -1 || !subList[subIdx]) { setCues([]); return; }
    const sub = subList[subIdx];

    if (sub.source === 'auto-translate') {
      // ترجمة آلية: نحمّل الملف الإنجليزي الأصلي ثم نترجمه سطر بسطر
      setSubLoading(true);
      setTranslateProgress({ done: 0, total: 1 });
      downloadSubtitle(sub._originalUrl).then(async text => {
        const englishCues = parseSubtitle(text, sub._originalUrl);
        const arabicCues = await translateCues(englishCues, (done, total) => {
          setTranslateProgress({ done, total });
        });
        setCues(arabicCues);
        setSubLoading(false);
        setTranslateProgress(null);
      });
    } else {
      if (!sub.url) { setCues([]); return; }
      setSubLoading(true);
      downloadSubtitle(sub.url).then(text => {
        setCues(parseSubtitle(text, sub.url));
        setSubLoading(false);
      });
    }
  }, [subIdx, subList]);

  // ── Anikoto في الخلفية ────────────────────────────────────────────────────
  useEffect(() => {
    if (!malId) return;
    getAnikotoSource(malId, currentEp).then(src => {
      if (src) setSources(prev => [src, ...prev.filter(s => s.provider !== 'anikoto')]);
    });
  }, [malId, currentEp]);

  // ── إعادة ضبط عند تغيير الحلقة ──────────────────────────────────────────
  useEffect(() => {
    setSrcIdx(0); setLoading(true); setFailed(false);
    setCurrentTime(0); setCues([]);
    setSources(getEmbedSources(anilistId, malId, currentEp));
  }, [currentEp, anilistId, malId]);

  // ── إعادة ضبط srcIdx عند تبديل اللغة ────────────────────────────────────
  useEffect(() => {
    setSrcIdx(0); setLoading(true); setFailed(false);
  }, [langTab]);

  // ── حفظ سجل المشاهدة ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('watchHistory') || '{}');
      h[anilistId] = { ep: currentEp, title, updatedAt: Date.now() };
      localStorage.setItem('watchHistory', JSON.stringify(h));
    } catch {}
  }, [anilistId, currentEp, title]);

  // ── أحداث المشغّل ────────────────────────────────────────────────────────
  const handleTime     = useCallback(t => setCurrentTime(t), []);
  const handleComplete = useCallback(() => {
    if (autoNext && nextEp) setTimeout(() => router.push(`/anime/${anilistId}/watch/${nextEp}`), 1500);
  }, [autoNext, nextEp, anilistId, router]);

  usePlayerTime(handleTime, handleComplete);

  const handleSrcFail = useCallback(() => {
    if (srcIdx + 1 < activeSrcs.length) { setSrcIdx(i => i + 1); setLoading(true); }
    else { setFailed(true); setLoading(false); }
  }, [srcIdx, activeSrcs.length]);

  const goToEp = n => router.push(`/anime/${anilistId}/watch/${n}`);

  const langLabel = (s) => {
    if (s.source === 'auto-translate') return '🤖 ترجمة تلقائية';
    const l = s.language?.toLowerCase();
    if (l === 'ar') return '🇸🇦 عربي';
    if (l === 'en') return '🇬🇧 إنجليزي';
    return s.language?.toUpperCase() || '?';
  };

  return (
    <div className={styles.page}>

      {/* ── PLAYER ────────────────────────────────────────────────────────── */}
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
              {anime.bannerImage && (
                <img src={anime.bannerImage} alt="" className={styles.loadBannerBg} />
              )}
              <div className={styles.loadBannerFog} />
              <div className={styles.loadContent}>
                {anime.coverImage?.extraLarge && (
                  <img src={anime.coverImage.extraLarge} alt={title} className={styles.loadPoster} />
                )}
                <div className={styles.loadInfo}>
                  <div className={styles.loadTitle}>{title}</div>
                  <div className={styles.loadEp}>الحلقة {currentEp}</div>
                  {epData?.title && epData.title !== `الحلقة ${currentEp}` && (
                    <div className={styles.loadEpName}>{epData.title}</div>
                  )}
                  <div className={styles.loadSpinnerRow}>
                    <div className={styles.spinner} />
                    <span>{srcIdx > 0 ? `جارٍ تجربة المصدر ${srcIdx + 1}...` : 'جارٍ تحميل الحلقة...'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {failed ? (
            <div className={styles.failBox}>
              <div className={styles.failIcon}>📡</div>
              <p className={styles.failTitle}>تعذّر تحميل الحلقة</p>
              <p className={styles.failSub}>جرّب مصدراً آخر أو عد لاحقاً</p>
              <div className={styles.failBtns}>
                <button className={styles.retryBtn}
                  onClick={() => { setSrcIdx(0); setFailed(false); setLoading(true); }}>
                  🔄 إعادة المحاولة
                </button>
                {nextEp && (
                  <button className={styles.skipBtn} onClick={() => goToEp(nextEp)}>التالية ›</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <iframe
                key={`${currentSrc?.url}-${currentEp}`}
                src={currentSrc?.url}
                className={styles.iframe}
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                onLoad={() => setLoading(false)}
                onError={handleSrcFail}
                title={`${title} - حلقة ${currentEp}`}
              />
              <SubtitleOverlay
                cues={cues}
                currentTime={currentTime}
                visible={showSubtitles && cues.length > 0}
              />
            </>
          )}
        </div>

        {/* ── شريط الأدوات ── */}
        <div className={styles.toolbar}>

          {/* تبديل Sub / Dub */}
          <div className={styles.toolRow}>
            <span className={styles.toolLabel}>🌐 اللغة:</span>
            <div className={styles.langTabs}>
              <button
                className={`${styles.langTab} ${langTab === 'sub' ? styles.langTabActive : ''}`}
                onClick={() => setLangTab('sub')}>
                🎌 مترجم (Sub)
              </button>
              <button
                className={`${styles.langTab} ${langTab === 'dub' ? styles.langTabActive : ''} ${!hasDub ? styles.langTabDisabled : ''}`}
                onClick={() => hasDub && setLangTab('dub')}
                title={!hasDub ? 'الدبلجة غير متوفرة لهذا الأنمي' : ''}>
                🇺🇸 مدبلج (Dub)
                {!hasDub && <span className={styles.noDub}> — غير متاح</span>}
              </button>
            </div>
          </div>

          {/* المصادر */}
          <div className={styles.toolRow}>
            <span className={styles.toolLabel}>🎬 المصدر:</span>
            <div className={styles.btnGroup}>
              {activeSrcs.map((src, i) => (
                <button key={i}
                  className={`${styles.smallBtn} ${i === srcIdx ? styles.smallBtnActive : ''}`}
                  onClick={() => { setSrcIdx(i); setLoading(true); setFailed(false); }}
                  title={src.quality ? `جودة: ${src.quality}` : ''}>
                  {src.label}
                  {src.quality && <span className={styles.qualityBadge}>{src.quality}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* الترجمة */}
          <div className={styles.toolRow}>
            <span className={styles.toolLabel}>💬 الترجمة:</span>
            <div className={styles.btnGroup}>
              <button
                className={`${styles.smallBtn} ${subIdx === -1 ? styles.smallBtnActive : ''}`}
                onClick={() => { setSubIdx(-1); setCues([]); }}>
                بدون
              </button>
              {subList.map((sub, i) => (
                <button key={i}
                  className={`${styles.smallBtn} ${subIdx === i ? styles.smallBtnActive : ''}`}
                  onClick={() => setSubIdx(i)}>
                  {langLabel(sub)}
                  {subLoading && subIdx === i && sub.source !== 'auto-translate' && ' ⏳'}
                  {subLoading && subIdx === i && sub.source === 'auto-translate' && translateProgress &&
                    ` (${translateProgress.done}/${translateProgress.total})`}
                </button>
              ))}
              {subList.length === 0 && (
                <span className={styles.noSubs}>
                  {malId ? 'لا توجد ترجمات متاحة' : 'يحتاج MAL ID لتحميل الترجمة'}
                </span>
              )}
            </div>
            {cues.length > 0 && (
              <button
                className={`${styles.smallBtn} ${showSubtitles ? styles.smallBtnActive : ''}`}
                onClick={() => setShowSubtitles(p => !p)}>
                {showSubtitles ? '👁 ظاهرة' : '👁 مخفية'}
              </button>
            )}
          </div>
        </div>

        {/* التنقل بين الحلقات */}
        <div className={styles.navRow}>
          {prevEp
            ? <button className={styles.navBtn} onClick={() => goToEp(prevEp)}>‹ الحلقة {prevEp}</button>
            : <div />}
          <Link href={`/anime/${anilistId}`} className={styles.detailBtn}>📋 صفحة الأنمي</Link>
          {nextEp
            ? <button className={styles.navBtn} onClick={() => goToEp(nextEp)}>الحلقة {nextEp} ›</button>
            : <div />}
        </div>

        {/* Auto-next */}
        <label className={styles.toggle}>
          <input type="checkbox" checked={autoNext} onChange={e => setAutoNext(e.target.checked)} />
          <span className={styles.slider} />
          <span className={styles.toggleLabel}>تشغيل الحلقة التالية تلقائياً</span>
        </label>

        <div className={styles.notice}>
          ⚠️ إذا لم يعمل المصدر الحالي سيتم الانتقال تلقائياً للمصدر التالي
        </div>
      </div>

      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <div className={`${styles.sidebar} ${showEps ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHead}>
          <h3>الحلقات ({totalEps})</h3>
          <button className={styles.closeEps} onClick={() => setShowEps(p => !p)}>
            {showEps ? '✕' : '☰'}
          </button>
        </div>
        <input className={styles.epSearch} placeholder="ابحث..." value={epFilter}
          onChange={e => setEpFilter(e.target.value)} />
        <div className={styles.epList}>
          {filteredEps.map(ep => (
            <button key={ep.number}
              className={`${styles.epItem} ${ep.number === currentEp ? styles.epActive : ''} ${ep.filler ? styles.epFiller : ''}`}
              onClick={() => goToEp(ep.number)}>
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
          {filteredEps.length === 0 && <div className={styles.noRes}>لا توجد نتائج</div>}
        </div>
      </div>

      <button className={styles.mobileBtn} onClick={() => setShowEps(p => !p)}>
        {showEps ? '✕ إخفاء' : '☰ الحلقات'}
      </button>
    </div>
  );
}
