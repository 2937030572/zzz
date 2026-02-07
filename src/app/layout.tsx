import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '交易记录',
    template: '%s | 交易记录',
  },
  description: '专业的交易记录管理应用，记录每次交易的策略、盈亏和平仓原因',
  keywords: [
    '交易记录',
    '股票交易',
    '期货交易',
    '加密货币',
    '交易管理',
    '投资记录',
    '盈亏统计',
  ],
  authors: [{ name: 'Trade Tracker', url: 'https://code.coze.cn' }],
  generator: 'Trade Tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '交易记录',
  },
  openGraph: {
    title: '交易记录 | 专业的交易管理应用',
    description: '记录每次交易的策略、盈亏和平仓原因，助您成为更好的交易者',
    url: 'https://code.coze.cn',
    siteName: '交易记录',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
// trigger reload
