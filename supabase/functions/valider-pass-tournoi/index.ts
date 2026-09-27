// Edge Function Supabase : débloque un tournoi avec un Pass Tournoi, après
// avoir vérifié l'achat auprès de RevenueCat (voir la migration
// "Déblocage d'un tournoi vérifié côté serveur" dans supabase/schema.sql).
//
// Appelée par l'app (lib/achats.js, debloquerTournoi) avec la session de
// l'utilisateur et { tournoi_id }. Chaque achat du Pass Tournoi (une
// transaction RevenueCat) ne débloque qu'un seul tournoi : les transactions
// déjà utilisées sont enregistrées dans passes_tournoi_utilises.
//
// Secrets (Supabase > Edge Functions > Secrets) : REVENUECAT_SECRET_KEY
// (voir _shared/commun.ts) et, en option, REVENUECAT_PASS_PRODUCT_IDS :
// identifiants produit du Pass Tournoi, séparés par des virgules. Vide :
// tout achat unique (non-abonnement) compte, le Pass étant le seul de l'app.

import { abonneRevenueCat, clientAdmin, reponse, reponsePreflight, utilisateurAppelant } from '../_shared/commun.ts';

const PRODUITS_PASS = (Deno.env.get('REVENUECAT_PASS_PRODUCT_IDS') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reponsePreflight();

  const admin = clientAdmin();
  const user = await utilisateurAppelant(admin, req);
  if (!user) return reponse(401, { code: 'non_authentifie' });

  let tournoiId: string | undefined;
  try {
    ({ tournoi_id: tournoiId } = await req.json());
  } catch {
    // corps absent ou invalide : traité ci-dessous
  }
  if (!tournoiId) return reponse(400, { code: 'parametre_manquant' });

  const { data: tournoi } = await admin
    .from('tournois')
    .select('id, organisateur_id, debloque')
    .eq('id', tournoiId)
    .maybeSingle();
  if (!tournoi) return reponse(404, { code: 'tournoi_introuvable' });
  // Seul l'organisateur principal achète et applique un Pass à son tournoi.
  if (tournoi.organisateur_id !== user.id) return reponse(403, { code: 'pas_organisateur' });
  if (tournoi.debloque) return reponse(200, { debloque: true });

  let subscriber;
  try {
    subscriber = await abonneRevenueCat(user.id);
  } catch {
    return reponse(500, { code: 'configuration_manquante' });
  }
  if (!subscriber) return reponse(502, { code: 'revenuecat_indisponible' });

  const achats: { id: string }[] = Object.entries(subscriber.non_subscriptions || {})
    .filter(([produit]) => PRODUITS_PASS.length === 0 || PRODUITS_PASS.includes(produit))
    .flatMap(([, liste]) => liste as { id: string }[]);

  const { data: utilises } = await admin
    .from('passes_tournoi_utilises')
    .select('transaction_id')
    .eq('user_id', user.id);
  const dejaUtilises = new Set((utilises || []).map((u) => u.transaction_id));
  const disponible = achats.find((a) => !dejaUtilises.has(a.id));
  if (!disponible) return reponse(402, { code: 'aucun_pass_disponible' });

  // La clé primaire sur transaction_id empêche deux appels simultanés
  // d'utiliser le même achat pour deux tournois.
  const { error: erreurPass } = await admin
    .from('passes_tournoi_utilises')
    .insert({ transaction_id: disponible.id, user_id: user.id, tournoi_id: tournoiId });
  if (erreurPass) return reponse(409, { code: 'conflit' });

  const { error: erreurMaj } = await admin
    .from('tournois')
    .update({ debloque: true })
    .eq('id', tournoiId);
  if (erreurMaj) {
    // Rend le Pass à nouveau disponible si le déblocage a échoué.
    await admin.from('passes_tournoi_utilises').delete().eq('transaction_id', disponible.id);
    return reponse(500, { code: 'erreur_interne' });
  }

  return reponse(200, { debloque: true });
});
