import {
  View, Text, TextInput, StyleSheet, Pressable, FlatList, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import {
  repartirEnPoules,
  genererCalendrierPoules,
  genererPremierTourEliminationDirecte,
  resultatsAutoPourExempts,
} from '../../../lib/generation';
import CarteSelectionnable from '../../../components/CarteSelectionnable';
import RouePicker from '../../../components/RouePicker';
import SelecteurDate from '../../../components/SelecteurDate';

function pad(n) {
  return String(n).padStart(2, '0');
}

function plage(debut, fin) {
  return Array.from({ length: fin - debut + 1 }, (_, i) => debut + i);
}

const HEURES = plage(0, 23);
const MINUTES = plage(0, 59);
const DUREES_MATCH = plage(1, 180);
const DUREES_MI_TEMPS = plage(1, 60);
const DUREES_PAUSE = plage(0, 60);

function Stepper({ valeur, onChange, min = 0, pas = 1 }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperBouton} onPress={() => onChange(Math.max(min, valeur - pas))}>
        <Text style={styles.stepperTexte}>−</Text>
      </Pressable>
      <Text style={styles.stepperValeur}>{valeur}</Text>
      <Pressable style={styles.stepperBouton} onPress={() => onChange(valeur + pas)}>
        <Text style={styles.stepperTexte}>+</Text>
      </Pressable>
    </View>
  );
}

