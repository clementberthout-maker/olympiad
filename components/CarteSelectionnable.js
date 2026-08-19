import { Pressable, Text, StyleSheet } from 'react-native';

// Carte sélectionnable réutilisée pour le format du tournoi et les deux
// règles de départage, conformément à la demande d'harmoniser leur
// présentation (05-UXUI.md).
export default function CarteSelectionnable({ label, selectionnee, onPress }) {
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

const styles = StyleSheet.create({
  carte: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  carteSelectionnee: {
    borderColor: '#111',
    backgroundColor: '#f5f5f7',
  },
  texte: { fontSize: 14, color: '#444' },
  texteSelectionne: { color: '#111', fontWeight: '500' },
  coche: { fontSize: 14, color: '#111' },
});
