import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingScreen';
import { createBugReport, submitBugReport } from '@/lib/bugReport';
import { debugError } from '@/lib/debug';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  reporting: boolean;
  reportNote: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, reporting: false, reportNote: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? null });
    debugError('ErrorBoundary', error.message, { stack: error.stack, info });
  }

  handleReport = async () => {
    if (!this.state.error) return;
    this.setState({ reporting: true, reportNote: null });
    const report = createBugReport(this.state.error, this.state.componentStack);
    const result = await submitBugReport(report);
    const reportNote =
      result === 'mailto'
        ? 'Report saved locally. Your email app should open — send the message to complete the report.'
        : result === 'copied'
          ? 'Report saved locally and copied to clipboard. Paste it into an email to support@prevault.app.'
          : 'Report saved locally. Email support@prevault.app with what you were doing when this happened.';
    this.setState({ reporting: false, reportNote });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
          <p className="text-2xl font-semibold text-text">Oops!!!</p>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            You&apos;re a bug killer — please click Report below and we&apos;ll take care of the rest.
          </p>
          {this.state.reportNote ? (
            <p className="max-w-md rounded-xl bg-success/10 px-4 py-3 text-xs text-success">{this.state.reportNote}</p>
          ) : null}
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button className="w-full" disabled={this.state.reporting} onClick={() => void this.handleReport()}>
              {this.state.reporting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  Preparing report…
                </span>
              ) : (
                'Report'
              )}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
