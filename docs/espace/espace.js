/* OLYMPIAD — Espace organisateur du site.
   Application web (sans framework) branchée sur la même base Supabase que
   l'app mobile : mêmes tables, mêmes règles d'accès, même moteur de
   calendrier et de classement (copié dans ./moteur), temps réel.
   Les écritures reproduisent celles de l'app (app/tournoi/[id]/equipes.js,
   calendrier.js, saisie.js, co-organisateurs.js, profil.js). */

import { donnees, MODE_DEMO } from './donnees.js';
import {
  repartirEnPoules, genererCalendrierPoules, genererPremierTourEliminationDirecte, genererPhaseFinaleDepuisPoules,
  genererTourSuivant, qualifiesParTeteDeSerie, joursApresDebut, genererFinaleEtTroisiemePlace, resultatsAutoPourExempts, idEquipeGagnante, matchEliminationDecide, estPhaseDePoule,
  grouperParPhase, grouperParTerrain, NOM_MATCH_TROISIEME_PLACE,
} from './moteur/generation.js';
import { calculerClassement } from './moteur/classement.js';
import { infosSport } from './moteur/sports.js';

// ---------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const pad = (n) => String(n).padStart(2, '0');
const stock = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } },
};
const BASE = new URL('..', import.meta.url).href; // dossier du site (docs/)
const LIMITE_GRATUITE = 12;

let langue = stock.get('olympiad-langue') || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
const tr = (fr, en) => (langue === 'en' ? en : fr);
const locale = () => (langue === 'en' ? 'en-GB' : 'fr-FR');

const NOMS_SPORTS = { football: ['Football', 'Football'], rugby: ['Rugby', 'Rugby'], handball: ['Handball', 'Handball'], basketball: ['Basket-ball', 'Basketball'], tennis: ['Tennis', 'Tennis'] };
const nomSport = (s) => tr(...(NOMS_SPORTS[s] || NOMS_SPORTS.football));
const ORDRE_SPORTS = ['football', 'rugby', 'handball', 'basketball', 'tennis'];
const DEPARTAGES_ELIM = {
  football: [['prolongations_tab', 'Prolongations puis tirs au but', 'Extra time then penalty shootout'], ['tab_direct', 'Tirs au but directs', 'Direct penalty shootout']],
  handball: [['prolongations_tab', 'Prolongations puis tirs au but', 'Extra time then penalty shootout'], ['tab_direct', 'Tirs au but directs', 'Direct penalty shootout']],
  rugby: [['prolongation', 'Prolongation', 'Extra time'], ['mort_subite', 'Mort subite', 'Sudden death'], ['drop_goal', 'Drop goal', 'Drop goal']],
  basketball: [['prolongation_tirs_panier', 'Prolongation puis tirs au panier', 'Extra time then free-throw shootout'], ['prolongation_vainqueur', 'Prolongation jusqu\'à avoir un vainqueur', 'Extra time until a winner'], ['tirs_panier_direct', 'Tirs au panier directs', 'Direct free-throw shootout']],
  tennis: [],
};
const LIBELLE_TAB = { football: ['Tirs au but', 'Penalty shootout'], handball: ['Tirs au but', 'Penalty shootout'], rugby: ['Départage', 'Tiebreak'], basketball: ['Tirs au panier', 'Free-throw shootout'], tennis: ['Départage', 'Tiebreak'] };
const ABREV = { football: [['BP', 'BC'], ['GF', 'GA']], handball: [['BP', 'BC'], ['GF', 'GA']], rugby: [['PP', 'PC'], ['PF', 'PA']], basketball: [['PP', 'PC'], ['PF', 'PA']], tennis: [['SP', 'SC'], ['SF', 'SA']] };

function libellePhase(nom) {
  if (!nom || langue === 'fr') return nom;
  const p = nom.match(/^Poule ([A-Z])$/);
  if (p) return `Group ${p[1]}`;
  const t = { Finale: 'Final', 'Demi-finale': 'Semi-final', 'Quart de finale': 'Quarter-final', 'Huitième de finale': 'Round of 16', 'Seizième de finale': 'Round of 32', [NOM_MATCH_TROISIEME_PLACE]: 'Third-place match' };
  if (t[nom]) return t[nom];
  const tour = nom.match(/^Tour à (\d+) équipes$/);
  return tour ? `Round of ${tour[1]}` : nom;
}
const motEquipes = (t) => (t.sport === 'tennis' ? (t.tennis_double ? tr('paires', 'pairs') : tr('joueurs', 'players')) : tr('équipes', 'teams'));
const formaterDate = (iso, court) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale(), court ? { day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
const formaterHeure = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const heureCourte = (h) => (h ? String(h).slice(0, 5) : '');
function statutTournoi(t) {
  const aujourdhui = new Date(); const j = `${aujourdhui.getFullYear()}-${pad(aujourdhui.getMonth() + 1)}-${pad(aujourdhui.getDate())}`;
  const d = String(t.date_debut).slice(0, 10);
  if (d === j) return ['aujourdhui', tr('Aujourd\'hui', 'Today')];
  return d > j ? ['avenir', tr('À venir', 'Upcoming')] : ['termine', tr('Terminé', 'Finished')];
}

// Messages d'erreur lisibles (voir aussi lib/erreurs.js de l'app)
function messageErreur(e) {
  const m = (e && e.message) || '';
  if (e && e.code === 'OLY02') return tr('La date d\'un tournoi débloqué avec un Pass Tournoi ne peut plus être modifiée.', 'The date of a tournament unlocked with a Tournament Pass can no longer be changed.');
  if (e && e.code === 'OLY01') return tr(`La version gratuite est limitée à ${LIMITE_GRATUITE} équipes par tournoi. Débloque ce tournoi (Pass Tournoi) ou passe à OLYMPIAD Pro dans l'application mobile.`, `The free plan is limited to ${LIMITE_GRATUITE} teams per tournament. Unlock this tournament (Tournament Pass) or go Pro in the mobile app.`);
  if (/Invalid login credentials/i.test(m)) return tr('E-mail ou mot de passe incorrect.', 'Wrong email or password.');
  if (/Email not confirmed/i.test(m)) return tr('Confirme d\'abord ton adresse e-mail grâce au lien reçu.', 'Please confirm your email address first with the link you received.');
  if (/already registered|already been registered/i.test(m)) return tr('Un compte existe déjà avec cette adresse e-mail.', 'An account already exists with this email.');
  if (/Password should be|weak|at least 6/i.test(m)) return tr('Mot de passe trop court : 6 caractères minimum.', 'Password too short: at least 6 characters.');
  if (/rate limit|security purposes/i.test(m)) return tr('Trop de tentatives. Patiente un peu avant de réessayer.', 'Too many attempts. Please wait a moment.');
  if (/Failed to fetch|NetworkError/i.test(m)) return tr('Connexion impossible. Vérifie ta connexion internet.', 'Cannot connect. Check your internet connection.');
  if (/row-level security|permission/i.test(m)) return tr('Tu n\'as pas le droit de faire cette action sur ce tournoi.', 'You are not allowed to do this on this tournament.');
  return m || tr('Une erreur est survenue.', 'Something went wrong.');
}

// ---------------------------------------------------------------------
// Thème, langue, toasts, fenêtres
// ---------------------------------------------------------------------
const racine = document.documentElement;
function majIconeTheme() {
  const sombre = (racine.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
  $('.ico-lune').style.display = sombre ? 'none' : '';
  $('.ico-soleil').style.display = sombre ? '' : 'none';
}
$('#bouton-theme').addEventListener('click', () => {
  const sombre = (racine.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';
  racine.dataset.theme = sombre ? 'light' : 'dark';
  stock.set('olympiad-theme', racine.dataset.theme);
  majIconeTheme();
});
$('#bouton-langue').addEventListener('click', () => { langue = langue === 'fr' ? 'en' : 'fr'; stock.set('olympiad-langue', langue); appliquerLangue(); routeur(); });
function appliquerLangue() {
  racine.lang = langue;
  $('#bouton-langue').textContent = langue === 'fr' ? 'EN' : 'FR';
  $$('[data-i18n="titre"]').forEach((e) => { e.textContent = tr('Espace organisateur', 'Organizer area'); });
  document.title = `OLYMPIAD — ${tr('Espace organisateur', 'Organizer area')}`;
  if (MODE_DEMO) $('#bandeau-demo').innerHTML = `<div class="bandeau-demo">${tr('Mode démo : données fictives, gardées dans ce navigateur.', 'Demo mode: sample data, kept in this browser.')} <a href="espace.html">${tr('Utiliser mon vrai compte', 'Use my real account')}</a></div>`;
}

function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'erreur' ? 'erreur' : ''}`;
  el.innerHTML = `${ico(type === 'erreur' ? 'croix' : 'coche')}<span>${esc(message)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('sort'); setTimeout(() => el.remove(), 300); }, 3200);
}

let fermetureEnCours = null;
function ouvrirFenetre(html, surOuverture) {
  const f = $('#fenetre');
  f.innerHTML = `<button class="fermer" data-action="fermer-fenetre" style="position:absolute;right:16px;top:16px" aria-label="${tr('Fermer', 'Close')}">${ico('croix')}</button>${html}`;
  f.classList.add('ouvert');
  $('#voile').classList.add('ouvert');
  if (surOuverture) surOuverture(f);
}
function fermerFenetre() {
  $('#fenetre').classList.remove('ouvert');
  if (!$('#tiroir').classList.contains('ouvert')) $('#voile').classList.remove('ouvert');
  if (fermetureEnCours) { const f = fermetureEnCours; fermetureEnCours = null; f(false); }
}
// Confirmation (remplace window.confirm)
function confirmer({ titre, texte, bouton, danger = false, saisie = null }) {
  return new Promise((ok) => {
    fermetureEnCours = ok;
    ouvrirFenetre(`<h2>${esc(titre)}</h2><p class="sous">${esc(texte)}</p>
      ${saisie ? `<div class="champ"><label>${esc(tr(`Tape « ${saisie} » pour confirmer`, `Type “${saisie}” to confirm`))}</label><input id="saisie-confirmation" autocomplete="off"></div>` : ''}
      <div class="actions-fenetre" style="justify-content:flex-end">
        <button class="bouton secondaire petit" data-action="fermer-fenetre">${tr('Annuler', 'Cancel')}</button>
        <button class="bouton petit ${danger ? 'danger' : ''}" id="bouton-confirmer" ${saisie ? 'disabled' : ''}>${esc(bouton)}</button>
      </div>`, (f) => {
      const champ = $('#saisie-confirmation', f);
      if (champ) { champ.focus(); champ.addEventListener('input', () => { $('#bouton-confirmer', f).disabled = champ.value.trim().toUpperCase() !== saisie.toUpperCase(); }); }
      $('#bouton-confirmer', f).addEventListener('click', () => { fermetureEnCours = null; fermerFenetre(); ok(true); });
    });
  });
}

// ---------------------------------------------------------------------
// État et session
// ---------------------------------------------------------------------
const etat = { session: null, profil: null, pro: false, tournois: null, courant: null, desabonner: null, brouillon: null, vueMatchs: 'phase', majIds: new Set() };
const uid = () => etat.session?.user?.id;

async function chargerUtilisateur() {
  if (!etat.session) { etat.profil = null; etat.pro = false; etat.tournois = null; majMenu(); return; }
  try {
    const [profil, pro] = await Promise.all([donnees.profil(uid()), donnees.estPro(uid()).catch(() => false)]);
    etat.profil = profil; etat.pro = pro;
  } catch (e) { /* profil indisponible : l'espace reste utilisable */ }
  majMenu();
}
function initiales() {
  const p = etat.profil || {};
  return (((p.prenom || '').charAt(0) + (p.nom || '').charAt(0)).toUpperCase()) || (etat.session?.user?.email || '?').charAt(0).toUpperCase();
}
function majMenu() {
  const zone = $('#menu-utilisateur');
  if (!etat.session) { zone.innerHTML = `<a class="cta-entete" href="index.html">${tr('Retour au site', 'Back to site')}</a>`; return; }
  const p = etat.profil || {};
  zone.innerHTML = `<button class="bouton-avatar" data-action="menu" aria-label="${tr('Mon compte', 'My account')}" aria-expanded="false">${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="">` : esc(initiales())}</button>
    <div class="menu-deroulant" id="menu-deroulant">
      <div class="qui"><b>${esc([p.prenom, p.nom].filter(Boolean).join(' ') || tr('Organisateur', 'Organizer'))}</b><small>${esc(etat.session.user.email || '')}</small></div>
      <a href="#/">${ico('calendrier')}${tr('Mes tournois', 'My tournaments')}</a>
      <a href="#/profil">${ico('profil')}${tr('Mon profil', 'My profile')}</a>
      <a href="#/rejoindre">${ico('groupe')}${tr('Rejoindre comme co-organisateur', 'Join as a co-organizer')}</a>
      <a href="index.html">${ico('retour')}${tr('Retour au site', 'Back to site')}</a>
      <button data-action="deconnexion">${ico('sortie')}${tr('Se déconnecter', 'Sign out')}</button>
    </div>`;
}

// ---------------------------------------------------------------------
// Routeur
// ---------------------------------------------------------------------
const vue = $('#vue');
const ROUTES = [
  [/^#\/connexion$/, () => vueConnexion('connexion'), false],
  [/^#\/inscription$/, () => vueConnexion('inscription'), false],
  [/^#\/mot-de-passe$/, () => vueConnexion('oubli'), false],
  [/^#\/nouveau-mot-de-passe$/, () => vueNouveauMotDePasse(), true],
  [/^#\/suivi\/([a-z0-9]+)$/i, (m) => vueSuivi(m[1]), false],
  [/^#\/nouveau$/, () => vueAssistant(), true],
  [/^#\/profil$/, () => vueProfil(), true],
  [/^#\/rejoindre$/, () => vueRejoindre(), true],
  [/^#\/tournoi\/([\w-]+)\/ecran$/, (m) => vueGrandEcran(m[1]), true],
  [/^#\/tournoi\/([\w-]+)(?:\/(matchs|classement|equipes|reglages))?$/, (m) => vueTournoi(m[1], m[2] || 'matchs'), true],
  [/^#\/?$/, () => vueTableau(), true],
];
let routeAffichee = '';
async function routeur() {
  const hash = location.hash || '#/';
  fermerTiroir(); fermerFenetre(); fermerGrandEcran();
  if (etat.desabonner && !/^#\/tournoi\/|^#\/suivi\//.test(hash)) { etat.desabonner(); etat.desabonner = null; }
  for (const [motif, rendu, protege] of ROUTES) {
    const m = hash.match(motif);
    if (!m) continue;
    if (protege && !etat.session) { sessionStorage.setItem('apres-connexion', hash); location.replace('#/connexion'); return; }
    if (!protege && etat.session && /^#\/(connexion|inscription)$/.test(hash)) { location.replace('#/'); return; }
    routeAffichee = hash;
    await rendu(m);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  location.replace('#/');
}
// Affiche une nouvelle vue avec une transition
async function afficher(html, apres) {
  const ancienne = vue.firstElementChild;
  if (ancienne) { ancienne.classList.add('sortie'); await new Promise((ok) => setTimeout(ok, 150)); }
  vue.innerHTML = `<div class="vue">${html}</div>`;
  if (apres) apres(vue.firstElementChild);
}
const chargement = () => afficher(`<div class="page"><div class="chargement-page">${'<div class="squelette-bloc"></div>'.repeat(5)}</div></div>`);

// ---------------------------------------------------------------------
// Connexion, inscription, mot de passe oublié
// ---------------------------------------------------------------------
function vueConnexion(mode) {
  const formulaire = {
    connexion: `<form id="form-auth" data-mode="connexion" novalidate>
        <div class="champ"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="champ"><label for="mdp">${tr('Mot de passe', 'Password')}</label><div class="avec-oeil"><input id="mdp" type="password" autocomplete="current-password" required><button type="button" data-action="oeil" aria-label="${tr('Afficher', 'Show')}">${ico('oeil')}</button></div></div>
        <p class="erreur-form" id="erreur-auth"></p>
        <button class="bouton plein" type="submit">${tr('Se connecter', 'Sign in')}</button>
        <p style="text-align:center;margin-top:16px"><a class="lien-discret" href="#/mot-de-passe">${tr('Mot de passe oublié ?', 'Forgot your password?')}</a></p>
      </form>`,
    inscription: `<form id="form-auth" data-mode="inscription" novalidate>
        <div class="champs-2"><div class="champ"><label for="prenom">${tr('Prénom', 'First name')}</label><input id="prenom" autocomplete="given-name" required></div>
        <div class="champ"><label for="nom">${tr('Nom', 'Last name')}</label><input id="nom" autocomplete="family-name" required></div></div>
        <div class="champ"><label for="club">${tr('Club (facultatif)', 'Club (optional)')}</label><input id="club" autocomplete="organization"></div>
        <div class="champ"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="champ"><label for="mdp">${tr('Mot de passe', 'Password')}</label><div class="avec-oeil"><input id="mdp" type="password" autocomplete="new-password" minlength="6" required><button type="button" data-action="oeil" aria-label="${tr('Afficher', 'Show')}">${ico('oeil')}</button></div></div>
        <p class="erreur-form" id="erreur-auth"></p>
        <button class="bouton plein" type="submit">${tr('Créer mon compte', 'Create my account')}</button>
        <p class="mention-legale">${tr('En créant un compte, tu confirmes avoir au moins 15 ans et accepter les', 'By creating an account, you confirm you are at least 15 and accept the')} <a href="conditions-utilisation.html">${tr('conditions d\'utilisation', 'terms of use')}</a> ${tr('et la', 'and the')} <a href="politique-confidentialite.html">${tr('politique de confidentialité', 'privacy policy')}</a>.</p>
      </form>`,
    oubli: `<form id="form-auth" data-mode="oubli" novalidate>
        <p class="intro" style="font-size:15px;margin:0 0 18px">${tr('Indique ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe. Ouvre-le dans ce navigateur.', 'Enter your email: you\'ll receive a link to choose a new password. Open it in this browser.')}</p>
        <div class="champ"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <p class="erreur-form" id="erreur-auth"></p>
        <button class="bouton plein" type="submit">${tr('Envoyer le lien', 'Send the link')}</button>
        <p style="text-align:center;margin-top:16px"><a class="lien-discret" href="#/connexion">${tr('Retour à la connexion', 'Back to sign in')}</a></p>
      </form>`,
  }[mode];
  return afficher(`<div class="auth">
    <section class="auth-marque">
      <div class="egaliseur" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <h1>${tr('Ton tournoi,', 'Your tournament,')}<br><em>${tr('aussi sur ordinateur.', 'on your computer too.')}</em></h1>
      <p>${tr('Connecte-toi avec ton compte OLYMPIAD : tes tournois, tes équipes et tes scores sont synchronisés en temps réel avec l\'application.', 'Sign in with your OLYMPIAD account: your tournaments, teams and scores sync in real time with the app.')}</p>
      <ul class="auth-points">
        <li><span>${ico('calendrier')}</span>${tr('Crée tes tournois et génère le calendrier', 'Create tournaments and generate the schedule')}</li>
        <li><span>${ico('direct')}</span>${tr('Saisis les scores au clavier, en direct', 'Enter live scores with your keyboard')}</li>
        <li><span>${ico('ecran')}</span>${tr('Projette le grand écran le jour J', 'Project the big screen on the day')}</li>
      </ul>
    </section>
    <section class="auth-formulaire">
      <div class="carte-auth">
        ${mode === 'oubli' ? `<h2 style="font-size:40px;margin:0 0 10px">${tr('Mot de passe oublié', 'Forgot password')}</h2>` : `<div class="onglets-auth ${mode === 'inscription' ? 'droite' : ''}"><button class="${mode === 'connexion' ? 'actif' : ''}" data-action="aller" data-cible="#/connexion">${tr('Connexion', 'Sign in')}</button><button class="${mode === 'inscription' ? 'actif' : ''}" data-action="aller" data-cible="#/inscription">${tr('Créer un compte', 'Create an account')}</button><span class="souligne"></span></div>`}
        ${formulaire}
      </div>
    </section>
  </div>`, (v) => { const champ = $('input', v); if (champ) champ.focus(); });
}

async function soumettreAuth(form) {
  const mode = form.dataset.mode;
  const valeur = (id) => ($(`#${id}`, form)?.value || '').trim();
  const erreur = $('#erreur-auth', form);
  const bouton = $('button[type="submit"]', form);
  erreur.textContent = '';
  const email = valeur('email');
  if (!/^\S+@\S+\.\S+$/.test(email)) { erreur.textContent = tr('Saisis une adresse e-mail valide.', 'Enter a valid email address.'); return; }
  const texteBouton = bouton.innerHTML;
  bouton.disabled = true; bouton.innerHTML = '<span class="rotation"></span>';
  try {
    if (mode === 'connexion') {
      await donnees.connexion(email, $('#mdp', form).value);
    } else if (mode === 'inscription') {
      if (!valeur('prenom') || !valeur('nom')) { throw new Error(tr('Indique ton prénom et ton nom.', 'Enter your first and last name.')); }
      if ($('#mdp', form).value.length < 6) throw new Error('Password should be at least 6 characters');
      const res = await donnees.inscription({ email, motDePasse: $('#mdp', form).value, prenom: valeur('prenom'), nom: valeur('nom'), club: valeur('club') });
      if (!res?.session) {
        form.innerHTML = `<p class="succes-form" style="font-size:16px">${tr('Compte créé ! Ouvre l\'e-mail de confirmation que tu viens de recevoir, puis reviens te connecter.', 'Account created! Open the confirmation email you just received, then come back to sign in.')}</p><a class="bouton plein" href="#/connexion">${tr('Aller à la connexion', 'Go to sign in')}</a>`;
        return;
      }
    } else {
      await donnees.motDePasseOublie(email, `${BASE}espace.html?reinit=1`);
      form.innerHTML = `<p class="succes-form" style="font-size:16px">${tr('Si un compte existe avec cette adresse, un lien vient d\'être envoyé. Pense à vérifier tes courriers indésirables.', 'If an account exists with this address, a link has just been sent. Check your spam folder too.')}</p><a class="bouton plein" href="#/connexion">${tr('Retour à la connexion', 'Back to sign in')}</a>`;
      return;
    }
  } catch (e) {
    erreur.textContent = messageErreur(e);
    bouton.disabled = false; bouton.innerHTML = texteBouton;
  }
}

