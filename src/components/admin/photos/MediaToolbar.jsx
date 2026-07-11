import {
  Search, RefreshCw, LayoutGrid, Rows3, Image, Video, Loader2, Calendar,
} from 'lucide-react';
import Button from '../../ui/Button.jsx';

const TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'processing', label: 'Processing', icon: Loader2 },
];

const DATE_FILTERS = [
  { id: 'all', label: 'All dates' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export default function MediaToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  dateFilter,
  onDateFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  refreshing,
  resultCount,
  totalLoaded,
  hasMore,
}) {
  return (
    <div className="photo-media-toolbar" role="search" aria-label="Filter media library">
      <div className="photo-media-toolbar__row">
        <div className="photo-media-toolbar__search">
          <Search size={16} aria-hidden className="photo-media-toolbar__search-icon" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search loaded media by filename…"
            aria-label="Search media by filename"
            className="photo-media-toolbar__search-input"
          />
        </div>

        <div className="photo-media-toolbar__actions">
          <div className="photo-media-toolbar__view-toggle" role="group" aria-label="Grid density">
            <button
              type="button"
              className={`photo-media-toolbar__view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Comfortable grid"
              title="Comfortable grid"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`photo-media-toolbar__view-btn${viewMode === 'compact' ? ' is-active' : ''}`}
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              aria-label="Compact grid"
              title="Compact grid"
            >
              <Rows3 size={16} />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh gallery"
          >
            <RefreshCw size={14} className={refreshing ? 'photo-sharing-spin' : ''} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <div className="photo-media-toolbar__filters">
        <div className="photo-media-toolbar__filter-group" role="group" aria-label="Media type filter">
          {TYPE_FILTERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`photo-media-toolbar__chip${typeFilter === id ? ' is-active' : ''}`}
              onClick={() => onTypeFilterChange(id)}
              aria-pressed={typeFilter === id}
            >
              <Icon size={14} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <label className="photo-media-toolbar__date-filter">
          <Calendar size={14} aria-hidden />
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            aria-label="Filter by date"
          >
            {DATE_FILTERS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="photo-media-toolbar__meta" aria-live="polite">
        Showing {resultCount} of {totalLoaded} loaded
        {hasMore ? ' (load more to search further)' : ''}
        {searchQuery ? ` matching "${searchQuery}"` : ''}
      </p>
    </div>
  );
}
