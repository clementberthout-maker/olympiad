// Edge Function Supabase : suppression automatique des comptes inactifs
// depuis 3 ans, promise par la politique de confidentialité (voir la
// migration "Suppression automatique des comptes inactifs" dans
// supabase/schema.sql, qui décrit les règles).
//
// Appelée chaque nuit par pg_cron (tâche "comptes-inactifs-quotidien"),
// jamais par l'app :
//   1. supprime les comptes avertis depuis au moins 30 jours et toujours
//      inactifs, puis leur photo de profil (bucket "avatars") ;
//   2. envoie l'e-mail d'avertissement (FR puis EN, voir modele.ts) aux
//      comptes inactifs depuis 3 ans moins 30 jours, et le note pour ne pas
//      le renvoyer.
// Corps { "simulation": true } : compte seulement ce qui serait fait.
//
// Déploiement, sans vérification du jeton Supabase (pg_cron s'authentifie
// avec CRON_SECRET) :
//   supabase functions deploy comptes-inactifs --no-verify-jwt
//
// Secrets (Supabase > Edge Functions > Secrets) :
//   CRON_SECRET    longue chaîne aléatoire, identique au secret Vault
//                  "olympiad_secret_cron"
//   SMTP_USER      clement.berthout@gmail.com (comme le SMTP de Supabase
//                  Auth, voir supabase/emails/README.md)
//   SMTP_PASSWORD  mot de passe d'application Gmail (16 lettres, sans espaces)
// Le SMTP de Supabase Auth ne sert qu'aux e-mails d'Auth : la fonction
// envoie elle-même, par smtp.gmail.com sur le port 465 (les ports 25 et 587
// sont bloqués dans les Edge Functions).
//
// Secrets Vault lus par pg_cron, à créer une fois dans l'éditeur SQL :
//   select vault.create_secret('https://<ref>.supabase.co', 'olympiad_url_projet');
//   select vault.create_secret('<même valeur que CRON_SECRET>', 'olympiad_secret_cron');

import nodemailer from 'npm:nodemailer@6.9.16';
import { clientAdmin, reponse } from '../_shared/commun.ts';
import { modeleAvertissement } from './modele.ts';

// Gmail accepte environ 500 e-mails par jour, partagés avec Supabase Auth.
const MAX_AVERTISSEMENTS = 50;
const MAX_SUPPRESSIONS = 100;

function message(e: unknown) {
  return e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return reponse(401, { code: 'non_autorise' });
  }

  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  if (!smtpUser || !smtpPassword) return reponse(500, { code: 'configuration_manquante' });

  let simulation = false;
  try {
    simulation = Boolean((await req.json())?.simulation);
  } catch {
    // Corps vide ou invalide : exécution normale.
  }

  const admin = clientAdmin();
  const erreurs: string[] = [];

  // 1. Suppressions, avant les avertissements : un compte averti
  // aujourd'hui ne peut de toute façon pas être supprimé avant 30 jours.
  const { data: aSupprimer, error: erreurListeSuppr } = await admin.rpc('comptes_a_supprimer', {
    p_limite: MAX_SUPPRESSIONS,
  });
  if (erreurListeSuppr) {
    console.error('comptes_a_supprimer', erreurListeSuppr.message);
    return reponse(500, { code: 'erreur_interne' });
  }

  let supprimes = 0;
  if (!simulation) {
    for (const { user_id } of aSupprimer ?? []) {
      // Le compte d'abord (la fonction SQL revérifie l'inactivité), la photo
      // ensuite : une photo supprimée pour un compte finalement conservé
      // serait perdue.
      const { data: fait, error } = await admin.rpc('supprimer_compte_inactif', { p_uid: user_id });
      if (error) {
        erreurs.push(`suppression ${user_id} : ${error.message}`);
        continue;
      }
      if (!fait) continue;
      supprimes++;

      try {
        const { data: fichiers, error: erreurListe } = await admin.storage
          .from('avatars')
          .list('', { search: user_id });
        if (erreurListe) throw erreurListe;
        const noms = (fichiers ?? []).map((f) => f.name).filter((nom) => nom.split('.')[0] === user_id);
        if (noms.length > 0) {
          const { error: erreurPhoto } = await admin.storage.from('avatars').remove(noms);
          if (erreurPhoto) throw erreurPhoto;
        }
      } catch (e) {
        // Compte supprimé mais photo restée : à retirer à la main du bucket
        // (fichier "<user_id>.<extension>").
        erreurs.push(`photo ${user_id} : ${message(e)}`);
      }
    }
  }

  // 2. Avertissements.
  const { data: aAvertir, error: erreurListeAvert } = await admin.rpc('comptes_a_avertir', {
    p_limite: MAX_AVERTISSEMENTS,
  });
  if (erreurListeAvert) {
    console.error('comptes_a_avertir', erreurListeAvert.message);
    return reponse(500, { code: 'erreur_interne' });
  }

  let avertis = 0;
  if (!simulation && (aAvertir ?? []).length > 0) {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    for (const compte of aAvertir ?? []) {
      try {
        const { sujet, html, texte } = modeleAvertissement(compte.prenom, new Date(compte.date_suppression));
        await transport.sendMail({
          from: `"OLYMPIAD" <${smtpUser}>`,
          to: compte.email,
          subject: sujet,
          html,
          text: texte,
        });
      } catch (e) {
        erreurs.push(`e-mail ${compte.user_id} : ${message(e)}`);
        continue;
      }

      // Si cette étape échoue, l'e-mail sera renvoyé demain : sans trace de
      // l'envoi, le compte ne serait jamais supprimé.
      const { error } = await admin.rpc('noter_avertissement', { p_uid: compte.user_id });
      if (error) erreurs.push(`avertissement ${compte.user_id} : ${error.message}`);
      else avertis++;
    }

    transport.close();
  }

  // Identifiants seulement dans les journaux, jamais les adresses e-mail.
  const bilan = simulation
    ? { simulation: true, a_supprimer: (aSupprimer ?? []).length, a_avertir: (aAvertir ?? []).length }
    : { supprimes, avertis, erreurs: erreurs.length };
  console.log('comptes-inactifs', JSON.stringify(bilan));
  for (const e of erreurs) console.error('comptes-inactifs', e);

  return reponse(erreurs.length > 0 ? 207 : 200, bilan);
});
