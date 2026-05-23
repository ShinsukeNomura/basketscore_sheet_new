'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setStorageUser } from '@/lib/storage';
import { setAiStorageUser } from '@/lib/aiReportCache';
import { setMyTeamsUser, pullUserTeamsFromCloud } from '@/lib/myTeams';
import {
  isGuestModeActive,
  enterGuestMode as enterGuestModeStorage,
  clearGuestModeFlag,
  migrateGuestToUser,
} from '@/lib/guestMode';
import { setStorageGuestMode } from '@/lib/storage';

export type UserPlan = 'free' | 'premium';

// 管理者メール（常にpremium扱い）- 本番では環境変数推奨
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'miyazakiselene@gmail.com')
  .split(',').map((e) => e.trim()).filter(Boolean);

export interface AuthState {
  user:    User | null;
  session: Session | null;
  plan:    UserPlan;
  loading: boolean;
  isGuest: boolean;
}

function applyStorageScope(userId: string | null, guest: boolean) {
  if (userId) {
    setStorageUser(userId);
    setStorageGuestMode(false);
    setAiStorageUser(userId);
    setMyTeamsUser(userId);
  } else if (guest) {
    setStorageUser(null);
    setStorageGuestMode(true);
    setAiStorageUser(null);
    setMyTeamsUser(null);
  } else {
    setStorageUser(null);
    setStorageGuestMode(false);
    setAiStorageUser(null);
    setMyTeamsUser(null);
  }
}

export function useAuth(): AuthState & {
  signUp:         (email: string, password: string) => Promise<{ error: string | null }>;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  refetchPlan:    () => Promise<void>;
  resetPassword:  (email: string) => Promise<{ error: string | null }>;
  enterGuestMode: () => void;
  isPremium:      boolean;
} {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan,    setPlan]    = useState<UserPlan>('free');
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchPlan = useCallback(async (userId: string, email?: string) => {
    if (email && ADMIN_EMAILS.includes(email)) {
      setPlan('premium');
      return;
    }
    const { data } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .single() as { data: { plan: string } | null; error: unknown };
    setPlan(((data?.plan) as UserPlan) ?? 'free');
  }, []);

  const onSession = useCallback(async (session: Session | null) => {
    setSession(session);
    const u = session?.user ?? null;
    setUser(u);

    if (u) {
      migrateGuestToUser(u.id);
      clearGuestModeFlag();
      setIsGuest(false);
      applyStorageScope(u.id, false);
      await fetchPlan(u.id, u.email);
      void pullUserTeamsFromCloud(u.id);
    } else {
      const guest = isGuestModeActive();
      setIsGuest(guest);
      applyStorageScope(null, guest);
      setPlan('free');
    }
  }, [fetchPlan]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => onSession(s))
      .catch(() => {
        const guest = isGuestModeActive();
        setIsGuest(guest);
        applyStorageScope(null, guest);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      void onSession(s);
    });

    return () => subscription.unsubscribe();
  }, [onSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('user_plans') as any).upsert({ user_id: newUser.id, plan: 'free' });
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearGuestModeFlag();
    setIsGuest(false);
    applyStorageScope(null, false);
  }, []);

  const enterGuestMode = useCallback(() => {
    enterGuestModeStorage();
    setIsGuest(true);
    applyStorageScope(null, true);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error?.message ?? null };
  }, []);

  const refetchPlan = useCallback(async () => {
    if (!user) return;
    await fetchPlan(user.id, user.email);
  }, [user, fetchPlan]);

  return {
    user, session, plan, loading, isGuest,
    isPremium: plan === 'premium',
    signUp, signIn, signOut, refetchPlan, resetPassword, enterGuestMode,
  };
}
