import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { genererCodeAcces } from '../lib/codeAcces';
import CarteSelectionnable from '../components/CarteSelectionnable';
import SelecteurDate from '../components/SelecteurDate';

const FORMATS = [
  { valeur: 'mixte', label: 'Poules puis élimination directe' },
  { valeur: 'poules', label: 'Poules uniquement' },
  { valeur: 'elimination_directe', label: 'Élimination directe uniquement' },
];

const DEPARTAGES_POULE = [
  { valeur: 'diff_buts', label: 'Différence de buts' },
  { valeur: 'confrontation_directe', label: 'Confrontation directe' },
];

const DEPARTAGES_ELIMINATION = [
  { valeur: 'prolongations_tab', label: 'Prolongations puis tirs au but' },
  { valeur: 'tab_direct', label: 'Tirs au but directs' },
];

export default function CreerTournoi() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState('mixte');
  const [departagePoule, setDepartagePoule] = useState('diff_buts');
  const [departageElimination, setDepartageElimination] = useState('prolongations_tab');
  const [enCours, setEnCours] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/inscription');
        return;
      }
      setSession(data.session);
    });
  }, []);

  async function creerTournoi() {
    if (!nom || !date) {
      Alert.alert('Champs manquants', 'Merci de renseigner le nom et la date du tournoi.');
      return;
    }
    if (!session) return;
    setEnCours(true);

    let code = genererCodeAcces(nom, date);
    let data, error;
    for (let tentative = 0; tentative < 5; tentative++) {
      ({ data, error } = await supabase
        .from('tournois')
        .insert({
          nom,
          date_debut: date,
          format,
          critere_departage_poule: departagePoule,
          mode_departage: departageElimination,
          code_acces: code,
          organisateur_id: session.user.id,
        })
        .select()
        .single());

      if (!error) break;
      if (error.code === '23505') {
        // Code déjà pris (même nom + même date) : on ajoute un suffixe aléatoire
        code = `${genererCodeAcces(nom, date)}${Math.floor(10 + Math.random() * 90)}`;
        continue;
      }
      break;
    }

    setEnCours(false);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    router.replace(`/tournoi/${data.id}/equipes`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>Football</Text>

      <Text style={styles.label}>Nom du tournoi</Text>
      <TextInput
        style={styles.input}
        placeholder="Tournoi de fin d'année"
        value={nom}
        onChangeText={setNom}
        returnKeyType="done"
      />

      <Text style={styles.label}>Date</Text>
      <SelecteurDate value={date} onChange={setDate} placeholder="Choisir la date du tournoi" />

      <Text style={styles.label}>Format</Text>
      {FORMATS.map((f) => (
        <CarteSelectionnable
          key={f.valeur}
          label={f.label}
          selectionnee={format === f.valeur}
          onPress={() => setFormat(f.valeur)}
        />
      ))}

      <Text style={styles.label}>Départage · égalité en poule</Text>
      {DEPARTAGES_POULE.map((d) => (
        <CarteSelectionnable
          key={d.valeur}
          label={d.label}
          selectionnee={departagePoule === d.valeur}
          onPress={() => setDepartagePoule(d.valeur)}
        />
      ))}

      <Text style={styles.label}>Départage · match nul en élimination directe</Text>
      {DEPARTAGES_ELIMINATION.map((d) => (
        <CarteSelectionnable
          key={d.valeur}
          label={d.label}
          selectionnee={departageElimination === d.valeur}
          onPress={() => setDepartageElimination(d.valeur)}
        />
      ))}

      <Pressable style={styles.bouton} onPress={creerTournoi} disabled={enCours}>
        <Text style={styles.texteBouton}>{enCours ? 'Création…' : 'Créer le tournoi'}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  eyebrow: { fontSize: 13, color: '#666', marginBottom: 16 },
  label: { fontSize: 12, color: '#888', marginTop: 18, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
