import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { enregistrerTournoiSuivi, retirerTournoiSuivi } from '../../../lib/tournoisSuivis';
import { calculerClassement } from '../../../lib/classement';
import { grouperParPhase, grouperParTerrain } from '../../../lib/generation';
import { vibrerAttention } from '../../../lib/haptique';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';
import CarteSelectionnable from '../../../components/CarteSelectionnable';
import Squelette from '../../../components/Squelette';
import { useTheme } from '../../../lib/ThemeContext';
import { useLangue } from '../../../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_MEDIUM, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

const cleSelectionEquipe = (tournoiId) => `olympiad:equipe:${tournoiId}`;

// Écran de suivi unique pour équipes et spectateurs (lecture seule). Avant
// d'afficher les résultats, on demande à l'utilisateur son équipe (ou s'il
// fait partie du public) afin de personnaliser l'écran suivant : le choix
// est mémorisé sur l'appareil pour ce tournoi (voir cleSelectionEquipe).
export default function Suivi() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const locale = langue === 'en' ? 'en-US' : 'fr-FR';
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [tournoi, setTournoi] = useState(null);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [parTerrain, setParTerrain] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [onglet, setOnglet] = useState('apercu');
  // undefined = pas encore déterminé (affiche l'écran de sélection),
  // null = spectateur (public), string = id de l'équipe choisie.
  const [monEquipeId, setMonEquipeId] = useState(undefined);

  const charger = useCallback(async () => {
    const { data: t } = await supabase
      .from('tournois')
      .select('*')
      .ilike('code_acces', String(code).trim())
      .single();
    if (!t) {
      setIntrouvable(true);
      return;
    }
    setTournoi(t);
    enregistrerTournoiSuivi({ code: t.code_acces, nom: t.nom, dateDebut: t.date_debut, sport: t.sport });

    const { data: p } = await supabase.from('poules').select('*').eq('tournoi_id', t.id).order('nom');
    setPoules(p || []);

    const { data: eq } = await supabase.from('equipes').select('*').eq('tournoi_id', t.id);
    setEquipes(eq || []);

    const { data: m } = await supabase
      .from('matchs')
      .select('*')
      .eq('tournoi_id', t.id)
      .order('horaire');
    setMatchs(m || []);

    const { data: r } = await supabase
      .from('resultats')
      .select('*')
      .in('match_id', (m || []).map((match) => match.id));
    setResultats(r || []);

    if ((eq || []).length === 0) {
      setMonEquipeId(null);
    } else {
      const valeurSauvegardee = await AsyncStorage.getItem(cleSelectionEquipe(t.id));
      if (valeurSauvegardee === 'public') {
        setMonEquipeId(null);
      } else if (valeurSauvegardee && (eq || []).some((e) => e.id === valeurSauvegardee)) {
        setMonEquipeId(valeurSauvegardee);
      }
    }
  }, [code]);

  useEffect(() => {
    charger();

    const canal = supabase
      .channel('suivi-resultats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, charger)
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [charger]);

  async function onRefresh() {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  }

  function choisirEquipe(id) {
    setMonEquipeId(id);
    if (tournoi) AsyncStorage.setItem(cleSelectionEquipe(tournoi.id), id ?? 'public');
  }

  function changerEquipe() {
    if (tournoi) AsyncStorage.removeItem(cleSelectionEquipe(tournoi.id));
    setMonEquipeId(undefined);
  }

  function confirmerSuppressionTournoiSuivi() {
    Alert.alert(
      t('suivi.supprimerTournoiTitre'),
      t('suivi.supprimerTournoiMessage', { nom: tournoi.nom }),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('commun.supprimer'),
          style: 'destructive',
          onPress: async () => {
            vibrerAttention();
            await retirerTournoiSuivi(tournoi.code_acces);
            router.replace('/');
          },
        },
      ]
    );
  }

  if (introuvable) {
    return (
      <View style={styles.conteneurIntrouvable}>
        <Stack.Screen
          options={{ headerLeft: () => null, headerBackVisible: false, gestureEnabled: false }}
        />
        <Text style={styles.titreIntrouvable}>{t('suivi.tournoiIntrouvable')}</Text>
        <Text style={styles.texteIntrouvable}>{t('suivi.tournoiIntrouvableMessage')}</Text>
        <Pressable
          style={styles.boutonRetour}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/rejoindre'))}
        >
          <Text style={styles.texteBoutonRetour}>{t('suivi.reessayer')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!tournoi) {
    return (
      <View style={styles.container}>
        <Squelette width={180} height={22} style={{ marginBottom: 10 }} />
        <Squelette width={120} height={13} style={{ marginBottom: 24 }} />
        <Squelette height={70} radius={10} style={{ marginBottom: 14 }} />
        <Squelette height={140} radius={14} style={{ marginBottom: 14 }} />
        <Squelette height={100} radius={14} />
      </View>
    );
  }

  if (monEquipeId === undefined) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titre}>{tournoi.nom}</Text>
        <Text style={styles.date}>
          {new Date(`${tournoi.date_debut}T00:00:00`).toLocaleDateString(locale, {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
        <Text style={styles.section}>
          {t(tournoi.sport === 'tennis' ? 'suivi.quelJoueur' : 'suivi.quelleEquipe')}
        </Text>

        {poules.length > 0
          ? poules.map((poule) => {
              const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
              if (equipesPoule.length === 0) return null;
              return (
                <View key={poule.id} style={styles.sousGroupe}>
                  <Text style={styles.sousGroupeTitre}>{poule.nom}</Text>
                  {equipesPoule.map((equipe) => (
                    <CarteSelectionnable
                      key={equipe.id}
                      label={equipe.nom}
                      selectionnee={false}
                      onPress={() => choisirEquipe(equipe.id)}
                    />
                  ))}
                </View>
              );
            })
          : equipes.map((equipe) => (
              <CarteSelectionnable
                key={equipe.id}
                label={equipe.nom}
                selectionnee={false}
                onPress={() => choisirEquipe(equipe.id)}
              />
            ))}

        <Text style={styles.separateurTexte}>{t('suivi.ou')}</Text>

        <Pressable style={styles.boutonPublic} onPress={() => choisirEquipe(null)}>
          <Text style={styles.texteBoutonPublic}>{t('suivi.jeFaisPartieDuPublic')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const prochainMatch = monEquipeId
    ? matchs
        .filter((m) => m.equipe_a_id === monEquipeId || m.equipe_b_id === monEquipeId)
        .find((m) => {
          const r = resultats.find((res) => res.match_id === m.id);
          return !r || r.statut !== 'termine';
        })
    : null;

  // Les matchs "exempts" (bye) n'intéressent pas le public : on les exclut
  // des listes de résultats/à venir (ils ne se jouent jamais réellement).
  const matchsAvecResultat = matchs
    .filter((m) => m.equipe_b_id)
    .map((m) => ({ ...m, resultat: resultats.find((r) => r.match_id === m.id) }));

  const resultatsTermines = matchsAvecResultat
    .filter((m) => m.resultat?.statut === 'termine')
    .sort((a, b) => new Date(b.horaire) - new Date(a.horaire));

  const matchsAVenirListe = matchsAvecResultat
    .filter((m) => m.resultat?.statut !== 'termine')
    .sort((a, b) => new Date(a.horaire) - new Date(b.horaire));

  const grouper = parTerrain ? grouperParTerrain : grouperParPhase;
  const groupesResultats = grouper(resultatsTermines);
  const groupesAVenir = grouper(matchsAVenirListe);

  const dernierResultatEquipe = monEquipeId
    ? resultatsTermines.find((m) => m.equipe_a_id === monEquipeId || m.equipe_b_id === monEquipeId)
    : null;

  function nomEquipe(id) {
    return equipes.find((e) => e.id === id)?.nom ?? '—';
  }

  function classementPourPoule(poule) {
    const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
    const matchsPoule = matchs.filter((m) => m.phase === poule.nom);
    const classement = calculerClassement(
      equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule, tournoi.sport
    );
    return (
      <ClassementPoule
        key={poule.id}
        nom={t('suivi.classementPoule', { nom: poule.nom })}
        classement={classement}
        equipeMiseEnAvantId={monEquipeId}
        sport={tournoi.sport}
      />
    );
  }

  const contenuClassement = poules.length > 0
    ? poules.map(classementPourPoule)
    : equipes.length > 0 ? (
      <ClassementPoule
        nom={t('calendrier.classement')}
        classement={calculerClassement(equipes, matchs, resultats, tournoi.critere_departage_poule, tournoi.sport)}
        equipeMiseEnAvantId={monEquipeId}
        sport={tournoi.sport}
      />
    ) : (
      <Text style={styles.vide}>{t('suivi.aucunClassement')}</Text>
    );

  // Poule de l'équipe suivie, pour n'afficher dans l'aperçu que le
  // classement qui la concerne (au lieu de toutes les poules du tournoi).
  const equipeSuivie = monEquipeId ? equipes.find((e) => e.id === monEquipeId) : null;
  const pouleSuivie = equipeSuivie ? poules.find((p) => p.id === equipeSuivie.poule_id) : null;
  const contenuClassementApercu = pouleSuivie ? classementPourPoule(pouleSuivie) : contenuClassement;

  const mesResultats = monEquipeId
    ? resultatsTermines.filter((m) => m.equipe_a_id === monEquipeId || m.equipe_b_id === monEquipeId)
    : [];
  const mesMatchsAVenir = monEquipeId
    ? matchsAVenirListe.filter((m) => m.equipe_a_id === monEquipeId || m.equipe_b_id === monEquipeId)
    : [];

  // L'aperçu n'a de sens que pour une équipe suivie (bandeaux + classement
  // + matchs personnels) : un spectateur n'a pas d'onglet à lui, il n'y a
  // donc pas d'onglet Aperçu à lui proposer.
  const ongletsDisponibles = monEquipeId
    ? [
        { valeur: 'apercu', label: t('suivi.apercu') },
        { valeur: 'classement', label: t('calendrier.classement') },
        { valeur: 'calendrier', label: t('suivi.calendrierOnglet') },
      ]
    : [
        { valeur: 'classement', label: t('calendrier.classement') },
        { valeur: 'calendrier', label: t('suivi.calendrierOnglet') },
      ];
  const ongletAffiche = !monEquipeId && onglet === 'apercu' ? 'classement' : onglet;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={rafraichissement} onRefresh={onRefresh} tintColor={couleurs.accent} colors={[couleurs.accent]} />
      }
    >
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.date}>
        {new Date(`${tournoi.date_debut}T00:00:00`).toLocaleDateString(locale, {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>
      <Text style={styles.hintActualiser}>{t('suivi.tirerPourActualiser')}</Text>

      {equipes.length > 0 && (
        <Pressable onPress={changerEquipe}>
          <Text style={styles.lienChanger}>
            {monEquipeId
              ? t(tournoi.sport === 'tennis' ? 'suivi.monJoueur' : 'suivi.monEquipe', { nom: nomEquipe(monEquipeId) })
              : t('suivi.vueSpectateur')} · {t('suivi.changer')}
          </Text>
        </Pressable>
      )}

      <BasculeVue
        valeur={ongletAffiche}
        onChange={setOnglet}
        options={ongletsDisponibles}
      />

      {ongletAffiche === 'apercu' && (
        <>
          {dernierResultatEquipe && (
            <View style={styles.bandeau}>
              <Text style={styles.bandeauLabel}>
                {t(tournoi.sport === 'tennis' ? 'suivi.dernierResultatJoueur' : 'suivi.dernierResultat')}
              </Text>
              <View style={styles.ligneBandeau}>
                <Text style={styles.bandeauEquipes}>
                  {nomEquipe(dernierResultatEquipe.equipe_a_id)} · {nomEquipe(dernierResultatEquipe.equipe_b_id)}
                </Text>
                <Text style={styles.bandeauTexteScore}>
                  {dernierResultatEquipe.resultat.score_a} – {dernierResultatEquipe.resultat.score_b}
                </Text>
              </View>
            </View>
          )}

          {prochainMatch && (
            <View style={styles.bandeau}>
              <Text style={styles.bandeauLabel}>{t('suivi.prochainMatch')}</Text>
              <View style={styles.ligneBandeau}>
                <Text style={styles.bandeauEquipes}>
                  {nomEquipe(prochainMatch.equipe_a_id)} · {nomEquipe(prochainMatch.equipe_b_id)}
                </Text>
                <Text style={styles.bandeauTexte}>
                  {new Date(prochainMatch.horaire).toLocaleString(locale, {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          )}

          {contenuClassementApercu}

          {monEquipeId && (
            <View style={styles.carte}>
              <Text style={styles.section}>
                {t(tournoi.sport === 'tennis' ? 'suivi.resultatsMonJoueur' : 'suivi.resultatsMonEquipe')}
              </Text>
              {mesResultats.length === 0 && (
                <Text style={styles.vide}>{t('suivi.aucunResultat')}</Text>
              )}
              {mesResultats.map((match) => (
                <View key={match.id} style={styles.ligneResultat}>
                  <Text style={styles.equipesResultat}>
                    {nomEquipe(match.equipe_a_id)} · {nomEquipe(match.equipe_b_id)}
                  </Text>
                  <Text style={styles.scoreResultat}>
                    {match.resultat.score_a} – {match.resultat.score_b}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {monEquipeId && (
            <View style={styles.carte}>
              <Text style={styles.section}>
                {t(tournoi.sport === 'tennis' ? 'suivi.matchsAVenirMonJoueur' : 'suivi.matchsAVenirMonEquipe')}
              </Text>
              {mesMatchsAVenir.length === 0 && (
                <Text style={styles.vide}>{t('suivi.aucunMatchAVenir')}</Text>
              )}
              {mesMatchsAVenir.map((match) => (
                <View key={match.id} style={styles.ligneResultat}>
                  <Text style={styles.equipesResultat}>
                    {nomEquipe(match.equipe_a_id)} · {nomEquipe(match.equipe_b_id)}
                  </Text>
                  <Text style={styles.horaireAVenir}>
                    {new Date(match.horaire).toLocaleString(locale, {
                      weekday: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {ongletAffiche === 'classement' && contenuClassement}

      {ongletAffiche === 'calendrier' && (
        <>
          {tournoi.nombre_terrains > 1 && (
            <BasculeVue
              valeur={parTerrain ? 'terrain' : 'poule'}
              onChange={(v) => setParTerrain(v === 'terrain')}
              options={[
                { valeur: 'poule', label: t('calendrier.parPoule') },
                { valeur: 'terrain', label: t('calendrier.parTerrain') },
              ]}
            />
          )}

          <View style={styles.carte}>
            <Text style={styles.section}>{t('suivi.tousLesResultats')}</Text>
            {resultatsTermines.length === 0 && (
              <Text style={styles.vide}>{t('suivi.aucunResultat')}</Text>
            )}
            {groupesResultats.map(({ nom, matchs: matchsDuGroupe }) => (
              <View key={nom} style={styles.sousGroupe}>
                <Text style={styles.sousGroupeTitre}>{nom}</Text>
                {matchsDuGroupe.map((match) => (
                  <View key={match.id} style={styles.ligneResultat}>
                    <Text style={styles.equipesResultat}>
                      {nomEquipe(match.equipe_a_id)} · {nomEquipe(match.equipe_b_id)}
                    </Text>
                    <Text style={styles.scoreResultat}>
                      {match.resultat.score_a} – {match.resultat.score_b}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {matchsAVenirListe.length > 0 && (
            <View style={styles.carte}>
              <Text style={styles.section}>{t('suivi.matchsAVenir')}</Text>
              {groupesAVenir.map(({ nom, matchs: matchsDuGroupe }) => (
                <View key={nom} style={styles.sousGroupe}>
                  <Text style={styles.sousGroupeTitre}>{nom}</Text>
                  {matchsDuGroupe.map((match) => (
                    <View key={match.id} style={styles.ligneResultat}>
                      <Text style={styles.equipesResultat}>
                        {nomEquipe(match.equipe_a_id)} · {nomEquipe(match.equipe_b_id)}
                      </Text>
                      <Text style={styles.horaireAVenir}>
                        {new Date(match.horaire).toLocaleString(locale, {
                          weekday: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Pressable style={styles.boutonSupprimerTournoi} onPress={confirmerSuppressionTournoiSuivi}>
        <Text style={styles.texteBoutonSupprimerTournoi}>{t('suivi.supprimerCeTournoi')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 24, paddingBottom: 60, backgroundColor: c.fond },
    conteneurIntrouvable: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fond },
    titreIntrouvable: { fontFamily: POLICE_TITRE, fontSize: 22, letterSpacing: 0.3, color: c.texte, textAlign: 'center' },
    texteIntrouvable: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, textAlign: 'center', marginTop: 8, marginBottom: 24 },
    boutonRetour: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 28,
      alignItems: 'center',
    },
    texteBoutonRetour: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 16, letterSpacing: 0.3 },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte },
    date: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    hintActualiser: { fontFamily: POLICE_TEXTE, fontSize: 11.5, color: c.texteAttenue, marginTop: 4, marginBottom: 18 },
    lienChanger: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12.5, color: c.accent, marginBottom: 18 },
    separateurTexte: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, textAlign: 'center', marginVertical: 16 },
    boutonPublic: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    texteBoutonPublic: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    bandeau: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    bandeauLabel: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.accent, marginBottom: 6 },
    ligneBandeau: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bandeauEquipes: { flex: 1, flexShrink: 1, marginRight: 8, fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texte },
    bandeauTexte: { flexShrink: 0, textAlign: 'right', fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texte },
    bandeauTexteScore: { flexShrink: 0, textAlign: 'right', fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texte },
    carte: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
    },
    section: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.3, color: c.texteAttenue, marginBottom: 10 },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue },
    sousGroupe: { marginBottom: 10 },
    sousGroupeTitre: { fontFamily: POLICE_TITRE, fontSize: 12.5, letterSpacing: 0.3, color: c.accent, marginBottom: 2 },
    ligneResultat: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 7,
    },
    equipesResultat: { flex: 1, flexShrink: 1, marginRight: 8, fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte },
    scoreResultat: { flexShrink: 0, textAlign: 'right', fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13.5, color: c.texte },
    horaireAVenir: {
      flexShrink: 0, width: 78, textAlign: 'right', fontFamily: POLICE_TEXTE, fontSize: 12.5,
      color: c.texteAttenue, fontVariant: ['tabular-nums'],
    },
    boutonSupprimerTournoi: { alignItems: 'center', marginTop: 32 },
    texteBoutonSupprimerTournoi: {
      fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.danger, textDecorationLine: 'underline',
    },
  });
}
