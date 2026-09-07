import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAchats, PRODUIT_PASS_TOURNOI, PRODUIT_PRO_MENSUEL } from '../lib/achats';
import { messageErreur } from '../lib/erreurs';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Écran modal affiché chaque fois qu'une fonctionnalité premium est
// bloquée (équipes au-delà de la limite gratuite, export PDF,
// co-organisateurs — voir "raison") ou ouvert depuis le profil. Propose le
// Pass Tournoi (achat unique, un seul tournoi) et l'abonnement Pro (tous
// les tournois) — voir lib/achats.js pour la logique d'achat.
export default function Paywall() {
  const { tournoiId, raison } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const { offres, acheterPackage, restaurerAchats, debloquerTournoi, setPassDraftDebloque } = useAchats();
  const [enCoursId, setEnCoursId] = useState(null);
  const [restaurationEnCours, setRestaurationEnCours] = useState(false);

  async function acheter(pkg) {
    setEnCoursId(pkg.identifier);
    try {
      const estPassTournoi = await acheterPackage(pkg);
      if (estPassTournoi) {
        if (tournoiId) {
          await debloquerTournoi(tournoiId);
        } else {
          setPassDraftDebloque(true);
        }
      }
      router.back();
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert(t('commun.erreur'), messageErreur(e, t));
      }
    } finally {
      setEnCoursId(null);
    }
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>{t('paywall.titre')}</Text>
      <Text style={styles.accroche}>{t(`paywall.accroche.${raison || 'defaut'}`)}</Text>

      {!offres && <Text style={styles.aide}>{t('paywall.offresIndisponibles')}</Text>}

      {offres?.availablePackages?.map((pkg) => {
        const estPass = pkg.product.identifier === PRODUIT_PASS_TOURNOI;
        return (
          <View key={pkg.identifier} style={styles.carteOffre}>
            <Text style={styles.nomOffre}>
              {estPass
                ? t('paywall.passTournoiNom')
                : t('paywall.proNom', {
                  duree: pkg.product.identifier === PRODUIT_PRO_MENSUEL ? t('paywall.parMois') : t('paywall.parAn'),
                })}
            </Text>
            <Text style={styles.descriptionOffre}>
              {estPass ? t('paywall.passTournoiDescription') : t('paywall.proDescription')}
            </Text>
            <Text style={styles.prixOffre}>{pkg.product.priceString}</Text>
            <Pressable style={styles.bouton} onPress={() => acheter(pkg)} disabled={enCoursId !== null}>
              <Text style={styles.texteBouton}>
                {enCoursId === pkg.identifier ? t('paywall.achatEnCours') : t('paywall.acheter')}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable style={styles.lienRestaurer} onPress={restaurer} disabled={restaurationEnCours} hitSlop={8}>
        <Text style={styles.texteLienRestaurer}>
          {restaurationEnCours ? t('paywall.restaurationEnCours') : t('paywall.restaurerMesAchats')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 28, paddingBottom: 60, backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 26, letterSpacing: 0.3, color: c.texte, marginBottom: 8 },
    accroche: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texteAttenue, marginBottom: 24 },
    aide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    carteOffre: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
    },
    nomOffre: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.2, color: c.texte, marginBottom: 4 },
    descriptionOffre: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginBottom: 10 },
    prixOffre: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 16, color: c.accent, marginBottom: 14 },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.3 },
    lienRestaurer: { alignItems: 'center', marginTop: 10 },
    texteLienRestaurer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
  });
}
