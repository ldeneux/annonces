import Link from 'next/link'
import { db, isAdmin } from '@/lib/supabase'
import { prix, info, photoUrl } from '@/lib/fmt'
import Shell from './Shell'
import { AdminMenu, DPE_COL } from './parts'
export const dynamic = 'force-dynamic'
export default async function Home() {
  const d = db(), adm = !!(await isAdmin())
  const { data: biens } = await d.from('annonces_biens').select('*').eq('statut', 'publie').order('created_at', { ascending: false })
  const { data: ph } = await d.from('annonces_photos').select('bien_id,storage_path').in('bien_id', (biens || []).map((b) => b.id)).order('position')
  return <Shell side={adm && <AdminMenu />}>
    {!biens?.length && <div className="card muted">Aucune annonce pour le moment.</div>}
    <div className="ads">{(biens || []).map((b) => { const p = (ph || []).find((x) => x.bien_id === b.id), k = 'ABCDEFG'.indexOf(b.dpe_classe_energie || '')
      return <Link key={b.id} href={`/annonce/${b.slug}`} className="ad">
        <div className="ad-img">{p ? <img alt={b.titre} src={photoUrl(p.storage_path)} /> : <span>Pas de photo</span>}
          {!b.dpe_non_soumis && k >= 0 && <i className="badge" style={{ background: DPE_COL[k] }}>DPE {b.dpe_classe_energie}</i>}</div>
        <div className="ad-body"><div className="ad-price">{prix(b)}</div><h2>{b.titre}</h2><div className="muted">{info(b)}</div>
          {b.description && <p className="ad-desc">{b.description}</p>}</div></Link> })}</div>
  </Shell>
}
