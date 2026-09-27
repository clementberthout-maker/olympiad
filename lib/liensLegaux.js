import { Linking } from 'react-native';

// Pages légales publiées via GitHub Pages depuis le dossier docs/ du dépôt.
// Exigées par Apple (guideline 3.1.2) sur l'écran d'achat d'un abonnement,
// et par Google Play (lien de suppression de compte sur la fiche du store).
const BASE = 'https://clementberthout-maker.github.io/olympiad';

export const URL_POLITIQUE_CONFIDENTIALITE = `${BASE}/politique-confidentialite.html`;
export const URL_CONDITIONS_UTILISATION = `${BASE}/conditions-utilisation.html`;
export const URL_SUPPRESSION_COMPTE = `${BASE}/suppression-compte.html`;

export function ouvrirLien(url) {
  Linking.openURL(url).catch(() => {});
}
