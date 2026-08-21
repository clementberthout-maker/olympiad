import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { vibrerLeger } from '../lib/haptique';

// Compteur +/- tactile pour saisir un score, à la place d'un champ texte au
// clavier numérique : plus rapide et plus fiable d'un pouce, en plein match.
export default function CompteurScore({ valeur, onChange, max }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const auMaximum = max != null && valeur >= max;

  function decrementer() {
    if (valeur <= 0) return;
    vibrerLeger();
    onChange(valeur - 1);
  }

  function incrementer() {
    if (auMaximum) return;
    vibrerLeger();
    onChange(valeur + 1);
  }

  return (
    <View style={styles.conteneur}>
      <Pressable
        style={[styles.bouton, valeur <= 0 && styles.boutonDesactive]}
        onPress={decrementer}
        disabled={valeur <= 0}
        hitSlop={10}
      >
        <Text style={[styles.symbole, valeur <= 0 && styles.symboleDesactive]}>−</Text>
      </Pressable>
      <Text style={styles.valeur}>{valeur}</Text>
      <Pressable
        style={[styles.bouton, auMaximum && styles.boutonDesactive]}
        onPress={incrementer}
        disabled={auMaximum}
        hitSlop={10}
      >
        <Text style={[styles.symbole, auMaximum && styles.symboleDesactive]}>+</Text>
      </Pressable>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    conteneur: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bouton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boutonDesactive: { opacity: 0.4 },
    symbole: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 19, color: c.accent, marginTop: -1 },
    symboleDesactive: { color: c.texteAttenue },
    valeur: { fontFamily: POLICE_TITRE, fontSize: 26, color: c.texte, width: 32, textAlign: 'center' },
  });
}
