import { Linking } from 'react-native';

// Pages légales publiées via GitHub Pages depuis le dossier docs/ du dépôt.
// Exigées par Apple (guideline 3.1.2) sur l'écran d'achat d'un abonnement,
// et par Google Play (lien de suppression de compte sur la fiche du store).
const BASE = 'https://clementberthout-maker.github.io/olympiad';

export const URL_POLITIQUE_CONFIDENTIALITE = `${BASE}/politique-confidentialite.html`;
export const URL_CONDITIONS_UTILISATION = `${BASE}/conditions-utilisation.html`;
export const URL_SUPPRESSION_COMPTE = `${BASE}/suppression-compte.html`;

// Adresse de contact (politique de confidentialité, conditions d'utilisation).
export const EMAIL_CONTACT = 'clement.berthout@gmail.com';

export function ouvrirLien(url) {
  Linking.openURL(url).catch(() => {});
}

// Signalement d'un contenu inapproprié (règle Google Play sur le contenu
// généré par les utilisateurs) : ouvre un e-mail prérempli avec le code du
// tournoi, à compléter par la personne qui signale.
export function signalerTournoi(sujet, corps) {
  const params = `subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  ouvrirLien(`mailto:${EMAIL_CONTACT}?${params}`);
}
