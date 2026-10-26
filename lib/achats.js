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
// Tournoi" (achat unique, débloque un seul tournoi jusqu'à 5 jours après
// sa date, voir debloquerTournoi et passActif ci-dessous) ou "Pro"
// (abonnement, débloque tous les tournois créés tant qu'il est actif —
// voir tournoiEstDebloque).
//
// Les achats sont vérifiés côté serveur auprès de RevenueCat (Edge
// Functions "valider-pass-tournoi" et "synchroniser-pro") : l'app ne peut
// pas écrire elle-même le déblocage (voir supabase/schema.sql).
export function AchatsProvider({ children }) {
  const [estPro, setEstPro] = useState(false);
  const [offres, setOffres] = useState(null);
  // Pass Tournoi acheté pendant qu'un tournoi est encore en brouillon (pas
  // encore créé en base, id === "nouveau") : il n'y a alors pas encore de
  // tournoi à débloquer, voir tournoi/[id]/equipes.js — le flag est
  // appliqué au moment de l'insert final puis réinitialisé.
  const [passDraftDebloque, setPassDraftDebloque] = useState(false);
  // Id Supabase de l'utilisateur connecté, une fois lié à RevenueCat.
  const [utilisateurId, setUtilisateurId] = useState(null);

  // Sur le web (aperçu), pas de clé : les clés iOS/Android y sont refusées
  // par RevenueCat, l'app reste alors en mode gratuit.
  const clePlateforme = Platform.select({ ios: CLE_IOS, android: CLE_ANDROID, default: null });

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
        Purchases.logIn(session.user.id).then(({ customerInfo }) => {
          appliquerInfosClient(customerInfo);
          setUtilisateurId(session.user.id);
        }).catch(() => {});
      } else {
        Purchases.logOut().catch(() => {});
        setEstPro(false);
        setUtilisateurId(null);
      }
    });
    return () => abonnement?.subscription?.unsubscribe?.();
  }, [clePlateforme, appliquerInfosClient]);

  // Enregistre l'abonnement Pro côté serveur (Edge Function
  // "synchroniser-pro", qui le vérifie auprès de RevenueCat) : la base s'en
  // sert pour lever la limite de 12 équipes (voir supabase/schema.sql).
  // Relancé à chaque fois que RevenueCat signale un Pro actif pour
  // l'utilisateur connecté (démarrage, achat, restauration, changement de
  // compte). Un échec est sans gravité : l'ajout d'une 13e équipe sera
  // alors refusé, avec un message, jusqu'à la prochaine synchronisation.
  const synchroniserPro = useCallback(async () => {
    const { error } = await supabase.functions.invoke('synchroniser-pro');
    if (error) throw error;
  }, []);

  useEffect(() => {
    if (!estPro || !utilisateurId) return;
    synchroniserPro().catch(() => {});
  }, [estPro, utilisateurId, synchroniserPro]);

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
      acheterPackage, restaurerAchats, debloquerTournoi, synchroniserPro,
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

// Un Pass Tournoi reste valable jusqu'à 5 jours après le dernier jour du
// tournoi (date_fin, ou date_debut sur un seul jour, incluse), et les dates
// d'un tournoi débloqué ne peuvent plus changer :
// un même Pass ne sert pas à refaire le tournoi l'année suivante. Même règle
// côté base (limiter_equipes, proteger_date_tournoi dans supabase/schema.sql)
// et dans l'Edge Function "valider-pass-tournoi".
export const JOURS_VALIDITE_PASS = 5;

function aujourdhuiIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Dernier jour (AAAA-MM-JJ) où le Pass d'un tournoi est valable, à partir
// du dernier jour du tournoi.
export function finDuPass(dernierJourTournoi) {
  if (!dernierJourTournoi) return null;
  const d = new Date(`${String(dernierJourTournoi).slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + JOURS_VALIDITE_PASS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// true si un Pass ne peut plus s'appliquer à un tournoi finissant ce jour-là.
export function passExpire(dernierJourTournoi) {
  const fin = finDuPass(dernierJourTournoi);
  return Boolean(fin) && aujourdhuiIso() > fin;
}

// true si ce tournoi a un Pass Tournoi encore valable.
export function passActif(tournoi) {
  return Boolean(tournoi?.debloque) && !passExpire(tournoi.date_fin || tournoi.date_debut);
}

// Un tournoi est débloqué (équipes illimitées, export, co-organisateurs)
// s'il a un Pass Tournoi encore valable OU si l'organisateur est
// actuellement Pro.
export function tournoiEstDebloque(tournoi, estPro) {
  return estPro || passActif(tournoi);
}
