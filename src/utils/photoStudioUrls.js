/** True for localhost, 127.0.0.1, and *.localhost dev hosts. */
function isLocalDevHost(hostname) {
  const h = (hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

function isPrivateLanHost(hostname) {
  const h = (hostname || '').toLowerCase();
  return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)
    || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
    || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h);
}

/**
 * Rewrite Photo Studio URLs when the app is opened via LAN IP but storage URLs use localhost or another LAN IP.
 */
export function rewritePhotoStudioUrl(url) {
  if (!url || typeof window === 'undefined') return url || '';
  try {
    const parsed = new URL(url);
    const browserHost = window.location.hostname;
    const studioIsLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const studioIsOtherLan = isPrivateLanHost(parsed.hostname) && parsed.hostname !== browserHost;

    if (!isLocalDevHost(browserHost) && (studioIsLocal || studioIsOtherLan)) {
      parsed.hostname = browserHost;
      return parsed.toString();
    }
  } catch {
    /* ignore invalid URLs */
  }
  return url;
}
