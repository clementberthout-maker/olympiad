import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { useAchats, passExpire } from '../lib/achats';
import { supabase } from '../lib/supabase';
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
  // Tournoi passé depuis plus de 5 jours : un Pass ne pourrait plus s'y
  // appliquer (voir lib/achats.js, passActif), on ne le propose donc pas.
  const [passImpossible, setPassImpossible] = useState(false);

  useEffect(() => {
    if (!tournoiId) return;
    supabase.from('tournois').select('date_debut, date_fin').eq('id', tournoiId).maybeSingle()
      .then(({ data }) => setPassImpossible(passExpire(data?.date_fin || data?.date_debut)));
  }, [tournoiId]);

  // Ordre d'affichage : Pass, puis Pro annuel (mis en avant), puis mensuel.
  const packagesTries = useMemo(() => {
    const rang = {
      [Purchases.PACKAGE_TYPE.LIFETIME]: 0,
      [Purchases.PACKAGE_TYPE.ANNUAL]: 1,
      [Purchases.PACKAGE_TYPE.MONTHLY]: 2,
    };
    return [...(offres?.availablePackages || [])]
      .sort((a, b) => (rang[a.packageType] ?? 3) - (rang[b.packageType] ?? 3));
  }, [offres]);

  // Équivalent par mois et économie du Pro annuel, calculés à partir des
  // prix du store (aucun montant écrit en dur).
  const detailAnnuel = useMemo(() => {
    const paquets = offres?.availablePackages || [];
    const annuel = paquets.find((p) => p.packageType === Purchases.PACKAGE_TYPE.ANNUAL)?.product;
    const mensuel = paquets.find((p) => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY)?.product;
    if (!annuel?.pricePerMonthString) return null;
    const economie = mensuel?.price > 0 && mensuel.currencyCode === annuel.currencyCode
      ? Math.round((1 - annuel.price / (mensuel.price * 12)) * 100)
      : 0;
    return economie > 0
      ? t('paywall.annuelParMoisEconomie', { prix: annuel.pricePerMonthString, economie })
      : t('paywall.annuelParMois', { prix: annuel.pricePerMonthString });
  }, [offres, t]);

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

      {passImpossible && <Text style={styles.aide}>{t('paywall.passImpossible')}</Text>}

      {packagesTries.map((pkg) => {
        // Voir lib/achats.js : on identifie l'offre par packageType
        // (LIFETIME/ANNUAL/MONTHLY, attribué par RevenueCat), pas par
        // l'identifiant du produit — indépendant du store (iOS vs Android).
        const estPass = pkg.packageType === Purchases.PACKAGE_TYPE.LIFETIME;
        const estAnnuel = pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL;
        if (estPass && (passImpossible || raison === 'olympiade')) return null;
        return (
          <View key={pkg.identifier} style={[styles.carteOffre, estAnnuel && styles.carteVedette]}>
            {estAnnuel && <Text style={styles.badge}>{t('paywall.badgeSaison')}</Text>}
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
            {estAnnuel && detailAnnuel && <Text style={styles.detailAnnuel}>{detailAnnuel}</Text>}
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

      {tournoiId && !passImpossible && (
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
    carteVedette: { borderColor: c.accent, borderWidth: 2 },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: c.accent,
      color: c.accentEncre,
      fontFamily: POLICE_TEXTE_SEMIBOLD,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    prixOffre: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 16, color: c.accent, marginBottom: 14 },
    detailAnnuel: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginTop: -10, marginBottom: 14 },
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
