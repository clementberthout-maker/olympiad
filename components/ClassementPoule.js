import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo, useState } from 'react';
import { useTheme } from '../lib/ThemeContext';
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
export default function ClassementPoule({ nom, classement }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
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
        <Text style={styles.vide}>Aucune équipe pour l'instant.</Text>
      ) : (
        <>
          <View style={styles.tableWrapper}>
            <View style={[styles.colFixe, { width: largeurColEquipe }]}>
              <Text style={[styles.entete, styles.enteteEquipe, styles.enteteLigne]} numberOfLines={1}>
                Équipe
              </Text>
              {classement.map((item, index) => (
                <View key={item.equipe.id} style={styles.rangEquipe}>
                  <Text style={styles.rang}>{index + 1}</Text>
                  <Text style={styles.nom} numberOfLines={1}>{item.equipe.nom}</Text>
                </View>
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.zoneDefilante}
              onLayout={(e) => setLargeurVisible(e.nativeEvent.layout.width)}
              onContentSizeChange={(w) => setLargeurContenu(w)}
              onScroll={(e) => setDecalageX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
            >
              <View>
                <View style={[styles.tableHeader, styles.enteteLigne]}>
                  <Text style={styles.th}>J</Text>
                  <Text style={styles.th}>V</Text>
                  <Text style={styles.th}>N</Text>
                  <Text style={styles.th}>D</Text>
                  <Text style={styles.th}>BP</Text>
                  <Text style={styles.th}>BC</Text>
                  <Text style={styles.th}>Diff</Text>
                  <Text style={[styles.th, styles.colPts]}>Pts</Text>
                </View>
                {classement.map((item) => (
                  <View key={item.equipe.id} style={styles.ligneStats}>
                    <Text style={styles.valeur}>{item.joues}</Text>
                    <Text style={styles.valeur}>{item.victoires}</Text>
                    <Text style={styles.valeur}>{item.nuls}</Text>
                    <Text style={styles.valeur}>{item.defaites}</Text>
                    <Text style={styles.valeur}>{item.buts_pour}</Text>
                    <Text style={styles.valeur}>{item.buts_contre}</Text>
                    <Text style={styles.valeur}>{formatDiff(item.diff_buts)}</Text>
                    <Text style={[styles.valeur, styles.points, styles.colPts]}>{item.points}</Text>
                  </View>
                ))}
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
    enteteLigne: { borderBottomWidth: 1, borderColor: c.bordure, paddingBottom: 6, marginBottom: 4 },
    tableHeader: { flexDirection: 'row' },
    entete: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, color: c.texteAttenue },
    enteteEquipe: { textAlign: 'left' },
    th: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, color: c.texteAttenue, width: 34, textAlign: 'right' },
    ligneStats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    colPts: { width: 40 },
    rangEquipe: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
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
