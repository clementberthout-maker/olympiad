import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

const DUREE_AFFICHAGE = 1600;

// Petit message de confirmation non bloquant, affiché en bas de l'écran
// (ex : "Résultat enregistré"). `toast` vaut null quand rien à afficher, ou
// { message, type: 'succes' | 'erreur' }. Se referme tout seul puis appelle
// onHide pour que l'appelant remette `toast` à null.
export default function Toast({ toast, onHide }) {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    let ferme = false;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
    const minuteur = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        if (!ferme) onHide?.();
      });
    }, DUREE_AFFICHAGE);
    return () => { ferme = true; clearTimeout(minuteur); };
  }, [toast]);

  if (!toast) return null;

  const estErreur = toast.type === 'erreur';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.conteneur,
        estErreur && styles.conteneurErreur,
        {
          bottom: 28 + insets.bottom,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.icone, estErreur && styles.iconeErreur]}>{estErreur ? '!' : '✓'}</Text>
      <Text style={styles.texte}>{toast.message}</Text>
    </Animated.View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    conteneur: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.succes + '22',
      borderWidth: 1,
      borderColor: c.succes + '55',
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    conteneurErreur: {
      backgroundColor: c.danger + '22',
      borderColor: c.danger + '55',
    },
    icone: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.succes,
      width: 18, height: 18, borderRadius: 9, backgroundColor: c.succes + '33',
      textAlign: 'center', lineHeight: 18,
    },
    iconeErreur: { color: c.danger, backgroundColor: c.danger + '33' },
    texte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texte, flexShrink: 1 },
  });
}
