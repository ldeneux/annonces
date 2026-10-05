import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, isAdmin } from '@/lib/supabase'
import { E, prix, photoUrl, carac } from '@/lib/fmt'
import Shell from '../../Shell'
import Gallery from '../../Gallery'
import { AdminMenu, Dpe } from '../../parts'
export const dynamic = 'force-dynamic'
export default async function Annonce({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, d = db(), adm = !!(await isAdmin())
  // Le propriétaire peut prévisualiser ses brouillons ; le public ne voit que le publié
  let q = d.from('annonces_biens').select('*').eq('slug', slug)
  if (!adm) q = q.eq('statut', 'publie')
  const { data: b } = await q.maybeSingle()
  if (!b) notFound()
  const [{ data: ph }, { data: autres }] = await Promise.all([
    d.from('annonces_photos').select('storage_path').eq('bien_id', b.id).order('position'),
    d.from('annonces_biens').select('slug,titre').eq('statut', 'publie').neq('id', b.id).order('created_at', { ascending: false })])
  const vente = b.transaction === 'vente'
  const ppm = vente && b.prix && b.surface_m2 ? Math.round(b.prix / b.surface_m2) : null
  const etage = b.etage == null ? null : b.etage === 0 ? 'RDC' : b.etage === 1 ? '1er étage' : `${b.etage}e étage`
  const ligne = [b.nb_pieces ? `${b.nb_pieces} pièces` : null, b.surface_m2 ? `${String(b.surface_m2).replace('.', ',')} m²` : null, etage].filter(Boolean)
  const facts: [string, string][] = [
    ...(b.surface_carrez_m2 ? [['Surface loi Carrez', `${String(b.surface_carrez_m2).replace('.', ',')} m²`] as [string, string]] : []),
    ...carac(b.caracteristiques)]
  const loc: [string, any][] = vente ? [] : ([
    ['Loyer hors charges', b.loyer_hc != null && `${E(b.loyer_hc)} / mois`], ['Charges', b.charges_recuperables != null && `${E(b.charges_recuperables)} / mois (${b.modalites_charges === 'forfait' ? 'forfait' : 'provision'})`],
    ['Dépôt de garantie', b.depot_garantie != null && E(b.depot_garantie)], ['Honoraires locataire', b.honoraires_locataire != null && E(b.honoraires_locataire)],
    ['Loyer de référence', b.zone_encadrement_loyers && `${b.loyer_reference} €/m² (majoré ${b.loyer_reference_majore} €/m²)`], ['Complément de loyer', b.complement_loyer != null && E(b.complement_loyer)]] as [string, any][]).filter(([, v]) => v)
  return <Shell side={<>{adm && <AdminMenu extra={<Link className="side-link" href={`/admin/annonces/${b.id}`}>Modifier cette annonce</Link>} />}
    {!!autres?.length && <section className="card"><h3 className="lbl">Autres annonces</h3>{autres.map((a) => <Link key={a.slug} className="side-link" href={`/annonce/${a.slug}`}>{a.titre}</Link>)}</section>}</>}>
    <Link href="/" className="back">← Annonces</Link>
    <h1 className="t" style={{ marginTop: 10 }}>{b.titre} {b.statut !== 'publie' && <span className="chip warn">{b.statut}</span>}</h1>
    <Gallery photos={(ph || []).map((p) => photoUrl(p.storage_path))} alt={b.titre} />
    <section className="card">
      <div className="muted" style={{ fontWeight: 600 }}>{b.type_bien === 'garage' ? 'Garage' : 'Appartement'} {vente ? 'à vendre' : 'à louer'} · {b.ville} ({b.code_postal})</div>
      <div className="row"><span className="price">{prix(b)}</span>{ppm && <span className="chip">{E(ppm)}/m²</span>}</div>
      {vente && b.honoraires_a_charge === 'acquereur' && <div className="muted" style={{ fontSize: '.9rem' }}>Honoraires à la charge de l'acquéreur : {E(b.honoraires_montant)} — prix hors honoraires : {E(b.prix_hors_honoraires)}</div>}
      {!!ligne.length && <p style={{ fontWeight: 600, marginBottom: 0 }}>{ligne.join(' · ')}</p>}
    </section>
    {b.description && <section className="card"><h2 className="t">Descriptif</h2><div style={{ whiteSpace: 'pre-line' }}>{b.description}</div></section>}
    {(facts.length > 0 || loc.length > 0) && <section className="card"><h2 className="t">Caractéristiques</h2>
      <div className="facts">{[...loc, ...facts].map(([k, v]) => <div key={k}><b>{k}</b>{String(v)}</div>)}</div></section>}
    <Dpe b={b} />
    {vente && b.copropriete && <section className="card"><h2 className="t">Informations sur la copropriété</h2><div className="facts">
      {b.copro_nb_lots != null && <div><b>Nombre de lots</b>{b.copro_nb_lots}</div>}
      {b.copro_charges_annuelles != null && <div><b>Charges de copropriété</b>{E(b.copro_charges_annuelles)}/an</div>}
      {b.copro_procedure_en_cours != null && <div><b>Procédures syndicales</b>{b.copro_procedure_en_cours ? 'Procédure en cours' : 'Pas de procédure en cours'}</div>}</div></section>}
  </Shell>
}
