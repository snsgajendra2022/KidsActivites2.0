import { describe, expect, it } from 'vitest';
import { canSwitchToQuality } from '../progressiveVideoUpgrade.js';

describe('progressiveVideoUpgrade guards', () => {
  const current = { url: 'https://x/240.mp4', quality: '240p' };
  const next = { url: 'https://x/360.mp4', quality: '360p' };

  it('allows switch only when video is playing and next is distinct', () => {
    expect(canSwitchToQuality({
      video: { ended: false },
      nextSource: next,
      currentSource: current,
      failedUrls: new Set(),
      videoEnded: false,
    })).toBe(true);
  });

  it('blocks switch when video has ended', () => {
    expect(canSwitchToQuality({
      video: { ended: true },
      nextSource: next,
      currentSource: current,
      failedUrls: new Set(),
      videoEnded: false,
    })).toBe(false);

    expect(canSwitchToQuality({
      video: { ended: false },
      nextSource: next,
      currentSource: current,
      failedUrls: new Set(),
      videoEnded: true,
    })).toBe(false);
  });

  it('blocks switch to failed or same url', () => {
    expect(canSwitchToQuality({
      video: { ended: false },
      nextSource: next,
      currentSource: current,
      failedUrls: new Set([next.url]),
      videoEnded: false,
    })).toBe(false);

    expect(canSwitchToQuality({
      video: { ended: false },
      nextSource: current,
      currentSource: current,
      failedUrls: new Set(),
      videoEnded: false,
    })).toBe(false);
  });
});
