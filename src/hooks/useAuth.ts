'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserPlan = 'free' | 'premium';

// 管理者メール（常にpremium扱い）
const ADMIN_EMAILS = ['miyazakiselene@gmail.com'];

export interface AuthState {
  user:    User | null;
  session: Session | null;
  plan:    UserPlan;
  loading: boolean;
}

export function useAuth(): AuthState & {
  signUp:         (email: string, password: string) => Promise<{ error: string | null }>;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  refetchPlan:    () => Promise<void>;
  resetPassword:  (email: string) => Promise<{ error: string | null }>;
  isPremium:      boolean;
} {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan,    setPlan]    = useState<UserPlan>('free');
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async (userId: string, email?: string) => {
    // 管理者メールは常にpremium
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchPlan(session.user.id, session.user.email);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchPlan(session.user.id, session.user.email);
      else setPlan('free');
    });

    return () => subscription.unsubscribe();
  }, [fetchPlan]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // user_plans レコードを作成
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('user_plans') as any).upsert({ user_id: user.id, plan: 'free' });
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
    user, session, plan, loading,
    isPremium: plan === 'premium',
    signUp, signIn, signOut, refetchPlan, resetPassword,
  };
}
