import { describe, expect, it } from 'vitest';
import {
  compareVideoQualities,
  deduplicateRenditions,
  formatQualityBitrateLabel,
  formatVideoQualityLabel,
  normalizeQualityKey,
  normalizeQualityLabel,
  normalizeVideoMediaItem,
  normalizeVideoRenditions,
  redactMediaUrl,
} from '../videoMediaNormalize.js';

const SAMPLE_ITEM = {
  id: '2127',
  mediaType: 'VIDEO',
  filename: '16341097_1080_1920_25fps.mp4',
  previewUrl: 'https://studio.example/api/videos/15/stream/master.m3u8?token=abc123',
  streamUrl: 'https://studio.example/api/videos/15/stream/master.m3u8?token=abc123',
  downloadUrl: 'https://studio.example/api/videos/15/stream/master.m3u8?token=abc123',
  thumbnailUrl: 'https://studio.example/api/videos/15/thumbnail?token=abc123',
  processingStatus: 'READY',
  videoId: 15,
  renditions: [
    {
      label: '240p',
      width: 134,
      height: 240,
      bitrateKbps: 600,
      status: 'READY',
      streamUrl: 'https://studio.example/api/videos/15/stream/240p/index.m3u8?token=abc123',
    },
    {
      label: '360p',
      width: 202,
      height: 360,
      bitrateKbps: 1200,
      status: 'READY',
      streamUrl: 'https://studio.example/api/videos/15/stream/360p/index.m3u8?token=abc123',
    },
    {
      label: 'source',
      width: 1080,
      height: 1920,
      bitrateKbps: 5000,
      status: 'READY',
      isSource: true,
      streamUrl: 'https://studio.example/api/videos/15/stream/source/index.m3u8?token=abc123',
    },
  ],
  variants: {
    defaultQuality: '480p',
    maxQuality: 'source',
    qualities: [
      {
        label: '240P',
        width: 134,
        height: 240,
        bitrateKbps: 600,
        status: 'READY',
        streamUrl: 'https://studio.example/api/videos/15/stream/240p/index.m3u8?token=abc123',
      },
      {
        label: '480p',
        width: 270,
        height: 480,
        bitrateKbps: 2000,
        status: 'READY',
        streamUrl: 'https://studio.example/api/videos/15/stream/480p/index.m3u8?token=abc123',
      },
    ],
  },
};

describe('videoMediaNormalize', () => {
  it('redacts auth tokens from URLs', () => {
    const url = 'https://studio.example/stream/master.m3u8?token=secret&foo=bar';
    expect(redactMediaUrl(url)).toBe('https://studio.example/stream/master.m3u8?token=[REDACTED]&foo=bar');
  });

  it('normalizes quality labels', () => {
    expect(normalizeQualityLabel('240P')).toBe('240p');
    expect(normalizeQualityLabel(' SOURCE ')).toBe('source');
    expect(normalizeQualityKey('1080P')).toBe('1080');
  });

  it('combines renditions and variants.qualities without duplicates', () => {
    const renditions = normalizeVideoRenditions(SAMPLE_ITEM);
    const labels = renditions.map((r) => r.label);
    expect(labels).toEqual(['240p', '360p', '480p', 'source']);
    expect(labels.filter((l) => l === '240p')).toHaveLength(1);
  });

  it('filters non-ready renditions', () => {
    const item = {
      ...SAMPLE_ITEM,
      renditions: [
        ...SAMPLE_ITEM.renditions,
        {
          label: '720p',
          height: 720,
          status: 'PROCESSING',
          streamUrl: 'https://studio.example/api/videos/15/stream/720p/index.m3u8?token=abc',
        },
      ],
      variants: { qualities: [] },
    };
    const renditions = normalizeVideoRenditions(item);
    expect(renditions.some((r) => r.label === '720p')).toBe(false);
  });

  it('keeps renditions with missing status when stream URL is valid', () => {
    const item = {
      renditions: [{
        label: '720p',
        height: 720,
        streamUrl: 'https://studio.example/api/videos/15/stream/720p/index.m3u8?token=abc',
      }],
    };
    expect(normalizeVideoRenditions(item)).toHaveLength(1);
  });

  it('sorts from lowest to highest with Source last', () => {
    const shuffled = deduplicateRenditions([
      { label: 'source', height: 1920, isSource: true, streamUrl: 'https://x/source.m3u8' },
      { label: '1080p', height: 1080, streamUrl: 'https://x/1080.m3u8' },
      { label: '240p', height: 240, streamUrl: 'https://x/240.m3u8' },
    ]).sort(compareVideoQualities);
    expect(shuffled.map((r) => r.label)).toEqual(['240p', '1080p', 'source']);
  });

  it('preserves tokenized stream URLs', () => {
    const normalized = normalizeVideoMediaItem(SAMPLE_ITEM);
    expect(normalized.masterStreamUrl).toContain('token=abc123');
    expect(normalized.renditions[0].streamUrl).toContain('token=abc123');
  });

  it('uses master m3u8 for Auto playback source', () => {
    const normalized = normalizeVideoMediaItem(SAMPLE_ITEM);
    expect(normalized.masterStreamUrl).toMatch(/master\.m3u8/);
  });

  it('formats quality labels including Source', () => {
    expect(formatVideoQualityLabel({ label: '720p', height: 720 })).toBe('720p');
    expect(formatVideoQualityLabel({
      label: 'source',
      width: 1080,
      height: 1920,
      isSource: true,
    })).toBe('Source');
    expect(formatVideoQualityLabel({
      label: 'source',
      width: 1080,
      height: 1920,
      isSource: true,
    }, { detailed: true })).toBe('Source · 1080 × 1920');
  });

  it('formats bitrate labels', () => {
    expect(formatQualityBitrateLabel({ label: '720p', bitrateKbps: 4500 })).toBe('4.5 Mbps');
    expect(formatQualityBitrateLabel({ label: 'source', isSource: true })).toBe('Original');
  });

  it('normalizes full video media item', () => {
    const normalized = normalizeVideoMediaItem(SAMPLE_ITEM);
    expect(normalized.defaultQuality).toBe('480p');
    expect(normalized.maxQuality).toBe('source');
    expect(normalized.aspectRatio).toBe('1080 / 1920');
    expect(normalized.renditions).toHaveLength(4);
  });

  it('returns null for non-video items', () => {
    expect(normalizeVideoMediaItem({ mediaType: 'IMAGE' })).toBeNull();
  });
});

describe('videoHlsConfig helpers', () => {
  it('buildQualityOptions matches manifest levels by height', async () => {
    const { buildQualityOptions } = await import('../videoHlsConfig.js');
    const hlsLevels = [
      { height: 240, name: '240p', bitrate: 600000 },
      { height: 720, name: '720p', bitrate: 4500000 },
    ];
    const apiRenditions = normalizeVideoRenditions({
      renditions: [
        { label: '240p', height: 240, status: 'READY', streamUrl: 'https://x/240.m3u8' },
        { label: '720p', height: 720, status: 'READY', streamUrl: 'https://x/720.m3u8' },
        { label: '1080p', height: 1080, status: 'READY', streamUrl: 'https://x/1080.m3u8' },
      ],
    });
    const options = buildQualityOptions(hlsLevels, apiRenditions);
    expect(options.map((o) => o.label)).toEqual(['240p', '720p']);
    expect(options.every((o) => o.hlsIndex >= 0)).toBe(true);
  });
});
