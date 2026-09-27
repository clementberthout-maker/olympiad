import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { useAchats } from '../lib/achats';
import { messageErreur } from '../lib/erreurs';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import LiensLegaux from '../components/LiensLegaux';

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
  const [utilisationPassEnCours, setUtilisationPassEnCours] = useState(false);

  async function acheter(pkg) {
    setEnCoursId(pkg.identifier);
    let estPassTournoi;
    try {
      estPassTournoi = await acheterPackage(pkg);
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert(t('commun.erreur'), messageErreur(e, t));
      }
      setEnCoursId(null);
      return;
    }
    try {
      if (estPassTournoi) {
        if (tournoiId) {
          await debloquerTournoi(tournoiId);
        } else {
          // Tournoi encore en brouillon : le Pass sera appliqué à sa
          // création (voir tournoi/[id]/equipes.js).
          setPassDraftDebloque(true);
        }
      }
      router.back();
    } catch {
      // L'achat a réussi mais le déblocage non (réseau, serveur) : le
      // Pass reste disponible, à appliquer avec le lien ci-dessous.
      Alert.alert(t('paywall.deblocageEchoueTitre'), t('paywall.deblocageEchoueMessage'));
    } finally {
      setEnCoursId(null);
    }
  }

  // Applique un Pass Tournoi déjà acheté mais pas encore utilisé (achat
  // dont le déblocage a échoué, ou fait sur un autre appareil).
  async function utiliserPassExistant() {
    setUtilisationPassEnCours(true);
    try {
      await debloquerTournoi(tournoiId);
      Alert.alert(t('paywall.tournoiDebloque'));
      router.back();
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setUtilisationPassEnCours(false);
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
        // Voir lib/achats.js : on identifie l'offre par packageType
        // (LIFETIME/ANNUAL/MONTHLY, attribué par RevenueCat), pas par
        // l'identifiant du produit — indépendant du store (iOS vs Android).
        const estPass = pkg.packageType === Purchases.PACKAGE_TYPE.LIFETIME;
        const estAnnuel = pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL;
        return (
          <View key={pkg.identifier} style={styles.carteOffre}>
            <Text style={styles.nomOffre}>
              {estPass
                ? t('paywall.passTournoiNom')
                : t('paywall.proNom', { duree: estAnnuel ? t('paywall.parAn') : t('paywall.parMois') })}
            </Text>
            <Text style={styles.descriptionOffre}>
              {estPass ? t('paywall.passTournoiDescription') : t('paywall.proDescription')}
            </Text>
            <Text style={styles.prixOffre}>
              {estPass
                ? t('paywall.prixAchatUnique', { prix: pkg.product.priceString })
                : t(estAnnuel ? 'paywall.prixParAn' : 'paywall.prixParMois', { prix: pkg.product.priceString })}
            </Text>
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

      {tournoiId && (
        <Pressable style={styles.lienRestaurer} onPress={utiliserPassExistant} disabled={utilisationPassEnCours} hitSlop={8}>
          <Text style={styles.texteLienRestaurer}>
            {utilisationPassEnCours ? t('paywall.utilisationPassEnCours') : t('paywall.utiliserPassExistant')}
          </Text>
        </Pressable>
      )}

      {/* Mentions exigées par Apple (guideline 3.1.2) et Google Play pour un
          abonnement à renouvellement automatique. */}
      <Text style={styles.mentions}>{t('paywall.mentionsAbonnement')}</Text>
      <LiensLegaux />
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
    mentions: { fontFamily: POLICE_TEXTE, fontSize: 11, lineHeight: 16, color: c.texteAttenue, marginTop: 24 },
  });
}
