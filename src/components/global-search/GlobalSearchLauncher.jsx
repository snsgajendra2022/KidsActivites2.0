import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const GlobalSearch = lazy(() => import('./GlobalSearch.jsx'));

class SearchErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Global search failed', error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function GlobalSearchLauncher() {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      event.preventDefault();
      onOpen();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);

  return (
    <>
      <button
        type="button"
        className="global-search-trigger hidden lg:flex"
        onClick={onOpen}
        aria-label="Open search (Ctrl+K)"
      >
        <Search size={16} className="shrink-0 text-[#6b7a8c]" aria-hidden />
        <span className="global-search-trigger-text">Search applications, students, fees…</span>
        <kbd className="global-search-kbd">⌘K</kbd>
      </button>

      <button
        type="button"
        className="global-search-mobile-btn lg:hidden"
        onClick={onOpen}
        aria-label="Open search"
      >
        <Search size={20} />
      </button>

      {open ? (
        <SearchErrorBoundary>
          <Suspense fallback={null}>
            <GlobalSearch open onClose={onClose} />
          </Suspense>
        </SearchErrorBoundary>
      ) : null}
    </>
  );
}
