import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  UploadCloud, X, FileText, Eye, RefreshCw, WifiOff, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../ui/Button.jsx';
import DocumentPreviewModal from '../documents/DocumentPreviewModal.jsx';
import { useNetworkStore } from '../../store/networkStore.js';
import { useUploadStore } from '../../store/uploadStore.js';
import { uploadFile } from '../../services/uploadService.js';
import {
  validateFile, formatFileSize, FILE_RULES, UPLOAD_STATUS, UPLOAD_STATUS_LABELS,
} from '../../utils/uploadValidation.js';
import { canPreviewDocument } from '../../utils/documentPreview.js';
import { cn } from '../../lib/cn.js';
import '../../styles/document-preview.css';

const STATUS_ICON = {
  [UPLOAD_STATUS.UPLOADED]: CheckCircle2,
  [UPLOAD_STATUS.FAILED]: AlertTriangle,
  [UPLOAD_STATUS.PAUSED]: WifiOff,
  [UPLOAD_STATUS.WAITING_FOR_INTERNET]: WifiOff,
  [UPLOAD_STATUS.UPLOADING]: UploadCloud,
};

export default function SmartFileUpload({
  fieldKey,
  label,
  required = false,
  category = 'document',
  maxSizeMB,
  value,
  onChange,
  error: externalError,
  rejectionReason,
  applicationId = null,
  schoolId = null,
}) {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const item = useUploadStore((s) => s.getByField(fieldKey));
  const { addItem, updateItem, removeItem } = useUploadStore();

  const rules = FILE_RULES[category];
  const accept = rules.accept.join(',');

  const startUpload = useCallback(async (uploadItem) => {
    if (!uploadItem) return;

    if (!isOnline) {
      updateItem(uploadItem.id, { status: UPLOAD_STATUS.WAITING_FOR_INTERNET });
      toast.warning('Upload paused due to internet issue.');
      return;
    }

    abortRef.current = new AbortController();
    updateItem(uploadItem.id, { status: UPLOAD_STATUS.UPLOADING, progress: 0, error: null });

    try {
      const result = await uploadFile({
        file: uploadItem.file,
        fieldKey,
        isOnline: () => useNetworkStore.getState().isOnline,
        signal: abortRef.current.signal,
        onProgress: (progress) => updateItem(uploadItem.id, { progress }),
        applicationId,
        schoolId,
      });

      if (result.success) {
        const patch = { status: UPLOAD_STATUS.UPLOADED, progress: 100 };
        if (!uploadItem.previewUrl && result.data?.previewUrl) {
          patch.previewUrl = result.data.previewUrl;
        }
        updateItem(uploadItem.id, patch);
        onChange?.(result.data);
        toast.success('File uploaded successfully.');
      } else {
        updateItem(uploadItem.id, { status: result.status, error: result.error, progress: 0 });
        if (result.status === UPLOAD_STATUS.PAUSED) {
          toast.warning('Upload paused due to network issue.');
        } else {
          toast.error(result.error || 'Upload failed. Please retry.');
        }
      }
    } catch (err) {
      const message = err?.message || 'Upload failed. Please retry.';
      updateItem(uploadItem.id, { status: UPLOAD_STATUS.FAILED, error: message, progress: 0 });
      toast.error(message);
    }
  }, [fieldKey, isOnline, onChange, updateItem, applicationId, schoolId]);

  const handleFileSelect = (file) => {
    if (!file) return;
    const validation = validateFile(file, category, { maxSizeMB });
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    const id = addItem(fieldKey, file);
    const uploadItem = useUploadStore.getState().getByField(fieldKey);
    startUpload(uploadItem);
  };

  const handleRetry = () => {
    if (!item) return;
    updateItem(item.id, { status: UPLOAD_STATUS.RETRYING, error: null });
    toast.info('Retrying upload...');
    startUpload({ ...item, status: UPLOAD_STATUS.RETRYING });
  };

  const handleRemove = () => {
    if (item) removeItem(item.id);
    onChange?.(null);
  };

  const previewDoc = useMemo(() => {
    if (!item && !value) return null;
    return {
      name: value?.name || item?.file?.name,
      size: value?.size ?? item?.file?.size,
      type: value?.type || item?.file?.type,
      previewUrl: item?.previewUrl || value?.previewUrl || null,
      dataUrl: value?.dataUrl,
      fileKey: value?.fileKey,
      downloadUrl: value?.downloadUrl,
      status: value?.status || 'uploaded',
    };
  }, [item, value]);

  const canPreview = Boolean(previewDoc?.name && (canPreviewDocument(previewDoc) || item?.previewUrl || item?.file));

  // Resume paused uploads when back online
  useEffect(() => {
    if (isOnline && item && [UPLOAD_STATUS.PAUSED, UPLOAD_STATUS.WAITING_FOR_INTERNET, UPLOAD_STATUS.RETRYING].includes(item.status)) {
      startUpload(item);
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayValue = item || (value ? { file: { name: value.name, size: value.size }, status: UPLOAD_STATUS.UPLOADED, progress: 100 } : null);
  const StatusIcon = displayValue ? STATUS_ICON[displayValue.status] || FileText : UploadCloud;

  return (
    <div className="form-field full">
      {label && (
        <label className="form-label">
          {label}{required && <span className="required">*</span>}
        </label>
      )}

      {!displayValue ? (
        <div
          className={cn('file-upload', !isOnline && 'opacity-75')}
          onClick={() => isOnline && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <div className="file-upload-icon">
            {!isOnline ? <WifiOff size={28} /> : <UploadCloud size={28} />}
          </div>
          <div className="file-upload-text">
            {!isOnline ? 'Waiting for internet connection' : 'Drag and drop or browse file'}
          </div>
          <div className="file-upload-hint">{rules.label} up to {rules.maxSizeMB} MB</div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="upload-item-card">
          <div className="upload-item-header">
            <StatusIcon size={20} className={displayValue.status === UPLOAD_STATUS.UPLOADED ? 'text-green-600' : 'text-blue-600'} />
            <div className="upload-item-info">
              <span className="upload-item-name">{displayValue.file?.name || value?.name}</span>
              <span className="upload-item-meta">
                {formatFileSize(displayValue.file?.size || value?.size || 0)}
                {' · '}
                {UPLOAD_STATUS_LABELS[displayValue.status] || displayValue.status}
              </span>
            </div>
            <div className="upload-item-actions">
              {canPreview && (
                <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} aria-label="Preview">
                  <Eye size={16} />
                </Button>
              )}
              {[UPLOAD_STATUS.FAILED, UPLOAD_STATUS.PAUSED, UPLOAD_STATUS.WAITING_FOR_INTERNET].includes(displayValue.status) && (
                <Button variant="ghost" size="sm" onClick={handleRetry} aria-label="Retry"><RefreshCw size={16} /></Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleRemove} aria-label="Remove"><X size={16} /></Button>
            </div>
          </div>

          {displayValue.status === UPLOAD_STATUS.UPLOADING && (
            <div className="upload-progress-wrap">
              <div className="upload-progress-bar" style={{ width: `${displayValue.progress || 0}%` }} />
              <span className="upload-progress-text">{displayValue.progress || 0}%</span>
            </div>
          )}

          {displayValue.error && <span className="form-error">{displayValue.error}</span>}
          {rejectionReason && (
            <div className="upload-rejection">
              <AlertTriangle size={14} />
              Document rejected: {rejectionReason}
            </div>
          )}
        </div>
      )}

      {(externalError) && <span className="form-error">{externalError}</span>}

      <DocumentPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        docKey={fieldKey}
        doc={previewDoc}
      />
    </div>
  );
}
