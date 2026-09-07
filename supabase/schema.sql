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
-- depuis longtemps (choisir-sport.js exige une session) : elles ne servent
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

-- ============================================================
-- MIGRATION — Sport du tournoi (football, rugby...)
-- ============================================================
-- Choisi en tout premier lors de la création (voir creer-tournoi.js) : les
-- réglages qui en dépendent (pour l'instant, uniquement le vocabulaire du
-- score — "buts" ou "points", voir lib/sports.js) s'adaptent en fonction.
alter table tournois add column if not exists sport text not null default 'football'
  check (sport in ('football', 'rugby'));

-- ============================================================
-- MIGRATION — Départage rugby (élimination directe) et points bonus
-- ============================================================
-- Le rugby n'a pas de tirs au but : en cas d'égalité en élimination directe,
-- l'organisateur choisit entre prolongation, mort subite ou un drop goal
-- décisif (voir creer-tournoi.js). Football garde ses valeurs existantes.
alter table tournois drop constraint if exists tournois_mode_departage_check;
alter table tournois add constraint tournois_mode_departage_check
  check (mode_departage in (
    'prolongations_tab', 'tab_direct', -- football
    'prolongation', 'mort_subite', 'drop_goal', -- rugby
    'autre'
  ));

-- Points bonus (rugby) : réglage optionnel de l'organisateur, saisi ensuite
-- match par match sur l'écran de saisie du score (voir tournoi/[id]/saisie.js)
-- et ajouté au total de points en poule (voir lib/classement.js).
alter table tournois add column if not exists points_bonus boolean not null default false;
alter table resultats add column if not exists bonus_a int not null default 0;
alter table resultats add column if not exists bonus_b int not null default 0;

-- ============================================================
-- MIGRATION — Ajout du handball comme sport disponible
-- ============================================================
-- Mêmes réglages que le football (buts, barème 3/1/0, pas de points bonus) —
-- voir lib/sports.js.
alter table tournois drop constraint if exists tournois_sport_check;
alter table tournois add constraint tournois_sport_check
  check (sport in ('football', 'rugby', 'handball'));

-- ============================================================
-- MIGRATION — Ajout du basket-ball et du tennis comme sports disponibles
-- ============================================================
-- Mêmes réglages que le football (barème 3/1/0, pas de points bonus), seul
-- le vocabulaire du score change (points pour le basket, sets pour le
-- tennis) — voir lib/sports.js.
alter table tournois drop constraint if exists tournois_sport_check;
alter table tournois add constraint tournois_sport_check
  check (sport in ('football', 'rugby', 'handball', 'basketball', 'tennis'));

