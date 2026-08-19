import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { estPhaseDePoule } from '../../../lib/generation';

export default function SaisieResultat() {
  const { matchId } = useLocalSearchParams();
  const router = useRouter();
  const [match, setMatch] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [scoreTabA, setScoreTabA] = useState('');
  const [scoreTabB, setScoreTabB] = useState('');
  const [resultatExistant, setResultatExistant] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    async function chargerMatch() {
      const { data } = await supabase
        .from('matchs')
        .select('*, equipe_a:equipe_a_id(nom), equipe_b:equipe_b_id(nom)')
        .eq('id', matchId)
        .single();
      setMatch(data);

      const { data: resultat } = await supabase
        .from('resultats')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();
      if (resultat) {
        setScoreA(String(resultat.score_a));
        setScoreB(String(resultat.score_b));
        if (resultat.score_tab_a != null) setScoreTabA(String(resultat.score_tab_a));
        if (resultat.score_tab_b != null) setScoreTabB(String(resultat.score_tab_b));
        setResultatExistant(true);
      } else {
        setResultatExistant(false);
      }
    }
    chargerMatch();
  }, [matchId]);

  function validerResultat() {
    const a = parseInt(scoreA, 10) || 0;
    const b = parseInt(scoreB, 10) || 0;
    const estElimination = match && !estPhaseDePoule(match.phase);

    if (estElimination && a === b) {
      const tabA = parseInt(scoreTabA, 10);
      const tabB = parseInt(scoreTabB, 10);
      if (Number.isNaN(tabA) || Number.isNaN(tabB) || tabA === tabB) {
        Alert.alert(
          'Match à élimination directe',
          "En cas d'égalité, indique un score de tirs au but différent pour désigner le vainqueur."
        );
        return;
      }
    }
    enregistrer(a, b, estElimination && a === b);
  }

  async function enregistrer(a, b, avecTab) {
    setEnCours(true);
    const { error } = await supabase.from('resultats').upsert({
      match_id: matchId,
      score_a: a,
      score_b: b,
      score_tab_a: avecTab ? parseInt(scoreTabA, 10) : null,
      score_tab_b: avecTab ? parseInt(scoreTabB, 10) : null,
      statut: 'termine',
    });
    setEnCours(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    router.back();
  }

  async function supprimerResultat() {
    Alert.alert(
      'Supprimer le résultat ?',
      'Le match redeviendra "à venir".',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setEnCours(true);
            const { error } = await supabase.from('resultats').delete().eq('match_id', matchId);
            setEnCours(false);
            if (error) {
              Alert.alert('Erreur', error.message);
              return;
            }
            router.back();
          },
        },
      ]
    );
  }

  if (!match) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.contexte}>
        {match.phase} · {new Date(match.horaire).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {match.terrain ? ` · terrain ${match.terrain}` : ''}
      </Text>

      <View style={styles.ligneEquipe}>
        <Text style={styles.nomEquipe}>{match.equipe_a?.nom}</Text>
        <TextInput
          style={styles.score}
          value={scoreA}
          onChangeText={setScoreA}
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.ligneEquipe}>
        <Text style={styles.nomEquipe}>{match.equipe_b?.nom}</Text>
        <TextInput
          style={styles.score}
          value={scoreB}
          onChangeText={setScoreB}
          keyboardType="number-pad"
        />
      </View>

      {!estPhaseDePoule(match.phase) && scoreA !== '' && scoreB !== '' && scoreA === scoreB && (
        <View style={styles.blocTab}>
          <Text style={styles.labelTab}>Égalité — score des tirs au but</Text>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe}>{match.equipe_a?.nom}</Text>
            <TextInput
              style={styles.score}
              value={scoreTabA}
              onChangeText={setScoreTabA}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe}>{match.equipe_b?.nom}</Text>
            <TextInput
              style={styles.score}
              value={scoreTabB}
              onChangeText={setScoreTabB}
              keyboardType="number-pad"
            />
          </View>
        </View>
      )}

      <Pressable style={styles.bouton} onPress={validerResultat} disabled={enCours}>
        <Text style={styles.texteBouton}>{enCours ? 'Validation…' : 'Valider le résultat'}</Text>
      </Pressable>

      {resultatExistant && (
        <Pressable style={styles.boutonSupprimer} onPress={supprimerResultat} disabled={enCours}>
          <Text style={styles.texteBoutonSupprimer}>Supprimer le résultat</Text>
        </Pressable>
      )}

      <Text style={styles.note}>
        Classement et calendrier mis à jour instantanément pour tous les participants.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 32 },
  contexte: { fontSize: 13, color: '#666', marginBottom: 24 },
  ligneEquipe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nomEquipe: { fontSize: 16 },
  blocTab: {
    backgroundColor: '#f7f7f8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  labelTab: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8 },
  score: {
    width: 64,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
  },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
  boutonSupprimer: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  texteBoutonSupprimer: { color: '#c00', fontSize: 14, fontWeight: '500' },
  note: { fontSize: 12, color: '#999', marginTop: 16, textAlign: 'center' },
});
