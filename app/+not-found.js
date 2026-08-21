import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE } from '../lib/theme';

// Filet de sécurité : affiché si l'app essaie d'ouvrir un lien ou un code
// qui ne correspond à aucun écran (ex: QR code illisible ou non reconnu).
export default function NotFound() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>{t('notFound.titre')}</Text>
      <Text style={styles.soustitre}>{t('notFound.sousTitre')}</Text>
      <Pressable style={styles.bouton} onPress={() => router.replace('/')}>
        <Text style={styles.texteBouton}>{t('notFound.retourAlAccueil')}</Text>
      </Pressable>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 22, letterSpacing: 0.3, color: c.texte, textAlign: 'center' },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, textAlign: 'center', marginTop: 8, marginBottom: 24 },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 28,
      alignItems: 'center',
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 16, letterSpacing: 0.3 },
  });
}
