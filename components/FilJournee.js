import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { libellePhase } from '../lib/phases';
import { estPhaseDePoule, idEquipeGagnante, NOM_MATCH_TROISIEME_PLACE } from '../lib/generation';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD, POLICE_TEXTE_BOLD } from '../lib/theme';
import BadgeEnDirect from './BadgeEnDirect';

// Pastille courte de la phase : lettre de la poule, ou tour de la phase finale
function etiquettePhase(nom) {
  const p = String(nom || '').match(/^Poule ([A-Z]+)$/);
  if (p) return p[1];
  return { Finale: 'F', 'Demi-finale': '½', 'Quart de finale': '¼', 'Huitième de finale': '⅛', [NOM_MATCH_TROISIEME_PLACE]: '3' }[nom] || 'T';
}

const pad = (n) => String(n).padStart(2, '0');
const heure = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const jourLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Matchs d'un tournoi en « fil de la journée » (comme l'espace web,
// docs/espace/espace.js) : une seule liste par créneau horaire, le premier
// créneau pas encore joué mis en avant, filtres par poule, phase finale ou
// terrain. Utilisé par le calendrier (organisateur) et le suivi public.
// matchs : avec `resultat` ; nomEquipe(id) ; onPressMatch absent = lecture seule.
export default function FilJournee({ matchs, nomEquipe, onPressMatch, dureeMatch = 0, aujourdhui = false }) {
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [filtre, setFiltre] = useState('tous');

  const jouables = matchs.filter((m) => m.equipe_b_id && m.horaire);
  const phasesPoule = [...new Set(jouables.filter((m) => estPhaseDePoule(m.phase)).map((m) => m.phase))].sort();
  const aDesFinales = jouables.some((m) => !estPhaseDePoule(m.phase));
  const terrains = [...new Set(jouables.filter((m) => m.terrain).map((m) => String(m.terrain)))]
    .sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  const filtres = [['tous', t('fil.tous')]];
  if (phasesPoule.length > 1) phasesPoule.forEach((p) => filtres.push([`phase:${p}`, libellePhase(p, t)]));
  if (aDesFinales && phasesPoule.length) filtres.push(['finale', t('fil.phaseFinale')]);
  if (terrains.length > 1) terrains.forEach((n) => filtres.push([`terrain:${n}`, t('saisie.terrain', { n })]));
  const filtreActif = filtres.some(([v]) => v === filtre) ? filtre : 'tous';
  const garde = (m) => filtreActif === 'tous'
    || (filtreActif === 'finale' && !estPhaseDePoule(m.phase))
    || (filtreActif.startsWith('phase:') && m.phase === filtreActif.slice(6))
    || (filtreActif.startsWith('terrain:') && String(m.terrain) === filtreActif.slice(8));

  const joues = jouables.filter((m) => m.resultat?.statut === 'termine').length;
  const dernier = jouables.reduce((x, m) => (!x || new Date(m.horaire) > new Date(x.horaire) ? m : x), null);
  const finEstimee = dernier ? new Date(new Date(dernier.horaire).getTime() + dureeMatch * 60000) : null;

  const creneaux = [];
  jouables.filter(garde)
    .sort((x, y) => new Date(x.horaire) - new Date(y.horaire) || String(x.terrain).localeCompare(String(y.terrain), undefined, { numeric: true }))
    .forEach((m) => {
      const cle = new Date(m.horaire).getTime();
      const der = creneaux[creneaux.length - 1];
      if (der && der.cle === cle) der.matchs.push(m); else creneaux.push({ cle, date: new Date(m.horaire), matchs: [m] });
    });
  const indexCourant = creneaux.findIndex((cr) => cr.matchs.some((m) => m.resultat?.statut !== 'termine'));
  const plusieursJours = new Set(creneaux.map((cr) => jourLocal(cr.date))).size > 1;
  const locale = langue === 'en' ? 'en-US' : 'fr-FR';
  const exempts = matchs.filter((m) => !m.equipe_b_id && garde(m));

  let jourPrec = '';
  let finalePrec = false;

  return (
    <View>
      <View style={styles.progression}>
        <View style={styles.jauge}>
          <View style={[styles.jaugePleine, { width: `${jouables.length ? Math.round((joues / jouables.length) * 100) : 0}%` }]} />
        </View>
        <Text style={styles.texteProgression}>
          {t('fil.matchsJoues', { n: joues, total: jouables.length })}
          {finEstimee && joues < jouables.length ? ` · ${t('fil.finEstimee', { heure: heure(finEstimee) })}` : ''}
        </Text>
      </View>

      {filtres.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtres}>
          {filtres.map(([v, l]) => (
            <Pressable key={v} onPress={() => setFiltre(v)} style={[styles.filtre, v === filtreActif && styles.filtreActif]}>
              <Text style={[styles.texteFiltre, v === filtreActif && styles.texteFiltreActif]}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {creneaux.length === 0 && <Text style={styles.vide}>{t('fil.aucunMatch')}</Text>}

      {creneaux.map((cr, i) => {
        const passe = cr.matchs.every((m) => m.resultat?.statut === 'termine');
        const courant = i === indexCourant;
        const finale = cr.matchs.every((m) => !estPhaseDePoule(m.phase));
        const jour = jourLocal(cr.date);
        const titreJour = plusieursJours && jour !== jourPrec
          ? cr.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
          : null;
        const separation = finale && !finalePrec && phasesPoule.length > 0 && filtreActif === 'tous';
        jourPrec = jour;
        finalePrec = finale;
        const etiquette = passe ? t('fil.termine')
          : courant ? (cr.matchs.some((m) => m.resultat?.statut === 'en_cours') ? t('fil.enCours') : aujourdhui ? t('fil.maintenant') : t('fil.aSuivre'))
            : '';
        return (
          <View key={cr.cle}>
            {titreJour && <Text style={styles.jour}>{titreJour}</Text>}
            {separation && (
              <View style={styles.separation}>
                <Text style={styles.texteSeparation}>{t('fil.phaseFinale')}</Text>
                <View style={styles.trait} />
              </View>
            )}
            <View style={[styles.creneau, courant && styles.creneauCourant]}>
              <View style={styles.ligneHeure}>
                <Text style={[styles.heure, passe && styles.attenue, courant && styles.lien]}>{heure(cr.date)}</Text>
                {!!etiquette && <Text style={[styles.etiquette, courant && styles.lien]}>{etiquette}</Text>}
              </View>
              {cr.matchs.map((m) => (
                <LigneMatch key={m.id} m={m} passe={passe} styles={styles} nomEquipe={nomEquipe} t={t} onPress={onPressMatch} couleurs={couleurs} />
              ))}
            </View>
          </View>
        );
      })}

      {exempts.length > 0 && (
        <Text style={styles.exempts}>
          {t('fil.exempts')} : {exempts.map((m) => `${nomEquipe(m.equipe_a_id)} (${libellePhase(m.phase, t)})`).join(', ')}
        </Text>
      )}
    </View>
  );
}

function LigneMatch({ m, passe, styles, nomEquipe, t, onPress, couleurs }) {
  const r = m.resultat;
  const fini = r?.statut === 'termine';
  const enJeu = r?.statut === 'en_cours';
  const g = fini ? idEquipeGagnante(m) : null;
  const tab = fini && r.score_a === r.score_b && r.score_tab_a != null && !estPhaseDePoule(m.phase);
  return (
    <Pressable
      style={[styles.match, passe && styles.matchPasse, enJeu && styles.matchEnJeu]}
      disabled={!onPress}
      onPress={() => onPress?.(m)}
    >
      <View style={styles.pastille}><Text style={styles.textePastille}>{etiquettePhase(m.phase)}</Text></View>
      <View style={styles.corpsMatch}>
        <View style={styles.ligneScore}>
          <Text style={[styles.equipe, g === m.equipe_a_id && styles.gagnant]} numberOfLines={1}>{nomEquipe(m.equipe_a_id)}</Text>
          {fini || enJeu ? (
            <Text style={[styles.score, passe && styles.scorePasse]}>{r.score_a} - {r.score_b}</Text>
          ) : (
            <Text style={styles.aVenir}>{t('calendrier.aVenir')}</Text>
          )}
          <Text style={[styles.equipe, styles.equipeB, g === m.equipe_b_id && styles.gagnant]} numberOfLines={1}>{nomEquipe(m.equipe_b_id)}</Text>
        </View>
        <View style={styles.ligneInfo}>
          {enJeu ? <BadgeEnDirect /> : (
            <Text style={styles.terrain}>
              {m.terrain ? t('saisie.terrain', { n: m.terrain }) : ''}
              {tab ? `${m.terrain ? ' · ' : ''}${t('calendrier.scoreTab', { a: r.score_tab_a, b: r.score_tab_b })}` : ''}
            </Text>
          )}
        </View>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={couleurs.texteAttenue} />}
    </Pressable>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    progression: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    jauge: { width: 90, height: 7, borderRadius: 4, backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure, overflow: 'hidden' },
    jaugePleine: { height: '100%', backgroundColor: c.accent, borderRadius: 4 },
    texteProgression: { flex: 1, fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue },
    filtres: { gap: 6, paddingBottom: 12 },
    filtre: { borderWidth: 1, borderColor: c.bordure, backgroundColor: c.surface2, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
    filtreActif: { backgroundColor: c.accent, borderColor: c.accent },
    texteFiltre: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, color: c.texteAttenue },
    texteFiltreActif: { color: c.accentEncre },
    vide: { fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, marginVertical: 10 },
    jour: { fontFamily: POLICE_TITRE, fontSize: 18, color: c.texte, marginTop: 14, marginBottom: 2, textTransform: 'capitalize' },
    separation: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 4 },
    texteSeparation: { fontFamily: POLICE_TITRE, fontSize: 18, color: c.lien },
    trait: { flex: 1, height: 1, backgroundColor: c.bordure },
    creneau: { borderTopWidth: 1, borderColor: c.bordure, paddingVertical: 10, gap: 6 },
    creneauCourant: { borderTopWidth: 2, borderColor: c.accent },
    ligneHeure: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
    heure: { fontFamily: POLICE_TITRE, fontSize: 22, color: c.texte },
    attenue: { color: c.texteAttenue },
    lien: { color: c.lien },
    etiquette: { fontFamily: POLICE_TEXTE_BOLD, fontSize: 10.5, letterSpacing: 0.6, color: c.texteAttenue },
    match: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10,
      borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure,
    },
    matchPasse: { backgroundColor: 'transparent', paddingVertical: 6 },
    matchEnJeu: { borderColor: c.accent, borderWidth: 1.5 },
    pastille: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent + '29' },
    textePastille: { fontFamily: POLICE_TITRE, fontSize: 14, color: c.lien, paddingTop: 2 },
    corpsMatch: { flex: 1, gap: 2 },
    ligneScore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    equipe: { flex: 1, fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13.5, color: c.texte, textAlign: 'right' },
    equipeB: { textAlign: 'left' },
    gagnant: { color: c.lien },
    score: { fontFamily: POLICE_TITRE, fontSize: 22, color: c.texte, minWidth: 52, textAlign: 'center' },
    scorePasse: { fontSize: 18 },
    aVenir: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 11.5, color: c.texteAttenue, minWidth: 52, textAlign: 'center' },
    ligneInfo: { alignItems: 'center' },
    terrain: { fontFamily: POLICE_TEXTE, fontSize: 11.5, color: c.texteAttenue },
    exempts: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 10 },
  });
}
