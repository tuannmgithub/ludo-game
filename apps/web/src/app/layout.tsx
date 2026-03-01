import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Co Ca Ngua Online - Vietnamese Ludo',
  description: 'Choi Co Ca Ngua truc tuyen voi ban be',
  keywords: ['co ca ngua', 'ludo', 'board game', 'vietnamese'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
