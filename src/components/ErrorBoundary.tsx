'use client';

import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-500/10 p-6 space-y-4">
            <h2 className="text-red-400 text-xl font-bold">页面出错了</h2>
            <p className="text-red-300/80 text-sm font-mono break-all">
              {this.state.error?.message || '未知错误'}
            </p>
            <pre className="text-red-300/60 text-xs overflow-auto max-h-48 bg-black/30 rounded p-3">
              {this.state.error?.stack}
            </pre>
            <button
              className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
