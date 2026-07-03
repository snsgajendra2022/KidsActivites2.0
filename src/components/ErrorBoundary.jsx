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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page or contact support if the problem persists.</p>
          <button type="button" onClick={() => window.location.assign('/')}>
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
