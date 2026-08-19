import { View, Text, Pressable, StyleSheet } from 'react-native';

// Sélecteur à deux options (ex : "Par poule" / "Par terrain"), utilisé sur
// le calendrier organisateur et l'écran de suivi public.
export default function BasculeVue({ options, valeur, onChange }) {
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

const styles = StyleSheet.create({
  conteneur: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f2',
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
  optionActive: { backgroundColor: '#111' },
  texte: { fontSize: 13, fontWeight: '500', color: '#666' },
  texteActif: { color: '#fff' },
});
