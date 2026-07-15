import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { MENU_ICON_MAP, MENU_ICON_OPTIONS } from '../../constants/menuIcons.js';
import ToggleSwitch from '../ui/ToggleSwitch.jsx';

function IconPreview({ name, size = 18 }) {
  const Icon = MENU_ICON_MAP[name] || MENU_ICON_MAP.Circle;
  return <Icon size={size} />;
}

function VisibilityToggle({ checked, onChange, label }) {
  return (
    <ToggleSwitch
      checked={checked}
      onChange={onChange}
      label={label}
    />
  );
}

export function MenuItemRow({
  item,
  label,
  icon,
  path,
  visible,
  builtin = true,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onLabelChange,
  onIconChange,
  onPathChange,
  onVisibleChange,
  onRemove,
}) {
  return (
    <div className="portal-menu-row">
      <div className="portal-menu-row__reorder">
        <button
          type="button"
          className="portal-menu-row__move"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={`Move ${label} up`}
          title="Move up"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          className="portal-menu-row__move"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={`Move ${label} down`}
          title="Move down"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="portal-menu-row__icon-picker">
        <span className="portal-menu-row__icon-preview" aria-hidden>
          <IconPreview name={icon} />
        </span>
        <select
          value={icon}
          onChange={(e) => onIconChange(e.target.value)}
          className="portal-menu-row__icon-select"
          aria-label={`Icon for ${label}`}
        >
          {MENU_ICON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="portal-menu-row__fields">
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="portal-menu-row__label-input"
          placeholder="Menu label"
        />
        <input
          type="text"
          value={path}
          onChange={(e) => onPathChange?.(e.target.value)}
          className="portal-menu-row__path-input"
          placeholder="/path"
          readOnly={builtin}
          disabled={builtin}
        />
      </div>

      <div className="portal-menu-row__actions">
        <VisibilityToggle
          checked={visible}
          onChange={onVisibleChange}
          label={`${visible ? 'Hide' : 'Show'} ${label}`}
        />
        {!builtin && onRemove && (
          <button
            type="button"
            className="portal-menu-row__delete"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function AddMenuButton({ onClick }) {
  return (
    <button type="button" className="portal-menu-add-btn" onClick={onClick}>
      <Plus size={16} />
      Add Side Menu Item
    </button>
  );
}
