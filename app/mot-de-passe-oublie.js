import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

export default function MotDePasseOublie() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    if (!email || !email.includes('@')) {
      Alert.alert('Adresse invalide', 'Merci de renseigner ton adresse e-mail.');
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('reinitialiser-mot-de-passe'),
    });
    setEnCours(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    Alert.alert(
      'Vérifie ta boîte mail',
      `Si un compte existe pour ${email.trim()}, un lien de réinitialisation vient de lui être envoyé.`,
      [{ text: 'OK', onPress: () => router.replace('/connexion') }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Mot de passe oublié</Text>
        <Text style={styles.soustitre}>
          Indique ton adresse e-mail, tu recevras un lien pour choisir un nouveau mot de passe.
        </Text>

        <Text style={styles.label}>Adresse e-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={envoyer}
        />

        <Pressable style={styles.bouton} onPress={envoyer} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? 'Envoi…' : 'Envoyer le lien'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.lien}>Retour à la connexion</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  titre: { fontSize: 22, fontWeight: '600' },
  soustitre: { fontSize: 13, color: '#888', marginTop: 8, marginBottom: 24 },
  label: { fontSize: 12, color: '#888', marginBottom: 6 },
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
    marginBottom: 16,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
  lien: { fontSize: 13, color: '#4338ca', textAlign: 'center' },
});
