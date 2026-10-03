'use server'
import { userClient } from '@/lib/supabase'
export async function login(email: string, password: string) {
  const s = await userClient()
  const { error } = await s.auth.signInWithPassword({ email, password })
  if (error) return false
  const { data } = await s.from('annonces_admins').select('user_id').maybeSingle()
  if (!data) { await s.auth.signOut(); return false } // compte non admin refusé
  return true
}
