import Link from 'next/link'
import { db, isAdmin } from '@/lib/supabase'
import Admin from './admin/page'
import Secret from './Secret'
export const dynamic = 'force-dynamic'
const E = (n: any) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export default async function Home(props: { searchParams: Promise<{ err?: string }> }) {
  // Admin connecté : interface complète. Sinon : annonces publiées en lecture seule.
  if (await isAdmin()) return <Admin {...props} />
  const d = db()
  const { data: biens } = await d.from('annonces_biens').select('*').eq('statut', 'publie').order('created_at', { ascending: false })
  const { data: ph } = await d.from('annonces_photos').select('bien_id,storage_path').in('bien_id', (biens || []).map((b) => b.id)).order('position')
  return <main>
    <Secret title="Annonces immobilières" />
    {!biens?.length && <p>Aucune annonce pour le moment.</p>}
    <div className="g" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
      {(biens || []).map((b) => { const p = (ph || []).find((x) => x.bien_id === b.id)
        return <Link key={b.id} href={`/annonce/${b.slug}`} className="box" style={{ textDecoration: 'none', color: 'inherit' }}>
          {p && <img alt={b.titre} src={d.storage.from('annonces').getPublicUrl(p.storage_path).data.publicUrl} />}
          <b>{b.titre}</b><br />{b.transaction === 'vente' ? E(b.prix) : `${E(Number(b.loyer_hc) + Number(b.charges_recuperables || 0))} / mois CC`}<br />
          {b.type_bien === 'garage' ? 'Garage' : 'Appartement'} · {b.ville}{b.surface_m2 && ` · ${b.surface_m2} m²`}</Link> })}
    </div>
    <footer><a href="/legal/mentions-legales">Mentions légales</a> · <a href="/legal/confidentialite">Confidentialité</a></footer>
  </main>
}
