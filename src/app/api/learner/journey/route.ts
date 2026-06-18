import {
  resolveLearnerFromRequest,
  withLearnerCookie,
} from '@/lib/learning/learner-identity';
import {
  buildJourneyTopics,
  collectPathSessionIds,
  fetchSessionTitlesByIds,
} from '@/lib/learning/memory/journey-summary';
import { getLearnerMemory } from '@/lib/learning/memory/learner-memory-store';

export async function GET(request: Request) {
  try {
    const learner = await resolveLearnerFromRequest(request);
    const row = await getLearnerMemory(learner.learnerKey);
    const sessionIds = collectPathSessionIds(row.memory);
    const titlesById = await fetchSessionTitlesByIds(sessionIds);
    const topics = buildJourneyTopics(row.memory, titlesById);

    return withLearnerCookie({ topics }, learner);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load journey';
    return Response.json({ error: message }, { status: 500 });
  }
}
