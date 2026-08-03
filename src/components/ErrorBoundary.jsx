import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info);
    if (typeof window !== 'undefined') {
      window.__lastUiError = {
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: info?.componentStack || '',
      };
    }
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || String(this.state.error || '');
      return (
        <div className="error-boundary" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page or contact support if the problem persists.</p>
          {import.meta.env.DEV && message ? (
            <pre
              style={{
                margin: '1rem auto',
                maxWidth: '52rem',
                overflow: 'auto',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                fontSize: '12px',
                color: '#9f1239',
              }}
            >
              {message}
              {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
            </pre>
          ) : null}
          <button type="button" onClick={() => window.location.assign('/')}>
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
