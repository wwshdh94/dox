import { Component, type ErrorInfo, type ReactNode } from 'react';
import { debugError } from '@/lib/debug';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    debugError('ErrorBoundary', error.message, { stack: error.stack, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold text-danger">Something went wrong</p>
          <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
          <button
            className="rounded-2xl border border-accent-muted bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-sm"
            onClick={() => {
              localStorage.removeItem('dox-vault');
              window.location.href = '/';
            }}
          >
            Reset app data & reload
          </button>
          <p className="text-xs text-muted">Open DevTools → Console for [Dox] logs</p>
        </div>
      );
    }
    return this.props.children;
  }
}
