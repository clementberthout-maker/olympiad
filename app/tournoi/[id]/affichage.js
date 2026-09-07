import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import {
  estPhaseDePoule, grouperParTerrain, idEquipeGagnante, NOM_MATCH_TROISIEME_PLACE,
} from '../../../lib/generation';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';
import Squelette from '../../../components/Squelette';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

// Intervalle d'actualisation automatique : cet écran est pensé pour rester
// affiché sans qu'on y touche (vidéoprojecteur, écran posé sur un mur), donc
// pas de "tire pour actualiser" — juste un rafraîchissement périodique tant
// que l'écran est affiché (voir useFocusEffect ci-dessous).
const INTERVALLE_ACTUALISATION = 20000;

// Vue plein écran, à fort contraste et en gros caractères, du programme et
// des résultats d'un tournoi — destinée à être projetée ou affichée sur un
// écran commun pendant l'événement, sans dépendre du téléphone de chacun
// (voir la proposition "Partager" sur tournoi/[id]/calendrier.js).
export default function VueGrandEcran() {
  const { id } = useLocalSearchParams();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const locale = langue === 'en' ? 'en-US' : 'fr-FR';
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [tournoi, setTournoi] = useState(null);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchsBruts, setMatchsBruts] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [parTerrain, setParTerrain] = useState(false);

  const charger = useCallback(async () => {
    const { data: t } = await supabase.from('tournois').select('*').eq('id', id).single();
    setTournoi(t);

    const { data: p } = await supabase.from('poules').select('*').eq('tournoi_id', id).order('nom');
    setPoules(p || []);

    const { data: eq } = await supabase.from('equipes').select('*').eq('tournoi_id', id);
    setEquipes(eq || []);

    const { data: matchs } = await supabase
      .from('matchs')
      .select('*, equipe_a:equipe_a_id(nom), equipe_b:equipe_b_id(nom)')
      .eq('tournoi_id', id)
      .order('horaire');
    setMatchsBruts(matchs || []);

    const { data: resultatsData } = await supabase
      .from('resultats')
      .select('*')
      .in('match_id', (matchs || []).map((m) => m.id));
    setResultats(resultatsData || []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      charger();
      const minuteur = setInterval(charger, INTERVALLE_ACTUALISATION);
      return () => clearInterval(minuteur);
    }, [charger])
  );

  if (!tournoi) {
    return (
      <View style={styles.container}>
        <Squelette width={240} height={30} style={{ marginBottom: 10 }} />
        <Squelette width={160} height={15} style={{ marginBottom: 28 }} />
        <Squelette height={160} radius={14} style={{ marginBottom: 16 }} />
        <Squelette height={160} radius={14} />
      </View>
    );
  }

  const matchsAvecResultat = matchsBruts.map((m) => ({
    ...m, resultat: resultats.find((r) => r.match_id === m.id),
  }));
  const groupes = {};
  for (const m of matchsAvecResultat) {
    if (!groupes[m.phase]) groupes[m.phase] = [];
    groupes[m.phase].push(m);
  }
  const phases = Object.entries(groupes).map(([nom, matchs]) => ({ nom, matchs }));
  const phasesPoule = phases.filter(({ nom }) => estPhaseDePoule(nom));
  const phasesElim = phases.filter(({ nom }) => !estPhaseDePoule(nom));
  const groupesAffiches = parTerrain
    ? grouperParTerrain(matchsAvecResultat)
    : [...phasesPoule, ...phasesElim];

  // Podium simplifié : on ne cherche que la finale et le match pour la 3e
  // place (pas besoin ici de savoir quel tour générer ensuite, contrairement
  // à l'écran Calendrier organisateur — voir tournoi/[id]/calendrier.js).
  const matchFinale = phasesElim.find(({ nom }) => nom === 'Finale')?.matchs[0];
  const finaleTerminee = matchFinale?.resultat?.statut === 'termine';
  const vainqueurId = finaleTerminee ? idEquipeGagnante(matchFinale) : null;
  const nomVainqueur = vainqueurId ? equipes.find((e) => e.id === vainqueurId)?.nom : null;
  const deuxiemeId = vainqueurId && matchFinale.equipe_b_id
    ? (vainqueurId === matchFinale.equipe_a_id ? matchFinale.equipe_b_id : matchFinale.equipe_a_id)
    : null;
  const nomDeuxieme = deuxiemeId ? equipes.find((e) => e.id === deuxiemeId)?.nom : null;

  const matchTroisieme = phasesElim.find(({ nom }) => nom === NOM_MATCH_TROISIEME_PLACE)?.matchs[0];
  const troisiemeTerminee = matchTroisieme?.resultat?.statut === 'termine';
  const troisiemeId = troisiemeTerminee ? idEquipeGagnante(matchTroisieme) : null;
  const nomTroisieme = troisiemeId ? equipes.find((e) => e.id === troisiemeId)?.nom : null;

  const afficherPodium = Boolean(nomVainqueur && nomDeuxieme && nomTroisieme);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.soustitre}>
        {new Date(`${tournoi.date_debut}T00:00:00`).toLocaleDateString(locale, {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>

      {afficherPodium ? (
        <View style={styles.podium}>
          <Text style={styles.podiumTitre}>{t('calendrier.podium')}</Text>
          <View style={styles.ligneePodium}>
            <Text style={styles.podiumMedaille}>🥇</Text>
            <Text style={styles.podiumEquipe}>{nomVainqueur}</Text>
          </View>
          <View style={styles.ligneePodium}>
            <Text style={styles.podiumMedaille}>🥈</Text>
            <Text style={styles.podiumEquipe}>{nomDeuxieme}</Text>
          </View>
          <View style={styles.ligneePodium}>
            <Text style={styles.podiumMedaille}>🥉</Text>
            <Text style={styles.podiumEquipe}>{nomTroisieme}</Text>
          </View>
        </View>
      ) : nomVainqueur && (
        <View style={styles.bandeauVainqueur}>
          <Text style={styles.texteVainqueur}>{t('calendrier.vainqueur', { nom: nomVainqueur })}</Text>
        </View>
      )}

      {tournoi.nombre_terrains > 1 && phases.length > 0 && (
        <BasculeVue
          valeur={parTerrain ? 'terrain' : 'poule'}
          onChange={(v) => setParTerrain(v === 'terrain')}
          options={[
            { valeur: 'poule', label: t('calendrier.parPoule') },
            { valeur: 'terrain', label: t('calendrier.parTerrain') },
          ]}
        />
      )}

      {phases.length === 0 && (
        <Text style={styles.vide}>{t('calendrier.aucunMatch')}</Text>
      )}

      {groupesAffiches.map(({ nom, matchs }) => (
        <View key={nom} style={styles.groupe}>
          <Text style={styles.nomPhase}>{nom}</Text>
          {matchs.map((match) => {
            if (!match.equipe_b_id) {
              return (
                <View key={match.id} style={styles.ligneExempt}>
                  <Text style={styles.equipes}>{match.equipe_a?.nom}</Text>
                  <Text style={styles.exempt}>{t('calendrier.exempt')}</Text>
                </View>
              );
            }
            const termine = match.resultat?.statut === 'termine';
            return (
              <View key={match.id} style={styles.ligneMatch}>
                <View style={styles.infoMatch}>
                  <Text style={styles.equipes}>
                    {match.equipe_a?.nom} · {match.equipe_b?.nom}
                  </Text>
                  <Text style={styles.horaire}>
                    {new Date(match.horaire).toLocaleString(locale, {
                      weekday: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {parTerrain ? ` · ${match.phase}` : match.terrain ? ` · ${t('saisie.terrain', { n: match.terrain })}` : ''}
                  </Text>
                </View>
                <Text style={termine ? styles.score : styles.aVenir}>
                  {termine ? `${match.resultat.score_a} – ${match.resultat.score_b}` : t('calendrier.aVenir')}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {poules.length > 0 && (
        <>
          <Text style={styles.sectionTitre}>{t('calendrier.classement')}</Text>
          {poules.map((poule) => {
            const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
            const matchsPoule = matchsBruts.filter((m) => m.phase === poule.nom);
            const classement = calculerClassement(
              equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule, tournoi.sport
            );
            return <ClassementPoule key={poule.id} nom={poule.nom} classement={classement} sport={tournoi.sport} />;
          })}
        </>
      )}
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 24, paddingTop: 28, paddingBottom: 60, backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 34, letterSpacing: 0.3, color: c.texte },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 15, color: c.texteAttenue, marginBottom: 20 },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 15, color: c.texteAttenue },
    sectionTitre: { fontFamily: POLICE_TITRE, fontSize: 22, letterSpacing: 0.2, color: c.texte, marginTop: 12, marginBottom: 12 },
    groupe: { marginBottom: 26 },
    nomPhase: {
      fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.4, color: c.accent, marginBottom: 10,
    },
    ligneMatch: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    infoMatch: { flexShrink: 1 },
    equipes: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 19, color: c.texte },
    horaire: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texteAttenue, marginTop: 3 },
    score: { fontFamily: POLICE_TITRE, fontSize: 26, color: c.texte },
    aVenir: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texteAttenue },
    ligneExempt: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.fond,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    exempt: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texteAttenue, fontStyle: 'italic' },
    bandeauVainqueur: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      marginBottom: 22,
    },
    texteVainqueur: { fontFamily: POLICE_TITRE, fontSize: 26, letterSpacing: 0.3, color: c.accent },
    podium: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 14,
      padding: 22,
      marginBottom: 22,
    },
    podiumTitre: {
      fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.accent,
      textAlign: 'center', marginBottom: 14,
    },
    ligneePodium: {
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6,
    },
    podiumMedaille: { fontSize: 28 },
    podiumEquipe: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 20, color: c.texte },
  });
}