function vueNouveauMotDePasse() {
  return afficher(`<div class="page" style="max-width:520px">
    <h1 style="font-size:52px;margin:0 0 8px">${tr('Nouveau mot de passe', 'New password')}</h1>
    <p class="intro" style="font-size:16px">${tr('Choisis ton nouveau mot de passe.', 'Choose your new password.')}</p>
    <form id="form-nouveau-mdp" novalidate>
      <div class="champ"><label for="mdp">${tr('Nouveau mot de passe', 'New password')}</label><div class="avec-oeil"><input id="mdp" type="password" autocomplete="new-password" minlength="6"><button type="button" data-action="oeil">${ico('oeil')}</button></div></div>
      <p class="erreur-form" id="erreur-mdp"></p>
      <button class="bouton plein" type="submit">${tr('Enregistrer', 'Save')}</button>
    </form></div>`, (v) => $('#mdp', v).focus());
}

// ---------------------------------------------------------------------
// Tableau de bord : mes tournois
// ---------------------------------------------------------------------
async function vueTableau() {
  if (!etat.tournois) await chargement();
  try { etat.tournois = await donnees.mesTournois(uid()); } catch (e) { etat.tournois = []; toast(messageErreur(e), 'erreur'); }
  const p = etat.profil || {};
  const heure = new Date().getHours();
  const salut = heure < 18 ? tr('Bonjour', 'Hello') : tr('Bonsoir', 'Good evening');
  const cartes = etat.tournois.map((t, i) => {
    const [cls, lib] = statutTournoi(t);
    return `<a class="carte-tournoi" href="#/tournoi/${t.id}" style="--i:${i + 1}">
      <div class="haut"><span class="ico-sport">${ico(t.sport || 'football')}</span><span class="pastille-statut ${cls}">${lib}</span></div>
      <h3>${esc(t.nom)}</h3>
      <div class="meta">${nomSport(t.sport)} · ${formaterDate(t.date_debut, true)}</div>
      <div class="bas"><span class="pastille-statut role">${t.role === 'co' ? tr('Co-organisateur', 'Co-organizer') : tr('Organisateur', 'Organizer')}</span><span class="pastille-statut">${tr('Code', 'Code')} ${esc(String(t.code_acces).toUpperCase())}</span>${passActif(t) ? `<span class="pastille-statut avenir">${tr('Débloqué', 'Unlocked')}</span>` : ''}</div>
    </a>`;
  }).join('');
  return afficher(`<div class="page">
    <div class="entete-page">
      <div><h1>${salut}${p.prenom ? ` ${esc(p.prenom)}` : ''}</h1><p>${etat.tournois.length ? tr(`${etat.tournois.length} tournoi${etat.tournois.length > 1 ? 's' : ''} à gérer`, `${etat.tournois.length} tournament${etat.tournois.length > 1 ? 's' : ''} to manage`) : tr('Crée ton premier tournoi en quelques minutes.', 'Create your first tournament in a few minutes.')}${etat.pro ? ` · <span class="badge-pro">PRO</span>` : ''}</p></div>
      <a class="bouton" href="#/nouveau">${ico('plus')}<span>${tr('Nouveau tournoi', 'New tournament')}</span></a>
    </div>
    <div class="grille-tournois cascade">
      <a class="carte-tournoi carte-nouveau" href="#/nouveau" style="--i:0"><span class="plus">${ico('plus')}</span><h3>${tr('Nouveau tournoi', 'New tournament')}</h3><p>${tr('Sport, format, équipes : le calendrier se génère tout seul.', 'Sport, format, teams: the schedule builds itself.')}</p></a>
      ${cartes}
    </div>
    <div class="bloc-lateral cascade">
      <div class="encart" style="--i:2"><h3>${tr('Rejoindre comme co-organisateur', 'Join as a co-organizer')}</h3><p>${tr('Un organisateur t\'a donné un code d\'invitation ? Saisis-le pour aider à gérer son tournoi.', 'An organizer gave you an invitation code? Enter it to help run their tournament.')}</p>
        <form class="ligne-formulaire" id="form-rejoindre"><input class="code-saisie" id="code-invitation" maxlength="12" placeholder="••••••••" autocomplete="off" aria-label="${tr('Code d\'invitation', 'Invitation code')}"><button class="bouton petit" type="submit">${tr('Rejoindre', 'Join')}</button></form></div>
      <div class="encart" style="--i:3"><h3>${tr('Sur ton téléphone aussi', 'On your phone too')}</h3><p>${tr('Tout ce que tu fais ici apparaît aussitôt dans l\'application OLYMPIAD, et inversement. Les achats (Pass Tournoi, Pro) se font dans l\'app.', 'Everything you do here shows up instantly in the OLYMPIAD app, and vice versa. Purchases (Tournament Pass, Pro) are made in the app.')}</p><a class="lien-discret" href="index.html#offres">${tr('Voir les offres', 'See plans')}</a></div>
    </div>
  </div>`);
}

async function rejoindreAvecCode(code, erreurCible) {
  code = code.trim().toLowerCase();
  if (!code) return;
  try {
    const id = await donnees.rejoindreCommeCoOrganisateur(code);
    if (!id) { toast(tr('Ce code d\'invitation ne correspond à aucun tournoi.', 'This invitation code matches no tournament.'), 'erreur'); if (erreurCible) erreurCible.textContent = tr('Code inconnu.', 'Unknown code.'); return; }
    etat.tournois = null;
    toast(tr('Tu fais maintenant partie de l\'organisation.', 'You\'ve joined the organizing team.'));
    location.hash = `#/tournoi/${id}`;
  } catch (e) { toast(messageErreur(e), 'erreur'); }
}
function vueRejoindre() {
  return afficher(`<div class="page" style="max-width:560px">
    <h1 style="font-size:52px;margin:0 0 10px">${tr('Rejoindre comme co-organisateur', 'Join as a co-organizer')}</h1>
    <p class="intro" style="font-size:16px">${tr('Saisis le code d\'invitation que l\'organisateur principal t\'a envoyé.', 'Enter the invitation code the main organizer sent you.')}</p>
    <form class="ligne-formulaire" id="form-rejoindre"><input class="code-saisie" id="code-invitation" maxlength="12" placeholder="••••••••" autocomplete="off"><button class="bouton petit" type="submit">${tr('Rejoindre', 'Join')}</button></form>
    <p class="erreur-form" id="erreur-rejoindre"></p></div>`, (v) => $('#code-invitation', v).focus());
}

// ---------------------------------------------------------------------
// Assistant de création (choisir-sport.js, creer-tournoi.js, equipes.js)
// ---------------------------------------------------------------------
function nouveauBrouillon() {
  const d = new Date(); d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7));
  return {
    etape: 1, sport: null, nom: '', date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, format: 'mixte', tennisDouble: false,
    departagePoule: 'diff_buts', departageElim: 'prolongations_tab', equipes: [], nombrePoules: 2, nombreTerrains: 1, heure: '09:00', dureeMatch: 60,
    miTemps: false, dureeMiTemps: 10, tempsPause: 15, pauseDejeuner: false, debutPause: '12:30', finPause: '13:30', nombreQualifies: 2,
    matchTroisiemePlace: true, pointsBonus: false, setsGagnants: 2,
  };
}
const ETAPES = [['Sport', 'Sport'], ['Tournoi', 'Tournament'], ['Équipes', 'Teams'], ['Organisation', 'Organization']];
function vueAssistant() {
  if (!etat.brouillon) etat.brouillon = nouveauBrouillon();
  return afficher(`<div class="page assistant" id="assistant">${htmlAssistant()}</div>`, focusAssistant);
}
function focusAssistant(v) { const c = $('#assistant input:not([type=checkbox])', v || document); if (c && etat.brouillon.etape !== 3) c.focus(); if (etat.brouillon.etape === 3) $('#nouvelle-equipe')?.focus(); }
function rafraichirAssistant() {
  const zone = $('#assistant');
  if (!zone) return;
  const defil = window.scrollY;
  zone.innerHTML = htmlAssistant();
  window.scrollTo({ top: defil, behavior: 'instant' });
}
const carteChoix = (champ, valeur, titre, sous, actuel) => `<button type="button" class="carte-choix ${String(actuel) === String(valeur) ? 'choisie' : ''}" data-action="brouillon" data-champ="${champ}" data-valeur="${valeur}"><span class="rond"></span><span><b>${esc(titre)}</b>${sous ? `<small>${esc(sous)}</small>` : ''}</span></button>`;
const stepper = (champ, valeur, min, max) => `<div class="stepper"><button type="button" data-action="pas" data-champ="${champ}" data-pas="-1" data-min="${min}" data-max="${max}" aria-label="−">${ico('moins')}</button><output>${valeur}</output><button type="button" data-action="pas" data-champ="${champ}" data-pas="1" data-min="${min}" data-max="${max}" aria-label="+">${ico('plus')}</button></div>`;
const interrupteur = (champ, actif) => `<button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(actif)}" data-action="basculer" data-champ="${champ}"></button>`;

function htmlAssistant() {
  const b = etat.brouillon;
  const entete = `<div class="entete-page" style="margin-bottom:0"><div><p class="surtitre">${tr('Nouveau tournoi', 'New tournament')}</p><h1>${[tr('Choisis ton sport', 'Pick your sport'), tr('Ton tournoi', 'Your tournament'), b.sport === 'tennis' ? tr('Les joueurs', 'The players') : tr('Les équipes', 'The teams'), tr('Organisation', 'Organization')][b.etape - 1]}</h1></div><a class="lien-discret" href="#/" data-action="abandonner">${tr('Annuler', 'Cancel')}</a></div>
    <div class="etapes-assistant">${ETAPES.map(([fr, en], i) => `<div class="etape-a ${i + 1 < b.etape ? 'faite' : ''} ${i + 1 === b.etape ? 'active' : ''}"><i></i><span>${i + 1}. ${tr(fr, en)}</span></div>`).join('')}</div>`;
  let corps = '';
  if (b.etape === 1) {
    corps = `<div class="choix-sports cascade">${ORDRE_SPORTS.map((s, i) => `<button type="button" class="choix-sport ${b.sport === s ? 'choisi' : ''}" style="--i:${i}" data-action="choisir-sport" data-sport="${s}">${ico(s)}${nomSport(s)}</button>`).join('')}</div>
      <p class="intro" style="font-size:15px;margin-top:20px">${tr('Le barème, le vocabulaire du score et les départages s\'adaptent au sport.', 'Scoring, score wording and tiebreakers adapt to the sport.')}</p>`;
  } else if (b.etape === 2) {
    const sp = infosSport(b.sport);
    corps = `<div class="champs-2"><div class="champ"><label for="b-nom">${tr('Nom du tournoi', 'Tournament name')}</label><input id="b-nom" data-brouillon="nom" maxlength="80" value="${esc(b.nom)}" placeholder="${tr('Ex : Tournoi U13 de printemps', 'E.g. U13 Spring Cup')}"></div>
      <div class="champ"><label for="b-date">${tr('Date', 'Date')}</label>${champDate('b-date', 'data-brouillon="date"', b.date)}</div></div>
      <div class="titre-bloc">${tr('Format', 'Format')}</div>
      <div class="cartes-choix">${carteChoix('format', 'mixte', tr('Poules puis élimination directe', 'Groups then knockout'), tr('Le plus courant', 'The most common'), b.format)}${carteChoix('format', 'poules', tr('Poules uniquement', 'Groups only'), tr('Tout le monde se rencontre', 'Everyone plays each other'), b.format)}${carteChoix('format', 'elimination_directe', tr('Élimination directe', 'Knockout only'), tr('Un tableau final dès le départ', 'A bracket from the start'), b.format)}</div>
      ${b.sport === 'tennis' ? `<div class="titre-bloc">${tr('Simple ou double', 'Singles or doubles')}</div><div class="cartes-choix">${carteChoix('tennisDouble', 'false', tr('Simple', 'Singles'), '', b.tennisDouble)}${carteChoix('tennisDouble', 'true', tr('Double', 'Doubles'), '', b.tennisDouble)}</div>` : ''}
      ${b.format !== 'elimination_directe' ? `<div class="titre-bloc">${tr('Départage · égalité en poule', 'Tiebreaker · tie in group')}</div><div class="cartes-choix">${carteChoix('departagePoule', 'diff_buts', tr(sp.libelleDiffScore, sp.libelleDiffScore.replace('Différence de buts', 'Goal difference').replace('Différence de points', 'Point difference').replace('Différence de sets', 'Set difference')), '', b.departagePoule)}${carteChoix('departagePoule', 'confrontation_directe', tr('Confrontation directe', 'Head-to-head'), '', b.departagePoule)}</div>` : ''}
      ${b.sport !== 'tennis' && b.format !== 'poules' ? `<div class="titre-bloc">${tr('Départage · match nul en élimination directe', 'Tiebreaker · draw in knockout stage')}</div><div class="cartes-choix">${DEPARTAGES_ELIM[b.sport].map(([v, fr, en]) => carteChoix('departageElim', v, tr(fr, en), '', b.departageElim)).join('')}</div>` : ''}`;
  } else if (b.etape === 3) {
    const illimite = etat.pro;
    corps = `<form class="ligne-formulaire" id="form-equipe"><input id="nouvelle-equipe" maxlength="60" placeholder="${b.sport === 'tennis' ? tr('Nom du joueur ou de la paire', 'Player or pair name') : tr('Nom de l\'équipe', 'Team name')}" autocomplete="off"><button class="bouton petit" type="submit">${ico('plus')}<span>${tr('Ajouter', 'Add')}</span></button></form>
      <div class="compteur-limite"><span><b>${b.equipes.length}</b> ${motEquipes({ sport: b.sport, tennis_double: b.tennisDouble })}${illimite ? ' · PRO' : ` · ${tr(`gratuit jusqu'à ${LIMITE_GRATUITE}`, `free up to ${LIMITE_GRATUITE}`)}`}</span><button type="button" class="lien-discret" data-action="coller-equipes">${tr('Coller une liste', 'Paste a list')}</button></div>
      <div class="liste-equipes">${b.equipes.map((e, i) => `<div class="puce-equipe"><span class="n">${i + 1}</span><span class="nom">${esc(e)}</span><button type="button" class="bouton-icone" data-action="retirer-brouillon" data-index="${i}" aria-label="${tr('Retirer', 'Remove')}">${ico('poubelle')}</button></div>`).join('')}</div>
      ${b.equipes.length ? '' : `<div class="vide-etat" style="margin-top:14px">${tr('Ajoute au moins deux participants. Astuce : appuie sur Entrée pour enchaîner.', 'Add at least two participants. Tip: press Enter to keep going.')}</div>`}`;
  } else {
    const n = b.equipes.length;
    const maxPoules = Math.max(1, Math.floor(n / 2));
    b.nombrePoules = Math.min(b.nombrePoules, maxPoules);
    const taillePoule = Math.max(1, Math.floor(n / b.nombrePoules));
    b.nombreQualifies = Math.min(b.nombreQualifies, Math.max(1, taillePoule));
    corps = `<div class="grille-reglages"><div>
        <div class="titre-bloc" style="margin-top:0">${tr('Terrains et poules', 'Fields and groups')}</div>
        <div class="reglage"><div class="txt"><b>${tr('Terrains disponibles', 'Available fields')}</b><small>${tr('Plusieurs matchs en même temps', 'Several matches at once')}</small></div>${champNombre('b-terrains', 'data-brouillon="nombreTerrains"', b.nombreTerrains, { min: 1, max: 20, titre: tr('Terrains', 'Fields'), icone: 'terrain', compact: true })}</div>
        ${b.format !== 'elimination_directe' ? `<div class="reglage"><div class="txt"><b>${tr('Nombre de poules', 'Number of groups')}</b><small>${tr('Équipes réparties au hasard', 'Teams drawn at random')}</small></div>${champNombre('b-poules', 'data-brouillon="nombrePoules" data-rafraichir', b.nombrePoules, { min: 1, max: maxPoules, titre: tr('Poules', 'Groups'), icone: 'groupe', compact: true })}</div>` : ''}
        ${b.format === 'mixte' ? `<div class="reglage"><div class="txt"><b>${tr('Qualifiés par poule', 'Qualifiers per group')}</b><small>${tr('Pour la phase finale', 'For the knockout stage')}</small></div>${champNombre('b-qualifies', 'data-brouillon="nombreQualifies"', b.nombreQualifies, { min: 1, max: Math.max(1, taillePoule), titre: tr('Qualifiés', 'Qualifiers'), icone: 'coupe', compact: true })}</div>` : ''}
        ${b.format !== 'poules' ? `<div class="reglage"><div class="txt"><b>${tr('Match pour la 3e place', 'Third-place match')}</b><small>${tr('Entre les perdants des demi-finales', 'Between the semi-final losers')}</small></div>${interrupteur('matchTroisiemePlace', b.matchTroisiemePlace)}</div>` : ''}
        ${b.sport === 'rugby' ? `<div class="reglage"><div class="txt"><b>${tr('Points bonus', 'Bonus points')}</b><small>${tr('Saisis match par match', 'Entered match by match')}</small></div>${interrupteur('pointsBonus', b.pointsBonus)}</div>` : ''}
        ${b.sport === 'tennis' ? `<div class="reglage"><div class="txt"><b>${tr('Sets gagnants', 'Winning sets')}</b><small>${tr('Pour remporter un match', 'To win a match')}</small></div>${stepper('setsGagnants', b.setsGagnants, 1, 3)}</div>` : ''}
      </div><div>
        <div class="titre-bloc" style="margin-top:0">${tr('Horaires', 'Times')}</div>
        <div class="reglage"><div class="txt"><b>${tr('Premier match', 'First match')}</b></div>${champHeure('b-heure', 'data-brouillon="heure"', b.heure, true)}</div>
        <div class="reglage"><div class="txt"><b>${tr('Durée d\'un match', 'Match length')}</b><small>${tr('en minutes', 'in minutes')}</small></div>${champNombre('b-duree', 'data-brouillon="dureeMatch"', b.dureeMatch, { min: 1, max: 180, minutes: true, titre: tr('Durée d\'un match', 'Match length'), compact: true })}</div>
        ${b.sport !== 'tennis' ? `<div class="reglage"><div class="txt"><b>${tr('Mi-temps', 'Half-time')}</b>${b.miTemps ? '' : `<small>${tr('Désactivée', 'Off')}</small>`}</div><div style="display:flex;gap:12px;align-items:center">${b.miTemps ? champNombre('b-mi-temps', 'data-brouillon="dureeMiTemps"', b.dureeMiTemps, { min: 1, max: 60, minutes: true, titre: tr('Mi-temps', 'Half-time'), compact: true }) : ''}${interrupteur('miTemps', b.miTemps)}</div></div>` : ''}
        <div class="reglage"><div class="txt"><b>${tr('Pause entre les matchs', 'Break between matches')}</b><small>${tr('en minutes', 'in minutes')}</small></div>${champNombre('b-pause', 'data-brouillon="tempsPause"', b.tempsPause, { min: 0, max: 60, minutes: true, zero: tr('Aucune', 'None'), titre: tr('Pause entre les matchs', 'Break between matches'), compact: true })}</div>
        <div class="reglage"><div class="txt"><b>${tr('Pause déjeuner', 'Lunch break')}</b></div>${interrupteur('pauseDejeuner', b.pauseDejeuner)}</div>
        ${b.pauseDejeuner ? `<div class="reglage"><div class="txt"><b>${tr('De', 'From')}</b></div>${champHeure('b-debut-pause', 'data-brouillon="debutPause"', b.debutPause, true)}<div class="txt"><b>${tr('à', 'to')}</b></div>${champHeure('b-fin-pause', 'data-brouillon="finPause"', b.finPause, true)}</div>` : ''}
      </div></div>
      <div class="resume-calendrier" id="resume-calendrier">${htmlResume()}</div>`;
  }
  const peutSuivre = (b.etape === 1 && b.sport) || (b.etape === 2) || (b.etape === 3 && b.equipes.length >= 1);
  return `${entete}<div class="contenu-onglet" key="${b.etape}">${corps}</div>
    <p class="erreur-form" id="erreur-assistant"></p>
    <div class="navigation-assistant">
      ${b.etape > 1 ? `<button type="button" class="bouton secondaire petit" data-action="etape" data-sens="-1">${tr('Retour', 'Back')}</button>` : '<span></span>'}
      ${b.etape < 4 ? `<button type="button" class="bouton petit" data-action="etape" data-sens="1" ${peutSuivre ? '' : 'disabled'}>${tr('Continuer', 'Continue')}${ico('fleche')}</button>`
        : `<button type="button" class="bouton" data-action="creer-tournoi">${tr('Créer le tournoi', 'Create the tournament')}${ico('fleche')}</button>`}
    </div>`;
}
// Estimation du calendrier avec le vrai moteur (matchs, heure de fin)
function htmlResume() {
  const b = etat.brouillon;
  const n = b.equipes.length;
  if (n < 2) return `<div><span>${tr('Ajoute au moins 2 participants pour générer le calendrier.', 'Add at least 2 participants to generate the schedule.')}</span></div>`;
  const reglages = reglagesBrouillon(b);
  const faux = b.equipes.map((_, i) => ({ id: `e${i}` }));
  let matchs;
  if (b.format === 'elimination_directe') matchs = genererPremierTourEliminationDirecte(faux, 'x', reglages).filter((m) => m.equipe_b_id);
  else matchs = genererCalendrierPoules(repartirEnPoules(faux, b.nombrePoules).map((eq, i) => ({ id: `p${i}`, nom: `Poule ${String.fromCharCode(65 + i)}`, equipes: eq })), 'x', reglages);
  const fin = new Date(Math.max(...matchs.map((m) => new Date(m.horaire).getTime())) + reglages.dureeMatchMinutes * 60000);
  const total = b.format === 'elimination_directe' ? n - 1 + (b.matchTroisiemePlace && n >= 4 ? 1 : 0) : matchs.length;
  const lendemain = joursApresDebut(fin, b.date) > 0;
  return `<div><strong>${n}</strong><span>${motEquipes({ sport: b.sport, tennis_double: b.tennisDouble })}</span></div>
    <div><strong>${total}</strong><span>${b.format === 'elimination_directe' ? tr('matchs au total', 'matches in total') : tr('matchs de poule', 'group matches')}</span></div>
    <div><strong>${pad(fin.getHours())}:${pad(fin.getMinutes())}</strong><span>${b.format === 'elimination_directe' ? tr('fin du premier tour', 'end of first round') : tr('fin des poules', 'groups end')}${lendemain ? ` · ${tr('le lendemain', 'next day')}` : ''}</span></div>
    ${lendemain ? `<p class="alerte-debordement">${tr('Attention : les matchs finiraient le lendemain. Ajoute des terrains, raccourcis les matchs ou réduis les pauses.', 'Warning: matches would end the next day. Add fields, shorten matches or reduce breaks.')}</p>` : ''}`;
}
function reglagesBrouillon(b) {
  const duree = b.dureeMatch + (b.miTemps && b.sport !== 'tennis' ? b.dureeMiTemps : 0);
  return { dateDebut: b.date, heureDebut: b.heure, dureeCreneauMinutes: duree + b.tempsPause, dureeMatchMinutes: duree, nombreTerrains: b.nombreTerrains, pauseDejeuner: b.pauseDejeuner, heureDebutPause: b.pauseDejeuner ? b.debutPause : null, heureFinPause: b.pauseDejeuner ? b.finPause : null };
}
function ajouterEquipesBrouillon(noms) {
  const b = etat.brouillon;
  let ajoutees = 0; let limiteAtteinte = false;
  for (const nom of noms.map((x) => x.trim()).filter(Boolean)) {
    if (b.equipes.some((e) => e.toLowerCase() === nom.toLowerCase())) continue;
    if (b.equipes.length >= LIMITE_GRATUITE && !etat.pro) {
      $('#erreur-assistant').textContent = messageErreur({ code: 'OLY01' });
      limiteAtteinte = true;
      break;
    }
    b.equipes.push(nom.slice(0, 60)); ajoutees++;
  }
  // Après coup : « Coller une liste » ferme sa propre fenêtre juste après
  if (limiteAtteinte) setTimeout(() => fenetreOffres({ enCreation: true }), 0);
  return ajoutees;
}

