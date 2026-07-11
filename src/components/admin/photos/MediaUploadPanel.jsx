import { useRef } from 'react';
import { Upload, X, FileImage, Film, Loader2 } from 'lucide-react';
import Button from '../../ui/Button.jsx';
import { ACCEPTED_MEDIA, formatAlbumLabel, formatAlbumOptionLabel } from './utils.js';
import { isVideoMediaFile } from '../../../utils/mediaUploadLimits.js';

function PendingFileItem({ file, previewUrl, onRemove, disabled }) {
  const isVideo = isVideoMediaFile(file);
  return (
    <li className="photo-upload-preview__item">
      <div className="photo-upload-preview__thumb">
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <span className="photo-upload-preview__icon" aria-hidden>
            {isVideo ? <Film size={18} /> : <FileImage size={18} />}
          </span>
        )}
      </div>
      <div className="photo-upload-preview__meta">
        <span className="photo-upload-preview__name" title={file.name}>{file.name}</span>
        <span className="photo-upload-preview__size">
          {(file.size / (1024 * 1024)).toFixed(1)} MB · {isVideo ? 'Video' : 'Photo'}
        </span>
      </div>
      {!disabled && (
        <button
          type="button"
          className="photo-upload-preview__remove"
          onClick={() => onRemove(file)}
          aria-label={`Remove ${file.name}`}
        >
          <X size={14} />
        </button>
      )}
    </li>
  );
}

export default function MediaUploadPanel({
  id = 'media-upload-panel',
  visible,
  albums,
  selectedAlbumId,
  onAlbumChange,
  uploadCaption,
  onCaptionChange,
  uploadLimitHint,
  uploading,
  uploadProgress,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  pendingFiles,
  pendingPreviews,
  onRemovePendingFile,
  onChooseFiles,
  onUpload,
  onFileInputChange,
  fileInputRef,
  replaceInputRef,
  onReplaceFileChange,
}) {
  const internalFileRef = useRef(null);
  const inputRef = fileInputRef || internalFileRef;

  if (!visible) return null;

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);

  return (
    <section
      id={id}
      className={`photo-upload-panel premium-card${dragOver ? ' is-dragover' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label="Upload media"
    >
      <div className="photo-upload-panel__grid">
        <div className="photo-upload-panel__left">
          <h2 className="photo-upload-panel__heading">Upload to album</h2>
          <p className="photo-upload-panel__hint">
            Choose a class album, add an optional caption, then upload new files or use the + button on existing items.
          </p>

          <label className="photo-upload-field">
            <span className="photo-upload-field__label">Target album</span>
            <select
              value={selectedAlbumId}
              onChange={(e) => onAlbumChange(e.target.value)}
              disabled={uploading || albums.length === 0}
              aria-required="true"
            >
              <option value="">
                {albums.length === 0 ? 'No albums available' : 'Select an album…'}
              </option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {formatAlbumOptionLabel(album)}
                </option>
              ))}
            </select>
          </label>

          <label className="photo-upload-field">
            <span className="photo-upload-field__label">Caption (optional)</span>
            <input
              type="text"
              value={uploadCaption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="e.g. Sports day"
              maxLength={200}
              disabled={uploading}
            />
          </label>

          <p className="photo-upload-panel__limits">{uploadLimitHint}</p>
        </div>

        <div className="photo-upload-panel__right">
          <div
            className="photo-upload-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => !uploading && onChooseFiles?.()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                e.preventDefault();
                onChooseFiles?.();
              }
            }}
            aria-label="Drop files here or click to choose"
          >
            <Upload size={28} className="photo-upload-dropzone__icon" aria-hidden />
            <p className="photo-upload-dropzone__title">Drag &amp; drop files here</p>
            <p className="photo-upload-dropzone__sub">
              {selectedAlbum
                ? `Uploading to ${formatAlbumLabel(selectedAlbum)}`
                : 'Select an album first, then add photos or videos'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading || !selectedAlbumId}
              onClick={(e) => { e.stopPropagation(); onChooseFiles?.(); }}
            >
              Choose files
            </Button>
          </div>

          {pendingFiles.length > 0 && (
            <div className="photo-upload-preview">
              <div className="photo-upload-preview__header">
                <span>{pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected</span>
                {uploading && (
                  <span className="photo-upload-preview__progress" aria-live="polite">
                    <Loader2 size={14} className="photo-sharing-spin" aria-hidden />
                    Uploading… {uploadProgress}%
                  </span>
                )}
              </div>
              <ul className="photo-upload-preview__list" aria-label="Selected files">
                {pendingFiles.map((file, index) => (
                  <PendingFileItem
                    key={`${file.name}-${file.size}-${index}`}
                    file={file}
                    previewUrl={pendingPreviews[index]}
                    onRemove={onRemovePendingFile}
                    disabled={uploading}
                  />
                ))}
              </ul>
              {!uploading && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={!selectedAlbumId}
                  onClick={onUpload}
                  className="photo-upload-preview__submit"
                >
                  Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
                </Button>
              )}
              {uploading && (
                <div
                  className="photo-upload-progress"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                >
                  <div
                    className="photo-upload-progress__bar"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        multiple
        className="photo-upload-panel__input"
        onChange={onFileInputChange}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        className="photo-upload-panel__input"
        onChange={onReplaceFileChange}
        tabIndex={-1}
        aria-hidden
      />
    </section>
  );
}
