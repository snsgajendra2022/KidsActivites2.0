import { useEffect, useMemo, useState } from 'react';
import {
  buildProgressiveSrcChain,
  loadProgressiveChain,
} from '../utils/photoStudioProgressive.js';

/**
 * Progressively upgrades image src from s01 → s10 → preview/download (lightbox only).
 */
export function useProgressiveImageSrc(image, { enabled = true } = {}) {
  const chain = useMemo(
    () => (enabled && image ? buildProgressiveSrcChain(image) : []),
    [
      enabled,
      image?.id,
      image?.previewUrl,
      image?.downloadUrl,
      image?.mediaType,
      JSON.stringify(image?.variants ?? null),
    ],
  );

  const [src, setSrc] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || chain.length === 0) {
      setSrc('');
      setStep(0);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setSrc(chain[0]);
    setStep(0);
    setLoading(chain.length > 1);

    loadProgressiveChain(chain, {
      signal: controller.signal,
      onStep: (nextSrc, index) => {
        setSrc(nextSrc);
        setStep(index);
      },
    }).then((finalSrc) => {
      if (!controller.signal.aborted && finalSrc) {
        setSrc(finalSrc);
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [chain, enabled]);

  return {
    src: src || chain[0] || '',
    loading,
    step,
    totalSteps: chain.length,
    qualityLabel: chain.length > 0 ? `${step + 1}/${chain.length}` : '',
  };
}
