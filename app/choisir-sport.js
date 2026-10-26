import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAchats } from '../lib/achats';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE } from '../lib/theme';
import { SPORTS } from '../lib/sports';
import IndicateurEtapes from '../components/IndicateurEtapes';

// Premier écran du parcours de création d'un tournoi : le sport choisi ici
// détermine le vocabulaire (buts/points...) utilisé sur les écrans suivants
// — voir lib/sports.js et creer-tournoi.js.
export default function ChoisirSport() {
  // olympiade : id de l'olympiade multisports dont on ajoute une épreuve.
  const { olympiade } = useLocalSearchParams();
  const router = useRouter();
  const { estPro } = useAchats();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/inscription');
    });
  }, []);

  function choisirSport(sport) {
    router.push({ pathname: '/creer-tournoi', params: { sport, ...(olympiade ? { olympiade } : {}) } });
  }

  // Olympiade multisports : réservée aux comptes Pro.
  function choisirOlympiade() {
    if (!estPro) {
      router.push({ pathname: '/paywall', params: { raison: 'olympiade' } });
      return;
    }
    router.push('/olympiade/creer');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <IndicateurEtapes etape={1} total={3} label={t('commun.etape', { n: 1, total: 3, label: t('choisirSport.etapeLabel') })} />
      <Text style={styles.eyebrow}>{t('choisirSport.eyebrow')}</Text>
      <Text style={styles.titre}>{olympiade ? t('olympiade.choisirSportEpreuve') : t('choisirSport.titre')}</Text>

      {SPORTS.map((s) => (
        <Pressable key={s.valeur} style={styles.carte} onPress={() => choisirSport(s.valeur)}>
          <View style={styles.infoCarte}>
            <MaterialCommunityIcons name={s.icone} size={22} color={couleurs.accent} />
            <Text style={styles.texteCarte}>{t(`sports.${s.valeur}.label`)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      {!olympiade && (
        <>
          <Text style={styles.ou}>{t('olympiade.ouPlusieursSports')}</Text>
          <Pressable style={[styles.carte, styles.carteOlympiade]} onPress={choisirOlympiade}>
            <View style={[styles.infoCarte, { flex: 1 }]}>
              <MaterialCommunityIcons name="podium" size={22} color={couleurs.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.texteCarte}>{t('olympiade.carteTitre')}</Text>
                <Text style={styles.sousTexteCarte}>{t('olympiade.carteAide')}</Text>
              </View>
            </View>
            <Text style={styles.badgePro}>PRO</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 24, flexGrow: 1, backgroundColor: c.fond },
    eyebrow: {
      fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.6, color: c.accent, marginBottom: 8,
    },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte, marginBottom: 20 },
    carte: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    infoCarte: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    texteCarte: { fontFamily: POLICE_TEXTE, fontSize: 15.5, color: c.texte },
    chevron: { fontSize: 20, color: c.texteAttenue },
    ou: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginTop: 14, marginBottom: 10 },
    carteOlympiade: { borderColor: c.accent, gap: 8 },
    sousTexteCarte: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
    badgePro: {
      fontFamily: POLICE_TITRE, fontSize: 12, letterSpacing: 0.6, color: c.accentEncre,
      backgroundColor: c.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
    },
  });
}
