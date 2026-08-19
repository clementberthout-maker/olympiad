import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import {
  estPhaseDePoule,
  genererPhaseFinaleDepuisPoules,
  genererTourSuivant,
  resultatsAutoPourExempts,
  idEquipeGagnante,
  grouperParTerrain,
} from '../../../lib/generation';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';

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
  const { id } = useLocalSearchParams(); // id du tournoi
  const router = useRouter();
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
      Alert.alert('Pas assez de qualifiés', "Il faut au moins 2 équipes qualifiées pour générer la phase finale.");
      return;
    }
    setEnCours(true);
    try {
      const poulesAvecClassement = poules.map((poule) => {
        const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
        const matchsPoule = matchsBruts.filter((m) => m.phase === poule.nom);
        return { classement: calculerClassement(equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule) };
      });
      const reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      const matchs = genererPhaseFinaleDepuisPoules(
        poulesAvecClassement, tournoi.nombre_qualifies_par_poule, id, reglages
      );
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  async function genererProchainTour() {
    setEnCours(true);
    try {
      const reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      const matchs = genererTourSuivant(dernierePhaseElim.matchs, id, reglages);
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  if (!tournoi) return null;

  const phasesElim = phases.filter(({ nom }) => !estPhaseDePoule(nom));
  const phasesPoule = phases.filter(({ nom }) => estPhaseDePoule(nom));

  let dernierePhaseElim = null;
  if (phasesElim.length) {
    dernierePhaseElim = phasesElim.reduce((plusRecente, p) => {
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
  const vainqueurId = dernierePhaseTerminee && estFinale
    ? idEquipeGagnante(dernierePhaseElim.matchs[0])
    : null;
  const nomVainqueur = vainqueurId ? equipes.find((e) => e.id === vainqueurId)?.nom : null;

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.soustitre}>Touche un match pour saisir ou modifier son résultat</Text>

      {tournoi.nombre_terrains > 1 && phases.length > 0 && (
        <BasculeVue
          valeur={parTerrain ? 'terrain' : 'poule'}
          onChange={(v) => setParTerrain(v === 'terrain')}
          options={[
            { valeur: 'poule', label: 'Par poule' },
            { valeur: 'terrain', label: 'Par terrain' },
          ]}
        />
      )}

      {phases.length === 0 && (
        <Text style={styles.vide}>Aucun match généré pour l'instant.</Text>
      )}

      {groupesAffiches.map(({ nom, matchs }) => (
        <View key={nom} style={styles.groupe}>
          <Text style={styles.nomPhase}>{nom}</Text>
          {matchs.map((match) => {
            if (!match.equipe_b_id) {
              return (
                <View key={match.id} style={styles.ligneExempt}>
                  <Text style={styles.equipes}>{match.equipe_a?.nom}</Text>
                  <Text style={styles.exempt}>Exempt · qualifié·e directement</Text>
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
                    {new Date(match.horaire).toLocaleString('fr-FR', {
                      weekday: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {parTerrain ? ` · ${match.phase}` : match.terrain ? ` · terrain ${match.terrain}` : ''}
                  </Text>
                </View>
                {termine ? (
                  <Text style={styles.score}>
                    {match.resultat.score_a} – {match.resultat.score_b}
                    {!estPhaseDePoule(match.phase) && match.resultat.score_a === match.resultat.score_b
                      ? ` (tab ${match.resultat.score_tab_a}-${match.resultat.score_tab_b})`
                      : ''}
                  </Text>
                ) : (
                  <Text style={styles.aVenir}>À venir</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {nomVainqueur && (
        <View style={styles.bandeauVainqueur}>
          <Text style={styles.texteVainqueur}>🏆 Vainqueur : {nomVainqueur}</Text>
        </View>
      )}

      {peutGenererPhaseFinale && (
        <Pressable style={styles.boutonGenerer} onPress={genererPhaseFinale} disabled={enCours}>
          <Text style={styles.texteBoutonGenerer}>
            {enCours ? 'Génération…' : 'Générer la phase finale'}
          </Text>
        </Pressable>
      )}

      {peutGenererTourSuivant && (
        <Pressable style={styles.boutonGenerer} onPress={genererProchainTour} disabled={enCours}>
          <Text style={styles.texteBoutonGenerer}>
            {enCours ? 'Génération…' : 'Générer le tour suivant'}
          </Text>
        </Pressable>
      )}

      {poules.length > 0 && (
        <>
          <Text style={styles.sectionTitre}>Classement</Text>
          {poules.map((poule) => {
            const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
            const matchsPoule = matchsBruts.filter((m) => m.phase === poule.nom);
            const classement = calculerClassement(
              equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule
            );
            return <ClassementPoule key={poule.id} nom={poule.nom} classement={classement} />;
          })}
        </>
      )}

      <Pressable
        style={styles.boutonModifier}
        onPress={() => router.push(`/tournoi/${id}/equipes?modifier=1`)}
        hitSlop={8}
      >
        <Text style={styles.lienModifier}>Modifier mon tournoi</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  titre: { fontSize: 19, fontWeight: '600' },
  boutonModifier: { alignItems: 'center', marginTop: 28 },
  lienModifier: { fontSize: 13, color: '#4338ca' },
  soustitre: { fontSize: 13, color: '#888', marginBottom: 20 },
  vide: { fontSize: 13, color: '#999' },
  sectionTitre: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 10 },
  groupe: { marginBottom: 22 },
  nomPhase: { fontSize: 13, fontWeight: '600', color: '#4338ca', marginBottom: 8 },
  ligneMatch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7f7f8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  infoMatch: { flexShrink: 1 },
  equipes: { fontSize: 14, fontWeight: '500' },
  horaire: { fontSize: 12, color: '#888', marginTop: 2 },
  score: { fontSize: 15, fontWeight: '600' },
  aVenir: { fontSize: 12, color: '#999' },
  ligneExempt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  exempt: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
  bandeauVainqueur: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  texteVainqueur: { fontSize: 16, fontWeight: '600', color: '#854d0e' },
  boutonGenerer: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  texteBoutonGenerer: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
