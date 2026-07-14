import { Country } from 'country-state-city';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/** Digits-only national number length by dial code (loose defaults). */
const NATIONAL_LENGTH = {
  1: { min: 10, max: 10 },
  91: { min: 10, max: 10 },
  44: { min: 10, max: 11 },
  61: { min: 9, max: 9 },
  971: { min: 9, max: 9 },
};

let dialCodeOptionsCache = null;

/** Unique dial codes for the selector — label is code only (e.g. +91). */
export function getDialCodeOptions() {
  if (dialCodeOptionsCache) return dialCodeOptionsCache;
  const map = new Map();
  for (const country of Country.getAllCountries()) {
    const code = String(country.phonecode || '').replace(/\D/g, '');
    if (!code || map.has(code)) continue;
    map.set(code, `+${code}`);
  }
  dialCodeOptionsCache = [...map.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([code, label]) => ({ code, label }));
  return dialCodeOptionsCache;
}

export function validateEmail(email) {
  const value = String(email || '').trim();
  if (!value) return '';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address.';
  return '';
}

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validatePhoneNational(phone, dialCode = '91') {
  const national = digitsOnly(phone);
  if (!national) return '';
  const rules = NATIONAL_LENGTH[String(dialCode)] || { min: 7, max: 15 };
  if (national.length < rules.min || national.length > rules.max) {
    if (rules.min === rules.max) {
      return `Enter a ${rules.min}-digit mobile number.`;
    }
    return `Enter ${rules.min}–${rules.max} digits for this country code.`;
  }
  return '';
}

/** Parse stored footer phone into dial code + national number. */
export function splitPhone(phone, fallbackDialCode = '91') {
  const raw = String(phone || '').trim();
  if (!raw) return { dialCode: fallbackDialCode, national: '' };

  const digits = digitsOnly(raw);
  const options = getDialCodeOptions();
  const codes = options.map((o) => o.code).sort((a, b) => b.length - a.length);

  if (raw.startsWith('+') || raw.startsWith('00')) {
    for (const code of codes) {
      if (digits.startsWith(code) && digits.length > code.length) {
        return { dialCode: code, national: digits.slice(code.length) };
      }
    }
  }

  return { dialCode: fallbackDialCode, national: digits };
}

export function formatPhoneDisplay(dialCode, national) {
  const code = digitsOnly(dialCode);
  const num = digitsOnly(national);
  if (!num && !code) return '';
  if (!code) return num;
  if (!num) return `+${code}`;
  return `+${code} ${num}`;
}

/** Scan draft blocks for footer contact validation errors. Returns first error message or ''. */
export function validateLandingContacts(draft) {
  const blocks = draft?.blocks || [];
  for (const block of blocks) {
    if (block.type !== 'footer' || block.layout !== 'rich-contact') continue;
    const c = block.content || {};
    const emailErr = validateEmail(c.email);
    if (emailErr) return `Footer email: ${emailErr}`;

    const parsed = splitPhone(c.phone, c.phoneDialCode || '91');
    const dialCode = c.phoneDialCode || parsed.dialCode;
    const national = c.phoneNational != null ? digitsOnly(c.phoneNational) : parsed.national;
    const phoneErr = validatePhoneNational(national, dialCode);
    if (phoneErr) return `Footer mobile: ${phoneErr}`;
  }
  return '';
}
