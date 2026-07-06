/** True for localhost, 127.0.0.1, and *.localhost dev hosts. */
function isLocalDevHost(hostname) {
  const h = (hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

/**
 * Rewrite Photo Studio URLs when the app is opened via LAN IP but storage URLs use localhost.
 */
export function rewritePhotoStudioUrl(url) {
  if (!url || typeof window === 'undefined') return url || '';
  try {
    const parsed = new URL(url);
    const browserHost = window.location.hostname;
    const studioIsLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (studioIsLocal && !isLocalDevHost(browserHost)) {
      parsed.hostname = browserHost;
      return parsed.toString();
    }
  } catch {
    /* ignore invalid URLs */
  }
  return url;
}
