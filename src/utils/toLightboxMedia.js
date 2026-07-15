/**
 * Normalize any album/photo API item into a Lightbox / WebVideoPlayer payload.
 * Preserves the full progressive ladder (hls, variants, renditions, qualities).
 */
import { resolveVideoStreamUrl } from './photoStudioProgressive.js';

/**
 * @param {object} item
 * @param {{ className?: string, schoolName?: string, teacherName?: string } | null} [context]
 */
export function toLightboxMedia(item, context = null) {
  if (!item || typeof item !== 'object') return null;

  const isVideo = String(item.mediaType || '').toUpperCase() === 'VIDEO'
    || item.type === 'video'
    || item.fileType === 'mp4';

  return {
    ...item,
    id: item.id,
    mediaType: isVideo ? 'VIDEO' : (item.mediaType || 'IMAGE'),
    type: isVideo ? 'video' : item.type,
    caption: item.caption || item.fileName || item.title || '',
    title: item.title || item.caption || item.fileName || '',
    className: item.className || context?.className,
    schoolName: item.schoolName || context?.schoolName,
    teacherName: item.teacherName || item.uploadedByName || context?.teacherName,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl || item.imageUrl,
    imageUrl: item.imageUrl
      || item.thumbnailUrl
      || item.previewUrl
      || '',
    downloadUrl: item.downloadUrl,
    originalUrl: item.originalUrl || item.sourceUrl,
    streamUrl: item.streamUrl || resolveVideoStreamUrl(item) || item.playbackUrl,
    hlsUrl: item.hlsUrl,
    playbackUrl: item.playbackUrl,
    renditions: item.renditions,
    variants: item.variants,
    videoVariants: item.videoVariants,
    qualities: item.qualities,
    sources: item.sources,
    files: item.files,
    processingStatus: item.processingStatus,
    status: item.status,
  };
}
