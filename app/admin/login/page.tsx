import { redirect } from 'next/navigation'
import { userClient } from '@/lib/supabase'
export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const q = await searchParams
  async function login(f: FormData) {
    'use server'
    const s = await userClient()
    const { error } = await s.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) })
    redirect(error ? '/admin/login?e=1' : '/admin')
  }
  return <form action={login}><h1>Administration</h1>{q.e && <p className="err">Identifiants incorrects</p>}
    <label>Email<br /><input name="email" type="email" required /></label>
    <label>Mot de passe<br /><input name="password" type="password" required /></label><button>Connexion</button></form>
}
