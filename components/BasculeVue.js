import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Sélecteur à deux options (ex : "Par poule" / "Par terrain"), utilisé sur
// le calendrier organisateur et l'écran de suivi public.
export default function BasculeVue({ options, valeur, onChange }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <View style={styles.conteneur}>
      {options.map((option) => {
        const active = option.valeur === valeur;
        return (
          <Pressable
            key={option.valeur}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(option.valeur)}
          >
            <Text style={[styles.texte, active && styles.texteActif]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    conteneur: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      padding: 3,
      marginBottom: 18,
    },
    option: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    optionActive: { backgroundColor: c.accent },
    texte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texteAttenue },
    texteActif: { color: c.accentEncre },
  });
}
