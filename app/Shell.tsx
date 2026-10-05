import Link from 'next/link'
import Secret from './Secret'
import { isAdmin } from '@/lib/supabase'
// Cadre commun : en-tête, détail à gauche (children), menu à droite (side)
export default async function Shell({ side, children }: { side?: React.ReactNode; children: React.ReactNode }) {
  const adm = !!(await isAdmin())
  return <div className="wrap">
    <header className="top"><Secret title="Annonces immobilières" />
      <nav><Link className="pill" href="/">Annonces</Link>{adm && <Link className="pill" href="/admin">Espace propriétaire</Link>}</nav></header>
    <div className="cols"><main>{children}</main><aside>{side}</aside></div>
  </div>
}
