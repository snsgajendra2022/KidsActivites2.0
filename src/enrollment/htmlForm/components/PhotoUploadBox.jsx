export default function PhotoUploadBox({
  label,
  value,
  onChange,
  readOnly = false,
  className = '',
}) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`html-form-photo-box ${className}`.trim()}>
      {label && <span className="html-form-photo-box__label">{label}</span>}
      <label className="html-form-photo-box__frame">
        {value ? (
          <img src={value} alt={label || 'Photo'} className="html-form-photo-box__img" />
        ) : (
          <span className="html-form-photo-box__placeholder">Paste / Upload Photo</span>
        )}
        {!readOnly && (
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="html-form-photo-box__input no-print"
          />
        )}
      </label>
    </div>
  );
}
