import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { choisirPhoto, televerserPhoto } from '../lib/profil';

export default function Inscription() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [club, setClub] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function selectionnerPhoto() {
    const uri = await choisirPhoto();
    if (uri) setPhotoUri(uri);
  }

  async function creerCompte() {
    if (!nom || !prenom || !email || !motDePasse) {
      Alert.alert('Champs manquants', 'Merci de renseigner au minimum le nom, le prénom, l\'email et le mot de passe.');
      return;
    }
    setEnCours(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom, prenom, club: club || null } },
    });

    if (error) {
      setEnCours(false);
      Alert.alert('Erreur', error.message);
      return;
    }

    if (data.session && photoUri) {
      try {
        const url = await televerserPhoto(data.session.user.id, photoUri);
        await supabase.from('profils').update({ photo_url: url }).eq('id', data.session.user.id);
      } catch (e) {
        // La photo n'est pas bloquante : le compte est créé, on pourra
        // réessayer depuis l'écran de profil.
      }
    }

    setEnCours(false);

    if (data.session) {
      router.replace('/creer-tournoi');
    } else {
      Alert.alert(
        'Compte créé',
        photoUri
          ? "Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi. Tu pourras ajouter ta photo depuis ton profil une fois connecté."
          : 'Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.',
        [{ text: 'OK', onPress: () => router.replace('/connexion') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titre}>Créer mon compte</Text>
      <Text style={styles.soustitre}>Nécessaire pour créer et gérer tes tournois</Text>

      <Text style={styles.label}>Nom</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} returnKeyType="next" />

      <Text style={styles.label}>Prénom</Text>
      <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} returnKeyType="next" />

      <Text style={styles.label}>Club (optionnel)</Text>
      <TextInput style={styles.input} value={club} onChangeText={setClub} returnKeyType="next" />

      <Text style={styles.label}>Adresse e-mail</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
      />

      <Text style={styles.label}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={creerCompte}
      />

      <Pressable style={styles.boutonPhoto} onPress={selectionnerPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.apercuPhoto} />
        ) : (
          <Text style={styles.textePhoto}>Ajouter une photo</Text>
        )}
      </Pressable>

      <Pressable style={styles.bouton} onPress={creerCompte} disabled={enCours}>
        <Text style={styles.texteBouton}>{enCours ? 'Création…' : 'Créer mon compte'}</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/connexion')}>
        <Text style={styles.lien}>Déjà inscrit ? Se connecter</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, paddingBottom: 60 },
  titre: { fontSize: 22, fontWeight: '600' },
  soustitre: { fontSize: 13, color: '#888', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  boutonPhoto: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textePhoto: { fontSize: 13, color: '#999' },
  apercuPhoto: { width: 64, height: 64, borderRadius: 32 },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
  lien: { fontSize: 13, color: '#4338ca', textAlign: 'center' },
});
