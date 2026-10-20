/* OLYMPIAD — site vitrine et simulateur de l'app.
   Le moteur de tournoi (génération du calendrier, classement) est repris de
   lib/generation.js et lib/classement.js : mêmes règles que dans l'app.
   Le simulateur garde tout dans le navigateur (localStorage) : rien n'est
   envoyé à Supabase ni ailleurs. */
(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stockage = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
    brut(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } },
  };
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  let compteurUid = 0;
  const uid = () => Date.now().toString(36) + (compteurUid++).toString(36) + Math.random().toString(36).slice(2, 6);
  // Retour haptique (lib/haptique.js), seulement après un geste de l'utilisateur
  const vibrer = (ms = 8) => {
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* rien */ }
  };
  const pad = (n) => String(n).padStart(2, '0');
  const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function prochainSamedi() {
    const d = new Date();
    d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7));
    return isoLocal(d);
  }

  // ---------------------------------------------------------------------
  // Langue (FR / EN, comme l'app)
  // ---------------------------------------------------------------------
  let langue = stockage.brut('olympiad-langue') || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  if (langue !== 'fr' && langue !== 'en') langue = 'fr';
  const tr = (fr, en) => (langue === 'en' ? en : fr);
  const locale = () => (langue === 'en' ? 'en-GB' : 'fr-FR');

  // Textes fixes de la page en anglais ; le français est lu dans le HTML.
  const EN = {
    'nav.espace': 'Organizer area', 'fin.cta2': 'Organizer area',
    'e.sur': 'Organizer area', 'e.titre': 'Your tournament, on your computer too', 'e.intro': 'Sign in with your OLYMPIAD account and manage your tournaments from your browser. Everything syncs in real time with the app: enter a score on the computer, it shows up instantly on phones.',
    'e.l1': 'Create a tournament, add teams, generate the schedule', 'e.l2': 'Enter live scores with your keyboard', 'e.l3': 'Standings, knockouts, QR code and big screen view', 'e.l4': 'Same tournaments, same account, same plans as on your phone',
    'e.cta': 'Open the organizer area', 'e.cta2': 'Sign in', 'e.cta3': 'Try the demo', 'e.note': 'Purchases (Tournament Pass, OLYMPIAD Pro) are made in the mobile app; they are then recognized here with the same account.', 'e.ecran': 'Tap a match to enter or edit its result',
    'nav.essayer': 'Try it', 'nav.fonctions': 'Features', 'nav.sports': 'Sports', 'nav.offres': 'Plans', 'nav.aide': 'Help', 'nav.cta': 'Try it live',
    'heros.etiquette': 'Amateur sports tournaments · live', 'heros.l1': 'Run', 'heros.l2': 'your tournament.', 'heros.l3': 'Everyone follows.',
    'heros.accroche': 'OLYMPIAD builds your schedule, lets you enter scores from the sideline and shows results in real time to teams and spectators with a simple QR code. No account needed for them.',
    'tel.titre': 'U13 Spring Cup', 'tel.meta': 'Football · 8 teams', 'tel.direct': 'LIVE', 'tel.matchs': 'Matches', 'tel.classement': 'Standings',
    'heros.cta': 'Create a tournament now', 'heros.cta2': 'Watch a live tournament', 'heros.bientot': 'Coming soon on', 'heros.badge': 'Soon',
    'heros.bulle1': 'updated for 48 spectators', 'heros.bulle2': 'QR code scanned', 'heros.bulle2b': 'no account, nothing to set up',
    'comment.sur': 'On the day', 'comment.titre': 'Three steps. Zero spreadsheets.', 'comment.intro': 'From the team list to the podium, everything is handled from your phone.',
    'comment.e1t': 'Create your tournament', 'comment.e1p': 'Pick the sport, the format (groups, knockout or both) and add the teams. The schedule is generated automatically, by field and time slot.',
    'comment.e2t': 'Share the QR code', 'comment.e2p': 'Display it at the entrance or send the link: teams and spectators follow the tournament with one scan, without creating an account.',
    'comment.e3t': 'Enter the scores', 'comment.e3p': 'From the sideline, in a few taps. Standings, knockout stages and podium update live for everyone.',
    'sim.sur': 'Try it without installing anything', 'sim.titre': 'The real app, right here.',
    'sim.intro': 'This simulator runs the OLYMPIAD engine in your browser: same schedule generation, same scoring, same standings. Create your tournament, enter scores, and watch everything update.',
    'sim.missions': 'Features discovered', 'sim.demo': 'Load a demo tournament', 'sim.spectateur': 'Spectator view',
    'sim.note': 'Tip: switch to the spectator view to see the tournament as the public does: every score you enter shows up there instantly, just like on spectators’ phones. Everything stays in your browser: nothing is sent.',
    'f.sur': 'Everything is in the app', 'f.titre': 'Built for the sideline', 'f.intro': 'For clubs, associations and volunteers who run one-day tournaments. And for everyone who wants to follow.',
    'f.tous': 'All', 'f.orga': 'Organizers', 'f.public': 'Teams & spectators',
    's.sur': '5 sports', 's.titre': 'Every sport has its rules', 's.intro': 'Scoring, wording and tiebreakers adapt automatically to the chosen sport.',
    'o.sur': 'Plans', 'o.titre': 'Free to get started', 'o.intro': 'Unlock one tournament or all of them, only when you need it.',
    'o.g': 'Free', 'o.g1': 'Up to 12 teams per tournament', 'o.g2': 'Schedule, scores and live tracking', 'o.g3': 'QR code and big screen view', 'o.g4': '5 sports, knockout stages and podium', 'o.g5': 'PDF export', 'o.g6': 'Co-organizers',
    'o.p': 'Tournament Pass', 'o.pprix': 'One-time purchase, for one tournament', 'o.p1': 'Unlimited teams', 'o.p2': 'PDF export of the schedule', 'o.p3': 'Co-organizers', 'o.p4': 'No subscription',
    'o.ruban': 'For clubs', 'o.proprix': 'Monthly or yearly subscription', 'o.pro1': 'Every premium feature', 'o.pro2': 'On all your tournaments', 'o.pro3': 'Ideal for clubs that organize often', 'o.pro4': 'Cancel anytime',
    'o.gcta': 'Get started', 'o.pcta': 'Choose the Pass', 'o.procta': 'Go Pro',
    'o.mention': 'Prices are shown in the app before any purchase. Payment through the App Store or Google Play; the Pro subscription renews automatically unless cancelled at least 24 hours before the end of the period. See the <a href="conditions-utilisation.html">terms of use</a>.',
    'a.sur': 'Support', 'a.titre': 'Help', 'a.intro': 'Answers to the most frequent questions.',
    'a.q1': 'Do I need an account to follow a tournament?', 'a.r1': 'No. Teams and spectators join the tournament by scanning its QR code or typing its access code in the app. Only the organizer needs an account.',
    'a.q2': 'How do I join a tournament?', 'a.r2': 'In the app, tap “Join a tournament”, then scan the QR code shown by the organizer or type the access code they gave you.',
    'a.q3': 'Who can create an organizer account?', 'a.r3': 'Anyone aged 15 or over. The account lets you create, manage and share your tournaments.',
    'a.q4': 'How many teams can I add for free?', 'a.r4': 'Up to 12 teams (or players) per tournament. Beyond that, unlock the tournament with a Tournament Pass or upgrade to OLYMPIAD Pro.',
    'a.q5': 'Can several people enter scores?', 'a.r5': 'Yes, with a Tournament Pass or the Pro subscription: invite co-organizers from your tournament and choose for each one whether they can enter scores, manage the tournament or delete it.',
    'a.q6': 'I changed phones, how do I get my purchases back?', 'a.r6': 'Sign in with the same account, then tap “Restore purchases” in My profile or on the plans screen. A Tournament Pass bought but not applied yet can be used with “I already have an unused Tournament Pass”.',
    'a.q7': 'How do I cancel the Pro subscription?', 'a.r7': 'The subscription is managed in your App Store (iPhone) or Google Play (Android) account settings. Cancellation takes effect at the end of the period already paid.',
    'a.q8': 'How do I delete my account?', 'a.r8': 'In the app: My profile, then “Delete my account”. Your data is deleted immediately. More details on the <a href="suppression-compte.html">Delete my account</a> page.',
    'a.q9': 'Does this site’s simulator store my data?', 'a.r9': 'No. The tournament you create here stays in your browser (local storage) and is sent nowhere. For a real tournament shared with your teams, use the app.',
    'a.contactT': 'A question, a problem?', 'a.contactP': 'Email us, with the name of your tournament if your question is about it.', 'a.contactB': 'Contact support',
    'fin.titre': 'Ready for kick-off?', 'fin.p': 'OLYMPIAD is coming soon to iPhone and Android. Meanwhile, prepare your tournament right here.', 'fin.cta': 'Try the simulator',
    'pied.conf': 'Privacy policy', 'pied.cgu': 'Terms of use', 'pied.ml': 'Legal notice', 'pied.supp': 'Delete my account', 'pied.contact': 'Contact',
  };
  const FR = {};
  $$('[data-i18n]').forEach((el) => { FR[el.dataset.i18n] = el.innerHTML; });
  $$('[data-i18n-html]').forEach((el) => { FR[el.dataset.i18nHtml] = el.innerHTML; });
  $$('[data-i18n-placeholder]').forEach((el) => { FR[el.dataset.i18nPlaceholder] = el.placeholder; });

  const TITRE_FR = document.title;
  function appliquerLangue() {
    document.documentElement.lang = langue;
    document.title = langue === 'en' ? 'OLYMPIAD — Run your tournaments, followed live' : TITRE_FR;
    const dico = langue === 'en' ? EN : FR;
    $$('[data-i18n]').forEach((el) => { const v = dico[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    $$('[data-i18n-html]').forEach((el) => { const v = dico[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    $$('[data-i18n-placeholder]').forEach((el) => { const v = dico[el.dataset.i18nPlaceholder]; if (v != null) el.placeholder = v; });
    $('#bouton-langue').textContent = langue === 'fr' ? 'EN' : 'FR';
    rendreBandeau();
    rendreBento();
    rendreSports();
    rendreMissions();
    if (typeof rafraichir === 'function') rafraichir();
    rendreGrandEcran();
  }
  function changerLangue(l) {
    langue = l || (langue === 'fr' ? 'en' : 'fr');
    stockage.brut('olympiad-langue', langue);
    appliquerLangue();
  }

  // ---------------------------------------------------------------------
  // Thème (clair / sombre / auto)
  // ---------------------------------------------------------------------
  const racine = document.documentElement;
  const themeSysteme = () => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const themeEffectif = () => racine.dataset.theme || themeSysteme();
  function majIconeTheme() {
    const sombre = themeEffectif() === 'dark';
    $('.ico-lune').style.display = sombre ? 'none' : '';
    $('.ico-soleil').style.display = sombre ? '' : 'none';
    $('meta[name="theme-color"]').setAttribute('content', sombre ? '#0b0f18' : '#f2f5fb');
  }
  function choisirTheme(th) {
    if (th === 'auto') { delete racine.dataset.theme; stockage.brut('olympiad-theme', 'auto'); } else { racine.dataset.theme = th; stockage.brut('olympiad-theme', th); }
    majIconeTheme();
  }

  // ---------------------------------------------------------------------
  // Sports (lib/sports.js + vocabulaire de lib/traductions.js)
  // ---------------------------------------------------------------------
  const SPORTS = [
    { valeur: 'football', fr: 'Football', en: 'Football', v: 3, n: 1, d: 0, score: ['buts', 'goals'], diff: ['Différence de buts', 'Goal difference'], abr: [['BP', 'BC'], ['GF', 'GA']],
      elim: [['prolongations_tab', 'Prolongations puis tirs au but', 'Extra time then penalty shootout'], ['tab_direct', 'Tirs au but directs', 'Direct penalty shootout']],
      tab: ['Tirs au but', 'Penalty shootout'],
      plus: [['Prolongations et tirs au but en phase finale', 'Extra time and penalties in knockouts'], ['Mi-temps réglable', 'Adjustable half-time']] },
    { valeur: 'rugby', fr: 'Rugby', en: 'Rugby', v: 4, n: 2, d: 0, score: ['points', 'points'], diff: ['Différence de points', 'Point difference'], abr: [['PP', 'PC'], ['PF', 'PA']],
      elim: [['prolongation', 'Prolongation', 'Extra time'], ['mort_subite', 'Mort subite', 'Sudden death'], ['drop_goal', 'Drop goal', 'Drop goal']],
      tab: ['Départage', 'Tiebreak'],
      plus: [['Points bonus offensif et défensif, au choix', 'Optional offensive and losing bonus points'], ['Barème 4 / 2 / 0', '4 / 2 / 0 scoring']] },
    { valeur: 'handball', fr: 'Handball', en: 'Handball', v: 3, n: 1, d: 0, score: ['buts', 'goals'], diff: ['Différence de buts', 'Goal difference'], abr: [['BP', 'BC'], ['GF', 'GA']],
      elim: [['prolongations_tab', 'Prolongations puis tirs au but', 'Extra time then penalty shootout'], ['tab_direct', 'Tirs au but directs', 'Direct penalty shootout']],
      tab: ['Tirs au but', 'Penalty shootout'],
      plus: [['Prolongations et jets de 7 m', 'Extra time and 7 m throws'], ['Matchs courts enchaînés sur plusieurs terrains', 'Short matches across several courts']] },
    { valeur: 'basketball', fr: 'Basket-ball', en: 'Basketball', v: 2, n: 1, d: 0, score: ['points', 'points'], diff: ['Différence de points', 'Point difference'], abr: [['PP', 'PC'], ['PF', 'PA']],
      elim: [['prolongation_tirs_panier', 'Prolongation puis tirs au panier', 'Extra time then free-throw shootout'], ['prolongation_vainqueur', 'Prolongation jusqu\'à avoir un vainqueur', 'Extra time until a winner'], ['tirs_panier_direct', 'Tirs au panier directs', 'Direct free-throw shootout']],
      tab: ['Tirs au panier', 'Free-throw shootout'],
      plus: [['Barème 2 / 1 / 0', '2 / 1 / 0 scoring'], ['Tirs au panier en phase finale', 'Free-throw shootout in knockouts']] },
    { valeur: 'tennis', fr: 'Tennis', en: 'Tennis', v: 3, n: 1, d: 0, score: ['sets', 'sets'], diff: ['Différence de sets', 'Set difference'], abr: [['SP', 'SC'], ['SF', 'SA']],
      elim: [], tab: ['', ''],
      plus: [['Simple ou double', 'Singles or doubles'], ['2 ou 3 sets gagnants', 'Best of 3 or best of 5']] },
  ];
  const infosSport = (v) => SPORTS.find((s) => s.valeur === v) || SPORTS[0];
  const nomSport = (v) => { const s = infosSport(v); return langue === 'en' ? s.en : s.fr; };
  const iL = (paire) => (langue === 'en' ? paire[1] : paire[0]);

  // ---------------------------------------------------------------------
  // Moteur de tournoi (repris de lib/generation.js)
  // ---------------------------------------------------------------------
  function melanger(tableau) {
    const copie = [...tableau];
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }
  function calculerCreneaux(nombreCreneaux, reglages) {
    const { dateDebut, heureDebut, dureeCreneauMinutes, dureeMatchMinutes, pauseDejeuner, heureDebutPause, heureFinPause, horaireDepart } = reglages;
    let curseur;
    if (horaireDepart) {
      curseur = new Date(horaireDepart);
    } else {
      const [h, m] = heureDebut.split(':').map(Number);
      curseur = new Date(`${dateDebut}T00:00:00`);
      curseur.setHours(h, m, 0, 0);
    }
    let debutPause = null;
    let finPause = null;
    if (pauseDejeuner && heureDebutPause && heureFinPause) {
      const [hd, md] = heureDebutPause.split(':').map(Number);
      const [hf, mf] = heureFinPause.split(':').map(Number);
      debutPause = new Date(`${dateDebut}T00:00:00`); debutPause.setHours(hd, md, 0, 0);
      finPause = new Date(`${dateDebut}T00:00:00`); finPause.setHours(hf, mf, 0, 0);
    }
    const creneaux = [];
    for (let i = 0; i < nombreCreneaux; i++) {
      if (debutPause && curseur < finPause) {
        const finDuMatch = new Date(curseur.getTime() + dureeMatchMinutes * 60000);
        if (finDuMatch >= debutPause) curseur = new Date(finPause);
      }
      creneaux.push(new Date(curseur));
      curseur = new Date(curseur.getTime() + dureeCreneauMinutes * 60000);
    }
    return creneaux;
  }
  function repartirEnPoules(equipes, nombrePoules) {
    const melangees = melanger(equipes);
    const poules = Array.from({ length: nombrePoules }, () => []);
    melangees.forEach((e, i) => { poules[i % nombrePoules].push(e); });
    return poules;
  }
  function journeesRoundRobin(equipes, nomPoule) {
    const liste = melanger(equipes);
    if (liste.length % 2 !== 0) liste.push(null);
    const n = liste.length;
    const journees = [];
    let courant = liste;
    for (let j = 0; j < n - 1; j++) {
      const rencontres = [];
      for (let i = 0; i < n / 2; i++) {
        const a = courant[i];
        const b = courant[n - 1 - i];
        if (a && b) rencontres.push({ equipeA: a, equipeB: b, phase: nomPoule });
      }
      journees.push(melanger(rencontres));
      courant = [courant[0], courant[n - 1], ...courant.slice(1, n - 1)];
    }
    return journees;
  }
  function assignerCreneauxEtTerrains(rencontres, reglages) {
    if (rencontres.length === 0) return [];
    const { nombreTerrains } = reglages;
    const creneaux = calculerCreneaux(Math.ceil(rencontres.length / nombreTerrains), reglages);
    return rencontres.map((r, index) => ({
      id: uid(), equipe_a_id: r.equipeA.id, equipe_b_id: r.equipeB.id, phase: r.phase,
      terrain: String((index % nombreTerrains) + 1),
      horaire: creneaux[Math.floor(index / nombreTerrains)].toISOString(),
    }));
  }
  function construireMatchsExempts(equipes, phase, reglages) {
    if (equipes.length === 0) return [];
    const horaire = calculerCreneaux(1, reglages)[0].toISOString();
    return equipes.map((e) => ({ id: uid(), equipe_a_id: e.id, equipe_b_id: null, phase, terrain: null, horaire }));
  }
  // Plan = liste de créneaux, chacun = rencontres jouées en même temps (une par terrain)
  function planParJournees(journeesParPoule, nbTerrains) {
    const nbJournees = Math.max(0, ...journeesParPoule.map((j) => j.length));
    const plan = [];
    let dernierCreneau = new Set();
    for (let j = 0; j < nbJournees; j++) {
      const rencontres = journeesParPoule.flatMap((journees) => journees[j] || []);
      if (rencontres.length === 0) continue;
      const conflit = (r) => dernierCreneau.has(r.equipeA.id) || dernierCreneau.has(r.equipeB.id);
      const ordonnees = [...rencontres.filter((r) => !conflit(r)), ...rencontres.filter(conflit)];
      for (let i = 0; i < ordonnees.length; i += nbTerrains) plan.push(ordonnees.slice(i, i + nbTerrains));
      dernierCreneau = new Set(plan[plan.length - 1].flatMap((r) => [r.equipeA.id, r.equipeB.id]));
    }
    return plan;
  }
  // Remplit chaque créneau avec autant de matchs que de terrains (équipes reposées d'abord, jamais 3 matchs d'affilée si possible)
  function planAuPlusTot(rencontres, nbTerrains, remplir) {
    const restantes = rencontres.map((r) => ({ r, cle: r.journee + Math.random() * 0.9 })).sort((x, y) => x.cle - y.cle).map(({ r }) => r);
    const plan = [];
    let prec = new Set();
    let avantPrec = new Set();
    while (restantes.length) {
      const occupees = new Set();
      const creneau = [];
      const piocher = (accepte) => {
        for (let i = 0; i < restantes.length && creneau.length < nbTerrains; i++) {
          const r = restantes[i];
          if (occupees.has(r.equipeA.id) || occupees.has(r.equipeB.id) || !accepte(r)) continue;
          creneau.push(r); occupees.add(r.equipeA.id); occupees.add(r.equipeB.id); restantes.splice(i, 1); i--;
        }
      };
      const reposee = (id) => !prec.has(id);
      const pasTrois = (id) => !(prec.has(id) && avantPrec.has(id));
      piocher((r) => reposee(r.equipeA.id) && reposee(r.equipeB.id));
      if (remplir || creneau.length === 0) piocher((r) => pasTrois(r.equipeA.id) && pasTrois(r.equipeB.id));
      if (creneau.length === 0) piocher(() => true);
      plan.push(creneau); avantPrec = prec; prec = occupees;
    }
    return plan;
  }
  // Un créneau de plus ou un 3e match d'affilée = 10 enchaînements de 2 matchs
  function coutPlan(plan) {
    let enchainements = 0;
    let troisDeSuite = 0;
    const equipes = (c) => new Set(c.flatMap((r) => [r.equipeA.id, r.equipeB.id]));
    for (let i = 1; i < plan.length; i++) {
      const prec = equipes(plan[i - 1]);
      const avantPrec = i > 1 ? equipes(plan[i - 2]) : new Set();
      for (const id of equipes(plan[i])) if (prec.has(id)) { enchainements++; if (avantPrec.has(id)) troisDeSuite++; }
    }
    return (plan.length + troisDeSuite) * 10 + enchainements;
  }
  function genererCalendrierPoules(poules, reglages) {
    const { nombreTerrains } = reglages;
    const journeesParPoule = poules.map(({ nom, equipes }) => journeesRoundRobin(equipes, nom));
    const rencontres = journeesParPoule.flatMap((journees) => journees.flatMap((duJour, journee) => duJour.map((r) => ({ ...r, journee }))));
    if (rencontres.length === 0) return [];
    let plan = planParJournees(journeesParPoule, nombreTerrains);
    let cout = coutPlan(plan);
    if (nombreTerrains > 1) {
      for (let essai = 0; essai < 200; essai++) {
        const p = planAuPlusTot(rencontres, nombreTerrains, essai % 2 === 0);
        const c = coutPlan(p);
        if (c < cout) { plan = p; cout = c; }
      }
    }
    const creneaux = calculerCreneaux(plan.length, reglages);
    return plan.flatMap((creneau, index) => creneau.map((r, terrain) => ({
      id: uid(), equipe_a_id: r.equipeA.id, equipe_b_id: r.equipeB.id, phase: r.phase,
      terrain: String(terrain + 1), horaire: creneaux[index].toISOString(),
    })));
  }
  const NOMS_TOUR = { 2: 'Finale', 4: 'Demi-finale', 8: 'Quart de finale', 16: 'Huitième de finale', 32: 'Seizième de finale' };
  const NOM_3E = 'Match pour la 3e place';
  const estPhaseDePoule = (nom) => nom.startsWith('Poule ');
  function prochainePuissanceDeDeux(n) { let p = 1; while (p < n) p *= 2; return p; }
  const nomTour = (n) => NOMS_TOUR[n] || `Tour à ${n} équipes`;
  // Têtes de série : la meilleure contre la moins bonne, exempts aux premières,
  // et pas deux équipes de la même poule au premier tour quand c'est évitable
  function genererTourAPartirDeListe(ordonnees, reglages, pouleDe = null) {
    const taille = prochainePuissanceDeDeux(ordonnees.length);
    const nbExempts = taille - ordonnees.length;
    const nom = nomTour(taille);
    const exemptees = ordonnees.slice(0, nbExempts);
    const joueuses = ordonnees.slice(nbExempts);
    const paires = [];
    for (let i = 0; i < joueuses.length / 2; i++) paires.push([joueuses[i], joueuses[joueuses.length - 1 - i]]);
    if (pouleDe) eviterMemePoule(paires, pouleDe);
    const rencontres = paires.map(([equipeA, equipeB]) => ({ equipeA, equipeB, phase: nom }));
    return [...construireMatchsExempts(exemptees, nom, reglages), ...assignerCreneauxEtTerrains(rencontres, reglages)];
  }
  function eviterMemePoule(paires, pouleDe) {
    const memePoule = (a, b) => pouleDe.has(a.id) && pouleDe.get(a.id) === pouleDe.get(b.id);
    for (let i = 0; i < paires.length; i++) {
      if (!memePoule(paires[i][0], paires[i][1])) continue;
      const autres = paires.map((_, j) => j).filter((j) => j !== i).sort((x, y) => Math.abs(x - i) - Math.abs(y - i));
      for (const j of autres) {
        if (!memePoule(paires[i][0], paires[j][1]) && !memePoule(paires[j][0], paires[i][1])) { [paires[i][1], paires[j][1]] = [paires[j][1], paires[i][1]]; break; }
      }
    }
  }
  function qualifiesParTeteDeSerie(poulesAvecClassement, nbQualifies) {
    const qualifies = [];
    for (let rang = 0; rang < nbQualifies; rang++) {
      const palier = poulesAvecClassement.map((p) => p.classement[rang]).filter(Boolean)
        .sort((a, b) => b.points - a.points || b.diff_buts - a.diff_buts || b.buts_pour - a.buts_pour)
        .map((item) => item.equipe);
      qualifies.push(...palier);
    }
    return qualifies;
  }
  function genererPhaseFinaleDepuisPoules(poulesAvecClassement, nbQualifies, reglages) {
    const pouleDe = new Map();
    poulesAvecClassement.forEach((p, index) => p.classement.forEach((item) => pouleDe.set(item.equipe.id, index)));
    return genererTourAPartirDeListe(qualifiesParTeteDeSerie(poulesAvecClassement, nbQualifies), reglages, pouleDe);
  }
  // Gagnants d'un tour rangés par tête de série (ordre des matchs sans poules)
  function rangerParTeteDeSerie(gagnants, tetesDeSerie) {
    if (!tetesDeSerie.length) return gagnants;
    const rang = new Map(tetesDeSerie.map((e, i) => [e.id, i]));
    const rangDe = (id) => (rang.has(id) ? rang.get(id) : Infinity);
    return gagnants.map((g, ordre) => ({ g, ordre })).sort((x, y) => rangDe(x.g.id) - rangDe(y.g.id) || x.ordre - y.ordre).map(({ g }) => g);
  }
  function idEquipeGagnante(match) {
    if (!match.equipe_b_id) return match.equipe_a_id;
    const r = match.resultat;
    if (r.score_a !== r.score_b) return r.score_a > r.score_b ? match.equipe_a_id : match.equipe_b_id;
    return (r.score_tab_a || 0) > (r.score_tab_b || 0) ? match.equipe_a_id : match.equipe_b_id;
  }
  function grouperParPhase(matchs) {
    const g = {};
    for (const m of matchs) { if (!g[m.phase]) g[m.phase] = []; g[m.phase].push(m); }
    return Object.entries(g).map(([nom, ms]) => ({ nom, matchs: [...ms].sort((x, y) => new Date(x.horaire) - new Date(y.horaire) || (x.terrain || 0) - (y.terrain || 0)) }));
  }
  function grouperParTerrain(matchs) {
    const g = {};
    for (const m of matchs) { const cle = m.terrain || '~'; if (!g[cle]) g[cle] = []; g[cle].push(m); }
    return Object.keys(g).sort((a, b) => (a === '~') - (b === '~') || Number(a) - Number(b)).map((cle) => ({
      nom: cle === '~' ? tr('Sans terrain (exempts)', 'No field (byes)') : tr(`Terrain ${cle}`, `Field ${cle}`),
      matchs: [...g[cle]].sort((x, y) => new Date(x.horaire) - new Date(y.horaire)),
    }));
  }

  // lib/classement.js
  function calculerClassement(equipes, matchs, resultats, critere, sport, compterEnCours = false) {
    const { v, n, d } = infosSport(sport);
    const stats = {};
    for (const e of equipes) stats[e.id] = { equipe: e, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, buts_pour: 0, buts_contre: 0, confrontations: {} };
    for (const m of matchs) {
      const r = resultats.find((x) => x.match_id === m.id);
      if (!r || (r.statut !== 'termine' && !(compterEnCours && r.statut === 'en_cours'))) continue;
      const a = stats[m.equipe_a_id];
      const b = stats[m.equipe_b_id];
      if (!a || !b) continue;
      a.joues++; b.joues++;
      a.buts_pour += r.score_a; a.buts_contre += r.score_b;
      b.buts_pour += r.score_b; b.buts_contre += r.score_a;
      if (r.score_a > r.score_b) { a.points += v; b.points += d; a.victoires++; b.defaites++; }
      else if (r.score_a < r.score_b) { b.points += v; a.points += d; b.victoires++; a.defaites++; }
      else { a.points += n; b.points += n; a.nuls++; b.nuls++; }
      a.points += r.bonus_a || 0;
      b.points += r.bonus_b || 0;
      a.confrontations[b.equipe.id] = r.score_a - r.score_b;
      b.confrontations[a.equipe.id] = r.score_b - r.score_a;
    }
    const classement = Object.values(stats).map((s) => ({ ...s, diff_buts: s.buts_pour - s.buts_contre }));
    classement.sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      if (critere === 'confrontation_directe') {
        const f = x.confrontations[y.equipe.id];
        if (f !== undefined && f !== 0) return -f;
      }
      if (y.diff_buts !== x.diff_buts) return y.diff_buts - x.diff_buts;
      return y.buts_pour - x.buts_pour;
    });
    return classement;
  }

  // lib/codeAcces.js
  function genererCodeAcces() {
    const c = 'abcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += c[Math.floor(Math.random() * c.length)];
    return code;
  }

  // lib/phases.js
  function libellePhase(nom) {
    if (langue === 'fr' || !nom) return nom;
    const p = nom.match(/^Poule ([A-Z])$/);
    if (p) return `Group ${p[1]}`;
    const t = { Finale: 'Final', 'Demi-finale': 'Semi-final', 'Quart de finale': 'Quarter-final', 'Huitième de finale': 'Round of 16', 'Seizième de finale': 'Round of 32', [NOM_3E]: 'Third-place match' };
    if (t[nom]) return t[nom];
    const tour = nom.match(/^Tour à (\d+) équipes$/);
    if (tour) return `Round of ${tour[1]}`;
    return nom;
  }

  // ---------------------------------------------------------------------
  // État du simulateur
  // ---------------------------------------------------------------------
  const CLE = 'olympiad-sim-v1';
  const LIMITE_GRATUITE = 12;
  const EXEMPLES = ['Racing Vallée', 'FC Rivière', 'AS Montagne', 'Étoile Sud', 'US Collines', 'Stade Bocage', 'Olympique Lac', 'Les Aigles', 'Union Plateau', 'Sporting Port', 'AJ Forêt', 'Entente Val', 'Red Star Bourg', 'CS Marais'];
  const EXEMPLES_TENNIS = ['L. Martin', 'C. Bernard', 'J. Petit', 'M. Durand', 'A. Leroy', 'S. Moreau', 'N. Simon', 'E. Laurent', 'H. Michel', 'T. Garcia', 'R. David', 'P. Bertrand'];
  const sauve = stockage.get(CLE) || {};
  const S = {
    tournoi: sauve.tournoi || null,
    brouillon: sauve.brouillon || null,
    pro: !!sauve.pro,
    passEnAttente: !!sauve.passEnAttente,
    profil: sauve.profil || { prenom: '', nom: '', club: '', email: '', photo: null },
    connecte: !!sauve.connecte,
    suivis: sauve.suivis || [],
    decouvertes: sauve.decouvertes || [],
    vue: sauve.vue || 'poule',
    onglet: 'matchs',
    ongletSuivi: 'classement',
    role: 'orga',
  };
  function enregistrer() {
    stockage.set(CLE, {
      tournoi: S.tournoi, brouillon: S.brouillon, pro: S.pro, passEnAttente: S.passEnAttente,
      profil: { ...S.profil, photo: S.profil.photo && S.profil.photo.length < 400000 ? S.profil.photo : null },
      connecte: S.connecte, suivis: S.suivis, decouvertes: S.decouvertes, vue: S.vue,
    });
  }

  // Temps réel entre onglets (comme Supabase Realtime dans l'app)
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel('olympiad-demo') : null;
  let matchsMisAJour = new Set();
  function diffuser() { if (canal) canal.postMessage({ type: 'tournoi', tournoi: S.tournoi }); }
  function recevoirTournoi(nouveau) {
    if (!nouveau) return;
    const avant = S.tournoi;
    if (avant && avant.code === nouveau.code) {
      for (const r of nouveau.resultats) {
        const ancien = avant.resultats.find((x) => x.match_id === r.match_id);
        if (!ancien || JSON.stringify(ancien) !== JSON.stringify(r)) matchsMisAJour.add(r.match_id);
      }
    }
    S.tournoi = nouveau;
    rafraichir();
    rendreGrandEcran();
    matchsMisAJour = new Set();
  }
  if (canal) canal.onmessage = (e) => { if (e.data && e.data.type === 'tournoi') recevoirTournoi(e.data.tournoi); };
  else window.addEventListener('storage', (e) => { if (e.key === CLE && e.newValue) { try { recevoirTournoi(JSON.parse(e.newValue).tournoi); } catch (err) { /* rien */ } } });

  // ---------------------------------------------------------------------
  // Missions (fonctionnalités à découvrir)
  // ---------------------------------------------------------------------
  const MISSIONS = [
    ['sport', 'Choisir un sport', 'Pick a sport'],
    ['creer', 'Régler le tournoi', 'Set up the tournament'],
    ['equipes', 'Ajouter des équipes', 'Add teams'],
    ['calendrier', 'Générer le calendrier', 'Generate the schedule'],
    ['score', 'Saisir un score', 'Enter a score'],
    ['vue', 'Vue par terrain', 'View by field'],
    ['classement', 'Voir le classement', 'See the standings'],
    ['finale', 'Lancer la phase finale', 'Start the knockouts'],
    ['qr', 'Partager le QR code', 'Share the QR code'],
    ['spectateur', 'Suivre en spectateur', 'Follow as a spectator'],
    ['grand', 'Vue grand écran', 'Big screen view'],
    ['coorg', 'Inviter un co-organisateur', 'Invite a co-organizer'],
    ['pdf', 'Exporter en PDF', 'Export to PDF'],
    ['profil', 'Mon profil et réglages', 'My profile & settings'],
  ];
  function decouvrir(id) {
    if (S.decouvertes.includes(id)) return;
    S.decouvertes.push(id);
    enregistrer();
    rendreMissions(id);
  }
  function rendreMissions(nouvelle) {
    const ul = $('#missions');
    if (!ul) return;
    ul.innerHTML = MISSIONS.map(([id, fr, en]) => `<li><button type="button" class="mission ${S.decouvertes.includes(id) ? 'faite' : ''}" data-mission="${id}"><span class="coche">${ico('coche')}</span><span>${langue === 'en' ? en : fr}</span></button></li>`).join('');
    const n = MISSIONS.filter(([id]) => S.decouvertes.includes(id)).length;
    $('#compte-missions').textContent = `${n} / ${MISSIONS.length}`;
    $('#jauge-missions').style.width = `${(n / MISSIONS.length) * 100}%`;
    if (nouvelle) {
      const b = $(`[data-mission="${nouvelle}"]`, ul);
      if (b && b.animate && !mouvementReduit) b.animate([{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }

  // ---------------------------------------------------------------------
  // Aides de lecture du tournoi
  // ---------------------------------------------------------------------
  const T = () => S.tournoi;
  const nomEquipe = (t, id) => (t.equipes.find((e) => e.id === id) || {}).nom || '?';
  const resultatDe = (t, id) => t.resultats.find((r) => r.match_id === id);
  const estFini = (t, m) => { const r = resultatDe(t, m.id); return !!r && r.statut === 'termine'; };
  const avecRes = (t, m) => ({ ...m, resultat: resultatDe(t, m.id) });
  const motEquipes = (t) => (t.sport === 'tennis' ? (t.tennisDouble ? tr('paires', 'pairs') : tr('joueurs', 'players')) : tr('équipes', 'teams'));
  const peutPremium = (t) => S.pro || (t && t.debloque);
  function reglagesDe(t) {
    const miTemps = t.sport === 'tennis' ? 0 : Number(t.miTemps) || 0;
    return {
      dateDebut: t.date, heureDebut: t.heureDebut || '09:00',
      dureeMatchMinutes: Number(t.dureeMatch) + miTemps,
      dureeCreneauMinutes: Number(t.dureeMatch) + miTemps + Number(t.pause),
      pauseDejeuner: t.pauseDej, heureDebutPause: t.debutPause, heureFinPause: t.finPause,
      nombreTerrains: Math.max(1, Number(t.terrains) || 1),
    };
  }
  function apresDernierMatch(t) {
    const r = reglagesDe(t);
    const dernier = Math.max(...t.matchs.map((m) => new Date(m.horaire).getTime()));
    return { ...r, horaireDepart: new Date(dernier + r.dureeCreneauMinutes * 60000).toISOString() };
  }
  function classementsPoules(t) {
    return (t.poules || []).map((p) => ({
      nom: p.nom,
      classement: calculerClassement(p.equipeIds.map((id) => t.equipes.find((e) => e.id === id)).filter(Boolean), t.matchs.filter((m) => m.phase === p.nom), t.resultats, t.departagePoule, t.sport),
    }));
  }
  function analyser(t) {
    const groupes = grouperParPhase(t.matchs);
    const poules = groupes.filter((g) => estPhaseDePoule(g.nom));
    const ko = groupes.filter((g) => !estPhaseDePoule(g.nom) && g.nom !== NOM_3E);
    const troisieme = groupes.find((g) => g.nom === NOM_3E);
    const poulesFinies = poules.length > 0 && poules.every((g) => g.matchs.every((m) => estFini(t, m)));
    const dernierKO = ko[ko.length - 1];
    const dernierFini = !!dernierKO && dernierKO.matchs.every((m) => estFini(t, m));
    let action = null;
    if (t.format === 'mixte' && poulesFinies && ko.length === 0) action = 'phaseFinale';
    else if (dernierKO && dernierFini && dernierKO.matchs.length > 1) action = 'tourSuivant';
    let podium = null;
    if (dernierKO && dernierKO.matchs.length === 1 && dernierFini && (!troisieme || troisieme.matchs.every((m) => estFini(t, m)))) {
      const f = avecRes(t, dernierKO.matchs[0]);
      const g = idEquipeGagnante(f);
      podium = [g, f.equipe_a_id === g ? f.equipe_b_id : f.equipe_a_id, troisieme ? idEquipeGagnante(avecRes(t, troisieme.matchs[0])) : null];
    }
    if (t.format === 'poules' && poulesFinies && poules.length === 1) {
      const c = classementsPoules(t)[0].classement;
      podium = [c[0], c[1], c[2]].map((x) => (x ? x.equipe.id : null));
    }
    const verrouillees = new Set();
    if (ko.length) poules.forEach((g) => verrouillees.add(g.nom));
    ko.slice(0, -1).forEach((g) => verrouillees.add(g.nom));
    const termine = !!podium || (t.format === 'poules' && poulesFinies);
    return { groupes, poules, ko, troisieme, poulesFinies, action, podium, verrouillees, termine, dernierKO };
  }
  function formaterHoraire(iso) {
    const d = new Date(iso);
    const jour = d.toLocaleDateString(locale(), { weekday: 'short' });
    return `${jour} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const formaterDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');

  // ---------------------------------------------------------------------
  // Navigation entre écrans
  // ---------------------------------------------------------------------
  const pile = $('#sim-pile');
  let historique = [];
  let ecranCourant = null;
  let reglagesOuverts = false;
  let horairesOuverts = false;
  function aller(ecran, params = {}, sens = 'avant') {
    if (ecranCourant && sens === 'avant') historique.push(ecranCourant);
    ecranCourant = { ecran, params };
    rendre(sens);
  }
  function retour() {
    fermerFeuille();
    const precedent = historique.pop();
    ecranCourant = precedent || { ecran: 'accueil', params: {} };
    rendre('arriere');
  }
  function reinitialiserVers(ecran, params = {}) {
    historique = ecran === 'accueil' ? [] : [{ ecran: 'accueil', params: {} }];
    ecranCourant = { ecran, params };
    rendre('avant');
  }
  function rendre(sens) {
    const ancien = $('.sim-ecran:not(.sort-avant):not(.sort-arriere)', pile);
    const div = document.createElement('div');
    div.className = 'sim-ecran';
    div.innerHTML = htmlEcran();
    if (ancien && !mouvementReduit) {
      div.classList.add(sens === 'arriere' ? 'entre-arriere' : 'entre-avant');
      ancien.classList.add(sens === 'arriere' ? 'sort-arriere' : 'sort-avant');
      if (sens === 'arriere') pile.insertBefore(div, ancien); else pile.appendChild(div);
      setTimeout(() => ancien.remove(), 430);
    } else {
      if (ancien) ancien.remove();
      pile.appendChild(div);
    }
    apresRendu(div);
  }
  function rafraichir() {
    const ecran = $('.sim-ecran:not(.sort-avant):not(.sort-arriere)', pile);
    if (!ecran || !ecranCourant) return;
    const actif = document.activeElement;
    const champ = actif && actif.dataset ? actif.dataset.champ : null;
    const pos = actif && 'selectionStart' in actif ? actif.selectionStart : null;
    const defil = ecran.scrollTop;
    ecran.innerHTML = htmlEcran();
    ecran.scrollTop = defil;
    if (champ) {
      const el = $(`[data-champ="${champ}"]`, ecran);
      if (el) { el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) { /* type sans sélection */ } }
    }
    apresRendu(ecran);
  }
  function apresRendu(div) {
    $$('.s-onglets', div).forEach(placerCurseur);
    if (ecranCourant.ecran === 'qrcode') dessinerQR($('#s-qr', div));
  }
  function placerCurseur(barre) {
    const c = $('.curseur', barre);
    if (!c) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translateX(${Number(c.dataset.cible) * 100}%)`; }));
  }
  function maj(options = {}) {
    enregistrer();
    if (options.diffuser) diffuser();
    rafraichir();
    rendreGrandEcran();
  }

  // ---------------------------------------------------------------------
  // Toast et feuille (bottom sheet)
  // ---------------------------------------------------------------------
  let minuteurToast;
  function toast(msg) {
    const el = $('#sim-toast');
    $('span', el).textContent = msg;
    el.classList.add('visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => el.classList.remove('visible'), 2400);
  }
  let feuilleRendu = null;
  function ouvrirFeuille(fnRendu) {
    feuilleRendu = fnRendu;
    $('#sim-feuille').innerHTML = `<div class="poignee"></div>${fnRendu()}`;
    $('#sim-feuille').classList.add('ouvert');
    $('#sim-voile').classList.add('ouvert');
  }
  function rafraichirFeuille() { if (feuilleRendu) $('#sim-feuille').innerHTML = `<div class="poignee"></div>${feuilleRendu()}`; }
  function fermerFeuille() {
    feuilleRendu = null;
    $('#sim-feuille').classList.remove('ouvert');
    $('#sim-voile').classList.remove('ouvert');
  }
  function confirmer(titre, texte, libelle, action, danger = false) {
    ouvrirFeuille(() => `<h3 class="s-titre" style="font-size:28px">${esc(titre)}</h3><p class="s-sous">${esc(texte)}</p>
      <button class="s-btn ${danger ? 'danger' : ''}" data-a="confirmer">${esc(libelle)}</button>
      <button class="s-btn sec" data-a="fermer-feuille">${tr('Annuler', 'Cancel')}</button>`);
    actionConfirmee = action;
  }
  let actionConfirmee = null;

  // ---------------------------------------------------------------------
  // Composants HTML de l'app
  // ---------------------------------------------------------------------
  const marque = () => `<span class="s-marque"><svg aria-hidden="true"><use href="#i-marque"/></svg><span>OLYMPIAD</span></span>`;
  const barreNav = (droite = '') => `<div class="s-nav"><button class="s-retour" data-a="retour">${ico('retour')}${tr('Retour', 'Back')}</button>${marque()}<div class="droite">${droite}</div></div>`;
  const etapes = (n, label) => `<div class="s-etapes">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'ok' : ''}"></i>`).join('')}</div><div class="s-etapes-txt">${tr('Étape', 'Step')} ${n}/3 · ${label}</div>`;
  const carteChoix = (champ, valeur, label, actuel) => `<button class="s-carte ${String(actuel) === String(valeur) ? 'choisie' : ''}" data-a="choisir" data-champ="${champ}" data-v="${valeur}"><span class="rond"></span>${esc(label)}</button>`;
  const pas = (champ, label, valeur, min, max) => `<div class="s-pas"><span>${label}</span><span class="ctrl"><button data-a="pas" data-champ="${champ}" data-v="-1" data-min="${min}" data-max="${max}" aria-label="moins">${ico('moins')}</button><output>${valeur}</output><button data-a="pas" data-champ="${champ}" data-v="1" data-min="${min}" data-max="${max}" aria-label="plus">${ico('plus')}</button></span></div>`;
  const interrupteur = (champ, label, actif, aide = '') => `<div class="s-interrupteur" data-a="basculer" data-champ="${champ}"><span>${label}${aide ? `<small>${aide}</small>` : ''}</span><button class="bascule" role="switch" aria-checked="${!!actif}" aria-label="${esc(label)}" tabindex="-1"></button></div>`;
  // Onglets segmentés : le curseur part de la position précédente et glisse
  // vers la nouvelle (voir apresRendu).
  const positionsOnglets = {};
  const onglets = (champ, options, actuel, action = 'onglet') => {
    const idx = Math.max(0, options.findIndex(([v]) => v === actuel));
    const depart = positionsOnglets[champ] ?? idx;
    positionsOnglets[champ] = idx;
    return `<div class="s-onglets" role="tablist" style="--n:${options.length}"><span class="curseur" style="transform:translateX(${depart * 100}%)" data-cible="${idx}"></span>${options.map(([v, l]) => `<button role="tab" aria-selected="${v === actuel}" class="${v === actuel ? 'actif' : ''}" data-a="${action}" data-champ="${champ}" data-v="${v}">${l}</button>`).join('')}</div>`;
  };

  function carteMatch(t, m, lecture, verrouillees) {
    if (!m.equipe_b_id) {
      return `<div class="s-match exempt"><div class="eq"><b>${esc(nomEquipe(t, m.equipe_a_id))}</b><small>${tr('Exempt · qualifié·e directement', 'Bye · directly qualified')}</small></div></div>`;
    }
    const r = resultatDe(t, m.id);
    const live = r && r.statut === 'en_cours';
    const fini = r && r.statut === 'termine';
    let gagnant = null;
    if (fini) gagnant = idEquipeGagnante({ ...m, resultat: r });
    const nA = `<span class="${gagnant === m.equipe_a_id ? 'gagnant' : ''}">${esc(nomEquipe(t, m.equipe_a_id))}</span>`;
    const nB = `<span class="${gagnant === m.equipe_b_id ? 'gagnant' : ''}">${esc(nomEquipe(t, m.equipe_b_id))}</span>`;
    const tab = r && r.score_a === r.score_b && !estPhaseDePoule(m.phase) && (r.score_tab_a || r.score_tab_b) ? `<small>${tr('t.a.b.', 'pens')} ${r.score_tab_a}-${r.score_tab_b}</small>` : '';
    const droite = r ? `<span class="sc">${r.score_a}-${r.score_b}${tab}</span>` : `<span class="avenir">${tr('À venir', 'Upcoming')}</span>`;
    const lieu = m.terrain ? ` · ${tr('terrain', 'field')} ${m.terrain}` : '';
    const sous = live ? `<span class="s-badge-live">${tr('EN DIRECT', 'LIVE')}</span> · ${formaterHoraire(m.horaire)}${lieu}` : `${formaterHoraire(m.horaire)}${lieu}`;
    const verrou = verrouillees && verrouillees.has(m.phase);
    const tag = lecture ? 'div' : 'button';
    return `<${tag} class="s-match ${live ? 'live' : ''} ${matchsMisAJour.has(m.id) ? 'maj' : ''}" ${lecture ? '' : `data-a="${verrou ? 'verrou' : 'saisir'}" data-v="${m.id}"`}><div class="eq"><b>${nA} · ${nB}</b><small>${sous}</small></div>${droite}</${tag}>`;
  }
  function listeMatchs(t, lecture) {
    const a = analyser(t);
    const groupes = S.vue === 'terrain' ? grouperParTerrain(t.matchs) : a.groupes;
    return groupes.map((g) => {
      const total = g.matchs.filter((m) => m.equipe_b_id).length;
      const joues = g.matchs.filter((m) => m.equipe_b_id && estFini(t, m)).length;
      return `<div class="s-section">${esc(S.vue === 'terrain' ? g.nom : libellePhase(g.nom))}<small>${joues}/${total}</small></div>${g.matchs.map((m) => carteMatch(t, m, lecture, a.verrouillees)).join('')}`;
    }).join('');
  }
  function tableClassement(t, poule, nbQualifies) {
    const sp = infosSport(t.sport);
    const [bp, bc] = sp.abr[langue === 'en' ? 1 : 0];
    const lignes = poule.classement.map((s, i) => `<tr class="${nbQualifies && i < nbQualifies ? 'qualifie' : ''}"><td>${i + 1}</td><td>${esc(s.equipe.nom)}</td><td>${s.joues}</td><td>${s.victoires}</td><td>${s.nuls}</td><td>${s.defaites}</td><td>${s.buts_pour}</td><td>${s.buts_contre}</td><td>${s.diff_buts > 0 ? '+' : ''}${s.diff_buts}</td><td>${s.points}</td></tr>`).join('');
    return `<div class="s-tableau"><h4>${tr('Classement', 'Standings')} · ${esc(libellePhase(poule.nom))}</h4><table><thead><tr><th></th><th>${tr('Équipe', 'Team')}</th><th>${tr('J', 'P')}</th><th>${tr('V', 'W')}</th><th>${tr('N', 'D')}</th><th>${tr('D', 'L')}</th><th>${bp}</th><th>${bc}</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${lignes}</tbody></table></div>`;
  }
  function podiumHTML(t, podium) {
    const [p1, p2, p3] = podium;
    const marcheHTML = (id, rang, cls) => `<div><div class="nom" style="margin-bottom:6px">${id ? esc(nomEquipe(t, id)) : '—'}</div><div class="marche ${cls}"><div class="rang">${rang}</div></div></div>`;
    return `<div class="s-section">${tr('Podium', 'Podium')}</div><div class="s-podium">${marcheHTML(p2, 2, 'p2')}${marcheHTML(p1, 1, 'p1')}${marcheHTML(p3, 3, 'p3')}</div>
      <p class="s-sous" style="text-align:center;margin-top:8px">🏆 ${tr('Vainqueur', 'Winner')} : <b style="color:var(--texte)">${esc(nomEquipe(t, p1))}</b></p>`;
  }
  function vueClassement(t) {
    const a = analyser(t);
    let html = a.podium ? podiumHTML(t, a.podium) : '';
    const cp = classementsPoules(t);
    html += cp.map((p) => tableClassement(t, p, t.format === 'mixte' ? t.qualifies : 0)).join('');
    if (cp.length && t.format === 'mixte') html += `<p class="s-legende"><span style="color:var(--accent);font-weight:700">●</span> ${tr(`Les ${t.qualifies} premiers de chaque poule vont en phase finale.`, `The top ${t.qualifies} of each group go to the knockouts.`)}</p>`;
    if (a.ko.length || a.troisieme) {
      html += `<div class="s-section">${tr('Phase finale', 'Knockout stage')}</div>`;
      html += [...a.ko, ...(a.troisieme ? [a.troisieme] : [])].map((g) => `<p class="s-eyebrow" style="font-size:16px;margin:12px 0 6px">${esc(libellePhase(g.nom))}</p>${g.matchs.map((m) => carteMatch(t, m, true, null)).join('')}`).join('');
    }
    if (!cp.length && !a.ko.length) html += `<div class="s-vide">${tr('Le classement apparaîtra ici.', 'Standings will appear here.')}</div>`;
    return html;
  }

  // ---------------------------------------------------------------------
  // Écrans
  // ---------------------------------------------------------------------
  function htmlEcran() {
    const { ecran, params } = ecranCourant;
    const fn = ECRANS[ecran] || ECRANS.accueil;
    return fn(params || {});
  }
  const ECRANS = {
    accueil() {
      const t = T();
      const a = t ? analyser(t) : null;
      const carteT = (action, sousTitre) => `<button class="s-carte-tournoi" data-a="${action}"><span class="ic">${ico(t.sport)}</span><span><b>${esc(t.nom)}</b><small>${sousTitre}</small></span>${ico('droite', 'fl')}</button>`;
      return `<div class="s-accueil">
        <div class="s-nav"><div class="droite"><button class="s-rond" data-a="profil" aria-label="${tr('Mon profil', 'My profile')}">${ico('profil')}</button><button class="s-rond" data-a="langue">${langue.toUpperCase()}</button></div></div>
        <div class="logo-grand"><svg aria-hidden="true"><use href="#i-marque"/></svg><span>OLYMPIAD</span></div>
        <p class="slogan">${tr('Organise tes tournois sportifs', 'Organize your sports tournaments')}</p>
        <button class="s-btn" data-a="creer">${tr('Créer mon tournoi', 'Create my tournament')}</button>
        <button class="s-btn sec" data-a="rejoindre">${tr('Rejoindre un tournoi', 'Join a tournament')}</button>
        ${t && S.role === 'orga' ? `<div class="s-section" style="margin-top:28px">${tr('Mes tournois', 'My tournaments')}</div>${carteT('ouvrir-tournoi', `${nomSport(t.sport)} · ${t.equipes.length} ${motEquipes(t)} · ${a.termine ? tr('terminé', 'finished') : tr('en cours', 'in progress')}`)}` : ''}
        ${t && S.role === 'coorg' ? `<div class="s-section" style="margin-top:28px">${tr('Co-organisés', 'Co-organized')}</div>${carteT('ouvrir-tournoi', tr('Saisie des scores', 'Score entry'))}` : ''}
        ${t && S.suivis.includes(t.code) ? `<div class="s-section">${tr('Tournois suivis', 'Followed tournaments')}</div>${carteT('ouvrir-suivi', `${tr('Code', 'Code')} ${t.code.toUpperCase()}`)}` : ''}
        <div class="s-pied">${S.connecte
          ? `<button class="s-lien" data-a="profil">${tr('Connecté·e', 'Signed in')} : ${esc(S.profil.prenom || S.profil.email || tr('organisateur', 'organizer'))}</button>`
          : `<button class="s-lien" data-a="connexion">${tr('Déjà inscrit ? Se connecter', 'Already registered? Sign in')}</button>`}</div>
      </div>`;
    },

    sport() {
      return `${barreNav()}${etapes(1, tr('Sport', 'Sport'))}
        <h2 class="s-titre">${tr('Choisis ton sport', 'Pick your sport')}</h2>
        <p class="s-sous">${tr('Le barème et le vocabulaire du score s\'adaptent.', 'Scoring and wording adapt automatically.')}</p>
        <div class="s-sports">${SPORTS.map((s) => `<button class="s-sport" data-a="choisir-sport" data-v="${s.valeur}">${ico(s.valeur)}${langue === 'en' ? s.en : s.fr}</button>`).join('')}</div>`;
    },

    creer() {
      const b = S.brouillon;
      const sp = infosSport(b.sport);
      const formats = [['mixte', tr('Poules puis élimination directe', 'Groups then knockout')], ['poules', tr('Poules uniquement', 'Groups only')], ['elimination_directe', tr('Élimination directe uniquement', 'Knockout only')]];
      let avances = '';
      if (reglagesOuverts) {
        if (b.sport === 'tennis') {
          avances += `<label class="s-label">${tr('Simple ou double', 'Singles or doubles')}</label>${carteChoix('tennisDouble', 'false', tr('Simple', 'Singles'), String(b.tennisDouble))}${carteChoix('tennisDouble', 'true', tr('Double', 'Doubles'), String(b.tennisDouble))}`;
        }
        if (b.format !== 'elimination_directe') {
          avances += `<label class="s-label">${tr('Départage · égalité en poule', 'Tiebreaker · tie in group')}</label>${carteChoix('departagePoule', 'diff_buts', iL(sp.diff), b.departagePoule)}${carteChoix('departagePoule', 'confrontation_directe', tr('Confrontation directe', 'Head-to-head'), b.departagePoule)}`;
        }
        if (b.sport !== 'tennis' && b.format !== 'poules') {
          avances += `<label class="s-label">${tr('Départage · match nul en élimination directe', 'Tiebreaker · draw in knockout stage')}</label>${sp.elim.map(([v, fr, en]) => carteChoix('departageElim', v, langue === 'en' ? en : fr, b.departageElim)).join('')}`;
        }
      }
      return `${barreNav()}${etapes(2, tr('Tournoi', 'Tournament'))}
        <p class="s-eyebrow">${nomSport(b.sport)}</p>
        <h2 class="s-titre">${tr('Ton tournoi', 'Your tournament')}</h2>
        <label class="s-label" for="s-nom">${tr('Nom du tournoi', 'Tournament name')}</label>
        <input class="s-champ" id="s-nom" data-champ="nom" maxlength="60" value="${esc(b.nom)}" placeholder="${tr('Ex : Tournoi U13 de printemps', 'E.g. U13 Spring Cup')}" autocomplete="off">
        <label class="s-label" for="s-date">${tr('Date', 'Date')}</label>
        <input class="s-champ" id="s-date" type="date" data-champ="date" value="${esc(b.date)}">
        <label class="s-label">${tr('Format', 'Format')}</label>
        ${formats.map(([v, l]) => carteChoix('format', v, l, b.format)).join('')}
        <button class="s-repli ${reglagesOuverts ? 'ouvert' : ''}" data-a="replier" data-v="reglages">${tr('Réglages avancés', 'Advanced settings')}${ico('chevron')}</button>
        ${reglagesOuverts ? avances : `<p class="s-aide">${tr('Départages et options du sport. Sinon, des valeurs par défaut seront utilisées.', 'Tiebreakers and sport options. Otherwise, defaults are used.')}</p>`}
        <p class="s-erreur" id="erreur-creer"></p>
        <button class="s-btn" data-a="vers-equipes">${tr('Suivant', 'Next')}</button>`;
    },

    equipes() {
      const b = S.brouillon;
      const n = b.equipes.length;
      const illimite = S.pro || b.debloque;
      const mot = motEquipes(b);
      const maxPoules = Math.max(1, Math.floor(n / 2));
      const nbPoules = Math.min(b.nbPoules, maxPoules);
      const taillePouleMin = Math.max(1, Math.floor(n / nbPoules));
      const maxQualif = Math.max(1, Math.min(taillePouleMin, 8));
      const titre = b.sport === 'tennis' ? (b.tennisDouble ? tr('Les paires', 'The pairs') : tr('Les joueurs', 'The players')) : tr('Les équipes', 'The teams');
      let orga = pas('terrains', tr('Terrains disponibles', 'Available fields'), b.terrains, 1, 8);
      orga = `<p class="s-aide">${tr('Plusieurs matchs pourront se jouer en même temps.', 'Several matches can be played at the same time.')}</p>${orga}`;
      if (b.format !== 'elimination_directe') orga += `<div style="height:8px"></div>${pas('nbPoules', tr('Nombre de poules', 'Number of groups'), nbPoules, 1, maxPoules)}`;
      if (b.format === 'mixte') orga += `<div style="height:8px"></div>${pas('qualifies', tr('Qualifiés par poule', 'Qualifiers per group'), Math.min(b.qualifies, maxQualif), 1, maxQualif)}`;
      let options = '';
      if (b.format !== 'poules') options += interrupteur('troisieme', tr('Match pour la 3e place', 'Third-place match'), b.troisieme);
      if (b.sport === 'rugby' && b.format !== 'elimination_directe') options += interrupteur('pointsBonus', tr('Points bonus', 'Bonus points'), b.pointsBonus, tr('Bonus offensif ou défaite bonifiée, saisi match par match.', 'Offensive or losing bonus, entered match by match.'));
      if (b.sport === 'tennis') options += `<label class="s-label">${tr('Sets gagnants', 'Winning sets')}</label>${carteChoix('setsGagnants', 2, tr('2 sets gagnants', 'Best of 3 (2 winning sets)'), b.setsGagnants)}${carteChoix('setsGagnants', 3, tr('3 sets gagnants', 'Best of 5 (3 winning sets)'), b.setsGagnants)}`;
      let horaires = '';
      if (horairesOuverts) {
        horaires = `<div class="s-grille2"><div><label class="s-label">${tr('Premier match', 'First match')}</label><input class="s-champ" type="time" data-champ="heureDebut" value="${b.heureDebut}"></div>
          <div><label class="s-label">${tr('Durée d\'un match', 'Match length')}</label><input class="s-champ" type="number" min="3" max="180" data-champ="dureeMatch" value="${b.dureeMatch}"></div>
          ${b.sport !== 'tennis' ? `<div><label class="s-label">${tr('Mi-temps (min)', 'Half-time (min)')}</label><input class="s-champ" type="number" min="0" max="30" data-champ="miTemps" value="${b.miTemps}"></div>` : ''}
          <div><label class="s-label">${tr('Pause (min)', 'Break (min)')}</label><input class="s-champ" type="number" min="0" max="60" data-champ="pause" value="${b.pause}"></div></div>
          <div style="margin-top:8px">${interrupteur('pauseDej', tr('Pause déjeuner', 'Lunch break'), b.pauseDej)}</div>
          ${b.pauseDej ? `<div class="s-grille2"><div><label class="s-label">${tr('Début', 'Start')}</label><input class="s-champ" type="time" data-champ="debutPause" value="${b.debutPause}"></div><div><label class="s-label">${tr('Fin', 'End')}</label><input class="s-champ" type="time" data-champ="finPause" value="${b.finPause}"></div></div>` : ''}`;
      }
      return `${barreNav()}${etapes(3, titre)}
        <h2 class="s-titre">${titre}</h2>
        <p class="s-sous">${esc(b.nom)} · ${nomSport(b.sport)}</p>
        <div class="s-ligne-champ"><input class="s-champ" data-champ="nouvelleEquipe" maxlength="40" placeholder="${tr('Nom', 'Name')}" value="${esc(b.nouvelleEquipe || '')}" autocomplete="off"><button class="s-btn petit" data-a="ajouter-equipe" aria-label="${tr('Ajouter', 'Add')}">+</button></div>
        <div class="s-compteur-equipes"><span><b>${n}</b> ${mot}${illimite ? '' : ` · <span class="limite">${tr(`gratuit jusqu'à ${LIMITE_GRATUITE}`, `free up to ${LIMITE_GRATUITE}`)}</span>`}</span><button class="s-lien" style="width:auto;padding:0;font-size:13px" data-a="remplir-equipes">${tr('Remplir avec des exemples', 'Fill with examples')}</button></div>
        <ul class="s-equipes">${b.equipes.map((e, i) => `<li class="s-equipe"><span class="n">${i + 1}</span><span class="nom">${esc(e.nom)}</span><button data-a="retirer-equipe" data-v="${e.id}" aria-label="${tr('Retirer', 'Remove')}">${ico('poubelle')}</button></li>`).join('')}</ul>
        ${n === 0 ? `<div class="s-vide">${tr('Ajoute au moins 2 participants.', 'Add at least 2 participants.')}</div>` : ''}
        <div class="s-section">${tr('Organisation', 'Organization')}</div>${orga}
        ${options ? `<div class="s-bloc" style="margin-top:12px">${options}</div>` : ''}
        <button class="s-repli ${horairesOuverts ? 'ouvert' : ''}" data-a="replier" data-v="horaires">${tr('Horaires et pauses', 'Times and breaks')}${ico('chevron')}</button>
        ${horairesOuverts ? horaires : `<p class="s-aide">${tr(`Départ ${b.heureDebut}, matchs de ${b.dureeMatch} min, ${b.pause} min de pause.`, `Start ${b.heureDebut}, ${b.dureeMatch}-min matches, ${b.pause}-min breaks.`)}</p>`}
        <p class="s-aide" style="margin-top:14px">${estimation(b)}</p>
        <p class="s-erreur" id="erreur-equipes"></p>
        <button class="s-btn" data-a="generer" ${n < 2 ? 'disabled' : ''}>${tr('Générer le calendrier', 'Generate the schedule')}</button>`;
    },

    chargement() {
      return `${barreNav()}<h2 class="s-titre">${tr('Génération…', 'Generating…')}</h2><p class="s-sous">${tr('Poules, journées, terrains et horaires', 'Groups, rounds, fields and times')}</p>${'<div class="squelette"></div>'.repeat(7)}`;
    },

    calendrier() {
      const t = T();
      if (!t) return ECRANS.accueil();
      const a = analyser(t);
      const premium = peutPremium(t);
      const coorg = S.role === 'coorg';
      const actions = [
        ['qrcode', 'qr', tr('QR code', 'QR code'), false],
        ['grand-ecran', 'ecran', tr('Grand écran', 'Big screen'), false],
        ['coorgs', 'groupe', tr('Co-orga.', 'Co-orgs'), !premium],
        ['pdf', 'pdf', 'PDF', !premium],
      ];
      let bandeau = '';
      if (a.action === 'phaseFinale') bandeau = `<div class="s-bloc" style="padding:14px;margin-bottom:12px;border-color:var(--accent)"><b>${tr('Toutes les poules sont terminées', 'All groups are finished')}</b><button class="s-btn" data-a="phase-suivante">${tr('Générer la phase finale', 'Generate the knockouts')}</button></div>`;
      if (a.action === 'tourSuivant') bandeau = `<div class="s-bloc" style="padding:14px;margin-bottom:12px;border-color:var(--accent)"><b>${esc(libellePhase(a.dernierKO.nom))} · ${tr('terminé', 'finished')}</b><button class="s-btn" data-a="phase-suivante">${tr('Générer le tour suivant', 'Generate the next round')}</button></div>`;
      const restants = t.matchs.some((m) => m.equipe_b_id && !estFini(t, m) && !a.verrouillees.has(m.phase));
      let contenu;
      if (S.onglet === 'classement') contenu = vueClassement(t);
      else {
        contenu = `${a.podium ? podiumHTML(t, a.podium) : ''}${bandeau}
          ${onglets('vue', [['poule', t.format === 'elimination_directe' ? tr('Par tour', 'By round') : tr('Par poule', 'By group')], ['terrain', tr('Par terrain', 'By field')]], S.vue, 'vue')}
          ${listeMatchs(t, false)}
          ${restants ? `<button class="s-lien" data-a="simuler">${tr('⚡ Simuler les résultats restants de la phase', '⚡ Simulate the remaining results of this stage')}</button>` : ''}`;
      }
      return `${barreNav(`<button class="s-rond" data-a="qrcode" aria-label="${tr('Partager', 'Share')}">${ico('partager')}</button>`)}
        <h2 class="s-titre">${esc(t.nom)}</h2>
        <p class="s-sous">${coorg ? `${tr('Co-organisateur', 'Co-organizer')} · ` : ''}${tr('Touche un match pour saisir ou modifier son résultat', 'Tap a match to enter or edit its result')}</p>
        ${coorg ? '' : `<div class="s-actions">${actions.map(([act, ic, l, verrou]) => `<button class="s-action" data-a="${act}">${verrou ? ico('cadenas', 'cadenas') : ''}${ico(ic)}${l}</button>`).join('')}</div>`}
        ${onglets('onglet', [['matchs', tr('Matchs', 'Matches')], ['classement', tr('Classement', 'Standings')]], S.onglet)}
        ${contenu}
        <button class="s-lien attenue" style="margin-top:14px" data-a="vers-suivi">${tr('Voir comme un spectateur', 'View as a spectator')}</button>`;
    },

    suivi() {
      const t = T();
      if (!t) return ECRANS.rejoindre({});
      const contenu = S.ongletSuivi === 'classement' ? vueClassement(t) : listeMatchs(t, true);
      const suivi = S.suivis.includes(t.code);
      return `${barreNav()}
        <h2 class="s-titre">${esc(t.nom)}</h2>
        <p class="s-sous" style="margin-bottom:4px">${formaterDate(t.date)}</p>
        <p style="margin:0 0 12px;display:flex;gap:12px;align-items:center"><span class="s-badge-live">${tr('EN DIRECT', 'LIVE')}</span><span style="font-size:13px;color:var(--texte-attenue)">${nomSport(t.sport)} · ${t.equipes.length} ${motEquipes(t)}</span></p>
        ${S.role === 'orga' ? `<button class="s-lien" style="text-align:left;padding:0 0 10px" data-a="ouvrir-tournoi">${tr('Vue spectateur · Changer', 'Spectator view · Switch')}</button>` : ''}
        ${onglets('ongletSuivi', [['classement', tr('Classement', 'Standings')], ['calendrier', tr('Calendrier', 'Schedule')]], S.ongletSuivi)}
        ${contenu}
        <div style="margin-top:24px">
          <button class="s-lien attenue" data-a="signaler">${tr('Signaler ce tournoi', 'Report this tournament')}</button>
          ${suivi ? `<button class="s-lien rouge" data-a="ne-plus-suivre">${tr('Retirer de mes tournois suivis', 'Remove from followed tournaments')}</button>` : ''}
        </div>`;
    },

    qrcode() {
      const t = T();
      return `${barreNav()}
        <h2 class="s-titre">${tr('QR code du tournoi', 'Tournament QR code')}</h2>
        <p class="s-sous">${tr('Les équipes et les spectateurs le scannent pour suivre le tournoi en direct, sans compte.', 'Teams and spectators scan it to follow the tournament live, without an account.')}</p>
        <div class="s-qr" id="s-qr"></div>
        <p class="s-code-grand">${t.code.toUpperCase()}</p>
        <p class="s-sous" style="text-align:center">${tr('Code d\'accès', 'Access code')}</p>
        <button class="s-btn" data-a="copier" data-v="${t.code.toUpperCase()}">${ico('copier')}${tr('Copier le code', 'Copy the code')}</button>
        <button class="s-btn sec" data-a="partager-lien">${ico('partager')}${tr('Partager le lien', 'Share the link')}</button>
        <button class="s-btn sec" data-a="vers-suivi">${ico('oeil')}${tr('Voir la vue spectateur', 'See spectator view')}</button>
        <button class="s-btn sec" data-a="grand-ecran">${ico('ecran')}${tr('Afficher sur grand écran', 'Show on big screen')}</button>`;
    },

    coorgs() {
      const t = T();
      const liste = t.coorgs.length ? t.coorgs.map((c) => `<div class="s-bloc" style="margin-top:8px"><div class="s-coorg"><span class="ini">${esc(c.nom.split(' ').map((x) => x[0]).join(''))}</span><b>${esc(c.nom)}</b><button class="s-rond" style="width:34px;height:34px" data-a="retirer-coorg" data-v="${c.id}" aria-label="${tr('Retirer', 'Remove')}">${ico('croix')}</button></div>
          ${[['peut_saisir_scores', tr('Saisir les scores', 'Enter scores')], ['peut_gerer_le_tournoi', tr('Gérer le tournoi', 'Manage the tournament')], ['peut_supprimer_le_tournoi', tr('Supprimer le tournoi', 'Delete the tournament')]].map(([d, l]) => `<div class="s-interrupteur" data-a="droit" data-v="${c.id}" data-champ="${d}"><span>${l}</span><button class="bascule" role="switch" aria-checked="${!!c[d]}" tabindex="-1"></button></div>`).join('')}</div>`).join('')
        : `<div class="s-vide">${tr('Personne pour l\'instant. Partage le code ci-dessus à un bénévole.', 'Nobody yet. Share the code above with a volunteer.')}</div>`;
      return `${barreNav()}
        <h2 class="s-titre">${tr('Co-organisateurs', 'Co-organizers')}</h2>
        <p class="s-sous">${tr('Invite des bénévoles à saisir les scores sur les autres terrains, avec des droits choisis pour chacun.', 'Invite volunteers to enter scores on other fields, with permissions chosen for each.')}</p>
        <div class="s-bloc" style="text-align:center;padding:16px"><p class="s-sous" style="margin:0">${tr('Code d\'invitation', 'Invitation code')}</p><p class="s-code-grand" style="font-size:40px">${t.invite}</p>
        <button class="s-btn sec" style="margin-top:6px" data-a="copier" data-v="${t.invite}">${ico('copier')}${tr('Copier', 'Copy')}</button></div>
        <div class="s-section">${tr('Équipe d\'organisation', 'Organizing team')}</div>
        ${liste}
        <button class="s-btn" data-a="simuler-coorg">${tr('Simuler l\'arrivée d\'un bénévole', 'Simulate a volunteer joining')}</button>`;
    },

    paywall({ raison }) {
      const accroches = {
        equipes: tr(`La version gratuite est limitée à ${LIMITE_GRATUITE} équipes par tournoi.`, `The free version is limited to ${LIMITE_GRATUITE} teams per tournament.`),
        pdf: tr('L\'export PDF du programme fait partie des fonctions premium.', 'PDF export of the schedule is a premium feature.'),
        coorgs: tr('Les co-organisateurs font partie des fonctions premium.', 'Co-organizers are a premium feature.'),
        defaut: tr('Débloque toutes les fonctions d\'OLYMPIAD.', 'Unlock every OLYMPIAD feature.'),
      };
      const offre = (id, nom, desc, prix, vedette) => `<div class="s-offre ${vedette ? 'vedette' : ''}"><h5>${nom}</h5><p>${desc}</p><p class="prix">${prix}</p><button class="s-btn" style="margin:0" data-a="acheter" data-v="${id}">${tr('Choisir', 'Choose')}</button></div>`;
      return `${barreNav()}
        <h2 class="s-titre">${tr('Passe au niveau supérieur', 'Level up')}</h2>
        <p class="s-sous">${accroches[raison] || accroches.defaut}</p>
        ${offre('pass', tr('Pass Tournoi', 'Tournament Pass'), tr('Débloque équipes illimitées, export PDF et co-organisateurs pour ce tournoi.', 'Unlocks unlimited teams, PDF export and co-organizers for this tournament.'), tr('Achat unique · prix affiché dans l\'app', 'One-time purchase · price shown in the app'))}
        ${offre('pro-mois', tr('OLYMPIAD Pro (mensuel)', 'OLYMPIAD Pro (monthly)'), tr('Débloque toutes les fonctionnalités premium, pour tous tes tournois.', 'Unlocks every premium feature, for all your tournaments.'), tr('/ mois · prix affiché dans l\'app', '/ month · price shown in the app'), true)}
        ${offre('pro-an', tr('OLYMPIAD Pro (annuel)', 'OLYMPIAD Pro (yearly)'), tr('Le même abonnement, payé une fois par an.', 'The same subscription, paid once a year.'), tr('/ an · prix affiché dans l\'app', '/ year · price shown in the app'))}
        <button class="s-lien" data-a="restaurer">${tr('Restaurer mes achats', 'Restore purchases')}</button>
        ${S.passEnAttente ? `<button class="s-lien" data-a="utiliser-pass">${tr('J\'ai déjà un Pass Tournoi non utilisé', 'I already have an unused Tournament Pass')}</button>` : ''}
        <p class="s-aide" style="margin-top:10px">${tr('Simulation : aucun paiement n\'est effectué. Dans l\'app, l\'abonnement Pro se renouvelle automatiquement sauf résiliation au moins 24 h avant la fin de la période.', 'Simulation: no payment is made. In the app, Pro renews automatically unless cancelled at least 24 hours before the end of the period.')}</p>`;
    },

    rejoindre(params) {
      return `${barreNav()}
        <h2 class="s-titre">${tr('Rejoindre un tournoi', 'Join a tournament')}</h2>
        <p class="s-sous">${tr('Scanne le QR code de l\'organisateur ou saisis le code d\'accès.', 'Scan the organizer’s QR code or type the access code.')}</p>
        <div class="s-scan" data-a="scanner"><div class="cadre"></div><div class="ligne"></div><p>${ico('camera', '')} ${tr('Touche pour simuler un scan', 'Tap to simulate a scan')}</p></div>
        <label class="s-label" for="s-code">${tr('Code d\'accès', 'Access code')}</label>
        <input class="s-champ code" id="s-code" data-champ="code" maxlength="6" value="${esc((params && params.code) || '')}" placeholder="••••••" autocomplete="off" autocapitalize="characters">
        <p class="s-erreur" id="erreur-code">${params && params.erreur ? esc(params.erreur) : ''}</p>
        <button class="s-btn" data-a="valider-code">${tr('Rejoindre', 'Join')}</button>
        <button class="s-lien" style="margin-top:10px" data-a="rejoindre-orga">${tr('Rejoindre comme organisateur', 'Join as an organizer')}</button>`;
    },

    rejoindreOrga() {
      return `${barreNav()}
        <h2 class="s-titre">${tr('Rejoindre comme organisateur', 'Join as an organizer')}</h2>
        <p class="s-sous">${tr('Saisis le code d\'invitation que l\'organisateur principal t\'a envoyé.', 'Type the invitation code the main organizer sent you.')}</p>
        <input class="s-champ code" data-champ="codeInvite" maxlength="6" placeholder="••••••" autocomplete="off">
        <p class="s-erreur" id="erreur-invite"></p>
        <button class="s-btn" data-a="valider-invite">${tr('Rejoindre l\'organisation', 'Join the organizing team')}</button>`;
    },

    profil() {
      const p = S.profil;
      const initiales = ((p.prenom || '').charAt(0) + (p.nom || '').charAt(0)).toUpperCase() || '?';
      const th = racine.dataset.theme || 'auto';
      const statut = S.pro ? 'OLYMPIAD Pro' : tr('Gratuit', 'Free');
      return `${barreNav()}
        <h2 class="s-titre">${tr('Mon profil', 'My profile')}</h2>
        <label class="s-avatar" title="${tr('Changer la photo', 'Change photo')}">${p.photo ? `<img src="${p.photo}" alt="">` : esc(initiales)}<input type="file" accept="image/*" data-champ="photo" hidden></label>
        <p class="s-aide" style="text-align:center">${tr('Touche la photo pour la changer', 'Tap the photo to change it')}</p>
        <div class="s-grille2"><div><label class="s-label">${tr('Prénom', 'First name')}</label><input class="s-champ" data-champ="prenom" value="${esc(p.prenom)}" autocomplete="off"></div><div><label class="s-label">${tr('Nom', 'Last name')}</label><input class="s-champ" data-champ="nomProfil" value="${esc(p.nom)}" autocomplete="off"></div></div>
        <label class="s-label">${tr('Club', 'Club')}</label><input class="s-champ" data-champ="club" value="${esc(p.club)}" placeholder="${tr('Ex : AS Montagne', 'E.g. AS Montagne')}" autocomplete="off">
        <div class="s-section">${tr('Abonnement', 'Subscription')}</div>
        <div class="s-bloc" style="padding:14px"><b>${statut}</b><p class="s-aide" style="margin:4px 0 0">${S.pro ? tr('Toutes les fonctions premium sur tous tes tournois.', 'Every premium feature on all your tournaments.') : tr(`${LIMITE_GRATUITE} équipes max par tournoi, sans PDF ni co-organisateurs.`, `${LIMITE_GRATUITE} teams max per tournament, no PDF or co-organizers.`)}</p>
        ${S.pro ? `<button class="s-btn sec" data-a="annuler-pro">${tr('Gérer dans le store', 'Manage in the store')}</button>` : `<button class="s-btn" data-a="paywall">${tr('Voir les offres', 'See plans')}</button>`}
        <button class="s-lien" data-a="restaurer">${tr('Restaurer mes achats', 'Restore purchases')}</button></div>
        <div class="s-section">${tr('Préférences', 'Preferences')}</div>
        ${onglets('theme', [['auto', 'Auto'], ['light', tr('Clair', 'Light')], ['dark', tr('Sombre', 'Dark')]], th)}
        ${onglets('langue', [['fr', 'Français'], ['en', 'English']], langue)}
        <div class="s-section">${tr('Informations légales', 'Legal')}</div>
        <div class="s-bloc">
          <a class="s-interrupteur" style="text-decoration:none;color:inherit" href="politique-confidentialite.html"><span>${tr('Politique de confidentialité', 'Privacy policy')}</span>${ico('droite', '')}</a>
          <a class="s-interrupteur" style="text-decoration:none;color:inherit" href="conditions-utilisation.html"><span>${tr('Conditions d\'utilisation', 'Terms of use')}</span>${ico('droite', '')}</a>
          <a class="s-interrupteur" style="text-decoration:none;color:inherit" href="mentions-legales.html"><span>${tr('Mentions légales', 'Legal notice')}</span>${ico('droite', '')}</a>
        </div>
        ${S.connecte ? `<button class="s-btn sec" style="margin-top:20px" data-a="deconnexion">${tr('Se déconnecter', 'Sign out')}</button>` : `<button class="s-btn sec" style="margin-top:20px" data-a="connexion">${tr('Se connecter', 'Sign in')}</button>`}
        <button class="s-lien rouge" style="margin-top:12px" data-a="supprimer-compte">${tr('Supprimer mon compte', 'Delete my account')}</button>`;
    },

    connexion() {
      return `${barreNav()}
        <h2 class="s-titre">${tr('Connexion', 'Sign in')}</h2>
        <p class="s-sous">${tr('Simulation : aucune donnée n\'est envoyée et le mot de passe n\'est jamais enregistré.', 'Simulation: no data is sent and the password is never stored.')}</p>
        <label class="s-label">E-mail</label><input class="s-champ" type="email" data-champ="email" value="${esc(S.profil.email)}" placeholder="toi@club.fr" autocomplete="off">
        <label class="s-label">${tr('Mot de passe', 'Password')}</label>
        <div class="s-ligne-champ"><input class="s-champ" type="password" data-champ="mdp" autocomplete="off"><button class="s-rond" style="height:50px;width:50px;border-radius:12px" data-a="voir-mdp" aria-label="${tr('Afficher', 'Show')}">${ico('oeil')}</button></div>
        <div style="margin-top:10px">${interrupteur('memoriser', tr('Enregistrer mes identifiants', 'Remember my credentials'), S.memoriser, tr('Chiffrés sur le téléphone, dans l\'app.', 'Encrypted on the phone, in the app.'))}</div>
        <button class="s-btn" data-a="se-connecter">${tr('Se connecter', 'Sign in')}</button>
        <button class="s-lien" data-a="mdp-oublie">${tr('Mot de passe oublié ?', 'Forgot your password?')}</button>
        <button class="s-lien attenue" data-a="inscription">${tr('Pas encore de compte ? Créer un compte', 'No account yet? Create one')}</button>`;
    },

    inscription() {
      return `${barreNav()}
        <h2 class="s-titre">${tr('Créer un compte', 'Create an account')}</h2>
        <p class="s-sous">${tr('Nécessaire seulement pour organiser. Simulation : rien n\'est envoyé.', 'Only needed to organize. Simulation: nothing is sent.')}</p>
        <label class="s-label">${tr('Prénom', 'First name')}</label><input class="s-champ" data-champ="prenom" value="${esc(S.profil.prenom)}" autocomplete="off">
        <label class="s-label">E-mail</label><input class="s-champ" type="email" data-champ="email" value="${esc(S.profil.email)}" autocomplete="off">
        <label class="s-label">${tr('Mot de passe', 'Password')}</label><input class="s-champ" type="password" data-champ="mdp" autocomplete="off">
        <p class="s-aide" style="margin-top:12px">${tr('En créant un compte, tu confirmes avoir au moins 15 ans et accepter les', 'By creating an account, you confirm you are at least 15 and accept the')} <a href="conditions-utilisation.html">${tr('conditions d\'utilisation', 'terms of use')}</a> ${tr('et la', 'and the')} <a href="politique-confidentialite.html">${tr('politique de confidentialité', 'privacy policy')}</a>.</p>
        <button class="s-btn" data-a="se-connecter">${tr('Créer mon compte', 'Create my account')}</button>`;
    },

    mdpOublie() {
      return `${barreNav()}
        <h2 class="s-titre">${tr('Mot de passe oublié', 'Forgot password')}</h2>
        <p class="s-sous">${tr('Dans l\'app, tu reçois un lien par e-mail qui rouvre OLYMPIAD pour choisir un nouveau mot de passe.', 'In the app, you receive an email link that reopens OLYMPIAD to choose a new password.')}</p>
        <label class="s-label">E-mail</label><input class="s-champ" type="email" data-champ="email" value="${esc(S.profil.email)}" autocomplete="off">
        <button class="s-btn" data-a="envoyer-lien">${tr('Envoyer le lien', 'Send the link')}</button>`;
    },
  };

  // Estimation de l'heure de fin (calcul à blanc avec le vrai générateur)
  function estimation(b) {
    const n = b.equipes.length;
    if (n < 2) return '';
    const reg = reglagesDe(b);
    const faux = b.equipes.map((e) => ({ id: e.id }));
    let matchs;
    let nb;
    if (b.format === 'elimination_directe') {
      matchs = genererTourAPartirDeListe(faux, reg).filter((m) => m.equipe_b_id);
      nb = n - 1 + (b.troisieme && n >= 4 ? 1 : 0);
    } else {
      const nbPoules = Math.min(b.nbPoules, Math.max(1, Math.floor(n / 2)));
      const poules = repartirEnPoules(faux, nbPoules).map((eq, i) => ({ nom: `Poule ${String.fromCharCode(65 + i)}`, equipes: eq }));
      matchs = genererCalendrierPoules(poules, reg);
      nb = matchs.length;
    }
    if (!matchs.length) return '';
    const fin = new Date(Math.max(...matchs.map((m) => new Date(m.horaire).getTime())) + reg.dureeMatchMinutes * 60000);
    const etape = b.format === 'elimination_directe' ? tr('du premier tour', 'first round') : tr('des poules', 'groups');
    const jourFin = new Date(fin.getTime() - 1); jourFin.setHours(0, 0, 0, 0);
    const lendemain = jourFin > new Date(`${b.date}T00:00:00`);
    const texte = `⏱ ${b.format === 'elimination_directe' ? tr(`${nb} matchs au total`, `${nb} matches in total`) : tr(`${nb} matchs de poule`, `${nb} group matches`)} · ${tr(`fin ${etape} vers`, `${etape} end around`)} <b style="color:var(--texte)">${pad(fin.getHours())}:${pad(fin.getMinutes())}</b>`;
    return lendemain
      ? `${texte} <b style="color:var(--danger)">${tr('le lendemain : ajoute des terrains ou raccourcis les matchs.', 'the next day: add fields or shorten matches.')}</b>`
      : texte;
  }

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------
  function nouveauBrouillon(sport) {
    return {
      sport, nom: '', date: prochainSamedi(), format: 'mixte', tennisDouble: false, setsGagnants: 2, pointsBonus: false,
      departagePoule: 'diff_buts', departageElim: (infosSport(sport).elim[0] || [''])[0],
      equipes: [], terrains: 2, nbPoules: 2, qualifies: 2, troisieme: true,
      heureDebut: '09:00', dureeMatch: sport === 'tennis' ? 40 : 12, miTemps: 0, pause: 3,
      pauseDej: false, debutPause: '12:00', finPause: '13:30', debloque: false, nouvelleEquipe: '',
    };
  }
  function ajouterEquipe(nom) {
    const b = S.brouillon;
    nom = (nom || '').trim();
    if (!nom) return false;
    if (b.equipes.some((e) => e.nom.toLowerCase() === nom.toLowerCase())) { toast(tr('Ce nom est déjà pris.', 'This name is already taken.')); return false; }
    if (b.equipes.length >= LIMITE_GRATUITE && !S.pro && !b.debloque) { aller('paywall', { raison: 'equipes' }); return false; }
    b.equipes.push({ id: uid(), nom });
    if (b.equipes.length >= 3) decouvrir('equipes');
    return true;
  }
  function genererTournoi(b) {
    const t = {
      ...b, nouvelleEquipe: undefined, id: uid(), code: genererCodeAcces(), invite: genererCodeAcces().toUpperCase(),
      coorgs: [], matchs: [], resultats: [], poules: [],
      equipes: b.equipes.map((e) => ({ ...e })), qualifies: b.qualifies,
    };
    const reg = reglagesDe(t);
    if (t.format === 'elimination_directe') {
      t.matchs = genererTourAPartirDeListe(melanger(t.equipes), reg);
    } else {
      const nbPoules = Math.min(t.nbPoules, Math.max(1, Math.floor(t.equipes.length / 2)));
      t.nbPoules = nbPoules;
      const poules = repartirEnPoules(t.equipes, nbPoules).map((eq, i) => ({ nom: `Poule ${String.fromCharCode(65 + i)}`, equipes: eq }));
      t.poules = poules.map((p) => ({ nom: p.nom, equipeIds: p.equipes.map((e) => e.id) }));
      t.qualifies = Math.min(t.qualifies, Math.min(...poules.map((p) => p.equipes.length)));
      t.matchs = genererCalendrierPoules(poules, reg);
    }
    resultatsExempts(t);
    return t;
  }
  function resultatsExempts(t) {
    for (const m of t.matchs) if (!m.equipe_b_id && !resultatDe(t, m.id)) t.resultats.push({ match_id: m.id, score_a: 1, score_b: 0, statut: 'termine' });
  }
  function phaseSuivante() {
    const t = T();
    const a = analyser(t);
    const reg = apresDernierMatch(t);
    let nouveaux = [];
    if (a.action === 'phaseFinale') {
      nouveaux = genererPhaseFinaleDepuisPoules(classementsPoules(t), t.qualifies, reg);
    } else if (a.action === 'tourSuivant') {
      const precedents = a.dernierKO.matchs.map((m) => avecRes(t, m));
      const gagnants = precedents.map((m) => ({ id: idEquipeGagnante(m) }));
      if (a.dernierKO.nom === 'Demi-finale' && t.troisieme && precedents.every((m) => m.equipe_b_id)) {
        // 3e place puis finale : en parallèle s'il y a 2 terrains, sinon la finale en dernier
        const perdants = precedents.map((m) => ({ id: m.equipe_a_id === idEquipeGagnante(m) ? m.equipe_b_id : m.equipe_a_id }));
        nouveaux = assignerCreneauxEtTerrains([
          { equipeA: perdants[0], equipeB: perdants[1], phase: NOM_3E },
          { equipeA: gagnants[0], equipeB: gagnants[1], phase: 'Finale' },
        ], reg);
      } else {
        nouveaux = genererTourAPartirDeListe(rangerParTeteDeSerie(gagnants, qualifiesParTeteDeSerie(classementsPoules(t), t.qualifies)), reg);
      }
    }
    if (!nouveaux.length) return;
    t.matchs.push(...nouveaux);
    resultatsExempts(t);
    S.vue = 'poule';
    S.onglet = 'matchs';
    decouvrir('finale');
    maj({ diffuser: true });
    vibrer(20);
    toast(tr(`Tour généré : ${libellePhase(nouveaux[nouveaux.length - 1].phase)}`, `Round generated: ${libellePhase(nouveaux[nouveaux.length - 1].phase)}`));
    const ecran = $('.sim-ecran:last-child', pile);
    if (ecran) ecran.scrollTo({ top: 0, behavior: mouvementReduit ? 'auto' : 'smooth' });
  }
  function scoreAleatoire(t, poule) {
    const sp = t.sport;
    if (sp === 'tennis') { const g = t.setsGagnants; const p = Math.floor(Math.random() * g); return Math.random() < 0.5 ? [g, p] : [p, g]; }
    const r = () => {
      if (sp === 'basketball') return 30 + Math.floor(Math.random() * 40);
      if (sp === 'rugby') return [0, 3, 5, 7, 10, 12, 14, 17, 19, 21, 24][Math.floor(Math.random() * 11)];
      if (sp === 'handball') return 8 + Math.floor(Math.random() * 14);
      return Math.floor(Math.random() * 4);
    };
    let a = r(); let b = r();
    if (!poule && sp === 'basketball' && a === b) a++;
    return [a, b];
  }
  function simulerPhase() {
    const t = T();
    const a = analyser(t);
    let n = 0;
    for (const m of t.matchs) {
      if (!m.equipe_b_id || estFini(t, m) || a.verrouillees.has(m.phase)) continue;
      const poule = estPhaseDePoule(m.phase);
      const [sa, sb] = scoreAleatoire(t, poule);
      const r = { match_id: m.id, score_a: sa, score_b: sb, statut: 'termine', bonus_a: 0, bonus_b: 0 };
      if (!poule && sa === sb) { r.score_tab_a = 5; r.score_tab_b = 3 + Math.floor(Math.random() * 2); if (Math.random() < 0.5) [r.score_tab_a, r.score_tab_b] = [r.score_tab_b, r.score_tab_a]; }
      t.resultats = t.resultats.filter((x) => x.match_id !== m.id);
      t.resultats.push(r);
      matchsMisAJour.add(m.id);
      n++;
    }
    decouvrir('score');
    maj({ diffuser: true });
    matchsMisAJour = new Set();
    toast(tr(`${n} résultats simulés`, `${n} results simulated`));
  }

  // Saisie d'un score (tournoi/[id]/saisie.js)
  let saisie = null;
  let dernierModifie = null;
  function ouvrirSaisie(matchId) {
    const t = T();
    const m = t.matchs.find((x) => x.id === matchId);
    if (S.role === 'coorg' && !(t.coorgs.find((c) => c.moi) || {}).peut_saisir_scores) { toast(tr('Tu n\'as pas le droit de saisir les scores.', 'You are not allowed to enter scores.')); return; }
    const r = resultatDe(t, matchId);
    saisie = {
      matchId, a: r ? r.score_a : 0, b: r ? r.score_b : 0, tabA: (r && r.score_tab_a) || 0, tabB: (r && r.score_tab_b) || 0,
      bonusA: (r && r.bonus_a) || 0, bonusB: (r && r.bonus_b) || 0, statut: r ? r.statut : 'termine', existe: !!r, erreur: '',
      poule: estPhaseDePoule(m.phase),
    };
    ouvrirFeuille(htmlSaisie);
  }
  function htmlSaisie() {
    const t = T();
    const m = t.matchs.find((x) => x.id === saisie.matchId);
    const sp = infosSport(t.sport);
    const unite = iL(sp.score);
    const compteur = (cle, nom, petit) => `<div class="s-compteur ${petit ? 'petit' : ''}"><div class="nom">${esc(nom)}</div><div class="val ${dernierModifie === cle ? 'bump' : ''}">${saisie[cle]}</div><div class="ctrl"><button data-a="score" data-champ="${cle}" data-v="-1" aria-label="moins">${ico('moins')}</button><button class="plus" data-a="score" data-champ="${cle}" data-v="1" aria-label="plus">${ico('plus')}</button></div></div>`;
    const nulKO = !saisie.poule && saisie.a === saisie.b && t.sport !== 'tennis';
    const html = `<p class="s-eyebrow">${esc(libellePhase(m.phase))}${m.terrain ? ` · ${tr('terrain', 'field')} ${m.terrain}` : ''} · ${formaterHoraire(m.horaire)}</p>
      <h3 class="s-titre" style="font-size:28px">${tr('Saisir le score', 'Enter the score')}</h3>
      <p class="s-aide">${t.sport === 'tennis' ? tr(`En ${unite}, ${t.setsGagnants} sets gagnants`, `In ${unite}, ${t.setsGagnants} winning sets`) : tr(`En ${unite}`, `In ${unite}`)}</p>
      <div class="s-compteurs">${compteur('a', nomEquipe(t, m.equipe_a_id))}<span class="s-tiret">–</span>${compteur('b', nomEquipe(t, m.equipe_b_id))}</div>
      ${nulKO ? `<div class="s-bloc" style="padding:10px 12px"><p class="s-eyebrow" style="font-size:16px;text-align:center">${iL(sp.tab)}</p><p class="s-aide" style="text-align:center">${tr('Égalité en élimination directe : indique un départage différent pour désigner le vainqueur.', 'Draw in a knockout: enter a different tiebreak score to set the winner.')}</p><div class="s-compteurs">${compteur('tabA', nomEquipe(t, m.equipe_a_id), true)}<span class="s-tiret" style="padding-top:40px">–</span>${compteur('tabB', nomEquipe(t, m.equipe_b_id), true)}</div></div>` : ''}
      ${t.pointsBonus && saisie.poule ? `<div class="s-bloc">${interrupteur('bonusA', `${tr('Point bonus', 'Bonus point')} · ${esc(nomEquipe(t, m.equipe_a_id))}`, saisie.bonusA)}${interrupteur('bonusB', `${tr('Point bonus', 'Bonus point')} · ${esc(nomEquipe(t, m.equipe_b_id))}`, saisie.bonusB)}</div>` : ''}
      <div class="s-statut"><button class="${saisie.statut === 'en_cours' ? 'actif' : ''}" data-a="statut" data-v="en_cours">● ${tr('En cours', 'Live')}</button><button class="${saisie.statut === 'termine' ? 'actif' : ''}" data-a="statut" data-v="termine">${tr('Terminé', 'Finished')}</button></div>
      <p class="s-erreur">${esc(saisie.erreur)}</p>
      <button class="s-btn" data-a="enregistrer-score">${tr('Enregistrer', 'Save')}</button>
      ${saisie.existe ? `<button class="s-lien rouge" data-a="effacer-score">${tr('Effacer le résultat', 'Clear the result')}</button>` : `<button class="s-lien attenue" data-a="fermer-feuille">${tr('Annuler', 'Cancel')}</button>`}`;
    dernierModifie = null;
    return html;
  }
  function enregistrerScore() {
    const t = T();
    const s = saisie;
    if (s.statut === 'termine') {
      if (t.sport === 'tennis') {
        const g = Number(t.setsGagnants);
        if (Math.max(s.a, s.b) !== g || Math.min(s.a, s.b) >= g) { s.erreur = tr(`Un joueur doit remporter exactement ${g} sets.`, `One side must win exactly ${g} sets.`); rafraichirFeuille(); return; }
      } else if (!s.poule && s.a === s.b && s.tabA === s.tabB) {
        s.erreur = tr('Indique un départage différent pour désigner le vainqueur.', 'Enter a different tiebreak score to set the winner.'); rafraichirFeuille(); return;
      }
    }
    const r = { match_id: s.matchId, score_a: s.a, score_b: s.b, statut: s.statut, bonus_a: s.bonusA ? 1 : 0, bonus_b: s.bonusB ? 1 : 0 };
    if (!s.poule && s.a === s.b) { r.score_tab_a = s.tabA; r.score_tab_b = s.tabB; }
    t.resultats = t.resultats.filter((x) => x.match_id !== s.matchId);
    t.resultats.push(r);
    matchsMisAJour.add(s.matchId);
    fermerFeuille();
    decouvrir('score');
    vibrer(15);
    maj({ diffuser: true });
    matchsMisAJour = new Set();
    toast(s.statut === 'en_cours' ? tr('Score en direct envoyé aux spectateurs', 'Live score sent to spectators') : tr('Résultat enregistré', 'Result saved'));
  }

  function dessinerQR(el) {
    if (!el || !T()) return;
    el.innerHTML = '';
    const url = lienSpectateur();
    if (window.QRCode) {
      try { new window.QRCode(el, { text: url, width: 204, height: 204, colorDark: '#0b0f18', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M }); return; } catch (e) { /* repli ci-dessous */ }
    }
    el.innerHTML = `<p style="color:#0b0f18;text-align:center;font-weight:600">${tr('QR code indisponible hors ligne', 'QR code unavailable offline')}</p>`;
  }
  const lienSpectateur = () => `${location.href.split('#')[0]}#suivi/${T().code}`;
  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); toast(tr('Copié !', 'Copied!')); } catch (e) { toast(texte); }
  }

  function exporterPDF() {
    const t = T();
    const a = analyser(t);
    const lignes = (ms) => ms.map((m) => `<tr><td>${formaterHoraire(m.horaire)}</td><td>${m.terrain ? `${tr('Terrain', 'Field')} ${m.terrain}` : '—'}</td><td>${esc(nomEquipe(t, m.equipe_a_id))}</td><td>${m.equipe_b_id ? esc(nomEquipe(t, m.equipe_b_id)) : tr('Exempt', 'Bye')}</td><td>${(() => { const r = resultatDe(t, m.id); return r && m.equipe_b_id ? `${r.score_a} - ${r.score_b}` : ''; })()}</td></tr>`).join('');
    $('#impression').innerHTML = `<h1>${esc(t.nom)}</h1><p class="meta">${formaterDate(t.date)} · ${nomSport(t.sport)} · ${t.equipes.length} ${motEquipes(t)} · ${tr('Code d\'accès', 'Access code')} ${t.code.toUpperCase()}</p>
      ${(t.poules || []).map((p) => `<p><b>${esc(libellePhase(p.nom))}</b> : ${p.equipeIds.map((id) => esc(nomEquipe(t, id))).join(', ')}</p>`).join('')}
      ${a.groupes.map((g) => `<h2>${esc(libellePhase(g.nom))}</h2><table><thead><tr><th>${tr('Horaire', 'Time')}</th><th>${tr('Terrain', 'Field')}</th><th>${tr('Équipe A', 'Team A')}</th><th>${tr('Équipe B', 'Team B')}</th><th>Score</th></tr></thead><tbody>${lignes(g.matchs)}</tbody></table>`).join('')}
      <p class="pied">${tr('Programme généré par OLYMPIAD', 'Schedule generated by OLYMPIAD')} · ${tr('Suis le tournoi en direct avec le code', 'Follow the tournament live with code')} ${t.code.toUpperCase()}</p>`;
    decouvrir('pdf');
    setTimeout(() => window.print(), 50);
  }

  // ---------------------------------------------------------------------
  // Grand écran (tournoi/[id]/affichage.js)
  // ---------------------------------------------------------------------
  const ge = $('#grand-ecran');
  let minuteurHorloge;
  function ouvrirGrandEcran() {
    if (!T()) return;
    ge.classList.add('ouvert');
    document.body.style.overflow = 'hidden';
    rendreGrandEcran();
    decouvrir('grand');
    try { if (ge.requestFullscreen && window.innerWidth > 900) ge.requestFullscreen().catch(() => {}); } catch (e) { /* rien */ }
    clearInterval(minuteurHorloge);
    minuteurHorloge = setInterval(() => { const h = $('.ge-horloge', ge); if (h) { const d = new Date(); h.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; } }, 1000);
    $('.ge-fermer', ge).focus();
  }
  function fermerGrandEcran() {
    ge.classList.remove('ouvert');
    document.body.style.overflow = '';
    clearInterval(minuteurHorloge);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* rien */ }
  }
  function rendreGrandEcran() {
    if (!ge.classList.contains('ouvert') || !T()) return;
    const t = T();
    const a = analyser(t);
    const d = new Date();
    const ligne = (m) => {
      const r = resultatDe(t, m.id);
      const live = r && r.statut === 'en_cours';
      return `<div class="ge-match ${live ? 'live' : ''} ${matchsMisAJour.has(m.id) ? 'maj' : ''}"><div class="eq">${esc(nomEquipe(t, m.equipe_a_id))} · ${esc(nomEquipe(t, m.equipe_b_id))}<small>${live ? `<span class="s-badge-live">${tr('EN DIRECT', 'LIVE')}</span> · ` : ''}${esc(libellePhase(m.phase))} · ${m.terrain ? `${tr('terrain', 'field')} ${m.terrain} · ` : ''}${formaterHoraire(m.horaire)}</small></div><span class="sc">${r ? `${r.score_a}-${r.score_b}` : `<small style="font-family:var(--corps);font-size:15px">${tr('À venir', 'Upcoming')}</small>`}</span></div>`;
    };
    const jouables = t.matchs.filter((m) => m.equipe_b_id);
    const live = jouables.filter((m) => (resultatDe(t, m.id) || {}).statut === 'en_cours');
    const avenir = jouables.filter((m) => !resultatDe(t, m.id)).sort((x, y) => new Date(x.horaire) - new Date(y.horaire)).slice(0, 6);
    const derniers = jouables.filter((m) => estFini(t, m)).sort((x, y) => new Date(y.horaire) - new Date(x.horaire)).slice(0, 8);
    const cp = classementsPoules(t);
    let colClassement = a.podium ? podiumHTML(t, a.podium) : '';
    colClassement += cp.map((p) => tableClassement(t, p, t.format === 'mixte' ? t.qualifies : 0)).join('');
    if (!cp.length && !a.podium) colClassement += a.ko.map((g) => `<p class="s-eyebrow">${esc(libellePhase(g.nom))}</p>${g.matchs.filter((m) => m.equipe_b_id).map(ligne).join('')}`).join('');
    ge.innerHTML = `<div class="ge-entete">${marque()}<h2>${esc(t.nom)}</h2><span class="ge-horloge">${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</span><div class="ge-code">${tr('Suis le tournoi avec le code', 'Follow with code')}<b>${t.code.toUpperCase()}</b></div><button class="ge-fermer" data-ge="fermer">${tr('Quitter', 'Exit')} (Esc)</button></div>
      <div class="ge-grille">
        <div class="ge-col"><h3>${a.podium ? tr('Résultats', 'Results') : tr('Classements', 'Standings')}</h3>${colClassement || `<p>${tr('À venir', 'Upcoming')}</p>`}</div>
        <div class="ge-col"><h3>${tr('En cours et à venir', 'Live and upcoming')}</h3>${[...live, ...avenir].map(ligne).join('') || `<p style="color:#808693">${tr('Tous les matchs sont joués.', 'All matches have been played.')}</p>`}</div>
        <div class="ge-col"><h3>${tr('Derniers résultats', 'Latest results')}</h3>${derniers.map(ligne).join('') || `<p style="color:#808693">${tr('Aucun résultat pour l\'instant.', 'No results yet.')}</p>`}</div>
      </div>`;
  }
  ge.addEventListener('click', (e) => { if (e.target.closest('[data-ge="fermer"]')) fermerGrandEcran(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (ge.classList.contains('ouvert')) fermerGrandEcran(); else if (feuilleRendu) fermerFeuille(); }
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && ge.classList.contains('ouvert')) { /* reste ouvert en fenêtre */ } });

  // ---------------------------------------------------------------------
  // Tournoi de démonstration
  // ---------------------------------------------------------------------
  function chargerDemo() {
    const b = nouveauBrouillon('football');
    b.nom = tr('Tournoi U13 de printemps', 'U13 Spring Cup');
    b.equipes = EXEMPLES.slice(0, 8).map((nom) => ({ id: uid(), nom }));
    const t = genererTournoi(b);
    const jouables = [...t.matchs].sort((x, y) => new Date(x.horaire) - new Date(y.horaire));
    const nbJoues = Math.floor(jouables.length * 0.55);
    jouables.forEach((m, i) => {
      if (i < nbJoues) { const [a, c] = scoreAleatoire(t, true); t.resultats.push({ match_id: m.id, score_a: a, score_b: c, statut: 'termine', bonus_a: 0, bonus_b: 0 }); }
      else if (i < nbJoues + 2) t.resultats.push({ match_id: m.id, score_a: Math.floor(Math.random() * 2), score_b: Math.floor(Math.random() * 2), statut: 'en_cours', bonus_a: 0, bonus_b: 0 });
    });
    t.demo = true;
    S.tournoi = t;
    S.role = 'orga';
    S.brouillon = null;
    enregistrer();
    diffuser();
  }

  // ---------------------------------------------------------------------
  // Gestion des clics et des champs du simulateur
  // ---------------------------------------------------------------------
  const sim = $('#sim');
  sim.addEventListener('click', (e) => {
    if (e.target.closest('#sim-voile')) { fermerFeuille(); return; }
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const a = el.dataset.a;
    const v = el.dataset.v;
    const champ = el.dataset.champ;
    const t = T();
    switch (a) {
      case 'retour': retour(); break;
      case 'fermer-feuille': fermerFeuille(); break;
      case 'confirmer': { const f = actionConfirmee; actionConfirmee = null; fermerFeuille(); if (f) f(); break; }
      case 'langue': changerLangue(); decouvrir('profil'); break;
      case 'profil': aller('profil'); break;
      case 'connexion': aller('connexion'); break;
      case 'inscription': aller('inscription'); break;
      case 'mdp-oublie': aller('mdpOublie'); break;
      case 'voir-mdp': { const i = $('[data-champ="mdp"]', el.parentElement); if (i) i.type = i.type === 'password' ? 'text' : 'password'; break; }
      case 'se-connecter': {
        const mail = (S.profil.email || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(mail)) { toast(tr('Saisis une adresse e-mail valide.', 'Enter a valid email address.')); break; }
        S.connecte = true; enregistrer(); reinitialiserVers('accueil'); toast(tr('Connecté·e (simulation)', 'Signed in (simulation)'));
        break;
      }
      case 'envoyer-lien': toast(tr('Lien envoyé (simulation)', 'Link sent (simulation)')); retour(); break;
      case 'deconnexion': S.connecte = false; enregistrer(); reinitialiserVers('accueil'); break;
      case 'supprimer-compte':
        confirmer(tr('Supprimer ton compte ?', 'Delete your account?'), tr('Tes tournois, équipes, résultats et ta photo seront supprimés définitivement. Pense à résilier l\'abonnement Pro dans le store.', 'Your tournaments, teams, results and photo will be permanently deleted. Remember to cancel Pro in the store.'), tr('Supprimer définitivement', 'Delete permanently'), () => {
          confirmer(tr('Vraiment sûr·e ?', 'Really sure?'), tr('Cette action est irréversible.', 'This cannot be undone.'), tr('Oui, supprimer', 'Yes, delete'), () => {
            Object.assign(S, { tournoi: null, brouillon: null, pro: false, connecte: false, suivis: [], profil: { prenom: '', nom: '', club: '', email: '', photo: null } });
            enregistrer(); diffuser(); reinitialiserVers('accueil'); toast(tr('Compte supprimé (simulation)', 'Account deleted (simulation)'));
          }, true);
        }, true);
        break;
      case 'creer':
        if (t && S.role === 'orga') {
          confirmer(tr('Nouveau tournoi ?', 'New tournament?'), tr('Le simulateur garde un seul tournoi : celui en cours sera remplacé à la génération du calendrier.', 'The simulator keeps one tournament: the current one will be replaced when the schedule is generated.'), tr('Continuer', 'Continue'), () => aller('sport'));
        } else aller('sport');
        break;
      case 'choisir-sport':
        S.brouillon = nouveauBrouillon(v);
        reglagesOuverts = false;
        decouvrir('sport');
        enregistrer();
        aller('creer');
        break;
      case 'choisir': {
        const b = ecranCourant.ecran === 'creer' || ecranCourant.ecran === 'equipes' ? S.brouillon : null;
        if (!b) break;
        b[champ] = v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? Number(v) : v;
        if (champ === 'format' && v === 'elimination_directe' && S.vue === 'terrain') S.vue = 'poule';
        enregistrer(); rafraichir();
        break;
      }
      case 'replier':
        if (v === 'reglages') reglagesOuverts = !reglagesOuverts; else horairesOuverts = !horairesOuverts;
        rafraichir();
        break;
      case 'vers-equipes': {
        const b = S.brouillon;
        if (!b.nom.trim() || !b.date) { const er = $('#erreur-creer', sim); if (er) er.textContent = tr('Indique le nom et la date du tournoi.', 'Enter the tournament name and date.'); vibrer(30); break; }
        decouvrir('creer'); aller('equipes');
        break;
      }
      case 'ajouter-equipe': {
        const b = S.brouillon;
        if (ajouterEquipe(b.nouvelleEquipe)) { b.nouvelleEquipe = ''; enregistrer(); rafraichir(); const i = $('[data-champ="nouvelleEquipe"]', sim); if (i) i.focus({ preventScroll: true }); }
        break;
      }
      case 'remplir-equipes': {
        const b = S.brouillon;
        const noms = b.sport === 'tennis' ? EXEMPLES_TENNIS : EXEMPLES;
        const libres = noms.filter((nom) => !b.equipes.some((e) => e.nom === nom));
        const max = S.pro || b.debloque ? 8 : Math.max(0, Math.min(8, LIMITE_GRATUITE - b.equipes.length));
        libres.slice(0, max || 1).forEach((nom) => ajouterEquipe(nom));
        enregistrer(); rafraichir();
        break;
      }
      case 'retirer-equipe': {
        const li = el.closest('.s-equipe');
        const fin = () => { S.brouillon.equipes = S.brouillon.equipes.filter((x) => x.id !== v); enregistrer(); rafraichir(); };
        if (li && !mouvementReduit) { li.classList.add('sort'); setTimeout(fin, 230); } else fin();
        break;
      }
      case 'pas': {
        const b = S.brouillon;
        const min = Number(el.dataset.min);
        const max = Number(el.dataset.max);
        b[champ] = Math.max(min, Math.min(max, Math.min(Number(b[champ]), max) + Number(v)));
        vibrer(5); enregistrer(); rafraichir();
        break;
      }
      case 'basculer': {
        if (feuilleRendu && saisie && (champ === 'bonusA' || champ === 'bonusB')) { saisie[champ] = saisie[champ] ? 0 : 1; rafraichirFeuille(); break; }
        if (champ === 'memoriser') { S.memoriser = !S.memoriser; rafraichir(); break; }
        const b = S.brouillon;
        if (b) { b[champ] = !b[champ]; enregistrer(); rafraichir(); }
        break;
      }
      case 'generer': {
        const b = S.brouillon;
        if (b.equipes.length < 2) break;
        decouvrir('equipes');
        aller('chargement');
        setTimeout(() => {
          S.tournoi = genererTournoi(b);
          S.role = 'orga';
          S.brouillon = null;
          S.onglet = 'matchs';
          S.vue = 'poule';
          decouvrir('calendrier');
          enregistrer(); diffuser();
          historique = [{ ecran: 'accueil', params: {} }];
          ecranCourant = { ecran: 'calendrier', params: {} };
          rendre('avant');
          vibrer(20);
          toast(tr(`Calendrier généré : ${S.tournoi.matchs.filter((m) => m.equipe_b_id).length} matchs`, `Schedule generated: ${S.tournoi.matchs.filter((m) => m.equipe_b_id).length} matches`));
        }, mouvementReduit ? 50 : 750);
        break;
      }
      case 'ouvrir-tournoi': S.role = S.role === 'coorg' ? 'coorg' : 'orga'; aller('calendrier'); break;
      case 'ouvrir-suivi': aller('suivi'); decouvrir('spectateur'); break;
      case 'vers-suivi': aller('suivi'); decouvrir('spectateur'); break;
      case 'onglet':
        if (champ === 'theme') { choisirTheme(v); decouvrir('profil'); rafraichir(); break; }
        if (champ === 'langue') { changerLangue(v); decouvrir('profil'); break; }
        S[champ] = v;
        if (v === 'classement') decouvrir('classement');
        rafraichir();
        break;
      case 'vue': S.vue = v; if (v === 'terrain') decouvrir('vue'); enregistrer(); rafraichir(); break;
      case 'saisir': ouvrirSaisie(v); break;
      case 'verrou': toast(tr('Phase suivante déjà lancée : résultat verrouillé.', 'Next stage already started: result locked.')); break;
      case 'score': {
        const max = T().sport === 'tennis' && (champ === 'a' || champ === 'b') ? Number(T().setsGagnants) : 999;
        saisie[champ] = Math.max(0, Math.min(max, saisie[champ] + Number(v)));
        saisie.erreur = '';
        dernierModifie = champ;
        vibrer(6);
        rafraichirFeuille();
        break;
      }
      case 'statut': saisie.statut = v; rafraichirFeuille(); break;
      case 'enregistrer-score': enregistrerScore(); break;
      case 'effacer-score':
        t.resultats = t.resultats.filter((x) => x.match_id !== saisie.matchId);
        fermerFeuille(); maj({ diffuser: true }); toast(tr('Résultat effacé', 'Result cleared'));
        break;
      case 'simuler': simulerPhase(); break;
      case 'phase-suivante': phaseSuivante(); break;
      case 'qrcode': aller('qrcode'); decouvrir('qr'); break;
      case 'copier': copier(v); break;
      case 'partager-lien': {
        const url = lienSpectateur();
        if (navigator.share) navigator.share({ title: t.nom, text: tr('Suis le tournoi en direct sur OLYMPIAD', 'Follow the tournament live on OLYMPIAD'), url }).catch(() => {});
        else copier(url);
        break;
      }
      case 'grand-ecran': ouvrirGrandEcran(); break;
      case 'coorgs': if (!peutPremium(t)) aller('paywall', { raison: 'coorgs' }); else { aller('coorgs'); decouvrir('coorg'); } break;
      case 'pdf': if (!peutPremium(t)) aller('paywall', { raison: 'pdf' }); else exporterPDF(); break;
      case 'paywall': aller('paywall', { raison: 'defaut' }); break;
      case 'simuler-coorg': {
        const noms = ['Camille Roux', 'Lucas Faure', 'Inès Garnier', 'Hugo Blanc', 'Léa Chevalier', 'Nathan Morel'];
        const nom = noms.find((n) => !t.coorgs.some((c) => c.nom === n)) || `${tr('Bénévole', 'Volunteer')} ${t.coorgs.length + 1}`;
        t.coorgs.push({ id: uid(), nom, peut_saisir_scores: true, peut_gerer_le_tournoi: false, peut_supprimer_le_tournoi: false });
        decouvrir('coorg'); maj({ diffuser: true }); toast(tr(`${nom} a rejoint l'organisation`, `${nom} joined the organizing team`));
        break;
      }
      case 'retirer-coorg': t.coorgs = t.coorgs.filter((c) => c.id !== v); maj({ diffuser: true }); break;
      case 'droit': { const c = t.coorgs.find((x) => x.id === v); if (c) { c[champ] = !c[champ]; maj({ diffuser: true }); } break; }
      case 'acheter': {
        const nom = v === 'pass' ? tr('Pass Tournoi', 'Tournament Pass') : 'OLYMPIAD Pro';
        confirmer(tr('Confirmer l\'achat', 'Confirm purchase'), tr(`Simulation de l'achat « ${nom} » : aucun paiement n'est effectué.`, `Simulated purchase of “${nom}”: no payment is made.`), tr('Simuler l\'achat', 'Simulate purchase'), () => {
          if (v === 'pass') {
            if (ecranPrecedentEst('equipes') && S.brouillon) S.brouillon.debloque = true;
            else if (T()) T().debloque = true;
            else S.passEnAttente = true;
          } else S.pro = true;
          maj({ diffuser: true });
          retour();
          toast(v === 'pass' ? tr('Tournoi débloqué !', 'Tournament unlocked!') : tr('Bienvenue dans OLYMPIAD Pro !', 'Welcome to OLYMPIAD Pro!'));
        });
        break;
      }
      case 'restaurer': toast(S.pro ? tr('Achats restaurés', 'Purchases restored') : tr('Aucun achat à restaurer', 'No purchases to restore')); break;
      case 'utiliser-pass': if (T()) { T().debloque = true; S.passEnAttente = false; maj({ diffuser: true }); retour(); toast(tr('Tournoi débloqué !', 'Tournament unlocked!')); } break;
      case 'annuler-pro':
        confirmer(tr('Résilier Pro ?', 'Cancel Pro?'), tr('Dans l\'app, la résiliation se fait dans les réglages de l\'App Store ou de Google Play. Ici, on simule.', 'In the app, cancellation happens in App Store or Google Play settings. Here, we simulate it.'), tr('Simuler la résiliation', 'Simulate cancellation'), () => { S.pro = false; maj(); });
        break;
      case 'rejoindre': aller('rejoindre', {}); break;
      case 'rejoindre-orga': aller('rejoindreOrga'); break;
      case 'scanner': {
        if (!t) { const er = $('#erreur-code', sim); if (er) er.textContent = tr('Aucun tournoi à scanner : crée-en un ou charge le tournoi de démo.', 'No tournament to scan: create one or load the demo.'); break; }
        const zone = el; zone.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => { vibrer(25); rejoindreAvecCode(t.code); }, mouvementReduit ? 10 : 900);
        break;
      }
      case 'valider-code': rejoindreAvecCode(($('[data-champ="code"]', sim) || {}).value || ''); break;
      case 'valider-invite': {
        const code = (($('[data-champ="codeInvite"]', sim) || {}).value || '').trim().toUpperCase();
        if (t && code === t.invite) {
          if (!t.coorgs.some((c) => c.moi)) t.coorgs.push({ id: uid(), nom: S.profil.prenom || tr('Moi', 'Me'), moi: true, peut_saisir_scores: true, peut_gerer_le_tournoi: false, peut_supprimer_le_tournoi: false });
          S.role = 'coorg';
          decouvrir('coorg');
          maj({ diffuser: true });
          reinitialiserVers('calendrier');
          toast(tr('Tu fais partie de l\'organisation', 'You joined the organizing team'));
        } else { const er = $('#erreur-invite', sim); if (er) er.textContent = tr('Ce code d\'invitation ne correspond à aucun tournoi.', 'This invitation code matches no tournament.'); vibrer(30); }
        break;
      }
      case 'signaler': toast(tr('Merci, le signalement a été transmis (simulation)', 'Thanks, report sent (simulation)')); break;
      case 'ne-plus-suivre': S.suivis = S.suivis.filter((c) => c !== t.code); enregistrer(); reinitialiserVers('accueil'); break;
      default: break;
    }
  });
  const ecranPrecedentEst = (nom) => historique.length > 0 && historique[historique.length - 1].ecran === nom;
  function rejoindreAvecCode(code) {
    code = code.trim().toLowerCase();
    const t = T();
    if (t && code === t.code) {
      if (!S.suivis.includes(t.code)) S.suivis.push(t.code);
      S.ongletSuivi = 'classement';
      decouvrir('spectateur');
      enregistrer();
      historique = [{ ecran: 'accueil', params: {} }];
      ecranCourant = { ecran: 'suivi', params: {} };
      rendre('avant');
    } else {
      const er = $('#erreur-code', sim);
      if (er) er.textContent = tr('Aucun tournoi ne correspond à ce code.', 'No tournament matches this code.');
      vibrer(30);
    }
  }
  sim.addEventListener('input', (e) => {
    const el = e.target;
    const champ = el.dataset && el.dataset.champ;
    if (!champ) return;
    if (['prenom', 'nomProfil', 'club', 'email'].includes(champ)) {
      S.profil[champ === 'nomProfil' ? 'nom' : champ] = el.value;
      decouvrir('profil');
      enregistrer();
      return;
    }
    if (champ === 'mdp' || champ === 'code' || champ === 'codeInvite') return; // jamais enregistrés
    const b = S.brouillon;
    if (!b) return;
    b[champ] = el.type === 'number' ? Math.max(0, Number(el.value) || 0) : el.value;
    enregistrer();
    if (['heureDebut', 'dureeMatch', 'miTemps', 'pause', 'debutPause', 'finPause'].includes(champ)) {
      const est = $$('.s-aide', sim).find((p) => p.textContent.startsWith('⏱'));
      if (est) est.innerHTML = estimation(b);
    }
  });
  sim.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.champ === 'photo' && el.files && el.files[0]) {
      const lecteur = new FileReader();
      lecteur.onload = () => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 240; c.height = 240;
          const ctx = c.getContext('2d');
          const s = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240);
          S.profil.photo = c.toDataURL('image/jpeg', 0.8);
          decouvrir('profil'); enregistrer(); rafraichir();
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(el.files[0]);
    }
  });
  sim.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const champ = e.target.dataset && e.target.dataset.champ;
    if (champ === 'nouvelleEquipe') { e.preventDefault(); $('[data-a="ajouter-equipe"]', sim).click(); }
    if (champ === 'code') { e.preventDefault(); rejoindreAvecCode(e.target.value); }
  });

  // Heure de la barre d'état du téléphone
  function majHeure() { const d = new Date(); $('#sim-heure').textContent = `${d.getHours()}:${pad(d.getMinutes())}`; }
  majHeure();
  setInterval(majHeure, 20000);

  // Missions : un clic emmène à l'écran correspondant
  function allerMission(id) {
    const besoinTournoi = ['score', 'vue', 'classement', 'finale', 'qr', 'spectateur', 'grand', 'coorg', 'pdf', 'calendrier'];
    if (besoinTournoi.includes(id) && !T()) chargerDemo();
    if (['coorg', 'pdf'].includes(id) && T() && !peutPremium(T())) { reinitialiserVers('calendrier'); aller('paywall', { raison: id === 'pdf' ? 'pdf' : 'coorgs' }); }
    else switch (id) {
      case 'sport': reinitialiserVers('sport'); break;
      case 'creer': S.brouillon = S.brouillon || nouveauBrouillon('football'); historique = [{ ecran: 'accueil' }, { ecran: 'sport' }]; ecranCourant = { ecran: 'creer', params: {} }; rendre('avant'); break;
      case 'equipes': S.brouillon = S.brouillon || { ...nouveauBrouillon('football'), nom: tr('Mon tournoi', 'My tournament') }; historique = [{ ecran: 'accueil' }, { ecran: 'sport' }, { ecran: 'creer' }]; ecranCourant = { ecran: 'equipes', params: {} }; rendre('avant'); break;
      case 'classement': S.onglet = 'classement'; reinitialiserVers('calendrier'); decouvrir('classement'); break;
      case 'vue': S.onglet = 'matchs'; S.vue = 'terrain'; reinitialiserVers('calendrier'); decouvrir('vue'); break;
      case 'qr': reinitialiserVers('calendrier'); aller('qrcode'); decouvrir('qr'); break;
      case 'spectateur': S.ongletSuivi = 'classement'; reinitialiserVers('suivi'); decouvrir('spectateur'); break;
      case 'grand': reinitialiserVers('calendrier'); ouvrirGrandEcran(); break;
      case 'coorg': reinitialiserVers('calendrier'); aller('coorgs'); decouvrir('coorg'); break;
      case 'pdf': reinitialiserVers('calendrier'); exporterPDF(); break;
      case 'profil': reinitialiserVers('profil'); break;
      default: S.onglet = 'matchs'; reinitialiserVers('calendrier'); break;
    }
    if (window.innerWidth < 1080) $('.telephone-sim').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  }
  $('#missions').addEventListener('click', (e) => { const b = e.target.closest('[data-mission]'); if (b) allerMission(b.dataset.mission); });
  $$('[data-demo]').forEach((b) => b.addEventListener('click', () => {
    const charger = () => {
      chargerDemo();
      if (b.dataset.demo === 'suivi') { S.ongletSuivi = 'calendrier'; reinitialiserVers('suivi'); } else { S.onglet = 'matchs'; reinitialiserVers('calendrier'); }
      toast(tr('Tournoi de démo chargé', 'Demo tournament loaded'));
    };
    $('#essayer').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth' });
    // Le simulateur ne garde qu'un tournoi : on prévient avant d'écraser celui du visiteur
    if (T() && !T().demo) {
      confirmer(tr('Remplacer ton tournoi ?', 'Replace your tournament?'), tr(`Le simulateur garde un seul tournoi : « ${T().nom} » sera remplacé par le tournoi de démo.`, `The simulator keeps one tournament: “${T().nom}” will be replaced by the demo tournament.`), tr('Charger la démo', 'Load the demo'), charger);
    } else charger();
  }));
  $('#ouvrir-spectateur').addEventListener('click', () => {
    if (!T()) chargerDemo();
    S.ongletSuivi = 'calendrier';
    reinitialiserVers('suivi');
    decouvrir('spectateur');
    if (window.innerWidth < 1080) $('.telephone-sim').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  });

  // ---------------------------------------------------------------------
  // Partie vitrine du site
  // ---------------------------------------------------------------------
  const MOTS_BANDEAU = [
    ['Calendrier automatique', 'Automatic schedule'], ['Scores en direct', 'Live scores'], ['QR code', 'QR code'], ['Grand écran', 'Big screen'],
    ['Phases finales', 'Knockout stages'], ['Podium', 'Podium'], ['Co-organisateurs', 'Co-organizers'], ['Export PDF', 'PDF export'],
    ['Football', 'Football'], ['Rugby', 'Rugby'], ['Handball', 'Handball'], ['Basket-ball', 'Basketball'], ['Tennis', 'Tennis'],
  ];
  function rendreBandeau() {
    const html = MOTS_BANDEAU.map((m) => `<span>${iL(m)}</span>`).join('');
    $('#bandeau').innerHTML = html + html;
  }

  const TUILES = [
    { ico: 'calendrier', large: true, c: 'orga', m: 'calendrier', t: ['Calendrier automatique', 'Automatic schedule'], p: ['Poules organisées par journées pour qu\'une équipe n\'enchaîne pas ses matchs, répartition sur tous les terrains, horaires calculés avec mi-temps, pauses et pause déjeuner.', 'Groups organized into rounds so no team plays back-to-back, matches spread over every field, times computed with half-time, breaks and lunch.'], tags: [['Poules', 'Groups'], ['Élimination directe', 'Knockout'], ['Mixte', 'Mixed']] },
    { ico: 'direct', c: 'orga', m: 'score', t: ['Saisie au bord du terrain', 'Sideline scoring'], p: ['Gros boutons plus et moins, score « en cours » ou « terminé », retour par vibration.', 'Big plus and minus buttons, “live” or “finished” score, haptic feedback.'] },
    { ico: 'oeil', large: true, c: 'public', m: 'spectateur', t: ['Résultats en temps réel', 'Real-time results'], p: ['Chaque score saisi apparaît aussitôt sur les téléphones des équipes et des spectateurs. Plus besoin de courir au tableau d\'affichage.', 'Every score shows up instantly on teams’ and spectators’ phones. No more running to the noticeboard.'], tags: [['Sans compte', 'No account'], ['En direct', 'Live']] },
    { ico: 'coupe', c: 'tous', m: 'classement', t: ['Classements détaillés', 'Detailed standings'], p: ['J, V, N, D, marqués, encaissés, différence et points, avec départage au choix.', 'P, W, D, L, for, against, difference and points, with your choice of tiebreaker.'] },
    { ico: 'coupe', c: 'tous', m: 'finale', t: ['Phases finales et podium', 'Knockouts and podium'], p: ['Demi-finales, finale, exempts automatiques et match pour la 3e place.', 'Semi-finals, final, automatic byes and third-place match.'] },
    { ico: 'cle', c: 'orga', m: 'finale', t: ['Tirs au but et prolongations', 'Penalties and extra time'], p: ['En cas d\'égalité en élimination directe, le départage prévu par le sport désigne le vainqueur.', 'In a knockout draw, the sport’s tiebreaker decides the winner.'] },
    { ico: 'qr', c: 'public', m: 'qr', t: ['QR code et code d\'accès', 'QR code and access code'], p: ['Un QR code par tournoi, à afficher ou partager. Un code à 6 caractères, sans lettres ambiguës.', 'One QR code per tournament, to display or share. A 6-character code with no ambiguous letters.'] },
    { ico: 'ecran', large: true, c: 'tous', m: 'grand', t: ['Vue grand écran', 'Big screen view'], p: ['Classements, matchs en cours et derniers résultats en gros caractères, pour une télé ou un vidéoprojecteur branché à un ordinateur (espace organisateur). Se met à jour tout seul.', 'Standings, live matches and latest results in large type for a TV or projector plugged into a computer (organizer area). Updates by itself.'] },
    { ico: 'terrain', c: 'tous', m: 'vue', t: ['Par poule ou par terrain', 'By group or by field'], p: ['Chaque arbitre retrouve d\'un coup d\'œil les matchs de son terrain.', 'Each referee sees their field’s matches at a glance.'] },
    { ico: 'groupe', c: 'orga', m: 'coorg', t: ['Co-organisateurs', 'Co-organizers'], p: ['Code d\'invitation et droits par personne : saisir, gérer, supprimer.', 'Invitation code and per-person rights: enter, manage, delete.'], tags: [['Premium', 'Premium', 1]] },
    { ico: 'pdf', c: 'orga', m: 'pdf', t: ['Export PDF', 'PDF export'], p: ['Le programme complet à imprimer ou à envoyer aux équipes.', 'The full schedule to print or send to teams.'], tags: [['Premium', 'Premium', 1]] },
    { ico: 'football', c: 'orga', m: 'sport', t: ['5 sports', '5 sports'], p: ['Football, rugby, handball, basket et tennis, chacun avec son barème.', 'Football, rugby, handball, basketball and tennis, each with its own scoring.'] },
    { ico: 'calendrier', c: 'orga', m: 'equipes', t: ['Horaires sur mesure', 'Custom timing'], p: ['Heure de départ, durée des matchs, mi-temps, pause entre les matchs et pause déjeuner.', 'Start time, match length, half-time, breaks and lunch break.'] },
    { ico: 'globe', c: 'tous', m: 'profil', t: ['Français, English', 'Français, English'], p: ['L\'app suit la langue du téléphone. Thème clair ou sombre.', 'The app follows the phone’s language. Light or dark theme.'] },
    { ico: 'bouclier', large: true, c: 'orga', m: 'profil', t: ['Compte et profil sécurisés', 'Secure account and profile'], p: ['Photo, club, identifiants chiffrés sur le téléphone, mot de passe oublié par e-mail, suppression du compte en deux touches. Compte réservé aux 15 ans et plus.', 'Photo, club, credentials encrypted on the phone, password reset by email, account deletion in two taps. Accounts for ages 15 and up.'] },
    { ico: 'vibre', c: 'public', m: 'spectateur', t: ['Suivre sans compte', 'Follow without an account'], p: ['Les tournois rejoints restent dans « Tournois suivis ».', 'Joined tournaments stay in “Followed tournaments”.'] },
  ];
  let filtreActif = 'tous';
  function rendreBento() {
    $('#bento').innerHTML = TUILES.map((x, i) => `<article class="tuile ${x.large ? 'large' : ''} reveler visible" data-cible="${x.c}" style="--delai:${(i % 4) * 0.05}s">
      <div class="icone">${ico(x.ico)}</div><h3>${iL(x.t)}</h3><p>${iL(x.p)}</p>
      ${x.tags ? `<div class="tags">${x.tags.map((g) => `<span class="${g[2] ? 'premium' : ''}">${iL(g)}</span>`).join('')}</div>` : ''}
      <button class="essayer" type="button" data-essayer="${x.m}">${tr('Essayer', 'Try it')} ${ico('fleche')}</button></article>`).join('');
    appliquerFiltre();
  }
  function appliquerFiltre() {
    $$('.tuile').forEach((el) => el.classList.toggle('estompe', filtreActif !== 'tous' && el.dataset.cible !== filtreActif && el.dataset.cible !== 'tous'));
  }
  $('.filtres').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtre]');
    if (!b) return;
    filtreActif = b.dataset.filtre;
    $$('.filtres button').forEach((x) => x.classList.toggle('actif', x === b));
    appliquerFiltre();
  });
  $('#bento').addEventListener('click', (e) => {
    const b = e.target.closest('[data-essayer]');
    if (!b) return;
    $('#essayer').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth' });
    setTimeout(() => allerMission(b.dataset.essayer), mouvementReduit ? 0 : 500);
  });
  $('#bento').addEventListener('pointermove', (e) => {
    const tuile = e.target.closest('.tuile');
    if (!tuile) return;
    const r = tuile.getBoundingClientRect();
    tuile.style.setProperty('--mx', `${e.clientX - r.left}px`);
    tuile.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  let sportActif = 'football';
  function rendreSports() {
    $('#sports-liste').innerHTML = SPORTS.map((s) => `<button class="sport-onglet ${s.valeur === sportActif ? 'actif' : ''}" role="tab" aria-selected="${s.valeur === sportActif}" data-sport="${s.valeur}">${ico(s.valeur)}${langue === 'en' ? s.en : s.fr}</button>`).join('');
    const s = infosSport(sportActif);
    const elim = s.valeur === 'tennis' ? [tr('Pas de match nul au tennis : le vainqueur est celui qui remporte ses sets.', 'No draws in tennis: the winner is whoever wins their sets.')] : s.elim.map(([, fr, en]) => (langue === 'en' ? en : fr));
    $('#sport-detail').innerHTML = `<svg class="grand-ico" aria-hidden="true"><use href="#i-${s.valeur}"/></svg>
      <h3 class="anime">${langue === 'en' ? s.en : s.fr}</h3>
      <p class="vocab anime">${tr(`Le score se compte en ${s.score[0]} · classement par ${s.diff[0].toLowerCase()}`, `Score counted in ${s.score[1]} · ranked by ${s.diff[1].toLowerCase()}`)}</p>
      <div class="bareme anime" style="animation-delay:.05s"><div><strong>${s.v}</strong><span>${tr('pts victoire', 'pts win')}</span></div>${s.valeur === 'tennis' ? '' : `<div><strong>${s.n}</strong><span>${tr('pts nul', 'pts draw')}</span></div>`}<div><strong>${s.d}</strong><span>${tr('pts défaite', 'pts loss')}</span></div></div>
      <h4 class="anime" style="animation-delay:.1s">${tr('Départage en phase finale', 'Knockout tiebreakers')}</h4>
      <div class="puces anime" style="animation-delay:.1s">${elim.map((x) => `<span>${x}</span>`).join('')}</div>
      <h4 class="anime" style="animation-delay:.15s">${tr('Spécificités', 'Specifics')}</h4>
      <div class="puces anime" style="animation-delay:.15s">${s.plus.map((x) => `<span>${iL(x)}</span>`).join('')}</div>
      <button class="bouton anime" style="animation-delay:.2s" type="button" data-essayer-sport="${s.valeur}">${tr(`Créer un tournoi de ${(langue === 'en' ? s.en : s.fr).toLowerCase()}`, `Create a ${(s.en).toLowerCase()} tournament`)}</button>`;
  }
  $('#sports-liste').addEventListener('click', (e) => { const b = e.target.closest('[data-sport]'); if (b && b.dataset.sport !== sportActif) { sportActif = b.dataset.sport; rendreSports(); } });
  $('#sport-detail').addEventListener('click', (e) => {
    const b = e.target.closest('[data-essayer-sport]');
    if (!b) return;
    S.brouillon = nouveauBrouillon(b.dataset.essayerSport);
    decouvrir('sport');
    historique = [{ ecran: 'accueil' }, { ecran: 'sport' }];
    ecranCourant = { ecran: 'creer', params: {} };
    rendre('avant');
    $('#essayer').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth' });
  });

  // Téléphone animé du héros
  const DEMO = {
    equipes: [{ id: 'a', nom: 'Les Aigles' }, { id: 'b', nom: 'FC Rivière' }, { id: 'c', nom: 'Étoile Sud' }, { id: 'd', nom: 'US Collines' }],
    matchs: [{ id: 'm1', equipe_a_id: 'a', equipe_b_id: 'b', h: '14:30', t: 1 }, { id: 'm2', equipe_a_id: 'c', equipe_b_id: 'd', h: '14:30', t: 2 }, { id: 'm3', equipe_a_id: 'a', equipe_b_id: 'c', h: '14:45', t: 1 }, { id: 'm0', equipe_a_id: 'b', equipe_b_id: 'd', h: '14:15', t: 1 }],
    resultats: [{ match_id: 'm0', score_a: 2, score_b: 2, statut: 'termine' }, { match_id: 'm1', score_a: 1, score_b: 0, statut: 'en_cours' }, { match_id: 'm2', score_a: 0, score_b: 1, statut: 'en_cours' }],
  };
  let flashDemo = null;
  function rendreDemo() {
    const nom = (id) => DEMO.equipes.find((e) => e.id === id).nom;
    $('#demo-matchs').innerHTML = DEMO.matchs.filter((m) => m.id !== 'm0').map((m) => {
      const r = DEMO.resultats.find((x) => x.match_id === m.id);
      const sc = r ? `<span class="${flashDemo === `${m.id}a` ? 'flash' : ''}">${r.score_a}</span>-<span class="${flashDemo === `${m.id}b` ? 'flash' : ''}">${r.score_b}</span>` : `<small style="font-family:var(--corps);font-size:12px;color:#808693">${tr('À venir', 'Upcoming')}</small>`;
      return `<div class="demo-match ${r && r.statut === 'en_cours' ? 'live' : ''}"><div><b>${nom(m.equipe_a_id)} · ${nom(m.equipe_b_id)}</b><small>${r && r.statut === 'en_cours' ? tr('● En cours', '● Live') : m.h} · ${tr('terrain', 'field')} ${m.t}</small></div><span class="sc">${sc}</span></div>`;
    }).join('');
    const c = calculerClassement(DEMO.equipes, DEMO.matchs, DEMO.resultats, 'diff_buts', 'football', true);
    $('#demo-classement').innerHTML = `<div class="demo-table"><h4>${tr('Classement · Poule A', 'Standings · Group A')}</h4><div class="demo-ligne tete"><span>#</span><span>${tr('Équipe', 'Team')}</span><span>${tr('J', 'P')}</span><span>Diff</span><b style="color:#808693">Pts</b></div>${c.map((s, i) => `<div class="demo-ligne"><span>${i + 1}</span><span>${s.equipe.nom}</span><span>${s.joues}</span><span>${s.diff_buts > 0 ? '+' : ''}${s.diff_buts}</span><b>${s.points}</b></div>`).join('')}</div>`;
    const seg = $('#demo-seg');
    $$('span', seg)[0].textContent = tr('Matchs', 'Matches');
    $$('span', seg)[1].textContent = tr('Classement', 'Standings');
  }
  let tickDemo = 0;
  function animerDemo() {
    tickDemo++;
    const seg = $('#demo-seg');
    const montrerClassement = tickDemo % 4 === 3;
    if (montrerClassement) {
      seg.classList.add('droite'); $$('span', seg)[0].classList.remove('actif'); $$('span', seg)[1].classList.add('actif');
      $('#demo-matchs').hidden = true; $('#demo-classement').hidden = false;
      requestAnimationFrame(() => $('#demo-classement').classList.remove('cache'));
      rendreDemo();
      return;
    }
    seg.classList.remove('droite'); $$('span', seg)[1].classList.remove('actif'); $$('span', seg)[0].classList.add('actif');
    $('#demo-classement').hidden = true; $('#demo-classement').classList.add('cache'); $('#demo-matchs').hidden = false;
    const enCours = DEMO.resultats.filter((r) => r.statut === 'en_cours');
    const r = enCours[Math.floor(Math.random() * enCours.length)];
    const cote = Math.random() < 0.5 ? 'a' : 'b';
    if (r[`score_${cote}`] >= 4) { r.score_a = 0; r.score_b = 0; }
    r[`score_${cote}`]++;
    flashDemo = r.match_id + cote;
    const m = DEMO.matchs.find((x) => x.id === r.match_id);
    $('#bulle-but').textContent = `${tr('But !', 'Goal!')} ${DEMO.equipes.find((e) => e.id === m[`equipe_${cote}_id`]).nom}`;
    rendreDemo();
  }
  rendreDemo();
  if (!mouvementReduit) setInterval(animerDemo, 2600);

  // Inclinaison du téléphone et lueur qui suivent la souris
  const heros = $('.heros');
  const tel = $('#telephone-heros');
  heros.addEventListener('pointermove', (e) => {
    if (mouvementReduit || e.pointerType !== 'mouse') return;
    const r = heros.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tel.style.setProperty('--ry', `${-8 + x * 14}deg`);
    tel.style.setProperty('--rx', `${4 - y * 10}deg`);
    heros.style.setProperty('--px', `${x * 60}px`);
    heros.style.setProperty('--py', `${y * 60}px`);
  });
  heros.addEventListener('pointerleave', () => { tel.style.removeProperty('--ry'); tel.style.removeProperty('--rx'); });

  // Apparitions au défilement
  const observateur = 'IntersectionObserver' in window ? new IntersectionObserver((entrees) => {
    entrees.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visible'); observateur.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.reveler').forEach((el) => { if (observateur) observateur.observe(el); else el.classList.add('visible'); });

  // Défilement : barre de lecture, en-tête, ligne des étapes, lien actif
  const entete = $('.entete');
  const barreLecture = $('.progression-lecture');
  const ligneEtapes = $('.etapes-ligne');
  const liens = $$('.nav-principale a');
  let tickDefil = false;
  function auDefilement() {
    tickDefil = false;
    // Le défilement de l'intro (stade → écran) ne compte pas dans la lecture
    const debut = $('#accueil') ? $('#accueil').offsetTop : 0;
    const y = Math.max(0, window.scrollY - debut);
    const h = document.documentElement.scrollHeight - window.innerHeight - debut;
    barreLecture.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    entete.classList.toggle('defile', y > 8);
    const r = $('#etapes').getBoundingClientRect();
    const av = Math.max(0, Math.min(1, (window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.3)));
    ligneEtapes.style.setProperty('--avance', av.toFixed(3));
    let actif = null;
    liens.forEach((a) => { const s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < 120) actif = a; });
    liens.forEach((a) => a.classList.toggle('actif', a === actif));
  }
  window.addEventListener('scroll', () => { if (!tickDefil) { tickDefil = true; requestAnimationFrame(auDefilement); } }, { passive: true });
  window.addEventListener('resize', () => { $$('.s-onglets').forEach(placerCurseur); });

  // ---------------------------------------------------------------------
  // Offres : le site n'encaisse rien. Pass Tournoi et Pro s'achètent dans
  // l'app (App Store, Google Play via RevenueCat) puis valent aussi dans
  // l'espace organisateur web, avec le même compte.
  // ---------------------------------------------------------------------
  const fenetreOffre = $('#fenetre-offre');
  const voileOffre = $('#voile-offre');
  let declencheurOffre = null;
  function ouvrirOffre(id) {
    const pass = id === 'pass';
    const etapes = pass
      ? [tr('Installe l\'application OLYMPIAD et connecte-toi (ou crée ton compte).', 'Install the OLYMPIAD app and sign in (or create your account).'),
        tr('Ouvre ton tournoi, onglet Équipes, et ajoute une 13e équipe : l\'écran des offres s\'ouvre.', 'Open your tournament, Teams tab, and add a 13th team: the plans screen opens.'),
        tr('Choisis « Pass Tournoi » et valide l\'achat.', 'Pick “Tournament Pass” and confirm the purchase.')]
      : [tr('Installe l\'application OLYMPIAD et connecte-toi (ou crée ton compte).', 'Install the OLYMPIAD app and sign in (or create your account).'),
        tr('Va dans Mon profil, puis « Découvrir les offres ».', 'Go to My profile, then “See the offers”.'),
        tr('Choisis OLYMPIAD Pro, mensuel ou annuel, et valide l\'achat.', 'Pick OLYMPIAD Pro, monthly or yearly, and confirm the purchase.')];
    fenetreOffre.innerHTML = `<button class="fermer-offre" type="button" data-offre-action="fermer" aria-label="${tr('Fermer', 'Close')}">${ico('croix')}</button>
      <p class="surtitre">${pass ? tr('Achat unique', 'One-time purchase') : tr('Abonnement mensuel ou annuel', 'Monthly or yearly subscription')}</p>
      <h2 id="titre-fenetre-offre">${pass ? tr('Pass Tournoi', 'Tournament Pass') : 'OLYMPIAD Pro'}</h2>
      <p class="sous">${pass ? tr('Équipes illimitées, export PDF et co-organisateurs pour un tournoi, jusqu\'à 5 jours après sa date.', 'Unlimited teams, PDF export and co-organizers for one tournament, until 5 days after its date.') : tr('Toutes les fonctions premium, sur tous tes tournois. Résiliable à tout moment.', 'Every premium feature, on all your tournaments. Cancel anytime.')}</p>
      <div class="encart-offre">
        <h3>${tr('Ça se passe dans l\'app', 'It happens in the app')}</h3>
        <ol>${etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>
        <p>${tr('Ton offre s\'applique ensuite partout avec le même compte : dans l\'app et dans l\'espace organisateur web.', 'Your plan then applies everywhere with the same account: in the app and in the web organizer area.')}</p>
      </div>
      <div class="stores-offre">
        <span class="store-offre"><span class="bientot">${tr('Bientôt', 'Soon')}</span><small>${tr('Bientôt disponible sur', 'Coming soon on')}</small>App Store</span>
        <span class="store-offre"><span class="bientot">${tr('Bientôt', 'Soon')}</span><small>${tr('Bientôt disponible sur', 'Coming soon on')}</small>Google Play</span>
      </div>
      <p class="mention">${tr('Prix affichés dans l\'application avant tout achat. Paiement via l\'App Store ou Google Play.', 'Prices are shown in the app before any purchase. Payment through the App Store or Google Play.')}</p>
      <div class="actions-offre">
        <a class="bouton secondaire" href="espace.html?demo=1" data-offre-action="fermer">${tr('Découvrir l\'espace en démo', 'Try the organizer area demo')}</a>
        <a class="bouton" href="#essayer" data-offre-action="fermer"><span>${tr('Essayer gratuitement', 'Try it for free')}</span>${ico('fleche')}</a>
      </div>`;
    fenetreOffre.classList.add('ouvert'); voileOffre.classList.add('ouvert');
    document.body.classList.add('fenetre-offre-ouverte');
    $('.fermer-offre', fenetreOffre).focus();
  }
  function fermerOffre() {
    if (!fenetreOffre.classList.contains('ouvert')) return;
    fenetreOffre.classList.remove('ouvert'); voileOffre.classList.remove('ouvert');
    document.body.classList.remove('fenetre-offre-ouverte');
    if (declencheurOffre) { declencheurOffre.focus({ preventScroll: true }); declencheurOffre = null; }
  }
  $('#offres').addEventListener('click', (e) => {
    const carte = e.target.closest('.offre');
    if (!carte || e.target.closest('a[href]')) return;
    const bouton = $('[data-offre]', carte);
    if (bouton) { declencheurOffre = bouton; vibrer(); ouvrirOffre(bouton.dataset.offre); }
  });
  fenetreOffre.addEventListener('click', (e) => { const a = e.target.closest('[data-offre-action="fermer"]'); if (a) { if (a.tagName === 'A') declencheurOffre = null; fermerOffre(); } });
  voileOffre.addEventListener('click', fermerOffre);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerOffre(); });

  // Boutons de l'en-tête
  $('#bouton-langue').addEventListener('click', () => changerLangue());
  $('#bouton-theme').addEventListener('click', () => { choisirTheme(themeEffectif() === 'dark' ? 'light' : 'dark'); rafraichir(); });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', majIconeTheme);

  // ---------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------
  majIconeTheme();
  const lienSuivi = location.hash.match(/^#suivi\/([a-z0-9]{6})$/i);
  if (lienSuivi) {
    // Onglet ouvert depuis le QR code : vue spectateur directement
    S.role = 'spectateur';
    historique = [{ ecran: 'accueil', params: {} }];
    if (T() && T().code === lienSuivi[1].toLowerCase()) {
      if (!S.suivis.includes(T().code)) S.suivis.push(T().code);
      ecranCourant = { ecran: 'suivi', params: {} };
    } else {
      ecranCourant = { ecran: 'rejoindre', params: { code: lienSuivi[1].toUpperCase(), erreur: tr('Ce tournoi n\'existe que dans le navigateur qui l\'a créé.', 'This tournament only exists in the browser that created it.') } };
    }
    appliquerLangue();
    rendre('avant');
    setTimeout(() => $('#essayer').scrollIntoView({ behavior: 'auto' }), 60);
  } else {
    ecranCourant = { ecran: 'accueil', params: {} };
    appliquerLangue();
    rendre('avant');
  }
  auDefilement();
})();
