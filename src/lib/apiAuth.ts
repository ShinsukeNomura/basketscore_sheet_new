import { NextRequest } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function getAuthUserFromRequest(req: NextRequest): Promise<User | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const admin = createSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
