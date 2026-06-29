/**
 * /api/subtitles
 * Proxy لـ Subdl API لتجنب CORS
 * احصل على API Key مجاني من: https://subdl.com/api
 */

const SUBDL_KEY = process.env.SUBDL_API_KEY || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const malId   = searchParams.get('mal_id');
  const epNum   = searchParams.get('episode');
  const lang    = searchParams.get('lang') || 'AR,EN';

  // بناء URL لـ Subdl
  const params = new URLSearchParams({
    api_key:        SUBDL_KEY,
    type:           'tv',
    languages:      lang,
    episode_number: epNum || '1',
  });

  if (malId) params.set('mal_id', malId);

  // --- محاولة 1: Subdl بـ API Key ---
  if (SUBDL_KEY) {
    try {
      const res  = await fetch(`https://api.subdl.com/api/v1/subtitles?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 86400 }, // cache يوم كامل
      });
      if (res.ok) {
        const data = await res.json();
        return Response.json({ source: 'subdl', data: data?.subtitles || [] });
      }
    } catch (e) {
      console.warn('Subdl failed:', e.message);
    }
  }

  // --- محاولة 2: OpenSubtitles (لا يحتاج API key للبحث) ---
  try {
    const osParams = new URLSearchParams({
      mal_id:          malId || '',
      episode_number:  epNum || '1',
      languages:       'ar,en',
    });
    const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${osParams}`, {
      headers: {
        'Api-Key':      process.env.OPENSUBTITLES_KEY || 'sW0CHjnIapY4dFSdUMKVHITeQQtQ84Ui',
        'Content-Type': 'application/json',
        'User-Agent':   'AnimeStream v1.0',
      },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const subs = (data?.data || []).map(s => ({
        url:      s.attributes?.files?.[0]?.file_id
          ? `https://www.opensubtitles.com/download/file/${s.attributes.files[0].file_id}`
          : null,
        language: s.attributes?.language,
        name:     s.attributes?.release,
        source:   'opensubtitles',
      })).filter(s => s.url);
      return Response.json({ source: 'opensubtitles', data: subs });
    }
  } catch (e) {
    console.warn('OpenSubtitles failed:', e.message);
  }

  // لا توجد ترجمات
  return Response.json({ source: null, data: [] });
}
