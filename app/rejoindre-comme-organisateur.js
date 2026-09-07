import {
  View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { messageErreur } from '../lib/erreurs';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE } from '../lib/theme';

// Rejoindre un tournoi comme co-organisateur, à partir du code d'invitation
// donné par l'organisateur principal (voir tournoi/[id]/co-organisateurs.js).
// Contrairement au suivi spectateur (rejoindre.js), un compte est requis :
// la saisie de scores nécessite d'être identifié (voir la fonction
// rejoindre_comme_co_organisateur dans supabase/schema.sql).
export default function RejoindreCommeOrganisateur() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [session, setSession] = useState(undefined);
  const [code, setCode] = useState('');
  const [enCours, setEnCours] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (actif) setSession(s);
      });
      return () => { actif = false; };
    }, [])
  );

  async function rejoindre() {
    const codeSaisi = code.trim();
    if (!codeSaisi) {
      Alert.alert(t('rejoindreOrganisateur.codeManquantTitre'), t('rejoindreOrganisateur.codeManquantMessage'));
      return;
    }
    setEnCours(true);
    const { data: tournoiId, error } = await supabase.rpc('rejoindre_comme_co_organisateur', { p_code: codeSaisi });
    setEnCours(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    if (!tournoiId) {
      Alert.alert(t('rejoindreOrganisateur.codeInvalideTitre'), t('rejoindreOrganisateur.codeInvalideMessage'));
      return;
    }
    router.replace(`/tournoi/${tournoiId}/calendrier`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{t('rejoindreOrganisateur.titre')}</Text>
        <Text style={styles.soustitre}>{t('rejoindreOrganisateur.sousTitre')}</Text>

        {session === undefined ? null : session === null ? (
          <>
            <Text style={styles.texteConnexionRequise}>{t('rejoindreOrganisateur.connexionRequiseMessage')}</Text>
            <Pressable style={styles.bouton} onPress={() => router.push('/connexion')}>
              <Text style={styles.texteBouton}>{t('rejoindreOrganisateur.seConnecter')}</Text>
            </Pressable>
            <Pressable style={styles.boutonSecondaire} onPress={() => router.push('/inscription')}>
              <Text style={styles.texteBoutonSecondaire}>{t('rejoindreOrganisateur.creerUnCompte')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder={t('rejoindreOrganisateur.placeholderCode')}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={rejoindre}
            />
            <Pressable style={styles.bouton} onPress={rejoindre} disabled={enCours}>
              <Text style={styles.texteBouton}>
                {enCours ? t('rejoindreOrganisateur.rejoindreEnCours') : t('rejoindreOrganisateur.rejoindre')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: c.fond },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.texte },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginTop: 8, marginBottom: 24 },
    texteConnexionRequise: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte, marginBottom: 20 },
    input: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      padding: 13,
      fontSize: 14.5,
      fontFamily: POLICE_TEXTE,
      color: c.texte,
      marginBottom: 16,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    boutonSecondaire: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    texteBoutonSecondaire: { color: c.texte, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
  });
}
