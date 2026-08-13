import { API_BASE_URL } from '../services/api/config.js';

const DIRECT_URL_PATTERN = /^(?:data:|blob:|https?:\/\/|\/\/)/i;

const EXTENSION_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  heic: 'image/heic',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const ID_KEYS = ['id', 'attachmentId', 'fileId', 'documentId', 'uuid', '_id'];
const NAME_KEYS = ['name', 'fileName', 'filename', 'originalName', 'originalFilename', 'displayName', 'title'];
const MIME_KEYS = ['mimeType', 'mimetype', 'contentType', 'content_type', 'fileType', 'type'];
const SIZE_KEYS = ['size', 'fileSize', 'sizeBytes', 'bytes', 'contentLength', 'length'];
const URL_KEYS = ['url', 'downloadUrl', 'fileUrl', 'signedUrl', 'publicUrl', 'previewUrl', 'location', 'href', 'src'];
const KEY_KEYS = ['fileKey', 'storageKey', 'objectKey', 'key', 'path', 'filePath'];

/** Merge nested envelopes (`{ attachment: {…} }`, `{ file: {…} }`) onto the top level. */
function flattenAttachment(raw) {
  if (!raw || typeof raw !== 'object') return {};
  let flat = { ...raw };
  ['attachment', 'file', 'data', 'result'].forEach((key) => {
    const nested = raw[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      flat = { ...flat, ...nested };
    }
  });
  return flat;
}

function pickString(source, keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function fileNameFromUrl(value) {
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return '';
  const withoutQuery = value.split('?')[0].split('#')[0];
  return decodeURIComponent(withoutQuery.split('/').filter(Boolean).pop() || '');
}

export function inferMimeTypeFromName(name) {
  const extension = String(name || '').split('.').pop()?.toLowerCase();
  return (extension && EXTENSION_MIME_TYPES[extension]) || '';
}

/**
 * Map any server attachment shape onto `{ id, name, mimeType, size, url, fileKey }`.
 * Servers vary between `url` / `downloadUrl` / `fileKey`, so keep both a URL and a key.
 */
export function normalizeChatAttachment(raw, index = 0) {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return null;
    const isUrl = DIRECT_URL_PATTERN.test(value) || value.startsWith('/');
    const name = fileNameFromUrl(value) || 'Attachment';
    return {
      id: value,
      name,
      mimeType: inferMimeTypeFromName(name),
      size: 0,
      url: isUrl ? value : '',
      fileKey: isUrl ? '' : value,
    };
  }

  if (typeof raw !== 'object') return null;

  const flat = flattenAttachment(raw);
  const urlCandidate = pickString(flat, URL_KEYS);
  const keyCandidate = pickString(flat, KEY_KEYS);
  const urlIsAddressable = Boolean(urlCandidate)
    && (DIRECT_URL_PATTERN.test(urlCandidate) || urlCandidate.startsWith('/'));

  const url = urlIsAddressable ? urlCandidate : '';
  const fileKey = (keyCandidate && !DIRECT_URL_PATTERN.test(keyCandidate) ? keyCandidate : '')
    || (urlCandidate && !urlIsAddressable ? urlCandidate : '');

  const name = pickString(flat, NAME_KEYS)
    || fileNameFromUrl(url)
    || fileNameFromUrl(fileKey)
    || 'Attachment';

  return {
    id: pickString(flat, ID_KEYS) || fileKey || url || `attachment-${index}`,
    name,
    mimeType: pickString(flat, MIME_KEYS) || inferMimeTypeFromName(name),
    size: pickNumber(flat, SIZE_KEYS),
    url,
    fileKey,
  };
}

export function normalizeChatAttachments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => normalizeChatAttachment(item, index))
    .filter(Boolean);
}

/** An attachment is only sendable/renderable when it points at persisted storage. */
export function hasChatAttachmentSource(attachment) {
  return Boolean(attachment?.url || attachment?.fileKey);
}

/** `data:`/`blob:` sources live in this browser session only. */
export function isLocalAttachmentUrl(url) {
  return /^(?:data:|blob:)/i.test(String(url || ''));
}

/**
 * A live server must receive a stored file reference. Inline data and object URLs
 * are dead for the recipient and after a reload, so they must never be persisted.
 */
export function isServerStoredAttachment(attachment) {
  if (attachment?.fileKey) return true;
  return Boolean(attachment?.url) && !isLocalAttachmentUrl(attachment.url);
}

export function normalizeChatMessage(message) {
  if (!message || typeof message !== 'object') return message;
  const list = Array.isArray(message.attachments) ? message.attachments : message.files;
  if (!Array.isArray(list) || list.length === 0) return message;
  return { ...message, attachments: normalizeChatAttachments(list) };
}

export function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((message) => normalizeChatMessage(message));
}

export function getApiOrigin() {
  if (!API_BASE_URL) return '';
  try {
    return new URL(API_BASE_URL, window.location.origin).origin;
  } catch {
    return '';
  }
}

/** Server paths are relative to the API host, not to the single-page app origin. */
export function toAbsoluteAttachmentUrl(url) {
  if (!url) return '';
  if (/^(?:data:|blob:|https?:\/\/)/i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;
  const origin = getApiOrigin() || window.location.origin;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function isApiHostedUrl(url) {
  const origin = getApiOrigin();
  return Boolean(origin && url && url.startsWith(origin));
}

export function isImageAttachment(attachment) {
  if (!attachment) return false;
  const mimeType = attachment.mimeType || inferMimeTypeFromName(attachment.name);
  return mimeType.startsWith('image/');
}

export function formatAttachmentSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sidebar/thread preview text for messages that carry files but no body. */
export function attachmentPreviewText(message) {
  const attachments = message?.attachments;
  if (!Array.isArray(attachments) || attachments.length === 0) return '';
  if (attachments.length > 1) return `${attachments.length} attachments`;
  return attachments[0]?.name || 'Attachment';
}
