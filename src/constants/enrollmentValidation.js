export const VALIDATION_PRESETS = [
  { value: '', label: 'Auto (from field type)' },
  { value: 'name', label: 'Person name' },
  { value: 'email', label: 'Email address' },
  { value: 'mobile_in', label: 'Indian mobile (10 digits)' },
  { value: 'pincode_in', label: 'Indian PIN code (6 digits)' },
  { value: 'postal_code', label: 'Postal / ZIP code (international)' },
  { value: 'aadhaar', label: 'Aadhaar (12 digits)' },
  { value: 'alphabets', label: 'Letters and spaces only' },
  { value: 'alphanumeric', label: 'Letters and numbers' },
  { value: 'numeric', label: 'Numbers only' },
];

/** @typedef {{ preset?: string, minLength?: number, maxLength?: number, min?: number, max?: number, minAge?: number, maxAge?: number, pattern?: string, patternMessage?: string, maxSizeMB?: number }} FieldValidation */

export const PRESET_RULES = {
  name: {
    pattern: /^[a-zA-Z.\s'-]{2,100}$/,
    message: 'Please enter a valid name (letters, spaces, dots, hyphens).',
    minLength: 2,
    maxLength: 100,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
    maxLength: 120,
  },
  mobile_in: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit mobile number starting with 6–9.',
    transform: (value) => String(value || '').replace(/\D/g, '').slice(-10),
    maxLength: 10,
  },
  pincode_in: {
    pattern: /^[1-9]\d{5}$/,
    message: 'Please enter a valid 6-digit PIN code.',
    transform: (value) => String(value || '').replace(/\D/g, '').slice(0, 6),
    maxLength: 6,
  },
  postal_code: {
    pattern: /^[A-Z0-9][A-Z0-9\s-]{2,9}$/i,
    message: 'Please enter a valid postal / ZIP code (3–10 characters).',
    transform: (value) => String(value || '').trim().toUpperCase(),
    minLength: 3,
    maxLength: 10,
  },
  aadhaar: {
    pattern: /^\d{12}$/,
    message: 'Please enter a valid 12-digit Aadhaar number.',
    transform: (value) => String(value || '').replace(/\D/g, '').slice(0, 12),
    maxLength: 12,
  },
  alphabets: {
    pattern: /^[a-zA-Z\s]+$/,
    message: 'Only letters and spaces are allowed.',
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9\s]+$/,
    message: 'Only letters, numbers, and spaces are allowed.',
  },
  numeric: {
    pattern: /^\d+$/,
    message: 'Only numbers are allowed.',
  },
};

export function getDefaultValidationForType(type) {
  if (type === 'email') return { preset: 'email' };
  if (type === 'tel') return { preset: 'mobile_in' };
  return {};
}

export function getValidationHint(field, context = {}) {
  // Dropdowns, radios, checkboxes, location & files: label * and placeholder are enough.
  const noHintTypes = ['select', 'radio', 'checkbox', 'country', 'state', 'city', 'file'];
  if (noHintTypes.includes(field.type)) return '';

  const v = field.validation || {};
  const preset = v.preset ? PRESET_RULES[v.preset] : null;
  const parts = [];

  if (field.type === 'email' || v.preset === 'email') {
    parts.push('Valid email format');
  }
  if (v.preset === 'name') parts.push('Letters, spaces, dots, hyphens');
  if (v.preset === 'mobile_in' || field.type === 'tel') parts.push('10-digit mobile');
  if (field.key === 'pinCode' || v.preset === 'pincode_in' || v.preset === 'postal_code') {
    if (context.countryCode && context.countryCode !== 'IN') {
      parts.push('3–10 character postal code');
    } else if (v.preset === 'postal_code') {
      parts.push('3–10 character postal code');
    } else {
      parts.push('6-digit PIN');
    }
  }
  if (v.preset === 'aadhaar') parts.push('12-digit Aadhaar');
  if (v.minLength) parts.push(`Min ${v.minLength} characters`);
  if (v.maxLength) parts.push(`Max ${v.maxLength} characters`);
  else if (preset?.maxLength) parts.push(`Max ${preset.maxLength} characters`);
  if (v.minAge != null) parts.push(`Min age ${v.minAge}`);
  if (v.maxAge != null) parts.push(`Max age ${v.maxAge}`);

  return parts.join(' · ');
}
