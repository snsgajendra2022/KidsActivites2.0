import {
  AlertCircle, CheckCircle2, Film, RotateCcw, X,
} from 'lucide-react';
import { MAX_RETRIES, getUploadSpeedLabel } from '../../utils/classroomUploadQueue.js';
import { isVideoQueueItem } from '../../utils/mediaUploadLimits.js';

function QueueItemThumb({ item, previewUrl }) {
  const isVideo = isVideoQueueItem(item);
  const isFailed = item.status === 'failed';
  const isCompleted = item.status === 'completed';

  if (previewUrl && isVideo) {
    return (
      <div className="send-photos-queue__thumb send-photos-queue__thumb--video">
        <video
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          className="send-photos-queue__thumb-media"
          aria-hidden
        />
        <span className="send-photos-queue__thumb-badge" aria-hidden>
          <Film size={12} />
        </span>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="send-photos-queue__thumb">
        <img src={previewUrl} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={`send-photos-queue__thumb${isVideo ? ' send-photos-queue__thumb--video-fallback' : ''}`}>
      {isVideo ? (
        <Film size={20} aria-hidden />
      ) : isFailed ? (
        <AlertCircle size={20} aria-hidden />
      ) : isCompleted ? (
        <CheckCircle2 size={20} aria-hidden />
      ) : null}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatRelativeTime(timestamp) {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function statusLabel(status) {
  switch (status) {
    case 'completed': return 'Done';
    case 'failed': return 'Failed';
    case 'paused': return 'Paused';
    case 'uploading': return 'Uploading';
    default: return 'Waiting';
  }
}

export default function ClassroomUploadQueuePanel({
  items,
  thumbnailUrls = new Map(),
  hasActiveBatch = false,
  remainingCount = 0,
  finishedCount = 0,
  onCancel,
  onCancelAll,
  onRemove,
  onRetry,
  onClearFinished,
  className = 'send-photos-card send-photos-queue',
  title = 'Upload queue',
}) {
  if (!items.length) return null;

  return (
    <section className={className}>
      <div className="send-photos-queue__header">
        <span className="send-photos-card__label" style={{ marginBottom: 0 }}>{title}</span>
        <div className="send-photos-queue__header-actions">
          {hasActiveBatch && onCancelAll && (
            <button type="button" className="send-photos-queue__cancel-all" onClick={onCancelAll}>
              Cancel all
            </button>
          )}
          <span className="send-photos-queue__count">{remainingCount} remaining</span>
        </div>
      </div>
      <div className="send-photos-queue__grid">
        {items.map((item) => {
          const previewUrl = thumbnailUrls.get(item.id) ?? null;
          const isItemUploading = item.status === 'uploading';
          const isCompleted = item.status === 'completed';
          const isFailed = item.status === 'failed';
          const progressPct = isCompleted ? 100 : item.progress;
          const speedLabel = getUploadSpeedLabel(item);
          const isWaiting = item.status === 'waiting' || item.status === 'paused';

          return (
            <article
              key={item.id}
              className={`send-photos-queue__item${isItemUploading ? ' is-uploading' : ''}${isFailed ? ' is-failed' : ''}`}
            >
              <div className="send-photos-queue__item-top">
                <QueueItemThumb item={item} previewUrl={previewUrl} />
                <div className="send-photos-queue__meta">
                  <strong title={item.fileName}>{item.fileName}</strong>
                  <span>{formatFileSize(item.fileSize)} · {formatRelativeTime(item.createdAt)}</span>
                </div>
                {(item.status === 'waiting' || item.status === 'failed' || item.status === 'paused') && onRemove && (
                  <button type="button" className="send-photos-queue__remove" onClick={() => onRemove(item.id)} aria-label="Remove from queue">
                    <X size={16} />
                  </button>
                )}
                {isItemUploading && onCancel && (
                  <button type="button" className="send-photos-queue__cancel" onClick={() => onCancel(item.id)} aria-label="Cancel upload">
                    Cancel
                  </button>
                )}
              </div>
              <div className="send-photos-queue__progress-row">
                <span className={`send-photos-queue__status send-photos-queue__status--${item.status}`}>
                  {statusLabel(item.status)}
                </span>
                {isFailed && onRetry ? (
                  <button type="button" className="send-photos-queue__retry" onClick={() => onRetry(item.id)}>
                    <RotateCcw size={12} />
                    Retry
                  </button>
                ) : (
                  <span className="send-photos-queue__pct">{progressPct}%</span>
                )}
              </div>
              <div className="send-photos-queue__bar">
                <div
                  className={`send-photos-queue__bar-fill send-photos-queue__bar-fill--${item.status}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {speedLabel && (isItemUploading || isWaiting) && (
                <p className="send-photos-queue__speed">{speedLabel}</p>
              )}
              {item.error && (
                <p className="send-photos-queue__error">
                  {item.error}
                  {item.retries > 0 && ` (retry ${item.retries}/${MAX_RETRIES})`}
                </p>
              )}
              {item.status === 'paused' && (
                <p className="send-photos-queue__paused">Paused — will resume when back online</p>
              )}
              {item.successMessage && isCompleted && (
                <p className="send-photos-queue__success">{item.successMessage}</p>
              )}
            </article>
          );
        })}
      </div>
      {finishedCount > 0 && onClearFinished && (
        <button type="button" className="send-photos-queue__clear" onClick={onClearFinished}>
          Clear finished ({finishedCount})
        </button>
      )}
    </section>
  );
}
