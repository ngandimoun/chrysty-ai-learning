import { formatDistanceToNow } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { WORKER_SLUG } from './constants';

export interface LearningInsights {
  mastery: number;
  streak: number;
  weeklyProgress: number;
  weeklyGoal: number;
  strengths: { id: string; topic: string; level: number }[];
  weaknesses: { id: string; topic: string; level: number }[];
  topicCoverage: { topic: string; coverage: number }[];
  masteryTrend: { date: string; value: number }[];
  recentActivity: {
    id: string;
    action: string;
    session: string;
    timestamp: string;
  }[];
  hasData: boolean;
}

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

const ACTION_LABELS: Record<string, string> = {
  learn_guidance: 'Received learning guidance',
  think_debate: 'Engaged in debate',
  practice_grade: 'Received practice feedback',
  answer: 'Answered a question',
  reflection: 'Submitted reflection',
};

function averageProgress(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export async function computeLearningInsights(): Promise<LearningInsights> {
  const supabase = createAdminClient();

  const [sessionsResult, interactionsResult] = await Promise.all([
    supabase
      .from('learning_sessions')
      .select('id, title, type, progress, current_topic, updated_at')
      .eq('worker_slug', WORKER_SLUG),
    supabase
      .from('learning_interactions')
      .select('id, session_id, action_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (interactionsResult.error) throw new Error(interactionsResult.error.message);

  const sessions = sessionsResult.data ?? [];
  const interactions = interactionsResult.data ?? [];

  if (sessions.length === 0 && interactions.length === 0) {
    return EMPTY_INSIGHTS;
  }

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const progressValues = sessions.map((s) => s.progress);
  const mastery = averageProgress(progressValues);

  const typeCoverage = new Map<string, number[]>();
  for (const session of sessions) {
    const label =
      session.type === 'learn'
        ? 'Learn'
        : session.type === 'practice'
          ? 'Practice'
          : 'Think';
    const bucket = typeCoverage.get(label) ?? [];
    bucket.push(session.progress);
    typeCoverage.set(label, bucket);
  }

  const topicCoverage = [...typeCoverage.entries()].map(([topic, values]) => ({
    topic,
    coverage: averageProgress(values),
  }));

  const sortedByProgress = [...sessions].sort((a, b) => b.progress - a.progress);
  const strengths = sortedByProgress.slice(0, 3).map((s) => ({
    id: s.id,
    topic: s.current_topic || s.title,
    level: s.progress,
  }));
  const weaknesses = [...sortedByProgress]
    .reverse()
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      topic: s.current_topic || s.title,
      level: s.progress,
    }));

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weekSessions = sessions.filter(
    (s) => new Date(s.updated_at).getTime() >= weekAgo,
  );
  const weeklyProgress = weekSessions.length
    ? averageProgress(weekSessions.map((s) => s.progress))
    : 0;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const masteryTrend = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (6 - index));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const daySessions = sessions.filter((s) => {
      const updated = new Date(s.updated_at).getTime();
      return updated >= dayStart.getTime() && updated < dayEnd.getTime();
    });

    return {
      date: dayLabels[dayStart.getDay()] ?? 'Day',
      value: daySessions.length
        ? averageProgress(daySessions.map((s) => s.progress))
        : mastery,
    };
  });

  const activityDays = new Set<string>();
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const hasActivity = interactions.some(
      (item) => item.created_at.slice(0, 10) === key,
    );
    if (hasActivity) {
      activityDays.add(key);
      if (i === streak) streak += 1;
    } else if (i === 0) {
      break;
    } else {
      break;
    }
  }

  const recentActivity = interactions.slice(0, 5).map((item) => {
    const session = sessionById.get(item.session_id);
    return {
      id: item.id,
      action: ACTION_LABELS[item.action_type] ?? 'Learning activity',
      session: session?.title ?? 'Session',
      timestamp: formatDistanceToNow(new Date(item.created_at), {
        addSuffix: true,
      }),
    };
  });

  return {
    mastery,
    streak,
    weeklyProgress,
    weeklyGoal: 100,
    strengths,
    weaknesses,
    topicCoverage,
    masteryTrend,
    recentActivity,
    hasData: true,
  };
}
