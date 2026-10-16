import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Pastille "● EN DIRECT" affichée à côté du score d'un match en cours
// (résultat au statut "en_cours"), sur le calendrier, le suivi public et
// le grand écran.
export default function BadgeEnDirect({ grand = false }) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs, grand), [couleurs, grand]);

  return (
    <View style={styles.badge}>
      <View style={styles.point} />
      <Text style={styles.texte}>{t('commun.enDirect')}</Text>
    </View>
  );
}

function creerStyles(c, grand) {
  return StyleSheet.create({
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    point: { width: grand ? 8 : 6, height: grand ? 8 : 6, borderRadius: 4, backgroundColor: c.danger },
    texte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: grand ? 12 : 10, letterSpacing: 0.5, color: c.danger },
  });
}
