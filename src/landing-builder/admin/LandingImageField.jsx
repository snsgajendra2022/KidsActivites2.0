import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { landingPageAction } from '../../services/landingPageApi.js';
import { IMAGE_SPECS, formatPx, specHint, validateLandingImage } from '../imageSpecs.js';

/**
 * Landing builder image uploader with strict size validation.
 * Wrong-size files are rejected (no onChange) and shown in red.
 */
export default function LandingImageField({ label, value, onChange, schoolId, spec }) {
  const { toast } = useToast();
  const resolvedSpec = spec || IMAGE_SPECS.default;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [actualSize, setActualSize] = useState('');
  const [dragging, setDragging] = useState(false);
  const hint = specHint(resolvedSpec);
  const hasError = Boolean(error);

  const rejectUpload = (message, actual = '') => {
    setError(message);
    setActualSize(actual);
    toast(message, 'error');
  };

  const processFile = async (file) => {
    if (!file) return;
    setError('');
    setActualSize('');

    const check = await validateLandingImage(file, resolvedSpec);
    if (!check.ok) {
      rejectUpload(check.error, check.actual || '');
      return;
    }

    setUploading(true);
    try {
      // Multipart CDN upload (File). Do not persist huge data URLs in drafts.
      const result = await landingPageAction('uploadAsset', {
        field: label,
        fileName: file.name,
        mimeType: file.type || 'image/png',
        file,
        width: check.width,
        height: check.height,
      }, { schoolId });
      if (!result?.url) throw new Error('Upload returned no URL');
      onChange(result.url);
      setError('');
      setActualSize('');
    } catch (err) {
      rejectUpload(err?.message || 'Upload failed. Image was not saved.');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await processFile(file);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    await processFile(e.dataTransfer?.files?.[0]);
  };

  return (
    <div className={`landing-builder__image-field${hasError ? ' landing-builder__image-field--error' : ''}`}>
      <p className={`landing-builder__field-label${hasError ? ' landing-builder__field-label--error' : ''}`}>{label}</p>

      <div className={`landing-builder__image-req${hasError ? ' landing-builder__image-req--error' : ''}`}>
        {hint}
      </div>

      <div
        className={`landing-builder__image-drop${dragging ? ' landing-builder__image-drop--active' : ''}${hasError ? ' landing-builder__image-drop--error' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={onDrop}
      >
        <div className="landing-builder__image-row">
          {value && !hasError ? (
            <img src={value} alt="" className="landing-builder__image-thumb" />
          ) : (
            <div className={`landing-builder__image-empty${hasError ? ' landing-builder__image-empty--error' : ''}`}>
              {hasError ? 'Not accepted' : 'No image'}
            </div>
          )}
          <div className="landing-builder__image-actions">
            <label className={`premium-btn premium-btn-secondary premium-btn-sm${uploading ? ' is-disabled' : ''}${hasError ? ' landing-builder__upload-btn--error' : ''}`}>
              {uploading ? 'Uploading…' : 'Select image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
            {value && (
              <button
                type="button"
                className="premium-btn premium-btn-secondary premium-btn-sm"
                onClick={() => { setError(''); setActualSize(''); onChange(null); }}
                disabled={uploading}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <p className={`landing-builder__image-drop-hint${hasError ? ' landing-builder__image-drop-hint--error' : ''}`}>
          {dragging
            ? 'Drop to upload'
            : hasError
              ? 'Upload blocked — pick an image that matches the required size.'
              : 'Drag & drop here, or click Select image'}
        </p>
      </div>

      {hasError && (
        <div className="landing-builder__image-error-box" role="alert">
          <p className="landing-builder__field-error">{error}</p>
          <p className="landing-builder__image-error-required">
            Required: <strong>{formatPx(resolvedSpec.width, resolvedSpec.height)}</strong>
            {actualSize ? <> · Yours: <strong>{actualSize}</strong></> : null}
          </p>
        </div>
      )}
    </div>
  );
}
