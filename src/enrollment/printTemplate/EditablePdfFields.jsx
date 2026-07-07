import { getNestedValue } from './enrollmentPrintFormData.js';

export default function EditablePdfField({
  field,
  value,
  onChange,
  readOnly = false,
  showCalibration = false,
}) {
  const style = {
    position: 'absolute',
    left: field.x,
    top: field.y,
    width: field.w,
    height: field.h,
    fontSize: field.fontSize || '11pt',
    fontFamily: 'Arial, Helvetica, sans-serif',
    border: showCalibration ? '1px dashed rgba(255,0,0,0.5)' : 'none',
    background: showCalibration ? 'rgba(255,255,0,0.08)' : 'transparent',
    padding: '0 2px',
    margin: 0,
    boxSizing: 'border-box',
    color: '#000',
    lineHeight: 1.2,
  };

  const inputType = field.type === 'date' ? 'date' : 'text';

  return (
    <input
      type={inputType}
      className="printable-field printable-field--text"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      aria-label={field.name}
      style={style}
    />
  );
}

export function EditablePdfCheckbox({
  field,
  checked,
  onChange,
  readOnly = false,
  showCalibration = false,
}) {
  const size = field.w || '12px';
  const style = {
    position: 'absolute',
    left: field.x,
    top: field.y,
    width: size,
    height: field.h || size,
    margin: 0,
    accentColor: '#000',
    cursor: readOnly ? 'default' : 'pointer',
    outline: showCalibration ? '1px dashed rgba(255,0,0,0.5)' : 'none',
  };

  return (
    <input
      type="checkbox"
      className="printable-field printable-field--checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange?.(e.target.checked)}
      disabled={readOnly}
      aria-label={field.name}
      style={style}
    />
  );
}

export function EditablePdfTextarea({
  field,
  value,
  onChange,
  readOnly = false,
  showCalibration = false,
}) {
  const style = {
    position: 'absolute',
    left: field.x,
    top: field.y,
    width: field.w,
    height: field.h,
    fontSize: field.fontSize || '10pt',
    fontFamily: 'Arial, Helvetica, sans-serif',
    border: showCalibration ? '1px dashed rgba(255,0,0,0.5)' : 'none',
    background: showCalibration ? 'rgba(255,255,0,0.08)' : 'transparent',
    padding: '1px 2px',
    margin: 0,
    resize: 'none',
    boxSizing: 'border-box',
    color: '#000',
    lineHeight: 1.25,
    overflow: 'hidden',
  };

  return (
    <textarea
      className="printable-field printable-field--textarea"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      aria-label={field.name}
      style={style}
    />
  );
}

export function EditablePhotoBox({
  field,
  value,
  onChange,
  readOnly = false,
  showCalibration = false,
}) {
  const style = {
    position: 'absolute',
    left: field.x,
    top: field.y,
    width: field.w,
    height: field.h,
    border: showCalibration ? '1px dashed rgba(255,0,0,0.5)' : 'none',
    background: showCalibration ? 'rgba(255,255,0,0.08)' : 'transparent',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: readOnly ? 'default' : 'pointer',
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <label className="printable-field printable-field--photo" style={style} aria-label={field.name}>
      {value ? (
        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        !readOnly && <span className="printable-photo-placeholder">Photo</span>
      )}
      {!readOnly && (
        <input type="file" accept="image/*" onChange={handleFile} className="printable-photo-input" />
      )}
    </label>
  );
}

export function EditableSignatureBox({
  field,
  value,
  onChange,
  readOnly = false,
  showCalibration = false,
}) {
  const style = {
    position: 'absolute',
    left: field.x,
    top: field.y,
    width: field.w,
    height: field.h,
    fontSize: field.fontSize || '14pt',
    fontFamily: '"Segoe Script", "Brush Script MT", cursive',
    border: showCalibration ? '1px dashed rgba(255,0,0,0.5)' : 'none',
    borderBottom: showCalibration ? undefined : '1px solid transparent',
    background: showCalibration ? 'rgba(255,255,0,0.08)' : 'transparent',
    padding: '2px 4px',
    margin: 0,
    boxSizing: 'border-box',
    color: '#000',
  };

  const isDataUrl = typeof value === 'string' && value.startsWith('data:image');

  if (isDataUrl) {
    return (
      <div className="printable-field printable-field--signature" style={style}>
        <img src={value} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }

  return (
    <input
      type="text"
      className="printable-field printable-field--signature"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={readOnly ? '' : 'Type signature'}
      aria-label={field.name}
      style={style}
    />
  );
}

export function PrintFieldRenderer({
  field,
  formData,
  onFieldChange,
  readOnly,
  showCalibration,
  isAdmin,
}) {
  if (field.adminOnly && !isAdmin) return null;

  const fieldReadOnly = readOnly || (field.adminOnly && !isAdmin) || field.readOnly;
  const value = getNestedValue(formData, field.name);

  const onChange = (v) => onFieldChange(field.name, v);

  switch (field.type) {
    case 'checkbox':
      return (
        <EditablePdfCheckbox
          field={field}
          checked={value}
          onChange={onChange}
          readOnly={fieldReadOnly}
          showCalibration={showCalibration}
        />
      );
    case 'textarea':
      return (
        <EditablePdfTextarea
          field={field}
          value={value}
          onChange={onChange}
          readOnly={fieldReadOnly}
          showCalibration={showCalibration}
        />
      );
    case 'photo':
      return (
        <EditablePhotoBox
          field={field}
          value={value}
          onChange={onChange}
          readOnly={fieldReadOnly}
          showCalibration={showCalibration}
        />
      );
    case 'signature':
      return (
        <EditableSignatureBox
          field={field}
          value={value}
          onChange={onChange}
          readOnly={fieldReadOnly}
          showCalibration={showCalibration}
        />
      );
    default:
      return (
        <EditablePdfField
          field={field}
          value={value}
          onChange={onChange}
          readOnly={fieldReadOnly}
          showCalibration={showCalibration}
        />
      );
  }
}
