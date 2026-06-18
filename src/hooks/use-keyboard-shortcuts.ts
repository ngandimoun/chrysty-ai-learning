'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { useUIStore } from '@/store/ui-store';
import { THINK_MODE_ENABLED } from '@/constants/features';
import type { SessionType } from '@/types/session';

function getActiveSection(pathname: string): SessionType {
  if (pathname.startsWith('/practice')) return 'practice';
  if (pathname.startsWith('/think')) {
    return THINK_MODE_ENABLED ? 'think' : 'learn';
  }
  return 'learn';
}

export function useKeyboardShortcuts() {
  const pathname = usePathname();
  const openComposer = useSessionStore((s) => s.openComposer);
  const closeComposer = useSessionStore((s) => s.closeComposer);
  const composerOpen = useSessionStore((s) => s.composerOpen);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const toggleLeftSidebarCollapsed = useUIStore(
    (s) => s.toggleLeftSidebarCollapsed,
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape' && composerOpen) {
        e.preventDefault();
        closeComposer();
        return;
      }

      if (!mod) return;

      if (e.key === 'n') {
        e.preventDefault();
        openComposer(getActiveSection(pathname));
      }
      if (e.key === 'b') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 1024px)').matches) {
          toggleLeftSidebarCollapsed();
        } else {
          toggleLeftPanel();
        }
      }
      if (e.key === 'i') {
        e.preventDefault();
        toggleRightPanel();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    pathname,
    openComposer,
    closeComposer,
    composerOpen,
    toggleLeftPanel,
    toggleRightPanel,
    toggleLeftSidebarCollapsed,
  ]);
}
