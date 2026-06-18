'use client';

import { useEffect, useState } from 'react';
import type { JourneyTopicSummary } from '@/lib/learning/memory/journey-summary';

export function useLearnerJourney(enabled: boolean) {
  const [topics, setTopics] = useState<JourneyTopicSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    fetch('/api/learner/journey')
      .then(async (res) => {
        if (!res.ok) return { topics: [] as JourneyTopicSummary[] };
        return res.json() as Promise<{ topics: JourneyTopicSummary[] }>;
      })
      .then((data) => {
        if (!cancelled) setTopics(data.topics ?? []);
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { topics, loading };
}

export function practicePromptForTopic(topic: JourneyTopicSummary): string {
  const focus =
    topic.takeaways.length > 0
      ? ` — focus on ${topic.takeaways[topic.takeaways.length - 1]!.slice(0, 80)}`
      : '';
  return `Practice ${topic.subjectLabel.toLowerCase()}${focus}`;
}

export function continuationPromptForTopic(topic: JourneyTopicSummary): string {
  return `Continue my ${topic.subjectLabel.toLowerCase()} learning — go deeper`;
}