export default function GestionEquipes() {
  const { id, modifier } = useLocalSearchParams(); // id du tournoi
  const router = useRouter();
  const vientDuCalendrier = modifier === '1';
  const [tournoi, setTournoi] = useState(null);
  const [equipes, setEquipes] = useState([]);
  const [nomEquipe, setNomEquipe] = useState('');

  const [modifierInfos, setModifierInfos] = useState(false);
  const [nomEdit, setNomEdit] = useState('');
  const [dateEdit, setDateEdit] = useState('');

  const [modifierTitreDate, setModifierTitreDate] = useState(false);
  const [nomEdite, setNomEdite] = useState('');
  const [dateEditee, setDateEditee] = useState('');

  const [nombrePoules, setNombrePoules] = useState(2);
  const [nombreTerrains, setNombreTerrains] = useState(1);
  const [heureH, setHeureH] = useState(9);
  const [heureM, setHeureM] = useState(0);
  const [dureeMatch, setDureeMatch] = useState(60);
  const [miTemps, setMiTemps] = useState(false);
  const [dureeMiTemps, setDureeMiTemps] = useState(10);
  const [tempsPause, setTempsPause] = useState(15);
  const [pauseDejeuner, setPauseDejeuner] = useState(false);
  const [pauseDebutH, setPauseDebutH] = useState(12);
  const [pauseDebutM, setPauseDebutM] = useState(30);
  const [pauseFinH, setPauseFinH] = useState(13);
  const [pauseFinM, setPauseFinM] = useState(30);
  const [nombreQualifies, setNombreQualifies] = useState(2);

  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const { data: t } = await supabase.from('tournois').select('*').eq('id', id).single();
    setTournoi(t);
    if (t) {
      setNomEdit(t.nom);
      setDateEdit(t.date_debut);
      if (t.nombre_terrains) setNombreTerrains(t.nombre_terrains);
      if (t.heure_premier_match) {
        const [h, m] = t.heure_premier_match.split(':').map(Number);
        setHeureH(h);
        setHeureM(m);
      }
      if (t.duree_match) setDureeMatch(t.duree_match);
      if (typeof t.mi_temps === 'boolean') setMiTemps(t.mi_temps);
      if (t.duree_mi_temps) setDureeMiTemps(t.duree_mi_temps);
      if (typeof t.temps_pause === 'number') setTempsPause(t.temps_pause);
      if (typeof t.pause_dejeuner === 'boolean') setPauseDejeuner(t.pause_dejeuner);
      if (t.heure_debut_pause) {
        const [h, m] = t.heure_debut_pause.split(':').map(Number);
        setPauseDebutH(h);
        setPauseDebutM(m);
      }
      if (t.heure_fin_pause) {
        const [h, m] = t.heure_fin_pause.split(':').map(Number);
        setPauseFinH(h);
        setPauseFinM(m);
      }
      if (t.nombre_qualifies_par_poule) setNombreQualifies(t.nombre_qualifies_par_poule);
    }
    const { data: eq } = await supabase
      .from('equipes')
      .select('*')
      .eq('tournoi_id', id)
      .order('created_at');
    setEquipes(eq || []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  async function ajouterEquipe() {
    if (!nomEquipe.trim()) return;
    const { error } = await supabase.from('equipes').insert({ tournoi_id: id, nom: nomEquipe.trim() });
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    setNomEquipe('');
    Keyboard.dismiss();
    charger();
  }

  async function supprimerEquipe(equipeId) {
    await supabase.from('equipes').delete().eq('id', equipeId);
    charger();
  }

  function reglagesActuels() {
    return {
      nom: nomEdit,
      date_debut: dateEdit,
      nombre_terrains: nombreTerrains,
      heure_premier_match: `${pad(heureH)}:${pad(heureM)}`,
      duree_match: dureeMatch,
      mi_temps: miTemps,
      duree_mi_temps: miTemps ? dureeMiTemps : null,
      temps_pause: tempsPause,
      pause_dejeuner: pauseDejeuner,
      heure_debut_pause: pauseDejeuner ? `${pad(pauseDebutH)}:${pad(pauseDebutM)}` : null,
      heure_fin_pause: pauseDejeuner ? `${pad(pauseFinH)}:${pad(pauseFinM)}` : null,
      nombre_qualifies_par_poule: nombreQualifies,
    };
  }

  function allerAuCalendrier() {
    if (vientDuCalendrier) {
      router.back();
    } else {
      router.replace(`/tournoi/${id}/calendrier`);
    }
  }

  async function sauvegarderReglages() {
    setEnCours(true);
    try {
      const { error } = await supabase.from('tournois').update(reglagesActuels()).eq('id', id);
      if (error) throw error;

      // Premier enregistrement (aucun match encore généré) : on génère le
      // calendrier automatiquement dès que possible, pour ne pas obliger
      // l'organisateur à repasser par "Régénérer" juste après la création.
      const { count } = await supabase
        .from('matchs')
        .select('id', { count: 'exact', head: true })
        .eq('tournoi_id', id);

      if (!count && equipes.length >= 2) {
        await genererLesMatchs();
      }

      allerAuCalendrier();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  function confirmerRegeneration() {
    if (equipes.length < 2) {
      Alert.alert("Pas assez d'équipes", 'Ajoute au moins 2 équipes avant de régénérer le calendrier.');
      return;
    }
    Alert.alert(
      'Régénérer le calendrier ?',
      'Les matchs et résultats déjà saisis seront supprimés et remplacés par un nouveau calendrier.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Régénérer', style: 'destructive', onPress: regenererCalendrier },
      ]
    );
  }

  // Génère les poules (le cas échéant) et le calendrier des matchs à partir
  // des réglages et équipes actuels. Suppose qu'il n'y a rien à supprimer au
  // préalable (voir sauvegarderReglages / regenererCalendrier).
  async function genererLesMatchs() {
    const reglagesTournoi = reglagesActuels();
    const reglages = {
      dateDebut: dateEdit,
      heureDebut: reglagesTournoi.heure_premier_match,
      dureeCreneauMinutes: dureeMatch + (miTemps ? dureeMiTemps : 0) + tempsPause,
      dureeMatchMinutes: dureeMatch + (miTemps ? dureeMiTemps : 0),
      nombreTerrains,
      pauseDejeuner,
      heureDebutPause: reglagesTournoi.heure_debut_pause,
      heureFinPause: reglagesTournoi.heure_fin_pause,
    };

    if (tournoi.format === 'elimination_directe') {
      const matchs = genererPremierTourEliminationDirecte(equipes, id, reglages);
      const { data: matchsInseres, error } = await supabase.from('matchs').insert(matchs).select();
      if (error) throw error;
      const resultatsExempts = resultatsAutoPourExempts(matchsInseres);
      if (resultatsExempts.length) {
        const { error: erreurExempts } = await supabase.from('resultats').insert(resultatsExempts);
        if (erreurExempts) throw erreurExempts;
      }
    } else {
      const groupes = repartirEnPoules(equipes, nombrePoules);
      const poulesAvecEquipes = [];
      for (let i = 0; i < groupes.length; i++) {
        const nomPoule = `Poule ${String.fromCharCode(65 + i)}`;
        const { data: poule, error: erreurPoule } = await supabase
          .from('poules')
          .insert({ tournoi_id: id, nom: nomPoule })
          .select()
          .single();
        if (erreurPoule) throw erreurPoule;

        await supabase
          .from('equipes')
          .update({ poule_id: poule.id })
          .in('id', groupes[i].map((e) => e.id));

        poulesAvecEquipes.push({ id: poule.id, nom: nomPoule, equipes: groupes[i] });
      }

      const matchs = genererCalendrierPoules(poulesAvecEquipes, id, reglages);
      const { error: erreurMatchs } = await supabase.from('matchs').insert(matchs);
      if (erreurMatchs) throw erreurMatchs;
    }
  }

  async function regenererCalendrier() {
    setEnCours(true);
    try {
      await supabase.from('tournois').update(reglagesActuels()).eq('id', id);
      await supabase.from('matchs').delete().eq('tournoi_id', id);
      await supabase.from('poules').delete().eq('tournoi_id', id);
      await genererLesMatchs();
      allerAuCalendrier();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnCours(false);
    }
  }

  function confirmerSuppressionTournoi() {
    Alert.alert(
      'Supprimer ce tournoi ?',
      'Cette action est définitive : équipes, matchs et résultats seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: supprimerTournoi },
      ]
    );
  }

  async function supprimerTournoi() {
    setEnCours(true);
    const { error } = await supabase.from('tournois').delete().eq('id', id);
    setEnCours(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    router.replace('/');
  }

  if (!tournoi) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.entete}>
          <Text style={styles.titre}>{tournoi.nom}</Text>
          <View style={styles.badgeCode}>
            <Text style={styles.texteBadgeCode}>{tournoi.code_acces}</Text>
          </View>
        </View>
        <Text style={styles.soustitre}>
          {new Date(`${tournoi.date_debut}T00:00:00`).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        <Pressable onPress={() => setModifierInfos(!modifierInfos)} hitSlop={8}>
          <Text style={styles.lienModifierInfos}>
            {modifierInfos ? 'Fermer' : 'Modifier le nom et la date'}
          </Text>
        </Pressable>

        {modifierInfos && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>Nom du tournoi</Text>
            <TextInput style={styles.input} value={nomEdit} onChangeText={setNomEdit} returnKeyType="done" />
            <Text style={[styles.carteLabel, { marginTop: 14 }]}>Date</Text>
            <SelecteurDate value={dateEdit} onChange={setDateEdit} />
          </View>
        )}

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Équipes · {equipes.length}</Text>
          <View style={styles.ligneAjout}>
            <TextInput
              style={styles.input}
              placeholder="Nom de l'équipe"
              value={nomEquipe}
              onChangeText={setNomEquipe}
              onSubmitEditing={ajouterEquipe}
              returnKeyType="done"
            />
            <Pressable style={styles.boutonAjout} onPress={ajouterEquipe}>
              <Text style={styles.texteBoutonAjout}>+</Text>
            </Pressable>
          </View>

          <FlatList
            data={equipes}
            keyExtractor={(item) => item.id}
            style={styles.liste}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ligneEquipe}>
                <Text style={styles.nomEquipe}>{item.nom}</Text>
                <Pressable onPress={() => supprimerEquipe(item.id)} hitSlop={8}>
                  <Text style={styles.supprimer}>Retirer</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.vide}>Aucune équipe ajoutée pour l'instant.</Text>}
          />
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Terrains disponibles</Text>
          <Text style={styles.carteAide}>Plusieurs matchs pourront se jouer en même temps.</Text>
          <Stepper valeur={nombreTerrains} onChange={setNombreTerrains} min={1} />
        </View>

        {tournoi.format !== 'elimination_directe' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>Nombre de poules</Text>
            <Stepper valeur={nombrePoules} onChange={setNombrePoules} min={1} />
          </View>
        )}

        {tournoi.format === 'mixte' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>Qualifiés par poule pour la phase finale</Text>
            <Text style={styles.carteAide}>
              Nombre d'équipes de chaque poule qui accèdent à la phase à élimination directe.
            </Text>
            <Stepper valeur={nombreQualifies} onChange={setNombreQualifies} min={1} />
          </View>
        )}

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Heure du premier match</Text>
          <View style={styles.ligneRoues}>
            <RouePicker valeurs={HEURES} valeur={heureH} onChange={setHeureH} formatValeur={(v) => pad(v)} />
            <Text style={styles.deuxPoints}>:</Text>
            <RouePicker valeurs={MINUTES} valeur={heureM} onChange={setHeureM} formatValeur={(v) => pad(v)} />
          </View>
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Durée d'un match (minutes)</Text>
          <RouePicker valeurs={DUREES_MATCH} valeur={dureeMatch} onChange={setDureeMatch} />
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Mi-temps</Text>
          <View style={styles.ligneChoix}>
            <View style={{ flex: 1 }}>
              <CarteSelectionnable label="Oui" selectionnee={miTemps} onPress={() => setMiTemps(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <CarteSelectionnable label="Non" selectionnee={!miTemps} onPress={() => setMiTemps(false)} />
            </View>
          </View>
          {miTemps && (
            <>
              <Text style={[styles.carteLabel, { marginTop: 10 }]}>Durée de la mi-temps (minutes)</Text>
              <RouePicker valeurs={DUREES_MI_TEMPS} valeur={dureeMiTemps} onChange={setDureeMiTemps} />
            </>
          )}
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Pause entre chaque match (minutes)</Text>
          <RouePicker valeurs={DUREES_PAUSE} valeur={tempsPause} onChange={setTempsPause} />
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>Pause déjeuner</Text>
          <View style={styles.ligneChoix}>
            <View style={{ flex: 1 }}>
              <CarteSelectionnable label="Oui" selectionnee={pauseDejeuner} onPress={() => setPauseDejeuner(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <CarteSelectionnable label="Non" selectionnee={!pauseDejeuner} onPress={() => setPauseDejeuner(false)} />
            </View>
          </View>
          {pauseDejeuner && (
            <View style={styles.ligneDoublePause}>
              <View>
                <Text style={styles.sousLabel}>De</Text>
                <View style={styles.ligneRoues}>
                  <RouePicker valeurs={HEURES} valeur={pauseDebutH} onChange={setPauseDebutH} formatValeur={(v) => pad(v)} />
                  <Text style={styles.deuxPoints}>:</Text>
                  <RouePicker valeurs={MINUTES} valeur={pauseDebutM} onChange={setPauseDebutM} formatValeur={(v) => pad(v)} />
                </View>
              </View>
              <View>
                <Text style={styles.sousLabel}>À</Text>
                <View style={styles.ligneRoues}>
                  <RouePicker valeurs={HEURES} valeur={pauseFinH} onChange={setPauseFinH} formatValeur={(v) => pad(v)} />
                  <Text style={styles.deuxPoints}>:</Text>
                  <RouePicker valeurs={MINUTES} valeur={pauseFinM} onChange={setPauseFinM} formatValeur={(v) => pad(v)} />
                </View>
              </View>
            </View>
          )}
        </View>

        <Pressable style={styles.boutonSauvegarder} onPress={sauvegarderReglages} disabled={enCours}>
          <Text style={styles.texteBoutonSauvegarder}>{enCours ? 'Sauvegarde…' : 'Sauvegarder'}</Text>
        </Pressable>

        <Pressable style={styles.boutonRegenerer} onPress={confirmerRegeneration} disabled={enCours}>
          <Text style={styles.texteBoutonRegenerer}>Régénérer le calendrier</Text>
        </Pressable>
        <Text style={styles.avertissement}>
          Supprime et recrée les matchs à partir des réglages actuels — les résultats déjà saisis seront perdus.
        </Text>

        <Pressable style={styles.boutonSupprimerTournoi} onPress={confirmerSuppressionTournoi} disabled={enCours}>
          <Text style={styles.texteBoutonSupprimerTournoi}>Supprimer ce tournoi</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titre: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  badgeCode: { backgroundColor: '#f0f0f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  texteBadgeCode: { fontSize: 11, color: '#666', fontFamily: 'monospace' },
  soustitre: { fontSize: 13, color: '#888', marginBottom: 10 },
  lienModifierInfos: { fontSize: 12, color: '#4338ca', marginBottom: 18 },
  ligneDoublePause: { flexDirection: 'row', gap: 24, marginTop: 8 },
  carte: {
    backgroundColor: '#f7f7f8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  carteLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  carteAide: { fontSize: 12, color: '#aaa', marginBottom: 10 },
  ligneAjout: { flexDirection: 'row', gap: 8, marginBottom: 4, marginTop: 6 },
  ligneRoues: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  deuxPoints: { fontSize: 18, fontWeight: '600', color: '#333' },
  ligneChoix: { flexDirection: 'row', gap: 10, marginTop: 6 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  boutonAjout: {
    backgroundColor: '#111',
    borderRadius: 8,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteBoutonAjout: { color: '#fff', fontSize: 18, fontWeight: '500' },
  liste: { marginTop: 8 },
  ligneEquipe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  nomEquipe: { fontSize: 14 },
  supprimer: { fontSize: 12, color: '#c00' },
  vide: { fontSize: 13, color: '#999', paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBouton: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center',
  },
  stepperTexte: { fontSize: 18, fontWeight: '600' },
  stepperValeur: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  boutonSauvegarder: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  texteBoutonSauvegarder: { color: '#fff', fontSize: 16, fontWeight: '500' },
  boutonRegenerer: {
    borderWidth: 1,
    borderColor: '#f3c5c5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  texteBoutonRegenerer: { color: '#c00', fontSize: 15, fontWeight: '500' },
  avertissement: { fontSize: 11.5, color: '#aaa', textAlign: 'center', marginTop: 8 },
  boutonSupprimerTournoi: { alignItems: 'center', marginTop: 32 },
  texteBoutonSupprimerTournoi: { fontSize: 13, color: '#c00', textDecorationLine: 'underline' },
});
