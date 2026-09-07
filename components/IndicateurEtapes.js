import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Repère de progression affiché en tête des écrans du parcours de création
// d'un tournoi (Sport → Infos → Équipes) : sans lui, rien n'indique où on en
// est ni combien il reste d'étapes — voir choisir-sport.js, creer-tournoi.js
// et tournoi/[id]/equipes.js (cas brouillon uniquement, l'écran servant
// aussi à modifier un tournoi déjà créé).
export default function IndicateurEtapes({ etape, total, label }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  return (
    <View style={styles.ligne}>
      <View style={styles.points}>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <View key={n} style={[styles.point, n === etape && styles.pointActif]} />
        ))}
      </View>
      <Text style={styles.texte}>{label}</Text>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    ligne: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    points: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    point: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.bordure },
    pointActif: { width: 14, backgroundColor: c.accent },
    texte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, color: c.texteAttenue, letterSpacing: 0.2 },
  });
}
