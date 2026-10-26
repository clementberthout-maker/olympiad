import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { chargerOlympiade } from '../../lib/olympiadeDonnees';
import { enregistrerTournoiSuivi, retirerTournoiSuivi } from '../../lib/tournoisSuivis';
import { formaterPeriode } from '../../lib/dates';
import { useTheme } from '../../lib/ThemeContext';
import { useLangue } from '../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE } from '../../lib/theme';
import VueOlympiade from '../../components/VueOlympiade';
import Squelette from '../../components/Squelette';

// Suivi public d'une olympiade multisports (lecture seule, sans compte) :
// classement général et épreuves, chacune ouvrant son propre suivi.
export default function SuiviOlympiade() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [donnees, setDonnees] = useState(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => {
    try {
      const d = await chargerOlympiade({ code });
      if (!d) {
        await retirerTournoiSuivi(String(code));
        setIntrouvable(true);
        return;
      }
      setDonnees(d);
      const o = d.olympiade;
      enregistrerTournoiSuivi({
        code: o.code_acces, nom: o.nom, dateDebut: o.date_debut, dateFin: o.date_fin, type: 'olympiade',
      });
    } catch {
      // Réseau indisponible : on garde l'affichage précédent.
    }
  }, [code]);

  useEffect(() => {
    charger();
    let minuteur = null;
    const canal = supabase
      .channel(`suivi-olympiade-${code}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, () => {
        clearTimeout(minuteur);
        minuteur = setTimeout(charger, 500);
      })
      .subscribe();
    return () => {
      clearTimeout(minuteur);
      supabase.removeChannel(canal);
    };
  }, [charger, code]);

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
      <Text style={styles.titre}>{olympiade.nom}</Text>
      <Text style={styles.aide}>{formaterPeriode(olympiade.date_debut, olympiade.date_fin, langue === 'en' ? 'en-US' : 'fr-FR')}</Text>
      <Text style={styles.aide}>{t('suivi.tirerPourActualiser')}</Text>
      <VueOlympiade donnees={donnees} onOuvrirEpreuve={(tournoi) => router.push(`/suivi/${tournoi.code_acces}`)} />
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 20, paddingBottom: 60, backgroundColor: c.fond },
    surtitre: { fontFamily: POLICE_TITRE, fontSize: 14, letterSpacing: 0.6, color: c.accent, marginBottom: 4 },
    titre: { fontFamily: POLICE_TITRE, fontSize: 26, letterSpacing: 0.3, color: c.texte },
    aide: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginTop: 4 },
  });
}
