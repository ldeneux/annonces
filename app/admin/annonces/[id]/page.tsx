import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/supabase'
import { photoUrl, carac } from '@/lib/fmt'
import Shell from '../../../Shell'
import { AdminMenu } from '../../../parts'
import Up from './Up'
export const dynamic = 'force-dynamic'
// nom|libellé|type (t,n,b,d,s:a/b)|groupe ('' = toujours, vente, location, app = appartement)
const FIELDS = `statut|Statut|s:brouillon/publie/archive|
titre|Titre|t|
slug|Adresse web (slug)|t|
ville|Ville|t|
code_postal|Code postal|t|
adresse|Adresse (facultatif, non affichée)|t|
surface_m2|Surface (m²)|n|
surface_carrez_m2|Surface loi Carrez (m²)|n|vente
nb_pieces|Pièces|n|app
etage|Étage (0 = RDC)|n|app
prix|Prix de vente (€)|n|vente
honoraires_a_charge|Honoraires à la charge de|s:vendeur/acquereur|vente
honoraires_montant|Honoraires (€)|n|vente
prix_hors_honoraires|Prix hors honoraires (€)|n|vente
copropriete|Copropriété|b|vente
copro_nb_lots|Nombre de lots|n|vente
copro_charges_annuelles|Charges annuelles (€)|n|vente
copro_procedure_en_cours|Procédure en cours (copro)|b|vente
loyer_hc|Loyer mensuel HC (€)|n|location
charges_recuperables|Charges (€/mois)|n|location
modalites_charges|Modalités des charges|s:provision/forfait|location
depot_garantie|Dépôt de garantie (€)|n|location
honoraires_locataire|Honoraires locataire (€)|n|location
zone_encadrement_loyers|Zone d'encadrement des loyers|b|location
loyer_reference|Loyer de référence (€/m²)|n|location
loyer_reference_majore|Loyer de référence majoré (€/m²)|n|location
complement_loyer|Complément de loyer (€)|n|location
dpe_non_soumis|Non soumis au DPE|b|
dpe_classe_energie|Classe énergie|s:A/B/C/D/E/F/G|app
dpe_classe_climat|Classe climat (GES)|s:A/B/C/D/E/F/G|app
dpe_conso_kwh_m2_an|Consommation (kWh/m²/an)|n|app
dpe_emissions_ges_kg_m2_an|Émissions GES (kg/m²/an)|n|app
dpe_cout_min_an|Dépenses annuelles min (€)|n|app
dpe_cout_max_an|Dépenses annuelles max (€)|n|app
dpe_annee_reference_prix|Année de référence des prix énergie|n|app
dpe_date|Date du DPE|d|app
dpe_numero_ademe|N° ADEME|t|app`.split('\n').map((l) => l.split('|'))
const sec = (n: string) => n.startsWith('dpe_') ? 'DPE' : n.startsWith('copro') ? 'Copropriété' : ['loyer', 'charges_r', 'modalites', 'depot', 'honoraires_l', 'zone', 'complement'].some((p) => n.startsWith(p)) ? 'Location' : ['prix', 'honoraires'].some((p) => n.startsWith(p)) ? 'Prix' : 'Le bien'

export default async function Edit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { id } = await params, q = await searchParams, s = await requireAdmin()
  const { data: b } = await s.from('annonces_biens').select('*').eq('id', id).maybeSingle()
  if (!b) notFound()
  const { data: ph } = await s.from('annonces_photos').select('*').eq('bien_id', id).order('position')
  const vis = ([, , , g]: string[]) => !g || g === b.transaction || (g === 'app' && b.type_bien === 'appartement')

  async function save(f: FormData) {
    'use server'
    const s = await requireAdmin(), u: any = {}
    for (const n of f.getAll('_k') as string[]) {
      const k = FIELDS.find((x) => x[0] === n)![2], v = String(f.get(n) ?? '')
      u[n] = k === 'b' ? f.get(n) === 'on' : v === '' && !['titre', 'slug', 'ville', 'code_postal'].includes(n) ? null : k === 'n' ? Number(v) : v
    }
    u.description = String(f.get('description') || '') || null
    u.caracteristiques = String(f.get('carac') || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.search(/[:=]/); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
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
  async function setCover(f: FormData) {
    'use server'
    // La photo passe devant toutes les autres (position plus petite que la plus petite existante)
    const s = await requireAdmin()
    const { data: first } = await s.from('annonces_photos').select('position').eq('bien_id', id).order('position').limit(1).maybeSingle()
    await s.from('annonces_photos').update({ position: (first?.position ?? 0) - 1 }).eq('id', String(f.get('pid')))
    redirect(`/admin/annonces/${id}`)
  }
  async function del() { 'use server'; const s = await requireAdmin(); await s.from('annonces_biens').delete().eq('id', id); redirect('/admin') }

  return <Shell side={<AdminMenu extra={<Link className="side-link" href={`/annonce/${b.slug}`}>Voir l'annonce</Link>} />}>
    <Link href="/admin" className="back">← Mes annonces</Link>
    <h1 className="t" style={{ marginTop: 10 }}>{b.titre}</h1>
    {q.err && <p className="err">⚠ {q.err}</p>}{q.ok && <p className="ok">Enregistré</p>}
    <form action={save}>
      {['Le bien', 'Prix', 'Copropriété', 'Location', 'DPE'].map((S) => { const fs = FIELDS.filter(vis).filter((f) => sec(f[0]) === S)
        return fs.length > 0 && <section className="card" key={S}><h3 className="lbl">{S}</h3><div className="fgrid">
          {fs.map(([n, l, k]) => <label key={n}><input type="hidden" name="_k" value={n} />{k === 'b' ? <><input type="checkbox" name={n} defaultChecked={!!b[n]} /> {l}</> : <>{l}
            {k.startsWith('s:') ? <select name={n} defaultValue={b[n] ?? ''}>{n !== 'statut' && <option value="" />}{k.slice(2).split('/').map((o) => <option key={o}>{o}</option>)}</select>
              : <input name={n} type={k === 'n' ? 'number' : k === 'd' ? 'date' : 'text'} step="any" defaultValue={b[n] ?? ''} />}</>}</label>)}</div></section> })}
      <section className="card"><h3 className="lbl">Descriptif & caractéristiques</h3>
        <label>Descriptif<textarea name="description" rows={8} defaultValue={b.description ?? ''} /></label>
        <label>Caractéristiques (une par ligne : « libellé : valeur »)<textarea name="carac" rows={7} placeholder={'🏢 Ascenseur : Non\n🚗 Parking : Oui\n📦 Cave : Oui\n☀️ Terrasse : Oui'} defaultValue={carac(b.caracteristiques).map(([k, v]) => v ? `${k} : ${v}` : k).join('\n')} /></label></section>
      <button className="btn">Enregistrer</button></form>
    <section className="card" style={{ marginTop: 16 }}><h3 className="lbl">Photos (la première sert de couverture)</h3><Up id={id} save={addPhotos} />
      <div className="thumbs" style={{ marginTop: 12 }}>{(ph || []).map((p) => <form action={delPhoto} key={p.id}><img src={photoUrl(p.storage_path)} alt="" /><input type="hidden" name="pid" value={p.id} /><input type="hidden" name="path" value={p.storage_path} /><div className="row" style={{ marginTop: 6 }}><button formAction={setCover} className="btn ghost" style={{ padding: '4px 12px' }}>★ En premier</button><button className="btn ghost" style={{ padding: '4px 12px' }}>Supprimer</button></div></form>)}</div></section>
    <form action={del}><button className="btn red">Supprimer l'annonce</button></form>
  </Shell>
}
