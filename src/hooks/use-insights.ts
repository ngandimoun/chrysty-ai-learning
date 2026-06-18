'use client';

import { useEffect, useState } from 'react';
import type { LearningInsights } from '@/lib/learning/insights';

const EMPTY_INSIGHTS: LearningInsights = {
  mastery: 0,
  streak: 0,
  weeklyProgress: 0,
  weeklyGoal: 100,
  strengths: [],
  weaknesses: [],
  topicCoverage: [],
  masteryTrend: [],
  recentActivity: [],
  hasData: false,
};

export function useInsights() {
  const [insights, setInsights] = useState<LearningInsights>(EMPTY_INSIGHTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/insights');
        if (!response.ok) {
          throw new Error('Failed to load insights');
        }
        const { insights: data } = (await response.json()) as {
          insights: LearningInsights;
        };
        if (!cancelled) {
          setInsights(data);
        }
      } catch {
        if (!cancelled) {
          setInsights(EMPTY_INSIGHTS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { insights, loading };
}
