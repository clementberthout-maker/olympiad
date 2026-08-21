import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import {
  estPhaseDePoule,
  genererPhaseFinaleDepuisPoules,
  genererTourSuivant,
  genererMatchTroisiemePlace,
  NOM_MATCH_TROISIEME_PLACE,
  resultatsAutoPourExempts,
  idEquipeGagnante,
  grouperParTerrain,
} from '../../../lib/generation';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';
import BoutonRetour from '../../../components/BoutonRetour';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

function reglagesDepuisTournoi(tournoi, matchsExistants) {
  const dureeMatchMinutes = tournoi.duree_match + (tournoi.mi_temps ? tournoi.duree_mi_temps : 0);
  const dureeCreneauMinutes = dureeMatchMinutes + tournoi.temps_pause;

  let horaireDepart;
  if (matchsExistants.length) {
    const dernierHoraire = Math.max(...matchsExistants.map((m) => new Date(m.horaire).getTime()));
    horaireDepart = new Date(dernierHoraire + dureeCreneauMinutes * 60000).toISOString();
  }

  return {
    dateDebut: tournoi.date_debut,
    heureDebut: tournoi.heure_premier_match,
    dureeCreneauMinutes,
    dureeMatchMinutes,
    nombreTerrains: tournoi.nombre_terrains,
    pauseDejeuner: tournoi.pause_dejeuner,
    heureDebutPause: tournoi.heure_debut_pause,
    heureFinPause: tournoi.heure_fin_pause,
    horaireDepart,
  };
}

