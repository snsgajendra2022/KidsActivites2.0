import { Download, FolderPlus, Replace, Trash2, Eye } from 'lucide-react';

export default function MediaCardActions({
  image,
  canAddToAlbum,
  canDownload,
  canReplace,
  adding,
  downloading,
  replacing,
  onAddToAlbum,
  onDownload,
  onReplace,
  onDelete,
}) {
  const busy = adding || downloading || replacing;

  return (
    <div className="photo-media-actions" role="menu" aria-label={`Actions for ${image.filename}`}>
      <button
        type="button"
        role="menuitem"
        className="photo-media-actions__item"
        onClick={() => onAddToAlbum?.()}
        disabled={!canAddToAlbum || busy}
      >
        <FolderPlus size={15} aria-hidden />
        Add to album
      </button>
      <button
        type="button"
        role="menuitem"
        className="photo-media-actions__item"
        onClick={() => onDownload?.()}
        disabled={!canDownload || busy}
      >
        <Download size={15} aria-hidden />
        {downloading ? 'Downloading…' : 'Download'}
      </button>
      {canReplace && (
        <button
          type="button"
          role="menuitem"
          className="photo-media-actions__item"
          onClick={() => onReplace?.()}
          disabled={busy}
        >
          <Replace size={15} aria-hidden />
          {replacing ? 'Replacing…' : 'Replace image'}
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="photo-media-actions__item photo-media-actions__item--danger"
        onClick={() => onDelete?.()}
        disabled={busy}
      >
        <Trash2 size={15} aria-hidden />
        Delete
      </button>
    </div>
  );
}

export function MediaCardQuickActions({
  onOpen,
  canAddToAlbum,
  onAddToAlbum,
  adding,
}) {
  return (
    <div className="photo-media-card__quick-actions">
      <button
        type="button"
        className="photo-media-card__quick-btn"
        onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        aria-label="View"
      >
        <Eye size={14} />
      </button>
      {canAddToAlbum && (
        <button
          type="button"
          className="photo-media-card__quick-btn photo-media-card__quick-btn--primary"
          disabled={adding}
          onClick={(e) => { e.stopPropagation(); onAddToAlbum?.(); }}
          aria-label="Add to album"
        >
          <FolderPlus size={14} />
        </button>
      )}
    </div>
  );
}
