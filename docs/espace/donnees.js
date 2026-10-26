/* OLYMPIAD — Espace organisateur : accès aux données.
   Deux sources avec la même interface :
   - Supabase : la vraie base de l'application (mêmes tables, mêmes règles
     d'accès, même temps réel) ;
   - démo (?demo=1) : données fictives gardées dans le navigateur, pour
     découvrir ou tester l'espace sans compte. Rien n'est envoyé. */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import {
  repartirEnPoules, genererCalendrierPoules, resultatsAutoPourExempts,
} from './moteur/generation.js';

// Mêmes valeurs que lib/supabase.js (clé publique, protégée par les règles d'accès)
const SUPABASE_URL = 'https://kqowpznkihaxamuizjzq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JhPDibj6cbhyFtoQac-owg_6ffE-kJ2';

export const MODE_DEMO = new URLSearchParams(location.search).has('demo');

// Une erreur Supabase garde son code (ex. OLY01 : limite de 12 équipes)
function verifier({ data, error }) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}

// =====================================================================
// Source Supabase
// =====================================================================
function sourceSupabase() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'olympiad-espace-auth' },
  });
  return {
    async session() { return (await sb.auth.getSession()).data.session; },
    surChangementAuth(cb) { return sb.auth.onAuthStateChange((evenement, session) => cb(evenement, session)).data.subscription; },
    async connexion(email, motDePasse) { return verifier(await sb.auth.signInWithPassword({ email, password: motDePasse })); },
    async inscription({ email, motDePasse, nom, prenom, club }, redirection) {
      return verifier(await sb.auth.signUp({ email, password: motDePasse, options: { data: { nom, prenom, club: club || null }, emailRedirectTo: redirection } }));
    },
    async deconnexion() { await sb.auth.signOut(); },
    async motDePasseOublie(email, redirection) { verifier(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirection })); },
    async changerMotDePasse(motDePasse) { verifier(await sb.auth.updateUser({ password: motDePasse })); },
    async changerEmail(email) { verifier(await sb.auth.updateUser({ email })); },

    async profil(uid) { return verifier(await sb.from('profils').select('*').eq('id', uid).maybeSingle()); },
    async majProfil(uid, champs) { verifier(await sb.from('profils').update(champs).eq('id', uid)); },
    async televerserPhoto(uid, blob) {
      const chemin = `${uid}.jpg`;
      verifier(await sb.storage.from('avatars').upload(chemin, blob, { upsert: true, contentType: 'image/jpeg' }));
      return `${sb.storage.from('avatars').getPublicUrl(chemin).data.publicUrl}?t=${Date.now()}`;
    },
    async supprimerPhoto(uid) {
      const fichiers = verifier(await sb.storage.from('avatars').list('', { search: uid })) || [];
      const aSupprimer = fichiers.map((f) => f.name).filter((n) => n.split('.')[0] === uid);
      if (aSupprimer.length) verifier(await sb.storage.from('avatars').remove(aSupprimer));
      verifier(await sb.from('profils').update({ photo_url: null }).eq('id', uid));
    },
    async estPro(uid) {
      const ligne = verifier(await sb.from('abonnements_pro').select('expire_le').eq('user_id', uid).maybeSingle());
      return Boolean(ligne) && (!ligne.expire_le || new Date(ligne.expire_le) > new Date());
    },
    async supprimerMonCompte(uid) {
      const fichiers = verifier(await sb.storage.from('avatars').list('', { search: uid })) || [];
      const aSupprimer = fichiers.map((f) => f.name).filter((n) => n.split('.')[0] === uid);
      if (aSupprimer.length) verifier(await sb.storage.from('avatars').remove(aSupprimer));
      verifier(await sb.rpc('supprimer_mon_compte'));
      await sb.auth.signOut({ scope: 'local' });
    },

    // Tournois dont l'utilisateur est organisateur principal ou co-organisateur
    // (hors corbeille ; les épreuves d'olympiade sont montrées dans leur olympiade)
    async mesTournois(uid) {
      const miens = verifier(await sb.from('tournois').select('*').eq('organisateur_id', uid).is('supprime_le', null).is('olympiade_id', null).order('created_at', { ascending: false })) || [];
      const lignes = verifier(await sb.from('tournoi_organisateurs').select('*').eq('user_id', uid)) || [];
      let coorgs = [];
      if (lignes.length) {
        coorgs = verifier(await sb.from('tournois').select('*').in('id', lignes.map((l) => l.tournoi_id)).is('supprime_le', null)) || [];
      }
      return [
        ...miens.map((t) => ({ ...t, role: 'principal' })),
        ...coorgs.filter((t) => t.organisateur_id !== uid).map((t) => ({ ...t, role: 'co', droits: lignes.find((l) => l.tournoi_id === t.id) })),
      ];
    },
    async chargerTournoi(id) {
      const tournoi = verifier(await sb.from('tournois').select('*').eq('id', id).maybeSingle());
      if (!tournoi) return null;
      const [poules, equipes, matchs] = await Promise.all([
        sb.from('poules').select('*').eq('tournoi_id', id).order('nom').then(verifier),
        sb.from('equipes').select('*').eq('tournoi_id', id).order('created_at').then(verifier),
        sb.from('matchs').select('*').eq('tournoi_id', id).order('horaire').then(verifier),
      ]);
      const resultats = (matchs || []).length ? verifier(await sb.from('resultats').select('*').in('match_id', matchs.map((m) => m.id))) : [];
      return { tournoi, poules: poules || [], equipes: equipes || [], matchs: matchs || [], resultats: resultats || [] };
    },
    async tournoiParCode(code) { return verifier(await sb.from('tournois').select('*').ilike('code_acces', code).maybeSingle()); },
    async droits(tournoiId, uid) {
      return verifier(await sb.from('tournoi_organisateurs').select('*').eq('tournoi_id', tournoiId).eq('user_id', uid).maybeSingle());
    },
    async creerTournoi(champs) { return verifier(await sb.from('tournois').insert(champs).select().single()); },
    async majTournoi(id, champs) { verifier(await sb.from('tournois').update(champs).eq('id', id)); },
    async supprimerTournoi(id) { verifier(await sb.from('tournois').delete().eq('id', id)); },
    async supprimerMatchs(ids) { if (ids.length) verifier(await sb.from('matchs').delete().in('id', ids)); },

    // Corbeille (30 jours, voir supabase/schema.sql)
    async mettreALaCorbeille(type, id) {
      verifier(type === 'olympiade'
        ? await sb.rpc('mettre_olympiade_a_la_corbeille', { p_olympiade_id: id })
        : await sb.rpc('mettre_tournoi_a_la_corbeille', { p_tournoi_id: id }));
    },
    async restaurer(type, id) {
      verifier(type === 'olympiade'
        ? await sb.rpc('restaurer_olympiade', { p_olympiade_id: id })
        : await sb.rpc('restaurer_tournoi', { p_tournoi_id: id }));
    },
    async corbeille(uid) {
      const [tournois, olympiades] = await Promise.all([
        sb.from('tournois').select('id, nom, supprime_le').eq('organisateur_id', uid).not('supprime_le', 'is', null).then(verifier),
        sb.from('olympiades').select('id, nom, supprime_le').eq('organisateur_id', uid).not('supprime_le', 'is', null).then(verifier),
      ]);
      return [...(tournois || []).map((x) => ({ ...x, type: 'tournoi' })), ...(olympiades || []).map((x) => ({ ...x, type: 'olympiade' }))];
    },

    // Olympiades multisports
    async mesOlympiades(uid) {
      return verifier(await sb.from('olympiades').select('*').eq('organisateur_id', uid).is('supprime_le', null).order('created_at', { ascending: false })) || [];
    },
    async olympiadeParCode(code) { return verifier(await sb.from('olympiades').select('*').ilike('code_acces', code).maybeSingle()); },
    // Olympiade, équipes communes et toutes ses épreuves avec leurs matchs
    async chargerOlympiade(id) {
      const olympiade = verifier(await sb.from('olympiades').select('*').eq('id', id).maybeSingle());
      if (!olympiade) return null;
      const [equipesOlympiade, tournois] = await Promise.all([
        sb.from('olympiade_equipes').select('*').eq('olympiade_id', id).order('created_at').then(verifier),
        sb.from('tournois').select('*').eq('olympiade_id', id).is('supprime_le', null).order('created_at').then(verifier),
      ]);
      const ids = (tournois || []).map((t) => t.id);
      let poules = []; let equipes = []; let matchs = [];
      if (ids.length) {
        [poules, equipes, matchs] = await Promise.all([
          sb.from('poules').select('*').in('tournoi_id', ids).order('nom').then(verifier),
          sb.from('equipes').select('*').in('tournoi_id', ids).then(verifier),
          sb.from('matchs').select('*, resultats(*)').in('tournoi_id', ids).order('horaire').then(verifier),
        ]);
      }
      matchs = (matchs || []).map(({ resultats, ...m }) => ({ ...m, resultat: (Array.isArray(resultats) ? resultats[0] : resultats) || undefined }));
      return { olympiade, equipesOlympiade: equipesOlympiade || [], tournois: tournois || [], poules: poules || [], equipes: equipes || [], matchs };
    },
    async creerOlympiade(champs) { return verifier(await sb.from('olympiades').insert(champs).select().single()); },
    async majOlympiade(id, champs) { verifier(await sb.from('olympiades').update(champs).eq('id', id)); },
    async equipesOlympiade(olympiadeId) { return verifier(await sb.from('olympiade_equipes').select('*').eq('olympiade_id', olympiadeId).order('created_at')) || []; },
    async ajouterEquipesOlympiade(lignes) { return verifier(await sb.from('olympiade_equipes').insert(lignes).select()) || []; },
    async supprimerEquipeOlympiade(id) { verifier(await sb.from('olympiade_equipes').delete().eq('id', id)); },
    async insererEquipes(lignes) { return verifier(await sb.from('equipes').insert(lignes).select()); },
    async supprimerEquipe(id) { verifier(await sb.from('equipes').delete().eq('id', id)); },
    async creerPoule(tournoiId, nom) { return verifier(await sb.from('poules').insert({ tournoi_id: tournoiId, nom }).select().single()); },
    async affecterPoule(idsEquipes, pouleId) { verifier(await sb.from('equipes').update({ poule_id: pouleId }).in('id', idsEquipes)); },
    async insererMatchs(matchs) { return verifier(await sb.from('matchs').insert(matchs).select()); },
    async viderCalendrier(tournoiId) {
      verifier(await sb.from('matchs').delete().eq('tournoi_id', tournoiId));
      verifier(await sb.from('poules').delete().eq('tournoi_id', tournoiId));
    },
    async insererResultats(lignes) { verifier(await sb.from('resultats').insert(lignes)); },
    async enregistrerResultat(ligne) { verifier(await sb.from('resultats').upsert(ligne)); },
    async supprimerResultat(matchId) { verifier(await sb.from('resultats').delete().eq('match_id', matchId)); },

    async invitation(tournoiId) {
      let ligne = verifier(await sb.from('invitations_organisateur').select('code').eq('tournoi_id', tournoiId).maybeSingle());
      if (!ligne) ligne = verifier(await sb.from('invitations_organisateur').insert({ tournoi_id: tournoiId }).select('code').single());
      return ligne.code;
    },
    async coOrganisateurs(tournoiId) {
      const lignes = verifier(await sb.from('tournoi_organisateurs').select('*').eq('tournoi_id', tournoiId).order('created_at')) || [];
      const ids = lignes.map((l) => l.user_id);
      const profils = ids.length ? (verifier(await sb.from('profils').select('id, nom, prenom, photo_url').in('id', ids)) || []) : [];
      return lignes.map((l) => ({ ...l, profil: profils.find((p) => p.id === l.user_id) || null }));
    },
    async majDroit(tournoiId, uid, champ, valeur) { verifier(await sb.from('tournoi_organisateurs').update({ [champ]: valeur }).eq('tournoi_id', tournoiId).eq('user_id', uid)); },
    async retirerCoOrganisateur(tournoiId, uid) { verifier(await sb.from('tournoi_organisateurs').delete().eq('tournoi_id', tournoiId).eq('user_id', uid)); },
    async rejoindreCommeCoOrganisateur(code) { return verifier(await sb.rpc('rejoindre_comme_co_organisateur', { p_code: code })); },

    // Temps réel : comme l'app (suivi/[code]), toute modification de
    // résultat ou de match déclenche un rechargement du tournoi affiché
    tempsReel(tournoiId, quandChange, quandEtat) {
      const canal = sb.channel(`espace-${tournoiId}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, (e) => quandChange('resultats', e))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matchs', filter: `tournoi_id=eq.${tournoiId}` }, (e) => quandChange('matchs', e))
        .subscribe((etat) => quandEtat && quandEtat(etat === 'SUBSCRIBED'));
      return () => sb.removeChannel(canal);
    },
    // Olympiade : tout résultat peut changer le classement général
    tempsReelOlympiade(quandChange) {
      const canal = sb.channel(`espace-olympiade-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, () => quandChange())
        .subscribe();
      return () => sb.removeChannel(canal);
    },
  };
}

