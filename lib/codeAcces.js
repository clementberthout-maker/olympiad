// Génère un code d'accès lisible à partir du nom et de la date du tournoi,
// ex : "tournoifinannee" + "20260818" -> "tournoifinannee20260818".

export function slugifier(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

export function genererCodeAcces(nom, dateDebut) {
  const slug = slugifier(nom) || 'tournoi';
  const datePartie = dateDebut.replace(/-/g, '');
  return `${slug}${datePartie}`;
}
