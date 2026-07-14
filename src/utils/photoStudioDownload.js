import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from '../services/api/config.js';
import { getAccessToken } from '../services/api/tokenStorage.js';
import { buildProgressiveSrcChain } from './photoStudioProgressive.js';
import { rewritePhotoStudioUrl } from './photoStudioUrls.js';
import { normalizeVideoMediaItem } from './videoMediaNormalize.js';

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function buildAuthHeaders() {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenant = resolveTenantSlug();
  if (tenant) headers[TENANT_HEADER] = tenant;
  return headers;
}

/** Best URL for downloading — prefers full quality, applies LAN host rewrite. Skips HLS manifests for video. */
export function resolvePhotoDownloadUrl(image) {
  if (!image) return '';

  if (image.mediaType === 'VIDEO') {
    const normalized = normalizeVideoMediaItem(image);
    if (normalized?.downloadUrl) return normalized.downloadUrl;

    const renditions = normalized?.renditions || [];
    const sourceMp4 = renditions.find(
      (r) => r.isSource && /\.(mp4|webm|mov)(\?|$)/i.test(r.streamUrl || ''),
    );
    if (sourceMp4?.streamUrl) return sourceMp4.streamUrl;

    return '';
  }

  const candidates = [
    image.downloadUrl,
    image.previewUrl,
    ...buildProgressiveSrcChain(image),
  ].filter(Boolean);

  const seen = new Set();
  for (const url of candidates) {
    const rewritten = rewritePhotoStudioUrl(url);
    if (rewritten && !seen.has(rewritten)) {
      seen.add(rewritten);
      return rewritten;
    }
  }
  return '';
}

async function fetchAsBlob(url, headers = {}) {
  const response = await fetch(url, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  return blob.size > 0 ? blob : null;
}

async function downloadViaApiProxy(imageId, filename) {
  const headers = buildAuthHeaders();
  const proxyUrl = `${API_BASE_URL}/photo-studio/images/${encodeURIComponent(imageId)}/download`;
  const response = await fetch(proxyUrl, { headers, credentials: 'include' });
  if (!response.ok) return false;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    const payload = json?.data ?? json;
    const signedUrl = payload?.downloadUrl || payload?.url;
    if (signedUrl) {
      const blob = await fetchAsBlob(rewritePhotoStudioUrl(signedUrl), headers);
      if (blob) {
        triggerBlobDownload(blob, filename);
        return true;
      }
    }
    return false;
  }

  const blob = await response.blob();
  if (blob.size > 0) {
    triggerBlobDownload(blob, filename);
    return true;
  }
  return false;
}

/** Download a photo-studio asset with auth headers (works on LAN / cross-origin). */
export async function downloadPhotoStudioAsset(image) {
  if (!image?.id) throw new Error('Missing image.');

  if (image.mediaType === 'VIDEO') {
    const normalized = normalizeVideoMediaItem(image);
    const directUrl = normalized?.downloadUrl || resolvePhotoDownloadUrl(image);
    if (!directUrl) {
      throw new Error('This video is available for streaming only. A downloadable file is not yet available.');
    }
  }

  const filename = image.filename || `photo-${image.id}`;
  const headers = buildAuthHeaders();
  const directUrl = resolvePhotoDownloadUrl(image);

  if (directUrl) {
    try {
      const blob = await fetchAsBlob(directUrl, headers);
      if (blob) {
        triggerBlobDownload(blob, filename);
        return;
      }
    } catch {
      // try fallbacks below
    }
  }

  if (await downloadViaApiProxy(image.id, filename)) return;

  if (directUrl) {
    window.open(directUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  throw new Error('No download URL available for this file.');
}
