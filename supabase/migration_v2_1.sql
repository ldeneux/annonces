-- Migration v2.1 : mention libre par bien sur l'affiche (VENDU, SOUS OFFRE…)
alter table immobilier.annonces_affiche add column if not exists mentions jsonb not null default '{}'::jsonb;