export default function Calendrier() {
  const { id, cree } = useLocalSearchParams(); // id du tournoi
  const router = useRouter();
  // On arrive ici juste après avoir créé le tournoi (voir
  // tournoi/[id]/equipes.js) : la pile contient encore l'écran de création
  // initial (creer-tournoi.js), qui n'a plus lieu d'être puisque le tournoi
  // existe déjà — un retour naturel y ramènerait sur un formulaire obsolète.
  // On propose donc explicitement un retour vers l'accueil à la place.
  const vientDEtreCree = cree === '1';
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [tournoi, setTournoi] = useState(null);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchsBruts, setMatchsBruts] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [phases, setPhases] = useState([]); // [{ nom, matchs: [...] }]
  const [enCours, setEnCours] = useState(false);
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

    const groupes = {};
    for (const match of matchs || []) {
      const resultat = (resultatsData || []).find((r) => r.match_id === match.id);
      if (!groupes[match.phase]) groupes[match.phase] = [];
      groupes[match.phase].push({ ...match, resultat });
    }
    setPhases(Object.entries(groupes).map(([nom, matchs]) => ({ nom, matchs })));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  async function insererMatchs(matchs) {
    const { data: matchsInseres, error } = await supabase.from('matchs').insert(matchs).select();
    if (error) throw error;
    const resultatsExempts = resultatsAutoPourExempts(matchsInseres);
    if (resultatsExempts.length) {
      const { error: erreurExempts } = await supabase.from('resultats').insert(resultatsExempts);
      if (erreurExempts) throw erreurExempts;
    }
  }

  async function genererPhaseFinale() {
    if (equipesQualifiees < 2) {
      Alert.alert(t('calendrier.pasAssezQualifiesTitre'), t('calendrier.pasAssezQualifiesMessage'));
      return;
    }
    setEnCours(true);
    try {
      const poulesAvecClassement = poules.map((poule) => {
        const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
        const matchsPoule = matchsBruts.filter((m) => m.phase === poule.nom);
        return { classement: calculerClassement(equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule, tournoi.sport) };
      });
      const reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      const matchs = genererPhaseFinaleDepuisPoules(
        poulesAvecClassement, tournoi.nombre_qualifies_par_poule, id, reglages
      );
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert(t('commun.erreur'), e.message);
    } finally {
      setEnCours(false);
    }
  }

  async function genererProchainTour() {
    setEnCours(true);
    try {
      let reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      let matchs = [];
      if (peutGenererTroisiemePlace) {
        matchs = genererMatchTroisiemePlace(dernierePhaseElim.matchs, id, reglages);
        reglages = reglagesDepuisTournoi(tournoi, [...matchsBruts, ...matchs]);
      }
      matchs = [...matchs, ...genererTourSuivant(dernierePhaseElim.matchs, id, reglages)];
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert(t('commun.erreur'), e.message);
    } finally {
      setEnCours(false);
    }
  }

  if (!tournoi) {
    return vientDEtreCree ? (
      <Stack.Screen options={{ headerLeft: () => <BoutonRetour canGoBack onPress={() => router.replace('/')} /> }} />
    ) : null;
  }

  const phasesElim = phases.filter(({ nom }) => !estPhaseDePoule(nom));
  const phasesPoule = phases.filter(({ nom }) => estPhaseDePoule(nom));
  // Le match pour la 3e place se joue en parallèle de la finale : il ne
  // fait pas partie du tableau principal et ne doit pas influencer sa
  // progression (dernière phase jouée, vainqueur du tournoi...).
  const phasesElimPrincipales = phasesElim.filter(({ nom }) => nom !== NOM_MATCH_TROISIEME_PLACE);

  let dernierePhaseElim = null;
  if (phasesElimPrincipales.length) {
    dernierePhaseElim = phasesElimPrincipales.reduce((plusRecente, p) => {
      const dateMax = Math.max(...p.matchs.map((m) => new Date(m.created_at).getTime()));
      if (!plusRecente || dateMax > plusRecente.dateMax) return { ...p, dateMax };
      return plusRecente;
    }, null);
  }

  const dernierePhaseTerminee = dernierePhaseElim
    ? dernierePhaseElim.matchs.every((m) => m.resultat?.statut === 'termine')
    : false;
  const estFinale = dernierePhaseElim?.nom === 'Finale';
  const peutGenererTourSuivant = dernierePhaseTerminee && !estFinale;
  const troisiemePlaceDejaGeneree = phasesElim.some(({ nom }) => nom === NOM_MATCH_TROISIEME_PLACE);
  const peutGenererTroisiemePlace = tournoi.match_troisieme_place
    && peutGenererTourSuivant
    && dernierePhaseElim?.nom === 'Demi-finale'
    && dernierePhaseElim.matchs.length === 2
    && dernierePhaseElim.matchs.every((m) => m.equipe_b_id)
    && !troisiemePlaceDejaGeneree;
  const matchFinal = estFinale ? dernierePhaseElim.matchs[0] : null;
  const vainqueurId = dernierePhaseTerminee && estFinale
    ? idEquipeGagnante(matchFinal)
    : null;
  const nomVainqueur = vainqueurId ? equipes.find((e) => e.id === vainqueurId)?.nom : null;
  const deuxiemeId = vainqueurId && matchFinal.equipe_b_id
    ? (vainqueurId === matchFinal.equipe_a_id ? matchFinal.equipe_b_id : matchFinal.equipe_a_id)
    : null;
  const nomDeuxieme = deuxiemeId ? equipes.find((e) => e.id === deuxiemeId)?.nom : null;

  const phaseTroisiemePlace = phasesElim.find(({ nom }) => nom === NOM_MATCH_TROISIEME_PLACE);
  const troisiemePlaceTerminee = phaseTroisiemePlace
    ? phaseTroisiemePlace.matchs.every((m) => m.resultat?.statut === 'termine')
    : false;
  const troisiemeId = troisiemePlaceTerminee ? idEquipeGagnante(phaseTroisiemePlace.matchs[0]) : null;
  const nomTroisieme = troisiemeId ? equipes.find((e) => e.id === troisiemeId)?.nom : null;

  const afficherPodium = Boolean(
    tournoi.match_troisieme_place && nomVainqueur && nomDeuxieme && troisiemePlaceTerminee && nomTroisieme
  );

  const poulesTerminees = poules.length > 0 && phasesPoule.every(
    ({ matchs }) => matchs.every((m) => m.resultat?.statut === 'termine')
  ) && phasesPoule.length === poules.length;
  const peutGenererPhaseFinale = tournoi.format === 'mixte' && phasesElim.length === 0 && poulesTerminees;
  const equipesQualifiees = poules.reduce(
    (somme, p) => somme + Math.min(
      tournoi.nombre_qualifies_par_poule, equipes.filter((e) => e.poule_id === p.id).length
    ),
    0
  );

  const groupesAffiches = parTerrain
    ? grouperParTerrain(phases.flatMap(({ matchs }) => matchs))
    : [...phasesPoule, ...phasesElim];

  return (
    <>
      {vientDEtreCree && (
        <Stack.Screen
          options={{ headerLeft: () => <BoutonRetour canGoBack onPress={() => router.replace('/')} /> }}
        />
      )}
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.soustitre}>{t('calendrier.toucheUnMatch')}</Text>

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
              <Pressable
                key={match.id}
                style={styles.ligneMatch}
                onPress={() => router.push(`/tournoi/${id}/saisie?matchId=${match.id}`)}
              >
                <View style={styles.infoMatch}>
                  <Text style={styles.equipes}>
                    {match.equipe_a?.nom} · {match.equipe_b?.nom}
                  </Text>
                  <Text style={styles.horaire}>
                    {new Date(match.horaire).toLocaleString(langue === 'en' ? 'en-US' : 'fr-FR', {
                      weekday: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {parTerrain ? ` · ${match.phase}` : match.terrain ? ` · ${t('saisie.terrain', { n: match.terrain })}` : ''}
                  </Text>
                </View>
                {termine ? (
                  <Text style={styles.score}>
                    {match.resultat.score_a} – {match.resultat.score_b}
                    {!estPhaseDePoule(match.phase) && match.resultat.score_a === match.resultat.score_b
                      ? ` ${t('calendrier.scoreTab', { a: match.resultat.score_tab_a, b: match.resultat.score_tab_b })}`
                      : ''}
                  </Text>
                ) : (
                  <Text style={styles.aVenir}>{t('calendrier.aVenir')}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

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

      {peutGenererPhaseFinale && (
        <Pressable style={styles.boutonGenerer} onPress={genererPhaseFinale} disabled={enCours}>
          <Text style={styles.texteBoutonGenerer}>
            {enCours ? t('calendrier.generationEnCours') : t('calendrier.genererLaPhaseFinale')}
          </Text>
        </Pressable>
      )}

      {peutGenererTourSuivant && (
        <Pressable style={styles.boutonGenerer} onPress={genererProchainTour} disabled={enCours}>
          <Text style={styles.texteBoutonGenerer}>
            {enCours
              ? t('calendrier.generationEnCours')
              : peutGenererTroisiemePlace
                ? t('calendrier.genererFinaleEtTroisieme')
                : t('calendrier.genererLeTourSuivant')}
          </Text>
        </Pressable>
      )}

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

      <Pressable
        style={styles.boutonModifier}
        onPress={() => router.push(`/tournoi/${id}/equipes?modifier=1`)}
        hitSlop={8}
      >
        <Text style={styles.lienModifier}>{t('calendrier.modifierMonTournoi')}</Text>
      </Pressable>
      </ScrollView>
    </>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 24, paddingBottom: 60, backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte },
    boutonModifier: { alignItems: 'center', marginTop: 28 },
    lienModifier: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginBottom: 20 },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    sectionTitre: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.2, color: c.texte, marginTop: 8, marginBottom: 10 },
    groupe: { marginBottom: 22 },
    nomPhase: {
      fontFamily: POLICE_TITRE, fontSize: 14, letterSpacing: 0.4, color: c.accent, marginBottom: 8,
    },
    ligneMatch: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
    },
    infoMatch: { flexShrink: 1 },
    equipes: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    horaire: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
    score: { fontFamily: POLICE_TITRE, fontSize: 17, color: c.texte },
    aVenir: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue },
    ligneExempt: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.fond,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
    },
    exempt: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, fontStyle: 'italic' },
    bandeauVainqueur: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    texteVainqueur: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.3, color: c.accent },
    podium: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    podiumTitre: {
      fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.3, color: c.accent,
      textAlign: 'center', marginBottom: 10,
    },
    ligneePodium: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4,
    },
    podiumMedaille: { fontSize: 20 },
    podiumEquipe: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte },
    boutonGenerer: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 20,
    },
    texteBoutonGenerer: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 16, letterSpacing: 0.3 },
  });
}
