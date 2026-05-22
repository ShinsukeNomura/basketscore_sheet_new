'use client';

import React from 'react';
import ja from '@/i18n/messages/ja.json';
import en from '@/i18n/messages/en.json';
import zh from '@/i18n/messages/zh.json';
import zhTW from '@/i18n/messages/zh-TW.json';

const ERROR_MSG = { ja, en, zh, 'zh-TW': zhTW } as const;

function getErrorLocale(): keyof typeof ERROR_MSG {
  if (typeof document === 'undefined') return 'ja';
  const lang = document.documentElement.lang;
  if (lang in ERROR_MSG) return lang as keyof typeof ERROR_MSG;
  return 'ja';
}

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
      message: error instanceof Error ? error.message : '',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const h = ERROR_MSG[getErrorLocale()].home;
      return (
        <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/15 flex items-center justify-center text-3xl">⚠️</div>
          <div className="text-center">
            <h1 className="text-white font-black text-xl mb-2">{h.errorTitle}</h1>
            <p className="text-white/40 text-sm leading-relaxed whitespace-pre-line">
              {h.errorHint}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:bg-blue-700"
          >
            {ERROR_MSG[getErrorLocale()].common.reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
