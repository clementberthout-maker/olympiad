import { Pressable, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Bouton retour maison (chevron + "Retour"), utilisé comme headerLeft par
// défaut sur tout l'app à la place du bouton système : voir _layout.js.
// N'affiche rien sur le premier écran d'une pile (canGoBack à false).
export default function BoutonRetour({ canGoBack, onPress }) {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  if (!canGoBack && !onPress) return null;

  return (
    <Pressable onPress={onPress ?? (() => router.back())} hitSlop={10} style={styles.bouton}>
      <Ionicons name="chevron-back" size={18} color={couleurs.accent} />
      <Text style={styles.texte}>{t('boutonRetour.retour')}</Text>
    </Pressable>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    bouton: {
      flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingRight: 8,
    },
    texte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14.5, color: c.accent },
  });
}
