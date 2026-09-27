import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { URL_POLITIQUE_CONFIDENTIALITE, URL_CONDITIONS_UTILISATION, ouvrirLien } from '../lib/liensLegaux';

// Liens vers la politique de confidentialité et les conditions
// d'utilisation, affichés sur l'écran d'achat (obligatoire pour un
// abonnement côté Apple) et dans "Mon profil".
export default function LiensLegaux() {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <View style={styles.ligne}>
      <Pressable onPress={() => ouvrirLien(URL_CONDITIONS_UTILISATION)} hitSlop={8}>
        <Text style={styles.lien}>{t('liensLegaux.conditionsUtilisation')}</Text>
      </Pressable>
      <Text style={styles.separateur}>·</Text>
      <Pressable onPress={() => ouvrirLien(URL_POLITIQUE_CONFIDENTIALITE)} hitSlop={8}>
        <Text style={styles.lien}>{t('liensLegaux.politiqueConfidentialite')}</Text>
      </Pressable>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    ligne: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    lien: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12, color: c.lien, textDecorationLine: 'underline' },
    separateur: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue },
  });
}
