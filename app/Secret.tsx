'use client'
import { useEffect, useRef, useState } from 'react'
import { login } from './actions'
// Titre du site : 5 clics rapides (mobile) ou Ctrl+Maj+L (ordinateur) ouvrent la connexion admin
export default function Secret({ title }: { title: string }) {
  const [open, setOpen] = useState(false), [err, setErr] = useState(false), n = useRef(0), t = useRef<any>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') setOpen(true) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  function tap() { n.current++; clearTimeout(t.current); t.current = setTimeout(() => (n.current = 0), 1500); if (n.current >= 5) { n.current = 0; setOpen(true) } }
  async function go(f: FormData) { const ok = await login(String(f.get('email')), String(f.get('password'))); if (ok) location.reload(); else setErr(true) }
  return <>
    <h1 onClick={tap} style={{ userSelect: 'none' }}>{title}</h1>
    {open && <form action={go} className="box">
      {err && <p className="err">Identifiants incorrects</p>}
      <input name="email" type="email" placeholder="Email" required autoFocus /> <input name="password" type="password" placeholder="Mot de passe" required /> <button>OK</button></form>}
  </>
}
