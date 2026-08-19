import { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const HAUTEUR_ITEM = 36;

// Sélecteur "roue déroulante" (comme une horloge), sans dépendance externe.
// `valeurs` est un tableau de nombres ; `formatValeur` permet de formater
// l'affichage (ex : padding à 2 chiffres pour les heures/minutes).
export default function RouePicker({ valeurs, valeur, onChange, largeur = 64, formatValeur = (v) => String(v) }) {
  const scrollRef = useRef(null);
  const indexInitial = Math.max(0, valeurs.indexOf(valeur));

  useEffect(() => {
    const index = valeurs.indexOf(valeur);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: index * HAUTEUR_ITEM, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);

  function onScrollEnd(e) {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.min(Math.max(Math.round(y / HAUTEUR_ITEM), 0), valeurs.length - 1);
    onChange(valeurs[index]);
  }

  return (
    <View style={[styles.conteneur, { width: largeur, height: HAUTEUR_ITEM * 3 }]}>
      <View style={styles.surbrillance} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={HAUTEUR_ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: HAUTEUR_ITEM }}
        onMomentumScrollEnd={onScrollEnd}
        contentOffset={{ x: 0, y: indexInitial * HAUTEUR_ITEM }}
      >
        {valeurs.map((v) => (
          <View key={v} style={[styles.item, { height: HAUTEUR_ITEM }]}>
            <Text style={[styles.texte, v === valeur && styles.texteSelectionne]}>
              {formatValeur(v)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { overflow: 'hidden' },
  surbrillance: {
    position: 'absolute',
    top: HAUTEUR_ITEM,
    left: 0,
    right: 0,
    height: HAUTEUR_ITEM,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  item: { alignItems: 'center', justifyContent: 'center' },
  texte: { fontSize: 16, color: '#bbb' },
  texteSelectionne: { color: '#111', fontWeight: '600' },
});
