/**
 * lib/subtitles.js
 * جلب وتحليل ملفات الترجمة (SRT / VTT)
 */

// ── جلب قائمة الترجمات المتاحة ────────────────────────────────────────────────
export async function fetchSubtitleList(malId, epNumber) {
  if (!malId) return [];
  try {
    const res  = await fetch(
      `/api/subtitles?mal_id=${malId}&episode=${epNumber}&lang=AR,EN`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

// ── تحميل محتوى ملف الترجمة (عبر proxy لتجنب CORS) ──────────────────────────
export async function downloadSubtitle(url) {
  try {
    const proxyUrl = `/api/subtitle-file?url=${encodeURIComponent(url)}`;
    const res      = await fetch(proxyUrl);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── تحليل SRT → مصفوفة cues ──────────────────────────────────────────────────
export function parseSRT(text) {
  if (!text?.trim()) return [];
  const cues   = [];
  const blocks = text.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // السطر الأول: رقم (اختياري)
    // السطر الثاني: 00:00:00,000 --> 00:00:00,000
    const timeIdx = lines.findIndex(l => l.includes('-->'));
    if (timeIdx === -1) continue;

    const times = lines[timeIdx].split('-->');
    if (times.length < 2) continue;

    const start = parseSRTTime(times[0].trim());
    const end   = parseSRTTime(times[1].trim());
    const text_ = lines.slice(timeIdx + 1).join('\n').replace(/<[^>]+>/g, '');

    if (text_.trim()) cues.push({ start, end, text: text_.trim() });
  }

  return cues;
}

function parseSRTTime(str) {
  // 00:01:23,456 أو 00:01:23.456
  const clean = str.replace(',', '.');
  const parts = clean.split(':');
  if (parts.length < 3) return 0;
  const [h, m, s] = parts;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}

// ── تحليل VTT → مصفوفة cues ──────────────────────────────────────────────────
export function parseVTT(text) {
  if (!text?.trim()) return [];
  // VTT مشابه جداً لـ SRT مع بعض الاختلافات
  const cleaned = text
    .replace(/^WEBVTT.*\n/m, '')
    .replace(/NOTE[^\n]*\n/g, '');
  return parseSRT(cleaned.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2'));
}

// ── تحليل تلقائي حسب النوع ───────────────────────────────────────────────────
export function parseSubtitle(text, url = '') {
  if (!text) return [];
  const isVTT = url.endsWith('.vtt') || text.startsWith('WEBVTT');
  return isVTT ? parseVTT(text) : parseSRT(text);
}

// ── إيجاد السطر الحالي حسب الوقت ────────────────────────────────────────────
export function getCurrentCue(cues, currentTime) {
  if (!cues?.length || currentTime == null) return null;
  return cues.find(c => currentTime >= c.start && currentTime <= c.end) || null;
}
