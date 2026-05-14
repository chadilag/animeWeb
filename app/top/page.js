import Section from '@/components/Section';
import { fetchAniList, TOP_QUERY } from '@/lib/anilist';

export const metadata = { title: 'الأعلى تقييماً | أنمي ستريم' };

export default async function TopPage() {
  const data = await fetchAniList(TOP_QUERY, { page: 1, perPage: 50 });
  const list = data?.Page?.media || [];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '28px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>👑 الأعلى تقييماً على الإطلاق</h1>
      </div>
      <Section title="" list={list} ranked />
    </div>
  );
}
