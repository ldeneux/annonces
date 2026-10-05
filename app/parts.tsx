import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, requireAdmin } from '@/lib/supabase'
import { E } from '@/lib/fmt'

export const DPE_COL = ['#008b52', '#4fae33', '#c8d400', '#fbe600', '#f6a800', '#e8590c', '#d7181f']
const GES_COL = ['#a6d8f5', '#7fb8e0', '#5b9bcf', '#4a6e9b', '#3d4f7e', '#2d2f63', '#1d1a47']

// Petit bloc « Contacter le propriétaire » (téléphone + mail) — c'est l'acheteur qui appelle
export async function ContactCard() {
  const { data: c } = await db().from('annonces_contact').select('*').maybeSingle()
  if (!c || (!c.telephone && !c.email)) return null
  return <section className="card"><h3 className="lbl">Contacter le propriétaire</h3><div className="contact">
    {c.nom && <div>{c.nom}</div>}
    {c.telephone && <div>📞 <a href={`tel:${c.telephone}`}>{c.telephone}</a></div>}
    {c.email && <div>✉️ <a href={`mailto:${c.email}`}>{c.email}</a></div>}</div></section>
}

export async function AdminMenu({ extra }: { extra?: React.ReactNode }) {
  async function logout() { 'use server'; const s = await requireAdmin(); await s.auth.signOut(); redirect('/') }
  return <section className="card"><h3 className="lbl">Propriétaire</h3>
    <Link className="side-link" href="/admin">Mes annonces</Link>
    <Link className="side-link" href="/admin/affiche">Affiche « À VENDRE »</Link>
    <Link className="side-link" href="/">Voir le site</Link>{extra}
    <form action={logout}><button className="side-link" style={{ background: 'none', border: 0, padding: '9px 0', cursor: 'pointer', textAlign: 'left', width: '100%' }}>Déconnexion</button></form></section>
}

function Scale({ v, cols }: { v: string; cols: string[] }) {
  const k = 'ABCDEFG'.indexOf(v)
  return <div className="scale">{cols.map((c, i) => <span key={i} className={i === k ? 'on' : ''} style={{ background: c }}>{i === k ? v : ''}</span>)}</div>
}

// DPE graphique (énergie + climat) — rien n'est affiché si non renseigné
export function Dpe({ b }: { b: any }) {
  if (b.dpe_non_soumis) return <section className="card"><h2 className="t">Performance énergétique</h2><p className="muted">Bien non soumis au diagnostic de performance énergétique.</p></section>
  if (!b.dpe_classe_energie && !b.dpe_classe_climat) return null
  return <section className="card"><h2 className="t">Performance énergétique</h2>
    <div className="dpe2">
      {b.dpe_classe_energie && <div><b>Diagnostic de performance énergétique (DPE)</b><Scale v={b.dpe_classe_energie} cols={DPE_COL} />{b.dpe_conso_kwh_m2_an != null && <span className="muted">{b.dpe_conso_kwh_m2_an} kWh/m²/an</span>}</div>}
      {b.dpe_classe_climat && <div><b>Indice d'émission de gaz à effet de serre (GES)</b><Scale v={b.dpe_classe_climat} cols={GES_COL} />{b.dpe_emissions_ges_kg_m2_an != null && <span className="muted">{b.dpe_emissions_ges_kg_m2_an} kg CO₂/m²/an</span>}</div>}
    </div>
    {b.dpe_cout_min_an != null && b.dpe_cout_max_an != null && <p className="muted" style={{ marginBottom: 0 }}>Dépenses annuelles d'énergie estimées entre {E(b.dpe_cout_min_an)} et {E(b.dpe_cout_max_an)}{b.dpe_annee_reference_prix ? ` (prix ${b.dpe_annee_reference_prix})` : ''}.</p>}
    {['F', 'G'].includes(b.dpe_classe_energie) && <p style={{ marginBottom: 0 }}><span className="chip warn">Logement à consommation énergétique excessive</span></p>}
  </section>
}
