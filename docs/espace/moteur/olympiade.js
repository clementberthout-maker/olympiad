// Copie conforme de lib/olympiade.js (application mobile) : même moteur que l'app.
// Si lib/olympiade.js change, recopier ce fichier (seuls les imports diffèrent).
// Olympiade multisports : classement final de chaque épreuve (un tournoi
// normal, avec son sport) et classement général cumulé selon le barème de
// l'olympiade (points par place : bareme[0] pour le 1er, bareme[1] pour le
// 2e… ; 0 au-delà). Rien n'est stocké : tout se recalcule à partir des
// matchs, comme le classement des poules (voir lib/classement.js).
// Copie conforme dans docs/espace/moteur/olympiade.js (espace du site).

import { calculerClassement } from './classement.js';
import {
  estPhaseDePoule, idEquipeGagnante, matchEliminationDecide, NOM_MATCH_TROISIEME_PLACE,
} from './generation.js';

export const BAREME_PAR_DEFAUT = [10, 8, 6, 5, 4, 3, 2, 1];

const memesStats = (a, b) => a.points === b.points && a.diff_buts === b.diff_buts && a.buts_pour === b.buts_pour;

// Range les équipes à partir des classements de poule : d'abord selon leur
// rang dans leur poule (tous les 1ers, puis les 2es…), puis points,
// différence et marqués. Deux équipes de même rang et de mêmes chiffres
// partagent la place. `exclues` : équipes déjà classées (phase finale).
function rangerDepuisPoules(classements, placeDepart, exclues = new Set()) {
  const lignes = classements
    .flatMap((classement) => classement.map((s, rang) => ({ s, rang })))
    .filter(({ s }) => !exclues.has(s.equipe.id))
    .sort((x, y) => x.rang - y.rang || y.s.points - x.s.points
      || y.s.diff_buts - x.s.diff_buts || y.s.buts_pour - x.s.buts_pour);
  const places = [];
  lignes.forEach((ligne, i) => {
    const precedente = lignes[i - 1];
    const partagee = precedente && precedente.rang === ligne.rang && memesStats(precedente.s, ligne.s);
    places.push({ equipeId: ligne.s.equipe.id, place: partagee ? places[i - 1].place : placeDepart + i });
  });
  return places;
}

// Classement final d'un tournoi : [{ equipeId, place }], ou null tant qu'il
// n'est pas terminé. `matchs` portent leur `resultat` (ou undefined).
// - Poules seules : classement des poules (tous les matchs terminés).
// - Avec un tableau : 1er le vainqueur de la finale, 2e le finaliste ; les
//   perdants d'un tour partagent la place qui suit ce tour (demi-finale →
//   3e, quart → 5e, huitième → 9e…), sauf si un match pour la 3e place
//   départage les demi-finalistes ; puis les équipes éliminées en poule.
export function classementFinalTournoi({ tournoi, poules, equipes, matchs }) {
  if (!matchs.length) return null;
  const matchsPoule = matchs.filter((m) => estPhaseDePoule(m.phase));
  const resultats = matchs.filter((m) => m.resultat).map((m) => m.resultat);
  const classements = poules.map((p) => calculerClassement(
    equipes.filter((e) => e.poule_id === p.id),
    matchsPoule.filter((m) => m.phase === p.nom),
    resultats,
    tournoi.critere_departage_poule,
    tournoi.sport
  ));

  if (tournoi.format === 'poules') {
    if (!matchsPoule.length || !matchsPoule.every((m) => m.resultat?.statut === 'termine')) return null;
    return rangerDepuisPoules(classements, 1);
  }

  const elimination = matchs.filter((m) => !estPhaseDePoule(m.phase));
  const finale = elimination.find((m) => m.phase === 'Finale');
  if (!finale || !matchEliminationDecide(finale)) return null;
  const petiteFinale = elimination.find((m) => m.phase === NOM_MATCH_TROISIEME_PLACE);
  if (petiteFinale && !matchEliminationDecide(petiteFinale)) return null;

  const places = new Map([[idEquipeGagnante(finale), 1]]);
  const tours = {};
  for (const m of elimination) {
    if (m.phase === NOM_MATCH_TROISIEME_PLACE) continue;
    (tours[m.phase] = tours[m.phase] || []).push(m);
  }
  for (const matchsDuTour of Object.values(tours)) {
    const taille = matchsDuTour.length * 2; // exempts compris
    for (const m of matchsDuTour) {
      if (!m.equipe_b_id || !matchEliminationDecide(m)) continue;
      const perdant = idEquipeGagnante(m) === m.equipe_a_id ? m.equipe_b_id : m.equipe_a_id;
      if (!places.has(perdant)) places.set(perdant, taille / 2 + 1);
    }
  }
  if (petiteFinale) {
    const troisieme = idEquipeGagnante(petiteFinale);
    places.set(troisieme, 3);
    places.set(troisieme === petiteFinale.equipe_a_id ? petiteFinale.equipe_b_id : petiteFinale.equipe_a_id, 4);
  }

  const resultat = [...places].map(([equipeId, place]) => ({ equipeId, place }));
  const eliminesEnPoule = rangerDepuisPoules(classements, places.size + 1, new Set(places.keys()));
  return [...resultat, ...eliminesEnPoule].sort((a, b) => a.place - b.place);
}

// Statut d'une épreuve pour l'affichage : terminée (classement final
// connu), en cours (au moins un résultat) ou à venir.
export function statutEpreuve(matchs, places) {
  if (places) return 'terminee';
  return matchs.some((m) => m.resultat && m.equipe_b_id) ? 'encours' : 'avenir';
}

// Classement général : une ligne par équipe de l'olympiade, triée par total
// de points ; égalité départagée par le nombre de 1res places, puis de 2es…
// `epreuves` : [{ tournoi, equipes, places }] (places = classementFinalTournoi).
// Chaque ligne : { equipe, rang, total, points: { tournoiId: n }, places: { tournoiId: n } }.
export function classementGeneral(equipesOlympiade, epreuves, bareme = BAREME_PAR_DEFAUT) {
  const lignes = equipesOlympiade.map((equipe) => ({ equipe, total: 0, points: {}, places: {} }));
  const ligneDe = new Map(lignes.map((l) => [l.equipe.id, l]));
  for (const { tournoi, equipes, places } of epreuves) {
    if (!places) continue;
    for (const { equipeId, place } of places) {
      const equipe = equipes.find((e) => e.id === equipeId);
      const ligne = equipe && ligneDe.get(equipe.olympiade_equipe_id);
      if (!ligne) continue;
      const points = bareme[place - 1] ?? 0;
      ligne.total += points;
      ligne.points[tournoi.id] = points;
      ligne.places[tournoi.id] = place;
    }
  }

  const nombreDePlaces = (l, place) => Object.values(l.places).filter((p) => p === place).length;
  const placeMax = Math.max(1, ...lignes.flatMap((l) => Object.values(l.places)));
  const comparer = (a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let place = 1; place <= placeMax; place++) {
      const ecart = nombreDePlaces(b, place) - nombreDePlaces(a, place);
      if (ecart) return ecart;
    }
    return 0;
  };
  lignes.sort((a, b) => comparer(a, b) || a.equipe.nom.localeCompare(b.equipe.nom));
  lignes.forEach((l, i) => {
    l.rang = i > 0 && comparer(lignes[i - 1], l) === 0 ? lignes[i - 1].rang : i + 1;
  });
  return lignes;
}
