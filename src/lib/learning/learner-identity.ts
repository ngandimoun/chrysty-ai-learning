import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const LEARNER_COOKIE_NAME = 'chrysty_learner_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface ResolvedLearner {
  learnerKey: string;
  userId: string | null;
  setCookie?: { name: string; value: string; maxAge: number };
}

export async function resolveLearnerFromRequest(
  _request?: Request,
): Promise<ResolvedLearner> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return { learnerKey: `user:${user.id}`, userId: user.id };
    }
  } catch {
    // Auth optional — fall through to anonymous cookie
  }

  const cookieStore = await cookies();
  let anonId = cookieStore.get(LEARNER_COOKIE_NAME)?.value;
  let setCookie: ResolvedLearner['setCookie'];

  if (!anonId) {
    anonId = crypto.randomUUID();
    setCookie = {
      name: LEARNER_COOKIE_NAME,
      value: anonId,
      maxAge: COOKIE_MAX_AGE,
    };
  }

  return { learnerKey: `anon:${anonId}`, userId: null, setCookie };
}

export function applyLearnerCookie(
  response: NextResponse,
  setCookie?: ResolvedLearner['setCookie'],
): NextResponse {
  if (setCookie) {
    response.cookies.set(setCookie.name, setCookie.value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: setCookie.maxAge,
    });
  }
  return response;
}

export function withLearnerCookie<T>(
  data: T,
  learner: ResolvedLearner,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(data, init);
  return applyLearnerCookie(response, learner.setCookie);
}
