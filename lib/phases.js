import { NOM_MATCH_TROISIEME_PLACE } from './generation';

// Les noms de phase sont enregistrés en français dans la base ("Poule A",
// "Demi-finale"… voir lib/generation.js et tournoi/[id]/equipes.js), et
// servent aussi de clé pour regrouper les matchs. On ne les traduit donc qu'à
// l'affichage. Un nom inconnu est rendu tel quel.
const TOURS = {
  Finale: 'phases.finale',
  'Demi-finale': 'phases.demiFinale',
  'Quart de finale': 'phases.quartDeFinale',
  'Huitième de finale': 'phases.huitiemeDeFinale',
  'Seizième de finale': 'phases.seiziemeDeFinale',
  [NOM_MATCH_TROISIEME_PLACE]: 'phases.troisiemePlace',
};

export function libellePhase(nom, t) {
  if (!nom) return nom;
  const poule = nom.match(/^Poule ([A-Z])$/);
  if (poule) return t('phases.poule', { lettre: poule[1] });
  if (TOURS[nom]) return t(TOURS[nom]);
  const tour = nom.match(/^Tour à (\d+) équipes$/);
  if (tour) return t('phases.tour', { n: tour[1] });
  return nom;
}
