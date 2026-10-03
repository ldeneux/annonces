import { redirect, notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { requireAdmin } from '@/lib/supabase'
import Up from './Up'
// nom|libellé|type (t,n,b,d,s:a/b)|groupe ('' = toujours, vente, location, app = appartement)
const FIELDS = `statut|Statut|s:brouillon/publie/archive|
titre|Titre|t|
slug|Slug (URL du QR code)|t|
ville|Ville|t|
code_postal|Code postal|t|
adresse|Adresse (facultatif)|t|
surface_m2|Surface (m²)|n|
surface_carrez_m2|Surface loi Carrez (m²)|n|vente
nb_pieces|Pièces|n|app
etage|Étage|n|app
prix|Prix de vente (€)|n|vente
honoraires_a_charge|Honoraires à la charge de|s:vendeur/acquereur|vente
honoraires_montant|Honoraires (€)|n|vente
prix_hors_honoraires|Prix hors honoraires (€)|n|vente
copropriete|Copropriété|b|vente
copro_nb_lots|Nombre de lots|n|vente
copro_charges_annuelles|Charges annuelles (€)|n|vente
copro_procedure_en_cours|Procédure en cours (copro)|b|vente
loyer_hc|Loyer mensuel HC (€)|n|location
charges_recuperables|Charges récupérables (€/mois)|n|location
modalites_charges|Modalités des charges|s:provision/forfait|location
depot_garantie|Dépôt de garantie (€)|n|location
honoraires_locataire|Honoraires locataire (€)|n|location
zone_encadrement_loyers|Zone d'encadrement des loyers|b|location
loyer_reference|Loyer de référence (€/m²)|n|location
loyer_reference_majore|Loyer de référence majoré (€/m²)|n|location
complement_loyer|Complément de loyer (€)|n|location
dpe_non_soumis|Non soumis au DPE|b|
dpe_classe_energie|Classe énergie|s:A/B/C/D/E/F/G|app
dpe_classe_climat|Classe climat|s:A/B/C/D/E/F/G|app
dpe_conso_kwh_m2_an|Consommation (kWh/m²/an)|n|app
dpe_emissions_ges_kg_m2_an|Émissions GES (kg/m²/an)|n|app
dpe_cout_min_an|Dépenses annuelles min (€)|n|app
dpe_cout_max_an|Dépenses annuelles max (€)|n|app
dpe_annee_reference_prix|Année de référence des prix énergie|n|app
dpe_date|Date du DPE|d|app
dpe_numero_ademe|N° ADEME|t|app
description|Description|t|x`.split('\n').map((l) => l.split('|'))

export default async function Edit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { id } = await params, q = await searchParams, s = await requireAdmin()
  const { data: b } = await s.from('annonces_biens').select('*').eq('id', id).maybeSingle()
  if (!b) notFound()
  const { data: ph } = await s.from('annonces_photos').select('*').eq('bien_id', id).order('position')
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/annonce/${b.slug}`
  const qr = await QRCode.toDataURL(link, { width: 600, margin: 2 })
  const vis = ([, , , g]: string[]) => !g || g === b.transaction || (g === 'app' && b.type_bien === 'appartement')

  async function save(f: FormData) {
    'use server'
    const s = await requireAdmin(), u: any = {}
    for (const n of f.getAll('_k') as string[]) {
      const k = FIELDS.find((x) => x[0] === n)![2], v = String(f.get(n) ?? '')
      u[n] = k === 'b' ? f.get(n) === 'on' : v === '' && !['titre', 'slug', 'ville', 'code_postal'].includes(n) ? null : k === 'n' ? Number(v) : v
    }
    u.caracteristiques = Object.fromEntries(String(f.get('carac') || '').split('\n').filter((l) => l.includes('=')).map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()]))
    const { error } = await s.from('annonces_biens').update(u).eq('id', id)
    redirect(`/admin/annonces/${id}?${error ? 'err=' + encodeURIComponent(error.message) : 'ok=1'}`)
  }
  async function addPhotos(paths: string[]) {
    'use server'
    const s = await requireAdmin()
    if (paths.length) await s.from('annonces_photos').insert(paths.map((p, i) => ({ bien_id: id, storage_path: p, position: Date.now() % 1e9 + i })))
  }
  async function delPhoto(f: FormData) {
    'use server'
    const s = await requireAdmin()
    await s.storage.from('annonces').remove([String(f.get('path'))])
    await s.from('annonces_photos').delete().eq('id', String(f.get('pid')))
    redirect(`/admin/annonces/${id}`)
  }
  async function del() { 'use server'; const s = await requireAdmin(); await s.from('annonces_biens').delete().eq('id', id); redirect('/') }

  return <>
    <a href="/">← Retour</a><h1>{b.titre}</h1>
    <p>{b.type_bien} · {b.transaction} — <a href={link} target="_blank">{link}</a></p>
    {q.err && <p className="err">⚠ {q.err}<br /><small>(une mention légale obligatoire est probablement manquante : l'annonce n'est pas publiée)</small></p>}{q.ok && <p className="ok">Enregistré</p>}
    <form action={save}>
      {FIELDS.filter(vis).map(([n, l, k]) => <label key={n}><input type="hidden" name="_k" value={n} />{k === 'b' ? <><input type="checkbox" name={n} defaultChecked={!!b[n]} /> {l}</> : <>{l}<br />
        {k.startsWith('s:') ? <select name={n} defaultValue={b[n] ?? ''}>{n !== 'statut' && <option value="" />}{k.slice(2).split('/').map((o) => <option key={o}>{o}</option>)}</select>
          : <input name={n} type={k === 'n' ? 'number' : k === 'd' ? 'date' : 'text'} step="any" defaultValue={b[n] ?? ''} />}</>}</label>)}
      <label><input type="hidden" name="_k" value="description" />Description<br /><textarea name="description" rows={6} cols={50} defaultValue={b.description ?? ''} /></label>
      <label>Caractéristiques (une par ligne : clé=valeur)<br /><textarea name="carac" rows={6} cols={50} defaultValue={Object.entries(b.caracteristiques || {}).map(([k, v]) => `${k}=${v}`).join('\n')} /></label>
      <button>Enregistrer</button></form>
    <h2>Photos</h2><Up id={id} save={addPhotos} />
    <div className="g">{(ph || []).map((p) => <form action={delPhoto} key={p.id}><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/annonces/${p.storage_path}`} /><input type="hidden" name="pid" value={p.id} /><input type="hidden" name="path" value={p.storage_path} /><button>Supprimer</button></form>)}</div>
    <h2>QR code</h2><img src={qr} width={240} /><br /><a href={qr} download={`qr-${b.slug}.png`}>Télécharger le PNG</a>
    <form action={del} style={{ marginTop: 40 }}><button>Supprimer l'annonce</button></form>
  </>
}
