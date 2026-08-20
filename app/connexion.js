import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

export default function Connexion() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
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

        <Pressable onPress={() => router.push('/mot-de-passe-oublie')}>
          <Text style={styles.lien}>Mot de passe oublié ?</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/inscription')} style={{ marginTop: 14 }}>
          <Text style={styles.lien}>Pas encore de compte ? Créer un compte</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: c.fond },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.texte },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginBottom: 24 },
    label: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginTop: 14, marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      padding: 13,
      fontSize: 14.5,
      fontFamily: POLICE_TEXTE,
      color: c.texte,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 16,
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    lien: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien, textAlign: 'center' },
  });
}
