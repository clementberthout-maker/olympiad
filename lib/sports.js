// Réglages qui varient selon le sport du tournoi. Pour l'instant, seul le
// vocabulaire du score change (buts vs points) : tous les autres réglages
// (formats, départages, durées...) restent communs à tous les sports.
export const SPORTS = [
  {
    valeur: 'football',
    label: 'Football',
    icone: 'soccer',
    libelleScore: 'but',
    libelleScorePluriel: 'buts',
    libelleDiffScore: 'Différence de buts',
    abregeScorePour: 'BP',
    abregeScoreContre: 'BC',
    pointsVictoire: 3,
    pointsNul: 1,
    pointsDefaite: 0,
  },
  {
    valeur: 'rugby',
    label: 'Rugby',
    icone: 'rugby',
    libelleScore: 'point',
    libelleScorePluriel: 'points',
    libelleDiffScore: 'Différence de points',
    abregeScorePour: 'PP',
    abregeScoreContre: 'PC',
    pointsVictoire: 4,
    pointsNul: 2,
    pointsDefaite: 0,
  },
  {
    valeur: 'handball',
    label: 'Handball',
    icone: 'handball',
    libelleScore: 'but',
    libelleScorePluriel: 'buts',
    libelleDiffScore: 'Différence de buts',
    abregeScorePour: 'BP',
    abregeScoreContre: 'BC',
    pointsVictoire: 3,
    pointsNul: 1,
    pointsDefaite: 0,
  },
  {
    valeur: 'basketball',
    label: 'Basket-ball',
    icone: 'basketball',
    libelleScore: 'point',
    libelleScorePluriel: 'points',
    libelleDiffScore: 'Différence de points',
    abregeScorePour: 'PP',
    abregeScoreContre: 'PC',
    pointsVictoire: 2,
    pointsNul: 1,
    pointsDefaite: 0,
  },
  {
    valeur: 'tennis',
    label: 'Tennis',
    icone: 'tennis',
    libelleScore: 'set',
    libelleScorePluriel: 'sets',
    libelleDiffScore: 'Différence de sets',
    abregeScorePour: 'SP',
    abregeScoreContre: 'SC',
    pointsVictoire: 3,
    pointsNul: 1,
    pointsDefaite: 0,
  },
];

export function infosSport(valeur) {
  return SPORTS.find((s) => s.valeur === valeur) || SPORTS[0];
}
