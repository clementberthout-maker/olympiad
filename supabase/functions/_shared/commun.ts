// Code partagé par les Edge Functions d'OLYMPIAD (valider-pass-tournoi,
// synchroniser-pro) : client Supabase service_role, utilisateur appelant et
// lecture de ses achats chez RevenueCat.
//
// Secret requis (Supabase > Edge Functions > Secrets) :
//   REVENUECAT_SECRET_KEY  clé secrète RevenueCat (API v1, "sk_...")
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function reponse(statut: number, corps: Record<string, unknown>) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export function reponsePreflight() {
  return new Response('ok', { headers: CORS });
}

export function clientAdmin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Utilisateur appelant, d'après le jeton de session envoyé par l'app ; null
// si absent ou invalide.
export async function utilisateurAppelant(admin: SupabaseClient, req: Request): Promise<User | null> {
  const jeton = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return null;
  const { data, error } = await admin.auth.getUser(jeton);
  return error ? null : data.user;
}

// Fiche de l'utilisateur chez RevenueCat : l'app l'y identifie par son id
// Supabase (Purchases.logIn, voir lib/achats.js). null si RevenueCat ne
// répond pas ; lève une erreur si la clé secrète n'est pas configurée.
// deno-lint-ignore no-explicit-any
export async function abonneRevenueCat(userId: string): Promise<any | null> {
  const cle = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!cle) throw new Error('configuration_manquante');
  const rc = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${cle}` } },
  );
  if (!rc.ok) return null;
  const { subscriber } = await rc.json();
  return subscriber || {};
}
