import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { MacaronLogo } from './MacaronLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught ErrorBoundary error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isAr = (document.documentElement.lang || 'ar') === 'ar';
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-slate-800 dark:text-slate-100">
          <div className="glass-strong max-w-sm w-full rounded-[2rem] border border-white/80 dark:border-slate-700 p-8 shadow-[0_30px_80px_-30px_rgba(236,72,153,0.5)] text-center space-y-4">
            <span className="inline-block rounded-[1.2rem] shadow-md rotate-[-6deg]">
              <MacaronLogo size={64} />
            </span>
            <h1 className="text-xl font-extrabold">
              {isAr ? 'صار خطأ غير متوقع' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isAr ? 'أعد تحميل الصفحة وجرّب مرة ثانية.' : 'Please reload the page and try again.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full text-sm font-extrabold text-slate-900 bg-gradient-to-br from-yellow-200 via-pink-200 to-sky-200 shadow-md hover:-translate-y-px hover:shadow-lg transition-all cursor-pointer"
            >
              {isAr ? 'إعادة تحميل' : 'Reload'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
