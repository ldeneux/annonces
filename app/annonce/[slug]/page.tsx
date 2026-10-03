import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
const E = (n: any) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
export default async function Annonce({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { slug } = await params, q = await searchParams, d = db()
  const { data: b } = await d.from('annonces_biens').select('*').eq('slug', slug).eq('statut', 'publie').maybeSingle()
  if (!b) notFound()
  const ip = ((await headers()).get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue'
  await d.rpc('annonces_log_visite', { p_bien: b.id, p_ip: ip })
  const [{ data: ph }, { data: ed }] = await Promise.all([d.from('annonces_photos').select('storage_path').eq('bien_id', b.id).order('position'), d.from('annonces_editeur').select('*').maybeSingle()])
  const vente = b.transaction === 'vente', cc = Number(b.loyer_hc || 0) + Number(b.charges_recuperables || 0)
  const car = Object.entries(b.caracteristiques || {})
  return <main>
    <h1>{b.titre}</h1>
    <p><b style={{ fontSize: '1.6em' }}>{vente ? E(b.prix) : `${E(cc)} / mois CC`}</b>{vente && b.honoraires_a_charge === 'acquereur' && <><br />Honoraires à la charge de l'acquéreur : {E(b.honoraires_montant)} — prix hors honoraires : {E(b.prix_hors_honoraires)}</>}</p>
    <p>{b.type_bien === 'garage' ? 'Garage' : 'Appartement'} à {b.ville} ({b.code_postal}){b.surface_m2 && ` · ${b.surface_m2} m²`}{b.nb_pieces && ` · ${b.nb_pieces} pièces`}{b.etage != null && ` · étage ${b.etage}`}</p>
    <div className="g">{(ph || []).map((p) => <img key={p.storage_path} alt={b.titre} src={d.storage.from('annonces').getPublicUrl(p.storage_path).data.publicUrl} />)}</div>
    {b.description && <p style={{ whiteSpace: 'pre-line' }}>{b.description}</p>}
    {car.length > 0 && <ul>{car.map(([k, v]) => <li key={k}>{k} : {String(v)}</li>)}</ul>}
    {vente ? <div className="box">{b.surface_carrez_m2 && <>Surface loi Carrez : {b.surface_carrez_m2} m²<br /></>}
      {b.copropriete && <>Bien en copropriété · {b.copro_nb_lots} lots · charges annuelles moyennes : {E(b.copro_charges_annuelles)} · procédure en cours : {b.copro_procedure_en_cours ? 'oui' : 'non'}</>}</div>
    : <div className="box">Loyer hors charges : {E(b.loyer_hc)} / mois<br />Charges récupérables : {E(b.charges_recuperables)} / mois ({b.modalites_charges === 'forfait' ? 'forfait' : 'provision sur charges'})
      {b.depot_garantie != null && <><br />Dépôt de garantie : {E(b.depot_garantie)}</>}{b.honoraires_locataire != null && <><br />Honoraires à la charge du locataire : {E(b.honoraires_locataire)}</>}
      {b.zone_encadrement_loyers && <><br />Zone d'encadrement des loyers — loyer de référence : {b.loyer_reference} €/m² · majoré : {b.loyer_reference_majore} €/m²{b.complement_loyer != null && ` · complément de loyer : ${E(b.complement_loyer)}`}</>}</div>}
    <div className="box">{b.dpe_non_soumis ? 'Bien non soumis au diagnostic de performance énergétique.' : <>
      <span className="dpe">CLASSE ÉNERGIE {b.dpe_classe_energie}</span> · <span className="dpe">CLASSE CLIMAT {b.dpe_classe_climat}</span><br />
      {b.dpe_conso_kwh_m2_an != null && <>{b.dpe_conso_kwh_m2_an} kWh/m²/an · {b.dpe_emissions_ges_kg_m2_an} kg CO₂/m²/an<br /></>}
      Dépenses annuelles d'énergie estimées entre {E(b.dpe_cout_min_an)} et {E(b.dpe_cout_max_an)} (prix de l'énergie : année {b.dpe_annee_reference_prix}).
      {['F', 'G'].includes(b.dpe_classe_energie) && <><br /><b>Logement à consommation énergétique excessive</b></>}</>}</div>
    <h2>Contact</h2>
    {ed && <p>{ed.nom}{ed.telephone && <> · <a href={`tel:${ed.telephone}`}>{ed.telephone}</a></>} · <a href={`mailto:${ed.email}`}>{ed.email}</a></p>}
    {q.ok && <p className="ok">Votre demande a bien été envoyée.</p>}{q.err && <p className="err">Erreur : merci de vérifier le formulaire.</p>}
    <form method="POST" action="/api/contact" className="box">
      <input type="hidden" name="bien_id" value={b.id} /><input type="hidden" name="back" value={`/annonce/${slug}`} />
      <input name="website" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <label>Nom<br /><input name="nom" required /></label><label>Email<br /><input name="email" type="email" required /></label>
      <label>Téléphone<br /><input name="telephone" /></label><label>Message<br /><textarea name="message" rows={4} cols={40} /></label>
      <label><input type="checkbox" name="consentement" required /> J'accepte que mes données soient utilisées pour traiter ma demande (<a href="/legal/confidentialite">politique de confidentialité</a>).</label>
      <button>Envoyer ma demande</button></form>
    <footer><a href="/legal/mentions-legales">Mentions légales</a> · <a href="/legal/confidentialite">Confidentialité</a></footer>
  </main>
}
