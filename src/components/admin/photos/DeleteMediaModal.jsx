import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';
import { isVideoItem } from './utils.js';

export default function DeleteMediaModal({
  target,
  open,
  onClose,
  onConfirm,
  loading,
}) {
  const isVideo = target && isVideoItem(target);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isVideo ? 'Delete video' : 'Delete photo'}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={loading} className="photo-delete-modal__confirm">
            <Trash2 size={15} aria-hidden />
            Delete permanently
          </Button>
        </>
      )}
    >
      <div className="photo-delete-modal">
        <div className="photo-delete-modal__alert" role="alert">
          <AlertTriangle size={20} aria-hidden />
          <p>This action cannot be undone. The file will be removed from your media library.</p>
        </div>
        {target && (
          <div className="photo-delete-modal__preview">
            {(target.thumbnailUrl || target.previewUrl) ? (
              <img
                src={target.thumbnailUrl || target.previewUrl}
                alt=""
                className="photo-delete-modal__thumb"
              />
            ) : (
              <div className="photo-delete-modal__thumb photo-delete-modal__thumb--placeholder" aria-hidden />
            )}
            <div>
              <p className="photo-delete-modal__filename">{target.filename}</p>
              <p className="photo-delete-modal__meta">
                {isVideo ? 'Video' : 'Photo'}
                {target.uploadTime
                  ? ` · ${new Date(target.uploadTime).toLocaleString('en-IN')}`
                  : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
