import { Image, SearchX } from 'lucide-react';
import { EmptyState } from '../../ui/index.jsx';
import Button from '../../ui/Button.jsx';

export default function MediaEmptyState({ variant = 'empty', onUploadClick, hasFilters }) {
  if (variant === 'no-results') {
    return (
      <EmptyState
        className="photo-media-empty photo-media-empty--search"
        icon={SearchX}
        title="No matching media"
        description={
          hasFilters
            ? 'Try adjusting your search or filters. Filters apply to loaded items only — load more to search further back.'
            : 'No items match your current search.'
        }
      />
    );
  }

  return (
    <EmptyState
      className="photo-media-empty"
      icon={Image}
      title="No media yet"
      description="Select a class album and upload your first photos or videos to share with families."
      action={onUploadClick ? (
        <Button type="button" variant="primary" onClick={onUploadClick}>
          Upload Media
        </Button>
      ) : null}
    />
  );
}

export function MediaLoadingGrid({ count = 10, viewMode = 'grid' }) {
  return (
    <div className={`photo-media-grid photo-media-grid--${viewMode} photo-media-grid--loading`} aria-busy="true" aria-label="Loading media">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="photo-media-skeleton" />
      ))}
    </div>
  );
}
