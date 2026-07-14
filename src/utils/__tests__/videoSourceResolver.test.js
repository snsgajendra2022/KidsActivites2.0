import { describe, expect, it } from 'vitest';
import {
  getBestPlayableVideoSources,
  getOrderedPlayableVideoUrls,
  getProgressiveVideoSources,
  hasPlayableVideoSource,
  isHlsUrl,
  isMasterHlsUrl,
  normalizeProgressiveQuality,
  PROGRESSIVE_QUALITY_ORDER,
} from '../videoSourceResolver.js';

describe('videoSourceResolver progressive', () => {
  it('uses strict quality order', () => {
    expect(PROGRESSIVE_QUALITY_ORDER).toEqual([
      '240p', '360p', '480p', '720p', '1080p', 'original',
    ]);
  });

  it('detects HLS and master URLs', () => {
    expect(isHlsUrl('https://x/stream/master.m3u8?t=1')).toBe(true);
    expect(isMasterHlsUrl('https://x/stream/master.m3u8?t=1')).toBe(true);
    expect(isMasterHlsUrl('https://x/stream/720p/index.m3u8')).toBe(false);
  });

  it('normalizes labels onto progressive ladder', () => {
    expect(normalizeProgressiveQuality('source')).toBe('original');
    expect(normalizeProgressiveQuality('720', 'https://x/file.mp4')).toBe('720p');
    expect(normalizeProgressiveQuality(null, 'https://x/stream/360p/index.m3u8')).toBe('360p');
  });

  it('orders progressive ladder low → high without skipping', () => {
    const result = getProgressiveVideoSources({
      mediaType: 'VIDEO',
      variants: {
        '1080p': 'https://studio.example/1080.mp4',
        '240p': 'https://studio.example/240.mp4',
        '720p': 'https://studio.example/720.mp4',
        '480p': 'https://studio.example/480.mp4',
        '360p': 'https://studio.example/360.mp4',
        original: 'https://studio.example/original.mp4',
      },
    });

    expect(result.progressive.map((s) => s.quality)).toEqual([
      '240p', '360p', '480p', '720p', '1080p', 'original',
    ]);
  });

  it('keeps available intermediates only (240 → 480 → 1080 → original)', () => {
    const result = getProgressiveVideoSources({
      mediaType: 'VIDEO',
      variants: {
        '240p': 'https://studio.example/240.mp4',
        '480p': 'https://studio.example/480.mp4',
        '1080p': 'https://studio.example/1080.mp4',
        original: 'https://studio.example/original.mp4',
      },
    });
    expect(result.progressive.map((s) => s.quality)).toEqual([
      '240p', '480p', '1080p', 'original',
    ]);
  });

  it('prefers master HLS separately and does not treat /720p as adaptive', () => {
    const result = getProgressiveVideoSources({
      id: '1',
      mediaType: 'VIDEO',
      streamUrl: 'https://studio.example/api/videos/1/stream/720p/index.m3u8',
      hlsUrl: 'https://studio.example/api/videos/1/stream/master.m3u8',
      renditions: [
        {
          label: '240p',
          height: 240,
          status: 'READY',
          streamUrl: 'https://studio.example/api/videos/1/stream/240p/index.m3u8',
        },
        {
          label: '720p',
          height: 720,
          status: 'READY',
          streamUrl: 'https://studio.example/api/videos/1/stream/720p/index.m3u8',
        },
      ],
    });

    expect(result.hls?.url).toContain('master.m3u8');
    expect(result.progressive.map((s) => s.quality)).toEqual(['240p', '720p']);
    expect(result.sources[0].url).toContain('master.m3u8');
  });

  it('skips processing 720p and keeps ready 480p', () => {
    const media = {
      id: '2',
      mediaType: 'VIDEO',
      variants: {
        qualities: [
          {
            label: '720p',
            height: 720,
            status: 'PROCESSING',
            streamUrl: 'https://studio.example/v/720p.mp4',
          },
          {
            label: '480p',
            height: 480,
            status: 'READY',
            streamUrl: 'https://studio.example/v/480p.mp4',
          },
          {
            label: '240p',
            height: 240,
            status: 'READY',
            streamUrl: 'https://studio.example/v/240p.mp4',
          },
        ],
      },
    };
    const result = getProgressiveVideoSources(media);
    expect(result.progressive.map((s) => s.quality)).toEqual(['240p', '480p']);
    expect(hasPlayableVideoSource(media)).toBe(true);
  });

  it('compat getBestPlayableVideoSources starts with lowest available', () => {
    const urls = getOrderedPlayableVideoUrls({
      mediaType: 'VIDEO',
      downloadUrl: 'https://studio.example/original.mp4',
      variants: {
        '360p': 'https://studio.example/360.mp4',
        '720p': 'https://studio.example/720.mp4',
      },
    });
    expect(urls[0]).toContain('360.mp4');
    expect(urls.at(-1)).toContain('original.mp4');
    expect(getBestPlayableVideoSources({ mediaType: 'VIDEO' }).ready).toBe(false);
  });
});
