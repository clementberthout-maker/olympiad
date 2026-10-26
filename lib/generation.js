// Génère aléatoirement la répartition en poules et/ou le calendrier des
// matchs à partir de la liste des équipes inscrites, selon le format du
// tournoi, le nombre de terrains disponibles et les réglages de timing
// choisis par l'organisateur (heure du premier match, durée des matchs,
// mi-temps, pause entre les matchs).

function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function creneauSuivant(dateDebut, heureDebut, dureeCreneauMinutes, indexCreneau) {
  const [h, m] = heureDebut.split(':').map(Number);
  const base = new Date(`${dateDebut}T00:00:00`);
  base.setHours(h, m, 0, 0);
  base.setMinutes(base.getMinutes() + indexCreneau * dureeCreneauMinutes);
  return base.toISOString();
}

// Même jour que `date`, à l'heure "HH:MM" (ou "HH:MM:SS").
function aLHeure(date, heure) {
  const [h, m] = String(heure).split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

// Calcule tous les créneaux horaires en tenant compte d'une éventuelle
// pause déjeuner définie par un créneau précis (heure de début / heure de
// fin) : aucun match ne doit être en train de se jouer pendant ce créneau.
// Tournoi sur plusieurs jours (dateFin après dateDebut, avec une heure de
// fin de journée) : un match qui finirait après cette heure est reporté au
// lendemain, à l'heure du premier match. La pause déjeuner vaut chaque jour.
function calculerCreneaux(nombreCreneaux, reglages) {
  const {
    dateDebut, dateFin, heureDebut, heureFinJournee, dureeCreneauMinutes, dureeMatchMinutes,
    pauseDejeuner, heureDebutPause, heureFinPause, horaireDepart,
  } = reglages;
  const plusieursJours = Boolean(dateFin && dateFin > dateDebut && heureFinJournee);
  const avecPause = Boolean(pauseDejeuner && heureDebutPause && heureFinPause);

  let curseur = horaireDepart
    ? new Date(horaireDepart)
    : aLHeure(new Date(`${dateDebut}T00:00:00`), heureDebut);

  const creneaux = [];
  for (let i = 0; i < nombreCreneaux; i++) {
    // Deux passages au plus : un report après la pause peut ensuite
    // déborder sur la fin de journée (et inversement le lendemain).
    for (let essai = 0; essai < 3; essai++) {
      const finDuMatch = new Date(curseur.getTime() + dureeMatchMinutes * 60000);
      if (avecPause) {
        const debutPause = aLHeure(curseur, heureDebutPause);
        const finPause = aLHeure(curseur, heureFinPause);
        if (curseur < finPause && finDuMatch >= debutPause) {
          curseur = finPause;
          continue;
        }
      }
      if (plusieursJours && finDuMatch > aLHeure(curseur, heureFinJournee)) {
        const lendemain = new Date(curseur);
        lendemain.setDate(lendemain.getDate() + 1);
        curseur = aLHeure(lendemain, heureDebut);
        continue;
      }
      break;
    }
    creneaux.push(new Date(curseur));
    curseur = new Date(curseur.getTime() + dureeCreneauMinutes * 60000);
  }
  return creneaux;
}

// Réglages du moteur à partir d'un tournoi enregistré en base. Avec des
// matchs déjà générés, les suivants partent du créneau qui suit le dernier.
export function reglagesDepuisTournoi(tournoi, matchsExistants = []) {
  const dureeMatchMinutes = tournoi.duree_match + (tournoi.mi_temps ? tournoi.duree_mi_temps : 0);
  const dureeCreneauMinutes = dureeMatchMinutes + tournoi.temps_pause;

  let horaireDepart;
  if (matchsExistants.length) {
    const dernierHoraire = Math.max(...matchsExistants.map((m) => new Date(m.horaire).getTime()));
    horaireDepart = new Date(dernierHoraire + dureeCreneauMinutes * 60000).toISOString();
  }

  return {
    dateDebut: String(tournoi.date_debut).slice(0, 10),
    dateFin: tournoi.date_fin ? String(tournoi.date_fin).slice(0, 10) : null,
    heureDebut: String(tournoi.heure_premier_match || '09:00').slice(0, 5),
    heureFinJournee: tournoi.heure_fin_journee ? String(tournoi.heure_fin_journee).slice(0, 5) : null,
    dureeCreneauMinutes,
    dureeMatchMinutes,
    nombreTerrains: tournoi.nombre_terrains,
    pauseDejeuner: tournoi.pause_dejeuner,
    heureDebutPause: tournoi.heure_debut_pause,
    heureFinPause: tournoi.heure_fin_pause,
    horaireDepart,
  };
}

// Répartit les équipes mélangées dans `nombrePoules` poules, le plus
// équitablement possible (répartition "en serpentin").
export function repartirEnPoules(equipes, nombrePoules) {
  const melangees = melanger(equipes);
  const poules = Array.from({ length: nombrePoules }, () => []);
  melangees.forEach((equipe, i) => {
    poules[i % nombrePoules].push(equipe);
  });
  return poules;
}

// Découpe une poule en "journées" façon championnat (méthode du cercle) :
// à chaque journée, chaque équipe joue au maximum une fois (une équipe est
// au repos si le nombre d'équipes est impair). C'est la base qui garantit
// qu'une équipe ne peut enchaîner deux matchs que si les journées elles-
// mêmes débordent sur les terrains disponibles (voir genererCalendrierPoules,
// qui traite ensuite spécifiquement cette limite).
function journeesRoundRobin(equipes, nomPoule) {
  let liste = melanger(equipes);
  if (liste.length % 2 !== 0) liste.push(null); // équipe fictive = repos ce jour-là
  const n = liste.length;
  const nombreJournees = n - 1;

  const journees = [];
  let courant = liste;
  for (let j = 0; j < nombreJournees; j++) {
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

// Assigne créneau horaire + terrain à une liste ordonnée de rencontres,
// en remplissant les terrains disponibles avant de passer au créneau
// suivant (matchs en parallèle quand plusieurs terrains sont disponibles).
function assignerCreneauxEtTerrains(rencontres, tournoiId, reglages) {
  if (rencontres.length === 0) return [];
  const { nombreTerrains } = reglages;
  const nombreCreneauxDistincts = Math.ceil(rencontres.length / nombreTerrains);
  const creneaux = calculerCreneaux(nombreCreneauxDistincts, reglages);

  return rencontres.map((r, index) => ({
    tournoi_id: tournoiId,
    equipe_a_id: r.equipeA.id,
    equipe_b_id: r.equipeB.id,
    phase: r.phase,
    terrain: String((index % nombreTerrains) + 1),
    horaire: creneaux[Math.floor(index / nombreTerrains)].toISOString(),
  }));
}

// Construit les matchs "exempts" (bye) : une équipe qualifiée directement
// pour le tour suivant, sans adversaire ni terrain, marquée comme jouée
// automatiquement (voir resultatsAutoPourExempts).
function construireMatchsExempts(equipes, tournoiId, phase, reglages) {
  if (equipes.length === 0) return [];
  const horaireDepart = calculerCreneaux(1, reglages)[0].toISOString();
  return equipes.map((equipe) => ({
    tournoi_id: tournoiId,
    equipe_a_id: equipe.id,
    equipe_b_id: null,
    phase,
    terrain: null,
    horaire: horaireDepart,
  }));
}

// À appeler après avoir inséré des matchs en base : génère les lignes de
// résultat à insérer pour les matchs "exempts" (victoire automatique de
// l'équipe A, sans adversaire), pour que ces matchs comptent immédiatement
// comme terminés.
export function resultatsAutoPourExempts(matchsInseres) {
  return matchsInseres
    .filter((m) => !m.equipe_b_id)
    .map((m) => ({ match_id: m.id, score_a: 1, score_b: 0, statut: 'termine' }));
}

// Un "plan" = la liste des créneaux, chacun étant la liste des rencontres
// jouées en même temps (au plus une par terrain).

// Plan "journée par journée" : la journée N+1 ne démarre qu'une fois la
// journée N entièrement placée ; les rencontres d'une équipe qui vient de
// jouer le dernier créneau sont repoussées en fin de journée suivante. Les
// terrains peuvent rester vides en fin de journée.
function planParJournees(journeesParPoule, nombreTerrains) {
  const nombreJournees = Math.max(0, ...journeesParPoule.map((j) => j.length));
  const plan = [];
  let equipesDernierCreneau = new Set();
  for (let j = 0; j < nombreJournees; j++) {
    const rencontres = journeesParPoule.flatMap((journees) => journees[j] || []);
    if (rencontres.length === 0) continue;
    const enConflit = (r) => equipesDernierCreneau.has(r.equipeA.id) || equipesDernierCreneau.has(r.equipeB.id);
    const ordonnees = [...rencontres.filter((r) => !enConflit(r)), ...rencontres.filter(enConflit)];
    for (let i = 0; i < ordonnees.length; i += nombreTerrains) {
      plan.push(ordonnees.slice(i, i + nombreTerrains));
    }
    equipesDernierCreneau = new Set(plan[plan.length - 1].flatMap((r) => [r.equipeA.id, r.equipeB.id]));
  }
  return plan;
}

// Plan "au plus tôt" : chaque créneau est rempli avec autant de rencontres
// que de terrains, en piochant dans l'ordre des journées (avec un peu de
// hasard) des rencontres dont les deux équipes sont libres. D'abord des
// équipes qui se sont reposées au créneau précédent ; puis, si `remplir`,
// des équipes qui enchaînent (mais pas un 3e match d'affilée) pour ne pas
// laisser un terrain vide.
function planAuPlusTot(rencontres, nombreTerrains, remplir) {
  const restantes = rencontres
    .map((r) => ({ r, cle: r.journee + Math.random() * 0.9 }))
    .sort((x, y) => x.cle - y.cle)
    .map(({ r }) => r);
  const plan = [];
  let precedent = new Set();
  let avantPrecedent = new Set();
  while (restantes.length) {
    const occupees = new Set();
    const creneau = [];
    const piocher = (accepte) => {
      for (let i = 0; i < restantes.length && creneau.length < nombreTerrains; i++) {
        const r = restantes[i];
        if (occupees.has(r.equipeA.id) || occupees.has(r.equipeB.id) || !accepte(r)) continue;
        creneau.push(r);
        occupees.add(r.equipeA.id);
        occupees.add(r.equipeB.id);
        restantes.splice(i, 1);
        i--;
      }
    };
    const reposee = (id) => !precedent.has(id);
    const pasTroisDeSuite = (id) => !(precedent.has(id) && avantPrecedent.has(id));
    piocher((r) => reposee(r.equipeA.id) && reposee(r.equipeB.id));
    if (remplir || creneau.length === 0) piocher((r) => pasTroisDeSuite(r.equipeA.id) && pasTroisDeSuite(r.equipeB.id));
    if (creneau.length === 0) piocher(() => true);
    plan.push(creneau);
    avantPrecedent = precedent;
    precedent = occupees;
  }
  return plan;
}

// Coût d'un plan : chaque créneau (durée du tournoi) et chaque 3e match
// d'affilée d'une équipe pèsent autant que 10 enchaînements de 2 matchs.
function coutPlan(plan) {
  let enchainements = 0;
  let troisDeSuite = 0;
  const equipes = (creneau) => new Set(creneau.flatMap((r) => [r.equipeA.id, r.equipeB.id]));
  for (let i = 1; i < plan.length; i++) {
    const precedent = equipes(plan[i - 1]);
    const avantPrecedent = i > 1 ? equipes(plan[i - 2]) : new Set();
    for (const id of equipes(plan[i])) {
      if (!precedent.has(id)) continue;
      enchainements++;
      if (avantPrecedent.has(id)) troisDeSuite++;
    }
  }
  return (plan.length + troisDeSuite) * 10 + enchainements;
}

const ESSAIS_PLANIFICATION = 200;

// Génère les matchs de toutes les poules (méthode du cercle, voir
// journeesRoundRobin), en faisant jouer en même temps autant de matchs
// qu'il y a de terrains. Compare le plan journée par journée et plusieurs
// plans "au plus tôt", et garde le moins coûteux (voir coutPlan) : le
// tournoi le plus court possible, en évitant qu'une équipe enchaîne ses
// matchs quand le nombre de terrains le permet.
export function genererCalendrierPoules(poulesAvecEquipes, tournoiId, reglages) {
  const journeesParPoule = poulesAvecEquipes.map(({ nom, equipes }) => journeesRoundRobin(equipes, nom));
  return planifierJournees(journeesParPoule, tournoiId, reglages);
}

// Place sur les créneaux et les terrains les rencontres de poule rangées
// par journée (voir genererCalendrierPoules).
function planifierJournees(journeesParPoule, tournoiId, reglages) {
  const { nombreTerrains } = reglages;
  const rencontres = journeesParPoule.flatMap((journees) =>
    journees.flatMap((rencontresDuJour, journee) => rencontresDuJour.map((r) => ({ ...r, journee })))
  );
  if (rencontres.length === 0) return [];

  let meilleurPlan = planParJournees(journeesParPoule, nombreTerrains);
  let meilleurCout = coutPlan(meilleurPlan);
  if (nombreTerrains > 1) {
    for (let essai = 0; essai < ESSAIS_PLANIFICATION; essai++) {
      const plan = planAuPlusTot(rencontres, nombreTerrains, essai % 2 === 0);
      const cout = coutPlan(plan);
      if (cout < meilleurCout) {
        meilleurPlan = plan;
        meilleurCout = cout;
      }
    }
  }

  const creneaux = calculerCreneaux(meilleurPlan.length, reglages);
  return meilleurPlan.flatMap((creneau, index) => creneau.map((r, terrain) => ({
    tournoi_id: tournoiId,
    equipe_a_id: r.equipeA.id,
    equipe_b_id: r.equipeB.id,
    phase: r.phase,
    terrain: String(terrain + 1),
    horaire: creneaux[index].toISOString(),
  })));
}

// Clé d'une rencontre, quel que soit l'ordre des deux équipes.
const clePaire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Met à jour le calendrier des poules en cours de tournoi, sans perdre les
// scores : les matchs déjà joués ou en cours (avec un résultat) restent tels
// quels ; les équipes ajoutées depuis (sans poule) rejoignent la poule la
// moins remplie ; tous les matchs à venir sont supprimés puis replanifiés
// avec les rencontres qui manquent, à partir du créneau qui suit le dernier
// match joué. Ne s'applique pas une fois la phase finale lancée.
// `matchs` : matchs de poule avec leur `resultat` (ou undefined).
// Retourne les écritures à faire : poules des nouvelles équipes, matchs à
// supprimer et matchs à insérer.
export function planMiseAJourPoules(poules, equipes, matchs, tournoiId, reglages) {
  const conserves = matchs.filter((m) => m.resultat);
  const aVenir = matchs.filter((m) => !m.resultat);

  const composition = poules.map((p) => ({ id: p.id, nom: p.nom, equipes: equipes.filter((e) => e.poule_id === p.id) }));
  const affectations = [];
  if (composition.length) {
    for (const equipe of equipes.filter((e) => !composition.some((p) => p.id === e.poule_id))) {
      const cible = composition.reduce((min, p) => (p.equipes.length < min.equipes.length ? p : min));
      cible.equipes.push(equipe);
      affectations.push({ equipeId: equipe.id, pouleId: cible.id, pouleNom: cible.nom });
    }
  }

  const dejaJouees = new Set(conserves.map((m) => clePaire(m.equipe_a_id, m.equipe_b_id)));
  const journeesParPoule = composition.map(({ nom, equipes: equipesPoule }) => journeesRoundRobin(equipesPoule, nom)
    .map((journee) => journee.filter((r) => !dejaJouees.has(clePaire(r.equipeA.id, r.equipeB.id)))));

  // Reprise : après le dernier match joué, et pas avant le premier match
  // qui était prévu. Rien de joué : on repart de l'heure du premier match.
  let horaireDepart = null;
  if (conserves.length) {
    const apresDernier = Math.max(...conserves.map((m) => new Date(m.horaire).getTime())) + reglages.dureeCreneauMinutes * 60000;
    const premierPrevu = aVenir.length ? Math.min(...aVenir.map((m) => new Date(m.horaire).getTime())) : 0;
    horaireDepart = new Date(Math.max(apresDernier, premierPrevu)).toISOString();
  }

  return {
    affectations,
    matchsASupprimer: aVenir.map((m) => m.id),
    matchsAInserer: planifierJournees(journeesParPoule, tournoiId, { ...reglages, horaireDepart }),
  };
}

// Heure de fin estimée de la première phase (poules, ou premier tour d'un
// tournoi 100% élimination) pour `nombreEquipes` équipes et ces réglages :
// fin du dernier match prévu. null s'il n'y a pas assez d'équipes.
export function finEstimeePremierePhase(nombreEquipes, format, nombrePoules, reglages) {
  if (nombreEquipes < 2) return null;
  const faux = Array.from({ length: nombreEquipes }, (_, i) => ({ id: `e${i}` }));
  const matchs = format === 'elimination_directe'
    ? genererPremierTourEliminationDirecte(faux, 'x', reglages).filter((m) => m.equipe_b_id)
    : genererCalendrierPoules(
      repartirEnPoules(faux, Math.max(1, Math.min(nombrePoules, Math.floor(nombreEquipes / 2))))
        .map((equipes, i) => ({ nom: `Poule ${String.fromCharCode(65 + i)}`, equipes })),
      'x', reglages
    );
  if (!matchs.length) return null;
  const dernier = Math.max(...matchs.map((m) => new Date(m.horaire).getTime()));
  return new Date(dernier + reglages.dureeMatchMinutes * 60000);
}

// Nombre de jours entre le jour du tournoi et `date` (0 = le jour même,
// 1 = le lendemain…) : sert à prévenir quand le calendrier déborde. Pour un
// tournoi sur plusieurs jours, passer son dernier jour.
export function joursApresDebut(date, dateDebut) {
  const jour = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(new Date(date).getTime() - 1); // fin à minuit pile = encore le jour même
  fin.setHours(0, 0, 0, 0);
  return Math.round((fin - jour) / 86400000);
}

const NOMS_TOUR = {
  2: 'Finale',
  4: 'Demi-finale',
  8: 'Quart de finale',
  16: 'Huitième de finale',
  32: 'Seizième de finale',
};

// Une phase à élimination directe n'est jamais une poule : on distingue les
// deux par le nom de la phase (les poules sont toujours nommées "Poule X").
export function estPhaseDePoule(phaseNom) {
  return phaseNom.startsWith('Poule ');
}

function prochainePuissanceDeDeux(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function nomTour(nombreEquipes) {
  return NOMS_TOUR[nombreEquipes] || `Tour à ${nombreEquipes} équipes`;
}

// Construit un tour à élimination directe à partir d'une liste d'équipes
// rangées par tête de série (la meilleure en premier) : si leur nombre
// n'est pas une puissance de 2, les premières reçoivent un "exempt" (bye,
// qualification directe pour le tour suivant) ; les autres se rencontrent
// la meilleure contre la moins bonne (2e contre avant-dernière…), comme
// dans un tableau classique. `pouleDe` (id d'équipe → poule), si fourni,
// sert à éviter que deux équipes de la même poule se retrouvent dès ce tour.
function genererTourAPartirDeListe(equipesOrdonnees, tournoiId, reglages, pouleDe = null) {
  const taille = prochainePuissanceDeDeux(equipesOrdonnees.length);
  const nombreExempts = taille - equipesOrdonnees.length;
  const nom = nomTour(taille);

  const exemptees = equipesOrdonnees.slice(0, nombreExempts);
  const joueuses = equipesOrdonnees.slice(nombreExempts);

  const paires = [];
  for (let i = 0; i < joueuses.length / 2; i++) {
    paires.push([joueuses[i], joueuses[joueuses.length - 1 - i]]);
  }
  if (pouleDe) eviterMemePoule(paires, pouleDe);

  const rencontres = paires.map(([equipeA, equipeB]) => ({ equipeA, equipeB, phase: nom }));

  return [
    ...construireMatchsExempts(exemptees, tournoiId, nom, reglages),
    ...assignerCreneauxEtTerrains(rencontres, tournoiId, reglages),
  ];
}

// Échange les adversaires de deux rencontres quand une rencontre oppose deux
// équipes de la même poule et que l'échange supprime le conflit sans en
// créer un autre. On garde l'équipe la mieux classée (A) à sa place et on
// cherche l'adversaire de remplacement le plus proche dans le classement.
function eviterMemePoule(paires, pouleDe) {
  const memePoule = (a, b) => pouleDe.has(a.id) && pouleDe.get(a.id) === pouleDe.get(b.id);
  for (let i = 0; i < paires.length; i++) {
    if (!memePoule(paires[i][0], paires[i][1])) continue;
    const autres = paires.map((_, j) => j).filter((j) => j !== i)
      .sort((x, y) => Math.abs(x - i) - Math.abs(y - i));
    for (const j of autres) {
      if (!memePoule(paires[i][0], paires[j][1]) && !memePoule(paires[j][0], paires[i][1])) {
        [paires[i][1], paires[j][1]] = [paires[j][1], paires[i][1]];
        break;
      }
    }
  }
}

// Premier tour d'un tableau à élimination directe (tournoi 100% élimination) :
// tirage au sort des équipes, avec exempts automatiques si leur nombre
// n'est pas une puissance de 2.
export function genererPremierTourEliminationDirecte(equipes, tournoiId, reglages) {
  return genererTourAPartirDeListe(melanger(equipes), tournoiId, reglages);
}

// Qualifiés d'un tournoi "mixte", rangés par tête de série : tous les 1ers
// de poule (du meilleur au moins bon), puis tous les 2es, etc. Sert à
// construire la phase finale et à ranger les équipes à chaque tour suivant.
export function qualifiesParTeteDeSerie(poulesAvecClassement, nombreQualifiesParPoule) {
  const qualifies = [];
  for (let rang = 0; rang < nombreQualifiesParPoule; rang++) {
    const palier = poulesAvecClassement
      .map((p) => p.classement[rang])
      .filter(Boolean)
      .sort((a, b) => b.points - a.points || b.diff_buts - a.diff_buts || b.buts_pour - a.buts_pour)
      .map((item) => item.equipe);
    qualifies.push(...palier);
  }
  return qualifies;
}

// Phase finale à élimination directe d'un tournoi "mixte", à partir du
// classement de chaque poule : qualifie les N premiers de chaque poule
// (réglage nombre_qualifies_par_poule). Les mieux classés reçoivent un
// exempt si le nombre de qualifiés n'est pas une puissance de 2 ; les
// autres se croisent (1er d'une poule contre 2e d'une autre poule…), deux
// équipes de la même poule ne se retrouvant pas dès le premier tour quand
// c'est évitable.
export function genererPhaseFinaleDepuisPoules(poulesAvecClassement, nombreQualifiesParPoule, tournoiId, reglages) {
  const pouleDe = new Map();
  poulesAvecClassement.forEach((p, index) => p.classement.forEach((item) => pouleDe.set(item.equipe.id, index)));
  const qualifies = qualifiesParTeteDeSerie(poulesAvecClassement, nombreQualifiesParPoule);
  return genererTourAPartirDeListe(qualifies, tournoiId, reglages, pouleDe);
}

// Détermine l'équipe gagnante d'un match terminé (exempt, score classique,
// ou tirs au but en cas d'égalité). Renvoie null si l'égalité n'est pas
// départagée (tirs au but absents ou égaux) : le match ne désigne alors
// aucun vainqueur et ne débloque pas le tour suivant.
export function idEquipeGagnante(match) {
  if (!match.equipe_b_id) return match.equipe_a_id;
  const r = match.resultat;
  if (!r) return null;
  if (r.score_a !== r.score_b) {
    return r.score_a > r.score_b ? match.equipe_a_id : match.equipe_b_id;
  }
  if (r.score_tab_a == null || r.score_tab_b == null || r.score_tab_a === r.score_tab_b) return null;
  return r.score_tab_a > r.score_tab_b ? match.equipe_a_id : match.equipe_b_id;
}

// Match à élimination directe terminé ET départagé (voir idEquipeGagnante).
export function matchEliminationDecide(match) {
  return match.resultat?.statut === 'termine' && idEquipeGagnante(match) !== null;
}

// Tour suivant d'un tableau à élimination directe (demi-finale, finale...),
// à partir des matchs terminés du tour précédent (chacun avec son
// `resultat` attaché). `tetesDeSerie` (liste d'équipes ou d'ids, la
// meilleure en premier, voir qualifiesParTeteDeSerie) range les gagnants :
// la meilleure tête de série restante affronte la moins bonne. Sans elle
// (tournoi 100% élimination), les gagnants gardent l'ordre des matchs.
export function genererTourSuivant(matchsTourPrecedent, tournoiId, reglages, tetesDeSerie = null) {
  let gagnants = matchsTourPrecedent.map((m) => ({ id: idEquipeGagnante(m) }));
  if (tetesDeSerie && tetesDeSerie.length) {
    const rang = new Map(tetesDeSerie.map((e, i) => [typeof e === 'object' ? e.id : e, i]));
    const rangDe = (id) => (rang.has(id) ? rang.get(id) : Infinity);
    gagnants = gagnants
      .map((g, ordre) => ({ g, ordre }))
      .sort((x, y) => rangDe(x.g.id) - rangDe(y.g.id) || x.ordre - y.ordre)
      .map(({ g }) => g);
  }
  return genererTourAPartirDeListe(gagnants, tournoiId, reglages);
}

export const NOM_MATCH_TROISIEME_PLACE = 'Match pour la 3e place';

// Match de classement pour la 3e place, à partir des deux demi-finales
// terminées (chacune avec son `resultat` attaché) : oppose les deux
// équipes battues. Non applicable si une demi-finale était un exempt
// (pas de perdant) — à vérifier par l'appelant avant d'appeler cette
// fonction.
export function genererMatchTroisiemePlace(matchsDemiFinale, tournoiId, reglages) {
  const perdants = matchsDemiFinale.map((m) => ({
    id: m.equipe_a_id === idEquipeGagnante(m) ? m.equipe_b_id : m.equipe_a_id,
  }));
  const rencontre = { equipeA: perdants[0], equipeB: perdants[1], phase: NOM_MATCH_TROISIEME_PLACE };
  return assignerCreneauxEtTerrains([rencontre], tournoiId, reglages);
}

// Finale et match pour la 3e place générés ensemble à partir des deux
// demi-finales terminées : joués en même temps s'il y a au moins 2
// terrains (3e place sur le terrain 1, finale sur le terrain 2), sinon le
// match pour la 3e place d'abord et la finale en dernier.
export function genererFinaleEtTroisiemePlace(matchsDemiFinale, tournoiId, reglages, tetesDeSerie = null) {
  const [troisieme] = genererMatchTroisiemePlace(matchsDemiFinale, tournoiId, reglages);
  const [finale] = genererTourSuivant(matchsDemiFinale, tournoiId, reglages, tetesDeSerie);
  const enRencontre = (m) => ({ equipeA: { id: m.equipe_a_id }, equipeB: { id: m.equipe_b_id }, phase: m.phase });
  return assignerCreneauxEtTerrains([enRencontre(troisieme), enRencontre(finale)], tournoiId, reglages);
}

// Regroupe une liste de matchs par phase (poule ou tour à élimination
// directe), dans l'ordre où chaque phase apparaît pour la première fois.
export function grouperParPhase(matchs) {
  const groupes = {};
  for (const m of matchs) {
    if (!groupes[m.phase]) groupes[m.phase] = [];
    groupes[m.phase].push(m);
  }
  return Object.entries(groupes).map(([nom, matchsDuGroupe]) => ({ nom, matchs: matchsDuGroupe }));
}

// Regroupe une liste de matchs par terrain (Terrain 1, Terrain 2...), les
// matchs "exempts" (sans terrain) à part, chaque groupe trié par horaire.
export function grouperParTerrain(matchs) {
  const groupes = {};
  for (const m of matchs) {
    const cle = m.terrain ? `Terrain ${m.terrain}` : 'Sans terrain (exempts)';
    if (!groupes[cle]) groupes[cle] = [];
    groupes[cle].push(m);
  }
  const noms = Object.keys(groupes).sort((a, b) => {
    const na = parseInt(a.replace('Terrain ', ''), 10);
    const nb = parseInt(b.replace('Terrain ', ''), 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    return 0;
  });
  return noms.map((nom) => ({
    nom,
    matchs: [...groupes[nom]].sort((x, y) => new Date(x.horaire) - new Date(y.horaire)),
  }));
}
