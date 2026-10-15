import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Identifiants de connexion enregistrés sur l'appareil (Keychain iOS /
// Keystore Android via expo-secure-store, jamais en clair ni côté serveur).
// Sur le web (aperçu), pas de stockage sécurisé : rien n'est enregistré.
const CLE = 'olympiad_identifiants';
const DISPONIBLE = Platform.OS !== 'web';

export async function enregistrerIdentifiants(email, motDePasse) {
  if (!DISPONIBLE) return;
  await SecureStore.setItemAsync(CLE, JSON.stringify({ email, motDePasse }));
}

export async function recupererIdentifiants() {
  if (!DISPONIBLE) return null;
  const valeur = await SecureStore.getItemAsync(CLE);
  return valeur ? JSON.parse(valeur) : null;
}

export async function oublierIdentifiants() {
  if (!DISPONIBLE) return;
  await SecureStore.deleteItemAsync(CLE);
}
