const HIDDEN_FIELD_KEYS = new Set(['countryCode', 'stateCode', 'sameAsCurrent']);

export function formatFieldLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function formatDisplayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function formatGender(value) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatTimelineDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function objectToInfoItems(data, { excludeKeys = [] } = {}) {
  const hidden = new Set([...HIDDEN_FIELD_KEYS, ...excludeKeys]);
  return Object.entries(data || {})
    .filter(([key, value]) => !hidden.has(key)
      && value !== null
      && value !== undefined
      && value !== ''
      && typeof value !== 'object')
    .map(([key, value]) => ({
      label: formatFieldLabel(key),
      value: formatDisplayValue(value),
    }));
}

export function docStatusKey(status) {
  if (status === 'verified') return 'documents_verified';
  if (status === 'rejected') return 'rejected';
  return 'documents_pending';
}

export function feeStatusLabel(status) {
  const labels = {
    fee_pending: 'Payment Pending',
    payment_submitted: 'Payment Submitted',
    verified: 'Paid & Verified',
  };
  return labels[status] || formatFieldLabel(status || 'unknown');
}
