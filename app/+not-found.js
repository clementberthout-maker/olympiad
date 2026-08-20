import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

// Filet de sécurité : affiché si l'app essaie d'ouvrir un lien ou un code
// qui ne correspond à aucun écran (ex: QR code illisible ou non reconnu).
export default function NotFound() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Page introuvable</Text>
      <Text style={styles.soustitre}>
        Ce lien ou ce code ne correspond à aucun tournoi. Vérifie le QR code ou le code d'accès.
      </Text>
      <Pressable style={styles.bouton} onPress={() => router.replace('/')}>
        <Text style={styles.texteBouton}>Retour à l'accueil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  titre: { fontSize: 19, fontWeight: '600', textAlign: 'center' },
  soustitre: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  texteBouton: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
