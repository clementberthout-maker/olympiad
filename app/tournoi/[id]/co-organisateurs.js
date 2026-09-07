import { View, Text, StyleSheet, Pressable, Share, Alert, Switch } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../lib/supabase';
import { messageErreur } from '../../../lib/erreurs';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { useAchats, tournoiEstDebloque } from '../../../lib/achats';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

// Écran de l'organisateur principal pour inviter des co-organisateurs (voir
// supabase/schema.sql, tables tournoi_organisateurs / invitations_organisateur) :
// génère/affiche le code d'invitation à partager, et permet de choisir les
// droits de chaque co-organisateur déjà présent (ou de le retirer).
export default function CoOrganisateurs() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const { estPro } = useAchats();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [tournoi, setTournoi] = useState(null);
  const [code, setCode] = useState(null);
  const [coOrganisateurs, setCoOrganisateurs] = useState([]);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    const { data: t2 } = await supabase.from('tournois').select('nom, debloque').eq('id', id).single();
    setTournoi(t2);

    let { data: invitation, error: erreurInvitation } = await supabase
      .from('invitations_organisateur')
      .select('code')
      .eq('tournoi_id', id)
      .maybeSingle();
    if (erreurInvitation) {
      setErreur(erreurInvitation);
      return;
    }
    if (!invitation) {
      const { data: nouvelleInvitation, error: erreurCreation } = await supabase
        .from('invitations_organisateur')
        .insert({ tournoi_id: id })
        .select('code')
        .single();
      if (erreurCreation) {
        setErreur(erreurCreation);
        return;
      }
      invitation = nouvelleInvitation;
    }
    setCode(invitation.code);
    setErreur(null);

    const { data: lignes, error: erreurLignes } = await supabase
      .from('tournoi_organisateurs')
      .select('*')
      .eq('tournoi_id', id)
      .order('created_at');
    if (erreurLignes) {
      setErreur(erreurLignes);
      return;
    }

    const idsUtilisateurs = (lignes || []).map((l) => l.user_id);
    let profils = [];
    if (idsUtilisateurs.length > 0) {
      const { data } = await supabase.from('profils').select('id, nom, prenom').in('id', idsUtilisateurs);
      profils = data || [];
    }
    setCoOrganisateurs(
      (lignes || []).map((ligne) => ({
        ...ligne,
        profil: profils.find((p) => p.id === ligne.user_id) || null,
      }))
    );
  }, [id]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  // Filet de sécurité si cet écran est atteint directement (ex. lien
  // profond) sans passer par le menu de partage de calendrier.js, qui gate
  // déjà l'accès normalement.
  useEffect(() => {
    if (tournoi && !tournoiEstDebloque(tournoi, estPro)) {
      router.replace({ pathname: '/paywall', params: { tournoiId: id, raison: 'co_organisateurs' } });
    }
  }, [tournoi, estPro, id, router]);

  async function copierLeCode() {
    await Clipboard.setStringAsync(code);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  function partager() {
    Share.share({
      message: t('coOrganisateurs.messagePartage', { nom: tournoi?.nom, code }),
    });
  }

  async function basculerDroit(userId, champ, valeur) {
    setCoOrganisateurs((liste) => liste.map((c) => (c.user_id === userId ? { ...c, [champ]: valeur } : c)));
    const { error } = await supabase
      .from('tournoi_organisateurs')
      .update({ [champ]: valeur })
      .eq('tournoi_id', id)
      .eq('user_id', userId);
    if (error) {
      setCoOrganisateurs((liste) => liste.map((c) => (c.user_id === userId ? { ...c, [champ]: !valeur } : c)));
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
    }
  }

  function confirmerRetrait(coOrganisateur) {
    const nom = nomAffiche(coOrganisateur);
    Alert.alert(
      t('coOrganisateurs.retirerTitre'),
      t('coOrganisateurs.retirerMessage', { nom }),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('coOrganisateurs.retirer'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('tournoi_organisateurs')
              .delete()
              .eq('tournoi_id', id)
              .eq('user_id', coOrganisateur.user_id);
            if (error) {
              Alert.alert(t('commun.erreur'), messageErreur(error, t));
              return;
            }
            setCoOrganisateurs((liste) => liste.filter((c) => c.user_id !== coOrganisateur.user_id));
          },
        },
      ]
    );
  }

  function nomAffiche(coOrganisateur) {
    const profil = coOrganisateur.profil;
    return profil ? `${profil.prenom} ${profil.nom}`.trim() : coOrganisateur.user_id;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>{t('coOrganisateurs.titre')}</Text>
      <Text style={styles.soustitre}>{t('coOrganisateurs.sousTitre')}</Text>

      {erreur && (
        <Text style={styles.texteErreur}>{messageErreur(erreur, t)}</Text>
      )}

      {code && (
        <View style={styles.carte}>
          <Text style={styles.carteLabel}>{t('coOrganisateurs.codeInvitation')}</Text>
          <Text style={styles.carteAide}>{t('coOrganisateurs.codeInvitationAide')}</Text>
          <Pressable style={styles.ligneCode} onPress={copierLeCode} hitSlop={8}>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.lienCopier}>{copie ? t('coOrganisateurs.copie') : t('coOrganisateurs.copier')}</Text>
          </Pressable>
          <Pressable style={styles.bouton} onPress={partager}>
            <Text style={styles.texteBouton}>{t('coOrganisateurs.partagerLeCode')}</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitre}>{t('coOrganisateurs.listeTitre')}</Text>
      {coOrganisateurs.length === 0 && (
        <Text style={styles.vide}>{t('coOrganisateurs.aucunCoOrganisateur')}</Text>
      )}
      {coOrganisateurs.map((coOrganisateur) => (
        <View key={coOrganisateur.user_id} style={styles.carteCoOrganisateur}>
          <View style={styles.enteteCoOrganisateur}>
            <Text style={styles.nomCoOrganisateur}>{nomAffiche(coOrganisateur)}</Text>
            <Pressable onPress={() => confirmerRetrait(coOrganisateur)} hitSlop={8}>
              <Text style={styles.lienRetirer}>{t('coOrganisateurs.retirer')}</Text>
            </Pressable>
          </View>

          <View style={styles.ligneDroit}>
            <Text style={styles.texteDroit}>{t('coOrganisateurs.saisirLesScores')}</Text>
            <Switch
              value={coOrganisateur.peut_saisir_scores}
              onValueChange={(v) => basculerDroit(coOrganisateur.user_id, 'peut_saisir_scores', v)}
              trackColor={{ false: couleurs.bordure, true: couleurs.accent }}
              thumbColor={couleurs.surface2}
            />
          </View>
          <View style={styles.ligneDroit}>
            <Text style={styles.texteDroit}>{t('coOrganisateurs.gererLeTournoi')}</Text>
            <Switch
              value={coOrganisateur.peut_gerer_le_tournoi}
              onValueChange={(v) => basculerDroit(coOrganisateur.user_id, 'peut_gerer_le_tournoi', v)}
              trackColor={{ false: couleurs.bordure, true: couleurs.accent }}
              thumbColor={couleurs.surface2}
            />
          </View>
          <View style={styles.ligneDroit}>
            <Text style={styles.texteDroit}>{t('coOrganisateurs.supprimerLeTournoi')}</Text>
            <Switch
              value={coOrganisateur.peut_supprimer_le_tournoi}
              onValueChange={(v) => basculerDroit(coOrganisateur.user_id, 'peut_supprimer_le_tournoi', v)}
              trackColor={{ false: couleurs.bordure, true: couleurs.accent }}
              thumbColor={couleurs.surface2}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 24, backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginTop: 6, marginBottom: 18 },
    texteErreur: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.danger, marginBottom: 18 },
    carte: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
    },
    carteLabel: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginBottom: 4,
    },
    carteAide: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginBottom: 12 },
    ligneCode: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    code: { fontFamily: POLICE_TITRE, fontSize: 22, color: c.texte, letterSpacing: 1 },
    lienCopier: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, color: c.lien },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.3 },
    sectionTitre: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.3,
      color: c.texteAttenue, marginBottom: 10,
    },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    carteCoOrganisateur: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    enteteCoOrganisateur: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
    },
    nomCoOrganisateur: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte, flexShrink: 1, marginRight: 8 },
    lienRetirer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, color: c.danger },
    ligneDroit: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6,
    },
    texteDroit: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte },
  });
}
