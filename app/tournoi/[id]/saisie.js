import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { estPhaseDePoule } from '../../../lib/generation';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';
import { vibrerSucces, vibrerAttention } from '../../../lib/haptique';
import CompteurScore from '../../../components/CompteurScore';
import Toast from '../../../components/Toast';

// Délai avant de refermer l'écran une fois le résultat enregistré : le temps
// que le message de confirmation soit visible (voir components/Toast.js).
const DELAI_RETOUR = 900;

export default function SaisieResultat() {
  const { matchId } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [match, setMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [scoreTabA, setScoreTabA] = useState(0);
  const [scoreTabB, setScoreTabB] = useState(0);
  const [bonusA, setBonusA] = useState(0);
  const [bonusB, setBonusB] = useState(0);
  // Tant que l'organisateur n'a touché à aucun compteur, on n'affiche pas le
  // bloc tirs au but même si 0-0 est techniquement une égalité : ça évite de
  // faire apparaître ce bloc avant même d'avoir commencé à saisir un score.
  const [debute, setDebute] = useState(false);
  const [resultatExistant, setResultatExistant] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [toast, setToast] = useState(null);
  const minuteurRetourRef = useRef(null);

  useEffect(() => () => clearTimeout(minuteurRetourRef.current), []);

  useEffect(() => {
    async function chargerMatch() {
      const { data } = await supabase
        .from('matchs')
        .select('*, equipe_a:equipe_a_id(nom), equipe_b:equipe_b_id(nom), tournoi:tournoi_id(points_bonus)')
        .eq('id', matchId)
        .single();
      setMatch(data);

      const { data: resultat } = await supabase
        .from('resultats')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();
      if (resultat) {
        setScoreA(resultat.score_a);
        setScoreB(resultat.score_b);
        if (resultat.score_tab_a != null) setScoreTabA(resultat.score_tab_a);
        if (resultat.score_tab_b != null) setScoreTabB(resultat.score_tab_b);
        setBonusA(resultat.bonus_a || 0);
        setBonusB(resultat.bonus_b || 0);
        setResultatExistant(true);
        setDebute(true);
      } else {
        setResultatExistant(false);
      }
    }
    chargerMatch();
  }, [matchId]);

  function changerScoreA(valeur) {
    setDebute(true);
    setScoreA(valeur);
  }

  function changerScoreB(valeur) {
    setDebute(true);
    setScoreB(valeur);
  }

  const estElimination = match && !estPhaseDePoule(match.phase);
  const egalite = debute && scoreA === scoreB;
  // Les points bonus n'influencent que le classement de poule (voir
  // lib/classement.js) : pas d'intérêt à les saisir en élimination directe.
  const avecPointsBonus = match && match.tournoi?.points_bonus && estPhaseDePoule(match.phase);

  function validerResultat() {
    if (estElimination && egalite) {
      if (scoreTabA === scoreTabB) {
        Alert.alert(t('saisie.matchEliminationTitre'), t('saisie.matchEliminationMessage'));
        return;
      }
    }
    enregistrer(scoreA, scoreB, estElimination && egalite);
  }

  async function enregistrer(a, b, avecTab) {
    setEnCours(true);
    const { error } = await supabase.from('resultats').upsert({
      match_id: matchId,
      score_a: a,
      score_b: b,
      score_tab_a: avecTab ? scoreTabA : null,
      score_tab_b: avecTab ? scoreTabB : null,
      bonus_a: bonusA,
      bonus_b: bonusB,
      statut: 'termine',
    });
    setEnCours(false);

    if (error) {
      Alert.alert(t('commun.erreur'), error.message);
      return;
    }
    vibrerSucces();
    setToast({ message: t('saisie.resultatEnregistre'), type: 'succes' });
    minuteurRetourRef.current = setTimeout(() => router.back(), DELAI_RETOUR);
  }

  async function supprimerResultat() {
    Alert.alert(
      t('saisie.supprimerTitre'),
      t('saisie.supprimerMessage'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('saisie.supprimerLeResultat'),
          style: 'destructive',
          onPress: async () => {
            setEnCours(true);
            const { error } = await supabase.from('resultats').delete().eq('match_id', matchId);
            setEnCours(false);
            if (error) {
              Alert.alert(t('commun.erreur'), error.message);
              return;
            }
            vibrerAttention();
            setToast({ message: t('saisie.resultatSupprime'), type: 'succes' });
            minuteurRetourRef.current = setTimeout(() => router.back(), DELAI_RETOUR);
          },
        },
      ]
    );
  }

  if (!match) return null;

  const meneA = debute && scoreA > scoreB;
  const meneB = debute && scoreB > scoreA;

  return (
    <View style={styles.container}>
      <Text style={styles.contexte}>
        {match.phase} · {new Date(match.horaire).toLocaleTimeString(langue === 'en' ? 'en-US' : 'fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {match.terrain ? ` · ${t('saisie.terrain', { n: match.terrain })}` : ''}
      </Text>

      <View style={[styles.ligneEquipe, meneA && styles.ligneEnTete]}>
        <View style={styles.infoEquipe}>
          <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_a?.nom}</Text>
          {meneA && <Text style={styles.badgeMene}>{t('saisie.mene')}</Text>}
        </View>
        <CompteurScore valeur={scoreA} onChange={changerScoreA} />
      </View>
      <View style={[styles.ligneEquipe, meneB && styles.ligneEnTete]}>
        <View style={styles.infoEquipe}>
          <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_b?.nom}</Text>
          {meneB && <Text style={styles.badgeMene}>{t('saisie.mene')}</Text>}
        </View>
        <CompteurScore valeur={scoreB} onChange={changerScoreB} />
      </View>

      {estElimination && egalite && (
        <View style={styles.blocTab}>
          <Text style={styles.labelTab}>{t('saisie.egaliteTirs')}</Text>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_a?.nom}</Text>
            <CompteurScore valeur={scoreTabA} onChange={setScoreTabA} />
          </View>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_b?.nom}</Text>
            <CompteurScore valeur={scoreTabB} onChange={setScoreTabB} />
          </View>
        </View>
      )}

      {avecPointsBonus && (
        <View style={styles.blocTab}>
          <Text style={styles.labelTab}>{t('saisie.pointsBonus')}</Text>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_a?.nom}</Text>
            <CompteurScore valeur={bonusA} onChange={setBonusA} max={2} />
          </View>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe} numberOfLines={1}>{match.equipe_b?.nom}</Text>
            <CompteurScore valeur={bonusB} onChange={setBonusB} max={2} />
          </View>
        </View>
      )}

      <Pressable style={styles.bouton} onPress={validerResultat} disabled={enCours}>
        <Text style={styles.texteBouton}>{enCours ? t('saisie.validationEnCours') : t('saisie.validerLeResultat')}</Text>
      </Pressable>

      {resultatExistant && (
        <Pressable style={styles.boutonSupprimer} onPress={supprimerResultat} disabled={enCours}>
          <Text style={styles.texteBoutonSupprimer}>{t('saisie.supprimerLeResultat')}</Text>
        </Pressable>
      )}

      <Text style={styles.note}>{t('saisie.note')}</Text>

      <Toast toast={toast} onHide={() => setToast(null)} />
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 32, backgroundColor: c.fond },
    contexte: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginBottom: 24 },
    ligneEquipe: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
      padding: 8,
      borderRadius: 10,
    },
    ligneEnTete: {
      backgroundColor: c.accent + '14',
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
      paddingLeft: 10,
    },
    infoEquipe: { flex: 1, flexShrink: 1 },
    nomEquipe: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 16, color: c.texte,
    },
    badgeMene: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 10, letterSpacing: 0.5,
      color: c.accent, marginTop: 2,
    },
    blocTab: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    labelTab: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginBottom: 8,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    boutonSupprimer: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    texteBoutonSupprimer: { color: c.danger, fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14 },
    note: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 16, textAlign: 'center' },
  });
}
