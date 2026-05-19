import './globals.css';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ScrollToTop from '@/components/ScrollToTop';

export const metadata = {
  title: 'أنمي ستريم | شاهد أفضل الأنميات',
  description: 'موقع لمشاهدة أفضل الأنميات بجودة عالية',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Sidebar />
        <Navbar />
        <main className="main-content">
          {children}
        </main>
        <footer className="site-footer">
          <div className="footer-logo">⛩ أنمي ستريم</div>
          <div>البيانات مُقدَّمة من AniList API • للأغراض التعليمية</div>
        </footer>
        <ScrollToTop />
      </body>
    </html>
  );
}
