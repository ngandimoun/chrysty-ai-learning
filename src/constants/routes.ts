export const ROUTES = {
  LEARN: '/learn',
  PRACTICE: '/practice',
  THINK: '/think',
} as const;

export function learnSession(id: string) {
  return `/learn/${id}` as const;
}

export function practiceSession(id: string) {
  return `/practice/${id}` as const;
}

export function thinkSession(id: string) {
  return `/think/${id}` as const;
}

export function sessionRoute(type: 'learn' | 'practice' | 'think', id: string) {
  switch (type) {
    case 'learn':
      return learnSession(id);
    case 'practice':
      return practiceSession(id);
    case 'think':
      return thinkSession(id);
  }
}
