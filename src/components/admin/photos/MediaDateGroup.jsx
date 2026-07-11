import MediaCard from './MediaCard.jsx';

export default function MediaDateGroup({
  group,
  viewMode,
  localPreviews,
  localPreviewsByFilename,
  resolveLocalPreview,
  onOpen,
  onDelete,
  onDownload,
  onReplace,
  onAddToAlbum,
  canAddToAlbum,
  linkingId,
  downloadingId,
  replacingId,
  highlightedIds,
}) {
  return (
    <section className="photo-media-group" aria-labelledby={`group-${group.dateKey}`}>
      <h3 className="photo-media-group__title" id={`group-${group.dateKey}`}>
        {group.label}
        <span className="photo-media-group__count">{group.images.length}</span>
      </h3>
      <div className={`photo-media-grid photo-media-grid--${viewMode}`}>
        {group.images.map((image) => (
          <MediaCard
            key={image.id}
            image={image}
            viewMode={viewMode}
            localPreviewUrl={resolveLocalPreview(
              image,
              localPreviews,
              localPreviewsByFilename,
            )}
            onOpen={onOpen}
            onDelete={onDelete}
            onDownload={onDownload}
            onReplace={onReplace}
            onAddToAlbum={onAddToAlbum}
            canAddToAlbum={canAddToAlbum}
            adding={linkingId === image.id}
            downloading={downloadingId === image.id}
            replacing={replacingId === image.id}
            isHighlighted={highlightedIds.has(String(image.id))}
          />
        ))}
      </div>
    </section>
  );
}
