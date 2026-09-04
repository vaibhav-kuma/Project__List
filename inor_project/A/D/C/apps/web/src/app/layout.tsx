import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouTube Clone',
  description: 'A full-stack YouTube clone built with Next.js, Express, and PostgreSQL',
  openGraph: {
    title: 'YouTube Clone',
    description: 'A full-stack YouTube clone',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-yt-bg text-white antialiased">
        {children}
      </body>
    </html>
  );
}
