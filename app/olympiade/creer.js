import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { genererCodeAcces } from '../../lib/codeAcces';
import { messageErreur } from '../../lib/erreurs';
import { useAchats } from '../../lib/achats';
import { BAREME_PAR_DEFAUT } from '../../lib/olympiade';
import { useTheme } from '../../lib/ThemeContext';
import { useLangue } from '../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../lib/theme';
import CarteSelectionnable from '../../components/CarteSelectionnable';
import SelecteurDate from '../../components/SelecteurDate';

const normaliser = (n) => n.trim().replace(/\s+/g, ' ').toLowerCase();

// Création (ou modification, avec ?id=) d'une olympiade multisports :
// nom, dates, équipes communes à toutes les épreuves et barème de points
// par place pour le classement général. Réservée aux comptes Pro.
export default function CreerOlympiade() {
  const { id } = useLocalSearchParams();
  const modification = Boolean(id);
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const { estPro, synchroniserPro } = useAchats();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState('');
  const [plusieursJours, setPlusieursJours] = useState(false);
  const [dateFin, setDateFin] = useState('');
  // Équipes : { id?, nom } — id seulement pour une équipe déjà enregistrée.
  const [equipes, setEquipes] = useState([]);
  const [nomEquipe, setNomEquipe] = useState('');
  const [bareme, setBareme] = useState(BAREME_PAR_DEFAUT);
  const [enCours, setEnCours] = useState(false);
  const [charge, setCharge] = useState(!modification);

  useEffect(() => {
    if (!modification) return;
    (async () => {
      const [{ data: o }, { data: eq }] = await Promise.all([
        supabase.from('olympiades').select('*').eq('id', id).single(),
        supabase.from('olympiade_equipes').select('*').eq('olympiade_id', id).order('created_at'),
      ]);
      if (o) {
        setNom(o.nom);
        setDate(o.date_debut);
        setPlusieursJours(Boolean(o.date_fin));
        setDateFin(o.date_fin || '');
        setBareme(o.bareme?.length ? o.bareme : BAREME_PAR_DEFAUT);
      }
      setEquipes(eq || []);
      setCharge(true);
    })();
  }, [id, modification]);

  async function ajouterEquipe() {
    const n = nomEquipe.trim();
    if (!n) return;
    if (equipes.some((e) => normaliser(e.nom) === normaliser(n))) {
      Alert.alert(t('equipes.nomEnDoubleTitre'), t('equipes.nomEnDoubleMessage', { nom: n }));
      return;
    }
    if (modification) {
      const { data, error } = await supabase.from('olympiade_equipes').insert({ olympiade_id: id, nom: n }).select().single();
      if (error) {
        Alert.alert(t('commun.erreur'), messageErreur(error, t));
        return;
      }
      setEquipes((liste) => [...liste, data]);
    } else {
      setEquipes((liste) => [...liste, { nom: n }]);
    }
    setNomEquipe('');
  }

  function retirerEquipe(equipe) {
    if (!equipe.id) {
      setEquipes((liste) => liste.filter((e) => e !== equipe));
      return;
    }
    // Équipe enregistrée : elle disparaît aussi de toutes les épreuves.
    Alert.alert(t('olympiade.retirerEquipeTitre', { nom: equipe.nom }), t('olympiade.retirerEquipeMessage'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('equipes.retirer'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('olympiade_equipes').delete().eq('id', equipe.id);
          if (error) {
            Alert.alert(t('commun.erreur'), messageErreur(error, t));
            return;
          }
          setEquipes((liste) => liste.filter((e) => e.id !== equipe.id));
        },
      },
    ]);
  }

  function changerPoints(index, pas) {
    setBareme((b) => b.map((v, i) => (i === index ? Math.max(0, v + pas) : v)));
  }

  function valider() {
    if (!nom.trim() || !date) {
      Alert.alert(t('creerTournoi.champsManquantsTitre'), t('creerTournoi.champsManquantsMessage'));
      return false;
    }
    if (plusieursJours && !(dateFin && dateFin > date)) {
      Alert.alert(t('equipes.dateFinInvalideTitre'), t('equipes.dateFinInvalideMessage'));
      return false;
    }
    return true;
  }

  async function enregistrer() {
    Keyboard.dismiss();
    if (!valider()) return;
    const champs = { nom: nom.trim(), date_debut: date, date_fin: plusieursJours ? dateFin : null, bareme };
    setEnCours(true);
    try {
      if (modification) {
        const { error } = await supabase.from('olympiades').update(champs).eq('id', id);
        if (error) throw error;
        router.back();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/connexion');
        return;
      }
      // La base n'accepte la création que pour un abonnement Pro qu'elle
      // connaît : en cas de refus, on resynchronise l'abonnement une fois.
      let olympiade = null;
      let erreur = null;
      for (let essai = 0; essai < 5; essai++) {
        ({ data: olympiade, error: erreur } = await supabase
          .from('olympiades')
          .insert({ ...champs, code_acces: genererCodeAcces(), organisateur_id: session.user.id })
          .select()
          .single());
        if (!erreur) break;
        if (erreur.code === '23505') continue; // code déjà pris
        if (erreur.code === '42501' && essai === 0 && estPro) {
          await synchroniserPro().catch(() => {});
          continue;
        }
        break;
      }
      if (erreur?.code === '42501') {
        router.push({ pathname: '/paywall', params: { raison: 'olympiade' } });
        return;
      }
      if (erreur) throw erreur;

      if (equipes.length) {
        const { error } = await supabase
          .from('olympiade_equipes')
          .insert(equipes.map((e) => ({ olympiade_id: olympiade.id, nom: e.nom })));
        if (error) throw error;
      }
      router.replace(`/olympiade/${olympiade.id}`);
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  function confirmerSuppression() {
    Alert.alert(t('olympiade.supprimerTitre'), t('olympiade.supprimerMessage'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('mettre_olympiade_a_la_corbeille', { p_olympiade_id: id });
          if (error) {
            Alert.alert(t('commun.erreur'), messageErreur(error, t));
            return;
          }
          router.replace('/');
        },
      },
    ]);
  }

  if (!charge) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.surtitre}>{t('olympiade.multisports')}</Text>
        <Text style={styles.titre}>{modification ? t('olympiade.modifierTitre') : t('olympiade.creerTitre')}</Text>
        {!modification && <Text style={styles.aide}>{t('olympiade.creerAide')}</Text>}

        <Text style={styles.label}>{t('olympiade.nom')}</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholder={t('olympiade.placeholderNom')}
          placeholderTextColor={couleurs.texteAttenue}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t('creerTournoi.date')}</Text>
        <SelecteurDate value={date} onChange={setDate} placeholder={t('creerTournoi.choisirLaDate')} />
        <Text style={styles.label}>{t('equipes.plusieursJours')}</Text>
        <View style={styles.ligneChoix}>
          <View style={{ flex: 1 }}>
            <CarteSelectionnable label={t('commun.non')} selectionnee={!plusieursJours} onPress={() => setPlusieursJours(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <CarteSelectionnable label={t('commun.oui')} selectionnee={plusieursJours} onPress={() => setPlusieursJours(true)} />
          </View>
        </View>
        {plusieursJours && (
          <>
            <Text style={styles.label}>{t('equipes.dateDeFin')}</Text>
            <SelecteurDate value={dateFin} onChange={setDateFin} placeholder={t('creerTournoi.choisirLaDate')} />
          </>
        )}

        <Text style={styles.label}>{t('olympiade.equipesCommunes', { n: equipes.length })}</Text>
        <Text style={styles.aide}>{t('olympiade.equipesCommunesAide')}</Text>
        <View style={styles.ligneAjout}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={nomEquipe}
            onChangeText={setNomEquipe}
            placeholder={t('equipes.placeholderNomEquipe')}
            placeholderTextColor={couleurs.texteAttenue}
            onSubmitEditing={ajouterEquipe}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Pressable style={styles.boutonAjout} onPress={ajouterEquipe}>
            <Text style={styles.texteBoutonAjout}>+</Text>
          </Pressable>
        </View>
        {equipes.map((e) => (
          <View key={e.id || e.nom} style={styles.ligneEquipe}>
            <Text style={styles.nomEquipe} numberOfLines={1}>{e.nom}</Text>
            <Pressable onPress={() => retirerEquipe(e)} hitSlop={8}>
              <Text style={styles.retirer}>{t('equipes.retirer')}</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.label}>{t('olympiade.bareme')}</Text>
        <Text style={styles.aide}>{t('olympiade.baremeAide')}</Text>
        {bareme.map((points, index) => (
          <View key={index} style={styles.ligneBareme}>
            <Text style={styles.place}>{t('olympiade.place', { n: index + 1 })}</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperBouton} onPress={() => changerPoints(index, -1)}>
                <Text style={styles.stepperTexte}>−</Text>
              </Pressable>
              <Text style={styles.stepperValeur}>{points}</Text>
              <Pressable style={styles.stepperBouton} onPress={() => changerPoints(index, 1)}>
                <Text style={styles.stepperTexte}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={styles.ligneLiens}>
          <Pressable onPress={() => setBareme((b) => [...b, 0])} hitSlop={6}>
            <Text style={styles.lien}>{t('olympiade.ajouterPlace')}</Text>
          </Pressable>
          {bareme.length > 1 && (
            <Pressable onPress={() => setBareme((b) => b.slice(0, -1))} hitSlop={6}>
              <Text style={styles.lien}>{t('olympiade.retirerPlace')}</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.bouton} onPress={enregistrer} disabled={enCours}>
          <Text style={styles.texteBouton}>
            {enCours ? t('equipes.sauvegardeEnCours') : modification ? t('equipes.sauvegarder') : t('olympiade.creer')}
          </Text>
        </Pressable>

        {modification && (
          <Pressable style={styles.boutonSupprimer} onPress={confirmerSuppression}>
            <Text style={styles.texteSupprimer}>{t('olympiade.supprimer')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 60, backgroundColor: c.fond },
    surtitre: { fontFamily: POLICE_TITRE, fontSize: 14, letterSpacing: 0.6, color: c.accent, marginBottom: 4 },
    titre: { fontFamily: POLICE_TITRE, fontSize: 26, letterSpacing: 0.3, color: c.texte },
    aide: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginTop: 4, marginBottom: 4 },
    label: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginTop: 18, marginBottom: 6,
    },
    input: {
      borderWidth: 1, borderColor: c.bordure, backgroundColor: c.surface2, borderRadius: 10,
      padding: 13, fontSize: 14.5, fontFamily: POLICE_TEXTE, color: c.texte,
    },
    ligneChoix: { flexDirection: 'row', gap: 10 },
    ligneAjout: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 6 },
    boutonAjout: { width: 48, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    texteBoutonAjout: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 24 },
    ligneEquipe: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      paddingVertical: 10, borderBottomWidth: 1, borderColor: c.bordure,
    },
    nomEquipe: { fontFamily: POLICE_TEXTE, fontSize: 14.5, color: c.texte, flexShrink: 1 },
    retirer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.danger },
    ligneBareme: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    place: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBouton: {
      width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: c.bordure,
      backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center',
    },
    stepperTexte: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 18, color: c.texte },
    stepperValeur: { fontFamily: POLICE_TITRE, fontSize: 20, color: c.texte, minWidth: 28, textAlign: 'center' },
    ligneLiens: { flexDirection: 'row', gap: 18, marginTop: 8 },
    lien: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
    bouton: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.4 },
    boutonSupprimer: { alignItems: 'center', marginTop: 18, paddingVertical: 10 },
    texteSupprimer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.danger },
  });
}
