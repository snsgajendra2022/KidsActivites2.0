/**
 * Client-side image compression before upload (photos only — not video).
 * Shrinks photos to upload in ~1–2 seconds based on measured internet speed.
 */

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml']);

async function encodeCanvas(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression failed'))), mime, quality);
  });
}

export async function compressClassroomImageIfNeeded(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.78,
    targetMaxBytes = 600 * 1024,
  } = {},
) {
  if (!file?.type?.startsWith('image/')) return file;
  if (SKIP_TYPES.has(file.type)) return file;
  if (file.size <= targetMaxBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const mime = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');
    const ext = mime === 'image/jpeg' ? '.jpg' : '';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    let bestBlob = null;
    let width = bitmap.width;
    let height = bitmap.height;
    let q = quality;

    for (let pass = 0; pass < 6; pass += 1) {
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await encodeCanvas(canvas, mime, q);
      if (!blob) break;

      bestBlob = blob;
      if (blob.size <= targetMaxBytes) break;

      if (q > 0.55) {
        q -= 0.08;
      } else {
        maxWidth = Math.round(maxWidth * 0.85);
        maxHeight = Math.round(maxHeight * 0.85);
        q = Math.max(0.55, quality - 0.1);
      }
    }

    bitmap.close?.();

    if (!bestBlob || bestBlob.size >= file.size) return file;

    return new File([bestBlob], `${baseName}${ext}`, {
      type: mime,
      lastModified: file.lastModified ?? Date.now(),
    });
  } catch {
    return file;
  }
}

export async function prepareFilesForUpload(files, compressionOptions = {}) {
  const out = [];
  for (const file of files) {
    if (file.type?.startsWith('image/')) {
      out.push(await compressClassroomImageIfNeeded(file, compressionOptions));
    } else {
      out.push(file);
    }
  }
  return out;
}
