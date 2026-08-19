import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from './supabase';

// Ouvre la pellicule photo du téléphone et renvoie l'URI locale de l'image
// choisie (recadrée en carré), ou null si l'utilisateur a annulé ou refusé
// la permission.
export async function choisirPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const resultat = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (resultat.canceled) return null;
  return resultat.assets[0].uri;
}

// Envoie la photo (URI locale) vers le bucket Supabase "avatars", au nom de
// l'utilisateur connecté, et renvoie son URL publique (avec un paramètre
// anti-cache pour que le changement soit visible immédiatement partout).
// Lit le fichier via expo-file-system (bytes bruts) plutôt que
// fetch().blob(), qui peut produire un fichier vide sur certains Android.
export async function televerserPhoto(userId, uriLocale) {
  const fichier = new File(uriLocale);
  const octets = await fichier.bytes();
  if (!octets || octets.byteLength === 0) {
    throw new Error("Impossible de lire la photo sélectionnée (fichier vide).");
  }
  const chemin = `${userId}.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(chemin, octets, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(chemin);
  return `${data.publicUrl}?t=${Date.now()}`;
}
