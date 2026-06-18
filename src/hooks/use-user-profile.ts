'use client';

import { useEffect, useState } from 'react';

type UserProfile = {
  fullName: string | null;
  avatarUrl: string | null;
  email: string;
};

function deriveFirstName(profile: UserProfile | null): string {
  if (!profile) return 'Guest';

  const fromName = profile.fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;

  const fromEmail = profile.email.split('@')[0];
  if (fromEmail) return fromEmail;

  return 'Guest';
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return;
        const data = (await response.json()) as UserProfile;
        if (!cancelled) setProfile(data);
      } catch {
        // Auth optional — fall back to Guest
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    firstName: deriveFirstName(profile),
    avatarUrl: profile?.avatarUrl ?? null,
    loading,
  };
}
