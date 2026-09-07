import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { messageErreur } from '../lib/erreurs';

export default function MotDePasseOublie() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [email, setEmail] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    if (!email || !email.includes('@')) {
      Alert.alert(t('motDePasseOublie.adresseInvalideTitre'), t('motDePasseOublie.adresseInvalideMessage'));
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('reinitialiser-mot-de-passe'),
    });
    setEnCours(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    Alert.alert(
      t('motDePasseOublie.verifieTaBoiteMailTitre'),
      t('motDePasseOublie.verifieTaBoiteMailMessage', { email: email.trim() }),
      [{ text: t('commun.ok'), onPress: () => router.replace('/connexion') }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{t('motDePasseOublie.titre')}</Text>
        <Text style={styles.soustitre}>{t('motDePasseOublie.sousTitre')}</Text>

        <Text style={styles.label}>{t('motDePasseOublie.email')}</Text>
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
          <Text style={styles.texteBouton}>{enCours ? t('motDePasseOublie.envoiEnCours') : t('motDePasseOublie.envoyerLeLien')}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.lien}>{t('motDePasseOublie.retourALaConnexion')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: c.fond },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.texte },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginTop: 8, marginBottom: 24 },
    label: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginBottom: 6,
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
