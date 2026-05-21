'use client';

import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/15 flex items-center justify-center text-3xl">⚠️</div>
          <div className="text-center">
            <h1 className="text-white font-black text-xl mb-2">エラーが発生しました</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              アプリの再読み込みをお試しください。<br />
              問題が続く場合はサポートにお問い合わせください。
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
