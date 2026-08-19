import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import ClassementPoule from '../../../components/ClassementPoule';

export default function Calendrier() {
  const { id } = useLocalSearchParams(); // id du tournoi
  const router = useRouter();
  const [tournoi, setTournoi] = useState(null);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchsBruts, setMatchsBruts] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [phases, setPhases] = useState([]); // [{ nom, matchs: [...] }]

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

  if (!tournoi) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.entete}>
        <Text style={styles.titre}>{tournoi.nom}</Text>
        <Pressable onPress={() => router.push(`/tournoi/${id}/equipes?modifier=1`)} hitSlop={8}>
          <Text style={styles.lienModifier}>Modifier mon tournoi</Text>
        </Pressable>
      </View>
      <Text style={styles.soustitre}>Touche un match pour saisir ou modifier son résultat</Text>

      {phases.length === 0 && (
        <Text style={styles.vide}>Aucun match généré pour l'instant.</Text>
      )}

      {phases.map(({ nom, matchs }) => (
        <View key={nom} style={styles.groupe}>
          <Text style={styles.nomPhase}>{nom}</Text>
          {matchs.map((match) => {
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
                    {match.terrain ? ` · terrain ${match.terrain}` : ''}
                  </Text>
                </View>
                {termine ? (
                  <Text style={styles.score}>
                    {match.resultat.score_a} – {match.resultat.score_b}
                  </Text>
                ) : (
                  <Text style={styles.aVenir}>À venir</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titre: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  lienModifier: { fontSize: 12, color: '#4338ca' },
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
});
