import AsyncStorage from '@react-native-async-storage/async-storage';

// Mémorise sur l'appareil les tournois qu'on a rejoints (via QR code ou code
// d'accès) afin de pouvoir y revenir directement depuis l'accueil, sans
// avoir à rescanner ou ressaisir le code. Indépendant de la connexion : ça
// fonctionne aussi bien pour un spectateur anonyme qu'un utilisateur connecté.

const CLE = 'olympiad:tournoisSuivis';
const MAX_ENTREES = 20;

export async function listerTournoisSuivis() {
  const brut = await AsyncStorage.getItem(CLE);
  if (!brut) return [];
  try {
    return JSON.parse(brut);
  } catch {
    return [];
  }
}

// Ajoute (ou remonte en tête si déjà présent) le tournoi dans la liste.
export async function enregistrerTournoiSuivi({ code, nom, dateDebut, sport }) {
  if (!code) return;
  const liste = await listerTournoisSuivis();
  const sansDoublon = liste.filter((t) => t.code.toLowerCase() !== code.toLowerCase());
  const nouvelleListe = [{ code, nom, dateDebut, sport }, ...sansDoublon].slice(0, MAX_ENTREES);
  await AsyncStorage.setItem(CLE, JSON.stringify(nouvelleListe));
}

export async function retirerTournoiSuivi(code) {
  const liste = await listerTournoisSuivis();
  const nouvelleListe = liste.filter((t) => t.code.toLowerCase() !== code.toLowerCase());
  await AsyncStorage.setItem(CLE, JSON.stringify(nouvelleListe));
}
