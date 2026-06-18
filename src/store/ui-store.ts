'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionType } from '@/types/session';

const DEFAULT_SIDEBAR_SECTIONS_OPEN: Record<SessionType, boolean> = {
  learn: true,
  practice: true,
  think: true,
};

interface UIState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftSidebarCollapsed: boolean;
  sidebarSectionsOpen: Record<SessionType, boolean>;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarSectionOpen: (type: SessionType, open: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleLeftSidebarCollapsed: () => void;
  toggleSidebarSection: (type: SessionType) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftPanelOpen: false,
      rightPanelOpen: false,
      leftSidebarCollapsed: false,
      sidebarSectionsOpen: DEFAULT_SIDEBAR_SECTIONS_OPEN,
      setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      setLeftSidebarCollapsed: (collapsed) =>
        set({ leftSidebarCollapsed: collapsed }),
      setSidebarSectionOpen: (type, open) =>
        set((state) => ({
          sidebarSectionsOpen: {
            ...state.sidebarSectionsOpen,
            [type]: open,
          },
        })),
      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      toggleLeftSidebarCollapsed: () =>
        set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
      toggleSidebarSection: (type) =>
        set((state) => ({
          sidebarSectionsOpen: {
            ...state.sidebarSectionsOpen,
            [type]: !state.sidebarSectionsOpen[type],
          },
        })),
    }),
    {
      name: 'chrysty-ui-store',
      partialize: (state) => ({
        leftSidebarCollapsed: state.leftSidebarCollapsed,
        sidebarSectionsOpen: state.sidebarSectionsOpen,
      }),
    },
  ),
);
