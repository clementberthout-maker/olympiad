import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function seConnecter() {
    if (!email || !motDePasse) {
      Alert.alert('Champs manquants', 'Merci de renseigner ton email et ton mot de passe.');
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      Alert.alert('Connexion impossible', error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Connexion</Text>
        <Text style={styles.soustitre}>Accède à tes tournois</Text>

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
          onSubmitEditing={seConnecter}
        />

        <Pressable style={styles.bouton} onPress={seConnecter} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? 'Connexion…' : 'Se connecter'}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/inscription')}>
          <Text style={styles.lien}>Pas encore de compte ? Créer un compte</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
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
