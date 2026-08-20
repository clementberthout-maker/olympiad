-- OLYMPIAD — Schéma de base de données Supabase (V1)
-- Correspond au modèle de données défini dans 03-MODELE-DONNEES.md

-- Extension pour générer des UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : tournois
-- ============================================================
create table tournois (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  format text not null check (format in ('poules', 'elimination_directe', 'mixte')),
  date_debut date not null,
  lieu text,
  code_acces text not null unique default substr(md5(random()::text), 1, 6),
  mode_departage text not null default 'prolongations_tab'
    check (mode_departage in ('prolongations_tab', 'tab_direct', 'autre')),
  critere_departage_poule text not null default 'diff_buts'
    check (critere_departage_poule in ('diff_buts', 'confrontation_directe', 'autre')),
  organisateur_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : poules
-- N'existe que si le format du tournoi comprend une phase de poules
-- ============================================================
create table poules (
  id uuid primary key default uuid_generate_v4(),
  tournoi_id uuid references tournois(id) on delete cascade not null,
  nom text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : equipes
-- ============================================================
create table equipes (
  id uuid primary key default uuid_generate_v4(),
  tournoi_id uuid references tournois(id) on delete cascade not null,
  poule_id uuid references poules(id) on delete set null,
  nom text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : matchs
-- ============================================================
create table matchs (
  id uuid primary key default uuid_generate_v4(),
  tournoi_id uuid references tournois(id) on delete cascade not null,
  equipe_a_id uuid references equipes(id) not null,
  equipe_b_id uuid references equipes(id) not null,
  phase text not null,
  horaire timestamptz not null,
  terrain text,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : resultats
-- Séparée du match : un match sans résultat est "à venir"
-- ============================================================
create table resultats (
  match_id uuid primary key references matchs(id) on delete cascade,
  score_a int not null default 0,
  score_b int not null default 0,
  statut text not null default 'a_venir'
    check (statut in ('a_venir', 'en_cours', 'termine')),
  updated_at timestamptz default now()
);

-- ============================================================
-- SÉCURITÉ (Row Level Security)
-- ============================================================
alter table tournois enable row level security;
alter table poules enable row level security;
alter table equipes enable row level security;
alter table matchs enable row level security;
alter table resultats enable row level security;

-- Lecture publique de tout (accès spectateur/équipe via code, sans compte)
create policy "Lecture publique des tournois" on tournois for select using (true);
create policy "Lecture publique des poules" on poules for select using (true);
create policy "Lecture publique des equipes" on equipes for select using (true);
create policy "Lecture publique des matchs" on matchs for select using (true);
create policy "Lecture publique des resultats" on resultats for select using (true);

-- Écriture réservée à l'organisateur du tournoi concerné
create policy "Organisateur cree son tournoi" on tournois for insert
  with check (auth.uid() = organisateur_id);
create policy "Organisateur modifie son tournoi" on tournois for update
  using (auth.uid() = organisateur_id);

create policy "Organisateur gere les poules" on poules for all
  using (auth.uid() = (select organisateur_id from tournois where id = tournoi_id));

create policy "Organisateur gere les equipes" on equipes for all
  using (auth.uid() = (select organisateur_id from tournois where id = tournoi_id));

create policy "Organisateur gere les matchs" on matchs for all
  using (auth.uid() = (select organisateur_id from tournois where id = tournoi_id));

create policy "Organisateur saisit les resultats" on resultats for all
  using (auth.uid() = (select organisateur_id from tournois t
                        join matchs m on m.tournoi_id = t.id
                        where m.id = match_id));

-- ============================================================
-- TEMPS RÉEL
-- Active la diffusion en direct des changements de résultats
-- ============================================================
alter publication supabase_realtime add table resultats;
alter publication supabase_realtime add table matchs;

-- ============================================================
-- MIGRATION — Phase finale à élimination directe après les poules
-- (nombre de qualifiés par poule, matchs "exempts"/bye, tirs au but)
-- ============================================================
alter table tournois add column if not exists nombre_qualifies_par_poule int not null default 2;

-- Un match "exempt" (bye) qualifie directement equipe_a_id pour le tour
-- suivant quand le nombre d'équipes n'est pas une puissance de 2.
alter table matchs alter column equipe_b_id drop not null;

-- Score des tirs au but, utilisé uniquement pour départager un match à
-- élimination directe terminé sur un score de parité.
alter table resultats add column if not exists score_tab_a int;
alter table resultats add column if not exists score_tab_b int;

-- ============================================================
-- MIGRATION — Photo de profil
-- ============================================================
alter table profils add column if not exists photo_url text;

-- Permet à un utilisateur connecté de modifier son propre profil
-- (nom, prénom, club, photo) depuis l'écran "Mon profil".
drop policy if exists "Utilisateur modifie son propre profil" on profils;
create policy "Utilisateur modifie son propre profil"
on profils for update
using (auth.uid() = id);

-- Bucket public pour les photos de profil : une image par utilisateur,
-- nommée "<user_id>.<extension>" (voir lib/profil.js).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Lecture publique des photos de profil" on storage.objects;
create policy "Lecture publique des photos de profil"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Un utilisateur televerse sa propre photo" on storage.objects;
create policy "Un utilisateur televerse sa propre photo"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

drop policy if exists "Un utilisateur remplace sa propre photo" on storage.objects;
create policy "Un utilisateur remplace sa propre photo"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

drop policy if exists "Un utilisateur supprime sa propre photo" on storage.objects;
create policy "Un utilisateur supprime sa propre photo"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '.', 1));

-- ============================================================
-- MIGRATION — Nettoyage des policies temporaires (pré-authentification)
-- ============================================================
-- Ces policies autorisaient la création/gestion d'un tournoi sans compte,
-- le temps que l'authentification organisateur soit branchée. Elle l'est
-- depuis longtemps (creer-tournoi.js exige une session) : elles ne servent
-- plus qu'à laisser gérables d'éventuels tournois de test créés sans
-- organisateur_id à l'époque.
drop policy if exists "Temporaire - creation sans authentification" on tournois;
drop policy if exists "Temporaire - gestion equipes sans auth" on equipes;
drop policy if exists "Temporaire - gestion poules sans auth" on poules;
drop policy if exists "Temporaire - gestion matchs sans auth" on matchs;
drop policy if exists "Temporaire - gestion resultats sans auth" on resultats;

-- ============================================================
-- MIGRATION — Match pour la 3e place
-- ============================================================
-- Si activé, un match de classement entre les deux équipes battues en
-- demi-finale est proposé en même temps que la génération de la finale
-- (voir genererMatchTroisiemePlace dans lib/generation.js).
alter table tournois add column if not exists match_troisieme_place boolean not null default false;

-- ============================================================
-- MIGRATION — Suppression d'une équipe déjà engagée dans le calendrier
-- ============================================================
-- Par défaut (contrainte non nommée), une clé étrangère Postgres est en
-- RESTRICT : supprimer une équipe déjà référencée par des matchs échouait
-- silencieusement côté app (l'erreur n'était pas remontée). On passe ces
-- deux FK en CASCADE : supprimer une équipe supprime aussi ses matchs (et,
-- déjà en cascade via resultats, leurs résultats saisis).
alter table matchs drop constraint if exists matchs_equipe_a_id_fkey;
alter table matchs add constraint matchs_equipe_a_id_fkey
  foreign key (equipe_a_id) references equipes(id) on delete cascade;

alter table matchs drop constraint if exists matchs_equipe_b_id_fkey;
alter table matchs add constraint matchs_equipe_b_id_fkey
  foreign key (equipe_b_id) references equipes(id) on delete cascade;

-- Optionnel — à exécuter seulement si la requête ci-dessous renvoie 0 :
--   select count(*) from tournois where organisateur_id is null;
-- (sinon, ça bloquerait la migration à cause de tournois de test orphelins
-- qu'il faudrait d'abord supprimer manuellement)
-- alter table tournois alter column organisateur_id set not null;
