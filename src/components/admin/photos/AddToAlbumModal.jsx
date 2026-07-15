import { FolderPlus } from 'lucide-react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { formatAlbumLabel, formatAlbumOptionLabel } from './utils.js';

export default function AddToAlbumModal({
  open,
  onClose,
  image,
  albums,
  selectedAlbumId,
  onAlbumChange,
  caption,
  onCaptionChange,
  onConfirm,
  loading,
}) {
  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to album"
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            disabled={!selectedAlbumId}
          >
            <FolderPlus size={15} aria-hidden />
            Add to album
          </Button>
        </>
      )}
    >
      <div className="photo-add-album-modal">
        {image && (
          <div className="photo-add-album-modal__preview">
            {(image.previewUrl || image.downloadUrl) ? (
              <img src={image.previewUrl || image.downloadUrl} alt="" />
            ) : (
              <div className="photo-add-album-modal__placeholder" aria-hidden />
            )}
            <p className="photo-add-album-modal__filename">{image.filename}</p>
          </div>
        )}

        <label className="photo-upload-field">
          <span className="photo-upload-field__label">Target album</span>
          <select
            value={selectedAlbumId}
            onChange={(e) => onAlbumChange(e.target.value)}
            disabled={loading || albums.length === 0}
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
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder={image?.filename || 'Caption'}
            maxLength={200}
            disabled={loading}
          />
        </label>

        {selectedAlbum && (
          <p className="photo-add-album-modal__hint">
            Will be linked to <strong>{formatAlbumLabel(selectedAlbum)}</strong> without re-uploading.
          </p>
        )}
      </div>
    </Modal>
  );
}
