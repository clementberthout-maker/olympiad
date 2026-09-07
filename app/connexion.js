import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { enregistrerIdentifiants, recupererIdentifiants } from '../lib/identifiantsEnregistres';
import { messageErreur } from '../lib/erreurs';
import ChampMotDePasse from '../components/ChampMotDePasse';

export default function Connexion() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [identifiantsSauvegardes, setIdentifiantsSauvegardes] = useState(null);

  useEffect(() => {
    recupererIdentifiants().then((identifiants) => {
      if (identifiants) {
        setEmail(identifiants.email);
        setMotDePasse(identifiants.motDePasse);
        setIdentifiantsSauvegardes(identifiants);
      }
    });
  }, []);

  function proposerEnregistrement() {
    Alert.alert(
      t('connexion.enregistrerIdentifiantsTitre'),
      t('connexion.enregistrerIdentifiantsMessage'),
      [
        { text: t('connexion.nonMerci'), style: 'cancel', onPress: () => router.replace('/') },
        {
          text: t('connexion.enregistrer'),
          onPress: async () => {
            await enregistrerIdentifiants(email, motDePasse);
            router.replace('/');
          },
        },
      ]
    );
  }

  async function seConnecter() {
    if (!email || !motDePasse) {
      Alert.alert(t('connexion.champsManquantsTitre'), t('connexion.champsManquantsMessage'));
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      Alert.alert(t('connexion.connexionImpossible'), messageErreur(error, t));
      return;
    }
    const dejaEnregistres = identifiantsSauvegardes?.email === email
      && identifiantsSauvegardes?.motDePasse === motDePasse;
    if (dejaEnregistres) {
      router.replace('/');
      return;
    }
    proposerEnregistrement();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{t('connexion.titre')}</Text>
        <Text style={styles.soustitre}>{t('connexion.sousTitre')}</Text>

        <Text style={styles.label}>{t('connexion.email')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <Text style={styles.label}>{t('connexion.motDePasse')}</Text>
        <ChampMotDePasse
          value={motDePasse}
          onChangeText={setMotDePasse}
          returnKeyType="done"
          onSubmitEditing={seConnecter}
        />

        <Pressable style={styles.bouton} onPress={seConnecter} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? t('connexion.connexionEnCours') : t('connexion.seConnecter')}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/mot-de-passe-oublie')}>
          <Text style={styles.lien}>{t('connexion.motDePasseOublie')}</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/inscription')} style={{ marginTop: 14 }}>
          <Text style={styles.lien}>{t('connexion.pasEncoreDeCompte')}</Text>
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
