/**
 * /api/subtitle-file
 * يحمّل ملف الترجمة ويعيده كـ text (لتجنب CORS)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('URL مطلوب', { status: 400 });
  }

  try {
    const res = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AnimeStream/1.0)',
        'Accept':     'text/plain, text/vtt, application/x-subrip, */*',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();

    return new Response(text, {
      headers: {
        'Content-Type':                'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=86400',
      },
    });
  } catch (e) {
    return new Response(`فشل التحميل: ${e.message}`, { status: 500 });
  }
}
