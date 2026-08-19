import { View, Text, StyleSheet } from 'react-native';

// Petit tableau de classement réutilisé pour une poule donnée, sur l'écran
// calendrier (organisateur) et l'écran de suivi (public).
export default function ClassementPoule({ nom, classement }) {
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

const styles = StyleSheet.create({
  carte: { backgroundColor: '#f7f7f8', borderRadius: 14, padding: 16, marginBottom: 12 },
  titre: { fontSize: 13, fontWeight: '600', color: '#4338ca', marginBottom: 8 },
  vide: { fontSize: 13, color: '#999' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e5e5', paddingBottom: 6, marginBottom: 4 },
  th: { fontSize: 11, color: '#999', width: 36, textAlign: 'right' },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rangEquipe: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rang: { fontSize: 11, color: '#bbb', width: 14 },
  nom: { fontSize: 13.5 },
  valeur: { fontSize: 13.5, width: 36, textAlign: 'right' },
  points: { fontWeight: '600', color: '#111' },
});
