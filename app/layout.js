import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'أنمي ستريم | شاهد أفضل الأنميات',
  description: 'موقع لمشاهدة أفضل الأنميات بجودة عالية',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Navbar />
        <main style={{ marginTop: '60px', minHeight: '100vh' }}>
          {children}
        </main>
        <footer style={{
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          padding: '28px', textAlign: 'center', color: 'var(--sub)', fontSize: '13px'
        }}>
          <div style={{
            fontSize: '17px', fontWeight: 900, marginBottom: '6px',
            background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            ⛩ أنمي ستريم
          </div>
          <div>البيانات مُقدَّمة من AniList API • للأغراض التعليمية</div>
        </footer>
      </body>
    </html>
  );
}
