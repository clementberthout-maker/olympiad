import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { messageErreur } from '../lib/erreurs';

export default function ReinitialiserMotDePasse() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const { code } = useLocalSearchParams();
  const [pret, setPret] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    async function echangerLeCode() {
      if (!code) {
        Alert.alert(
          t('reinitialiserMotDePasse.lienInvalideTitre'),
          t('reinitialiserMotDePasse.lienInvalideMessage'),
          [{ text: t('commun.ok'), onPress: () => router.replace('/connexion') }]
        );
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        Alert.alert(
          t('reinitialiserMotDePasse.lienExpireTitre'),
          t('reinitialiserMotDePasse.lienExpireMessage'),
          [{ text: t('commun.ok'), onPress: () => router.replace('/connexion') }]
        );
        return;
      }
      setPret(true);
    }
    echangerLeCode();
  }, [code]);

  async function valider() {
    if (motDePasse.length < 6) {
      Alert.alert(t('reinitialiserMotDePasse.motDePasseTropCourtTitre'), t('reinitialiserMotDePasse.motDePasseTropCourtMessage'));
      return;
    }
    if (motDePasse !== confirmation) {
      Alert.alert(t('reinitialiserMotDePasse.motsDePasseDifferentsTitre'), t('reinitialiserMotDePasse.motsDePasseDifferentsMessage'));
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    Alert.alert(t('reinitialiserMotDePasse.motDePasseModifieTitre'), t('reinitialiserMotDePasse.motDePasseModifieMessage'), [
      { text: t('commun.ok'), onPress: () => router.replace('/') },
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
        <Text style={styles.titre}>{t('reinitialiserMotDePasse.titre')}</Text>
        <Text style={styles.soustitre}>{t('reinitialiserMotDePasse.sousTitre')}</Text>

        <Text style={styles.label}>{t('reinitialiserMotDePasse.nouveauMotDePasse')}</Text>
        <TextInput style={styles.input} value={motDePasse} onChangeText={setMotDePasse} secureTextEntry />

        <Text style={styles.label}>{t('reinitialiserMotDePasse.confirmerLeMotDePasse')}</Text>
        <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry />

        <Pressable style={styles.bouton} onPress={valider} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? t('reinitialiserMotDePasse.enregistrementEnCours') : t('reinitialiserMotDePasse.valider')}</Text>
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
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
  });
}
