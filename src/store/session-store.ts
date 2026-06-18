'use client';

import { create } from 'zustand';
import { THINK_MODE_ENABLED } from '@/constants/features';
import type { SessionSummary, SessionType } from '@/types/session';

function resolveComposerSection(section: SessionType): SessionType {
  if (!THINK_MODE_ENABLED && section === 'think') return 'learn';
  return section;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

function deriveTitle(prompt: string, type: SessionType): string {
  const cleaned = prompt.replace(/\.$/, '').trim();
  if (type === 'learn') {
    const match = cleaned.match(/learn\s+(.+)/i);
    if (match?.[1]) return match[1];
  }
  if (type === 'practice') {
    if (/quant/i.test(cleaned)) return 'Quant Interview Practice';
    if (/chem/i.test(cleaned)) return 'Chemistry Exam Practice';
    return 'Custom Practice';
  }
  if (type === 'think') {
    if (/econom/i.test(cleaned)) return 'Economics Debate';
    if (/quantum/i.test(cleaned)) return 'Quantum Philosophy';
    return 'Custom Challenge';
  }
  return cleaned.slice(0, 40) || 'New Session';
}

interface SessionStore {
  sessions: SessionSummary[];
  sessionsLoaded: boolean;
  sessionsLoading: boolean;
  composerOpen: boolean;
  composerSection: SessionType | null;
  composerDraft: string;
  practiceSourceLearnSessionId: string | undefined;
  isGenerating: boolean;
  loadSessions: () => Promise<void>;
  openComposer: (section: SessionType) => void;
  openPracticeComposer: (prompt: string, sourceLearnSessionId?: string) => void;
  closeComposer: () => void;
  setComposerSection: (section: SessionType) => void;
  setComposerDraft: (draft: string) => void;
  setPracticeSourceLearnSessionId: (id: string | undefined) => void;
  setIsGenerating: (value: boolean) => void;
  createSessionLocal: (section: SessionType, prompt: string) => string;
  addSessionSummary: (summary: SessionSummary) => void;
  removeSessionSummary: (id: string) => void;
  updateSessionSummary: (
    id: string,
    patch: Partial<
      Pick<
        SessionSummary,
        | 'progress'
        | 'currentTopic'
        | 'title'
        | 'generationStatus'
        | 'questionCount'
      >
    >,
  ) => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],
  sessionsLoaded: false,
  sessionsLoading: false,
  composerOpen: false,
  composerSection: null,
  composerDraft: '',
  practiceSourceLearnSessionId: undefined,
  isGenerating: false,
  loadSessions: async () => {
    if (get().sessionsLoading) return;
    set({ sessionsLoading: true });
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }
      const { sessions } = (await response.json()) as {
        sessions: SessionSummary[];
      };
      set({ sessions, sessionsLoaded: true });
    } catch {
      set({ sessionsLoaded: true });
    } finally {
      set({ sessionsLoading: false });
    }
  },
  openComposer: (section) =>
    set({
      composerOpen: true,
      composerSection: resolveComposerSection(section),
      composerDraft: '',
      practiceSourceLearnSessionId: undefined,
    }),
  openPracticeComposer: (prompt, sourceLearnSessionId) =>
    set({
      composerOpen: true,
      composerSection: 'practice',
      composerDraft: prompt,
      practiceSourceLearnSessionId: sourceLearnSessionId,
    }),
  closeComposer: () =>
    set({
      composerOpen: false,
      composerSection: null,
      composerDraft: '',
      practiceSourceLearnSessionId: undefined,
    }),
  setComposerSection: (section) =>
    set((state) => {
      const resolved = resolveComposerSection(section);
      return {
        composerSection: resolved,
        practiceSourceLearnSessionId:
          resolved === 'practice'
            ? state.practiceSourceLearnSessionId
            : undefined,
      };
    }),
  setComposerDraft: (draft) => set({ composerDraft: draft }),
  setPracticeSourceLearnSessionId: (id) =>
    set({ practiceSourceLearnSessionId: id }),
  setIsGenerating: (value) => set({ isGenerating: value }),
  createSessionLocal: (section, prompt) => {
    const id = `${slugify(deriveTitle(prompt, section))}-${Date.now().toString(36)}`;
    return id;
  },
  addSessionSummary: (summary) =>
    set((state) => ({
      sessions: [
        summary,
        ...state.sessions.filter((s) => s.id !== summary.id),
      ],
    })),
  removeSessionSummary: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),
  updateSessionSummary: (id, patch) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    })),
}));
