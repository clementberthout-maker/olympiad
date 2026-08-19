import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { choisirPhoto, televerserPhoto } from '../lib/profil';

export default function Profil() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [club, setClub] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [nouvellePhotoUri, setNouvellePhotoUri] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      async function charger() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/connexion');
          return;
        }
        const { data: profil } = await supabase
          .from('profils')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!actif) return;
        setUserId(session.user.id);
        setNom(profil?.nom || '');
        setPrenom(profil?.prenom || '');
        setClub(profil?.club || '');
        setPhotoUrl(profil?.photo_url || null);
        setNouvellePhotoUri(null);
      }
      charger();
      return () => { actif = false; };
    }, [])
  );

  async function selectionnerPhoto() {
    const uri = await choisirPhoto();
    if (uri) setNouvellePhotoUri(uri);
  }

  async function enregistrer() {
    if (!nom || !prenom) {
      Alert.alert('Champs manquants', 'Le nom et le prénom sont obligatoires.');
      return;
    }
    setEnCours(true);
    try {
      let url = photoUrl;
      if (nouvellePhotoUri) {
        url = await televerserPhoto(userId, nouvellePhotoUri);
      }
      const { data, error } = await supabase
        .from('profils')
        .update({ nom, prenom, club: club || null, photo_url: url })
        .eq('id', userId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        // La mise à jour n'a touché aucune ligne : la policy RLS
        // d'update sur "profils" n'a probablement pas été appliquée.
        throw new Error(
          "La mise à jour n'a pas été enregistrée (vérifie que la migration SQL a bien été exécutée sur Supabase)."
        );
      }
      router.replace('/');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  const apercu = nouvellePhotoUri || photoUrl;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Mon profil</Text>

        <Pressable style={styles.boutonPhoto} onPress={selectionnerPhoto}>
          {apercu ? (
            <Image source={{ uri: apercu }} style={styles.apercuPhoto} />
          ) : (
            <Text style={styles.textePhoto}>Ajouter une photo</Text>
          )}
        </Pressable>
        <Text style={styles.aidePhoto}>Touche la photo pour la changer</Text>

        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} returnKeyType="next" />

        <Text style={styles.label}>Prénom</Text>
        <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} returnKeyType="next" />

        <Text style={styles.label}>Club (optionnel)</Text>
        <TextInput style={styles.input} value={club} onChangeText={setClub} returnKeyType="done" />

        <Pressable style={styles.bouton} onPress={enregistrer} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, paddingBottom: 60 },
  titre: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  boutonPhoto: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textePhoto: { fontSize: 11, color: '#999', textAlign: 'center', paddingHorizontal: 6 },
  apercuPhoto: { width: 80, height: 80, borderRadius: 40 },
  aidePhoto: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 8 },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
