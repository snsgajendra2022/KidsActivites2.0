import { Replace, Upload } from 'lucide-react';
import Modal from '../../ui/Modal.jsx';
import Button from '../../ui/Button.jsx';

export default function ReplacePhotoModal({
  target,
  open,
  onClose,
  onChooseFile,
  loading,
  uploadLimitHint,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Replace image"
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onChooseFile} loading={loading}>
            <Upload size={15} aria-hidden />
            Choose replacement
          </Button>
        </>
      )}
    >
      <div className="photo-replace-modal">
        {target && (
          <div className="photo-replace-modal__current">
            <p className="photo-replace-modal__label">Current image</p>
            <div className="photo-replace-modal__preview">
              {(target.previewUrl || target.downloadUrl) ? (
                <img
                  src={target.previewUrl || target.downloadUrl}
                  alt=""
                />
              ) : (
                <div className="photo-replace-modal__placeholder" aria-hidden />
              )}
              <span className="photo-replace-modal__name">{target.filename}</span>
            </div>
          </div>
        )}

        <div className="photo-replace-modal__info">
          <Replace size={18} aria-hidden />
          <div>
            <p>
              Choose a new image file to replace <strong>{target?.filename || 'this image'}</strong>.
              The same media ID will be kept so album links stay valid.
            </p>
            <p className="photo-replace-modal__limits">{uploadLimitHint}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
