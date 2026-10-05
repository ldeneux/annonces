'use client'
import { useState } from 'react'
import { login } from './actions'
export default function Login() {
  const [err, setErr] = useState(false)
  async function go(f: FormData) { const ok = await login(String(f.get('email')), String(f.get('password'))); if (ok) location.reload(); else setErr(true) }
  return <form action={go} className="card"><h3 className="lbl">Espace propriétaire</h3>
    {err && <p className="err">Identifiants incorrects</p>}
    <label>Email<input name="email" type="email" required autoFocus /></label>
    <label>Mot de passe<input name="password" type="password" required /></label>
    <button className="btn">Se connecter</button></form>
}
