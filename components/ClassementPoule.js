import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD, POLICE_TEXTE_BOLD } from '../lib/theme';

function formatDiff(diff) {
  return diff > 0 ? `+${diff}` : String(diff);
}

// Derniers résultats d'une équipe (v, n, d), du plus ancien au plus récent
function formeEquipe(equipeId, matchs, resultats) {
  return matchs
    .filter((m) => m.equipe_a_id === equipeId || m.equipe_b_id === equipeId)
    .map((m) => ({ m, r: resultats.find((x) => x.match_id === m.id) }))
    .filter(({ r }) => r?.statut === 'termine')
    .sort((x, y) => new Date(x.m.horaire) - new Date(y.m.horaire))
    .slice(-5)
    .map(({ m, r }) => {
      const pour = m.equipe_a_id === equipeId ? r.score_a : r.score_b;
      const contre = m.equipe_a_id === equipeId ? r.score_b : r.score_a;
      return pour > contre ? 'v' : pour < contre ? 'd' : 'n';
    });
}

// Classement compact d'une poule (comme l'espace web) : rang, équipe, J,
// Diff, Pts et forme (V/N/D des derniers matchs, si `matchs` et
// `resultats` sont fournis), ligne pointillée sous les `nbQualifies`
// premiers. Tient sur un téléphone sans défilement horizontal. Utilisé par
// le calendrier (organisateur), le suivi public et le grand écran.
export default function ClassementPoule({
  nom, classement, equipeMiseEnAvantId, sport = 'football', nbQualifies = 0, matchs = null, resultats = [],
}) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const avecForme = Array.isArray(matchs);
  const lettres = { v: t('classementPoule.v'), n: t('classementPoule.n'), d: t('classementPoule.d') };

  return (
    <View style={styles.carte}>
      <Text style={styles.titre}>{nom}</Text>
      {classement.length === 0 ? (
        <Text style={styles.vide}>
          {t(sport === 'tennis' ? 'classementPoule.aucunJoueur' : 'classementPoule.aucuneEquipe')}
        </Text>
      ) : (
        <>
          <View style={[styles.ligne, styles.entete]}>
            <Text style={[styles.th, styles.colRang]} />
            <Text style={[styles.th, styles.colNom]} numberOfLines={1}>
              {t(sport === 'tennis' ? 'classementPoule.joueur' : 'classementPoule.equipe')}
            </Text>
            <Text style={[styles.th, styles.colNb]}>{t('classementPoule.j')}</Text>
            <Text style={[styles.th, styles.colDiff]}>{t('classementPoule.diff')}</Text>
            <Text style={[styles.th, styles.colPts]}>{t('classementPoule.pts')}</Text>
            {avecForme && <Text style={[styles.th, styles.colForme]}>{t('classementPoule.forme')}</Text>}
          </View>
          {classement.map((item, index) => {
            const misEnAvant = item.equipe.id === equipeMiseEnAvantId;
            const qualifie = nbQualifies > 0 && index < nbQualifies;
            const limite = nbQualifies > 0 && index === nbQualifies;
            return (
              <View key={item.equipe.id} style={[styles.ligne, styles.ligneEquipe, limite && styles.limite, misEnAvant && styles.misEnAvant]}>
                <Text style={[styles.rang, styles.colRang, qualifie && styles.rangQualifie, misEnAvant && styles.texteMisEnAvant]}>{index + 1}</Text>
                <Text style={[styles.nom, styles.colNom, misEnAvant && styles.texteMisEnAvant]} numberOfLines={1}>{item.equipe.nom}</Text>
                <Text style={[styles.valeur, styles.colNb, misEnAvant && styles.texteMisEnAvant]}>{item.joues}</Text>
                <Text style={[styles.valeur, styles.colDiff, misEnAvant && styles.texteMisEnAvant]}>{formatDiff(item.diff_buts)}</Text>
                <Text style={[styles.points, styles.colPts, misEnAvant && styles.texteMisEnAvant]}>{item.points}</Text>
                {avecForme && (
                  <View style={[styles.colForme, styles.forme]}>
                    {formeEquipe(item.equipe.id, matchs, resultats).map((f, i) => (
                      <View key={i} style={[styles.pastille, styles[`pastille_${f}`]]}>
                        <Text style={[styles.lettre, styles[`lettre_${f}`]]}>{lettres[f]}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    carte: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure,
      borderRadius: 14, padding: 14, paddingBottom: 8, marginBottom: 12,
    },
    titre: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.3, color: c.lien, marginBottom: 6 },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    ligne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    entete: { paddingBottom: 6 },
    ligneEquipe: { paddingVertical: 8, borderTopWidth: 1, borderColor: c.bordure },
    limite: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.accent },
    misEnAvant: { backgroundColor: c.accent, borderRadius: 6, marginHorizontal: -6, paddingHorizontal: 6 },
    texteMisEnAvant: { fontFamily: POLICE_TEXTE_BOLD, color: c.accentEncre },
    th: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 10.5, letterSpacing: 0.4, color: c.texteAttenue, textAlign: 'right' },
    colRang: { width: 18, textAlign: 'center' },
    colNom: { flex: 1, textAlign: 'left' },
    colNb: { width: 22 },
    colDiff: { width: 32 },
    colPts: { width: 30 },
    colForme: { width: 74, textAlign: 'right' },
    rang: { fontFamily: POLICE_TITRE, fontSize: 16, color: c.texteAttenue, paddingTop: 2 },
    rangQualifie: { color: c.lien },
    nom: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13.5, color: c.texte },
    valeur: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texte, textAlign: 'right' },
    points: { fontFamily: POLICE_TITRE, fontSize: 18, color: c.texte, textAlign: 'right', paddingTop: 2 },
    forme: { flexDirection: 'row', justifyContent: 'flex-end', gap: 2 },
    pastille: { width: 14, height: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    pastille_v: { backgroundColor: c.succes + '38' },
    pastille_n: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.bordure },
    pastille_d: { backgroundColor: c.danger + '2e' },
    lettre: { fontFamily: POLICE_TEXTE_BOLD, fontSize: 8.5 },
    lettre_v: { color: c.succes },
    lettre_n: { color: c.texteAttenue },
    lettre_d: { color: c.danger },
  });
}
