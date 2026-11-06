// Edge Function Supabase : prévient par e-mail à chaque nouvelle inscription
// au test fermé Android (voir la migration "Notification des inscriptions au
// test fermé" dans supabase/schema.sql, qui l'appelle par pg_net et limite le
// nombre d'e-mails par jour).
//
// Envoi direct au compte Gmail d'envoi, pas à support@sportimatch.com : ce
// dernier renvoie vers ce même Gmail, qui ne classe alors le message que dans
// « Messages envoyés » (constaté le 06/11).
//
// Déploiement sans vérification du jeton Supabase (l'appel s'authentifie avec
// CRON_SECRET). Fichier unique pour pouvoir la déployer depuis le tableau de
// bord : pas d'import de _shared/commun.ts.
//
// Secrets déjà en place (Supabase > Edge Functions > Secrets) : CRON_SECRET,
// SMTP_USER, SMTP_PASSWORD (voir comptes-inactifs/index.ts).

import nodemailer from 'npm:nodemailer@6.9.16';

function reponse(statut: number, code: string) {
  return new Response(JSON.stringify({ code }), {
    status: statut,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return reponse(401, 'non_autorise');

  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  if (!smtpUser || !smtpPassword) return reponse(500, 'configuration_manquante');

  let corps: { email?: unknown; langue?: unknown; limite_atteinte?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, 'corps_invalide');
  }
  const email = typeof corps.email === 'string' ? corps.email : '';
  if (!email) return reponse(400, 'corps_invalide');

  const lignes = [
    'Nouvelle inscription au test fermé Android.',
    '',
    `Adresse : ${email}`,
    `Langue : ${corps.langue === 'en' ? 'anglais' : 'français'}`,
    '',
    'À faire : ajouter cette adresse à la liste « TEST FERMÉ » et au test de licence dans la Play Console, puis lui envoyer le lien (store/test-ferme.md, section 2 bis).',
    'Répondre à cet e-mail écrit directement à cette personne.',
  ];
  if (corps.limite_atteinte) {
    lignes.push('', 'Limite de 30 notifications en 24 h atteinte : les inscriptions suivantes restent enregistrées, mais sans e-mail. Voir la table inscriptions_test_ferme.');
  }

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transport.sendMail({
      from: `"SPORTIMATCH" <${smtpUser}>`,
      to: smtpUser,
      replyTo: email,
      subject: `Nouveau testeur Android : ${email}`,
      text: lignes.join('\n'),
    });
  } catch (e) {
    // Jamais l'adresse du testeur dans les journaux.
    console.error('notifier-test-ferme', e instanceof Error ? e.message : 'erreur_envoi');
    return reponse(502, 'erreur_envoi');
  }

  return reponse(200, 'envoye');
});
