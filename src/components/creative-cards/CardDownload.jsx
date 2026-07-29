import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

async function downloadCard(node, {
  filename = 'creative-card.png',
  format = 'png',
  quality = 0.96,
  pixelRatio = 2,
} = {}) {
  if (!node) throw new Error('Card preview is not available.');
  const htmlToImage = await import('html-to-image');
  const options = { cacheBust: true, pixelRatio, quality };
  const dataUrl = format === 'jpeg'
    ? await htmlToImage.toJpeg(node, options)
    : await htmlToImage.toPng(node, options);
  const link = document.createElement('a');
  link.download = filename.replace(/\.(png|jpe?g)$/i, `.${format === 'jpeg' ? 'jpg' : 'png'}`);
  link.href = dataUrl;
  link.click();
  return dataUrl;
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
