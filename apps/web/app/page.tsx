import Link from 'next/link';

export default function HomePage() {
  const linkStyle = { display: 'block', padding: '0.5rem', margin: '0.25rem 0', color: '#0a66c2', textDecoration: 'none' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', direction: 'rtl' }}>
      <h1>منصة SaaS - قيد التطوير</h1>
      <p>نظام تسجيل الدخول سيتم إضافته في المرحلة النهائية</p>

      <div style={{ marginTop: '2rem' }}>
        <h2>الكاشطات (Scrapers):</h2>
        <Link href="/dev/twitter" style={linkStyle}>🐦 Twitter Scraper</Link>
        <Link href="/dev/instagram" style={linkStyle}>📸 Instagram Scraper</Link>
        <Link href="/dev/linkedin" style={linkStyle}>🔗 LinkedIn Scraper</Link>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h2>المراقبة:</h2>
        <Link href="/dev/monitoring" style={linkStyle}>📊 لوحة مراقبة الكشط (مباشر)</Link>
      </div>
    </div>
  );
}
