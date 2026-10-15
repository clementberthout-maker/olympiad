import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';

const DRAPEAU = { fr: '🇫🇷', en: '🇬🇧' };
const AUTRE_LANGUE = { fr: 'en', en: 'fr' };

// Petit rond drapeau, seul point d'accès au changement de langue de l'app
// (voir lib/LangueContext) : un tap bascule directement vers l'autre
// langue disponible. Utilisé uniquement sur l'écran d'accueil pour ne pas
// démultiplier ce contrôle sur chaque écran.
export default function BoutonLangue() {
  const { couleurs } = useTheme();
  const { langue, setLangue } = useLangue();
  const styles = creerStyles(couleurs);

  return (
    <Pressable
      style={styles.rond}
      onPress={() => setLangue(AUTRE_LANGUE[langue])}
      hitSlop={8}
    >
      <Text style={styles.drapeau}>{DRAPEAU[langue]}</Text>
    </Pressable>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    rond: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.bordure,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    // Couleur utile seulement là où les drapeaux emoji ne sont pas dessinés
    // (Windows, aperçu web) : ils s'affichent alors en lettres "FR" / "GB".
    drapeau: { fontSize: 17, color: c.texte },
  });
}
