// Construit le programme du tournoi en HTML imprimable, pour l'export PDF
// proposé sur l'écran Calendrier (voir "Partager"). Toujours en noir sur
// blanc, indépendamment du thème choisi dans l'app — pensé pour du papier,
// pas pour un écran (même raison que le fond du QR code, voir qrcode.js).
import { calculerClassement } from './classement';
import { grouperParPhase } from './generation';

function echapperHtml(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ligneMatch(match, t, locale) {
  if (!match.equipe_b_id) {
    return `<tr>
      <td>${echapperHtml(match.equipe_a?.nom)}</td>
      <td class="heure"></td>
      <td class="score">${echapperHtml(t('calendrier.exempt'))}</td>
    </tr>`;
  }
  const termine = match.resultat?.statut === 'termine';
  const score = termine ? `${match.resultat.score_a} – ${match.resultat.score_b}` : t('calendrier.aVenir');
  const heure = new Date(match.horaire).toLocaleString(locale, {
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  return `<tr>
    <td>${echapperHtml(match.equipe_a?.nom)} · ${echapperHtml(match.equipe_b?.nom)}</td>
    <td class="heure">${echapperHtml(heure)}${match.terrain ? ` · ${echapperHtml(t('saisie.terrain', { n: match.terrain }))}` : ''}</td>
    <td class="score">${echapperHtml(score)}</td>
  </tr>`;
}

function tableauClassement(nom, classement, t) {
  return `
    <h2>${echapperHtml(nom)}</h2>
    <table class="classement">
      <tr>
        <th>${echapperHtml(t('classementPoule.equipe'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.j'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.v'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.n'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.d'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.diff'))}</th>
        <th class="num">${echapperHtml(t('classementPoule.pts'))}</th>
      </tr>
      ${classement.map((item, i) => `
        <tr>
          <td>${i + 1}. ${echapperHtml(item.equipe.nom)}</td>
          <td class="num">${item.joues}</td>
          <td class="num">${item.victoires}</td>
          <td class="num">${item.nuls}</td>
          <td class="num">${item.defaites}</td>
          <td class="num">${item.diff_buts > 0 ? '+' : ''}${item.diff_buts}</td>
          <td class="num pts">${item.points}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

// `matchs` : matchs bruts (avec equipe_a/equipe_b joints) et leur résultat
// éventuel déjà attaché en `resultat` — même forme que matchsBruts dans
// tournoi/[id]/calendrier.js. `poules`/`equipes`/`resultats` servent au
// calcul du classement de chaque poule.
export function genererHtmlProgramme({ tournoi, poules, equipes, matchs, resultats, dateFormatee, locale, t }) {
  const groupesMatchs = grouperParPhase(matchs);
  const sectionsMatchs = groupesMatchs.map(({ nom, matchs: matchsDuGroupe }) => `
    <h2>${echapperHtml(nom)}</h2>
    <table>
      ${matchsDuGroupe.map((m) => ligneMatch(m, t, locale)).join('')}
    </table>
  `).join('');

  const sectionsClassement = poules.map((poule) => {
    const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
    const matchsPoule = matchs.filter((m) => m.phase === poule.nom);
    const classement = calculerClassement(
      equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule, tournoi.sport
    );
    return tableauClassement(poule.nom, classement, t);
  }).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #11161f; padding: 28px; }
          h1 { font-size: 22px; margin: 0 0 2px; }
          .date { color: #646972; font-size: 12px; margin-bottom: 4px; }
          h2 {
            font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em;
            margin: 20px 0 6px; color: #9a6700; border-bottom: 1px solid #d3d8e0; padding-bottom: 4px;
          }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 5px 4px; font-size: 12px; text-align: left; border-bottom: 1px solid #eee; }
          td.heure, td.score { text-align: right; white-space: nowrap; }
          td.score { font-weight: 600; }
          table.classement th { color: #646972; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #d3d8e0; }
          table.classement td.num, table.classement th.num { text-align: right; width: 34px; }
          table.classement td.pts { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${echapperHtml(tournoi.nom)}</h1>
        <div class="date">${echapperHtml(dateFormatee)}</div>
        ${sectionsMatchs}
        ${sectionsClassement}
      </body>
    </html>
  `;
}
