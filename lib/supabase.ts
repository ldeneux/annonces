import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Client serveur (service_role) : à n'utiliser que côté serveur
export const db = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: 'immobilier' }, auth: { persistSession: false } })
export async function userClient() {
  const c = await cookies()
  return createServerClient(url, anon, { db: { schema: 'immobilier' }, cookies: { getAll: () => c.getAll(), setAll: (l) => { try { l.forEach(({ name, value, options }) => c.set(name, value, options)) } catch {} } } })
}
export async function requireAdmin() {
  const s = await userClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data } = await s.from('annonces_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!data) redirect('/admin/login')
  return s
}
