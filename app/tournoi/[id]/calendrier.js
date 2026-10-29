import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo, useRef } from 'react';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import {
  estPhaseDePoule,
  genererPhaseFinaleDepuisPoules,
  genererTourSuivant,
  qualifiesParTeteDeSerie,
  genererFinaleEtTroisiemePlace,
  NOM_MATCH_TROISIEME_PLACE,
  resultatsAutoPourExempts,
  idEquipeGagnante,
  matchEliminationDecide,
  grouperParTerrain,
  reglagesDepuisTournoi,
} from '../../../lib/generation';
import { formaterPeriode } from '../../../lib/dates';
import { genererHtmlProgramme } from '../../../lib/exportProgramme';
import { messageErreur } from '../../../lib/erreurs';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';
import BoutonRetour from '../../../components/BoutonRetour';
import BadgeEnDirect from '../../../components/BadgeEnDirect';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { libellePhase } from '../../../lib/phases';
import { useAchats, tournoiEstDebloque, tournoiEnLectureSeule, finDuPass } from '../../../lib/achats';
import { retirerTournoiSuivi } from '../../../lib/tournoisSuivis';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

// Petit cadenas en bout de ligne d'une option payante du menu « Partager ».
function Cadenas({ couleur }) {
  return <Ionicons name="lock-closed" size={16} color={couleur} style={{ marginLeft: 'auto' }} />;
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
  const { estPro } = useAchats();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  // Le menu « Partager » est une Modal : elle s'affiche par-dessus tout,
  // y compris sous la barre système Android, d'où cette marge.
  const insets = useSafeAreaInsets();
  const margeBasPartage = { paddingBottom: 32 + (Platform.OS === 'android' ? insets.bottom : 0) };
  const [tournoi, setTournoi] = useState(null);
  // Grand écran, export PDF et co-organisateurs : réservés à un tournoi
  // débloqué (Pass Tournoi valable ou compte Pro).
  const premiumVerrouille = !!tournoi && !tournoiEstDebloque(tournoi, estPro);
  // Pass Tournoi expiré : tournoi archivé, consultable mais plus modifiable
  // (voir lib/achats.js, tournoiEnLectureSeule).
  const lectureSeule = !!tournoi && tournoiEnLectureSeule(tournoi, estPro);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchsBruts, setMatchsBruts] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [phases, setPhases] = useState([]); // [{ nom, matchs: [...] }]
  const [enCours, setEnCours] = useState(false);
  const [parTerrain, setParTerrain] = useState(false);
  const [partageVisible, setPartageVisible] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const idsMatchs = useRef(new Set()); // matchs de ce tournoi, pour filtrer le temps réel

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
    idsMatchs.current = new Set((matchs || []).map((m) => m.id));
  }, [id]);

  // Temps réel tant que l'écran est affiché : un score saisi par un
  // co-organisateur (téléphone ou site) apparaît sans quitter l'écran.
  // Les résultats n'ont pas de tournoi_id : on ignore ceux des autres
  // tournois, et on regroupe les rafales (phase finale = plusieurs matchs).
  useFocusEffect(
    useCallback(() => {
      charger();
      let minuteur = null;
      const rechargerBientot = () => {
        clearTimeout(minuteur);
        minuteur = setTimeout(charger, 300);
      };
      const canal = supabase
        .channel(`calendrier-${id}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, (e) => {
          const matchId = e.new?.match_id || e.old?.match_id;
          if (!matchId || idsMatchs.current.has(matchId)) rechargerBientot();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matchs', filter: `tournoi_id=eq.${id}` }, rechargerBientot)
        .subscribe();
      return () => {
        clearTimeout(minuteur);
        supabase.removeChannel(canal);
      };
    }, [charger, id])
  );

  function ouvrirVueGrandEcran() {
    setPartageVisible(false);
    if (!tournoiEstDebloque(tournoi, estPro)) {
      router.push({ pathname: '/paywall', params: { tournoiId: id, raison: 'grand_ecran' } });
      return;
    }
    router.push(`/tournoi/${id}/affichage`);
  }

  function ouvrirCoOrganisateurs() {
    setPartageVisible(false);
    if (!tournoiEstDebloque(tournoi, estPro)) {
      router.push({ pathname: '/paywall', params: { tournoiId: id, raison: 'co_organisateurs' } });
      return;
    }
    router.push(`/tournoi/${id}/co-organisateurs`);
  }

  // Génère un PDF du programme (matchs + classements) et ouvre le
  // sélecteur de partage natif pour l'envoyer, l'enregistrer ou l'imprimer —
  // voir lib/exportProgramme.js pour la mise en page.
  async function exporterPdf() {
    if (!tournoiEstDebloque(tournoi, estPro)) {
      setPartageVisible(false);
      router.push({ pathname: '/paywall', params: { tournoiId: id, raison: 'export' } });
      return;
    }
    setExportEnCours(true);
    try {
      const dateFormatee = formaterPeriode(tournoi.date_debut, tournoi.date_fin, langue === 'en' ? 'en-US' : 'fr-FR');
      const html = genererHtmlProgramme({
        tournoi,
        poules,
        equipes,
        matchs: phases.flatMap(({ matchs }) => matchs),
        resultats,
        dateFormatee,
        locale: langue === 'en' ? 'en-US' : 'fr-FR',
        t,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: tournoi.nom });
      }
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setExportEnCours(false);
      setPartageVisible(false);
    }
  }

  // Après la création : retour à l'accueil, ou à l'olympiade pour une épreuve.
  function retourApresCreation() {
    router.replace(tournoi?.olympiade_id ? `/olympiade/${tournoi.olympiade_id}` : '/');
  }

  // Tournoi archivé : la suppression (corbeille) reste possible depuis le
  // bandeau, l'écran « Modifier mon tournoi » n'étant plus proposé.
  function confirmerSuppressionTournoi() {
    Alert.alert(t('equipes.supprimerTournoiTitre'), t(tournoi?.sport === 'tennis' ? 'equipes.supprimerTournoiMessageJoueur' : 'equipes.supprimerTournoiMessage'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('mettre_tournoi_a_la_corbeille', { p_tournoi_id: id });
          if (error) {
            Alert.alert(t('commun.erreur'), messageErreur(error, t));
            return;
          }
          if (tournoi?.code_acces) await retirerTournoiSuivi(tournoi.code_acces);
          retourApresCreation();
        },
      },
    ]);
  }

  async function insererMatchs(matchs) {
    const { data: matchsInseres, error } = await supabase.from('matchs').insert(matchs).select();
    if (error) throw error;
    const resultatsExempts = resultatsAutoPourExempts(matchsInseres);
    if (resultatsExempts.length) {
      const { error: erreurExempts } = await supabase.from('resultats').insert(resultatsExempts);
      if (erreurExempts) throw erreurExempts;
    }
  }

  // Classement de chaque poule (vide pour un tournoi 100% élimination).
  function poulesAvecClassement() {
    return poules.map((poule) => {
      const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
      const matchsPoule = matchsBruts.filter((m) => m.phase === poule.nom);
      return { classement: calculerClassement(equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule, tournoi.sport) };
    });
  }

  // Équipes à égalité parfaite (points, différence, marqués) de part et
  // d'autre de la dernière place qualificative d'une poule : rien ne les
  // départage, le classement retient alors l'ordre d'inscription.
  function egalitesALaQualification() {
    const n = tournoi.nombre_qualifies_par_poule;
    return poulesAvecClassement().flatMap(({ classement }) => {
      const dernier = classement[n - 1];
      const premierElimine = classement[n];
      if (!dernier || !premierElimine) return [];
      const egaux = dernier.points === premierElimine.points
        && dernier.diff_buts === premierElimine.diff_buts
        && dernier.buts_pour === premierElimine.buts_pour;
      return egaux ? [`${dernier.equipe.nom} / ${premierElimine.equipe.nom}`] : [];
    });
  }

  function genererPhaseFinale() {
    if (equipesQualifiees < 2) {
      Alert.alert(
        t('calendrier.pasAssezQualifiesTitre'),
        t(tournoi.sport === 'tennis' ? 'calendrier.pasAssezQualifiesMessageJoueur' : 'calendrier.pasAssezQualifiesMessage')
      );
      return;
    }
    const egalites = egalitesALaQualification();
    if (egalites.length) {
      Alert.alert(
        t('calendrier.egaliteParfaiteTitre'),
        t('calendrier.egaliteParfaiteMessage', { equipes: egalites.join('\n') }),
        [
          { text: t('commun.annuler'), style: 'cancel' },
          { text: t('calendrier.egaliteParfaiteContinuer'), onPress: lancerPhaseFinale },
        ]
      );
      return;
    }
    lancerPhaseFinale();
  }

  async function lancerPhaseFinale() {
    setEnCours(true);
    try {
      const reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      const matchs = genererPhaseFinaleDepuisPoules(
        poulesAvecClassement(), tournoi.nombre_qualifies_par_poule, id, reglages
      );
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  async function genererProchainTour() {
    setEnCours(true);
    try {
      const reglages = reglagesDepuisTournoi(tournoi, matchsBruts);
      const tetesDeSerie = qualifiesParTeteDeSerie(poulesAvecClassement(), tournoi.nombre_qualifies_par_poule);
      // Avec 2 terrains ou plus, la 3e place et la finale se jouent en même temps.
      const matchs = peutGenererTroisiemePlace
        ? genererFinaleEtTroisiemePlace(dernierePhaseElim.matchs, id, reglages, tetesDeSerie)
        : genererTourSuivant(dernierePhaseElim.matchs, id, reglages, tetesDeSerie);
      await insererMatchs(matchs);
      charger();
    } catch (e) {
      Alert.alert(t('commun.erreur'), messageErreur(e, t));
    } finally {
      setEnCours(false);
    }
  }

  if (!tournoi) {
    return vientDEtreCree ? (
      <Stack.Screen options={{ headerLeft: () => <BoutonRetour canGoBack onPress={retourApresCreation} /> }} />
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
    ? dernierePhaseElim.matchs.every(matchEliminationDecide)
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
    ? phaseTroisiemePlace.matchs.every(matchEliminationDecide)
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
          options={{ headerLeft: () => <BoutonRetour canGoBack onPress={retourApresCreation} /> }}
        />
      )}
      <ScrollView contentContainerStyle={styles.container}>
      {tournoi.olympiade_id && (
        <Pressable onPress={() => router.push(`/olympiade/${tournoi.olympiade_id}`)} hitSlop={8} style={styles.lienOlympiade}>
          <Ionicons name="trophy-outline" size={14} color={couleurs.lien} />
          <Text style={styles.texteLienOlympiade}>{t('olympiade.voirClassementGeneral')}</Text>
        </Pressable>
      )}
      <View style={styles.entete}>
        <Text style={styles.titre}>{tournoi.nom}</Text>
        <Pressable style={styles.boutonPartager} onPress={() => setPartageVisible(true)} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={couleurs.texte} />
        </Pressable>
      </View>
      {lectureSeule && (
        <View style={styles.bandeauArchive}>
          <View style={styles.ligneArchive}>
            <Ionicons name="lock-closed" size={18} color={couleurs.accent} />
            <Text style={styles.titreArchive}>{t('calendrier.archiveTitre')}</Text>
          </View>
          <Text style={styles.texteArchive}>
            {t('calendrier.archiveMessage', {
              fin: formaterPeriode(finDuPass(tournoi.date_fin || tournoi.date_debut), null, langue === 'en' ? 'en-US' : 'fr-FR'),
            })}
          </Text>
          <Pressable
            style={styles.boutonGenerer}
            onPress={() => router.push({ pathname: '/creer-tournoi', params: { sport: tournoi.sport, copieDe: id } })}
          >
            <Text style={styles.texteBoutonGenerer}>{t('calendrier.dupliquer')}</Text>
          </Pressable>
          <Pressable onPress={confirmerSuppressionTournoi} hitSlop={8} style={{ alignItems: 'center' }}>
            <Text style={styles.lienSupprimer}>{t('equipes.supprimerCeTournoi')}</Text>
          </Pressable>
        </View>
      )}
      {phases.length > 0 && !lectureSeule && (
        <View style={styles.bandeauAide}>
          <Ionicons name="hand-left-outline" size={18} color={couleurs.accent} />
          <Text style={styles.texteBandeauAide}>{t('calendrier.toucheUnMatch')}</Text>
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
          <Text style={styles.nomPhase}>{libellePhase(nom, t)}</Text>
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
            const enDirect = match.resultat?.statut === 'en_cours';
            return (
              <Pressable
                key={match.id}
                style={styles.ligneMatch}
                disabled={lectureSeule}
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
                    {parTerrain ? ` · ${libellePhase(match.phase, t)}` : match.terrain ? ` · ${t('saisie.terrain', { n: match.terrain })}` : ''}
                  </Text>
                </View>
                {termine ? (
                  <Text style={styles.score}>
                    {match.resultat.score_a} – {match.resultat.score_b}
                    {!estPhaseDePoule(match.phase) && match.resultat.score_a === match.resultat.score_b
                      ? ` ${t('calendrier.scoreTab', { a: match.resultat.score_tab_a, b: match.resultat.score_tab_b })}`
                      : ''}
                  </Text>
                ) : enDirect ? (
                  <View style={styles.scoreDirect}>
                    <BadgeEnDirect />
                    <Text style={styles.score}>{match.resultat.score_a} – {match.resultat.score_b}</Text>
                  </View>
                ) : (
                  <Text style={styles.aVenir}>{t('calendrier.aVenir')}</Text>
                )}
                {/* Le chevron montre que la ligne s'ouvre (saisie du score). */}
                <Ionicons name="chevron-forward" size={16} color={couleurs.texteAttenue} style={styles.chevronMatch} />
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

      {peutGenererPhaseFinale && !lectureSeule && (
        <Pressable style={styles.boutonGenerer} onPress={genererPhaseFinale} disabled={enCours}>
          <Text style={styles.texteBoutonGenerer}>
            {enCours ? t('calendrier.generationEnCours') : t('calendrier.genererLaPhaseFinale')}
          </Text>
        </Pressable>
      )}

      {peutGenererTourSuivant && !lectureSeule && (
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
            return <ClassementPoule key={poule.id} nom={libellePhase(poule.nom, t)} classement={classement} sport={tournoi.sport} />;
          })}
        </>
      )}

      {!lectureSeule && (
        <Pressable
          style={styles.boutonModifier}
          onPress={() => router.push(`/tournoi/${id}/equipes?modifier=1`)}
          hitSlop={8}
        >
          <Text style={styles.lienModifier}>{t('calendrier.modifierMonTournoi')}</Text>
        </Pressable>
      )}
      </ScrollView>

      <Modal visible={partageVisible} transparent animationType="fade" onRequestClose={() => setPartageVisible(false)}>
        <Pressable style={styles.fondModal} onPress={() => setPartageVisible(false)}>
          <Pressable style={[styles.cartePartage, margeBasPartage]} onPress={() => {}}>
            <Text style={styles.titrePartage}>{t('calendrier.partagerLeProgramme')}</Text>
            <Pressable style={styles.optionPartage} onPress={ouvrirVueGrandEcran}>
              <Ionicons name="tv-outline" size={20} color={couleurs.accent} />
              <Text style={styles.texteOptionPartage}>{t('calendrier.vueGrandEcran')}</Text>
              {premiumVerrouille && <Cadenas couleur={couleurs.texteAttenue} />}
            </Pressable>
            <Pressable style={styles.optionPartage} onPress={exporterPdf} disabled={exportEnCours}>
              <Ionicons name="document-text-outline" size={20} color={couleurs.accent} />
              <Text style={styles.texteOptionPartage}>
                {exportEnCours ? t('calendrier.exportEnCours') : t('calendrier.exporterPdf')}
              </Text>
              {premiumVerrouille && <Cadenas couleur={couleurs.texteAttenue} />}
            </Pressable>
            <Pressable style={styles.optionPartage} onPress={ouvrirCoOrganisateurs}>
              <Ionicons name="people-outline" size={20} color={couleurs.accent} />
              <Text style={styles.texteOptionPartage}>{t('calendrier.inviterCoOrganisateur')}</Text>
              {premiumVerrouille && <Cadenas couleur={couleurs.texteAttenue} />}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 24, paddingBottom: 60, backgroundColor: c.fond },
    entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lienOlympiade: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    texteLienOlympiade: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte, flexShrink: 1 },
    boutonPartager: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fondModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    cartePartage: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: c.bordure,
      padding: 20,
      paddingBottom: 32,
    },
    titrePartage: {
      fontFamily: POLICE_TITRE, fontSize: 17, letterSpacing: 0.3, color: c.texte, marginBottom: 14,
    },
    optionPartage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderColor: c.bordure,
    },
    texteOptionPartage: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte },
    boutonModifier: { alignItems: 'center', marginTop: 28 },
    bandeauArchive: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure,
      borderRadius: 12, padding: 14, marginBottom: 20, gap: 10,
    },
    ligneArchive: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titreArchive: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.2, color: c.texte },
    texteArchive: { fontFamily: POLICE_TEXTE, fontSize: 13, lineHeight: 19, color: c.texteAttenue },
    lienSupprimer: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.danger },
    lienModifier: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
    bandeauAide: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.accent + '14', borderWidth: 1, borderColor: c.accent + '55',
      borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 20,
    },
    texteBandeauAide: { flex: 1, fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texte },
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
    infoMatch: { flex: 1, flexShrink: 1, marginRight: 8 },
    chevronMatch: { marginLeft: 8 },
    equipes: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    horaire: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
    score: { fontFamily: POLICE_TITRE, fontSize: 17, color: c.texte },
    aVenir: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue },
    scoreDirect: { alignItems: 'flex-end', gap: 2 },
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
