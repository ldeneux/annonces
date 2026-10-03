-- =====================================================================
-- Annonces immobilières (QR code) — schéma "immobilier", tables "annonces_*"
-- À exécuter dans Supabase > SQL Editor
-- =====================================================================

create schema if not exists immobilier;

-- ---------------------------------------------------------------------
-- 0. Utilitaires
-- ---------------------------------------------------------------------
create or replace function immobilier.annonces_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- 1. Admins (qui a le droit de gérer les annonces)
--    Après création de ton compte dans Auth > Users :
--    insert into immobilier.annonces_admins(user_id) values ('<ton-uuid>');
-- ---------------------------------------------------------------------
create table immobilier.annonces_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function immobilier.annonces_is_admin()
returns boolean language sql stable security definer
set search_path = immobilier, auth, pg_temp as $$
  select exists (select 1 from immobilier.annonces_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2. Éditeur du site (mentions légales — une seule ligne)
-- ---------------------------------------------------------------------
create table immobilier.annonces_editeur (
  id smallint primary key default 1 check (id = 1),
  statut text not null check (statut in ('particulier','professionnel')),
  nom text not null,                       -- nom/prénom ou raison sociale
  adresse text not null,
  email text not null,
  telephone text,
  directeur_publication text,
  -- Si professionnel (agent, mandataire…)
  siret text,
  carte_pro_numero text,
  carte_pro_prefecture text,
  garantie_financiere text,
  assurance_rcp text,
  -- Hébergement (à vérifier/adapter avant mise en ligne)
  hebergeur_nom text default 'Vercel Inc.',
  hebergeur_adresse text default '440 N Barranca Ave #4133, Covina, CA 91723, USA',
  base_donnees_nom text default 'Supabase Inc.',
  -- RGPD
  duree_conservation_visites_mois int not null default 12,
  duree_conservation_demandes_mois int not null default 36,
  updated_at timestamptz not null default now(),
  check (statut = 'particulier' or (siret is not null and carte_pro_numero is not null))
);

-- ---------------------------------------------------------------------
-- 3. Biens / annonces
-- ---------------------------------------------------------------------
create table immobilier.annonces_biens (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                       -- URL stable : /annonce/<slug> (QR code)
  statut text not null default 'brouillon' check (statut in ('brouillon','publie','archive')),
  type_bien text not null check (type_bien in ('garage','appartement')),
  transaction text not null check (transaction in ('vente','location')),
  titre text not null,
  description text,

  -- Localisation (obligatoire : au minimum commune / code postal)
  ville text not null,
  code_postal text not null check (code_postal ~ '^[0-9]{5}$'),
  adresse text,                                    -- adresse précise facultative (non affichée si vide)

  -- Caractéristiques communes
  surface_m2 numeric(8,2) check (surface_m2 > 0),
  surface_carrez_m2 numeric(8,2) check (surface_carrez_m2 > 0),  -- loi Carrez (vente d'un lot de copropriété)
  nb_pieces smallint,
  etage smallint,
  -- Caractéristiques propres au type (ex. garage : longueur, porte motorisée, borne…
  --  appartement : balcon, ascenseur, parking, cave, chauffage…)
  caracteristiques jsonb not null default '{}'::jsonb,

  -- VENTE : prix + honoraires
  prix numeric(12,2) check (prix > 0),             -- prix affiché (FAI si honoraires à la charge de l'acquéreur)
  honoraires_a_charge text check (honoraires_a_charge in ('vendeur','acquereur')),
  honoraires_montant numeric(12,2),
  prix_hors_honoraires numeric(12,2),              -- à afficher si honoraires acquéreur

  -- VENTE en copropriété
  copropriete boolean,
  copro_nb_lots int,
  copro_charges_annuelles numeric(10,2),           -- montant moyen annuel de la quote-part de charges
  copro_procedure_en_cours boolean,                -- procédure en cours visant la copropriété

  -- LOCATION
  loyer_hc numeric(10,2) check (loyer_hc > 0),     -- loyer mensuel hors charges
  charges_recuperables numeric(10,2),
  modalites_charges text check (modalites_charges in ('provision','forfait')),
  depot_garantie numeric(10,2),
  honoraires_locataire numeric(10,2),              -- (professionnel) honoraires à la charge du locataire
  honoraires_locataire_etat_des_lieux numeric(10,2),
  zone_encadrement_loyers boolean not null default false,
  loyer_reference numeric(10,2),                   -- €/m² (si zone encadrée)
  loyer_reference_majore numeric(10,2),            -- €/m²
  complement_loyer numeric(10,2),

  -- DPE (obligatoire pour les logements ; un garage non chauffé est non soumis)
  dpe_non_soumis boolean not null default false,
  dpe_classe_energie char(1) check (dpe_classe_energie in ('A','B','C','D','E','F','G')),
  dpe_classe_climat char(1) check (dpe_classe_climat in ('A','B','C','D','E','F','G')),
  dpe_conso_kwh_m2_an numeric(6,1),
  dpe_emissions_ges_kg_m2_an numeric(6,1),
  dpe_cout_min_an numeric(8,2),                    -- fourchette de dépenses annuelles théoriques
  dpe_cout_max_an numeric(8,2),
  dpe_annee_reference_prix smallint,               -- année de référence des prix de l'énergie
  dpe_date date,
  dpe_numero_ademe text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un seul type de prix selon la transaction
  constraint annonces_prix_selon_transaction check (
    (transaction = 'vente'    and prix is not null) or
    (transaction = 'location' and loyer_hc is not null)
  ),
  -- Publication impossible sans les mentions légales obligatoires
  constraint annonces_dpe_obligatoire check (
    statut <> 'publie' or type_bien <> 'appartement' or dpe_non_soumis or (
      dpe_classe_energie is not null and dpe_classe_climat is not null and
      dpe_cout_min_an is not null and dpe_cout_max_an is not null and
      dpe_annee_reference_prix is not null and dpe_date is not null)
  ),
  constraint annonces_location_mentions check (
    statut <> 'publie' or transaction <> 'location' or (
      charges_recuperables is not null and modalites_charges is not null)
  ),
  constraint annonces_vente_honoraires check (
    statut <> 'publie' or transaction <> 'vente' or honoraires_a_charge is null or (
      honoraires_a_charge = 'vendeur' or (honoraires_montant is not null and prix_hors_honoraires is not null))
  ),
  constraint annonces_vente_copro check (
    statut <> 'publie' or transaction <> 'vente' or type_bien <> 'appartement' or (
      copropriete is not null and
      (copropriete = false or (copro_nb_lots is not null and copro_charges_annuelles is not null
                               and copro_procedure_en_cours is not null and surface_carrez_m2 is not null)))
  ),
  constraint annonces_zone_encadree check (
    statut <> 'publie' or not zone_encadrement_loyers or (
      loyer_reference is not null and loyer_reference_majore is not null)
  )
);
create index annonces_biens_statut_idx on immobilier.annonces_biens(statut);
create trigger annonces_biens_updated before update on immobilier.annonces_biens
  for each row execute function immobilier.annonces_set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Photos (fichiers dans Supabase Storage, bucket "annonces")
-- ---------------------------------------------------------------------
create table immobilier.annonces_photos (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid not null references immobilier.annonces_biens(id) on delete cascade,
  storage_path text not null,
  alt text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index annonces_photos_bien_idx on immobilier.annonces_photos(bien_id, position);

-- ---------------------------------------------------------------------
-- 5. Visites : 1 ligne par (annonce, IP) avec compteur, 1re et dernière visite
-- ---------------------------------------------------------------------
create table immobilier.annonces_visites (
  bien_id uuid not null references immobilier.annonces_biens(id) on delete cascade,
  ip text not null,
  nb_visites int not null default 1,
  premiere_visite timestamptz not null default now(),
  derniere_visite timestamptz not null default now(),
  primary key (bien_id, ip)
);
create index annonces_visites_derniere_idx on immobilier.annonces_visites(derniere_visite);

create or replace function immobilier.annonces_log_visite(p_bien uuid, p_ip text)
returns void language sql security definer
set search_path = immobilier, pg_temp as $$
  insert into immobilier.annonces_visites (bien_id, ip) values (p_bien, p_ip)
  on conflict (bien_id, ip)
  do update set nb_visites = annonces_visites.nb_visites + 1, derniere_visite = now();
$$;

-- ---------------------------------------------------------------------
-- 6. Demandes de renseignements / contact (consentement tracé)
-- ---------------------------------------------------------------------
create table immobilier.annonces_demandes (
  id uuid primary key default gen_random_uuid(),
  bien_id uuid references immobilier.annonces_biens(id) on delete set null,
  nom text not null,
  email text not null,
  telephone text,
  message text,
  ip text,
  consentement boolean not null check (consentement),   -- case cochée obligatoire
  consentement_at timestamptz not null default now(),
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Purge RGPD (à planifier, ex. pg_cron : 1 fois par jour)
--    select cron.schedule('annonces-purge', '0 3 * * *', 'select immobilier.annonces_purge()');
-- ---------------------------------------------------------------------
create or replace function immobilier.annonces_purge()
returns void language plpgsql security definer
set search_path = immobilier, pg_temp as $$
declare v_visites int := 12; v_demandes int := 36;
begin
  select duree_conservation_visites_mois, duree_conservation_demandes_mois
    into v_visites, v_demandes from immobilier.annonces_editeur where id = 1;
  delete from immobilier.annonces_visites
    where derniere_visite < now() - make_interval(months => coalesce(v_visites, 12));
  delete from immobilier.annonces_demandes
    where created_at < now() - make_interval(months => coalesce(v_demandes, 36));
end $$;

-- ---------------------------------------------------------------------
-- 8. Sécurité : RLS
-- ---------------------------------------------------------------------
alter table immobilier.annonces_admins   enable row level security;
alter table immobilier.annonces_editeur  enable row level security;
alter table immobilier.annonces_biens    enable row level security;
alter table immobilier.annonces_photos   enable row level security;
alter table immobilier.annonces_visites  enable row level security;
alter table immobilier.annonces_demandes enable row level security;

-- Public : annonces publiées, leurs photos, et l'éditeur (mentions légales)
create policy biens_public_select on immobilier.annonces_biens
  for select to anon, authenticated using (statut = 'publie');
create policy photos_public_select on immobilier.annonces_photos
  for select to anon, authenticated using (
    exists (select 1 from immobilier.annonces_biens b where b.id = bien_id and b.statut = 'publie'));
create policy editeur_public_select on immobilier.annonces_editeur
  for select to anon, authenticated using (true);

-- Admin : tout
create policy biens_admin_all    on immobilier.annonces_biens    for all to authenticated
  using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
create policy photos_admin_all   on immobilier.annonces_photos   for all to authenticated
  using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
create policy editeur_admin_all  on immobilier.annonces_editeur  for all to authenticated
  using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
create policy visites_admin_sel  on immobilier.annonces_visites  for select to authenticated
  using (immobilier.annonces_is_admin());
create policy demandes_admin_all on immobilier.annonces_demandes for all to authenticated
  using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
create policy admins_self_select on immobilier.annonces_admins   for select to authenticated
  using (user_id = auth.uid());

-- Les écritures publiques (visites, contact) passent UNIQUEMENT par le serveur Next.js (service_role)
revoke all on function immobilier.annonces_log_visite(uuid, text) from public, anon, authenticated;
revoke all on function immobilier.annonces_purge() from public, anon, authenticated;
grant execute on function immobilier.annonces_log_visite(uuid, text) to service_role;
grant execute on function immobilier.annonces_purge() to service_role;

-- Droits d'accès au schéma (RLS filtre ensuite les lignes)
grant usage on schema immobilier to anon, authenticated, service_role;
grant select on immobilier.annonces_biens, immobilier.annonces_photos, immobilier.annonces_editeur to anon;
grant select, insert, update, delete on all tables in schema immobilier to authenticated;
grant all on all tables in schema immobilier to service_role;

-- ---------------------------------------------------------------------
-- 9. Stockage des photos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('annonces', 'annonces', true)
  on conflict (id) do nothing;

create policy annonces_storage_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'annonces' and immobilier.annonces_is_admin())
  with check (bucket_id = 'annonces' and immobilier.annonces_is_admin());
-- (lecture publique assurée par bucket public = true)

-- IMPORTANT : Supabase > Project Settings > API > "Exposed schemas" : ajouter "immobilier"
