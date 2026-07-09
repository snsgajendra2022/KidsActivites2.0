import '../../styles/toggle-switch.css';

export default function ToggleSwitch({  checked = false,
  onChange,
  label,
  disabled = false,
  id,
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`sb-switch${checked ? ' sb-switch--on' : ''}${disabled ? ' sb-switch--disabled' : ''}`}
    >
      <span className="sb-switch__thumb" aria-hidden="true" />
    </button>
  );
}