// Réglages du tournoi pour le moteur (equipes.js : genererLesMatchs)
function reglagesDepuisTournoi(t, matchsExistants = []) {
  const dureeMatchMinutes = t.duree_match + (t.mi_temps ? t.duree_mi_temps : 0);
  const dureeCreneauMinutes = dureeMatchMinutes + t.temps_pause;
  let horaireDepart;
  if (matchsExistants.length) horaireDepart = new Date(Math.max(...matchsExistants.map((m) => new Date(m.horaire).getTime())) + dureeCreneauMinutes * 60000).toISOString();
  return { dateDebut: String(t.date_debut).slice(0, 10), heureDebut: t.heure_premier_match, dureeCreneauMinutes, dureeMatchMinutes, nombreTerrains: t.nombre_terrains, pauseDejeuner: t.pause_dejeuner, heureDebutPause: t.heure_debut_pause, heureFinPause: t.heure_fin_pause, horaireDepart };
}
async function insererMatchsAvecExempts(matchs) {
  const inseres = await donnees.insererMatchs(matchs);
  const exempts = resultatsAutoPourExempts(inseres);
  if (exempts.length) await donnees.insererResultats(exempts);
}
// Poules + calendrier, ou premier tour à élimination directe
async function genererLesMatchs(t, equipes, nombrePoules) {
  const reglages = reglagesDepuisTournoi(t);
  if (t.format === 'elimination_directe') {
    await insererMatchsAvecExempts(genererPremierTourEliminationDirecte(equipes, t.id, reglages));
    return;
  }
  const groupes = repartirEnPoules(equipes, Math.max(1, Math.min(nombrePoules, Math.floor(equipes.length / 2) || 1)));
  const poules = [];
  for (let i = 0; i < groupes.length; i++) {
    const nom = `Poule ${String.fromCharCode(65 + i)}`;
    const poule = await donnees.creerPoule(t.id, nom);
    await donnees.affecterPoule(groupes[i].map((e) => e.id), poule.id);
    poules.push({ id: poule.id, nom, equipes: groupes[i] });
  }
  await donnees.insererMatchs(genererCalendrierPoules(poules, t.id, reglages));
}
const codeAcces = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };

async function creerTournoi(bouton) {
  const b = etat.brouillon;
  const erreur = $('#erreur-assistant');
  if (!b.nom.trim() || !b.date) { erreur.textContent = tr('Indique le nom et la date du tournoi (étape 2).', 'Enter the tournament name and date (step 2).'); return; }
  if (!b.equipes.length) { erreur.textContent = tr('Ajoute au moins une équipe.', 'Add at least one team.'); return; }
  bouton.disabled = true; bouton.innerHTML = `<span class="rotation"></span>${tr('Création…', 'Creating…')}`;
  let tournoi = null;
  try {
    const champs = {
      nom: b.nom.trim(), date_debut: b.date, format: b.format, sport: b.sport, tennis_double: b.sport === 'tennis' && b.tennisDouble,
      critere_departage_poule: b.departagePoule, mode_departage: b.sport === 'tennis' ? 'prolongations_tab' : b.departageElim,
      nombre_terrains: b.nombreTerrains, heure_premier_match: b.heure, duree_match: b.dureeMatch, mi_temps: b.sport !== 'tennis' && b.miTemps,
      duree_mi_temps: b.miTemps && b.sport !== 'tennis' ? b.dureeMiTemps : null, temps_pause: b.tempsPause, pause_dejeuner: b.pauseDejeuner,
      heure_debut_pause: b.pauseDejeuner ? b.debutPause : null, heure_fin_pause: b.pauseDejeuner ? b.finPause : null,
      nombre_qualifies_par_poule: b.nombreQualifies, match_troisieme_place: b.format !== 'poules' && b.matchTroisiemePlace,
      points_bonus: b.sport === 'rugby' && b.pointsBonus, sets_gagnants: b.setsGagnants, organisateur_id: uid(),
    };
    for (let essai = 0; essai < 5; essai++) {
      try { tournoi = await donnees.creerTournoi({ ...champs, code_acces: codeAcces() }); break; } catch (e) { if (e.code !== '23505' || essai === 4) throw e; }
    }
    let equipes;
    try { equipes = await donnees.insererEquipes(b.equipes.map((nom) => ({ tournoi_id: tournoi.id, nom }))); } catch (e) {
      if (e.code === 'OLY01') await donnees.supprimerTournoi(tournoi.id).catch(() => {});
      throw e;
    }
    if (equipes.length >= 2) await genererLesMatchs(tournoi, equipes, b.nombrePoules);
    etat.brouillon = null; etat.tournois = null;
    toast(tr('Tournoi créé, calendrier généré !', 'Tournament created, schedule generated!'));
    location.hash = `#/tournoi/${tournoi.id}`;
  } catch (e) {
    erreur.textContent = messageErreur(e);
    if (e.code === 'OLY01') fenetreOffres({ enCreation: true });
    bouton.disabled = false; bouton.innerHTML = `${tr('Créer le tournoi', 'Create the tournament')}${ico('fleche')}`;
  }
}

