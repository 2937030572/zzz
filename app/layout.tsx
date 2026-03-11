import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '交易记录系统',
    template: '%s | 交易记录系统',
  },
  description:
    '专业的交易记录管理系统，支持资产管理和交易记录的增删改查，实时追踪交易盈亏和资产变化。',
  keywords: [
    '交易记录',
    '资产管理',
    '交易管理',
    '盈亏追踪',
    '资产监控',
    '交易系统',
  ],
  authors: [{ name: 'Trade System Team' }],
  generator: 'Next.js',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: '交易记录系统 - 专业的交易管理工具',
    description:
    '专业的交易记录管理系统，支持资产管理和交易记录的增删改查，实时追踪交易盈亏和资产变化。',
    type: 'website',
    locale: 'zh_CN',
    images: [
      {
        url: '/favicon.png',
        width: 512,
        height: 512,
        alt: '交易记录系统 - K线图标',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
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
