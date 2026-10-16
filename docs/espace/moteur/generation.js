// Copie conforme de lib/generation.js (application mobile) : même moteur que l'app.
// Si lib/generation.js change, recopier ce fichier (seul l'import de sports.js diffère).
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

// Calcule tous les créneaux horaires en tenant compte d'une éventuelle
// pause déjeuner définie par un créneau précis (heure de début / heure de
// fin) : aucun match ne doit être en train de se jouer pendant ce créneau.
function calculerCreneaux(nombreCreneaux, reglages) {
  const {
    dateDebut, heureDebut, dureeCreneauMinutes, dureeMatchMinutes,
    pauseDejeuner, heureDebutPause, heureFinPause, horaireDepart,
  } = reglages;

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
    debutPause = new Date(`${dateDebut}T00:00:00`);
    debutPause.setHours(hd, md, 0, 0);
    finPause = new Date(`${dateDebut}T00:00:00`);
    finPause.setHours(hf, mf, 0, 0);
  }

  const creneaux = [];
  for (let i = 0; i < nombreCreneaux; i++) {
    if (debutPause && curseur < finPause) {
      const finDuMatch = new Date(curseur.getTime() + dureeMatchMinutes * 60000);
      if (finDuMatch >= debutPause) {
        curseur = new Date(finPause);
      }
    }
    creneaux.push(new Date(curseur));
    curseur = new Date(curseur.getTime() + dureeCreneauMinutes * 60000);
  }
  return creneaux;
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

// Génère les matchs pour toutes les poules, journée par journée (méthode du
// cercle, voir journeesRoundRobin) : toutes les poules jouent leur journée N
// en même temps (matchs répartis sur les terrains disponibles), et la
// journée N+1 ne démarre qu'une fois la journée N entièrement placée sur le
// calendrier — une équipe ne joue donc jamais deux fois dans la même
// journée. En prime, les rencontres impliquant une équipe qui vient de
// jouer le tout dernier créneau sont repoussées en fin de journée suivante
// autant que possible, pour limiter les enchaînements au moment où deux
// journées se touchent. Un enchaînement ne reste possible que si le nombre
// de terrains ne permet pas de faire patienter suffisamment d'équipes
// (dans ce cas, inévitable).
export function genererCalendrierPoules(poulesAvecEquipes, tournoiId, reglages) {
  const journeesParPoule = poulesAvecEquipes.map(({ nom, equipes }) => journeesRoundRobin(equipes, nom));
  const nombreJournees = Math.max(0, ...journeesParPoule.map((j) => j.length));

  let matchs = [];
  let reglagesCourants = reglages;
  let equipesDernierCreneau = new Set();

  for (let j = 0; j < nombreJournees; j++) {
    let rencontresDeLaJournee = [];
    for (const journees of journeesParPoule) {
      if (journees[j]) rencontresDeLaJournee.push(...journees[j]);
    }
    if (rencontresDeLaJournee.length === 0) continue;

    const sansConflit = rencontresDeLaJournee.filter(
      (r) => !equipesDernierCreneau.has(r.equipeA.id) && !equipesDernierCreneau.has(r.equipeB.id)
    );
    const avecConflit = rencontresDeLaJournee.filter(
      (r) => equipesDernierCreneau.has(r.equipeA.id) || equipesDernierCreneau.has(r.equipeB.id)
    );
    rencontresDeLaJournee = [...sansConflit, ...avecConflit];

    const matchsDeLaJournee = assignerCreneauxEtTerrains(rencontresDeLaJournee, tournoiId, reglagesCourants);
    matchs = matchs.concat(matchsDeLaJournee);

    const dernierHoraireMs = Math.max(...matchsDeLaJournee.map((m) => new Date(m.horaire).getTime()));
    equipesDernierCreneau = new Set(
      matchsDeLaJournee
        .filter((m) => new Date(m.horaire).getTime() === dernierHoraireMs)
        .flatMap((m) => [m.equipe_a_id, m.equipe_b_id])
    );
    reglagesCourants = {
      ...reglagesCourants,
      horaireDepart: new Date(dernierHoraireMs + reglagesCourants.dureeCreneauMinutes * 60000).toISOString(),
    };
  }

  return matchs;
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
// 1 = le lendemain…) : sert à prévenir quand le calendrier déborde.
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
// ou tirs au but en cas d'égalité).
export function idEquipeGagnante(match) {
  if (!match.equipe_b_id) return match.equipe_a_id;
  const r = match.resultat;
  if (r.score_a !== r.score_b) {
    return r.score_a > r.score_b ? match.equipe_a_id : match.equipe_b_id;
  }
  return r.score_tab_a > r.score_tab_b ? match.equipe_a_id : match.equipe_b_id;
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
