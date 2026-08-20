import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Sélecteur Clair / Sombre pour l'apparence de l'app (voir lib/ThemeContext).
export default function BasculeTheme() {
  const { theme, couleurs, setTheme } = useTheme();
  const styles = creerStyles(couleurs);

  return (
    <View style={styles.conteneur}>
      {[{ valeur: 'clair', label: 'Clair' }, { valeur: 'sombre', label: 'Sombre' }].map((option) => {
        const actif = theme === option.valeur;
        return (
          <Pressable
            key={option.valeur}
            style={[styles.option, actif && styles.optionActive]}
            onPress={() => setTheme(option.valeur)}
          >
            <Text style={[styles.texte, actif && styles.texteActif]}>{option.label}</Text>
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
    },
    option: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    optionActive: { backgroundColor: c.accent },
    texte: { fontSize: 12.5, fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.texteAttenue },
    texteActif: { color: c.accentEncre },
  });
}
