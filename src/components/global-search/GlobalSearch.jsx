import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bus,
  CreditCard,
  FileInput,
  FileText,
  GraduationCap,
  IdCard,
  LayoutGrid,
  MapPinned,
  Megaphone,
  MonitorPlay,
  Search,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { runGlobalSearch } from '../../services/globalSearchService.js';
import { buildEmptyStateMessage } from '../../utils/globalSearchUtils.js';

const KIND_ICONS = {
  page: LayoutGrid,
  student: GraduationCap,
  application: FileInput,
  fee: CreditCard,
  teacher: UserCog,
  driver: IdCard,
  vehicle: Bus,
  route: MapPinned,
  class: BookOpen,
  homework: FileText,
  exam: FileText,
  notice: Megaphone,
  course: MonitorPlay,
  user: Users,
};

function ResultIcon({ kind }) {
  const Icon = KIND_ICONS[kind] || LayoutGrid;
  return <Icon size={16} aria-hidden />;
}

export default function GlobalSearch({ open, onClose }) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef(null);
  const requestRef = useRef(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getNavItems } = usePortalConfig();
  const { tenantPath } = useTenantPath();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [flat, setFlat] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = useMemo(() => {
    if (!user?.role || typeof getNavItems !== 'function') return [];
    try {
      const items = getNavItems(user.role);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Global search could not load navigation', error);
      return [];
    }
  }, [getNavItems, user?.role]);

  const reset = useCallback(() => {
    setQuery('');
    setGroups([]);
    setFlat([]);
    setActiveIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return undefined;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, reset]);

  useEffect(() => {
    if (!open || !user?.role) return undefined;

    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await runGlobalSearch({
          query,
          role: user.role,
          user,
          navItems,
          tenantPath,
        });
        if (requestRef.current !== requestId) return;
        setGroups(Array.isArray(result?.groups) ? result.groups : []);
        setFlat(Array.isArray(result?.flat) ? result.flat : []);
        setActiveIndex(0);
      } catch (error) {
        console.error('Global search failed', error);
        if (requestRef.current !== requestId) return;
        setGroups([]);
        setFlat([]);
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, query.trim() ? 220 : 0);

    return () => window.clearTimeout(timer);
  }, [open, query, user, navItems, tenantPath]);

  const openResult = useCallback((item) => {
    if (!item?.path) return;
    onClose();
    navigate(item.path);
  }, [navigate, onClose]);

  const onInputKeyDown = (event) => {
    if (!flat.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flat.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openResult(flat[activeIndex]);
    }
  };

  const emptyMessage = buildEmptyStateMessage(query, navItems.length > 0);

  if (!open) return null;

  return (
    <div
      className="global-search-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="global-search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-label`}
      >
        <div className="global-search-input-wrap">
          <Search size={18} className="global-search-input-icon" aria-hidden />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-labelledby={`${inputId}-label`}
            placeholder="Search pages, students, applications, fees, transport…"
            className="global-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <span id={`${inputId}-label`} className="sr-only">
            Search the school portal
          </span>
          <button
            type="button"
            className="global-search-close"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div className="global-search-meta">
          <span>{loading ? 'Searching…' : `${flat.length} result${flat.length === 1 ? '' : 's'}`}</span>
          <span className="global-search-hint">↑↓ navigate · Enter open · Esc close</span>
        </div>

        <div id={listId} className="global-search-results" role="listbox">
          {!loading && flat.length === 0 ? (
            <p className="global-search-empty">{emptyMessage}</p>
          ) : null}

          {groups.map((group) => (
            <section key={group.kind} className="global-search-group">
              <h3 className="global-search-group-title">{group.label}</h3>
              <ul className="global-search-group-list">
                {group.items.map((item) => {
                  const index = flat.findIndex((entry) => entry.id === item.id && entry.kind === item.kind);
                  const active = index === activeIndex;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`global-search-result${active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openResult(item)}
                      >
                        <span className="global-search-result-icon">
                          <ResultIcon kind={item.kind} />
                        </span>
                        <span className="global-search-result-copy">
                          <span className="global-search-result-title">{item.title}</span>
                          {item.subtitle ? (
                            <span className="global-search-result-subtitle">{item.subtitle}</span>
                          ) : null}
                        </span>
                        <ArrowRight size={15} className="global-search-result-arrow" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
