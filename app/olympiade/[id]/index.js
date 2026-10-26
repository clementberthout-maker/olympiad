import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { chargerOlympiade } from '../../../lib/olympiadeDonnees';
import { formaterPeriode } from '../../../lib/dates';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';
import VueOlympiade from '../../../components/VueOlympiade';
import Squelette from '../../../components/Squelette';

// Olympiade multisports, côté organisateur : classement général, épreuves
// (chacune est un tournoi normal, avec son calendrier), ajout d'une épreuve.
export default function OlympiadeOrganisateur() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [donnees, setDonnees] = useState(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => {
    try {
      const d = await chargerOlympiade({ id });
      if (!d) setIntrouvable(true);
      setDonnees(d);
    } catch {
      // Réseau indisponible : on garde l'affichage précédent.
    }
  }, [id]);

  // Temps réel : un score saisi dans une épreuve met à jour le classement.
  useFocusEffect(
    useCallback(() => {
      charger();
      let minuteur = null;
      const canal = supabase
        .channel(`olympiade-${id}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, () => {
          clearTimeout(minuteur);
          minuteur = setTimeout(charger, 500);
        })
        .subscribe();
      return () => {
        clearTimeout(minuteur);
        supabase.removeChannel(canal);
      };
    }, [charger, id])
  );

  async function rafraichir() {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  }

  if (introuvable) {
    return (
      <View style={styles.container}>
        <Text style={styles.titre}>{t('olympiade.introuvableTitre')}</Text>
        <Text style={styles.aide}>{t('olympiade.introuvableMessage')}</Text>
      </View>
    );
  }

  if (!donnees) {
    return (
      <View style={styles.container}>
        <Squelette width={220} height={26} />
        <Squelette width={160} height={13} style={{ marginTop: 10, marginBottom: 28 }} />
        <Squelette height={52} radius={10} style={{ marginBottom: 6 }} />
        <Squelette height={52} radius={10} style={{ marginBottom: 6 }} />
        <Squelette height={52} radius={10} />
      </View>
    );
  }

  const { olympiade } = donnees;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} tintColor={couleurs.accent} />}
    >
      <Text style={styles.surtitre}>{t('olympiade.multisports')}</Text>
      <View style={styles.entete}>
        <Text style={styles.titre}>{olympiade.nom}</Text>
        <Pressable
          style={styles.boutonIcone}
          onPress={() => router.push(`/tournoi/${olympiade.id}/qrcode?type=olympiade`)}
          hitSlop={8}
          accessibilityLabel={t('accueil.qrCode')}
        >
          <Ionicons name="qr-code-outline" size={22} color={couleurs.texte} />
        </Pressable>
      </View>
      <Text style={styles.aide}>
        {formaterPeriode(olympiade.date_debut, olympiade.date_fin, langue === 'en' ? 'en-US' : 'fr-FR')}
        {' · '}{t('olympiade.codeSuivi', { code: String(olympiade.code_acces).toUpperCase() })}
      </Text>

      <Pressable
        style={styles.boutonPrincipal}
        onPress={() => router.push({ pathname: '/choisir-sport', params: { olympiade: olympiade.id } })}
      >
        <Text style={styles.texteBoutonPrincipal}>{t('olympiade.ajouterEpreuve')}</Text>
      </Pressable>

      <VueOlympiade donnees={donnees} onOuvrirEpreuve={(tournoi) => router.push(`/tournoi/${tournoi.id}/calendrier`)} />

      <Pressable
        style={styles.lienModifier}
        onPress={() => router.push({ pathname: '/olympiade/creer', params: { id: olympiade.id } })}
      >
        <Text style={styles.texteLien}>{t('olympiade.modifier')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingBottom: 60, backgroundColor: c.fond },
    surtitre: { fontFamily: POLICE_TITRE, fontSize: 14, letterSpacing: 0.6, color: c.accent, marginBottom: 4 },
    entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    titre: { fontFamily: POLICE_TITRE, fontSize: 26, letterSpacing: 0.3, color: c.texte, flexShrink: 1 },
    boutonIcone: {
      width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface2, borderWidth: 1, borderColor: c.bordure,
    },
    aide: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginTop: 4 },
    boutonPrincipal: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
    texteBoutonPrincipal: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    lienModifier: { alignItems: 'center', marginTop: 28 },
    texteLien: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13.5, color: c.lien },
  });
}
