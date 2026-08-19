// Calcule le classement d'une poule à la volée, à partir des résultats.
// Ne stocke rien : conforme au principe "classement calculé, pas stocké"
// défini dans 03-MODELE-DONNEES.md.
//
// Barème V1 : 3 points victoire / 1 point nul / 0 point défaite.
// Départage par défaut : différence de buts (configurable par tournoi via
// le champ critere_departage_poule).

export function calculerClassement(equipes, matchs, resultats, critereDepartage = 'diff_buts') {
  const stats = {};

  for (const equipe of equipes) {
    stats[equipe.id] = {
      equipe,
      joues: 0,
      points: 0,
      buts_pour: 0,
      buts_contre: 0,
      confrontations: {}, // resultats tête-à-tête, utile pour le départage
    };
  }

  const matchsTermines = matchs.filter((m) => {
    const r = resultats.find((res) => res.match_id === m.id);
    return r && r.statut === 'termine';
  });

  for (const match of matchsTermines) {
    const resultat = resultats.find((r) => r.match_id === match.id);
    const a = stats[match.equipe_a_id];
    const b = stats[match.equipe_b_id];
    if (!a || !b) continue;

    a.joues += 1;
    b.joues += 1;
    a.buts_pour += resultat.score_a;
    a.buts_contre += resultat.score_b;
    b.buts_pour += resultat.score_b;
    b.buts_contre += resultat.score_a;

    if (resultat.score_a > resultat.score_b) {
      a.points += 3;
    } else if (resultat.score_a < resultat.score_b) {
      b.points += 3;
    } else {
      a.points += 1;
      b.points += 1;
    }

    // Mémorise le résultat de la confrontation directe (utile si le critère
    // de départage choisi par l'organisateur est "confrontation_directe")
    a.confrontations[b.equipe.id] = resultat.score_a - resultat.score_b;
    b.confrontations[a.equipe.id] = resultat.score_b - resultat.score_a;
  }

  const classement = Object.values(stats).map((s) => ({
    ...s,
    diff_buts: s.buts_pour - s.buts_contre,
  }));

  classement.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;

    if (critereDepartage === 'confrontation_directe') {
      const face_a_face = x.confrontations[y.equipe.id];
      if (face_a_face !== undefined && face_a_face !== 0) return -face_a_face;
    }

    // Différence de buts en critère par défaut ou en repli
    if (y.diff_buts !== x.diff_buts) return y.diff_buts - x.diff_buts;
    return y.buts_pour - x.buts_pour;
  });

  return classement;
}
