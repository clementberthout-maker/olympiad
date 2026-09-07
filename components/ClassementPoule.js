import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo, useState } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD, POLICE_TEXTE_BOLD } from '../lib/theme';

const LARGEUR_COL_EQUIPE_MIN = 90;
const LARGEUR_COL_EQUIPE_MAX = 220;
const LARGEUR_CURSEUR_MIN = 24;
// Estimation grossière de la largeur d'un caractère (police proportionnelle,
// taille 13.5) : suffit à dimensionner la colonne "Équipe" pour que les
// noms tiennent sur une seule ligne sans être coupés, sans avoir à mesurer
// le texte réellement rendu.
const LARGEUR_PAR_CARACTERE = 7.3;
const MARGE_COL_EQUIPE = 34; // rang + espacement + un peu d'air

function formatDiff(diff) {
  return diff > 0 ? `+${diff}` : String(diff);
}

function clamp(valeur, min, max) {
  return Math.min(max, Math.max(min, valeur));
}

// Petit tableau de classement réutilisé pour une poule donnée, sur l'écran
// calendrier (organisateur) et l'écran de suivi (public). Le nom de
// l'équipe reste figé à gauche, seules les colonnes de stats défilent
// horizontalement (le nombre de colonnes ne tient pas toujours sur un
// petit écran) — un petit curseur sous le tableau indique qu'on peut
// défiler et où on en est.
export default function ClassementPoule({ nom, classement, equipeMiseEnAvantId, sport = 'football' }) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const abregeScorePour = t(`sports.${sport}.abregeScorePour`);
  const abregeScoreContre = t(`sports.${sport}.abregeScoreContre`);
  const [largeurVisible, setLargeurVisible] = useState(0);
  const [largeurContenu, setLargeurContenu] = useState(0);
  const [decalageX, setDecalageX] = useState(0);

  const plusLongNom = useMemo(
    () => classement.reduce((max, item) => Math.max(max, item.equipe.nom.length), 0),
    [classement]
  );
  const largeurColEquipe = clamp(
    MARGE_COL_EQUIPE + plusLongNom * LARGEUR_PAR_CARACTERE,
    LARGEUR_COL_EQUIPE_MIN,
    LARGEUR_COL_EQUIPE_MAX
  );

  const peutDefiler = largeurContenu > largeurVisible + 1;
  const largeurCurseur = peutDefiler
    ? Math.max(LARGEUR_CURSEUR_MIN, (largeurVisible / largeurContenu) * largeurVisible)
    : 0;
  const decalageMaxCurseur = largeurVisible - largeurCurseur;
  const decalageMaxScroll = largeurContenu - largeurVisible;
  const positionCurseur = peutDefiler && decalageMaxScroll > 0
    ? clamp((decalageX / decalageMaxScroll) * decalageMaxCurseur, 0, decalageMaxCurseur)
    : 0;

  return (
    <View style={styles.carte}>
      <Text style={styles.titre}>{nom}</Text>
      {classement.length === 0 ? (
        <Text style={styles.vide}>
          {t(sport === 'tennis' ? 'classementPoule.aucunJoueur' : 'classementPoule.aucuneEquipe')}
        </Text>
      ) : (
        <>
          <View style={styles.tableWrapper}>
            <View style={[styles.colFixe, { width: largeurColEquipe }]}>
              <Text style={[styles.entete, styles.enteteEquipe, styles.enteteLigne]} numberOfLines={1}>
                {t(sport === 'tennis' ? 'classementPoule.joueur' : 'classementPoule.equipe')}
              </Text>
              {classement.map((item, index) => {
                const misEnAvant = item.equipe.id === equipeMiseEnAvantId;
                return (
                  <View key={item.equipe.id} style={[styles.rangEquipe, misEnAvant && styles.rangMisEnAvantGauche]}>
                    <Text style={[styles.rang, misEnAvant && styles.texteMisEnAvant]}>{index + 1}</Text>
                    <Text style={[styles.nom, misEnAvant && styles.texteMisEnAvant]} numberOfLines={1}>
                      {item.equipe.nom}
                    </Text>
                  </View>
                );
              })}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.zoneDefilante}
              contentContainerStyle={styles.contenuDefilant}
              onLayout={(e) => setLargeurVisible(e.nativeEvent.layout.width)}
              onContentSizeChange={(w) => setLargeurContenu(w)}
              onScroll={(e) => setDecalageX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              <View style={styles.groupeLignes}>
                <View style={[styles.tableHeader, styles.enteteLigne]}>
                  <Text style={styles.th}>{t('classementPoule.j')}</Text>
                  <Text style={styles.th}>{t('classementPoule.v')}</Text>
                  <Text style={styles.th}>{t('classementPoule.n')}</Text>
                  <Text style={styles.th}>{t('classementPoule.d')}</Text>
                  <Text style={styles.th}>{abregeScorePour}</Text>
                  <Text style={styles.th}>{abregeScoreContre}</Text>
                  <Text style={styles.th}>{t('classementPoule.diff')}</Text>
                  <Text style={[styles.th, styles.colPts]}>{t('classementPoule.pts')}</Text>
                </View>
                {classement.map((item) => {
                  const misEnAvant = item.equipe.id === equipeMiseEnAvantId;
                  const styleValeur = [styles.valeur, misEnAvant && styles.valeurMisEnAvant];
                  return (
                    <View key={item.equipe.id} style={[styles.ligneStats, misEnAvant && styles.rangMisEnAvantDroite]}>
                      <Text style={styleValeur}>{item.joues}</Text>
                      <Text style={styleValeur}>{item.victoires}</Text>
                      <Text style={styleValeur}>{item.nuls}</Text>
                      <Text style={styleValeur}>{item.defaites}</Text>
                      <Text style={styleValeur}>{item.buts_pour}</Text>
                      <Text style={styleValeur}>{item.buts_contre}</Text>
                      <Text style={styleValeur}>{formatDiff(item.diff_buts)}</Text>
                      <Text style={[styles.valeur, styles.points, styles.colPts, misEnAvant && styles.valeurMisEnAvant]}>
                        {item.points}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {peutDefiler && (
            <View style={styles.ligneIndicateur}>
              <View style={{ width: largeurColEquipe }} />
              <View style={styles.pisteCurseur}>
                <View
                  style={[
                    styles.curseur,
                    { width: largeurCurseur, transform: [{ translateX: positionCurseur }] },
                  ]}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    carte: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure,
      borderRadius: 14, padding: 16, marginBottom: 12,
    },
    titre: { fontFamily: POLICE_TITRE, fontSize: 14, letterSpacing: 0.4, color: c.accent, marginBottom: 8 },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    tableWrapper: { flexDirection: 'row' },
    colFixe: {},
    zoneDefilante: { flex: 1 },
    // Force la zone de stats à occuper toute la largeur disponible même
    // quand le contenu (toujours 8 colonnes fixes) est plus étroit que la
    // carte : sinon, sur un écran large, le surlignage de l'équipe suivie
    // s'arrêtait juste après "Pts" au lieu d'aller jusqu'au bord de la carte.
    contenuDefilant: { minWidth: '100%' },
    groupeLignes: { flexGrow: 1 },
    enteteLigne: { borderBottomWidth: 1, borderColor: c.bordure, paddingBottom: 6, marginBottom: 4 },
    tableHeader: { flexDirection: 'row' },
    entete: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, color: c.texteAttenue },
    enteteEquipe: { textAlign: 'left' },
    th: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, color: c.texteAttenue, width: 34, textAlign: 'right' },
    ligneStats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    colPts: { width: 40 },
    rangEquipe: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    rangMisEnAvantGauche: {
      backgroundColor: c.accent, borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
      marginLeft: -8, paddingLeft: 8,
    },
    rangMisEnAvantDroite: { backgroundColor: c.accent, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    texteMisEnAvant: { fontFamily: POLICE_TEXTE_BOLD, color: c.accentEncre },
    valeurMisEnAvant: { fontFamily: POLICE_TEXTE_BOLD, color: c.accentEncre },
    rang: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue, width: 14 },
    nom: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte, flexShrink: 1 },
    valeur: { fontFamily: POLICE_TEXTE, fontSize: 13.5, width: 34, textAlign: 'right', color: c.texte },
    points: { fontFamily: POLICE_TEXTE_BOLD, color: c.accent },
    ligneIndicateur: { flexDirection: 'row', marginTop: 8 },
    pisteCurseur: {
      flex: 1, height: 4, borderRadius: 2, backgroundColor: c.bordure, overflow: 'hidden',
    },
    curseur: { height: 4, borderRadius: 2, backgroundColor: c.accent },
  });
}
