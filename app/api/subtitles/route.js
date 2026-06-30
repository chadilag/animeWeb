/**
 * /api/subtitles
 * Proxy لجلب ترجمات (عربي + إنجليزي) من عدة مصادر مع fallback
 * المصادر: Subdl → Jimaku → OpenSubtitles
 */

const SUBDL_KEY       = process.env.SUBDL_API_KEY || '';
const JIMAKU_KEY      = process.env.JIMAKU_API_KEY || '';
const OPENSUB_KEY     = process.env.OPENSUBTITLES_KEY || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const malId = searchParams.get('mal_id');
  const epNum = searchParams.get('episode') || '1';

  // ── 1. Subdl (يدعم mal_id + عربي بشكل ممتاز) ─────────────────────────────
  if (SUBDL_KEY) {
    try {
      const params = new URLSearchParams({
        api_key:        SUBDL_KEY,
        type:           'tv',
        languages:      'AR,EN',
        episode_number: epNum,
        mal_id:         malId || '',
      });
      const res = await fetch(`https://api.subdl.com/api/v1/subtitles?${params}`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json();
        const subs = (data?.subtitles || []).map(s => ({
          url:      s.url?.startsWith('http') ? s.url : `https://dl.subdl.com${s.url}`,
          language: s.language,
          name:     s.release_name,
          source:   'subdl',
        }));
        if (subs.length > 0) {
          return Response.json({ source: 'subdl', data: subs });
        }
      }
    } catch (e) {
      console.warn('Subdl failed:', e.message);
    }
  }

  // ── 2. Jimaku (متخصص بالأنمي، MAL ID مباشرة) ─────────────────────────────
  if (malId) {
    try {
      const res = await fetch(`https://jimaku.cc/api/entries/search?mal_id=${malId}`, {
        headers: JIMAKU_KEY ? { 'Authorization': JIMAKU_KEY } : {},
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const entries = await res.json();
        const entry = entries?.[0];
        if (entry?.id) {
          const filesRes = await fetch(`https://jimaku.cc/api/entries/${entry.id}/files`, {
            headers: JIMAKU_KEY ? { 'Authorization': JIMAKU_KEY } : {},
          });
          if (filesRes.ok) {
            const files = await filesRes.json();
            const epFiles = files.filter(f =>
              f.name?.includes(String(epNum).padStart(2, '0')) ||
              f.name?.includes(`- ${epNum} `) ||
              f.name?.includes(`E${epNum}`)
            );
            const subs = (epFiles.length ? epFiles : files).map(f => ({
              url:      f.url,
              language: 'ar', // Jimaku غالباً يابانية/إنجليزية — تحقق حسب الحاجة
              name:     f.name,
              source:   'jimaku',
            }));
            if (subs.length > 0) {
              return Response.json({ source: 'jimaku', data: subs });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Jimaku failed:', e.message);
    }
  }

  // ── 3. OpenSubtitles (fallback أخير) ──────────────────────────────────────
  try {
    const osParams = new URLSearchParams({
      episode_number: epNum,
      languages:      'ar,en',
      query:          malId ? `mal-${malId}` : '',
    });
    const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${osParams}`, {
      headers: {
        'Api-Key':      OPENSUB_KEY,
        'Content-Type': 'application/json',
        'User-Agent':   'AnimeStream v1.0',
      },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const subs = (data?.data || []).map(s => ({
        url: s.attributes?.files?.[0]?.file_id
          ? `https://www.opensubtitles.com/download/file/${s.attributes.files[0].file_id}`
          : null,
        language: s.attributes?.language,
        name:     s.attributes?.release,
        source:   'opensubtitles',
      })).filter(s => s.url);
      if (subs.length > 0) {
        return Response.json({ source: 'opensubtitles', data: subs });
      }
    }
  } catch (e) {
    console.warn('OpenSubtitles failed:', e.message);
  }

  // لا توجد ترجمات من أي مصدر
  return Response.json({ source: null, data: [] });
}
