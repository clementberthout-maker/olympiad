import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD, POLICE_TEXTE_BOLD } from '../lib/theme';

// Petit tableau de classement réutilisé pour une poule donnée, sur l'écran
// calendrier (organisateur) et l'écran de suivi (public).
export default function ClassementPoule({ nom, classement }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <View style={styles.carte}>
      <Text style={styles.titre}>{nom}</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 1, textAlign: 'left' }]}>Équipe</Text>
        <Text style={styles.th}>J</Text>
        <Text style={styles.th}>Pts</Text>
      </View>
      {classement.length === 0 && <Text style={styles.vide}>Aucune équipe pour l'instant.</Text>}
      {classement.map((item, index) => (
        <View key={item.equipe.id} style={styles.ligne}>
          <View style={styles.rangEquipe}>
            <Text style={styles.rang}>{index + 1}</Text>
            <Text style={styles.nom}>{item.equipe.nom}</Text>
          </View>
          <Text style={styles.valeur}>{item.joues}</Text>
          <Text style={[styles.valeur, styles.points]}>{item.points}</Text>
        </View>
      ))}
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
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.bordure, paddingBottom: 6, marginBottom: 4 },
    th: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, color: c.texteAttenue, width: 36, textAlign: 'right' },
    ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    rangEquipe: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    rang: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue, width: 14 },
    nom: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte },
    valeur: { fontFamily: POLICE_TEXTE, fontSize: 13.5, width: 36, textAlign: 'right', color: c.texte },
    points: { fontFamily: POLICE_TEXTE_BOLD, color: c.accent },
  });
}
