import Section from '@/components/Section';
import { getTop } from '@/lib/anilist';

export const metadata = { title: 'الأعلى تقييماً | أنمي ستريم' };

export default async function TopPage() {
  const list = await getTop({ page: 1, perPage: 50 });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '28px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>👑 الأعلى تقييماً على الإطلاق</h1>
      </div>
      <Section title="" list={list} ranked />
    </div>
  );
}
