// E-mail d'avertissement avant la suppression d'un compte inactif, en
// français puis en anglais comme les modèles de supabase/emails/ (on ne
// sait pas dans quelle langue l'utilisateur a l'app). Même présentation que
// ces modèles ; il est ici et non dans supabase/emails/ car il est envoyé
// par l'Edge Function, pas par Supabase Auth.

const ESPACE = 'https://clementberthout-maker.github.io/olympiad/espace.html';
const SUPPRESSION = 'https://clementberthout-maker.github.io/olympiad/suppression-compte.html';

function echapper(texte: string) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formaterDate(date: Date, langue: 'fr-FR' | 'en-GB') {
  return date.toLocaleDateString(langue, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

export function modeleAvertissement(prenom: string | null, dateSuppression: Date) {
  const nom = (prenom || '').trim();
  const nomHtml = nom ? ' ' + echapper(nom) : '';
  const dateFr = formaterDate(dateSuppression, 'fr-FR');
  const dateEn = formaterDate(dateSuppression, 'en-GB');

  const sujet = 'Ton compte va être supprimé · Your account will be deleted — OLYMPIAD';

  const html = `<div style="background:#0b0f18;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#181d26;border-radius:12px;padding:32px 24px;color:#f3f2ed;">
    <p style="margin:0 0 24px;font-size:22px;font-weight:700;letter-spacing:2px;color:#ebb517;">OLYMPIAD</p>
    <h1 style="margin:0 0 12px;font-size:20px;">Bonjour${nomHtml},</h1>
    <p style="margin:0 0 16px;line-height:1.6;color:#a7acb6;">Tu ne t'es pas connecté à ton compte OLYMPIAD depuis bientôt 3 ans. Comme prévu par notre politique de confidentialité, il sera supprimé à partir du <strong style="color:#f3f2ed;">${dateFr}</strong>, avec ton profil, ta photo et les tournois que tu as créés.</p>
    <p style="margin:0 0 24px;line-height:1.6;color:#a7acb6;">Pour le garder, il suffit de te connecter avant cette date, dans l'app ou sur l'espace organisateur.</p>
    <p style="margin:0 0 24px;"><a href="${ESPACE}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#ebb517;color:#11161f;font-weight:600;text-decoration:none;">Garder mon compte</a></p>
    <p style="margin:0 0 32px;font-size:13px;line-height:1.5;color:#a7acb6;">Tu ne veux plus de ton compte ? Ne fais rien, ou <a href="${SUPPRESSION}" style="color:#ebb517;">supprime-le dès maintenant</a>.</p>
    <hr style="border:none;border-top:1px solid #2d333d;margin:0 0 24px;">
    <h2 style="margin:0 0 12px;font-size:16px;">Hello${nomHtml},</h2>
    <p style="margin:0 0 16px;line-height:1.6;color:#a7acb6;">You haven't signed in to your OLYMPIAD account for almost 3 years. As stated in our privacy policy, it will be deleted from <strong style="color:#f3f2ed;">${dateEn}</strong>, along with your profile, your photo and the tournaments you created.</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#a7acb6;">To keep it, just sign in before that date, in the app or in the organizer area: <a href="${ESPACE}" style="color:#ebb517;">Keep my account</a></p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#a7acb6;">Don't need your account anymore? Do nothing, or <a href="${SUPPRESSION}" style="color:#ebb517;">delete it now</a>.</p>
  </div>
</div>`;

  const texte = `OLYMPIAD

Bonjour${nom ? ' ' + nom : ''},

Tu ne t'es pas connecté à ton compte OLYMPIAD depuis bientôt 3 ans. Comme prévu par notre politique de confidentialité, il sera supprimé à partir du ${dateFr}, avec ton profil, ta photo et les tournois que tu as créés.

Pour le garder, il suffit de te connecter avant cette date, dans l'app ou sur l'espace organisateur : ${ESPACE}

Tu ne veux plus de ton compte ? Ne fais rien, ou supprime-le dès maintenant : ${SUPPRESSION}

---

Hello${nom ? ' ' + nom : ''},

You haven't signed in to your OLYMPIAD account for almost 3 years. As stated in our privacy policy, it will be deleted from ${dateEn}, along with your profile, your photo and the tournaments you created.

To keep it, just sign in before that date, in the app or in the organizer area: ${ESPACE}

Don't need your account anymore? Do nothing, or delete it now: ${SUPPRESSION}
`;

  return { sujet, html, texte };
}
