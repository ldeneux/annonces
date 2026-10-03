import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Client serveur (service_role) : à n'utiliser que côté serveur
export const db = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: 'immobilier' }, auth: { persistSession: false } })
export async function userClient() {
  const c = await cookies()
  return createServerClient(url, anon, { db: { schema: 'immobilier' }, cookies: { getAll: () => c.getAll(), setAll: (l) => { try { l.forEach(({ name, value, options }) => c.set(name, value, options)) } catch {} } } })
}
// Retourne le client admin, ou null si le visiteur n'est pas admin
export async function isAdmin() {
  const s = await userClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return null
  const { data } = await s.from('annonces_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return data ? s : null
}
// Non-admin => 404 (aucune trace de l'administration)
export async function requireAdmin() {
  const s = await isAdmin()
  if (!s) notFound()
  return s
}
