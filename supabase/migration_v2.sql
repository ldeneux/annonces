-- =====================================================================
-- Migration v2 : plus de suivi d'IP, plus de mentions légales / formulaire de contact
-- À exécuter dans Supabase > SQL Editor (après annonces_immobilier.sql)
-- =====================================================================

-- 1. Coordonnées du propriétaire (récupère nom / téléphone / email de l'ancien « éditeur »)
create table if not exists immobilier.annonces_contact (
  id smallint primary key default 1 check (id = 1),
  nom text, telephone text, email text
);
do $$ begin
  if to_regclass('immobilier.annonces_editeur') is not null then
    insert into immobilier.annonces_contact (id, nom, telephone, email)
      select 1, nom, telephone, email from immobilier.annonces_editeur where id = 1
      on conflict (id) do nothing;
  end if;
end $$;

-- 2. Réglages de l'affiche « À VENDRE »
create table if not exists immobilier.annonces_affiche (
  id smallint primary key default 1 check (id = 1),
  titre text, description text,
  afficher_tel boolean not null default true,
  bien_ids uuid[] not null default '{}'
);

-- 3. Suppression de tout ce qui touche aux IP, aux demandes et aux mentions légales
drop function if exists immobilier.annonces_log_visite(uuid, text);
drop function if exists immobilier.annonces_purge();
drop table if exists immobilier.annonces_visites;
drop table if exists immobilier.annonces_demandes;
drop table if exists immobilier.annonces_editeur;

-- 4. Publication libre : les champs légaux ne bloquent plus la mise en ligne
alter table immobilier.annonces_biens
  drop constraint if exists annonces_dpe_obligatoire,
  drop constraint if exists annonces_location_mentions,
  drop constraint if exists annonces_vente_honoraires,
  drop constraint if exists annonces_vente_copro,
  drop constraint if exists annonces_zone_encadree;

-- 5. Sécurité (RLS) et droits des nouvelles tables
alter table immobilier.annonces_contact enable row level security;
alter table immobilier.annonces_affiche enable row level security;
create policy contact_public_select on immobilier.annonces_contact for select to anon, authenticated using (true);
create policy contact_admin_all on immobilier.annonces_contact for all to authenticated using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
create policy affiche_admin_all on immobilier.annonces_affiche for all to authenticated using (immobilier.annonces_is_admin()) with check (immobilier.annonces_is_admin());
grant select on immobilier.annonces_contact to anon;
grant select, insert, update, delete on immobilier.annonces_contact, immobilier.annonces_affiche to authenticated;
grant all on immobilier.annonces_contact, immobilier.annonces_affiche to service_role;
