'use client';

import { Activity, Cpu, Zap, Database, Shield } from 'lucide-react';

export default function CyberHeader() {
  return (
    <div className="relative overflow-hidden mb-8">
      {/* 背景网格 */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* 扫描线效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 animate-[scan_3s_linear_infinite]"></div>
      </div>

      {/* 内容 */}
      <div className="relative z-10">
        {/* 顶部装饰线 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>SYSTEM ONLINE</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>

        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-wider" style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(6, 182, 212, 0.5)'
          }}>
            交易记录系统
          </h1>
          <p className="text-sm md:text-base text-cyan-400/70 font-mono tracking-wide">
            TRADING JOURNAL SYSTEM v2.0
          </p>
        </div>

        {/* 状态指示器 */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="w-3 h-3 text-green-400" />
            <span>DATA STREAM</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>SYNCED</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>SECURE</span>
          </div>
        </div>

        {/* 底部装饰线 */}
        <div className="flex items-center gap-2 mt-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
