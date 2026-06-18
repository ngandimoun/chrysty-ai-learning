'use client';

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 768px)');
}
