import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '交易笔记',
    template: '%s | 交易笔记',
  },
  description: '记录交易、复盘盈亏、追踪资产变化的交易笔记',
  keywords: ['交易笔记', '交易记录', '复盘', '盈亏', '资产管理'],
  authors: [{ name: 'Trading Notes' }],
  generator: 'Next.js',
  icons: {
    icon: [{ url: '/favicon.png', sizes: '512x512', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: [{ url: '/favicon.png', sizes: '512x512', type: 'image/png' }],
  },
  openGraph: {
    title: '交易笔记',
    description: '记录交易、复盘盈亏、追踪资产变化的交易笔记',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/favicon.png', width: 512, height: 512, alt: '交易笔记' }],
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