// =====================================================================
// Source démo (dans le navigateur)
// =====================================================================
function sourceDemo() {
  const CLE = 'olympiad-espace-demo';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const pause = (ms = 120) => new Promise((ok) => setTimeout(ok, ms));
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel(CLE) : null;
  const abonnes = new Set();
  let base = null;
  try { base = JSON.parse(localStorage.getItem(CLE)); } catch (e) { base = null; }
  const enregistrer = (table) => {
    try { localStorage.setItem(CLE, JSON.stringify(base)); } catch (e) { /* stockage indisponible */ }
    if (canal) canal.postMessage({ table });
  };
  if (canal) canal.onmessage = (e) => { try { base = JSON.parse(localStorage.getItem(CLE)); } catch (er) { /* rien */ } abonnes.forEach((f) => f(e.data.table)); };
  const MOI = '00000000-0000-4000-8000-000000000001';
  const AUTRE = '00000000-0000-4000-8000-000000000002';

  function semer() {
    base = { session: true, profils: [{ id: MOI, prenom: 'Camille', nom: 'Martin', club: 'AS Montagne', photo_url: null, email: 'camille@exemple.fr' }, { id: AUTRE, prenom: 'Lucas', nom: 'Faure', club: null, photo_url: null }],
      tournois: [], poules: [], equipes: [], matchs: [], resultats: [], tournoi_organisateurs: [], invitations: [], pro: false };
    const date = new Date(); date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const creer = (nom, sport, organisateur, noms, avecScores) => {
      const t = { id: uuid(), nom, sport, format: 'mixte', date_debut: iso, code_acces: Math.random().toString(36).slice(2, 8), organisateur_id: organisateur,
        nombre_terrains: 2, heure_premier_match: '09:00', duree_match: 12, mi_temps: false, duree_mi_temps: null, temps_pause: 3, pause_dejeuner: false,
        heure_debut_pause: null, heure_fin_pause: null, nombre_qualifies_par_poule: 2, match_troisieme_place: true, points_bonus: false, sets_gagnants: 2,
        tennis_double: false, critere_departage_poule: 'diff_buts', mode_departage: 'prolongations_tab', debloque: false, created_at: new Date().toISOString() };
      base.tournois.push(t);
      const equipes = noms.map((n, i) => ({ id: uuid(), tournoi_id: t.id, nom: n, poule_id: null, created_at: new Date(Date.now() + i).toISOString() }));
      base.equipes.push(...equipes);
      const groupes = repartirEnPoules(equipes, 2);
      const poules = groupes.map((g, i) => {
        const p = { id: uuid(), tournoi_id: t.id, nom: `Poule ${String.fromCharCode(65 + i)}`, created_at: new Date().toISOString() };
        base.poules.push(p);
        g.forEach((e) => { base.equipes.find((x) => x.id === e.id).poule_id = p.id; });
        return { id: p.id, nom: p.nom, equipes: g };
      });
      const reglages = { dateDebut: iso, heureDebut: '09:00', dureeCreneauMinutes: 15, dureeMatchMinutes: 12, nombreTerrains: 2, pauseDejeuner: false };
      const matchs = genererCalendrierPoules(poules, t.id, reglages).map((m) => ({ ...m, id: uuid(), created_at: new Date().toISOString() }));
      base.matchs.push(...matchs);
      if (avecScores) {
        matchs.slice(0, Math.floor(matchs.length * 0.5)).forEach((m) => base.resultats.push({ match_id: m.id, score_a: Math.floor(Math.random() * 4), score_b: Math.floor(Math.random() * 4), statut: 'termine', bonus_a: 0, bonus_b: 0, score_tab_a: null, score_tab_b: null }));
      }
      return t;
    };
    creer('Tournoi U13 de printemps', 'football', MOI, ['Racing Vallée', 'FC Rivière', 'AS Montagne', 'Étoile Sud', 'US Collines', 'Stade Bocage', 'Olympique Lac', 'Les Aigles'], true);
    const co = creer('Challenge handball du club', 'handball', AUTRE, ['Lions', 'Panthères', 'Faucons', 'Requins', 'Ours', 'Loups'], false);
    base.tournoi_organisateurs.push({ tournoi_id: co.id, user_id: MOI, peut_saisir_scores: true, peut_gerer_le_tournoi: false, peut_supprimer_le_tournoi: false, created_at: new Date().toISOString() });
    enregistrer('tout');
  }
  if (!base) semer();
  // Démo enregistrée avant les olympiades et la corbeille
  base.olympiades = base.olympiades || []; base.olympiade_equipes = base.olympiade_equipes || [];
  const copie = (x) => JSON.parse(JSON.stringify(x));
  const visible = (t) => !t.supprime_le;
  const effacerTournoi = (id) => {
    const ids = base.matchs.filter((m) => m.tournoi_id === id).map((m) => m.id);
    base.tournois = base.tournois.filter((t) => t.id !== id); base.poules = base.poules.filter((p) => p.tournoi_id !== id);
    base.equipes = base.equipes.filter((e) => e.tournoi_id !== id); base.matchs = base.matchs.filter((m) => m.tournoi_id !== id);
    base.resultats = base.resultats.filter((r) => !ids.includes(r.match_id));
  };
  const utilisateur = () => (base.session ? { user: { id: MOI, email: base.profils[0].email } } : null);
  const ecouteursAuth = new Set();

  return {
    async session() { return utilisateur(); },
    surChangementAuth(cb) { ecouteursAuth.add(cb); return { unsubscribe: () => ecouteursAuth.delete(cb) }; },
    async connexion() { await pause(400); base.session = true; enregistrer('auth'); ecouteursAuth.forEach((f) => f('SIGNED_IN', utilisateur())); return utilisateur(); },
    async inscription() { await pause(400); base.session = true; enregistrer('auth'); ecouteursAuth.forEach((f) => f('SIGNED_IN', utilisateur())); return { session: utilisateur() }; },
    async deconnexion() { base.session = false; enregistrer('auth'); ecouteursAuth.forEach((f) => f('SIGNED_OUT', null)); },
    async motDePasseOublie() { await pause(300); },
    async changerMotDePasse() { await pause(300); },
    async changerEmail(email) { await pause(300); base.profils[0].email = email; enregistrer('profils'); },
    async profil(uid) { return copie(base.profils.find((p) => p.id === uid) || null); },
    async majProfil(uid, champs) { Object.assign(base.profils.find((p) => p.id === uid), champs); enregistrer('profils'); },
    async televerserPhoto(uid, blob) {
      return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    },
    async supprimerPhoto(uid) { base.profils.find((p) => p.id === uid).photo_url = null; enregistrer('profils'); },
    async estPro() { return Boolean(base.pro); },
    async supprimerMonCompte() { localStorage.removeItem(CLE); semer(); base.session = false; enregistrer('auth'); },
    async mesTournois(uid) {
      await pause();
      const miens = base.tournois.filter((t) => t.organisateur_id === uid && visible(t) && !t.olympiade_id).map((t) => ({ ...t, role: 'principal' }));
      const lignes = base.tournoi_organisateurs.filter((l) => l.user_id === uid);
      const co = base.tournois.filter((t) => visible(t) && lignes.some((l) => l.tournoi_id === t.id) && t.organisateur_id !== uid).map((t) => ({ ...t, role: 'co', droits: lignes.find((l) => l.tournoi_id === t.id) }));
      return copie([...miens.reverse(), ...co]);
    },
    async chargerTournoi(id) {
      await pause();
      const tournoi = base.tournois.find((t) => t.id === id);
      if (!tournoi) return null;
      const matchs = base.matchs.filter((m) => m.tournoi_id === id).sort((a, b) => new Date(a.horaire) - new Date(b.horaire));
      return copie({ tournoi, poules: base.poules.filter((p) => p.tournoi_id === id).sort((a, b) => a.nom.localeCompare(b.nom)), equipes: base.equipes.filter((e) => e.tournoi_id === id), matchs, resultats: base.resultats.filter((r) => matchs.some((m) => m.id === r.match_id)) });
    },
    async tournoiParCode(code) {
      const t = base.tournois.find((x) => x.code_acces.toLowerCase() === code.toLowerCase());
      const o = t?.olympiade_id && base.olympiades.find((x) => x.id === t.olympiade_id);
      return copie(t && visible(t) && (!o || visible(o)) ? t : null);
    },
    async droits(tournoiId, uid) { return copie(base.tournoi_organisateurs.find((l) => l.tournoi_id === tournoiId && l.user_id === uid) || null); },
    async creerTournoi(champs) { await pause(300); const t = { ...champs, id: uuid(), debloque: false, created_at: new Date().toISOString() }; base.tournois.push(t); enregistrer('tournois'); return copie(t); },
    async majTournoi(id, champs) { Object.assign(base.tournois.find((t) => t.id === id), champs); enregistrer('tournois'); },
    async supprimerTournoi(id) { effacerTournoi(id); enregistrer('tournois'); },
    async supprimerMatchs(ids) { base.matchs = base.matchs.filter((m) => !ids.includes(m.id)); base.resultats = base.resultats.filter((r) => !ids.includes(r.match_id)); enregistrer('matchs'); },
    async mettreALaCorbeille(type, id) { const liste = type === 'olympiade' ? base.olympiades : base.tournois; const x = liste.find((e) => e.id === id); if (x) x.supprime_le = new Date().toISOString(); enregistrer('tournois'); },
    async restaurer(type, id) { const liste = type === 'olympiade' ? base.olympiades : base.tournois; const x = liste.find((e) => e.id === id); if (x) x.supprime_le = null; enregistrer('tournois'); },
    async corbeille(uid) {
      return copie([...base.tournois.filter((t) => t.organisateur_id === uid && t.supprime_le).map((t) => ({ ...t, type: 'tournoi' })), ...base.olympiades.filter((o) => o.organisateur_id === uid && o.supprime_le).map((o) => ({ ...o, type: 'olympiade' }))]);
    },
    async mesOlympiades(uid) { return copie(base.olympiades.filter((o) => o.organisateur_id === uid && visible(o)).reverse()); },
    async olympiadeParCode(code) { return copie(base.olympiades.find((o) => visible(o) && o.code_acces.toLowerCase() === code.toLowerCase()) || null); },
    async chargerOlympiade(id) {
      await pause();
      const olympiade = base.olympiades.find((o) => o.id === id);
      if (!olympiade) return null;
      const tournois = base.tournois.filter((t) => t.olympiade_id === id && visible(t));
      const ids = tournois.map((t) => t.id);
      const matchs = base.matchs.filter((m) => ids.includes(m.tournoi_id)).map((m) => ({ ...m, resultat: base.resultats.find((r) => r.match_id === m.id) }));
      return copie({ olympiade, equipesOlympiade: base.olympiade_equipes.filter((e) => e.olympiade_id === id), tournois, poules: base.poules.filter((p) => ids.includes(p.tournoi_id)), equipes: base.equipes.filter((e) => ids.includes(e.tournoi_id)), matchs });
    },
    async creerOlympiade(champs) {
      if (!base.pro) throw Object.assign(new Error('new row violates row-level security policy'), { code: '42501' });
      const o = { ...champs, id: uuid(), supprime_le: null, created_at: new Date().toISOString() }; base.olympiades.push(o); enregistrer('olympiades'); return copie(o);
    },
    async majOlympiade(id, champs) { Object.assign(base.olympiades.find((o) => o.id === id), champs); enregistrer('olympiades'); },
    async equipesOlympiade(olympiadeId) { return copie(base.olympiade_equipes.filter((e) => e.olympiade_id === olympiadeId)); },
    async ajouterEquipesOlympiade(lignes) { const n = lignes.map((l, i) => ({ ...l, id: uuid(), created_at: new Date(Date.now() + i).toISOString() })); base.olympiade_equipes.push(...n); enregistrer('olympiades'); return copie(n); },
    async supprimerEquipeOlympiade(id) {
      base.equipes.filter((e) => e.olympiade_equipe_id === id).forEach((e) => {
        const ids = base.matchs.filter((m) => m.equipe_a_id === e.id || m.equipe_b_id === e.id).map((m) => m.id);
        base.matchs = base.matchs.filter((m) => !ids.includes(m.id)); base.resultats = base.resultats.filter((r) => !ids.includes(r.match_id));
      });
      base.equipes = base.equipes.filter((e) => e.olympiade_equipe_id !== id);
      base.olympiade_equipes = base.olympiade_equipes.filter((e) => e.id !== id); enregistrer('olympiades');
    },
    async insererEquipes(lignes) {
      const t = base.tournois.find((x) => x.id === lignes[0].tournoi_id);
      const total = base.equipes.filter((e) => e.tournoi_id === t.id).length + lignes.length;
      if (total > 12 && !t.debloque && !base.pro) throw Object.assign(new Error('Limite de 12 équipes'), { code: 'OLY01' });
      const nouvelles = lignes.map((l, i) => ({ ...l, id: uuid(), poule_id: null, created_at: new Date(Date.now() + i).toISOString() }));
      base.equipes.push(...nouvelles); enregistrer('equipes'); return copie(nouvelles);
    },
    async supprimerEquipe(id) {
      const ids = base.matchs.filter((m) => m.equipe_a_id === id || m.equipe_b_id === id).map((m) => m.id);
      base.equipes = base.equipes.filter((e) => e.id !== id); base.matchs = base.matchs.filter((m) => !ids.includes(m.id));
      base.resultats = base.resultats.filter((r) => !ids.includes(r.match_id)); enregistrer('matchs');
    },
    async creerPoule(tournoiId, nom) { const p = { id: uuid(), tournoi_id: tournoiId, nom, created_at: new Date().toISOString() }; base.poules.push(p); return copie(p); },
    async affecterPoule(ids, pouleId) { base.equipes.forEach((e) => { if (ids.includes(e.id)) e.poule_id = pouleId; }); },
    async insererMatchs(matchs) { const n = matchs.map((m, i) => ({ ...m, id: uuid(), created_at: new Date(Date.now() + i).toISOString() })); base.matchs.push(...n); enregistrer('matchs'); return copie(n); },
    async viderCalendrier(tournoiId) {
      const ids = base.matchs.filter((m) => m.tournoi_id === tournoiId).map((m) => m.id);
      base.matchs = base.matchs.filter((m) => m.tournoi_id !== tournoiId); base.poules = base.poules.filter((p) => p.tournoi_id !== tournoiId);
      base.resultats = base.resultats.filter((r) => !ids.includes(r.match_id)); base.equipes.forEach((e) => { if (e.tournoi_id === tournoiId) e.poule_id = null; }); enregistrer('matchs');
    },
    async insererResultats(lignes) { base.resultats.push(...lignes.map((l) => ({ bonus_a: 0, bonus_b: 0, score_tab_a: null, score_tab_b: null, ...l }))); enregistrer('resultats'); },
    async enregistrerResultat(ligne) { await pause(150); base.resultats = base.resultats.filter((r) => r.match_id !== ligne.match_id); base.resultats.push(ligne); enregistrer('resultats'); },
    async supprimerResultat(matchId) { base.resultats = base.resultats.filter((r) => r.match_id !== matchId); enregistrer('resultats'); },
    async invitation(tournoiId) {
      let l = base.invitations.find((i) => i.tournoi_id === tournoiId);
      if (!l) { l = { tournoi_id: tournoiId, code: Math.random().toString(16).slice(2, 10) }; base.invitations.push(l); enregistrer('invitations'); }
      return l.code;
    },
    async coOrganisateurs(tournoiId) { return copie(base.tournoi_organisateurs.filter((l) => l.tournoi_id === tournoiId).map((l) => ({ ...l, profil: base.profils.find((p) => p.id === l.user_id) || null }))); },
    async majDroit(tournoiId, uid, champ, valeur) { const l = base.tournoi_organisateurs.find((x) => x.tournoi_id === tournoiId && x.user_id === uid); if (l) l[champ] = valeur; enregistrer('droits'); },
    async retirerCoOrganisateur(tournoiId, uid) { base.tournoi_organisateurs = base.tournoi_organisateurs.filter((x) => !(x.tournoi_id === tournoiId && x.user_id === uid)); enregistrer('droits'); },
    async rejoindreCommeCoOrganisateur(code) {
      const l = base.invitations.find((i) => i.code === code);
      if (!l) return null;
      // Organisateur principal : il a déjà tous les droits (comme rejoindre_comme_co_organisateur)
      if (base.tournois.some((t) => t.id === l.tournoi_id && t.organisateur_id === MOI)) return l.tournoi_id;
      if (!base.tournoi_organisateurs.some((x) => x.tournoi_id === l.tournoi_id && x.user_id === MOI)) base.tournoi_organisateurs.push({ tournoi_id: l.tournoi_id, user_id: MOI, peut_saisir_scores: true, peut_gerer_le_tournoi: false, peut_supprimer_le_tournoi: false, created_at: new Date().toISOString() });
      enregistrer('droits'); return l.tournoi_id;
    },
    tempsReel(tournoiId, quandChange, quandEtat) {
      const f = (table) => quandChange(table, null);
      abonnes.add(f);
      if (quandEtat) setTimeout(() => quandEtat(true), 200);
      return () => abonnes.delete(f);
    },
    tempsReelOlympiade(quandChange) { const f = () => quandChange(); abonnes.add(f); return () => abonnes.delete(f); },
  };
}

export const donnees = MODE_DEMO ? sourceDemo() : sourceSupabase();
export { resultatsAutoPourExempts };
