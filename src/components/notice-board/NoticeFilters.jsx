import { Search } from 'lucide-react';
import {
  NOTICE_CATEGORY_OPTIONS,
  NOTICE_PRIORITY_OPTIONS,
  NOTICE_STATUS_LABELS,
} from '../../constants/notices.js';

const STATUS_TABS = ['', 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'ARCHIVED'];

export default function NoticeFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  priority,
  onPriorityChange,
  showStatusTabs = true,
}) {
  return (
    <div className="notice-filters">
      {showStatusTabs && (
        <div className="notice-filters__tabs" role="tablist" aria-label="Notice status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab || 'all'}
              type="button"
              role="tab"
              aria-selected={status === tab}
              className={`notice-filters__tab${status === tab ? ' is-active' : ''}`}
              onClick={() => onStatusChange(tab)}
            >
              {tab ? NOTICE_STATUS_LABELS[tab] : 'All'}
            </button>
          ))}
        </div>
      )}
      <div className="notice-filters__row">
        <div className="notice-filters__search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search notices…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search notices"
          />
        </div>
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {NOTICE_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => onPriorityChange(e.target.value)} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {NOTICE_PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
