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
    pauseDejeuner, heureDebutPause, heureFinPause,
  } = reglages;

  const [h, m] = heureDebut.split(':').map(Number);
  let curseur = new Date(`${dateDebut}T00:00:00`);
  curseur.setHours(h, m, 0, 0);

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

// Liste "round-robin" (brute, sans horaire/terrain) des rencontres d'une
// poule : chaque équipe affronte toutes les autres une fois.
function listeRoundRobin(equipes, nomPoule) {
  const rencontres = [];
  for (let i = 0; i < equipes.length; i++) {
    for (let j = i + 1; j < equipes.length; j++) {
      rencontres.push({ equipeA: equipes[i], equipeB: equipes[j], phase: nomPoule });
    }
  }
  return rencontres;
}

// Assigne créneau horaire + terrain à une liste ordonnée de rencontres,
// en remplissant les terrains disponibles avant de passer au créneau
// suivant (matchs en parallèle quand plusieurs terrains sont disponibles).
function assignerCreneauxEtTerrains(rencontres, tournoiId, reglages) {
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

// Génère les matchs pour toutes les poules, en entrelaçant les rencontres
// de chaque poule (un match de chaque poule par "tour") afin de bien
// occuper les terrains en parallèle dès que plusieurs poules existent.
export function genererCalendrierPoules(poulesAvecEquipes, tournoiId, reglages) {
  const listesParPoule = poulesAvecEquipes.map(({ nom, equipes }) => listeRoundRobin(equipes, nom));
  const maxLongueur = Math.max(0, ...listesParPoule.map((l) => l.length));

  const rencontresEntrelacees = [];
  for (let tour = 0; tour < maxLongueur; tour++) {
    for (const liste of listesParPoule) {
      if (liste[tour]) rencontresEntrelacees.push(liste[tour]);
    }
  }

  return assignerCreneauxEtTerrains(rencontresEntrelacees, tournoiId, reglages);
}

const NOMS_TOUR = {
  2: 'Finale',
  4: 'Demi-finale',
  8: 'Quart de finale',
  16: 'Huitième de finale',
  32: 'Seizième de finale',
};

// Premier tour d'un tableau à élimination directe : apparie aléatoirement
// les équipes, réparties sur les terrains disponibles.
export function genererPremierTourEliminationDirecte(equipes, tournoiId, reglages) {
  const melangees = melanger(equipes);
  const nom = NOMS_TOUR[melangees.length] || `Tour à ${melangees.length} équipes`;
  const rencontres = [];
  for (let i = 0; i + 1 < melangees.length; i += 2) {
    rencontres.push({ equipeA: melangees[i], equipeB: melangees[i + 1], phase: nom });
  }
  return assignerCreneauxEtTerrains(rencontres, tournoiId, reglages);
}
