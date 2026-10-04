'use client';

import dynamic from 'next/dynamic';

/**
 * 开发辅助：点击页面元素跳转到源码。
 * 必须放在 Client Component 中才能使用 ssr: false，同时避免进入生产 bundle。
 */
const Inspector = dynamic(() => import('react-dev-inspector').then((m) => m.Inspector), {
  ssr: false,
});

export function DevInspector() {
  return <Inspector />;
}