-- ============================================================
-- MIGRATION — Départage basket (élimination directe)
-- ============================================================
-- Le basket a ses propres options de départage en cas d'égalité en
-- élimination directe (tirs au panier plutôt qu'au but) — voir
-- creer-tournoi.js.
alter table tournois drop constraint if exists tournois_mode_departage_check;
alter table tournois add constraint tournois_mode_departage_check
  check (mode_departage in (
    'prolongations_tab', 'tab_direct', -- football / handball / tennis
    'prolongation', 'mort_subite', 'drop_goal', -- rugby
    'prolongation_tirs_panier', 'prolongation_vainqueur', 'tirs_panier_direct', -- basket
    'autre'
  ));

-- ============================================================
-- MIGRATION — Sets gagnants (tennis)
-- ============================================================
-- Nombre de sets à remporter pour gagner un match : 1 (set unique), 2
-- (meilleur des 3, par défaut) ou 3 (meilleur des 5) — réglage saisi par
-- l'organisateur à la création du tournoi, voir tournoi/[id]/equipes.js.
alter table tournois add column if not exists sets_gagnants int not null default 2
  check (sets_gagnants in (2, 3));

-- Ajout de l'option "1 set gagnant" (set unique) à la liste ci-dessus.
alter table tournois drop constraint if exists tournois_sets_gagnants_check;
alter table tournois add constraint tournois_sets_gagnants_check
  check (sets_gagnants in (1, 2, 3));

-- ============================================================
-- MIGRATION — Simple ou double (tennis)
-- ============================================================
-- Format du tournoi de tennis, choisi à la création (voir creer-tournoi.js,
-- réglages avancés) : simple, un·e joueur·se par équipe (par défaut), ou
-- double, une paire. Ne change que la question posée à la création — les
-- équipes/joueurs restent stockés de la même façon (equipes.nom).
alter table tournois add column if not exists tennis_double boolean not null default false;

-- ============================================================
-- MIGRATION — Co-organisateurs (saisie de scores en direct par d'autres personnes)
-- ============================================================
-- Un co-organisateur est un utilisateur invité par l'organisateur principal,
-- via un code d'invitation dédié (distinct de tournois.code_acces, qui est
-- public — voir qrcode.js/suivi/[code]/index.js), qui obtient un
-- sous-ensemble des droits de l'organisateur sur CE tournoi : l'organisateur
-- principal choisit, pour chaque co-organisateur, s'il peut saisir les
-- scores, gérer le tournoi (équipes, réglages, phases suivantes) et/ou le
-- supprimer (voir tournoi/[id]/co-organisateurs.js).
create table if not exists tournoi_organisateurs (
  tournoi_id uuid references tournois(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  peut_saisir_scores boolean not null default true,
  peut_gerer_le_tournoi boolean not null default false,
  peut_supprimer_le_tournoi boolean not null default false,
  created_at timestamptz default now(),
  primary key (tournoi_id, user_id)
);

alter table tournoi_organisateurs enable row level security;

drop policy if exists "Organisateur principal gere ses co-organisateurs" on tournoi_organisateurs;
create policy "Organisateur principal gere ses co-organisateurs" on tournoi_organisateurs for all
  using (auth.uid() = (select organisateur_id from tournois where id = tournoi_id));

drop policy if exists "Co-organisateur voit sa propre ligne" on tournoi_organisateurs;
create policy "Co-organisateur voit sa propre ligne" on tournoi_organisateurs for select
  using (auth.uid() = user_id);

-- Code d'invitation co-organisateur : table séparée de "tournois" pour ne
-- jamais l'exposer via les lectures publiques (select * sur tournois,
-- utilisées par ex. par suivi/[code]/index.js pour le suivi spectateur).
create table if not exists invitations_organisateur (
  tournoi_id uuid primary key references tournois(id) on delete cascade,
  code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

alter table invitations_organisateur enable row level security;

drop policy if exists "Organisateur principal gere son code d'invitation" on invitations_organisateur;
create policy "Organisateur principal gere son code d'invitation" on invitations_organisateur for all
  using (auth.uid() = (select organisateur_id from tournois where id = tournoi_id));

-- Fonction sécurisée pour rejoindre un tournoi comme co-organisateur à
-- partir d'un code d'invitation : "security definer" pour pouvoir vérifier
-- le code sans donner à tout le monde le droit de lire
-- invitations_organisateur (sans quoi les codes seraient énumérables).
-- Retourne l'id du tournoi si le code est valide, null sinon.
create or replace function rejoindre_comme_co_organisateur(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournoi_id uuid;
begin
  select tournoi_id into v_tournoi_id from invitations_organisateur where code = p_code;
  if v_tournoi_id is null then
    return null;
  end if;

  insert into tournoi_organisateurs (tournoi_id, user_id)
  values (v_tournoi_id, auth.uid())
  on conflict (tournoi_id, user_id) do nothing;

  return v_tournoi_id;
end;
$$;

grant execute on function rejoindre_comme_co_organisateur(text) to authenticated;

-- Permet à l'organisateur principal de voir le profil (nom/prénom) de ses
-- co-organisateurs, pour les identifier dans l'écran de gestion.
drop policy if exists "Organisateur principal voit le profil de ses co-organisateurs" on profils;
create policy "Organisateur principal voit le profil de ses co-organisateurs" on profils for select
  using (
    exists (
      select 1 from tournoi_organisateurs co
      join tournois t on t.id = co.tournoi_id
      where co.user_id = profils.id and t.organisateur_id = auth.uid()
    )
  );

-- Fonction utilitaire de policy : l'utilisateur courant a-t-il le droit
-- demandé sur ce tournoi (organisateur principal, ou co-organisateur avec ce
-- droit précis) ? Centralise la logique pour les policies ci-dessous.
create or replace function a_le_droit(p_tournoi_id uuid, p_droit text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from tournois where id = p_tournoi_id and organisateur_id = auth.uid()
  ) or exists (
    select 1 from tournoi_organisateurs
    where tournoi_id = p_tournoi_id
      and user_id = auth.uid()
      and case p_droit
        when 'saisir_scores' then peut_saisir_scores
        when 'gerer_le_tournoi' then peut_gerer_le_tournoi
        when 'supprimer_le_tournoi' then peut_supprimer_le_tournoi
        else false
      end
  );
$$;

grant execute on function a_le_droit(uuid, text) to authenticated;

-- Les policies suivantes remplacent les précédentes pour prendre en compte
-- les co-organisateurs (auparavant limitées à auth.uid() = organisateur_id).
drop policy if exists "Organisateur modifie son tournoi" on tournois;
create policy "Organisateur modifie son tournoi" on tournois for update
  using (a_le_droit(id, 'gerer_le_tournoi'));

-- La suppression du tournoi (voir tournoi/[id]/equipes.js, supprimerTournoi)
-- n'avait jusqu'ici aucune policy dédiée : sans policy explicite pour la
-- commande DELETE, RLS la refuse silencieusement (0 ligne supprimée, pas
-- d'erreur) même pour l'organisateur principal. On l'ajoute ici avec son
-- propre droit ("peut_supprimer_le_tournoi"), plus restrictif par défaut que
-- "gerer_le_tournoi" pour un co-organisateur.
drop policy if exists "Organisateur supprime son tournoi" on tournois;
create policy "Organisateur supprime son tournoi" on tournois for delete
  using (a_le_droit(id, 'supprimer_le_tournoi'));

drop policy if exists "Organisateur gere les poules" on poules;
create policy "Organisateur gere les poules" on poules for all
  using (a_le_droit(tournoi_id, 'gerer_le_tournoi'));

drop policy if exists "Organisateur gere les equipes" on equipes;
create policy "Organisateur gere les equipes" on equipes for all
  using (a_le_droit(tournoi_id, 'gerer_le_tournoi'));

drop policy if exists "Organisateur gere les matchs" on matchs;
create policy "Organisateur gere les matchs" on matchs for all
  using (a_le_droit(tournoi_id, 'gerer_le_tournoi'));

drop policy if exists "Organisateur saisit les resultats" on resultats;
create policy "Organisateur saisit les resultats" on resultats for all
  using (a_le_droit((select tournoi_id from matchs where id = match_id), 'saisir_scores'));

-- ============================================================
-- MIGRATION — Déblocage premium par tournoi (Pass Tournoi / Pro)
-- ============================================================
-- "debloque" = true si le tournoi a été débloqué via un achat "Pass
-- Tournoi" pour CE tournoi précis. Un utilisateur Pro n'a pas besoin que
-- ce flag soit vrai : son statut Pro (vérifié côté client via le SDK
-- RevenueCat) débloque tous ses tournois — voir lib/achats.js,
-- tournoiEstDebloque(). Passe déjà par la policy UPDATE existante
-- ("Organisateur modifie son tournoi", a_le_droit(id, 'gerer_le_tournoi')),
-- aucune nouvelle policy nécessaire.
alter table tournois add column if not exists debloque boolean not null default false;
