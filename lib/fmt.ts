// Petits formateurs partagés (prix, ligne d'infos, URL des photos)
export const E = (n: any) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const prix = (b: any) => b.transaction === 'vente' ? E(b.prix) : `${E(Number(b.loyer_hc) + Number(b.charges_recuperables || 0))} / mois CC`
export const info = (b: any) => [b.type_bien === 'garage' ? 'Garage' : 'Appartement', b.ville, b.nb_pieces ? `${b.nb_pieces} pièces` : null, b.surface_m2 ? `${String(b.surface_m2).replace('.', ',')} m²` : null].filter(Boolean).join(' · ')
export const photoUrl = (p: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/annonces/${p}`
