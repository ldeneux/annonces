import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase'
const D = (x?: string) => (x ? new Date(x).toLocaleString('fr-FR') : '—')
export default async function Admin({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const q = await searchParams, s = await requireAdmin()
  const { data: biens } = await s.from('annonces_biens').select('*').order('created_at', { ascending: false })
  const { data: vis } = await s.from('annonces_visites').select('*').order('derniere_visite', { ascending: false })
  const { data: dem } = await s.from('annonces_demandes').select('*, annonces_biens(titre)').order('created_at', { ascending: false }).limit(20)
  async function create(f: FormData) {
    'use server'
    const s = await requireAdmin(), tr = String(f.get('transaction')), tb = String(f.get('type_bien'))
    const { data, error } = await s.from('annonces_biens').insert({ slug: Math.random().toString(36).slice(2, 8), titre: String(f.get('titre')), type_bien: tb, transaction: tr, ville: String(f.get('ville')), code_postal: String(f.get('code_postal')), ...(tr === 'vente' ? { prix: 1 } : { loyer_hc: 1 }), dpe_non_soumis: tb === 'garage' }).select('id').single()
    if (error) redirect('/?err=' + encodeURIComponent(error.message))
    redirect('/admin/annonces/' + data.id)
  }
  async function logout() { 'use server'; const s = await requireAdmin(); await s.auth.signOut(); redirect('/') }
  return <>
    <h1>Mes annonces</h1><form action={logout}><button>Déconnexion</button></form>
    {q.err && <p className="err">{q.err}</p>}
    <form action={create} className="box"><b>Nouvelle annonce</b><br />
      <select name="type_bien"><option value="appartement">Appartement</option><option value="garage">Garage</option></select>{' '}
      <select name="transaction"><option value="vente">Vente</option><option value="location">Location</option></select><br />
      <input name="titre" placeholder="Titre" required /> <input name="ville" placeholder="Ville" required /> <input name="code_postal" placeholder="Code postal" pattern="[0-9]{5}" required /> <button>Créer</button></form>
    {(biens || []).map((b) => { const v = (vis || []).filter((x) => x.bien_id === b.id)
      return <div className="box" key={b.id}>
        <Link href={`/admin/annonces/${b.id}`}><b>{b.titre}</b></Link> — {b.type_bien}, {b.transaction}, {b.ville} — {b.transaction === 'vente' ? b.prix : b.loyer_hc} € — <i>{b.statut}</i><br />
        {v.length} IP distinctes · {v.reduce((a, x) => a + x.nb_visites, 0)} visites · dernière : {D(v[0]?.derniere_visite)}
        <details><summary>Détail par IP</summary><table><tbody><tr><th>IP</th><th>Visites</th><th>1re</th><th>Dernière</th></tr>
          {v.map((x) => <tr key={x.ip}><td>{x.ip}</td><td>{x.nb_visites}</td><td>{D(x.premiere_visite)}</td><td>{D(x.derniere_visite)}</td></tr>)}</tbody></table></details></div> })}
    <h2>Dernières demandes</h2>
    {(dem || []).map((d: any) => <div className="box" key={d.id}><b>{d.nom}</b> — {d.email} {d.telephone} — {D(d.created_at)} — {d.annonces_biens?.titre}<br />{d.message}</div>)}
  </>
}
