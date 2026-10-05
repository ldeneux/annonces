import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase'
import { prix } from '@/lib/fmt'
import Shell from '../Shell'
import { AdminMenu } from '../parts'
export const dynamic = 'force-dynamic'
export default async function Admin({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const q = await searchParams, s = await requireAdmin()
  const { data: biens } = await s.from('annonces_biens').select('*').order('created_at', { ascending: false })
  const { data: ct } = await s.from('annonces_contact').select('*').maybeSingle()
  async function create(f: FormData) {
    'use server'
    const s = await requireAdmin(), tr = String(f.get('transaction')), tb = String(f.get('type_bien'))
    const { data, error } = await s.from('annonces_biens').insert({ slug: Math.random().toString(36).slice(2, 8), titre: String(f.get('titre')), type_bien: tb, transaction: tr, ville: String(f.get('ville')), code_postal: String(f.get('code_postal')), ...(tr === 'vente' ? { prix: 1 } : { loyer_hc: 1 }), dpe_non_soumis: tb === 'garage' }).select('id').single()
    if (error) redirect('/admin?err=' + encodeURIComponent(error.message))
    redirect('/admin/annonces/' + data.id)
  }
  async function saveContact(f: FormData) {
    'use server'
    const s = await requireAdmin(), v = (k: string) => String(f.get(k) || '').trim() || null
    const { error } = await s.from('annonces_contact').upsert({ id: 1, nom: v('nom'), telephone: v('telephone'), email: v('email') })
    redirect('/admin?' + (error ? 'err=' + encodeURIComponent(error.message) : 'ok=1'))
  }
  return <Shell side={<AdminMenu />}>
    <h1 className="t">Mes annonces</h1>
    {q.err && <p className="err">{q.err}</p>}{q.ok && <p className="ok">Enregistré</p>}
    <section className="card"><h3 className="lbl">Mes annonces</h3>
      {!biens?.length && <p className="muted">Aucune annonce.</p>}
      {(biens || []).map((b) => <div className="arow" key={b.id}>
        <div><Link href={`/admin/annonces/${b.id}`}><b>{b.titre}</b></Link><div className="muted">{b.type_bien} · {b.ville} · {prix(b)}</div></div>
        <span className="chip">{b.statut}</span></div>)}</section>
    <form action={create} className="card"><h3 className="lbl">Nouvelle annonce</h3><div className="fgrid">
      <label>Type<select name="type_bien"><option value="appartement">Appartement</option><option value="garage">Garage</option></select></label>
      <label>Transaction<select name="transaction"><option value="vente">Vente</option><option value="location">Location</option></select></label>
      <label>Titre<input name="titre" required /></label><label>Ville<input name="ville" required /></label>
      <label>Code postal<input name="code_postal" pattern="[0-9]{5}" required /></label></div><button className="btn">Créer</button></form>
    <form action={saveContact} className="card"><h3 className="lbl">Mes coordonnées (affichées en petit sur le site)</h3><div className="fgrid">
      <label>Nom<input name="nom" defaultValue={ct?.nom ?? ''} /></label><label>Téléphone<input name="telephone" defaultValue={ct?.telephone ?? ''} /></label>
      <label>Email<input name="email" type="email" defaultValue={ct?.email ?? ''} /></label></div><button className="btn">Enregistrer</button></form>
  </Shell>
}
