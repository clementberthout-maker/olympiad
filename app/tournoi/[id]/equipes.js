import {
  View, Text, TextInput, StyleSheet, Pressable, FlatList, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { genererCodeAcces } from '../../../lib/codeAcces';
import { messageErreur } from '../../../lib/erreurs';
import {
  repartirEnPoules,
  genererCalendrierPoules,
  genererPremierTourEliminationDirecte,
  resultatsAutoPourExempts,
} from '../../../lib/generation';
import CarteSelectionnable from '../../../components/CarteSelectionnable';
import RouePicker from '../../../components/RouePicker';
import SelecteurDate from '../../../components/SelecteurDate';
import IndicateurEtapes from '../../../components/IndicateurEtapes';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { useAchats, tournoiEstDebloque } from '../../../lib/achats';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

// Limite d'équipes/joueurs par tournoi en version gratuite — voir
// lib/achats.js (Pass Tournoi / Pro) pour le déblocage.
const LIMITE_EQUIPES_GRATUIT = 12;

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

function Stepper({ valeur, onChange, min = 0, pas = 1, styles }) {
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
  const {
    id, modifier,
    sport: sportParam, nom: nomParam, date: dateParam, format: formatParam,
    departagePoule: departagePouleParam, departageElimination: departageEliminationParam,
    tennisDouble: tennisDoubleParam,
  } = useLocalSearchParams(); // id du tournoi ("nouveau" tant qu'il n'est pas encore créé)
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const { estPro, passDraftDebloque, setPassDraftDebloque } = useAchats();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const vientDuCalendrier = modifier === '1';
  // Le tournoi n'existe pas encore en base : "id" n'est alors qu'un
  // marqueur ("nouveau") posé par creer-tournoi.js, le temps de terminer
  // les réglages ci-dessous. Rien n'est créé tant que "Créer le tournoi"
  // n'a pas été validé (voir creerTournoiEtEquipes).
  const estBrouillon = id === 'nouveau';
  const [tournoi, setTournoi] = useState(null);
  // Débloqué (équipes illimitées) si Pro, si ce tournoi a un Pass Tournoi
  // en base, ou — en brouillon, avant que le tournoi existe en base — si
  // un Pass Tournoi vient d'être acheté pendant la saisie (voir
  // creerTournoiEtEquipes, qui l'applique à la création).
  const debloque = estBrouillon ? (estPro || passDraftDebloque) : tournoiEstDebloque(tournoi, estPro);
  const [equipes, setEquipes] = useState([]);
  const [nomEquipe, setNomEquipe] = useState('');

  const [modifierInfos, setModifierInfos] = useState(false);
  const [nomEdit, setNomEdit] = useState(estBrouillon ? (nomParam || '') : '');
  const [dateEdit, setDateEdit] = useState(estBrouillon ? (dateParam || '') : '');

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
  const [matchTroisiemePlace, setMatchTroisiemePlace] = useState(false);
  const [pointsBonus, setPointsBonus] = useState(false);
  const [setsGagnants, setSetsGagnants] = useState(2);
  const [calendrierGenere, setCalendrierGenere] = useState(false);
  const [reglagesHorairesActifs, setReglagesHorairesActifs] = useState(false);

  const [enCours, setEnCours] = useState(false);

  // Format choisi à l'étape précédente (brouillon) ou déjà enregistré en
  // base (tournoi existant) : détermine quelles cartes de réglages afficher.
  const formatTournoi = estBrouillon ? (formatParam || 'mixte') : tournoi?.format;
  // Sport choisi à l'étape précédente ou déjà enregistré en base — fixé à
  // la création, non modifiable ici (comme le format).
  const sportTournoi = estBrouillon ? (sportParam || 'football') : (tournoi?.sport || 'football');
  // Simple ou double (tennis) : choisi à la création (voir creer-tournoi.js),
  // non modifiable ici, comme le sport et le format.
  const tennisDoubleActif = estBrouillon ? tennisDoubleParam === '1' : Boolean(tournoi?.tennis_double);

  // Tant que le tournoi n'a pas été créé, la liste d'équipes ne vit qu'en
  // mémoire : un retour arrière (geste, bouton système ou bouton "Retour")
  // l'effacerait sans prévenir. On intercepte donc la sortie de l'écran
  // pour demander confirmation — sauf juste après une création réussie
  // (voir ignorerConfirmationRef dans creerTournoiEtEquipes ci-dessous).
  const navigation = useNavigation();
  const equipesRef = useRef(equipes);
  equipesRef.current = equipes;
  const ignorerConfirmationRef = useRef(false);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!estBrouillon || ignorerConfirmationRef.current || equipesRef.current.length === 0) return;
      e.preventDefault();
      Alert.alert(
        t('equipes.quitterSansEnregistrerTitre'),
        t(
          sportTournoi === 'tennis'
            ? 'equipes.quitterSansEnregistrerMessageJoueur'
            : 'equipes.quitterSansEnregistrerMessage',
          { n: equipesRef.current.length }
        ),
        [
          { text: t('equipes.continuerLaSaisie'), style: 'cancel' },
          {
            text: t('equipes.quitter'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
  }, [navigation, estBrouillon, sportTournoi, t]);

  const charger = useCallback(async () => {
    if (estBrouillon) return;
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
      if (typeof t.match_troisieme_place === 'boolean') setMatchTroisiemePlace(t.match_troisieme_place);
      if (typeof t.points_bonus === 'boolean') setPointsBonus(t.points_bonus);
      if (t.sets_gagnants) setSetsGagnants(t.sets_gagnants);
    }
    const { data: eq } = await supabase
      .from('equipes')
      .select('*')
      .eq('tournoi_id', id)
      .order('created_at');
    setEquipes(eq || []);

    const { count } = await supabase
      .from('matchs')
      .select('id', { count: 'exact', head: true })
      .eq('tournoi_id', id);
    setCalendrierGenere(Boolean(count));
  }, [id, estBrouillon]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  async function ajouterEquipe() {
    if (!nomEquipe.trim()) return;
    if (equipes.length >= LIMITE_EQUIPES_GRATUIT && !debloque) {
      router.push({
        pathname: '/paywall',
        params: { ...(estBrouillon ? {} : { tournoiId: id }), raison: 'equipes' },
      });
      return;
    }
    if (estBrouillon) {
      setEquipes((liste) => [
        ...liste,
        { id: `brouillon-${Date.now()}-${Math.random().toString(36).slice(2)}`, nom: nomEquipe.trim() },
      ]);
      setNomEquipe('');
      Keyboard.dismiss();
      return;
    }
    const { error } = await supabase.from('equipes').insert({ tournoi_id: id, nom: nomEquipe.trim() });
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    setNomEquipe('');
    Keyboard.dismiss();
    charger();
  }

  async function supprimerEquipe(equipeId) {
    if (estBrouillon) {
      setEquipes((liste) => liste.filter((e) => e.id !== equipeId));
      return;
    }
    const { error } = await supabase.from('equipes').delete().eq('id', equipeId);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    charger();
  }

  function confirmerSuppressionEquipe(equipe) {
    if (!calendrierGenere) {
      supprimerEquipe(equipe.id);
      return;
    }
    Alert.alert(
      t(sportTournoi === 'tennis' ? 'equipes.retirerJoueurTitre' : 'equipes.retirerEquipeTitre'),
      t('equipes.retirerEquipeMessage', { nom: equipe.nom }),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        { text: t('equipes.retirer'), style: 'destructive', onPress: () => supprimerEquipe(equipe.id) },
      ]
    );
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
      match_troisieme_place: matchTroisiemePlace,
      points_bonus: pointsBonus,
      sets_gagnants: setsGagnants,
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
    if (estBrouillon) {
      await creerTournoiEtEquipes();
      return;
    }
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
        await genererLesMatchs(id, formatTournoi, equipes);
      }

      allerAuCalendrier();
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  // Crée réellement le tournoi (et ses équipes) en base, une fois tous les
  // réglages remplis — rien n'a été écrit avant cet instant.
  async function creerTournoiEtEquipes() {
    if (!nomEdit || !dateEdit) {
      Alert.alert(t('equipes.champsManquantsTitre'), t('equipes.champsManquantsMessage'));
      return;
    }
    if (equipes.length === 0) {
      Alert.alert(
        t(sportTournoi === 'tennis' ? 'equipes.aucunJoueurTitre' : 'equipes.aucuneEquipeTitre'),
        t(sportTournoi === 'tennis' ? 'equipes.aucunJoueurMessage' : 'equipes.aucuneEquipeMessage')
      );
      return;
    }

    setEnCours(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        ignorerConfirmationRef.current = true;
        router.replace('/inscription');
        return;
      }

      let tournoiCree, erreurCreation;
      for (let tentative = 0; tentative < 5; tentative++) {
        ({ data: tournoiCree, error: erreurCreation } = await supabase
          .from('tournois')
          .insert({
            ...reglagesActuels(),
            format: formatTournoi,
            sport: sportTournoi,
            tennis_double: tennisDoubleActif,
            critere_departage_poule: departagePouleParam || 'diff_buts',
            mode_departage: departageEliminationParam || 'prolongations_tab',
            code_acces: genererCodeAcces(),
            organisateur_id: session.user.id,
            debloque: passDraftDebloque,
          })
          .select()
          .single());

        if (!erreurCreation) break;
        if (erreurCreation.code === '23505') continue; // code déjà pris : on retente avec un nouveau
        break;
      }
      if (erreurCreation) throw erreurCreation;

      const nouvelId = tournoiCree.id;

      const { data: equipesInserees, error: erreurEquipes } = await supabase
        .from('equipes')
        .insert(equipes.map((e) => ({ tournoi_id: nouvelId, nom: e.nom })))
        .select();
      if (erreurEquipes) throw erreurEquipes;

      if ((equipesInserees || []).length >= 2) {
        await genererLesMatchs(nouvelId, formatTournoi, equipesInserees);
      }

      ignorerConfirmationRef.current = true;
      setPassDraftDebloque(false);
      router.replace(`/tournoi/${nouvelId}/calendrier?cree=1`);
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  function confirmerRegeneration() {
    if (equipes.length < 2) {
      Alert.alert(
        t(sportTournoi === 'tennis' ? 'equipes.pasAssezJoueursTitre' : 'equipes.pasAssezEquipesTitre'),
        t(sportTournoi === 'tennis' ? 'equipes.pasAssezJoueursMessage' : 'equipes.pasAssezEquipesMessage')
      );
      return;
    }
    Alert.alert(
      t('equipes.regenererTitre'),
      t('equipes.regenererMessage'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        { text: t('equipes.regenerer'), style: 'destructive', onPress: regenererCalendrier },
      ]
    );
  }

  // Génère les poules (le cas échéant) et le calendrier des matchs à partir
  // des réglages actuels, pour un tournoi et une liste d'équipes donnés
  // (passés explicitement : au moment de la création, le tournoi vient
  // tout juste d'être inséré et n'est pas encore dans l'état "tournoi").
  // Suppose qu'il n'y a rien à supprimer au préalable (voir
  // creerTournoiEtEquipes / sauvegarderReglages / regenererCalendrier).
  async function genererLesMatchs(tournoiId, formatDuTournoi, equipesPourGeneration) {
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

    if (formatDuTournoi === 'elimination_directe') {
      const matchs = genererPremierTourEliminationDirecte(equipesPourGeneration, tournoiId, reglages);
      const { data: matchsInseres, error } = await supabase.from('matchs').insert(matchs).select();
      if (error) throw error;
      const resultatsExempts = resultatsAutoPourExempts(matchsInseres);
      if (resultatsExempts.length) {
        const { error: erreurExempts } = await supabase.from('resultats').insert(resultatsExempts);
        if (erreurExempts) throw erreurExempts;
      }
    } else {
      const groupes = repartirEnPoules(equipesPourGeneration, nombrePoules);
      const poulesAvecEquipes = [];
      for (let i = 0; i < groupes.length; i++) {
        const nomPoule = `Poule ${String.fromCharCode(65 + i)}`;
        const { data: poule, error: erreurPoule } = await supabase
          .from('poules')
          .insert({ tournoi_id: tournoiId, nom: nomPoule })
          .select()
          .single();
        if (erreurPoule) throw erreurPoule;

        await supabase
          .from('equipes')
          .update({ poule_id: poule.id })
          .in('id', groupes[i].map((e) => e.id));

        poulesAvecEquipes.push({ id: poule.id, nom: nomPoule, equipes: groupes[i] });
      }

      const matchs = genererCalendrierPoules(poulesAvecEquipes, tournoiId, reglages);
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
      await genererLesMatchs(id, formatTournoi, equipes);
      allerAuCalendrier();
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  function confirmerSuppressionTournoi() {
    Alert.alert(
      t('equipes.supprimerTournoiTitre'),
      t(sportTournoi === 'tennis' ? 'equipes.supprimerTournoiMessageJoueur' : 'equipes.supprimerTournoiMessage'),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        { text: t('commun.supprimer'), style: 'destructive', onPress: supprimerTournoi },
      ]
    );
  }

  async function supprimerTournoi() {
    setEnCours(true);
    const { error } = await supabase.from('tournois').delete().eq('id', id);
    setEnCours(false);
    if (error) {
      Alert.alert(t('commun.erreur'), messageErreur(error, t));
      return;
    }
    router.replace('/');
  }

  if (!estBrouillon && !tournoi) return null;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {estBrouillon && (
          <IndicateurEtapes
            etape={3}
            total={3}
            label={t('commun.etape', {
              n: 3,
              total: 3,
              label: t(sportTournoi === 'tennis' ? 'equipes.etapeLabelJoueur' : 'equipes.etapeLabel'),
            })}
          />
        )}
        <View style={styles.entete}>
          <Text style={styles.titre}>{nomEdit}</Text>
          {!estBrouillon && (
            <Pressable
              style={styles.badgeQrCode}
              onPress={() => router.push(`/tournoi/${id}/qrcode`)}
              hitSlop={8}
            >
              <Ionicons name="qr-code-outline" size={28} color={couleurs.texte} />
            </Pressable>
          )}
        </View>
        <Text style={styles.soustitre}>
          {t(`sports.${sportTournoi}.label`)}
          {sportTournoi === 'tennis' && tennisDoubleActif ? ` · ${t('creerTournoi.double')}` : ''} · {new Date(`${dateEdit}T00:00:00`).toLocaleDateString(langue === 'en' ? 'en-US' : 'fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        <Pressable onPress={() => setModifierInfos(!modifierInfos)} hitSlop={8}>
          <Text style={styles.lienModifierInfos}>
            {modifierInfos ? t('equipes.fermer') : t('equipes.modifierNomEtDate')}
          </Text>
        </Pressable>

        {modifierInfos && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.nomDuTournoi')}</Text>
            <TextInput style={styles.input} value={nomEdit} onChangeText={setNomEdit} returnKeyType="done" />
            <Text style={[styles.carteLabel, { marginTop: 14 }]}>{t('equipes.date')}</Text>
            <SelecteurDate value={dateEdit} onChange={setDateEdit} />
          </View>
        )}

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>
            {t(sportTournoi === 'tennis' ? 'equipes.joueursCompteur' : 'equipes.equipesCompteur', { n: equipes.length })}
          </Text>
          <View style={styles.ligneAjout}>
            <TextInput
              style={styles.input}
              placeholder={t(sportTournoi === 'tennis' ? 'equipes.placeholderNomJoueur' : 'equipes.placeholderNomEquipe')}
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
                <Pressable onPress={() => confirmerSuppressionEquipe(item)} hitSlop={8} style={styles.boutonSupprimer}>
                  <Text style={styles.supprimer}>{t('equipes.retirer')}</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={(
              <Text style={styles.vide}>
                {t(sportTournoi === 'tennis' ? 'equipes.aucunJoueurAjoute' : 'equipes.aucuneEquipeAjoutee')}
              </Text>
            )}
          />
        </View>

        <View style={styles.carte}>
          <Text style={styles.carteLabel}>{t('equipes.terrainsDisponibles')}</Text>
          <Text style={styles.carteAide}>{t('equipes.terrainsAide')}</Text>
          <Stepper valeur={nombreTerrains} onChange={setNombreTerrains} min={1} styles={styles} />
        </View>

        {formatTournoi !== 'elimination_directe' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.nombreDePoules')}</Text>
            <Stepper valeur={nombrePoules} onChange={setNombrePoules} min={1} styles={styles} />
          </View>
        )}

        {formatTournoi === 'mixte' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.qualifiesParPoule')}</Text>
            <Text style={styles.carteAide}>
              {t(sportTournoi === 'tennis' ? 'equipes.qualifiesParPouleAideJoueur' : 'equipes.qualifiesParPouleAide')}
            </Text>
            <Stepper valeur={nombreQualifies} onChange={setNombreQualifies} min={1} styles={styles} />
          </View>
        )}

        {formatTournoi !== 'poules' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.matchTroisiemePlace')}</Text>
            <Text style={styles.carteAide}>
              {t(sportTournoi === 'tennis' ? 'equipes.matchTroisiemePlaceAideJoueur' : 'equipes.matchTroisiemePlaceAide')}
            </Text>
            <View style={styles.ligneChoix}>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.oui')}
                  selectionnee={matchTroisiemePlace}
                  onPress={() => setMatchTroisiemePlace(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.non')}
                  selectionnee={!matchTroisiemePlace}
                  onPress={() => setMatchTroisiemePlace(false)}
                />
              </View>
            </View>
          </View>
        )}

        {sportTournoi === 'rugby' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.pointsBonus')}</Text>
            <Text style={styles.carteAide}>{t('equipes.pointsBonusAide')}</Text>
            <View style={styles.ligneChoix}>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.oui')}
                  selectionnee={pointsBonus}
                  onPress={() => setPointsBonus(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.non')}
                  selectionnee={!pointsBonus}
                  onPress={() => setPointsBonus(false)}
                />
              </View>
            </View>
          </View>
        )}

        {sportTournoi === 'tennis' && (
          <View style={styles.carte}>
            <Text style={styles.carteLabel}>{t('equipes.setsGagnants')}</Text>
            <Text style={styles.carteAide}>{t('equipes.setsGagnantsAide')}</Text>
            <View style={styles.ligneChoix}>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('equipes.unSetGagnant')}
                  selectionnee={setsGagnants === 1}
                  onPress={() => setSetsGagnants(1)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('equipes.deuxSetsGagnants')}
                  selectionnee={setsGagnants === 2}
                  onPress={() => setSetsGagnants(2)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('equipes.troisSetsGagnants')}
                  selectionnee={setsGagnants === 3}
                  onPress={() => setSetsGagnants(3)}
                />
              </View>
            </View>
          </View>
        )}

        {sportTournoi !== 'tennis' && (
          <>
            <View style={styles.enteteAvance}>
              <Text style={styles.labelAvance}>{t('equipes.reglagesAvancesHoraires')}</Text>
            </View>
            <Text style={styles.aideAvance}>{t('equipes.aideAvanceHoraires')}</Text>
            <View style={styles.ligneChoix}>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.oui')}
                  selectionnee={reglagesHorairesActifs}
                  onPress={() => setReglagesHorairesActifs(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CarteSelectionnable
                  label={t('commun.non')}
                  selectionnee={!reglagesHorairesActifs}
                  onPress={() => setReglagesHorairesActifs(false)}
                />
              </View>
            </View>

            <View
              style={!reglagesHorairesActifs && styles.champsDesactives}
              pointerEvents={reglagesHorairesActifs ? 'auto' : 'none'}
            >
              <View style={styles.carte}>
                <Text style={styles.carteLabel}>{t('equipes.heurePremierMatch')}</Text>
                <View style={styles.ligneRoues}>
                  <RouePicker valeurs={HEURES} valeur={heureH} onChange={setHeureH} formatValeur={(v) => pad(v)} />
                  <Text style={styles.deuxPoints}>:</Text>
                  <RouePicker valeurs={MINUTES} valeur={heureM} onChange={setHeureM} formatValeur={(v) => pad(v)} />
                </View>
              </View>

              <View style={styles.carte}>
                <Text style={styles.carteLabel}>{t('equipes.dureeMatch')}</Text>
                <RouePicker valeurs={DUREES_MATCH} valeur={dureeMatch} onChange={setDureeMatch} />
              </View>

              <View style={styles.carte}>
                <Text style={styles.carteLabel}>{t('equipes.miTemps')}</Text>
                <View style={styles.ligneChoix}>
                  <View style={{ flex: 1 }}>
                    <CarteSelectionnable label={t('commun.oui')} selectionnee={miTemps} onPress={() => setMiTemps(true)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CarteSelectionnable label={t('commun.non')} selectionnee={!miTemps} onPress={() => setMiTemps(false)} />
                  </View>
                </View>
                {miTemps && (
                  <>
                    <Text style={[styles.carteLabel, { marginTop: 10 }]}>{t('equipes.dureeMiTemps')}</Text>
                    <RouePicker valeurs={DUREES_MI_TEMPS} valeur={dureeMiTemps} onChange={setDureeMiTemps} />
                  </>
                )}
              </View>

              <View style={styles.carte}>
                <Text style={styles.carteLabel}>{t('equipes.pauseEntreMatchs')}</Text>
                <RouePicker valeurs={DUREES_PAUSE} valeur={tempsPause} onChange={setTempsPause} />
              </View>

              <View style={styles.carte}>
                <Text style={styles.carteLabel}>{t('equipes.pauseDejeuner')}</Text>
                <View style={styles.ligneChoix}>
                  <View style={{ flex: 1 }}>
                    <CarteSelectionnable label={t('commun.oui')} selectionnee={pauseDejeuner} onPress={() => setPauseDejeuner(true)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CarteSelectionnable label={t('commun.non')} selectionnee={!pauseDejeuner} onPress={() => setPauseDejeuner(false)} />
                  </View>
                </View>
                {pauseDejeuner && (
                  <View style={styles.ligneDoublePause}>
                    <View>
                      <Text style={styles.sousLabel}>{t('equipes.de')}</Text>
                      <View style={styles.ligneRoues}>
                        <RouePicker valeurs={HEURES} valeur={pauseDebutH} onChange={setPauseDebutH} formatValeur={(v) => pad(v)} />
                        <Text style={styles.deuxPoints}>:</Text>
                        <RouePicker valeurs={MINUTES} valeur={pauseDebutM} onChange={setPauseDebutM} formatValeur={(v) => pad(v)} />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.sousLabel}>{t('equipes.a')}</Text>
                      <View style={styles.ligneRoues}>
                        <RouePicker valeurs={HEURES} valeur={pauseFinH} onChange={setPauseFinH} formatValeur={(v) => pad(v)} />
                        <Text style={styles.deuxPoints}>:</Text>
                        <RouePicker valeurs={MINUTES} valeur={pauseFinM} onChange={setPauseFinM} formatValeur={(v) => pad(v)} />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <Pressable style={styles.boutonSauvegarder} onPress={sauvegarderReglages} disabled={enCours}>
          <Text style={styles.texteBoutonSauvegarder}>
            {estBrouillon
              ? (enCours ? t('equipes.creationEnCours') : t('equipes.creerLeTournoi'))
              : (enCours ? t('equipes.sauvegardeEnCours') : t('equipes.sauvegarder'))}
          </Text>
        </Pressable>

        {!estBrouillon && (
          <>
            <Pressable style={styles.boutonRegenerer} onPress={confirmerRegeneration} disabled={enCours}>
              <Text style={styles.texteBoutonRegenerer}>{t('equipes.regenererLeCalendrier')}</Text>
            </Pressable>
            <Text style={styles.avertissement}>{t('equipes.avertissementRegenerer')}</Text>

            <Pressable style={styles.boutonSupprimerTournoi} onPress={confirmerSuppressionTournoi} disabled={enCours}>
              <Text style={styles.texteBoutonSupprimerTournoi}>{t('equipes.supprimerCeTournoi')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 24, paddingBottom: 60, backgroundColor: c.fond },
    entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte, flexShrink: 1 },
    badgeQrCode: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 10,
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    soustitre: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginBottom: 10 },
    lienModifierInfos: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, color: c.lien, marginBottom: 18 },
    ligneDoublePause: { flexDirection: 'row', gap: 24, marginTop: 8 },
    enteteAvance: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 4,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderColor: c.bordure,
    },
    labelAvance: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    aideAvance: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginBottom: 14 },
    champsDesactives: { opacity: 0.4 },
    carte: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
    },
    carteLabel: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
      color: c.texteAttenue, marginBottom: 4,
    },
    carteAide: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginBottom: 10 },
    ligneAjout: { flexDirection: 'row', gap: 8, marginBottom: 4, marginTop: 6 },
    ligneRoues: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    deuxPoints: { fontSize: 18, fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.texte },
    ligneChoix: { flexDirection: 'row', gap: 10, marginTop: 6 },
    input: {
      flex: 1,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      fontFamily: POLICE_TEXTE,
      color: c.texte,
    },
    boutonAjout: {
      backgroundColor: c.accent,
      borderRadius: 8,
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texteBoutonAjout: { color: c.accentEncre, fontSize: 18, fontFamily: POLICE_TEXTE_SEMIBOLD },
    liste: { marginTop: 8 },
    ligneEquipe: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface2,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 6,
      gap: 10,
    },
    nomEquipe: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texte, flex: 1, flexShrink: 1 },
    boutonSupprimer: { flexShrink: 0 },
    supprimer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12, color: c.danger },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, paddingVertical: 8 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    stepperBouton: {
      width: 36, height: 36, borderRadius: 8, backgroundColor: c.surface2,
      borderWidth: 1, borderColor: c.bordure, alignItems: 'center', justifyContent: 'center',
    },
    stepperTexte: { fontSize: 18, fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.texte },
    stepperValeur: { fontSize: 16, fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.texte, minWidth: 24, textAlign: 'center' },
    boutonSauvegarder: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    texteBoutonSauvegarder: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.4 },
    boutonRegenerer: {
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    texteBoutonRegenerer: { color: c.danger, fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14.5 },
    avertissement: { fontFamily: POLICE_TEXTE, fontSize: 11.5, color: c.texteAttenue, textAlign: 'center', marginTop: 8 },
    boutonSupprimerTournoi: { alignItems: 'center', marginTop: 32 },
    texteBoutonSupprimerTournoi: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.danger, textDecorationLine: 'underline',
    },
  });
}
