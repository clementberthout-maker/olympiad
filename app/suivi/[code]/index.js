import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { calculerClassement } from '../../../lib/classement';
import { grouperParPhase, grouperParTerrain } from '../../../lib/generation';
import ClassementPoule from '../../../components/ClassementPoule';
import BasculeVue from '../../../components/BasculeVue';
import { useTheme } from '../../../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_MEDIUM, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

// Écran de suivi unique pour équipes et spectateurs (lecture seule).
export default function Suivi() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [tournoi, setTournoi] = useState(null);
  const [poules, setPoules] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [parTerrain, setParTerrain] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);
  const monEquipeId = null; // à remplacer une fois l'auth équipe définie

  useEffect(() => {
    async function charger() {
      const { data: t } = await supabase
        .from('tournois')
        .select('*')
        .eq('code_acces', code)
        .single();
      if (!t) {
        setIntrouvable(true);
        return;
      }
      setTournoi(t);

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
    }
    charger();

    const canal = supabase
      .channel('suivi-resultats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultats' }, charger)
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [code]);

  if (introuvable) {
    return (
      <View style={styles.conteneurIntrouvable}>
        <Text style={styles.titreIntrouvable}>Tournoi introuvable</Text>
        <Text style={styles.texteIntrouvable}>
          Ce code d'accès ne correspond à aucun tournoi. Vérifie le code ou le QR code utilisé.
        </Text>
        <Pressable style={styles.boutonRetour} onPress={() => router.replace('/rejoindre')}>
          <Text style={styles.texteBoutonRetour}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!tournoi) {
    return (
      <View style={styles.container}>
        <Text style={styles.chargement}>Chargement…</Text>
      </View>
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

  function nomEquipe(id) {
    return equipes.find((e) => e.id === id)?.nom ?? '—';
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.date}>
        {new Date(`${tournoi.date_debut}T00:00:00`).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>

      {prochainMatch && (
        <View style={styles.bandeau}>
          <Text style={styles.bandeauLabel}>Votre prochain match</Text>
          <View style={styles.ligneBandeau}>
            <Text style={styles.bandeauTexte}>
              {nomEquipe(prochainMatch.equipe_a_id)} · {nomEquipe(prochainMatch.equipe_b_id)}
            </Text>
            <Text style={styles.bandeauTexte}>
              {new Date(prochainMatch.horaire).toLocaleString('fr-FR', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      )}

      {poules.length > 0
        ? poules.map((poule) => {
            const equipesPoule = equipes.filter((e) => e.poule_id === poule.id);
            const matchsPoule = matchs.filter((m) => m.phase === poule.nom);
            const classement = calculerClassement(
              equipesPoule, matchsPoule, resultats, tournoi.critere_departage_poule
            );
            return <ClassementPoule key={poule.id} nom={`Classement · ${poule.nom}`} classement={classement} />;
          })
        : equipes.length > 0 && (
            <ClassementPoule
              nom="Classement"
              classement={calculerClassement(equipes, matchs, resultats, tournoi.critere_departage_poule)}
            />
          )}

      {tournoi.nombre_terrains > 1 && (
        <BasculeVue
          valeur={parTerrain ? 'terrain' : 'poule'}
          onChange={(v) => setParTerrain(v === 'terrain')}
          options={[
            { valeur: 'poule', label: 'Par poule' },
            { valeur: 'terrain', label: 'Par terrain' },
          ]}
        />
      )}

      <View style={styles.carte}>
        <Text style={styles.section}>Tous les résultats</Text>
        {resultatsTermines.length === 0 && (
          <Text style={styles.vide}>Aucun résultat pour l'instant.</Text>
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
          <Text style={styles.section}>Matchs à venir</Text>
          {groupesAVenir.map(({ nom, matchs: matchsDuGroupe }) => (
            <View key={nom} style={styles.sousGroupe}>
              <Text style={styles.sousGroupeTitre}>{nom}</Text>
              {matchsDuGroupe.map((match) => (
                <View key={match.id} style={styles.ligneResultat}>
                  <Text style={styles.equipesResultat}>
                    {nomEquipe(match.equipe_a_id)} · {nomEquipe(match.equipe_b_id)}
                  </Text>
                  <Text style={styles.horaireAVenir}>
                    {new Date(match.horaire).toLocaleString('fr-FR', {
                      weekday: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
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
    chargement: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texteAttenue },
    titre: { fontFamily: POLICE_TITRE, fontSize: 24, letterSpacing: 0.3, color: c.texte },
    date: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginBottom: 18 },
    bandeau: {
      backgroundColor: c.surface,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    bandeauLabel: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.accent, marginBottom: 6 },
    ligneBandeau: { flexDirection: 'row', justifyContent: 'space-between' },
    bandeauTexte: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texte },
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
      paddingVertical: 7,
    },
    equipesResultat: { fontFamily: POLICE_TEXTE, fontSize: 13.5, color: c.texte },
    scoreResultat: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13.5, color: c.texte },
    horaireAVenir: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue },
  });
}
