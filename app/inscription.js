import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { choisirPhoto, televerserPhoto } from '../lib/profil';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { messageErreur } from '../lib/erreurs';
import ChampMotDePasse from '../components/ChampMotDePasse';

export default function Inscription() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
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
      Alert.alert(t('inscription.champsManquantsTitre'), t('inscription.champsManquantsMessage'));
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
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
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
      router.replace('/choisir-sport');
    } else {
      Alert.alert(
        t('inscription.compteCreeTitre'),
        photoUri ? t('inscription.verifieTaBoiteMailAvecPhoto') : t('inscription.verifieTaBoiteMail'),
        [{ text: t('commun.ok'), onPress: () => router.replace('/connexion') }]
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
      <Text style={styles.titre}>{t('inscription.titre')}</Text>
      <Text style={styles.soustitre}>{t('inscription.sousTitre')}</Text>

      <Text style={styles.label}>{t('inscription.nom')}</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} returnKeyType="next" placeholderTextColor={couleurs.texteAttenue} />

      <Text style={styles.label}>{t('inscription.prenom')}</Text>
      <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} returnKeyType="next" />

      <Text style={styles.label}>{t('inscription.club')}</Text>
      <TextInput style={styles.input} value={club} onChangeText={setClub} returnKeyType="next" />

      <Text style={styles.label}>{t('inscription.email')}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
      />

      <Text style={styles.label}>{t('inscription.motDePasse')}</Text>
      <ChampMotDePasse
        value={motDePasse}
        onChangeText={setMotDePasse}
        returnKeyType="done"
        onSubmitEditing={creerCompte}
      />

      <Pressable style={styles.boutonPhoto} onPress={selectionnerPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.apercuPhoto} />
        ) : (
          <Text style={styles.textePhoto}>{t('inscription.ajouterUnePhoto')}</Text>
        )}
      </Pressable>

      <Pressable style={styles.bouton} onPress={creerCompte} disabled={enCours}>
        <Text style={styles.texteBouton}>{enCours ? t('inscription.creationEnCours') : t('inscription.creerMonCompte')}</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/connexion')}>
        <Text style={styles.lien}>{t('inscription.dejaInscrit')}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 40, paddingBottom: 60, backgroundColor: c.fond, flexGrow: 1 },
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
    boutonPhoto: {
      marginTop: 20,
      borderWidth: 1.5,
      borderColor: c.bordure,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    textePhoto: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    apercuPhoto: { width: 64, height: 64, borderRadius: 32 },
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
