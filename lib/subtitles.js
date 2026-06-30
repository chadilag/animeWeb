/**
 * lib/subtitles.js
 * جلب وتحليل ملفات الترجمة (SRT / VTT)
 * + نظام ترجمة آلية احتياطي (إنجليزي → عربي) عند غياب ترجمة عربية جاهزة
 */

// ── جلب قائمة الترجمات المتاحة ────────────────────────────────────────────────
export async function fetchSubtitleList(malId, epNumber) {
  if (!malId) return [];
  try {
    const res = await fetch(
      `/api/subtitles?mal_id=${malId}&episode=${epNumber}&lang=AR,EN`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    let list = data.data || [];

    // ── إذا ما فيه أي ترجمة عربية جاهزة، نضيف خيار "ترجمة تلقائية" ──────────
    const hasArabic = list.some(s => isArabic(s.language));
    const englishSub = list.find(s => isEnglish(s.language));

    if (!hasArabic && englishSub) {
      list = [
        {
          ...englishSub,
          language: 'ar-auto',
          name: `ترجمة تلقائية (من الإنجليزية)`,
          source: 'auto-translate',
          _originalUrl: englishSub.url,
        },
        ...list,
      ];
    }

    return list;
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
  const clean = str.replace(',', '.');
  const parts = clean.split(':');
  if (parts.length < 3) return 0;
  const [h, m, s] = parts;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}

// ── تحليل VTT → مصفوفة cues ──────────────────────────────────────────────────
export function parseVTT(text) {
  if (!text?.trim()) return [];
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

// ══════════════════════════════════════════════════════════════════════════════
//  ترجمة آلية (Fallback) — تحول cues الإنجليزية إلى عربية عبر /api/translate
// ══════════════════════════════════════════════════════════════════════════════

// ترجمة دفعة من السطور دفعة واحدة (أسرع من سطر بسطر)
export async function translateCues(cues, onProgress) {
  if (!cues?.length) return cues;

  const BATCH_SIZE = 15;          // عدد السطور بكل دفعة
  const SEPARATOR  = '\n@@\n';    // فاصل واضح ما يتعارض مع MyMemory
  const translated = [];

  for (let i = 0; i < cues.length; i += BATCH_SIZE) {
    const batch = cues.slice(i, i + BATCH_SIZE);
    const joined = batch.map(c => c.text.replace(/\n/g, ' ')).join(SEPARATOR);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: joined }),
      });
      const data = await res.json();
      const parts = (data?.translated || '').split(SEPARATOR);

      batch.forEach((cue, idx) => {
        translated.push({
          ...cue,
          text: parts[idx]?.trim() || cue.text,
        });
      });
    } catch {
      // فشل الدفعة → نحتفظ بالنص الإنجليزي الأصلي بدل ما نخسر السطر
      batch.forEach(cue => translated.push(cue));
    }

    onProgress?.(Math.min(i + BATCH_SIZE, cues.length), cues.length);
  }

  return translated;
}

// ── Helpers لتمييز اللغة ─────────────────────────────────────────────────────
export function isArabic(lang) {
  const l = lang?.toLowerCase() || '';
  return l === 'ar' || l.includes('arab');
}

export function isEnglish(lang) {
  const l = lang?.toLowerCase() || '';
  return l === 'en' || l.includes('eng');
}
