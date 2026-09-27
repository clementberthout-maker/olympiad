// Traduit une erreur Supabase (authentification ou base de données) en
// message compréhensible pour l'organisateur — par défaut, l'API renvoie des
// messages techniques en anglais (ex : "duplicate key value violates unique
// constraint..."), inexploitables pour quelqu'un de non technique.
//
// Une erreur Supabase porte toujours un `code` : c'est ce qui la distingue
// d'une erreur "maison" levée ailleurs dans l'app (ex : profil.js,
// migrationNonAppliquee), dont le message est déjà écrit pour l'utilisateur
// — dans ce cas, on l'affiche tel quel plutôt que de le remplacer par un
// message générique.
const CLES_PAR_CODE = {
  // Authentification (voir connexion.js, inscription.js, profil.js,
  // mot-de-passe-oublie.js, reinitialiser-mot-de-passe.js)
  invalid_credentials: 'erreurs.identifiantsIncorrects',
  email_not_confirmed: 'erreurs.emailNonConfirme',
  email_exists: 'erreurs.emailDejaUtilise',
  user_already_exists: 'erreurs.emailDejaUtilise',
  weak_password: 'erreurs.motDePasseFaible',
  same_password: 'erreurs.memeMotDePasse',
  over_email_send_rate_limit: 'erreurs.tropDeTentatives',
  over_request_rate_limit: 'erreurs.tropDeTentatives',
  // Base de données (voir tournoi/[id]/equipes.js, saisie.js, calendrier.js)
  '23505': 'erreurs.valeurDejaUtilisee', // unique_violation
  '42501': 'erreurs.permissionRefusee', // insufficient_privilege (RLS)
  // Table ou fonction manquante — la migration co-organisateurs (voir
  // supabase/schema.sql) n'a probablement pas encore été exécutée sur
  // Supabase (voir tournoi/[id]/co-organisateurs.js, rejoindre-comme-organisateur.js).
  '42P01': 'erreurs.migrationNonAppliquee', // undefined_table
  PGRST202: 'erreurs.migrationNonAppliquee', // fonction RPC introuvable
  // Edge Function "valider-pass-tournoi" (voir lib/achats.js,
  // debloquerTournoi) ; ses autres codes donnent le message générique.
  aucun_pass_disponible: 'erreurs.aucunPassDisponible',
  pas_organisateur: 'erreurs.permissionRefusee',
  // Limite de 12 équipes appliquée par la base (voir supabase/schema.sql)
  OLY01: 'erreurs.limiteEquipesAtteinte',
};

export function messageErreur(erreur, t) {
  if (!erreur?.code) return erreur?.message;
  return t(CLES_PAR_CODE[erreur.code] || 'erreurs.generique');
}
