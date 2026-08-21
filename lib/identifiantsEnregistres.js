import * as SecureStore from 'expo-secure-store';

// Identifiants de connexion enregistrés sur l'appareil (Keychain iOS /
// Keystore Android via expo-secure-store, jamais en clair ni côté serveur).
const CLE = 'olympiad_identifiants';

export async function enregistrerIdentifiants(email, motDePasse) {
  await SecureStore.setItemAsync(CLE, JSON.stringify({ email, motDePasse }));
}

export async function recupererIdentifiants() {
  const valeur = await SecureStore.getItemAsync(CLE);
  return valeur ? JSON.parse(valeur) : null;
}

export async function oublierIdentifiants() {
  await SecureStore.deleteItemAsync(CLE);
}
