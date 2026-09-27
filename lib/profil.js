import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { oublierIdentifiants } from './identifiantsEnregistres';

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

// Supprime définitivement le compte de l'utilisateur connecté et toutes ses
// données (voir supprimer_mon_compte dans supabase/schema.sql) : d'abord sa
// photo de profil via l'API Storage (le SQL ne peut pas toucher au
// stockage), puis le reste côté serveur, et enfin la session et les
// identifiants enregistrés sur cet appareil.
export async function supprimerMonCompte(userId) {
  const { data: fichiers } = await supabase.storage.from('avatars').list('', { search: userId });
  const aSupprimer = (fichiers || [])
    .map((f) => f.name)
    .filter((nom) => nom.split('.')[0] === userId);
  if (aSupprimer.length > 0) {
    const { error: erreurPhoto } = await supabase.storage.from('avatars').remove(aSupprimer);
    if (erreurPhoto) throw erreurPhoto;
  }

  const { error } = await supabase.rpc('supprimer_mon_compte');
  if (error) throw error;

  await oublierIdentifiants();
  // "local" : le compte n'existe plus côté serveur, inutile (et voué à
  // l'échec) de l'y déconnecter.
  await supabase.auth.signOut({ scope: 'local' });
}
