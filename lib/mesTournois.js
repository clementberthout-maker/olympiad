import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'olympiad:mes-tournois';

// Garde une trace locale des tournois créés sur cet appareil, pour pouvoir
// y revenir depuis l'accueil sans ré-authentification (en attendant la
// vraie authentification organisateur).

export async function ajouterTournoiLocal(tournoi) {
  const liste = await listerTournoisLocaux();
  const sansDoublon = liste.filter((t) => t.id !== tournoi.id);
  const nouvelleListe = [tournoi, ...sansDoublon];
  await AsyncStorage.setItem(CLE, JSON.stringify(nouvelleListe));
}

export async function listerTournoisLocaux() {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? JSON.parse(brut) : [];
  } catch {
    return [];
  }
}
