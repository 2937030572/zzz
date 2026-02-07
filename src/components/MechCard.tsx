'use client';

import { ReactNode } from 'react';

interface MechCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  accent?: 'cyan' | 'purple' | 'pink' | 'green';
}

export default function MechCard({ children, className, title, icon, accent = 'cyan' }: MechCardProps) {
  const accentColors = {
    cyan: {
      border: 'border-cyan-500/30',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]',
      text: 'text-cyan-400',
      line: 'from-cyan-400 via-cyan-500 to-cyan-400',
      dot: 'bg-cyan-400',
    },
    purple: {
      border: 'border-purple-500/30',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]',
      text: 'text-purple-400',
      line: 'from-purple-400 via-purple-500 to-purple-400',
      dot: 'bg-purple-400',
    },
    pink: {
      border: 'border-pink-500/30',
      glow: 'shadow-[0_0_20px_rgba(236,72,153,0.2)]',
      text: 'text-pink-400',
      line: 'from-pink-400 via-pink-500 to-pink-400',
      dot: 'bg-pink-400',
    },
    green: {
      border: 'border-green-500/30',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]',
      text: 'text-green-400',
      line: 'from-green-400 via-green-500 to-green-400',
      dot: 'bg-green-400',
    },
  };

  const colors = accentColors[accent];

  return (
    <div className={`relative ${colors.border} ${colors.glow} ${className}`}>
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-sm"></div>
      
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `
          linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
        `,
        backgroundSize: '10px 10px'
      }}></div>

      {/* 边框装饰 */}
      <div className="absolute inset-0 border border-current opacity-20"></div>
      
      {/* 角落装饰 */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>

      {/* 顶部发光线 */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
      <div className="absolute top-0 left-4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
      <div className="absolute top-0 right-4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>

      {/* 内容 */}
      <div className="relative z-10 p-6">
        {title && (
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-1 h-4 ${colors.dot} rounded-full`}></div>
            {icon && <div className={colors.text}>{icon}</div>}
            <h3 className={`text-sm font-bold ${colors.text} uppercase tracking-wider`}>{title}</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-current/20 to-transparent"></div>
          </div>
        )}
        {children}
      </div>

      {/* 数据流动画 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden opacity-30">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[dataFlow_3s_linear_infinite]"></div>
      </div>

      <style jsx>{`
        @keyframes dataFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
