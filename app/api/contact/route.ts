import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
export async function POST(req: NextRequest) {
  const f = await req.formData(), b = String(f.get('back') || ''), back = b.startsWith('/annonce/') ? b : '/'
  const go = (k: string) => NextResponse.redirect(new URL(`${back}?${k}=1`, req.url), 303)
  if (f.get('website')) return go('ok') // anti-spam (honeypot)
  const nom = String(f.get('nom') || '').slice(0, 200), email = String(f.get('email') || '').slice(0, 200)
  if (!nom || !email.includes('@') || f.get('consentement') !== 'on') return go('err')
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  const { error } = await db().from('annonces_demandes').insert({ bien_id: String(f.get('bien_id')) || null, nom, email, telephone: String(f.get('telephone') || '').slice(0, 50), message: String(f.get('message') || '').slice(0, 5000), ip, consentement: true })
  return go(error ? 'err' : 'ok')
}
