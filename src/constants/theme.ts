import { BookOpen, Brain, Dumbbell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionType } from '@/types/session';

export const MODE_THEME: Record<
  SessionType,
  { label: string; colorClass: string; bgClass: string; icon: LucideIcon }
> = {
  learn: {
    label: 'Learn',
    colorClass: 'text-mode-learn',
    bgClass: 'bg-mode-learn/15',
    icon: BookOpen,
  },
  practice: {
    label: 'Practice',
    colorClass: 'text-mode-practice',
    bgClass: 'bg-mode-practice/15',
    icon: Dumbbell,
  },
  think: {
    label: 'Think',
    colorClass: 'text-mode-think',
    bgClass: 'bg-mode-think/15',
    icon: Brain,
  },
} as const;

export const CARD_TYPE_THEME: Record<
  string,
  { colorClass: string; bgClass: string; borderClass: string }
> = {
  concept: {
    colorClass: 'text-mode-learn',
    bgClass: 'bg-mode-learn/10',
    borderClass: 'border-l-mode-learn',
  },
  analogy: {
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-l-accent',
  },
  visualization: {
    colorClass: 'text-info',
    bgClass: 'bg-info/10',
    borderClass: 'border-l-info',
  },
  example: {
    colorClass: 'text-mode-practice',
    bgClass: 'bg-mode-practice/10',
    borderClass: 'border-l-mode-practice',
  },
  key_insight: {
    colorClass: 'text-mode-think',
    bgClass: 'bg-mode-think/10',
    borderClass: 'border-l-mode-think',
  },
  mini_challenge: {
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-l-destructive',
  },
};
