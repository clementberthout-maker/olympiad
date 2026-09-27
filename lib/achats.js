import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from './supabase';

const CLE_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const CLE_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

const ENTITLEMENT_PRO = 'pro';

const AchatsContext = createContext(null);

// Fournit le statut d'achat (Pro / Pass Tournoi) à toute l'app, via
// RevenueCat — voir le plan de monétisation pour le modèle : gratuit (12
// équipes max par tournoi, pas d'export ni de co-organisateurs), "Pass
// Tournoi" (achat unique, débloque un seul tournoi, voir
// debloquerTournoi ci-dessous) ou "Pro" (abonnement, débloque tous les
// tournois créés tant qu'il est actif — voir tournoiEstDebloque).
//
// Aucune vérification serveur des achats en v1 (voir le contexte du plan) :
// une fois l'achat confirmé par RevenueCat côté client, on écrit
// directement le déblocage dans Supabase, protégé par les RLS existantes —
// cohérent avec le reste de l'app, qui fait déjà confiance à auth.uid().
export function AchatsProvider({ children }) {
  const [estPro, setEstPro] = useState(false);
  const [offres, setOffres] = useState(null);
  // Pass Tournoi acheté pendant qu'un tournoi est encore en brouillon (pas
  // encore créé en base, id === "nouveau") : il n'y a alors pas encore de
  // tournoi à débloquer, voir tournoi/[id]/equipes.js — le flag est
  // appliqué au moment de l'insert final puis réinitialisé.
  const [passDraftDebloque, setPassDraftDebloque] = useState(false);

  const clePlateforme = Platform.OS === 'ios' ? CLE_IOS : CLE_ANDROID;

  const appliquerInfosClient = useCallback((customerInfo) => {
    setEstPro(Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_PRO]));
  }, []);

  useEffect(() => {
    if (!clePlateforme) return; // pas de clé configurée (ex. dev sans build natif) : reste en mode gratuit
    Purchases.configure({ apiKey: clePlateforme });
    Purchases.getCustomerInfo().then(appliquerInfosClient).catch(() => {});
    Purchases.getOfferings().then((o) => setOffres(o?.current || null)).catch(() => {});
    Purchases.addCustomerInfoUpdateListener(appliquerInfosClient);
    return () => Purchases.removeCustomerInfoUpdateListener(appliquerInfosClient);
  }, [clePlateforme, appliquerInfosClient]);

  useEffect(() => {
    if (!clePlateforme) return;
    // Lie l'abonnement RevenueCat au compte Supabase (aucun listener
    // d'authentification global n'existait avant dans l'app), pour que le
    // statut Pro suive l'utilisateur d'un appareil à l'autre.
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      if (session?.user?.id) {
        Purchases.logIn(session.user.id).then(({ customerInfo }) => appliquerInfosClient(customerInfo)).catch(() => {});
      } else {
        Purchases.logOut().catch(() => {});
        setEstPro(false);
      }
    });
    return () => abonnement?.subscription?.unsubscribe?.();
  }, [clePlateforme, appliquerInfosClient]);

  // Retourne true si le package acheté est le Pass Tournoi (à l'appelant
  // de débloquer le bon tournoi ensuite) ; false pour un abonnement Pro
  // (le statut estPro se met à jour tout seul via le listener ci-dessus).
  //
  // On distingue via pkg.packageType (LIFETIME = Pass Tournoi, attribué par
  // RevenueCat au moment où le produit est rattaché à l'offering) plutôt que
  // via l'identifiant du produit : sur Android, les abonnements Play Console
  // sont un seul produit avec plusieurs "base plans" (mensuel/annuel), et
  // RevenueCat expose alors un identifiant du type "produit:base_plan" — un
  // identifiant fixe comme "pro_mensuel" n'y correspondrait jamais.
  const acheterPackage = useCallback(async (pkg) => {
    if (!clePlateforme) throw new Error('Achats indisponibles sur cette installation (build de développement sans clé RevenueCat).');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    appliquerInfosClient(customerInfo);
    return pkg.packageType === Purchases.PACKAGE_TYPE.LIFETIME;
  }, [clePlateforme, appliquerInfosClient]);

  const restaurerAchats = useCallback(async () => {
    if (!clePlateforme) throw new Error('Achats indisponibles sur cette installation (build de développement sans clé RevenueCat).');
    const customerInfo = await Purchases.restorePurchases();
    appliquerInfosClient(customerInfo);
  }, [clePlateforme, appliquerInfosClient]);

  // Applique un Pass Tournoi acheté (et pas encore utilisé) à ce tournoi.
  // Passe par l'Edge Function "valider-pass-tournoi", qui vérifie l'achat
  // auprès de RevenueCat : l'app n'a plus le droit d'écrire "debloque"
  // elle-même (voir supabase/schema.sql). L'erreur levée porte le code
  // renvoyé par la fonction (ex. "aucun_pass_disponible"), traduit par
  // lib/erreurs.js.
  const debloquerTournoi = useCallback(async (tournoiId) => {
    const { error } = await supabase.functions.invoke('valider-pass-tournoi', {
      body: { tournoi_id: tournoiId },
    });
    if (!error) return;
    let code;
    try {
      code = (await error.context?.json())?.code;
    } catch {
      // réponse sans corps JSON (fonction non déployée, réseau...)
    }
    throw Object.assign(new Error(error.message), { code: code || 'erreur_fonction' });
  }, []);

  return (
    <AchatsContext.Provider value={{
      estPro, offres, passDraftDebloque, setPassDraftDebloque,
      acheterPackage, restaurerAchats, debloquerTournoi,
    }}>
      {children}
    </AchatsContext.Provider>
  );
}

export function useAchats() {
  const contexte = useContext(AchatsContext);
  if (!contexte) throw new Error('useAchats doit être utilisé à l\'intérieur de AchatsProvider');
  return contexte;
}

// Un tournoi est débloqué (équipes illimitées, export, co-organisateurs)
// s'il a été acheté individuellement (Pass Tournoi) OU si l'organisateur
// est actuellement Pro.
export function tournoiEstDebloque(tournoi, estPro) {
  return estPro || Boolean(tournoi?.debloque);
}
