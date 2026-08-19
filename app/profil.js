import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { choisirPhoto, televerserPhoto } from '../lib/profil';

export default function Profil() {
  const router = useRouter();
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
      }
      charger();
      return () => { actif = false; };
    }, [])
  );

  async function selectionnerPhoto() {
    const uri = await choisirPhoto();
    if (uri) setNouvellePhotoUri(uri);
  }

  async function enregistrer() {
    if (!nom || !prenom) {
      Alert.alert('Champs manquants', 'Le nom et le prénom sont obligatoires.');
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
        throw new Error(
          "La mise à jour n'a pas été enregistrée (vérifie que la migration SQL a bien été exécutée sur Supabase)."
        );
      }
      router.replace('/');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  async function changerEmail() {
    if (!nouvelEmail.trim() || !nouvelEmail.includes('@')) {
      Alert.alert('Adresse invalide', 'Merci de renseigner une adresse e-mail valide.');
      return;
    }
    setEnCoursEmail(true);
    const { error } = await supabase.auth.updateUser({ email: nouvelEmail.trim() });
    setEnCoursEmail(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    Alert.alert(
      'Vérifie ta boîte mail',
      `Un e-mail de confirmation a été envoyé à ${nouvelEmail.trim()}. Ta nouvelle adresse ne sera active qu'une fois le lien confirmé.`
    );
    setNouvelEmail('');
  }

  async function changerMotDePasse() {
    if (!ancienMotDePasse) {
      Alert.alert('Mot de passe actuel manquant', 'Merci de saisir ton mot de passe actuel.');
      return;
    }
    if (motDePasse.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (motDePasse !== confirmationMotDePasse) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Merci de vérifier la confirmation.');
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
      Alert.alert('Mot de passe actuel incorrect', "Vérifie ton mot de passe actuel et réessaie.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCoursMotDePasse(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    setAncienMotDePasse('');
    setMotDePasse('');
    setConfirmationMotDePasse('');
    Alert.alert('Mot de passe modifié');
  }

  const apercu = nouvellePhotoUri || photoUrl;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Mon profil</Text>

        <Pressable style={styles.boutonPhoto} onPress={selectionnerPhoto}>
          {apercu ? (
            <Image source={{ uri: apercu }} style={styles.apercuPhoto} />
          ) : (
            <Text style={styles.textePhoto}>Ajouter une photo</Text>
          )}
        </Pressable>
        <Text style={styles.aidePhoto}>Touche la photo pour la changer</Text>

        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} returnKeyType="next" />

        <Text style={styles.label}>Prénom</Text>
        <TextInput style={styles.input} value={prenom} onChangeText={setPrenom} returnKeyType="next" />

        <Text style={styles.label}>Club (optionnel)</Text>
        <TextInput style={styles.input} value={club} onChangeText={setClub} returnKeyType="done" />

        <Pressable style={styles.bouton} onPress={enregistrer} disabled={enCours}>
          <Text style={styles.texteBouton}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </Pressable>

        <View style={styles.separateur} />

        <Text style={styles.titreSection}>Adresse e-mail</Text>
        <Text style={styles.aideSection}>Actuelle : {emailActuel}</Text>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle adresse e-mail"
          value={nouvelEmail}
          onChangeText={setNouvelEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Pressable style={styles.boutonSecondaire} onPress={changerEmail} disabled={enCoursEmail}>
          <Text style={styles.texteBoutonSecondaire}>
            {enCoursEmail ? 'Envoi…' : "Changer l'adresse e-mail"}
          </Text>
        </Pressable>

        <View style={styles.separateur} />

        <View style={styles.ligneTitreSection}>
          <Text style={styles.titreSection}>Mot de passe</Text>
          <Pressable onPress={() => router.push('/mot-de-passe-oublie')}>
            <Text style={styles.lienMotDePasseOublie}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          value={ancienMotDePasse}
          onChangeText={setAncienMotDePasse}
          secureTextEntry
        />
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
        />
        <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirmationMotDePasse}
          onChangeText={setConfirmationMotDePasse}
          secureTextEntry
        />
        <Pressable style={styles.boutonSecondaire} onPress={changerMotDePasse} disabled={enCoursMotDePasse}>
          <Text style={styles.texteBoutonSecondaire}>
            {enCoursMotDePasse ? 'Modification…' : 'Changer le mot de passe'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, paddingBottom: 60 },
  titre: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  label: { fontSize: 12, color: '#888', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  boutonPhoto: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textePhoto: { fontSize: 11, color: '#999', textAlign: 'center', paddingHorizontal: 6 },
  apercuPhoto: { width: 80, height: 80, borderRadius: 40 },
  aidePhoto: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 8 },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
  separateur: { height: 1, backgroundColor: '#eee', marginTop: 32, marginBottom: 4 },
  titreSection: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 4 },
  aideSection: { fontSize: 12, color: '#888', marginBottom: 10 },
  ligneTitreSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lienMotDePasseOublie: { fontSize: 12, color: '#4338ca' },
  boutonSecondaire: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  texteBoutonSecondaire: { fontSize: 14, fontWeight: '500', color: '#333' },
});
