/** Thin wrappers over courseCertificateFields — never show a UUID as the cert number. */
import {
  displayCertificateFields,
  isUuid,
  mergeCertificateRecords,
} from './courseCertificateFields.js';

export function isUuidLike(value) {
  return isUuid(value);
}

export function displayCertificateNumber(certOrNumber) {
  if (certOrNumber == null) return '';
  if (typeof certOrNumber === 'string' || typeof certOrNumber === 'number') {
    const merged = mergeCertificateRecords({ certificateNumber: String(certOrNumber) });
    return merged.certificateNumber || '';
  }
  return mergeCertificateRecords(certOrNumber).certificateNumber || '';
}

export function formatCertificateDate(value) {
  if (!value) return '';
  const raw = String(value).includes(' ') ? String(value).replace(' ', 'T') : String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function certificateLearnerName(cert, fallback = '') {
  return displayCertificateFields(cert).studentName || fallback;
}

export function certificateCourseTitle(cert, fallback = 'Course') {
  return displayCertificateFields(cert).courseName || fallback;
}
