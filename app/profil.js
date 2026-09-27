import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { choisirPhoto, televerserPhoto, supprimerMonCompte } from '../lib/profil';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { useAchats } from '../lib/achats';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import BasculeTheme from '../components/BasculeTheme';
import LiensLegaux from '../components/LiensLegaux';
import { recupererIdentifiants, oublierIdentifiants, enregistrerIdentifiants } from '../lib/identifiantsEnregistres';
import { messageErreur } from '../lib/erreurs';

export default function Profil() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const { estPro, restaurerAchats } = useAchats();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [restaurationEnCours, setRestaurationEnCours] = useState(false);
  const [userId, setUserId] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [club, setClub] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [nouvellePhotoUri, setNouvellePhotoUri] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [emailActuel, setEmailActuel] = useState('');
  const [nouvelEmail, setNouvelEmail] = useState('');
  const [enCoursEmail, setEnCoursEmail] = useState(false);

  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [enCoursMotDePasse, setEnCoursMotDePasse] = useState(false);

  const [identifiantsEnregistres, setIdentifiantsEnregistres] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      async function charger() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/connexion');
          return;
        }
        const { data: profil } = await supabase
          .from('profils')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!actif) return;
        setUserId(session.user.id);
        setNom(profil?.nom || '');
        setPrenom(profil?.prenom || '');
        setClub(profil?.club || '');
        setPhotoUrl(profil?.photo_url || null);
        setNouvellePhotoUri(null);
        setEmailActuel(session.user.email || '');
        setNouvelEmail('');
        setAncienMotDePasse('');
        setMotDePasse('');
        setConfirmationMotDePasse('');

        const identifiants = await recupererIdentifiants();
        if (actif) setIdentifiantsEnregistres(!!identifiants);
      }
      charger();
      return () => { actif = false; };
    }, [])
  );

  function confirmerOubliIdentifiants() {
    Alert.alert(
      t('profil.oublierIdentifiantsTitre'),
      t('profil.oublierIdentifiantsMessage'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('accueil.oublier'),
          style: 'destructive',
          onPress: async () => {
            await oublierIdentifiants();
            setIdentifiantsEnregistres(false);
          },
        },
      ]
    );
  }

  async function restaurer() {
    setRestaurationEnCours(true);
    try {
      await restaurerAchats();
      Alert.alert(t('paywall.achatsRestaures'));
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setRestaurationEnCours(false);
    }
  }

  async function selectionnerPhoto() {
    const uri = await choisirPhoto();
    if (uri) setNouvellePhotoUri(uri);
  }

  async function enregistrer() {
    if (!nom || !prenom) {
      Alert.alert(t('profil.champsManquantsTitre'), t('profil.champsManquantsMessage'));
      return;
    }
    setEnCours(true);
    try {
      let url = photoUrl;
      if (nouvellePhotoUri) {
        url = await televerserPhoto(userId, nouvellePhotoUri);
      }
      const { data, error } = await supabase
        .from('profils')
        .update({ nom, prenom, club: club || null, photo_url: url })
        .eq('id', userId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        // La mise à jour n'a touché aucune ligne : la policy RLS
        // d'update sur "profils" n'a probablement pas été appliquée.
        throw new Error(t('profil.migrationNonAppliquee'));
      }
      router.replace('/');
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  async function changerEmail() {
    if (!nouvelEmail.trim() || !nouvelEmail.includes('@')) {
      Alert.alert(t('profil.adresseInvalideTitre'), t('profil.adresseInvalideMessage'));
      return;
    }
    setEnCoursEmail(true);
    const { error } = await supabase.auth.updateUser({ email: nouvelEmail.trim() });
    setEnCoursEmail(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    Alert.alert(
      t('profil.verifieTaBoiteMailTitre'),
      t('profil.verifieTaBoiteMailMessage', { email: nouvelEmail.trim() })
    );
    setNouvelEmail('');
  }

  async function changerMotDePasse() {
    if (!ancienMotDePasse) {
      Alert.alert(t('profil.motDePasseActuelManquantTitre'), t('profil.motDePasseActuelManquantMessage'));
      return;
    }
    if (motDePasse.length < 6) {
      Alert.alert(t('profil.motDePasseTropCourtTitre'), t('profil.motDePasseTropCourtMessage'));
      return;
    }
    if (motDePasse !== confirmationMotDePasse) {
      Alert.alert(t('profil.motsDePasseDifferentsTitre'), t('profil.motsDePasseDifferentsMessage'));
      return;
    }
    setEnCoursMotDePasse(true);

    // Vérifie l'ancien mot de passe en se reconnectant avec, avant
    // d'autoriser le changement.
    const { error: erreurVerification } = await supabase.auth.signInWithPassword({
      email: emailActuel,
      password: ancienMotDePasse,
    });
    if (erreurVerification) {
      setEnCoursMotDePasse(false);
      Alert.alert(t('profil.motDePasseActuelIncorrectTitre'), t('profil.motDePasseActuelIncorrectMessage'));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCoursMotDePasse(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    if (identifiantsEnregistres) {
      await enregistrerIdentifiants(emailActuel, motDePasse);
    }
    setAncienMotDePasse('');
    setMotDePasse('');
    setConfirmationMotDePasse('');
    Alert.alert(t('profil.motDePasseModifie'));
  }

  // Double confirmation : l'action est irréversible (tournois, résultats et
  // compte supprimés définitivement).
  function confirmerSuppressionCompte() {
    Alert.alert(
      t('profil.supprimerCompteTitre'),
      t('profil.supprimerCompteMessage'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('commun.supprimer'),
          style: 'destructive',
          onPress: () => Alert.alert(
            t('profil.supprimerCompteConfirmationTitre'),
            t('profil.supprimerCompteConfirmationMessage'),
            [
              { text: t('commun.annuler'), style: 'cancel' },
              { text: t('profil.supprimerDefinitivement'), style: 'destructive', onPress: supprimerCompte },
            ]
          ),
        },
      ]
    );
  }

  async function supprimerCompte() {
    setSuppressionEnCours(true);
    try {
      await supprimerMonCompte(userId);
      Alert.alert(t('profil.compteSupprimeTitre'), t('profil.compteSupprimeMessage'));
      router.replace('/');
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setSuppressionEnCours(false);
    }
  }

  const apercu = nouvellePhotoUri || photoUrl;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{t('profil.titre')}</Text>

        <Pressable style={styles.boutonPhoto} onPress={selectionnerPhoto}>
          {apercu ? (
            <Image source={{ uri: apercu }} style={styles.apercuPhoto} />
          ) : (
            <Text style={styles.textePhoto}>{t('profil.ajouterUnePhoto')}</Text>
          )}
        </Pressable>
        <Text style={styles.aidePhoto}>{t('profil.toucheLaPhoto')}</Text>

        <Text style={styles.label}>{t('profil.nom')}</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} returnKeyType="next" />

        <Text style={styles.label}>{t('profil.prenom')}</Text>
        <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} returnKeyType="next" />

        <Text style={styles.label}>{t('profil.club')}</Text>
        <TextInput style={styles.input} value={club} onChangeText={setClub} returnKeyType="done" />

        <Pressable style={styles.bouton} onPress={enregistrer} disabled={enCours}>
          <Text style={styles.texteBouton}>
            {enCours ? t('profil.enregistrementEnCours') : t('profil.enregistrer')}
          </Text>
        </Pressable>

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>{t('profil.abonnement')}</Text>
        <Text style={styles.aideSection}>
          {estPro ? t('profil.abonnementProActif') : t('profil.abonnementGratuitAide')}
        </Text>
        {!estPro && (
          <Pressable style={styles.boutonSecondaire} onPress={() => router.push({ pathname: '/paywall', params: { raison: 'defaut' } })}>
            <Text style={styles.texteBoutonSecondaire}>{t('profil.passerPro')}</Text>
          </Pressable>
        )}
        <Pressable style={styles.boutonSecondaire} onPress={restaurer} disabled={restaurationEnCours}>
          <Text style={styles.texteBoutonSecondaire}>
            {restaurationEnCours ? t('paywall.restaurationEnCours') : t('paywall.restaurerMesAchats')}
          </Text>
        </Pressable>

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>{t('profil.apparence')}</Text>
        <Text style={styles.aideSection}>{t('profil.apparenceAide')}</Text>
        <BasculeTheme />

        {identifiantsEnregistres && (
          <>
            <View style={styles.separateur} />
            <Text style={styles.titreSection}>{t('profil.identifiantsEnregistres')}</Text>
            <Text style={styles.aideSection}>{t('profil.identifiantsEnregistresAide')}</Text>
            <Pressable style={styles.boutonSecondaire} onPress={confirmerOubliIdentifiants}>
              <Text style={styles.texteBoutonSecondaire}>{t('profil.oublierIdentifiants')}</Text>
            </Pressable>
          </>
        )}

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>{t('profil.adresseEmail')}</Text>
        <Text style={styles.aideSection}>{t('profil.actuelle', { email: emailActuel })}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('profil.placeholderNouvelEmail')}
          value={nouvelEmail}
          onChangeText={setNouvelEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable style={styles.boutonSecondaire} onPress={changerEmail} disabled={enCoursEmail}>
          <Text style={styles.texteBoutonSecondaire}>
            {enCoursEmail ? t('profil.envoiEnCours') : t('profil.changerAdresseEmail')}
          </Text>
        </Pressable>

        <View style={styles.separateur} />

        <View style={styles.ligneTitreSection}>
          <Text style={styles.titreSection}>{t('profil.motDePasse')}</Text>
          <Pressable onPress={() => router.push('/mot-de-passe-oublie')}>
            <Text style={styles.lienMotDePasseOublie}>{t('profil.motDePasseOublie')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('profil.motDePasseActuel')}</Text>
        <TextInput
          style={styles.input}
          value={ancienMotDePasse}
          onChangeText={setAncienMotDePasse}
          secureTextEntry
        />
        <Text style={styles.label}>{t('profil.nouveauMotDePasse')}</Text>
        <TextInput
          style={styles.input}
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
        />
        <Text style={styles.label}>{t('profil.confirmerLeNouveauMotDePasse')}</Text>
        <TextInput
          style={styles.input}
          value={confirmationMotDePasse}
          onChangeText={setConfirmationMotDePasse}
          secureTextEntry
        />
        <Pressable style={styles.boutonSecondaire} onPress={changerMotDePasse} disabled={enCoursMotDePasse}>
          <Text style={styles.texteBoutonSecondaire}>
            {enCoursMotDePasse ? t('profil.modificationEnCours') : t('profil.changerLeMotDePasse')}
          </Text>
        </Pressable>

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>{t('profil.informationsLegales')}</Text>
        <LiensLegaux />

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>{t('profil.supprimerCompte')}</Text>
        <Text style={styles.aideSection}>{t('profil.supprimerCompteAide')}</Text>
        <Pressable style={styles.boutonDanger} onPress={confirmerSuppressionCompte} disabled={suppressionEnCours}>
          <Text style={styles.texteBoutonDanger}>
            {suppressionEnCours ? t('profil.suppressionEnCours') : t('profil.supprimerMonCompte')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 40, paddingBottom: 60, backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 28, letterSpacing: 0.3, color: c.texte, marginBottom: 24 },
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
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: c.bordure,
      borderStyle: 'dashed',
      borderRadius: 40,
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    textePhoto: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue, textAlign: 'center', paddingHorizontal: 6 },
    apercuPhoto: { width: 80, height: 80, borderRadius: 40 },
    aidePhoto: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue, textAlign: 'center', marginTop: 8 },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 28,
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    separateur: { height: 1, backgroundColor: c.bordure, marginTop: 32, marginBottom: 4 },
    titreSection: { fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.2, color: c.texte, marginTop: 20, marginBottom: 4 },
    aideSection: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginBottom: 10 },
    ligneTitreSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    lienMotDePasseOublie: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12, color: c.lien },
    boutonSecondaire: {
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 10,
    },
    texteBoutonSecondaire: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    boutonDanger: {
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 10,
    },
    texteBoutonDanger: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.danger },
  });
}
