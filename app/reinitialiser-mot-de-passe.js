import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function ReinitialiserMotDePasse() {
  const router = useRouter();
  const { code } = useLocalSearchParams();
  const [pret, setPret] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    async function echangerLeCode() {
      if (!code) {
        Alert.alert(
          'Lien invalide',
          "Ce lien de réinitialisation n'est plus valide. Refais une demande depuis l'écran de connexion.",
          [{ text: 'OK', onPress: () => router.replace('/connexion') }]
        );
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        Alert.alert(
          'Lien expiré',
          "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Refais une demande.",
          [{ text: 'OK', onPress: () => router.replace('/connexion') }]
        );
        return;
      }
      setPret(true);
    }
    echangerLeCode();
  }, [code]);

  async function valider() {
    if (motDePasse.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (motDePasse !== confirmation) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Merci de vérifier la confirmation.');
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    Alert.alert('Mot de passe modifié', 'Tu peux maintenant utiliser ton nouveau mot de passe.', [
      { text: 'OK', onPress: () => router.replace('/') },
    ]);
  }

  if (!pret) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Nouveau mot de passe</Text>
        <Text style={styles.soustitre}>Choisis un nouveau mot de passe pour ton compte.</Text>

        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput style={styles.input} value={motDePasse} onChangeText={setMotDePasse} secureTextEntry />

        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry />

        <Pressable style={styles.bouton} onPress={valider} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? 'Enregistrement…' : 'Valider'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  titre: { fontSize: 22, fontWeight: '600' },
  soustitre: { fontSize: 13, color: '#888', marginTop: 8, marginBottom: 24 },
  label: { fontSize: 12, color: '#888', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
