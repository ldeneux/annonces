import { notFound } from 'next/navigation'
import { db } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
export default async function Legal({ params }: { params: Promise<{ p: string }> }) {
  const { p } = await params
  const { data: e } = await db().from('annonces_editeur').select('*').maybeSingle()
  if (!e || !['mentions-legales', 'confidentialite'].includes(p)) notFound()
  if (p === 'mentions-legales') return <main><h1>Mentions légales</h1>
    <p><b>Éditeur :</b> {e.nom}, {e.adresse} — {e.email}{e.telephone && ` — ${e.telephone}`}{e.statut === 'particulier' ? ' (particulier)' : ''}</p>
    {e.directeur_publication && <p><b>Directeur de la publication :</b> {e.directeur_publication}</p>}
    {e.statut === 'professionnel' && <p>SIRET : {e.siret} · Carte professionnelle n° {e.carte_pro_numero} ({e.carte_pro_prefecture}) · Garantie financière : {e.garantie_financiere} · RCP : {e.assurance_rcp}</p>}
    <p><b>Hébergement :</b> {e.hebergeur_nom}, {e.hebergeur_adresse}. Base de données et stockage : {e.base_donnees_nom}.</p></main>
  return <main><h1>Politique de confidentialité</h1>
    <p><b>Responsable du traitement :</b> {e.nom} ({e.email}).</p>
    <p><b>Données collectées et finalités :</b> (1) adresse IP, nombre de visites, dates de première et dernière visite d'une annonce, pour mesurer sa fréquentation ; (2) nom, email, téléphone et message saisis dans le formulaire, pour répondre à votre demande.</p>
    <p><b>Base légale :</b> intérêt légitime (mesure de fréquentation) et consentement (formulaire de contact).</p>
    <p><b>Durées de conservation :</b> {e.duree_conservation_visites_mois} mois pour les données de visite ; {e.duree_conservation_demandes_mois} mois pour les demandes.</p>
    <p><b>Destinataires :</b> l'éditeur du site ; sous-traitants techniques : {e.hebergeur_nom} et {e.base_donnees_nom}.</p>
    <p><b>Vos droits :</b> accès, rectification, effacement, opposition, limitation : écrivez à {e.email}. Vous pouvez saisir la CNIL (cnil.fr). Ce site n'utilise aucun cookie de suivi.</p></main>
}
