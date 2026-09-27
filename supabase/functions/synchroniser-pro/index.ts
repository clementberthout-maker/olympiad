// Edge Function Supabase : enregistre côté serveur l'abonnement Pro de
// l'utilisateur, après l'avoir vérifié auprès de RevenueCat (voir la
// migration "Limite de 12 équipes appliquée par la base" dans
// supabase/schema.sql). La base s'en sert pour lever la limite de 12
// équipes sur tous les tournois d'un organisateur Pro.
//
// Appelée par l'app (lib/achats.js) avec la session de l'utilisateur,
// quand RevenueCat indique un abonnement Pro actif (démarrage, achat,
// restauration). Sans corps.
//
// Secrets (Supabase > Edge Functions > Secrets) : REVENUECAT_SECRET_KEY
// (voir _shared/commun.ts) et, en option, REVENUECAT_PRO_ENTITLEMENT :
// identifiant de l'entitlement Pro dans RevenueCat ("pro" par défaut, comme
// dans lib/achats.js).

import { abonneRevenueCat, clientAdmin, reponse, reponsePreflight, utilisateurAppelant } from '../_shared/commun.ts';

const ENTITLEMENT_PRO = Deno.env.get('REVENUECAT_PRO_ENTITLEMENT') || 'pro';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reponsePreflight();

  const admin = clientAdmin();
  const user = await utilisateurAppelant(admin, req);
  if (!user) return reponse(401, { code: 'non_authentifie' });

  let subscriber;
  try {
    subscriber = await abonneRevenueCat(user.id);
  } catch {
    return reponse(500, { code: 'configuration_manquante' });
  }
  if (!subscriber) return reponse(502, { code: 'revenuecat_indisponible' });

  // Droit Pro : actif sans date de fin, ou jusqu'à la plus tardive de la
  // date d'expiration et de la fin du délai de grâce (paiement en échec
  // en cours de régularisation).
  const droit = subscriber.entitlements?.[ENTITLEMENT_PRO];
  const dates = [droit?.expires_date, droit?.grace_period_expires_date]
    .filter(Boolean)
    .map((d: string) => new Date(d).getTime());
  const expireLe = droit && dates.length > 0 ? new Date(Math.max(...dates)) : null;
  const actif = Boolean(droit) && (expireLe === null || expireLe.getTime() > Date.now());

  if (actif) {
    const { error } = await admin.from('abonnements_pro').upsert({
      user_id: user.id,
      expire_le: expireLe ? expireLe.toISOString() : null,
      mis_a_jour_le: new Date().toISOString(),
    });
    if (error) return reponse(500, { code: 'erreur_interne' });
  } else {
    const { error } = await admin.from('abonnements_pro').delete().eq('user_id', user.id);
    if (error) return reponse(500, { code: 'erreur_interne' });
  }

  return reponse(200, { pro: actif, expire_le: expireLe ? expireLe.toISOString() : null });
});
