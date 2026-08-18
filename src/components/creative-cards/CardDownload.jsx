import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

function isGoogleFontStylesheet(href) {
  return /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(href || '');
}

async function loadFontEmbedCSS() {
  const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((link) => link.href)
    .filter(isGoogleFontStylesheet);
  if (!hrefs.length) return '';

  const sheets = await Promise.all(hrefs.map(async (href) => {
    try {
      const response = await fetch(href, { mode: 'cors' });
      return response.ok ? await response.text() : '';
    } catch {
      return '';
    }
  }));
  return sheets.filter(Boolean).join('\n');
}

async function downloadCard(node, {
  filename = 'creative-card.png',
  format = 'png',
  quality = 0.96,
  pixelRatio = 2,
} = {}) {
  if (!node) throw new Error('Card preview is not available.');
  const htmlToImage = await import('html-to-image');
  node.classList.add('cc-card-preview--capture');
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const fontEmbedCSS = await loadFontEmbedCSS();
    const options = {
      cacheBust: true,
      pixelRatio,
      quality,
      skipAutoScale: true,
      skipFonts: true,
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
      style: {
        backdropFilter: 'none',
        webkitBackdropFilter: 'none',
        filter: 'none',
      },
    };
    const dataUrl = format === 'jpeg'
      ? await htmlToImage.toJpeg(node, options)
      : await htmlToImage.toPng(node, options);
    const link = document.createElement('a');
    link.download = filename.replace(/\.(png|jpe?g)$/i, `.${format === 'jpeg' ? 'jpg' : 'png'}`);
    link.href = dataUrl;
    link.click();
    return dataUrl;
  } finally {
    node.classList.remove('cc-card-preview--capture');
  }
}

export default function CardDownload({
  targetRef,
  filename,
  format = 'png',
  quality,
  pixelRatio,
  onStart,
  onSuccess,
  onError,
  children,
  className = '',
  disabled = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const handleDownload = async () => {
    setDownloading(true);
    setErrorMessage('');
    onStart?.();
    try {
      const dataUrl = await downloadCard(targetRef?.current, { filename, format, quality, pixelRatio });
      onSuccess?.(dataUrl);
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to download this card.');
      onError?.(error);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <span className="cc-card-download-wrap inline-flex flex-col items-start">
      <button type="button" onClick={handleDownload} disabled={disabled || downloading} className={`cc-card-download inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
        {downloading ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
        {downloading ? 'Preparing…' : (children || 'Download')}
      </button>
      {errorMessage && <span role="alert" className="mt-1 max-w-64 text-xs text-rose-700">{errorMessage}</span>}
    </span>
  );
}
