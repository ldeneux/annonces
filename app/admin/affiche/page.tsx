import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase'
import Shell from '../../Shell'
import { AdminMenu } from '../../parts'
export const dynamic = 'force-dynamic'
export default async function Affiche({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const q = await searchParams, s = await requireAdmin()
  const { data: biens } = await s.from('annonces_biens').select('id,titre,statut').order('created_at', { ascending: false })
  const { data: cfg } = await s.from('annonces_affiche').select('*').maybeSingle()
  const sel: string[] = cfg?.bien_ids || []
  async function save(f: FormData) {
    'use server'
    const s = await requireAdmin()
    const { error } = await s.from('annonces_affiche').upsert({ id: 1, titre: String(f.get('titre') || ''), description: String(f.get('description') || ''), afficher_tel: f.get('afficher_tel') === 'on', bien_ids: f.getAll('ids').map(String), mentions: Object.fromEntries([...f.entries()].filter(([k, v]) => k.startsWith('mention_') && String(v).trim()).map(([k, v]) => [k.slice(8), String(v).trim()])) })
    redirect('/admin/affiche?' + (error ? 'err=' + encodeURIComponent(error.message) : 'ok=1'))
  }
  return <Shell side={<AdminMenu />}>
    <h1 className="t">Affiche « À VENDRE »</h1>
    <p className="muted">Le prix n'apparaît pas sur l'affiche : tu peux ajouter une mention par bien (VENDU, SOUS OFFRE…). Le QR code pointe vers la page d'accueil du site (le même pour toutes les annonces). Le PDF est un vrai PDF généré côté serveur.</p>
    {q.err && <p className="err">⚠ {q.err}</p>}{q.ok && <p className="ok">Enregistré — aperçu mis à jour</p>}
    <form action={save} className="card"><h3 className="lbl">Contenu</h3>
      <label>Titre<input name="titre" defaultValue={cfg?.titre ?? ''} /></label>
      <label>Description courte<textarea name="description" rows={3} defaultValue={cfg?.description ?? ''} /></label>
      <label><input type="checkbox" name="afficher_tel" defaultChecked={cfg?.afficher_tel ?? true} /> Afficher mon numéro de téléphone</label>
      <h3 className="lbl" style={{ marginTop: 16 }}>Biens à afficher</h3>
      <datalist id="mentions"><option value="VENDU" /><option value="SOUS OFFRE" /><option value="SOUS COMPROMIS" /><option value="NOUVEAU PRIX" /></datalist>
      {(biens || []).map((b) => <div className="arow" key={b.id}>
        <label style={{ margin: 0 }}><input type="checkbox" name="ids" value={b.id} defaultChecked={sel.includes(b.id)} /> {b.titre} <span className="chip">{b.statut}</span></label>
        <input name={`mention_${b.id}`} list="mentions" placeholder="Mention (VENDU, SOUS OFFRE…)" defaultValue={cfg?.mentions?.[b.id] ?? ''} style={{ maxWidth: 260 }} /></div>)}
      <button className="btn" style={{ marginTop: 10 }}>Enregistrer</button></form>
    <section className="card"><h3 className="lbl">Aperçu PDF</h3>
      <iframe src={`/admin/affiche/pdf?v=${Date.now()}`} style={{ width: '100%', height: 640, border: '1px solid var(--line)', borderRadius: 12 }} />
      <p><a className="btn ghost" href="/admin/affiche/pdf" target="_blank">Ouvrir / télécharger le PDF</a></p></section>
  </Shell>
}
