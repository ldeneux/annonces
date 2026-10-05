import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/supabase'
import { prix } from '@/lib/fmt'
import Shell from '../../Shell'
import { AdminMenu } from '../../parts'
export const dynamic = 'force-dynamic'
export default async function Affiche({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const q = await searchParams, s = await requireAdmin()
  const { data: biens } = await s.from('annonces_biens').select('id,titre,transaction,prix,loyer_hc,charges_recuperables,statut').order('created_at', { ascending: false })
  const { data: cfg } = await s.from('annonces_affiche').select('*').maybeSingle()
  const sel: string[] = cfg?.bien_ids || []
  async function save(f: FormData) {
    'use server'
    const s = await requireAdmin()
    const { error } = await s.from('annonces_affiche').upsert({ id: 1, titre: String(f.get('titre') || ''), description: String(f.get('description') || ''), afficher_tel: f.get('afficher_tel') === 'on', bien_ids: f.getAll('ids').map(String) })
    redirect('/admin/affiche?' + (error ? 'err=' + encodeURIComponent(error.message) : 'ok=1'))
  }
  return <Shell side={<AdminMenu />}>
    <h1 className="t">Affiche « À VENDRE »</h1>
    <p className="muted">Le QR code pointe vers la page d'accueil du site (le même pour toutes les annonces). Le PDF est un vrai PDF généré côté serveur.</p>
    {q.err && <p className="err">⚠ {q.err}</p>}{q.ok && <p className="ok">Enregistré — aperçu mis à jour</p>}
    <form action={save} className="card"><h3 className="lbl">Contenu</h3>
      <label>Titre<input name="titre" defaultValue={cfg?.titre ?? ''} /></label>
      <label>Description courte<textarea name="description" rows={3} defaultValue={cfg?.description ?? ''} /></label>
      <label><input type="checkbox" name="afficher_tel" defaultChecked={cfg?.afficher_tel ?? true} /> Afficher mon numéro de téléphone</label>
      <h3 className="lbl" style={{ marginTop: 16 }}>Biens à afficher</h3>
      {(biens || []).map((b) => <label key={b.id}><input type="checkbox" name="ids" value={b.id} defaultChecked={sel.includes(b.id)} /> {b.titre} — {prix(b)} <span className="chip">{b.statut}</span></label>)}
      <button className="btn" style={{ marginTop: 10 }}>Enregistrer</button></form>
    <section className="card"><h3 className="lbl">Aperçu PDF</h3>
      <iframe src={`/admin/affiche/pdf?v=${Date.now()}`} style={{ width: '100%', height: 640, border: '1px solid var(--line)', borderRadius: 12 }} />
      <p><a className="btn ghost" href="/admin/affiche/pdf" target="_blank">Ouvrir / télécharger le PDF</a></p></section>
  </Shell>
}
