import { Pressable, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Carte sélectionnable réutilisée pour le format du tournoi et les deux
// règles de départage, conformément à la demande d'harmoniser leur
// présentation (05-UXUI.md).
export default function CarteSelectionnable({ label, selectionnee, onPress }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <Pressable
      style={[styles.carte, selectionnee && styles.carteSelectionnee]}
      onPress={onPress}
    >
      <Text style={[styles.texte, selectionnee && styles.texteSelectionne]}>{label}</Text>
      {selectionnee && <Text style={styles.coche}>✓</Text>}
    </Pressable>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    carte: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    carteSelectionnee: {
      borderColor: c.accent,
      backgroundColor: c.surface,
    },
    texte: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texteAttenue },
    texteSelectionne: { fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.texte },
    coche: { fontSize: 14, color: c.accent, fontWeight: '700' },
  });
}
