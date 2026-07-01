import { Upload, X, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import Button from './Button.jsx';

export default function FileUpload({
  label, accept = '.jpg,.jpeg,.png,.pdf', maxSizeMB = 5, value, onChange, error, required,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      onChange?.(null, `File size must be less than ${maxSizeMB} MB.`);
      return;
    }
    onChange?.({ name: file.name, size: file.size, type: file.type, file });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="form-field full">
      {label && (
        <label className="form-label">
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      {!value ? (
        <div
          className={`file-upload ${dragOver ? 'dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="file-upload-icon"><Upload size={28} /></div>
          <div className="file-upload-text">Drag and drop or browse file</div>
          <div className="file-upload-hint">JPG, PNG, PDF up to {maxSizeMB} MB</div>
          <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="file-preview">
          <FileText size={20} color="var(--primary)" />
          <span className="file-preview-name">{value.name}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange?.(null)}><X size={16} /></Button>
        </div>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
