import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { genererCodeAcces } from '../lib/codeAcces';
import CarteSelectionnable from '../components/CarteSelectionnable';
import SelecteurDate from '../components/SelecteurDate';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

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
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
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

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 60, backgroundColor: c.fond },
    eyebrow: {
      fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.6, color: c.accent, marginBottom: 16,
    },
    label: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginTop: 18, marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      padding: 13,
      fontSize: 14.5,
      fontFamily: POLICE_TEXTE,
      color: c.texte,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 28,
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.4 },
  });
}