// ---------------------------------------------------------------------
// Page d'un tournoi
// ---------------------------------------------------------------------
async function chargerCourant(id) {
  const c = await donnees.chargerTournoi(id);
  if (!c) return null;
  const principal = c.tournoi.organisateur_id === uid();
  const ligne = principal || !uid() ? null : await donnees.droits(id, uid()).catch(() => null);
  c.droits = { principal, saisir: principal || Boolean(ligne?.peut_saisir_scores), gerer: principal || Boolean(ligne?.peut_gerer_le_tournoi), supprimer: principal || Boolean(ligne?.peut_supprimer_le_tournoi) };
  return c;
}
// Pass Tournoi valable jusqu'à 5 jours après la date du tournoi, inclus
// (même règle que lib/achats.js de l'app et limiter_equipes dans la base).
const JOURS_VALIDITE_PASS = 5;
function finDuPass(dateDebut) {
  const d = new Date(`${String(dateDebut).slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + JOURS_VALIDITE_PASS);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function passActif(t) {
  if (!t?.debloque) return false;
  const a = new Date();
  return `${a.getFullYear()}-${pad(a.getMonth() + 1)}-${pad(a.getDate())}` <= finDuPass(t.date_debut);
}
const debloque = (t) => etat.pro || passActif(t);

// Progression du tableau (même logique que calendrier.js)
function analyser(c) {
  const res = (id) => c.resultats.find((r) => r.match_id === id);
  const matchs = c.matchs.map((m) => ({ ...m, resultat: res(m.id) }));
  const phases = grouperParPhase(matchs);
  const phasesElim = phases.filter((p) => !estPhaseDePoule(p.nom));
  const phasesPoule = phases.filter((p) => estPhaseDePoule(p.nom));
  const principales = phasesElim.filter((p) => p.nom !== NOM_MATCH_TROISIEME_PLACE);
  let derniere = null;
  principales.forEach((p) => { const d = Math.max(...p.matchs.map((m) => new Date(m.created_at).getTime())); if (!derniere || d > derniere.d) derniere = { ...p, d }; });
  const derniereTerminee = derniere ? derniere.matchs.every(matchEliminationDecide) : false;
  const estFinale = derniere?.nom === 'Finale';
  const peutTourSuivant = derniereTerminee && !estFinale;
  const troisieme = phasesElim.find((p) => p.nom === NOM_MATCH_TROISIEME_PLACE);
  const peutTroisieme = c.tournoi.match_troisieme_place && peutTourSuivant && derniere?.nom === 'Demi-finale' && derniere.matchs.length === 2 && derniere.matchs.every((m) => m.equipe_b_id) && !troisieme;
  const finale = estFinale ? derniere.matchs[0] : null;
  const vainqueur = derniereTerminee && estFinale ? idEquipeGagnante(finale) : null;
  const deuxieme = vainqueur && finale.equipe_b_id ? (vainqueur === finale.equipe_a_id ? finale.equipe_b_id : finale.equipe_a_id) : null;
  const troisiemeTermine = troisieme ? troisieme.matchs.every(matchEliminationDecide) : false;
  const troisiemeId = troisiemeTermine ? idEquipeGagnante(troisieme.matchs[0]) : null;
  const poulesTerminees = c.poules.length > 0 && phasesPoule.length === c.poules.length && phasesPoule.every((p) => p.matchs.every((m) => m.resultat?.statut === 'termine'));
  const peutPhaseFinale = c.tournoi.format === 'mixte' && phasesElim.length === 0 && poulesTerminees;
  const qualifies = c.poules.reduce((s, p) => s + Math.min(c.tournoi.nombre_qualifies_par_poule, c.equipes.filter((e) => e.poule_id === p.id).length), 0);
  return { matchs, phases, phasesElim, phasesPoule, principales, derniere, peutTourSuivant, peutTroisieme, vainqueur, deuxieme, troisiemeId, poulesTerminees, peutPhaseFinale, qualifies };
}
const nomEquipe = (c, id) => c.equipes.find((e) => e.id === id)?.nom || '—';

async function vueTournoi(id, onglet) {
  const memeTournoi = etat.courant?.tournoi?.id === id && $('#page-tournoi');
  if (!memeTournoi) {
    await chargement();
    try { etat.courant = await chargerCourant(id); } catch (e) { etat.courant = null; toast(messageErreur(e), 'erreur'); }
    if (!etat.courant) return afficher(`<div class="page"><div class="vide-etat"><h2>${tr('Tournoi introuvable', 'Tournament not found')}</h2><p>${tr('Il a peut-être été supprimé, ou tu n\'y as plus accès.', 'It may have been deleted, or you no longer have access.')}</p><a class="bouton petit" href="#/">${tr('Mes tournois', 'My tournaments')}</a></div></div>`);
    abonnerTempsReel(id);
    await afficher(`<div id="page-tournoi">${htmlEnteteTournoi(onglet)}<div class="page" id="contenu-tournoi"></div></div>`);
  } else {
    $$('.onglets-tournoi a').forEach((a) => a.classList.toggle('actif', a.dataset.onglet === onglet));
  }
  etat.onglet = onglet;
  rendreOnglet();
}
function htmlEnteteTournoi(onglet) {
  const c = etat.courant; const t = c.tournoi;
  const d = c.droits;
  const verrou = debloque(t) ? '' : ico('cadenas', 'cadenas');
  const onglets = [['matchs', tr('Matchs', 'Matches')], ['classement', tr('Classement', 'Standings')], ...(d.gerer ? [['equipes', t.sport === 'tennis' ? tr('Joueurs', 'Players') : tr('Équipes', 'Teams')], ['reglages', tr('Réglages', 'Settings')]] : [])];
  return `<section class="entete-tournoi"><div class="page">
    <div class="fil"><a href="#/">${tr('Mes tournois', 'My tournaments')}</a>${ico('droite', '')}<span>${esc(t.nom)}</span></div>
    <div class="titre-tournoi"><span class="ico-sport">${ico(t.sport)}</span><h1 id="titre-t">${esc(t.nom)}</h1></div>
    <div class="infos-tournoi"><span>${nomSport(t.sport)} · ${formaterDate(t.date_debut)}</span><span>${c.equipes.length} ${motEquipes(t)}</span>
      <span class="puce-code">${tr('Code', 'Code')} <b>${esc(String(t.code_acces).toUpperCase())}</b><button data-action="copier" data-texte="${esc(String(t.code_acces).toUpperCase())}">${tr('Copier', 'Copy')}</button></span>
      <span class="indicateur-direct" id="indicateur-direct">${tr('CONNEXION…', 'CONNECTING…')}</span>
      ${d.principal ? '' : `<span class="pastille-statut role" style="background:#181d26;color:#f3f2ed">${tr('Co-organisateur', 'Co-organizer')}</span>`}</div>
    <div class="actions-tournoi">
      <button class="action-t" data-action="qr">${ico('qr')}${tr('QR code', 'QR code')}</button>
      <a class="action-t" href="#/tournoi/${t.id}/ecran">${ico('ecran')}${tr('Grand écran', 'Big screen')}${verrou}</a>
      ${d.principal ? `<button class="action-t" data-action="coorgs">${ico('groupe')}${tr('Co-organisateurs', 'Co-organizers')}${verrou}</button>` : ''}
      <button class="action-t" data-action="pdf">${ico('pdf')}${tr('Export PDF', 'PDF export')}${verrou}</button>
      <a class="action-t" href="#/suivi/${esc(t.code_acces)}">${ico('oeil')}${tr('Vue spectateur', 'Spectator view')}</a>
    </div>
    <nav class="onglets-tournoi">${onglets.map(([o, l]) => `<a href="#/tournoi/${t.id}/${o}" data-onglet="${o}" class="${o === onglet ? 'actif' : ''}">${l}</a>`).join('')}</nav>
  </div></section>`;
}
function rendreOnglet() {
  const zone = $('#contenu-tournoi');
  if (!zone || !etat.courant) return;
  const html = { matchs: htmlMatchs, classement: htmlClassement, equipes: htmlEquipes, reglages: htmlReglages }[etat.onglet]();
  zone.innerHTML = `<div class="contenu-onglet">${html}</div>`;
  etat.majIds.clear();
}

// Matchs
function carteMatch(c, m, lecture) {
  const r = m.resultat;
  if (!m.equipe_b_id) return `<div class="match exempt"><span class="eq">${esc(nomEquipe(c, m.equipe_a_id))}</span><span class="sous"><span>${tr('Exempt · qualifié·e directement', 'Bye · directly qualified')}</span></span></div>`;
  const fini = r?.statut === 'termine';
  const direct = r?.statut === 'en_cours';
  const g = fini ? idEquipeGagnante(m) : null;
  const tab = fini && r.score_a === r.score_b && r.score_tab_a != null ? `<span class="tab">${tr('t.a.b.', 'pens')} ${r.score_tab_a}-${r.score_tab_b}</span>` : '';
  const peut = !lecture && c.droits?.saisir;
  return `<${peut ? 'button' : 'div'} class="match ${direct ? 'direct' : ''} ${etat.majIds.has(m.id) ? 'maj' : ''}" ${peut ? `data-action="saisir" data-match="${m.id}"` : ''}>
    <span class="eq ${g === m.equipe_a_id ? 'gagnant' : ''}">${esc(nomEquipe(c, m.equipe_a_id))}</span>
    <span class="centre">${fini || direct ? `<span class="score">${r.score_a} - ${r.score_b}</span>${tab}` : `<span class="heure">${formaterHeure(m.horaire)}</span>`}</span>
    <span class="eq b ${g === m.equipe_b_id ? 'gagnant' : ''}">${esc(nomEquipe(c, m.equipe_b_id))}</span>
    <span class="sous"><span>${m.terrain ? `${tr('Terrain', 'Field')} ${esc(m.terrain)}` : ''}</span><span>${fini ? `${formaterHeure(m.horaire)} · ${tr('Terminé', 'Finished')}` : direct ? `<span class="badge-direct">${tr('EN DIRECT', 'LIVE')}</span>` : tr('À venir', 'Upcoming')}</span></span>
  </${peut ? 'button' : 'div'}>`;
}
function htmlPodium(c, a) {
  if (!a.vainqueur) return '';
  const nom = (id) => (id ? esc(nomEquipe(c, id)) : '—');
  return `<p class="coupe">🏆 ${tr('Vainqueur', 'Winner')} : <em>${nom(a.vainqueur)}</em></p>
    <div class="podium" ${a.troisiemeId ? '' : 'style="grid-template-columns:1fr 1.15fr;max-width:420px"'}><div class="p2"><div class="nom-p">${nom(a.deuxieme)}</div><div class="marche">2</div></div><div class="p1"><div class="nom-p">${nom(a.vainqueur)}</div><div class="marche">1</div></div>${a.troisiemeId ? `<div class="p3"><div class="nom-p">${nom(a.troisiemeId)}</div><div class="marche">3</div></div>` : ''}</div>`;
}
function htmlMatchs(lecture = false) {
  const c = etat.courant; const t = c.tournoi;
  const a = analyser(c);
  if (!a.matchs.length) {
    return `<div class="vide-etat"><h2 style="font-size:34px;margin:0 0 6px">${tr('Pas encore de calendrier', 'No schedule yet')}</h2><p>${tr('Ajoute au moins deux équipes, puis génère le calendrier.', 'Add at least two teams, then generate the schedule.')}</p>${c.droits.gerer && !lecture ? `<a class="bouton petit" href="#/tournoi/${t.id}/equipes">${tr('Gérer les équipes', 'Manage teams')}</a>` : ''}</div>`;
  }
  let bandeau = '';
  if (!lecture && c.droits.gerer) {
    if (a.peutPhaseFinale) bandeau = `<div class="bandeau-progression"><div><b>${tr('Toutes les poules sont terminées', 'All groups are finished')}</b><p>${tr(`${a.qualifies} qualifiés pour la phase finale.`, `${a.qualifies} teams qualify for the knockouts.`)}</p></div><button class="bouton petit" data-action="phase-finale">${tr('Générer la phase finale', 'Generate the knockouts')}</button></div>`;
    else if (a.peutTourSuivant) bandeau = `<div class="bandeau-progression"><div><b>${esc(libellePhase(a.derniere.nom))} · ${tr('terminé', 'finished')}</b><p>${a.peutTroisieme ? tr('La finale et le match pour la 3e place seront générés.', 'The final and third-place match will be generated.') : tr('Les vainqueurs passent au tour suivant.', 'Winners go through to the next round.')}</p></div><button class="bouton petit" data-action="tour-suivant">${tr('Générer le tour suivant', 'Generate the next round')}</button></div>`;
  }
  const parTerrain = etat.vueMatchs === 'terrain';
  const groupes = parTerrain ? grouperParTerrain(a.matchs).map((g) => ({ ...g, titre: g.nom.startsWith('Terrain') ? g.nom.replace('Terrain', tr('Terrain', 'Field')) : tr('Exempts', 'Byes') })) : [...a.phasesPoule, ...a.phasesElim].map((g) => ({ ...g, titre: libellePhase(g.nom) }));
  return `${htmlPodium(c, a)}${bandeau}
    <div class="barre-outils"><div class="segments"><button class="${parTerrain ? '' : 'actif'}" data-action="vue-matchs" data-valeur="phase">${t.format === 'elimination_directe' ? tr('Par tour', 'By round') : tr('Par poule', 'By group')}</button><button class="${parTerrain ? 'actif' : ''}" data-action="vue-matchs" data-valeur="terrain">${tr('Par terrain', 'By field')}</button></div>
      ${!lecture && c.droits.saisir ? `<span class="raccourcis">${tr('Clique sur un match pour saisir son score', 'Click a match to enter its score')}</span>` : ''}</div>
    <div class="colonnes-phases cascade">${groupes.map((g, i) => {
      const jouables = g.matchs.filter((m) => m.equipe_b_id);
      const finis = jouables.filter((m) => m.resultat?.statut === 'termine').length;
      return `<section class="groupe-matchs" style="--i:${i}"><h3>${esc(g.titre)}<small>${finis}/${jouables.length}</small></h3>${g.matchs.map((m) => carteMatch(c, m, lecture)).join('')}</section>`;
    }).join('')}</div>`;
}

// Classements et tableau final
function classementsPoules(c) {
  return c.poules.map((p) => ({ poule: p, classement: calculerClassement(c.equipes.filter((e) => e.poule_id === p.id), c.matchs.filter((m) => m.phase === p.nom), c.resultats, c.tournoi.critere_departage_poule, c.tournoi.sport) }));
}
function tableClassement(c, { poule, classement }, nbQualifies) {
  const [bp, bc] = (ABREV[c.tournoi.sport] || ABREV.football)[langue === 'en' ? 1 : 0];
  return `<div class="tableau-classement"><h3>${tr('Classement', 'Standings')} · ${esc(libellePhase(poule.nom))}</h3><table><thead><tr><th></th><th>${tr('Équipe', 'Team')}</th><th>${tr('J', 'P')}</th><th>${tr('V', 'W')}</th><th>${tr('N', 'D')}</th><th>${tr('D', 'L')}</th><th>${bp}</th><th>${bc}</th><th>Diff</th><th>Pts</th></tr></thead><tbody>
    ${classement.map((s, i) => `<tr class="${nbQualifies && i < nbQualifies ? 'qualifie' : ''}" style="--i:${i}"><td>${i + 1}</td><td>${esc(s.equipe.nom)}</td><td>${s.joues}</td><td>${s.victoires}</td><td>${s.nuls}</td><td>${s.defaites}</td><td>${s.buts_pour}</td><td>${s.buts_contre}</td><td>${s.diff_buts > 0 ? '+' : ''}${s.diff_buts}</td><td>${s.points}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function htmlClassement() {
  const c = etat.courant;
  const a = analyser(c);
  const cp = classementsPoules(c);
  const duel = (m) => {
    const r = m.resultat; const fini = r?.statut === 'termine'; const g = fini ? idEquipeGagnante(m) : null;
    if (!m.equipe_b_id) return `<div class="duel"><div class="gagnant"><span>${esc(nomEquipe(c, m.equipe_a_id))}</span><span>${tr('Exempt', 'Bye')}</span></div></div>`;
    return `<div class="duel"><div class="${g === m.equipe_a_id ? 'gagnant' : ''}"><span>${esc(nomEquipe(c, m.equipe_a_id))}</span><span>${fini ? r.score_a : ''}</span></div><div class="${g === m.equipe_b_id ? 'gagnant' : ''}"><span>${esc(nomEquipe(c, m.equipe_b_id))}</span><span>${fini ? r.score_b : ''}</span></div></div>`;
  };
  const principales = [...a.principales].sort((x, y) => Math.max(...x.matchs.map((m) => new Date(m.created_at))) - Math.max(...y.matchs.map((m) => new Date(m.created_at))));
  const troisieme = a.phasesElim.find((p) => p.nom === NOM_MATCH_TROISIEME_PLACE);
  return `${htmlPodium(c, a)}
    ${cp.length ? `<div class="grille-classements">${cp.map((p) => tableClassement(c, p, c.tournoi.format === 'mixte' ? c.tournoi.nombre_qualifies_par_poule : 0)).join('')}</div>` : ''}
    ${cp.length && c.tournoi.format === 'mixte' ? `<p class="mention">${tr(`En jaune : les ${c.tournoi.nombre_qualifies_par_poule} premiers de chaque poule, qualifiés pour la phase finale.`, `In yellow: the top ${c.tournoi.nombre_qualifies_par_poule} of each group, qualified for the knockouts.`)}</p>` : ''}
    ${principales.length ? `<h2 style="font-size:40px;margin:34px 0 12px">${tr('Tableau final', 'Knockout bracket')}</h2><div class="tableau-final">${principales.map((p) => `<div class="tour-final"><h4>${esc(libellePhase(p.nom))}</h4>${p.matchs.map(duel).join('')}</div>`).join('')}${troisieme ? `<div class="tour-final"><h4>${esc(libellePhase(troisieme.nom))}</h4>${troisieme.matchs.map(duel).join('')}</div>` : ''}</div>` : ''}
    ${!cp.length && !principales.length ? `<div class="vide-etat">${tr('Le classement apparaîtra ici dès les premiers matchs.', 'Standings will appear here after the first matches.')}</div>` : ''}`;
}

// Équipes
function htmlEquipes() {
  const c = etat.courant; const t = c.tournoi;
  const poule = (e) => c.poules.find((p) => p.id === e.poule_id);
  return `<div class="grille-reglages"><div>
      <div class="titre-bloc" style="margin-top:0">${t.sport === 'tennis' ? tr('Joueurs', 'Players') : tr('Équipes', 'Teams')}<small>${c.equipes.length}${debloque(t) ? '' : ` / ${LIMITE_GRATUITE} ${tr('en gratuit', 'on free plan')}`}</small></div>
      <form class="ligne-formulaire" id="form-ajout-equipe"><input id="ajout-equipe" maxlength="60" placeholder="${tr('Nom', 'Name')}" autocomplete="off"><button class="bouton petit" type="submit">${ico('plus')}<span>${tr('Ajouter', 'Add')}</span></button></form>
      <div class="liste-equipes cascade" style="grid-template-columns:1fr">${c.equipes.map((e, i) => `<div class="puce-equipe" style="--i:${i}"><span class="n">${i + 1}</span><span class="nom">${esc(e.nom)}</span>${poule(e) ? `<span class="poule">${esc(libellePhase(poule(e).nom))}</span>` : ''}<button class="bouton-icone" data-action="supprimer-equipe" data-equipe="${e.id}" aria-label="${tr('Retirer', 'Remove')}">${ico('poubelle')}</button></div>`).join('')}</div>
    </div><div>
      <div class="titre-bloc" style="margin-top:0">${tr('Calendrier', 'Schedule')}</div>
      <div class="encart"><h3>${c.matchs.length ? tr('Régénérer le calendrier', 'Regenerate the schedule') : tr('Générer le calendrier', 'Generate the schedule')}</h3>
        <p>${c.matchs.length ? tr('Refait le tirage des poules et tous les matchs avec les équipes et les réglages actuels. Les résultats déjà saisis seront effacés.', 'Redraws the groups and every match with the current teams and settings. Results already entered will be erased.') : tr('Crée les poules et les matchs avec les équipes et les réglages actuels.', 'Creates groups and matches with the current teams and settings.')}</p>
        ${t.format !== 'elimination_directe' ? `<div class="reglage"><div class="txt"><b>${tr('Nombre de poules', 'Number of groups')}</b></div>${stepper('poulesRegen', etat.poulesRegen ?? Math.max(1, c.poules.length || 2), 1, Math.max(1, Math.floor(c.equipes.length / 2)))}</div>` : ''}
        <button class="bouton petit ${c.matchs.length ? 'danger' : ''}" data-action="regenerer" ${c.equipes.length < 2 ? 'disabled' : ''}>${ico('retourner')}<span>${c.matchs.length ? tr('Régénérer', 'Regenerate') : tr('Générer', 'Generate')}</span></button></div>
    </div></div>`;
}

// Réglages
const verrouiller = (html, oui) => (oui ? html.replace('class="selecteur-champ"', 'class="selecteur-champ" disabled') : html);
function htmlReglages() {
  const c = etat.courant; const t = c.tournoi;
  const champ = (cle, label, type, valeur, attr = '') => {
    if (type === 'date') return `<div class="champ"><label>${label}</label>${champDate(`r-${cle}`, `data-reglage="${cle}"`, valeur)}</div>`;
    if (type === 'time') return `<div class="champ"><label>${label}</label>${champHeure(`r-${cle}`, `data-reglage="${cle}"`, valeur)}</div>`;
    if (type === 'nombre') return `<div class="champ"><label>${label}</label>${champNombre(`r-${cle}`, `data-reglage="${cle}"`, valeur, attr)}</div>`;
    return `<div class="champ"><label for="r-${cle}">${label}</label><input id="r-${cle}" data-reglage="${cle}" type="${type}" value="${esc(valeur ?? '')}" ${attr}></div>`;
  };
  return `<form id="form-reglages" class="grille-reglages"><div>
      <div class="titre-bloc" style="margin-top:0">${tr('Informations', 'Details')}</div>
      ${champ('nom', tr('Nom du tournoi', 'Tournament name'), 'text', t.nom, 'maxlength="80"')}
      ${verrouiller(champ('date_debut', tr('Date', 'Date'), 'date', String(t.date_debut).slice(0, 10)), Boolean(t.debloque))}
      ${t.debloque ? `<p class="mention">${tr(`Date figée par le Pass Tournoi, valable jusqu'au ${formaterDate(finDuPass(t.date_debut))} inclus.`, `Date locked by the Tournament Pass, valid until ${formaterDate(finDuPass(t.date_debut))} inclusive.`)}</p>` : ''}
      <div class="titre-bloc">${tr('Organisation', 'Organization')}</div>
      <div class="champs-2">${champ('nombre_terrains', tr('Terrains', 'Fields'), 'nombre', t.nombre_terrains, { min: 1, max: 20, titre: tr('Terrains', 'Fields'), icone: 'terrain' })}${t.format === 'mixte' ? champ('nombre_qualifies_par_poule', tr('Qualifiés par poule', 'Qualifiers per group'), 'nombre', t.nombre_qualifies_par_poule, { min: 1, max: 16, titre: tr('Qualifiés', 'Qualifiers'), icone: 'coupe' }) : ''}</div>
      ${t.format !== 'poules' ? `<div class="reglage"><div class="txt"><b>${tr('Match pour la 3e place', 'Third-place match')}</b></div><button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(t.match_troisieme_place)}" data-action="basculer-reglage" data-reglage="match_troisieme_place"></button></div>` : ''}
      ${t.sport === 'rugby' ? `<div class="reglage"><div class="txt"><b>${tr('Points bonus', 'Bonus points')}</b></div><button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(t.points_bonus)}" data-action="basculer-reglage" data-reglage="points_bonus"></button></div>` : ''}
      ${t.sport === 'tennis' ? champ('sets_gagnants', tr('Sets gagnants', 'Winning sets'), 'nombre', t.sets_gagnants, { min: 1, max: 3, titre: tr('Sets gagnants', 'Winning sets'), icone: 'tennis' }) : ''}
    </div><div>
      <div class="titre-bloc" style="margin-top:0">${tr('Horaires', 'Times')}<small>${tr('pour les prochains matchs générés', 'for the next generated matches')}</small></div>
      <div class="champs-2">${champ('heure_premier_match', tr('Premier match', 'First match'), 'time', heureCourte(t.heure_premier_match))}${champ('duree_match', tr('Durée d\'un match', 'Match length'), 'nombre', t.duree_match, { min: 1, max: 180, minutes: true, titre: tr('Durée d\'un match', 'Match length') })}</div>
      <div class="champs-2">${champ('temps_pause', tr('Pause entre matchs', 'Break between matches'), 'nombre', t.temps_pause, { min: 0, max: 60, minutes: true, zero: tr('Aucune', 'None'), titre: tr('Pause entre matchs', 'Break between matches') })}${t.sport !== 'tennis' ? champ('duree_mi_temps', tr('Mi-temps', 'Half-time'), 'nombre', t.mi_temps ? t.duree_mi_temps : 0, { min: 0, max: 60, minutes: true, zero: tr('Aucune', 'None'), titre: tr('Mi-temps', 'Half-time') }) : ''}</div>
      <div class="reglage"><div class="txt"><b>${tr('Pause déjeuner', 'Lunch break')}</b></div><button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(t.pause_dejeuner)}" data-action="basculer-reglage" data-reglage="pause_dejeuner"></button></div>
      <div class="zone-pause ${t.pause_dejeuner ? '' : 'verrouille'}" id="zone-pause"><div class="champs-2">${verrouiller(champ('heure_debut_pause', tr('Début de la pause', 'Break start'), 'time', heureCourte(t.heure_debut_pause) || '12:30'), !t.pause_dejeuner)}${verrouiller(champ('heure_fin_pause', tr('Fin de la pause', 'Break end'), 'time', heureCourte(t.heure_fin_pause) || '13:30'), !t.pause_dejeuner)}</div>
        <p class="note-verrou">${ico('cadenas')}${tr('Active la pause déjeuner pour choisir ses horaires.', 'Turn on the lunch break to pick its times.')}</p></div>
      <p class="erreur-form" id="erreur-reglages"></p>
      <button class="bouton petit" type="submit">${tr('Enregistrer les réglages', 'Save settings')}</button>
    </div></form>
    ${c.droits.supprimer ? `<div class="zone-danger"><h3>${tr('Supprimer le tournoi', 'Delete the tournament')}</h3><p>${tr('Le tournoi, ses équipes, ses matchs et ses résultats seront supprimés définitivement, pour tout le monde.', 'The tournament, its teams, matches and results will be permanently deleted, for everyone.')}</p><button class="bouton petit danger" data-action="supprimer-tournoi">${ico('poubelle')}<span>${tr('Supprimer le tournoi', 'Delete the tournament')}</span></button></div>` : ''}`;
}

// Temps réel : rechargement et surbrillance des matchs modifiés
let minuteurRechargement = null;
function abonnerTempsReel(id) {
  if (etat.desabonner) etat.desabonner();
  etat.desabonner = donnees.tempsReel(id, (table, evenement) => {
    if (table === 'resultats' && evenement && etat.courant) {
      const matchId = evenement.new?.match_id || evenement.old?.match_id;
      if (matchId && !etat.courant.matchs.some((m) => m.id === matchId)) return;
    }
    clearTimeout(minuteurRechargement);
    minuteurRechargement = setTimeout(() => rechargerCourant(true), 250);
  }, (connecte) => {
    const ind = $('#indicateur-direct');
    if (ind) { ind.classList.toggle('connecte', connecte); ind.textContent = connecte ? tr('EN DIRECT', 'LIVE') : tr('HORS LIGNE', 'OFFLINE'); }
  });
}
async function rechargerCourant(depuisTempsReel) {
  if (!etat.courant) return;
  const avant = etat.courant;
  let apres;
  try { apres = await chargerCourant(avant.tournoi.id); } catch (e) { return; }
  if (!apres) { toast(tr('Ce tournoi a été supprimé.', 'This tournament was deleted.'), 'erreur'); location.hash = '#/'; return; }
  if (depuisTempsReel) {
    apres.resultats.forEach((r) => { const v = avant.resultats.find((x) => x.match_id === r.match_id); if (!v || JSON.stringify(v) !== JSON.stringify(r)) etat.majIds.add(r.match_id); });
    apres.matchs.forEach((m) => { if (!avant.matchs.some((x) => x.id === m.id)) etat.majIds.add(m.id); });
  }
  etat.courant = apres;
  if ($('#page-tournoi')) {
    if (avant.equipes.length !== apres.equipes.length || avant.tournoi.nom !== apres.tournoi.nom) {
      const zone = $('#page-tournoi > .entete-tournoi');
      if (zone) { const tmp = document.createElement('div'); tmp.innerHTML = htmlEnteteTournoi(etat.onglet); zone.replaceWith(tmp.firstElementChild); }
    }
    if (!(etat.onglet === 'reglages' && $('#form-reglages') && document.activeElement?.closest('#form-reglages'))) rendreOnglet();
  }
  if ($('#vue-suivi')) rendreSuivi();
  if ($('#grand-ecran').classList.contains('ouvert')) rendreGrandEcran();
}

// ---------------------------------------------------------------------
// Saisie d'un score (saisie.js), dans un tiroir
// ---------------------------------------------------------------------
let saisie = null;
function ouvrirSaisie(matchId) {
  const c = etat.courant;
  const m = analyser(c).matchs.find((x) => x.id === matchId);
  if (!m || !c.droits.saisir) return;
  const r = m.resultat;
  saisie = { m, a: r ? r.score_a : 0, b: r ? r.score_b : 0, tabA: r?.score_tab_a ?? 0, tabB: r?.score_tab_b ?? 0, bonusA: r?.bonus_a || 0, bonusB: r?.bonus_b || 0, statut: r?.statut === 'en_cours' ? 'en_cours' : 'termine', existe: Boolean(r) };
  const tiroir = $('#tiroir');
  tiroir.innerHTML = htmlSaisie();
  tiroir.classList.add('ouvert');
  $('#voile').classList.add('ouvert');
  $$('.match').forEach((x) => x.classList.toggle('selection', x.dataset.match === matchId));
  setTimeout(() => { const i = $('#score-a'); if (i) { i.focus(); i.select(); } }, 350);
}
function htmlSaisie() {
  const c = etat.courant; const t = c.tournoi; const m = saisie.m;
  const poule = estPhaseDePoule(m.phase);
  const egalite = saisie.a === saisie.b;
  const unite = (infosSport(t.sport).libelleScorePluriel || 'points');
  const compteur = (cle, nom, petit) => `<div class="compteur ${petit ? 'petit' : ''}"><div class="nom">${esc(nom)}</div><input id="score-${cle.toLowerCase()}" type="number" min="0" inputmode="numeric" value="${saisie[cle]}" data-score="${cle}" aria-label="${esc(nom)}"><div class="ctrl"><button type="button" data-action="score" data-cle="${cle}" data-pas="-1" aria-label="−">${ico('moins')}</button><button type="button" class="plus" data-action="score" data-cle="${cle}" data-pas="1" aria-label="+">${ico('plus')}</button></div></div>`;
  return `<div class="tiroir-entete"><div><p class="surtitre" style="margin:0">${esc(libellePhase(m.phase))}${m.terrain ? ` · ${tr('Terrain', 'Field')} ${esc(m.terrain)}` : ''} · ${formaterHeure(m.horaire)}</p><h2>${tr('Saisir le score', 'Enter the score')}</h2><p>${tr(`En ${unite}`, `In ${unite}`)}</p></div><button class="fermer" data-action="fermer-tiroir" aria-label="${tr('Fermer', 'Close')}">${ico('croix')}</button></div>
    <div class="tiroir-corps"><form id="form-score">
      <div class="duel-saisie">${compteur('a', nomEquipe(c, m.equipe_a_id))}<span class="tiret">–</span>${compteur('b', nomEquipe(c, m.equipe_b_id))}</div>
      <div class="segments segments-statut"><button type="button" class="${saisie.statut === 'en_cours' ? 'actif' : ''}" data-action="statut-saisie" data-valeur="en_cours">${tr('En cours', 'In progress')}</button><button type="button" class="${saisie.statut === 'termine' ? 'actif' : ''}" data-action="statut-saisie" data-valeur="termine">${tr('Terminé', 'Finished')}</button></div>
      <p class="aide-statut" id="aide-statut" ${saisie.statut === 'en_cours' ? '' : 'hidden'}>${tr('« En cours » : le score s\'affiche en direct pour le public, sans compter au classement. Passe sur « Terminé » à la fin du match.', '“In progress”: the score is shown live to the public but does not count in the standings yet. Switch to “Finished” at the end of the match.')}</p>
      <div id="zone-tab">${!poule && egalite && saisie.statut === 'termine' ? htmlTab() : ''}</div>
      ${t.points_bonus && poule ? `<div class="reglage"><div class="txt"><b>${tr('Point bonus', 'Bonus point')}</b><small>${esc(nomEquipe(c, m.equipe_a_id))}</small></div><button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(saisie.bonusA)}" data-action="bonus" data-cle="bonusA"></button></div>
        <div class="reglage"><div class="txt"><b>${tr('Point bonus', 'Bonus point')}</b><small>${esc(nomEquipe(c, m.equipe_b_id))}</small></div><button type="button" class="interrupteur" role="switch" aria-checked="${Boolean(saisie.bonusB)}" data-action="bonus" data-cle="bonusB"></button></div>` : ''}
      <p class="erreur-form" id="erreur-score"></p>
      <button class="bouton plein" type="submit">${tr('Enregistrer le résultat', 'Save the result')}</button>
      ${saisie.existe ? `<p style="text-align:center;margin-top:14px"><button type="button" class="lien-discret" style="color:var(--danger)" data-action="effacer-score">${tr('Effacer le résultat', 'Clear the result')}</button></p>` : ''}
      <p class="raccourcis"><kbd>Tab</kbd> ${tr('équipe suivante', 'next team')} · <kbd>↑</kbd><kbd>↓</kbd> ${tr('modifier', 'change')} · <kbd>${tr('Entrée', 'Enter')}</kbd> ${tr('enregistrer', 'save')} · <kbd>Échap</kbd> ${tr('fermer', 'close')}</p>
    </form></div>`;
}
function htmlTab() {
  const c = etat.courant; const m = saisie.m;
  const lib = LIBELLE_TAB[c.tournoi.sport] || LIBELLE_TAB.football;
  const compteur = (cle, nom) => `<div class="compteur petit"><div class="nom">${esc(nom)}</div><input id="score-${cle.toLowerCase()}" type="number" min="0" value="${saisie[cle]}" data-score="${cle}"><div class="ctrl"><button type="button" data-action="score" data-cle="${cle}" data-pas="-1">${ico('moins')}</button><button type="button" class="plus" data-action="score" data-cle="${cle}" data-pas="1">${ico('plus')}</button></div></div>`;
  return `<div class="bloc-tab"><h4>${tr(...lib)}</h4><p>${tr('Égalité en élimination directe : indique un départage différent pour désigner le vainqueur.', 'Draw in a knockout: enter a different tiebreak score to set the winner.')}</p><div class="duel-saisie">${compteur('tabA', nomEquipe(c, m.equipe_a_id))}<span class="tiret" style="padding-top:52px">–</span>${compteur('tabB', nomEquipe(c, m.equipe_b_id))}</div></div>`;
}
function majZoneTab() {
  const zone = $('#zone-tab');
  if (!zone || !saisie) return;
  const doit = !estPhaseDePoule(saisie.m.phase) && saisie.a === saisie.b && saisie.statut === 'termine';
  if (doit && !zone.innerHTML) zone.innerHTML = htmlTab();
  if (!doit && zone.innerHTML) zone.innerHTML = '';
}
function fermerTiroir() {
  $('#tiroir').classList.remove('ouvert');
  if (!$('#fenetre').classList.contains('ouvert')) $('#voile').classList.remove('ouvert');
  $$('.match.selection').forEach((x) => x.classList.remove('selection'));
  saisie = null;
}
async function enregistrerScore(bouton) {
  const s = saisie;
  const poule = estPhaseDePoule(s.m.phase);
  const avecTab = !poule && s.a === s.b && s.statut === 'termine';
  if (avecTab && s.tabA === s.tabB) { $('#erreur-score').textContent = tr('Égalité : indique un départage différent pour désigner le vainqueur.', 'Draw: enter a different tiebreak score to set the winner.'); return; }
  bouton.disabled = true; bouton.innerHTML = '<span class="rotation"></span>';
  try {
    await donnees.enregistrerResultat({ match_id: s.m.id, score_a: s.a, score_b: s.b, score_tab_a: avecTab ? s.tabA : null, score_tab_b: avecTab ? s.tabB : null, bonus_a: s.bonusA, bonus_b: s.bonusB, statut: s.statut });
    etat.majIds.add(s.m.id);
    fermerTiroir();
    toast(s.statut === 'en_cours' ? tr('Score en direct enregistré, visible par tous.', 'Live score saved, visible to everyone.') : tr('Résultat enregistré, visible en direct par tous.', 'Result saved, live for everyone.'));
    await rechargerCourant(false);
  } catch (e) {
    $('#erreur-score').textContent = messageErreur(e);
    bouton.disabled = false; bouton.textContent = tr('Enregistrer le résultat', 'Save the result');
  }
}

// ---------------------------------------------------------------------
// Phases finales (calendrier.js)
// ---------------------------------------------------------------------
async function phaseFinale(bouton) {
  const c = etat.courant; const a = analyser(c);
  if (a.qualifies < 2) { toast(tr('Il faut au moins 2 qualifiés pour générer la phase finale.', 'At least 2 qualifiers are needed.'), 'erreur'); return; }
  bouton.disabled = true;
  try {
    const poulesAvecClassement = classementsPoules(c).map((p) => ({ classement: p.classement }));
    await insererMatchsAvecExempts(genererPhaseFinaleDepuisPoules(poulesAvecClassement, c.tournoi.nombre_qualifies_par_poule, c.tournoi.id, reglagesDepuisTournoi(c.tournoi, c.matchs)));
    toast(tr('Phase finale générée !', 'Knockout stage generated!'));
    await rechargerCourant(true);
  } catch (e) { toast(messageErreur(e), 'erreur'); bouton.disabled = false; }
}
async function tourSuivant(bouton) {
  const c = etat.courant; const a = analyser(c);
  bouton.disabled = true;
  try {
    const reglages = reglagesDepuisTournoi(c.tournoi, c.matchs);
    const tetesDeSerie = qualifiesParTeteDeSerie(classementsPoules(c), c.tournoi.nombre_qualifies_par_poule);
    // Avec 2 terrains ou plus, la 3e place et la finale se jouent en même temps.
    const matchs = a.peutTroisieme
      ? genererFinaleEtTroisiemePlace(a.derniere.matchs, c.tournoi.id, reglages, tetesDeSerie)
      : genererTourSuivant(a.derniere.matchs, c.tournoi.id, reglages, tetesDeSerie);
    await insererMatchsAvecExempts(matchs);
    toast(tr('Tour suivant généré !', 'Next round generated!'));
    await rechargerCourant(true);
  } catch (e) { toast(messageErreur(e), 'erreur'); bouton.disabled = false; }
}

// ---------------------------------------------------------------------
// QR code, co-organisateurs, export PDF
// ---------------------------------------------------------------------
const lienSuivi = (code) => `${BASE}espace.html${MODE_DEMO ? '?demo=1' : ''}#/suivi/${code}`;
function ouvrirQR() {
  const t = etat.courant.tournoi;
  const lien = lienSuivi(t.code_acces);
  ouvrirFenetre(`<h2>${tr('QR code du tournoi', 'Tournament QR code')}</h2><p class="sous">${tr('Équipes et spectateurs le scannent pour suivre le tournoi en direct, sur le web, sans compte.', 'Teams and spectators scan it to follow the tournament live, on the web, without an account.')}</p>
    <div class="qr-grand" id="qr-grand"></div><p class="code-grand">${esc(String(t.code_acces).toUpperCase())}</p><p class="sous" style="text-align:center;margin-top:0">${tr('Code d\'accès, aussi utilisable dans l\'application', 'Access code, also usable in the app')}</p>
    <div class="actions-fenetre"><button class="bouton petit" data-action="copier" data-texte="${esc(String(t.code_acces).toUpperCase())}">${ico('copier')}<span>${tr('Copier le code', 'Copy code')}</span></button><button class="bouton secondaire petit" data-action="copier" data-texte="${esc(lien)}">${ico('lien')}<span>${tr('Copier le lien', 'Copy link')}</span></button><button class="bouton secondaire petit" data-action="imprimer-qr">${ico('pdf')}<span>${tr('Imprimer', 'Print')}</span></button></div>`, (f) => {
    const zone = $('#qr-grand', f);
    if (window.QRCode) new window.QRCode(zone, { text: lien, width: 224, height: 224, colorDark: '#0b0f18', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
    else zone.textContent = lien;
  });
}
function messagePremium(raison) {
  ouvrirFenetre(`<h2>${tr('Fonction premium', 'Premium feature')}</h2><p class="sous">${{ pdf: tr('L\'export PDF du programme fait', 'PDF export of the schedule is'), ecran: tr('La vue grand écran fait', 'The big-screen view is') }[raison] || tr('Les co-organisateurs font', 'Co-organizers are')} ${tr('partie du Pass Tournoi et d\'OLYMPIAD Pro.', 'part of the Tournament Pass and OLYMPIAD Pro.')}</p>
    <div class="encart"><p style="margin:0">${tr('Les achats se font dans l\'application OLYMPIAD sur iPhone ou Android. Une fois le tournoi débloqué (ou ton abonnement Pro actif), la fonction est disponible ici aussi, avec le même compte.', 'Purchases are made in the OLYMPIAD app on iPhone or Android. Once the tournament is unlocked (or your Pro subscription is active), the feature is available here too, with the same account.')}</p></div>
    <div class="actions-fenetre"><a class="bouton secondaire petit" href="index.html#offres">${tr('Voir les offres', 'See plans')}</a><button class="bouton petit" data-action="fermer-fenetre">OK</button></div>`);
}
// Limite gratuite atteinte : présente les offres. Les achats passent par l'App Store
// ou Google Play (RevenueCat) dans l'app ; le site ne peut rien encaisser lui-même.
// enCreation : le tournoi n'existe pas encore (assistant), un Pass ne peut pas s'y appliquer.
function fenetreOffres({ enCreation = false } = {}) {
  const offre = (id, nom, prix, desc, vedette) => `<button type="button" class="carte-offre ${vedette ? 'vedette' : ''}" data-action="choisir-offre" data-offre="${id}" aria-pressed="false">
    ${vedette ? `<span class="ruban">${tr('Pour les clubs', 'For clubs')}</span>` : ''}<b>${nom}</b><span class="prix-offre">${prix}</span><span class="desc">${desc}</span><span class="choisir">${tr('Choisir', 'Choose')}${ico('fleche')}</span></button>`;
  ouvrirFenetre(`<h2>${tr('Passe à la vitesse supérieure', 'Go further')}</h2>
    <p class="sous">${tr(`La version gratuite s'arrête à ${LIMITE_GRATUITE} équipes par tournoi. Choisis une offre pour en ajouter autant que tu veux.`, `The free plan stops at ${LIMITE_GRATUITE} teams per tournament. Pick a plan to add as many as you like.`)}</p>
    <div class="cartes-offres">
      ${offre('pass', tr('Pass Tournoi', 'Tournament Pass'), tr('9,99 € · achat unique', '€9.99 · one-time purchase'), tr('Équipes illimitées, grand écran, export PDF et co-organisateurs pour ce tournoi, jusqu\'à 5 jours après sa date.', 'Unlimited teams, big screen, PDF export and co-organizers for this tournament, until 5 days after its date.'))}
      ${offre('pro', 'OLYMPIAD Pro', tr('59,99 € / an (Saison) ou 14,99 € / mois', '€59.99 / year (Season) or €14.99 / month'), tr('Toutes les fonctions premium, sur tous tes tournois. L\'annuel revient à 5 € / mois. Résiliable à tout moment.', 'Every premium feature, on all your tournaments. Yearly comes to €5 / month. Cancel anytime.'), true)}
    </div>
    <div id="etapes-offre" class="encart etapes-offre" hidden></div>
    <p class="mention-offres">${tr('Prix TTC pour la France ; le prix exact dans ton pays est affiché dans l\'application avant tout achat. Paiement via l\'App Store ou Google Play.', 'Prices include VAT for France; the exact price in your country is shown in the app before any purchase. Payment through the App Store or Google Play.')}</p>
    <div class="actions-fenetre"><button class="bouton secondaire petit" data-action="fermer-fenetre">${tr('Plus tard', 'Later')}</button></div>`, (f) => {
    f.dataset.enCreation = enCreation ? '1' : '';
  });
}
function etapesOffre(id) {
  const f = $('#fenetre');
  $$('.carte-offre', f).forEach((c) => { const actif = c.dataset.offre === id; c.classList.toggle('actif', actif); c.setAttribute('aria-pressed', String(actif)); });
  const etapes = id === 'pass'
    ? [
      ...(f.dataset.enCreation ? [tr(`Crée d'abord ce tournoi avec ${LIMITE_GRATUITE} équipes : un Pass s'applique à un tournoi déjà créé.`, `First create this tournament with ${LIMITE_GRATUITE} teams: a Pass applies to an existing tournament.`)] : []),
      tr('Ouvre l\'application OLYMPIAD avec le même compte.', 'Open the OLYMPIAD app with the same account.'),
      tr('Va sur ce tournoi, onglet Équipes, et ajoute une équipe : l\'écran des offres s\'ouvre.', 'Go to this tournament, Teams tab, and add a team: the plans screen opens.'),
      tr('Choisis « Pass Tournoi » et valide l\'achat.', 'Pick “Tournament Pass” and confirm the purchase.'),
    ]
    : [
      tr('Ouvre l\'application OLYMPIAD avec le même compte.', 'Open the OLYMPIAD app with the same account.'),
      tr('Va dans Mon profil, puis « Découvrir les offres ».', 'Go to My profile, then “See the offers”.'),
      tr('Choisis OLYMPIAD Pro, mensuel ou annuel, et valide l\'achat.', 'Pick OLYMPIAD Pro, monthly or yearly, and confirm the purchase.'),
    ];
  const zone = $('#etapes-offre', f);
  zone.innerHTML = `<h3>${tr('Ça se passe dans l\'app', 'It happens in the app')}</h3><ol>${etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>
    <p>${tr('Dès l\'achat validé, la limite saute ici aussi : recharge simplement cette page.', 'As soon as the purchase goes through, the limit is lifted here too: just reload this page.')}</p>
    <div class="stores-offre"><span class="store-offre"><small>${tr('Bientôt sur', 'Soon on')}</small>App Store</span><span class="store-offre"><small>${tr('Bientôt sur', 'Soon on')}</small>Google Play</span></div>`;
  zone.hidden = false;
  zone.classList.remove('apparait'); void zone.offsetWidth; zone.classList.add('apparait');
}
async function ouvrirCoOrganisateurs() {
  const t = etat.courant.tournoi;
  if (!debloque(t)) { messagePremium('coorgs'); return; }
  ouvrirFenetre(`<h2>${tr('Co-organisateurs', 'Co-organizers')}</h2><p class="sous">${tr('Invite des bénévoles à saisir les scores ou à gérer le tournoi, avec des droits choisis pour chacun.', 'Invite volunteers to enter scores or manage the tournament, with rights chosen for each.')}</p><div id="zone-coorgs"><div class="squelette-bloc" style="height:120px"></div></div>`);
  try {
    const [code, liste] = await Promise.all([donnees.invitation(t.id), donnees.coOrganisateurs(t.id)]);
    const zone = $('#zone-coorgs');
    if (!zone) return;
    const droits = [['peut_saisir_scores', tr('Saisir les scores', 'Enter scores')], ['peut_gerer_le_tournoi', tr('Gérer le tournoi', 'Manage')], ['peut_supprimer_le_tournoi', tr('Supprimer', 'Delete')]];
    zone.innerHTML = `<div class="encart" style="text-align:center"><p style="margin:0">${tr('Code d\'invitation', 'Invitation code')}</p><p class="code-grand" style="font-size:42px">${esc(code)}</p><button class="bouton petit" data-action="copier" data-texte="${esc(code)}">${ico('copier')}<span>${tr('Copier', 'Copy')}</span></button><p style="margin:12px 0 0;font-size:13px">${tr('À saisir dans l\'app ou ici, dans « Rejoindre comme co-organisateur ».', 'To enter in the app or here, under “Join as a co-organizer”.')}</p></div>
      <div class="titre-bloc">${tr('Équipe d\'organisation', 'Organizing team')}<small>${liste.length}</small></div>
      ${liste.length ? liste.map((l) => { const p = l.profil || {}; const nom = [p.prenom, p.nom].filter(Boolean).join(' ') || tr('Co-organisateur', 'Co-organizer'); return `<div class="co-org"><span class="ini">${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="">` : esc((((p.prenom || '').charAt(0) + (p.nom || '').charAt(0)).toUpperCase()) || '?')}</span><b>${esc(nom)}</b><button class="bouton-icone" data-action="retirer-coorg" data-user="${l.user_id}" aria-label="${tr('Retirer', 'Remove')}">${ico('poubelle')}</button>
        <div class="droits">${droits.map(([champ, lib]) => `<div class="droit"><span>${lib}</span><button class="interrupteur" role="switch" aria-checked="${Boolean(l[champ])}" data-action="droit" data-user="${l.user_id}" data-champ="${champ}"></button></div>`).join('')}</div></div>`; }).join('') : `<div class="vide-etat" style="padding:26px">${tr('Personne pour l\'instant. Envoie le code ci-dessus à un bénévole.', 'Nobody yet. Send the code above to a volunteer.')}</div>`}`;
  } catch (e) { const z = $('#zone-coorgs'); if (z) z.innerHTML = `<p class="erreur-form">${esc(messageErreur(e))}</p>`; }
}
function imprimer(html) {
  const cadre = document.createElement('iframe');
  cadre.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(cadre);
  cadre.contentDocument.open(); cadre.contentDocument.write(html); cadre.contentDocument.close();
  setTimeout(() => { cadre.contentWindow.focus(); cadre.contentWindow.print(); setTimeout(() => cadre.remove(), 2000); }, 400);
}
const stylesImpression = `<style>body{font-family:'Work Sans',Arial,sans-serif;color:#11161f;margin:28px}h1{font-family:'Bebas Neue',Impact,sans-serif;font-weight:400;font-size:40px;margin:0}h2{font-family:'Bebas Neue',Impact,sans-serif;font-weight:400;font-size:24px;color:#9a6700;border-bottom:2px solid #ebb517;margin:22px 0 6px}.meta{color:#646972;margin:0 0 14px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #d3d8e0;padding:6px 4px;text-align:left}.pied{margin-top:22px;font-size:11px;color:#646972}</style><link href="${new URL('polices/polices.css', location.href)}" rel="stylesheet">`;
function exporterPDF() {
  const c = etat.courant; const t = c.tournoi;
  if (!debloque(t)) { messagePremium('pdf'); return; }
  const a = analyser(c);
  const lignes = (ms) => ms.map((m) => { const r = m.resultat; return `<tr><td>${formaterHeure(m.horaire)}</td><td>${m.terrain ? `${tr('Terrain', 'Field')} ${esc(m.terrain)}` : '—'}</td><td>${esc(nomEquipe(c, m.equipe_a_id))}</td><td>${m.equipe_b_id ? esc(nomEquipe(c, m.equipe_b_id)) : tr('Exempt', 'Bye')}</td><td>${r?.statut === 'termine' && m.equipe_b_id ? `${r.score_a} - ${r.score_b}` : ''}</td></tr>`; }).join('');
  const cp = classementsPoules(c);
  imprimer(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(t.nom)}</title>${stylesImpression}</head><body>
    <h1>${esc(t.nom)}</h1><p class="meta">${formaterDate(t.date_debut)} · ${nomSport(t.sport)} · ${c.equipes.length} ${motEquipes(t)} · ${tr('Code d\'accès', 'Access code')} ${esc(String(t.code_acces).toUpperCase())}</p>
    ${cp.map((p) => `<p><b>${esc(libellePhase(p.poule.nom))}</b> : ${p.classement.map((s) => esc(s.equipe.nom)).join(', ')}</p>`).join('')}
    ${a.phases.map((g) => `<h2>${esc(libellePhase(g.nom))}</h2><table><thead><tr><th>${tr('Horaire', 'Time')}</th><th>${tr('Terrain', 'Field')}</th><th>${tr('Équipe A', 'Team A')}</th><th>${tr('Équipe B', 'Team B')}</th><th>Score</th></tr></thead><tbody>${lignes(g.matchs)}</tbody></table>`).join('')}
    ${cp.map((p) => `<h2>${tr('Classement', 'Standings')} · ${esc(libellePhase(p.poule.nom))}</h2><table><thead><tr><th>#</th><th>${tr('Équipe', 'Team')}</th><th>${tr('J', 'P')}</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${p.classement.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.equipe.nom)}</td><td>${s.joues}</td><td>${s.diff_buts}</td><td><b>${s.points}</b></td></tr>`).join('')}</tbody></table>`).join('')}
    <p class="pied">${tr('Programme généré par OLYMPIAD', 'Schedule generated by OLYMPIAD')} · ${tr('Suis le tournoi en direct', 'Follow live')} : ${esc(lienSuivi(t.code_acces))}</p></body></html>`);
}

// ---------------------------------------------------------------------
// Grand écran (affichage.js)
// ---------------------------------------------------------------------
let minuteurHorloge = null;
async function vueGrandEcran(id) {
  if (etat.courant?.tournoi?.id !== id) {
    await chargement();
    etat.courant = await chargerCourant(id).catch(() => null);
    if (!etat.courant) { location.hash = '#/'; return; }
    abonnerTempsReel(id);
  }
  // Fonction premium, comme l'export PDF et les co-organisateurs (même règle que l'app).
  // replaceState plutôt que location.hash : le changement de route fermerait la fenêtre.
  if (!debloque(etat.courant.tournoi)) {
    const onglet = etat.onglet || 'matchs';
    history.replaceState(null, '', `#/tournoi/${id}/${onglet}`);
    await vueTournoi(id, onglet);
    messagePremium('ecran');
    return;
  }
  await vueTournoi(id, etat.onglet || 'matchs');
  const ge = $('#grand-ecran');
  ge.classList.add('ouvert');
  document.body.style.overflow = 'hidden';
  rendreGrandEcran();
  clearInterval(minuteurHorloge);
  minuteurHorloge = setInterval(() => { const h = $('.ge-horloge', ge); if (h) { const d = new Date(); h.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; } }, 1000);
  try { const page = document.documentElement; if (page.requestFullscreen && innerWidth > 900 && !document.fullscreenElement) page.requestFullscreen().catch(() => {}); } catch (e) { /* rien */ }
}
function fermerGrandEcran() {
  const ge = $('#grand-ecran');
  if (!ge.classList.contains('ouvert')) return;
  ge.classList.remove('ouvert');
  document.body.style.overflow = '';
  clearInterval(minuteurHorloge);
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* rien */ }
}
function rendreGrandEcran() {
  const c = etat.courant; if (!c) return;
  const t = c.tournoi; const a = analyser(c);
  const d = new Date();
  const peutSaisir = Boolean(c.droits?.saisir);
  const ligne = (m) => { const r = m.resultat; const fini = r?.statut === 'termine'; const direct = r?.statut === 'en_cours'; return `<div class="ge-match ${direct ? 'live' : ''} ${etat.majIds.has(m.id) ? 'maj' : ''} ${peutSaisir ? 'cliquable' : ''}" ${peutSaisir ? `data-action="saisir" data-match="${m.id}" role="button" tabindex="0" title="${tr('Saisir le score', 'Enter the score')}"` : ''}><div class="eq">${esc(nomEquipe(c, m.equipe_a_id))} · ${esc(nomEquipe(c, m.equipe_b_id))}<small>${direct ? `<span class="badge-direct">${tr('EN DIRECT', 'LIVE')}</span> · ` : ''}${esc(libellePhase(m.phase))}${m.terrain ? ` · ${tr('terrain', 'field')} ${esc(m.terrain)}` : ''} · ${formaterHeure(m.horaire)}</small></div><span class="sc">${fini || direct ? `${r.score_a}-${r.score_b}` : `<small style="font-family:var(--corps);font-size:15px">${tr('À venir', 'Upcoming')}</small>`}</span></div>`; };
  const jouables = a.matchs.filter((m) => m.equipe_b_id);
  const enDirect = (m) => (m.resultat?.statut === 'en_cours' ? 0 : 1);
  const avenir = jouables.filter((m) => m.resultat?.statut !== 'termine').sort((x, y) => enDirect(x) - enDirect(y) || new Date(x.horaire) - new Date(y.horaire)).slice(0, 7);
  const derniers = jouables.filter((m) => m.resultat?.statut === 'termine').sort((x, y) => new Date(y.horaire) - new Date(x.horaire)).slice(0, 8);
  const cp = classementsPoules(c);
  const [bp, bc] = (ABREV[t.sport] || ABREV.football)[langue === 'en' ? 1 : 0];
  const tables = cp.map(({ poule, classement }) => `<div class="s-tableau"><h4>${esc(libellePhase(poule.nom))}</h4><table><thead><tr><th></th><th>${tr('Équipe', 'Team')}</th><th>${tr('J', 'P')}</th><th>${bp}</th><th>${bc}</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${classement.map((s, i) => `<tr class="${t.format === 'mixte' && i < t.nombre_qualifies_par_poule ? 'qualifie' : ''}"><td>${i + 1}</td><td>${esc(s.equipe.nom)}</td><td>${s.joues}</td><td>${s.buts_pour}</td><td>${s.buts_contre}</td><td>${s.diff_buts > 0 ? '+' : ''}${s.diff_buts}</td><td>${s.points}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const vainqueur = a.vainqueur ? `<p class="coupe" style="color:#f3f2ed">🏆 <em>${esc(nomEquipe(c, a.vainqueur))}</em></p>` : '';
  // Phases finales générées depuis le grand écran (mêmes règles que l'onglet Matchs)
  let actionPhase = '';
  if (c.droits?.gerer && a.peutPhaseFinale) actionPhase = `<div class="ge-action"><div><b>${tr('Toutes les poules sont terminées', 'All groups are finished')}</b><small>${tr(`${a.qualifies} qualifiés pour la phase finale`, `${a.qualifies} teams qualify for the knockouts`)}</small></div><button class="bouton petit" data-action="phase-finale">${tr('Générer la phase finale', 'Generate the knockouts')}</button></div>`;
  else if (c.droits?.gerer && a.peutTourSuivant) actionPhase = `<div class="ge-action"><div><b>${esc(libellePhase(a.derniere.nom))} · ${tr('terminé', 'finished')}</b><small>${a.peutTroisieme ? tr('Finale et match pour la 3e place', 'Final and third-place match') : tr('Les vainqueurs passent au tour suivant', 'Winners go through')}</small></div><button class="bouton petit" data-action="tour-suivant">${tr('Générer le tour suivant', 'Generate the next round')}</button></div>`;
  const astuce = peutSaisir ? `<p class="ge-astuce">${ico('direct')}${tr('Clique sur un match pour saisir ou corriger son score', 'Click a match to enter or fix its score')}</p>` : '';
  $('#grand-ecran').innerHTML = `<div class="ge-entete"><span class="s-marque"><svg aria-hidden="true" style="width:40px;height:40px"><use href="#i-marque"/></svg><span style="font-family:var(--titre);font-size:36px">OLYMPIAD</span></span><h2>${esc(t.nom)}</h2><span class="ge-horloge">${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</span><div class="ge-code">${tr('Suis le tournoi avec le code', 'Follow with code')}<b>${esc(String(t.code_acces).toUpperCase())}</b></div><a class="ge-fermer" href="#/tournoi/${t.id}" style="display:inline-flex;align-items:center;text-decoration:none">${tr('Quitter', 'Exit')} (Esc)</a></div>
    ${actionPhase}${astuce}
    <div class="ge-grille"><div class="ge-col"><h3>${tr('Classements', 'Standings')}</h3>${vainqueur}${tables || a.principales.map((p) => `<p class="s-eyebrow">${esc(libellePhase(p.nom))}</p>${p.matchs.filter((m) => m.equipe_b_id).map(ligne).join('')}`).join('') || `<p style="color:#808693">${tr('À venir', 'Upcoming')}</p>`}</div>
      <div class="ge-col"><h3>${tr('Prochains matchs', 'Next matches')}</h3>${avenir.map(ligne).join('') || `<p style="color:#808693">${tr('Tous les matchs sont joués.', 'All matches have been played.')}</p>`}</div>
      <div class="ge-col"><h3>${tr('Derniers résultats', 'Latest results')}</h3>${derniers.map(ligne).join('') || `<p style="color:#808693">${tr('Aucun résultat pour l\'instant.', 'No results yet.')}</p>`}</div></div>`;
  etat.majIds.clear();
}

// ---------------------------------------------------------------------
// Suivi public (suivi/[code]) : sans compte
// ---------------------------------------------------------------------
async function vueSuivi(code) {
  etat.suiviDepuis = Boolean(etat.courant && String(etat.courant.tournoi.code_acces).toLowerCase() === code.toLowerCase() && etat.session);
  await chargement();
  let tournoi = null;
  try { tournoi = await donnees.tournoiParCode(code); } catch (e) { tournoi = null; }
  if (!tournoi) return afficher(`<div class="page" style="max-width:640px"><div class="vide-etat"><h2 style="font-size:40px;margin:0 0 6px">${tr('Tournoi introuvable', 'Tournament not found')}</h2><p>${tr('Ce code d\'accès ne correspond à aucun tournoi. Vérifie le code ou le QR code utilisé.', 'This access code matches no tournament. Check the code or QR code.')}</p></div></div>`);
  etat.courant = await chargerCourant(tournoi.id).catch(() => null);
  if (!etat.courant) return;
  etat.courant.droits = { principal: false, saisir: false, gerer: false, supprimer: false };
  etat.ongletSuivi = etat.ongletSuivi || 'classement';
  abonnerTempsReel(tournoi.id);
  await afficher(`<div id="vue-suivi"></div>`);
  rendreSuivi();
}
// Signalement d'un contenu inapproprié, comme dans l'app (lib/liensLegaux.js) :
// e-mail prérempli avec le nom et le code du tournoi
const EMAIL_CONTACT = 'clement.berthout@gmail.com';
function lienSignalement(t) {
  const code = String(t.code_acces).toUpperCase();
  const sujet = tr(`Signalement du tournoi ${code}`, `Report for tournament ${code}`);
  const corps = tr(`Tournoi : ${t.nom} (code ${code})\n\nQu'est-ce qui pose problème ? (nom d'équipe injurieux, contenu inapproprié…)\n\n`, `Tournament: ${t.nom} (code ${code})\n\nWhat is the problem? (offensive team name, inappropriate content…)\n\n`);
  return `mailto:${EMAIL_CONTACT}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
function rendreSuivi() {
  const zone = $('#vue-suivi'); const c = etat.courant; if (!zone || !c) return;
  const t = c.tournoi;
  zone.innerHTML = `<section class="entete-tournoi"><div class="page">
      <div class="titre-tournoi"><span class="ico-sport">${ico(t.sport)}</span><h1>${esc(t.nom)}</h1></div>
      <div class="infos-tournoi"><span>${nomSport(t.sport)} · ${formaterDate(t.date_debut)}</span><span class="indicateur-direct" id="indicateur-direct">${tr('EN DIRECT', 'LIVE')}</span></div>
      <nav class="onglets-tournoi"><a href="#" data-action="onglet-suivi" data-onglet="classement" class="${etat.ongletSuivi === 'classement' ? 'actif' : ''}">${tr('Classement', 'Standings')}</a><a href="#" data-action="onglet-suivi" data-onglet="calendrier" class="${etat.ongletSuivi === 'calendrier' ? 'actif' : ''}">${tr('Calendrier', 'Schedule')}</a></nav>
    </div></section>
    <div class="page"><div class="contenu-onglet">${etat.ongletSuivi === 'classement' ? htmlClassement() : htmlMatchs(true)}</div>
      <p class="mention" style="text-align:center;margin-top:28px"><a href="${lienSignalement(t)}">${tr('Signaler ce tournoi', 'Report this tournament')}</a></p>
      <p class="mention" style="text-align:center;margin-top:34px">${etat.session && etat.suiviDepuis ? `<a class="bouton secondaire petit" href="#/tournoi/${t.id}">${tr('Retour à la gestion du tournoi', 'Back to tournament management')}</a>` : `${tr('Tu organises ce tournoi ?', 'Running this tournament?')} <a href="#/connexion">${tr('Connecte-toi à l\'espace organisateur', 'Sign in to the organizer area')}</a> · <a href="index.html">OLYMPIAD</a>`}</p></div>`;
  const ind = $('#indicateur-direct'); if (ind) ind.classList.add('connecte');
  etat.majIds.clear();
}

// ---------------------------------------------------------------------
// Profil (profil.js)
// ---------------------------------------------------------------------
async function vueProfil() {
  await chargerUtilisateur();
  const p = etat.profil || {};
  return afficher(`<div class="page"><div class="entete-page"><div><p class="surtitre">${tr('Compte', 'Account')}</p><h1>${tr('Mon profil', 'My profile')}</h1></div></div>
    <div class="grille-profil">
      <div class="carte-identite cascade"><label class="avatar-grand" style="--i:0">${p.photo_url ? `<img src="${esc(p.photo_url)}" alt="">` : esc(initiales())}<input type="file" accept="image/*" id="photo-profil" hidden></label>
        <h2 style="--i:1">${esc([p.prenom, p.nom].filter(Boolean).join(' ') || tr('Organisateur', 'Organizer'))}</h2><p style="--i:2">${esc(etat.session.user.email || '')}${p.club ? ` · ${esc(p.club)}` : ''}</p>
        ${p.photo_url ? `<p style="--i:2;margin:-6px 0 12px"><button type="button" class="lien-discret" data-action="retirer-photo">${tr('Retirer la photo', 'Remove photo')}</button></p>` : ''}<span class="badge-pro ${etat.pro ? '' : 'gratuit'}" style="--i:3">${etat.pro ? 'OLYMPIAD PRO' : tr('OFFRE GRATUITE', 'FREE PLAN')}</span></div>
      <div class="cascade">
        <form class="section-profil" id="form-profil" style="--i:1"><h3>${tr('Informations', 'Details')}</h3>
          <div class="champs-2"><div class="champ"><label>${tr('Prénom', 'First name')}</label><input id="p-prenom" value="${esc(p.prenom)}"></div><div class="champ"><label>${tr('Nom', 'Last name')}</label><input id="p-nom" value="${esc(p.nom)}"></div></div>
          <div class="champ"><label>${tr('Club', 'Club')}</label><input id="p-club" value="${esc(p.club)}"></div>
          <button class="bouton petit" type="submit">${tr('Enregistrer', 'Save')}</button></form>
        <form class="section-profil" id="form-email" style="--i:2"><h3>E-mail</h3><div class="champ"><label>${tr('Nouvelle adresse e-mail', 'New email address')}</label><input id="p-email" type="email" value="${esc(etat.session.user.email || '')}"></div><p class="mention-legale" style="margin:0 0 12px">${tr('Un lien de confirmation sera envoyé à la nouvelle adresse.', 'A confirmation link will be sent to the new address.')}</p><button class="bouton petit secondaire" type="submit">${tr('Changer d\'adresse', 'Change email')}</button></form>
        <form class="section-profil" id="form-mdp" style="--i:3"><h3>${tr('Mot de passe', 'Password')}</h3><div class="champs-2"><div class="champ"><label>${tr('Mot de passe actuel', 'Current password')}</label><input id="p-ancien" type="password" autocomplete="current-password"></div><div class="champ"><label>${tr('Nouveau mot de passe', 'New password')}</label><input id="p-nouveau" type="password" autocomplete="new-password" minlength="6"></div></div><p class="erreur-form" id="erreur-mdp-profil"></p><button class="bouton petit secondaire" type="submit">${tr('Changer le mot de passe', 'Change password')}</button></form>
        <div class="section-profil" style="--i:4"><h3>${tr('Abonnement', 'Subscription')}</h3><p class="mention-legale" style="margin:0">${etat.pro ? tr('Ton abonnement OLYMPIAD Pro est actif : toutes les fonctions premium sont débloquées, ici et dans l\'app. Il se gère dans l\'App Store ou Google Play.', 'Your OLYMPIAD Pro subscription is active: every premium feature is unlocked, here and in the app. It\'s managed in the App Store or Google Play.') : tr('Offre gratuite : 12 équipes par tournoi, sans grand écran, export PDF ni co-organisateurs. Le Pass Tournoi et OLYMPIAD Pro s\'achètent dans l\'application mobile.', 'Free plan: 12 teams per tournament, no big screen, PDF export or co-organizers. The Tournament Pass and OLYMPIAD Pro are bought in the mobile app.')}</p></div>
        <div class="section-profil" style="--i:5"><h3>${tr('Informations légales', 'Legal')}</h3><p class="mention-legale" style="margin:0"><a href="politique-confidentialite.html">${tr('Politique de confidentialité', 'Privacy policy')}</a> · <a href="conditions-utilisation.html">${tr('Conditions d\'utilisation', 'Terms of use')}</a> · <a href="mentions-legales.html">${tr('Mentions légales', 'Legal notice')}</a></p></div>
        <div class="zone-danger" style="--i:6"><h3>${tr('Supprimer mon compte', 'Delete my account')}</h3><p>${tr('Tes tournois, équipes, résultats et ta photo seront supprimés définitivement. Pense à résilier l\'abonnement Pro dans le store.', 'Your tournaments, teams, results and photo will be permanently deleted. Remember to cancel Pro in the store.')}</p><button class="bouton petit danger" data-action="supprimer-compte">${tr('Supprimer mon compte', 'Delete my account')}</button></div>
      </div></div></div>`);
}
function redimensionnerPhoto(fichier) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const cote = 512; const c = document.createElement('canvas'); c.width = cote; c.height = cote;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, cote, cote);
      c.toBlob((b) => (b ? ok(b) : ko(new Error('photo'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => ko(new Error(tr('Image illisible.', 'Unreadable image.')));
    img.src = URL.createObjectURL(fichier);
  });
}

// ---------------------------------------------------------------------
// Sélecteurs de date et d'heure (remplacent ceux du navigateur)
// La valeur vit dans un champ caché (data-reglage / data-brouillon) : les
// formulaires la lisent comme avant, un événement « input » la signale.
// ---------------------------------------------------------------------
const texteDate = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : tr('Choisir une date', 'Pick a date'));
function champDate(id, attr, valeur) {
  return `<div class="selecteur"><input type="hidden" id="${id}" ${attr} value="${esc(valeur || '')}"><button type="button" class="selecteur-champ" data-action="ouvrir-selecteur" data-type="date" data-cible="${id}" aria-haspopup="dialog">${ico('calendrier')}<span class="valeur">${esc(texteDate(valeur))}</span>${ico('chevron', 'chevron')}</button></div>`;
}
function champHeure(id, attr, valeur, compact = false) {
  const v = heureCourte(valeur) || '09:00';
  return `<div class="selecteur ${compact ? 'compact' : ''}"><input type="hidden" id="${id}" ${attr} value="${esc(v)}"><button type="button" class="selecteur-champ" data-action="ouvrir-selecteur" data-type="heure" data-cible="${id}" aria-haspopup="dialog">${ico('horloge')}<span class="valeur heure">${esc(v)}</span>${ico('chevron', 'chevron')}</button></div>`;
}
// Nombres : options { min, max, titre, icone, minutes, zero (libellé de 0), compact }
const PRESETS_MINUTES = [0, 2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 120, 150, 180];
const texteNombre = (v, d) => (Number(v) === 0 && d.zero ? d.zero : `${v}${d.minutes ? ' min' : ''}`);
function champNombre(id, attr, valeur, o) {
  const d = { min: o.min, max: o.max, titre: o.titre || '', minutes: o.minutes ? '1' : '', zero: o.zero || '' };
  const data = Object.entries(d).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ');
  return `<div class="selecteur nombre ${o.compact ? 'compact' : ''}"><input type="hidden" id="${id}" ${attr} data-nombre value="${esc(String(valeur))}"><button type="button" class="selecteur-champ" data-action="ouvrir-selecteur" data-type="nombre" data-cible="${id}" ${data} aria-haspopup="dialog">${ico(o.icone || (o.minutes ? 'horloge' : 'plus'))}<span class="valeur chiffre">${esc(texteNombre(valeur, d))}</span>${ico('chevron', 'chevron')}</button></div>`;
}
let selecteurOuvert = null; // { type, input, bouton, el, mois }
function ouvrirSelecteur(bouton) {
  if (selecteurOuvert && selecteurOuvert.bouton === bouton) { fermerSelecteur(); return; }
  fermerSelecteur();
  const input = document.getElementById(bouton.dataset.cible);
  if (!input) return;
  const el = document.createElement('div');
  el.className = `popover-selecteur ${bouton.dataset.type} sel-${bouton.dataset.type}`;
  el.setAttribute('role', 'dialog');
  document.body.appendChild(el);
  const base = bouton.dataset.type === 'date' ? new Date(`${input.value || new Date().toISOString().slice(0, 10)}T12:00:00`) : null;
  selecteurOuvert = { type: bouton.dataset.type, input, bouton, el, mois: base ? new Date(base.getFullYear(), base.getMonth(), 1) : null };
  bouton.classList.add('ouvert');
  rendreSelecteur();
  placerSelecteur();
}
function placerSelecteur() {
  if (!selecteurOuvert) return;
  const { el, bouton } = selecteurOuvert;
  const r = bouton.getBoundingClientRect();
  const l = el.offsetWidth; const h = el.offsetHeight;
  let haut = r.bottom + 8;
  if (haut + h > innerHeight - 12 && r.top - h - 8 > 12) { haut = r.top - h - 8; el.classList.add('au-dessus'); } else el.classList.remove('au-dessus');
  el.style.top = `${Math.max(12, haut)}px`;
  el.style.left = `${Math.min(Math.max(12, r.left), innerWidth - l - 12)}px`;
}
function fermerSelecteur() {
  if (!selecteurOuvert) return;
  const { el, bouton, input } = selecteurOuvert;
  bouton.classList.remove('ouvert');
  if ('rafraichir' in input.dataset && etat.brouillon) setTimeout(rafraichirAssistant, 190);
  el.classList.add('sort');
  setTimeout(() => el.remove(), 180);
  selecteurOuvert = null;
}
function choisirValeur(valeur, fermer) {
  const { input, bouton, type } = selecteurOuvert;
  input.value = valeur;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  $('.valeur', bouton).textContent = type === 'date' ? texteDate(valeur) : type === 'nombre' ? texteNombre(valeur, bouton.dataset) : valeur;
  bouton.classList.remove('flash-valeur'); void bouton.offsetWidth; bouton.classList.add('flash-valeur');
  if (fermer) fermerSelecteur(); else rendreSelecteur();
}
function rendreSelecteur(sens = 0) {
  const o = selecteurOuvert; if (!o) return;
  if (o.type === 'nombre') {
    const d = o.bouton.dataset; const min = Number(d.min); const max = Number(d.max); const v = Number(o.input.value);
    const valeurs = d.minutes ? [...new Set([...PRESETS_MINUTES.filter((x) => x >= min && x <= max), v])].sort((x, y) => x - y) : Array.from({ length: max - min + 1 }, (_, i) => min + i);
    o.el.innerHTML = `<div class="sel-entete"><b class="sel-mois">${esc(d.titre)}</b><span class="sel-apercu" key="${v}">${esc(texteNombre(v, d))}</span></div>
      <div class="sel-reglette"><button type="button" class="sel-nav" data-action="sel-pas" data-pas="-1" ${v <= min ? 'disabled' : ''} aria-label="−">${ico('moins')}</button><div class="sel-jauge"><i style="width:${max > min ? ((v - min) / (max - min)) * 100 : 100}%"></i></div><button type="button" class="sel-nav" data-action="sel-pas" data-pas="1" ${v >= max ? 'disabled' : ''} aria-label="+">${ico('plus')}</button></div>
      <div class="sel-puces ${d.minutes ? 'minutes' : ''}">${valeurs.map((x, i) => `<button type="button" class="${x === v ? 'choisi' : ''}" style="--i:${i}" data-action="sel-nombre" data-valeur="${x}">${x === 0 && d.zero ? esc(d.zero) : x}</button>`).join('')}</div>
      <div class="sel-pied"><span class="sel-astuce">${d.minutes ? tr('En minutes · ', 'In minutes · ') : ''}${min} – ${max}</span><button type="button" class="bouton petit" data-action="sel-fermer">OK</button></div>`;
  } else if (o.type === 'date') {
    const choisi = o.input.value;
    const auj = new Date(); const ajd = `${auj.getFullYear()}-${pad(auj.getMonth() + 1)}-${pad(auj.getDate())}`;
    const premier = o.mois; const decalage = (premier.getDay() + 6) % 7; // lundi en premier
    const debut = new Date(premier); debut.setDate(1 - decalage);
    const jours = [];
    for (let i = 0; i < 42; i++) { const d = new Date(debut); d.setDate(debut.getDate() + i); jours.push(d); }
    const nomsJours = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '').slice(0, 3));
    o.el.innerHTML = `<div class="sel-entete"><button type="button" class="sel-nav" data-action="sel-mois" data-sens="-1" aria-label="${tr('Mois précédent', 'Previous month')}">${ico('retour')}</button><b class="sel-mois ${sens ? (sens > 0 ? 'vers-gauche' : 'vers-droite') : ''}">${premier.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</b><button type="button" class="sel-nav" data-action="sel-mois" data-sens="1" aria-label="${tr('Mois suivant', 'Next month')}">${ico('droite')}</button></div>
      <div class="sel-jours-noms">${nomsJours.map((n) => `<span>${n}</span>`).join('')}</div>
      <div class="sel-grille ${sens ? (sens > 0 ? 'vers-gauche' : 'vers-droite') : ''}">${jours.map((d) => { const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; const cls = [d.getMonth() !== premier.getMonth() ? 'autre' : '', v === ajd ? 'aujourdhui' : '', v === choisi ? 'choisi' : '', d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''].join(' '); const passe = v < ajd && v !== choisi; return `<button type="button" class="${cls}" data-action="sel-jour" data-valeur="${v}" ${passe ? 'disabled' : ''}>${d.getDate()}</button>`; }).join('')}</div>
      <div class="sel-pied"><button type="button" class="lien-discret" data-action="sel-jour" data-valeur="${ajd}">${tr('Aujourd\'hui', 'Today')}</button><button type="button" class="lien-discret" data-action="sel-fermer">${tr('Fermer', 'Close')}</button></div>`;
  } else {
    const [h, m] = (o.input.value || '09:00').split(':').map(Number);
    const minutes = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), m])].sort((x, y) => x - y);
    o.el.innerHTML = `<div class="sel-entete"><b class="sel-mois">${tr('Horaire', 'Time')}</b><span class="sel-apercu">${pad(h)}<i>:</i>${pad(m)}</span></div>
      <div class="sel-colonnes"><div><small>${tr('Heures', 'Hours')}</small><div class="sel-liste" data-liste="h">${Array.from({ length: 24 }, (_, i) => `<button type="button" class="${i === h ? 'choisi' : ''}" data-action="sel-heure" data-valeur="${i}">${pad(i)}</button>`).join('')}</div></div>
        <div><small>${tr('Minutes', 'Minutes')}</small><div class="sel-liste" data-liste="m">${minutes.map((i) => `<button type="button" class="${i === m ? 'choisi' : ''}" data-action="sel-minute" data-valeur="${i}">${pad(i)}</button>`).join('')}</div></div></div>
      <div class="sel-pied"><span class="sel-astuce">${tr('Choisis l\'heure puis les minutes', 'Pick the hour then the minutes')}</span><button type="button" class="bouton petit" data-action="sel-fermer">OK</button></div>`;
    $$('.sel-liste', o.el).forEach((liste) => { const c = $('.choisi', liste); if (c) liste.scrollTo({ top: c.offsetTop - liste.clientHeight / 2 + c.offsetHeight / 2, behavior: 'instant' }); });
  }
}

// ---------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------
document.addEventListener('click', async (e) => {
  const cible = e.target.closest('[data-action]');
  const menu = $('#menu-deroulant');
  if (menu && !e.target.closest('.menu-utilisateur')) menu.classList.remove('ouvert');
  if (selecteurOuvert && !e.target.closest('.popover-selecteur') && !e.target.closest('[data-action="ouvrir-selecteur"]')) fermerSelecteur();
  if (e.target.id === 'voile') { fermerTiroir(); fermerFenetre(); return; }
  if (!cible) return;
  const a = cible.dataset.action;
  const b = etat.brouillon;
  switch (a) {
    case 'menu': $('#menu-deroulant').classList.toggle('ouvert'); break;
    case 'ouvrir-selecteur': ouvrirSelecteur(cible); break;
    case 'sel-mois': { const o = selecteurOuvert; const sens = Number(cible.dataset.sens); o.mois = new Date(o.mois.getFullYear(), o.mois.getMonth() + sens, 1); rendreSelecteur(sens); break; }
    case 'sel-jour': choisirValeur(cible.dataset.valeur, true); break;
    case 'sel-nombre': choisirValeur(String(Number(cible.dataset.valeur)), true); break;
    case 'sel-pas': { const d = selecteurOuvert.bouton.dataset; choisirValeur(String(Math.min(Number(d.max), Math.max(Number(d.min), Number(selecteurOuvert.input.value) + Number(cible.dataset.pas)))), false); placerSelecteur(); break; }
    case 'sel-heure': { const m = (selecteurOuvert.input.value || '09:00').split(':')[1] || '00'; choisirValeur(`${pad(Number(cible.dataset.valeur))}:${m}`, false); break; }
    case 'sel-minute': { const h = (selecteurOuvert.input.value || '09:00').split(':')[0]; choisirValeur(`${h}:${pad(Number(cible.dataset.valeur))}`, true); break; }
    case 'sel-fermer': fermerSelecteur(); break;
    case 'deconnexion': await donnees.deconnexion(); etat.session = null; etat.courant = null; await chargerUtilisateur(); toast(tr('À bientôt !', 'See you soon!')); location.hash = '#/connexion'; break;
    case 'aller': location.hash = cible.dataset.cible; break;
    case 'oeil': { const champ = cible.parentElement.querySelector('input'); champ.type = champ.type === 'password' ? 'text' : 'password'; break; }
    case 'fermer-fenetre': fermerFenetre(); break;
    case 'fermer-tiroir': fermerTiroir(); break;
    case 'copier': try { await navigator.clipboard.writeText(cible.dataset.texte); toast(tr('Copié dans le presse-papiers', 'Copied to clipboard')); } catch (er) { toast(cible.dataset.texte); } break;
    // Assistant
    case 'abandonner': etat.brouillon = null; break;
    case 'choisir-sport':
      b.sport = cible.dataset.sport;
      b.departageElim = (DEPARTAGES_ELIM[b.sport][0] || ['prolongations_tab'])[0];
      b.etape = 2; rafraichirAssistant(); focusAssistant(); break;
    case 'brouillon': {
      const v = cible.dataset.valeur;
      b[cible.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v;
      rafraichirAssistant(); break;
    }
    case 'etape': {
      const sens = Number(cible.dataset.sens);
      if (sens > 0 && b.etape === 2 && (!b.nom.trim() || !b.date)) { $('#erreur-assistant').textContent = tr('Indique le nom et la date du tournoi.', 'Enter the tournament name and date.'); return; }
      b.etape = Math.min(4, Math.max(1, b.etape + sens)); rafraichirAssistant(); focusAssistant(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    }
    case 'pas': {
      const champ = cible.dataset.champ; const min = Number(cible.dataset.min); const max = Number(cible.dataset.max);
      if (champ === 'poulesRegen') { const c = etat.courant; etat.poulesRegen = Math.min(max, Math.max(min, (etat.poulesRegen ?? Math.max(1, c.poules.length || 2)) + Number(cible.dataset.pas))); rendreOnglet(); break; }
      b[champ] = Math.min(max, Math.max(min, b[champ] + Number(cible.dataset.pas)));
      rafraichirAssistant(); break;
    }
    case 'basculer': b[cible.dataset.champ] = !b[cible.dataset.champ]; rafraichirAssistant(); break;
    case 'retirer-brouillon': b.equipes.splice(Number(cible.dataset.index), 1); rafraichirAssistant(); $('#nouvelle-equipe')?.focus(); break;
    case 'coller-equipes':
      ouvrirFenetre(`<h2>${tr('Coller une liste', 'Paste a list')}</h2><p class="sous">${tr('Un nom par ligne (copié depuis un tableur, un e-mail…).', 'One name per line (from a spreadsheet, an email…).')}</p><div class="champ"><textarea id="liste-collee" placeholder="Racing Vallée&#10;FC Rivière&#10;…"></textarea></div><div class="actions-fenetre" style="justify-content:flex-end"><button class="bouton petit" data-action="valider-liste">${tr('Ajouter', 'Add')}</button></div>`, (f) => $('#liste-collee', f).focus());
      break;
    case 'valider-liste': {
      if ($('#erreur-assistant')) $('#erreur-assistant').textContent = '';
      const n =ajouterEquipesBrouillon($('#liste-collee').value.split(/\r?\n|;/));
      const message = $('#erreur-assistant')?.textContent; // garde le message rouge de la limite
      fermerFenetre(); rafraichirAssistant(); if (message) $('#erreur-assistant').textContent = message;
      if (n) toast(tr(`${n} ajouté${n > 1 ? 's' : ''}`, `${n} added`)); break;
    }
    case 'creer-tournoi': creerTournoi(cible); break;
    case 'choisir-offre': etapesOffre(cible.dataset.offre); break;
    // Tournoi
    case 'vue-matchs': etat.vueMatchs = cible.dataset.valeur; rendreOnglet(); break;
    case 'saisir': ouvrirSaisie(cible.dataset.match); break;
    case 'score': {
      const cle = cible.dataset.cle;
      saisie[cle] = Math.max(0, saisie[cle] + Number(cible.dataset.pas));
      const champ = $(`#score-${cle.toLowerCase()}`); champ.value = saisie[cle];
      champ.classList.remove('bump'); void champ.offsetWidth; champ.classList.add('bump');
      $('#erreur-score').textContent = '';
      if (cle === 'a' || cle === 'b') majZoneTab();
      break;
    }
    case 'statut-saisie':
      saisie.statut = cible.dataset.valeur;
      $$('[data-action="statut-saisie"]').forEach((b) => b.classList.toggle('actif', b === cible));
      $('#aide-statut').hidden = saisie.statut !== 'en_cours';
      $('#erreur-score').textContent = '';
      majZoneTab();
      break;
    case 'bonus': saisie[cible.dataset.cle] = saisie[cible.dataset.cle] ? 0 : 1; cible.setAttribute('aria-checked', String(Boolean(saisie[cible.dataset.cle]))); break;
    case 'effacer-score':
      if (await confirmer({ titre: tr('Effacer le résultat ?', 'Clear the result?'), texte: tr('Le match repassera « à venir », pour tout le monde.', 'The match will go back to “upcoming”, for everyone.'), bouton: tr('Effacer', 'Clear'), danger: true })) {
        try { const id = saisie?.m.id; fermerTiroir(); await donnees.supprimerResultat(id); toast(tr('Résultat effacé', 'Result cleared')); await rechargerCourant(false); } catch (er) { toast(messageErreur(er), 'erreur'); }
      }
      break;
    case 'phase-finale': phaseFinale(cible); break;
    case 'tour-suivant': tourSuivant(cible); break;
    case 'qr': ouvrirQR(); break;
    case 'imprimer-qr': {
      const img = $('#qr-grand img, #qr-grand canvas'); const t = etat.courant.tournoi;
      const src = img ? (img.tagName === 'CANVAS' ? img.toDataURL() : img.src) : '';
      imprimer(`<!doctype html><html><head><meta charset="utf-8">${stylesImpression}<style>body{text-align:center;padding-top:40px}img{width:360px;height:360px}.code{font-family:'Bebas Neue';font-size:64px;letter-spacing:.25em;margin:10px 0}</style></head><body><h1>${esc(t.nom)}</h1><p class="meta">${tr('Scanne pour suivre le tournoi en direct', 'Scan to follow the tournament live')}</p><img src="${src}" alt=""><p class="code">${esc(String(t.code_acces).toUpperCase())}</p><p class="pied">${esc(lienSuivi(t.code_acces))}</p></body></html>`);
      break;
    }
    case 'coorgs': ouvrirCoOrganisateurs(); break;
    case 'pdf': exporterPDF(); break;
    case 'droit': {
      const val = cible.getAttribute('aria-checked') !== 'true';
      cible.setAttribute('aria-checked', String(val));
      try { await donnees.majDroit(etat.courant.tournoi.id, cible.dataset.user, cible.dataset.champ, val); } catch (er) { cible.setAttribute('aria-checked', String(!val)); toast(messageErreur(er), 'erreur'); }
      break;
    }
    case 'retirer-coorg':
      try { await donnees.retirerCoOrganisateur(etat.courant.tournoi.id, cible.dataset.user); toast(tr('Co-organisateur retiré', 'Co-organizer removed')); ouvrirCoOrganisateurs(); } catch (er) { toast(messageErreur(er), 'erreur'); }
      break;
    case 'supprimer-equipe': {
      const c = etat.courant; const eq = c.equipes.find((x) => x.id === cible.dataset.equipe);
      // Phase à élimination directe déjà lancée : retirer l'équipe casserait le tableau
      if (c.matchs.some((m) => !estPhaseDePoule(m.phase))) {
        await confirmer({ titre: tr('Retrait impossible pour l\'instant', 'Can\'t remove it right now'), texte: tr(`La phase à élimination directe a commencé : retirer ${eq.nom} casserait le tableau. Pour la retirer, régénère d'abord le calendrier (les résultats saisis seront effacés).`, `The knockout stage has started: removing ${eq.nom} would break the bracket. To remove it, regenerate the schedule first (results entered will be cleared).`), bouton: tr('Compris', 'Got it') });
        break;
      }
      const ok = !c.matchs.length || await confirmer({ titre: tr(`Retirer ${eq.nom} ?`, `Remove ${eq.nom}?`), texte: tr('Ses matchs et leurs résultats seront aussi supprimés.', 'Their matches and results will be deleted too.'), bouton: tr('Retirer', 'Remove'), danger: true });
      if (!ok) break;
      try { await donnees.supprimerEquipe(eq.id); toast(tr('Retiré', 'Removed')); await rechargerCourant(false); } catch (er) { toast(messageErreur(er), 'erreur'); }
      break;
    }
    case 'regenerer': {
      const c = etat.courant;
      if (c.matchs.length && !await confirmer({ titre: tr('Régénérer le calendrier ?', 'Regenerate the schedule?'), texte: tr('Tous les matchs et résultats actuels seront supprimés et remplacés par un nouveau tirage.', 'All current matches and results will be deleted and replaced by a new draw.'), bouton: tr('Régénérer', 'Regenerate'), danger: true })) break;
      cible.disabled = true;
      try {
        await donnees.viderCalendrier(c.tournoi.id);
        await genererLesMatchs(c.tournoi, c.equipes, etat.poulesRegen ?? Math.max(1, c.poules.length || 2));
        toast(tr('Calendrier généré', 'Schedule generated'));
        await rechargerCourant(true);
        location.hash = `#/tournoi/${c.tournoi.id}/matchs`;
      } catch (er) { toast(messageErreur(er), 'erreur'); cible.disabled = false; }
      break;
    }
    case 'basculer-reglage': {
      const actif = cible.getAttribute('aria-checked') !== 'true';
      cible.setAttribute('aria-checked', String(actif));
      if (cible.dataset.reglage === 'pause_dejeuner') {
        const zone = $('#zone-pause');
        if (zone) { zone.classList.toggle('verrouille', !actif); $$('.selecteur-champ', zone).forEach((bt) => { bt.disabled = !actif; }); }
        if (!actif && selecteurOuvert && zone?.contains(selecteurOuvert.bouton)) fermerSelecteur();
      }
      break;
    }
    case 'supprimer-tournoi': {
      const t = etat.courant.tournoi;
      if (!await confirmer({ titre: tr('Supprimer le tournoi ?', 'Delete the tournament?'), texte: tr('Action définitive, pour tout le monde (spectateurs et co-organisateurs compris).', 'Permanent, for everyone (spectators and co-organizers included).'), bouton: tr('Supprimer définitivement', 'Delete permanently'), danger: true, saisie: tr('SUPPRIMER', 'DELETE') })) break;
      try { await donnees.supprimerTournoi(t.id); etat.courant = null; etat.tournois = null; toast(tr('Tournoi supprimé', 'Tournament deleted')); location.hash = '#/'; } catch (er) { toast(messageErreur(er), 'erreur'); }
      break;
    }
    case 'onglet-suivi': e.preventDefault(); etat.ongletSuivi = cible.dataset.onglet; rendreSuivi(); break;
    case 'retirer-photo':
      if (!await confirmer({ titre: tr('Retirer ta photo ?', 'Remove your photo?'), texte: tr('Tes initiales s\'afficheront à la place.', 'Your initials will be shown instead.'), bouton: tr('Retirer', 'Remove'), danger: true })) break;
      try { await donnees.supprimerPhoto(uid()); await chargerUtilisateur(); toast(tr('Photo retirée', 'Photo removed')); vueProfil(); } catch (er) { toast(messageErreur(er), 'erreur'); }
      break;
    case 'supprimer-compte':
      if (!await confirmer({ titre: tr('Supprimer ton compte ?', 'Delete your account?'), texte: tr('Tes tournois, équipes, résultats et ta photo seront supprimés définitivement. Cette action est irréversible.', 'Your tournaments, teams, results and photo will be permanently deleted. This cannot be undone.'), bouton: tr('Supprimer mon compte', 'Delete my account'), danger: true, saisie: tr('SUPPRIMER', 'DELETE') })) break;
      try { await donnees.supprimerMonCompte(uid()); etat.session = null; toast(tr('Compte supprimé', 'Account deleted')); location.hash = '#/connexion'; } catch (er) { toast(messageErreur(er), 'erreur'); }
      break;
    default: break;
  }
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  e.preventDefault();
  if (f.id === 'form-auth') { soumettreAuth(f); return; }
  if (f.id === 'form-rejoindre') { rejoindreAvecCode($('#code-invitation', f).value, $('#erreur-rejoindre')); return; }
  if (f.id === 'form-equipe') {
    const champ = $('#nouvelle-equipe'); const nom = champ.value.trim();
    if (ajouterEquipesBrouillon([champ.value])) { rafraichirAssistant(); $('#nouvelle-equipe').focus(); } else {
      if (nom && etat.brouillon.equipes.some((e) => e.toLowerCase() === nom.toLowerCase())) $('#erreur-assistant').textContent = tr(`« ${nom} » est déjà dans la liste.`, `“${nom}” is already in the list.`);
      champ.select();
    }
    return;
  }
  if (f.id === 'form-score') { enregistrerScore($('button[type=submit]', f)); return; }
  if (f.id === 'form-ajout-equipe') {
    const c = etat.courant; const champ = $('#ajout-equipe'); const nom = champ.value.trim();
    if (!nom) return;
    if (c.equipes.some((e) => e.nom.toLowerCase() === nom.toLowerCase())) { toast(tr(`« ${nom} » est déjà dans le tournoi.`, `“${nom}” is already in the tournament.`), 'erreur'); champ.select(); return; }
    if (c.equipes.length >= LIMITE_GRATUITE && !debloque(c.tournoi)) { toast(messageErreur({ code: 'OLY01' }), 'erreur'); fenetreOffres(); return; }
    try { await donnees.insererEquipes([{ tournoi_id: c.tournoi.id, nom }]); champ.value = ''; await rechargerCourant(false); $('#ajout-equipe')?.focus(); toast(tr(`${nom} ajouté`, `${nom} added`)); } catch (er) { toast(messageErreur(er), 'erreur'); if (er.code === 'OLY01') fenetreOffres(); }
    return;
  }
  if (f.id === 'form-reglages') {
    const t = etat.courant.tournoi;
    const v = (cle) => $(`[data-reglage="${cle}"]`, f);
    const nb = (cle, defaut) => (v(cle) ? Math.max(0, parseInt(v(cle).value, 10) || 0) : defaut);
    const bascule = (cle, defaut) => (v(cle) ? v(cle).getAttribute('aria-checked') === 'true' : defaut);
    const miTemps = t.sport !== 'tennis' ? nb('duree_mi_temps', 0) : 0;
    const pauseDej = bascule('pause_dejeuner', t.pause_dejeuner);
    const champs = {
      nom: v('nom').value.trim() || t.nom, date_debut: v('date_debut').value || t.date_debut,
      nombre_terrains: Math.max(1, nb('nombre_terrains', t.nombre_terrains)), heure_premier_match: v('heure_premier_match').value || '09:00',
      duree_match: Math.max(1, nb('duree_match', t.duree_match)), temps_pause: nb('temps_pause', t.temps_pause), mi_temps: miTemps > 0, duree_mi_temps: miTemps > 0 ? miTemps : null,
      pause_dejeuner: pauseDej, heure_debut_pause: pauseDej ? v('heure_debut_pause').value : null, heure_fin_pause: pauseDej ? v('heure_fin_pause').value : null,
      nombre_qualifies_par_poule: Math.max(1, nb('nombre_qualifies_par_poule', t.nombre_qualifies_par_poule)),
      match_troisieme_place: bascule('match_troisieme_place', t.match_troisieme_place), points_bonus: bascule('points_bonus', t.points_bonus),
      sets_gagnants: Math.min(3, Math.max(1, nb('sets_gagnants', t.sets_gagnants))),
    };
    try { await donnees.majTournoi(t.id, champs); toast(tr('Réglages enregistrés', 'Settings saved')); await rechargerCourant(false); const zone = $('#page-tournoi > .entete-tournoi'); if (zone) { const tmp = document.createElement('div'); tmp.innerHTML = htmlEnteteTournoi(etat.onglet); zone.replaceWith(tmp.firstElementChild); abonnerTempsReel(t.id); } } catch (er) { $('#erreur-reglages').textContent = messageErreur(er); }
    return;
  }
  if (f.id === 'form-profil') {
    const champs = { prenom: $('#p-prenom').value.trim(), nom: $('#p-nom').value.trim(), club: $('#p-club').value.trim() || null };
    try { await donnees.majProfil(uid(), champs); await chargerUtilisateur(); toast(tr('Profil enregistré', 'Profile saved')); vueProfil(); } catch (er) { toast(messageErreur(er), 'erreur'); }
    return;
  }
  if (f.id === 'form-email') {
    const email = $('#p-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || email === etat.session.user.email) return;
    try { await donnees.changerEmail(email); toast(tr('Lien de confirmation envoyé à la nouvelle adresse', 'Confirmation link sent to the new address')); } catch (er) { toast(messageErreur(er), 'erreur'); }
    return;
  }
  if (f.id === 'form-mdp') {
    const erreur = $('#erreur-mdp-profil'); erreur.textContent = '';
    const ancien = $('#p-ancien').value; const nouveau = $('#p-nouveau').value;
    if (nouveau.length < 6) { erreur.textContent = messageErreur({ message: 'at least 6' }); return; }
    try { await donnees.connexion(etat.session.user.email, ancien); } catch (er) { erreur.textContent = tr('Mot de passe actuel incorrect.', 'Current password is wrong.'); return; }
    try { await donnees.changerMotDePasse(nouveau); f.reset(); toast(tr('Mot de passe modifié', 'Password changed')); } catch (er) { erreur.textContent = messageErreur(er); }
    return;
  }
  if (f.id === 'form-nouveau-mdp') {
    const mdp = $('#mdp', f).value;
    if (mdp.length < 6) { $('#erreur-mdp').textContent = messageErreur({ message: 'at least 6' }); return; }
    try { await donnees.changerMotDePasse(mdp); toast(tr('Mot de passe enregistré', 'Password saved')); location.hash = '#/'; } catch (er) { $('#erreur-mdp').textContent = messageErreur(er); }
  }
});

document.addEventListener('input', (e) => {
  const champ = e.target;
  if (champ.dataset.brouillon && etat.brouillon) {
    etat.brouillon[champ.dataset.brouillon] = 'nombre' in champ.dataset ? Number(champ.value) : champ.value;
    const resume = $('#resume-calendrier'); if (resume) resume.innerHTML = htmlResume();
    $('#erreur-assistant') && ($('#erreur-assistant').textContent = '');
  }
  if (champ.dataset.score && saisie) {
    saisie[champ.dataset.score] = Math.max(0, parseInt(champ.value, 10) || 0);
    if (champ.dataset.score === 'a' || champ.dataset.score === 'b') majZoneTab();
    $('#erreur-score').textContent = '';
  }
});
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'photo-profil' || !e.target.files[0]) return;
  try {
    const blob = await redimensionnerPhoto(e.target.files[0]);
    const url = await donnees.televerserPhoto(uid(), blob);
    await donnees.majProfil(uid(), { photo_url: url });
    await chargerUtilisateur(); toast(tr('Photo mise à jour', 'Photo updated')); vueProfil();
  } catch (er) { toast(messageErreur(er), 'erreur'); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (selecteurOuvert) { fermerSelecteur(); return; }
    if ($('#tiroir').classList.contains('ouvert') || $('#fenetre').classList.contains('ouvert')) { fermerTiroir(); fermerFenetre(); return; }
    if ($('#grand-ecran').classList.contains('ouvert') && etat.courant) { location.hash = `#/tournoi/${etat.courant.tournoi.id}`; return; }
    $('#menu-deroulant')?.classList.remove('ouvert');
  }
  if (e.key === 'Enter' && e.target.classList?.contains('ge-match') && e.target.dataset.match) { ouvrirSaisie(e.target.dataset.match); return; }
  if (saisie && e.target.dataset.score && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const cle = e.target.dataset.score;
    saisie[cle] = Math.max(0, saisie[cle] + (e.key === 'ArrowUp' ? 1 : -1));
    e.target.value = saisie[cle];
    e.target.classList.remove('bump'); void e.target.offsetWidth; e.target.classList.add('bump');
    if (cle === 'a' || cle === 'b') majZoneTab();
  }
});
window.addEventListener('resize', () => placerSelecteur());
window.addEventListener('scroll', () => placerSelecteur(), { passive: true });
window.addEventListener('hashchange', () => fermerSelecteur());
// Halo qui suit la souris sur les cartes de tournoi
document.addEventListener('pointermove', (e) => {
  const carte = e.target.closest?.('.carte-tournoi');
  if (!carte) return;
  const r = carte.getBoundingClientRect();
  carte.style.setProperty('--mx', `${e.clientX - r.left}px`);
  carte.style.setProperty('--my', `${e.clientY - r.top}px`);
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && $('#grand-ecran').classList.contains('ouvert') && etat.courant && !/\/ecran$/.test(location.hash)) fermerGrandEcran();
});

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
async function demarrer() {
  appliquerLangue();
  majIconeTheme();
  const params = new URLSearchParams(location.search);
  const enReinit = params.has('reinit');
  etat.session = await donnees.session();
  await chargerUtilisateur();
  donnees.surChangementAuth(async (evenement, session) => {
    const avant = Boolean(etat.session);
    etat.session = session;
    if (evenement === 'PASSWORD_RECOVERY') { location.hash = '#/nouveau-mot-de-passe'; return; }
    if (Boolean(session) !== avant) {
      await chargerUtilisateur();
      etat.tournois = null;
      if (session && /^#\/(connexion|inscription)?$/.test(location.hash || '#/')) {
        const cible = sessionStorage.getItem('apres-connexion'); sessionStorage.removeItem('apres-connexion');
        location.hash = cible || '#/';
        if (!cible || cible === location.hash) routeur();
      }
    }
  });
  if (enReinit) {
    // Retour du lien « mot de passe oublié » : session ouverte par le lien
    history.replaceState(null, '', `${location.pathname}${MODE_DEMO ? '?demo=1' : ''}#/nouveau-mot-de-passe`);
  }
  window.addEventListener('hashchange', routeur);
  routeur();
}
demarrer();
