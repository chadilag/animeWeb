/**
 * /api/translate
 * ترجمة نص من إنجليزي → عربي
 * يستخدم MyMemory API (مجاني 10,000 كلمة/يوم بدون مفتاح)
 */
export async function POST(request) {
  const { text } = await request.json();
  if (!text?.trim()) return Response.json({ translated: '' });

  // تقطيع النص إلى أجزاء (MyMemory حد أقصى 500 حرف لكل طلب)
  const chunks    = splitText(text, 490);
  const results   = [];

  for (const chunk of chunks) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|ar`;
      const res = await fetch(url, {
        next: { revalidate: 86400 },
      });
      const data = await res.json();
      const t    = data?.responseData?.translatedText;
      results.push(t && data?.responseStatus === 200 ? t : chunk);
      // تأخير بسيط بين الطلبات
      await delay(100);
    } catch {
      results.push(chunk);
    }
  }

  return Response.json({ translated: results.join(' ') });
}

function splitText(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current  = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
