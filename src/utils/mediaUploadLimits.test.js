import {
  DEFAULT_MAX_IMAGE_MB,
  DEFAULT_MAX_VIDEO_MB,
  buildFileTooLargeMessage,
  getMediaUploadLimitHint,
  isVideoMediaFile,
  resolveMediaUploadError,
  validateMediaUploadFile,
  validateMediaUploadFiles,
} from '../utils/mediaUploadLimits.js';
import { ApiError } from '../services/api/client.js';

describe('mediaUploadLimits', () => {
  const limits = { maxImageMb: 25, maxVideoMb: 100 };

  function makeFile(name, sizeBytes, type = 'video/mp4') {
    return { name, size: sizeBytes, type };
  }

  it('rejects oversize video with friendly message', () => {
    const file = makeFile('big.mp4', 52 * 1024 * 1024);
    const result = validateMediaUploadFile(file, limits);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Video too large (52 MB). Maximum allowed size is 100 MB.');
  });

  it('rejects oversize image with friendly message', () => {
    const file = makeFile('big.jpg', 30 * 1024 * 1024, 'image/jpeg');
    const result = validateMediaUploadFile(file, limits);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Image too large (30 MB). Maximum allowed size is 25 MB.');
  });

  it('accepts file within limit', () => {
    const file = makeFile('ok.mp4', 10 * 1024 * 1024);
    expect(validateMediaUploadFile(file, limits).valid).toBe(true);
  });

  it('maps nginx 413 errors to friendly message', () => {
    const err = new ApiError('Request Entity Too Large', 413);
    expect(resolveMediaUploadError(err, limits)).toContain('100 MB for videos');
  });

  it('renders upload hint', () => {
    expect(getMediaUploadLimitHint(limits)).toBe('Max 25 MB per photo · 100 MB per video');
  });

  it('detects video files by extension', () => {
    const file = makeFile('clip.mov', 1024, 'application/octet-stream');
    expect(isVideoMediaFile(file)).toBe(true);
    expect(buildFileTooLargeMessage(file, limits)).toContain('Video too large');
  });

  it('validates multiple files and stops at first failure', () => {
    const files = [
      makeFile('ok.jpg', 1024, 'image/jpeg'),
      makeFile('bad.mp4', 120 * 1024 * 1024),
    ];
    const result = validateMediaUploadFiles(files, limits);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100 MB');
  });

  it('uses default limits when none provided', () => {
    expect(getMediaUploadLimitHint()).toContain(String(DEFAULT_MAX_VIDEO_MB));
    expect(getMediaUploadLimitHint()).toContain(String(DEFAULT_MAX_IMAGE_MB));
  });
});
