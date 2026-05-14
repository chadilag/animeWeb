# ⛩ أنمي ستريم

موقع أنمي كامل مبني بـ Next.js 14 + AniList API

---

## 🚀 طريقة تشغيل المشروع

### الخطوة 1 — افتح المجلد
افتح Terminal (أو CMD على Windows) واكتب:
```
cd anime-stream
```

### الخطوة 2 — ثبّت المكتبات
```
npm install
```
انتظر حتى ينتهي (دقيقة تقريباً)

### الخطوة 3 — شغّل المشروع
```
npm run dev
```

### الخطوة 4 — افتح المتصفح
اكتب في المتصفح:
```
http://localhost:3000
```

---

## 📁 هيكل المشروع

```
anime-stream/
├── app/
│   ├── layout.js          ← التخطيط العام (Navbar + Footer)
│   ├── page.js            ← الصفحة الرئيسية
│   ├── browse/page.js     ← صفحة التصفح بالنوع
│   ├── search/page.js     ← صفحة البحث
│   ├── top/page.js        ← الأعلى تقييماً
│   └── anime/[id]/page.js ← صفحة تفاصيل الأنمي
├── components/
│   ├── Navbar.js          ← شريط التنقل
│   ├── Hero.js            ← البانر الرئيسي
│   ├── AnimeCard.js       ← كارت الأنمي
│   └── Section.js         ← قسم الشبكة
└── lib/
    └── anilist.js         ← كل طلبات AniList API
```

---

## 🔧 للنشر على الإنترنت (مجاناً)

1. ارفع المشروع على GitHub
2. ادخل على vercel.com
3. اختر المشروع من GitHub
4. اضغط Deploy

---

## 📡 مصدر البيانات

جميع بيانات الأنمي من **AniList GraphQL API**
- مجاني 100%
- لا يحتاج API Key
- يتحدث تلقائياً
- أكثر من 15,000 أنمي
