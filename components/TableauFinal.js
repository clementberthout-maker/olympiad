import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { libellePhase } from '../lib/phases';
import { estPhaseDePoule, idEquipeGagnante, NOM_MATCH_TROISIEME_PLACE } from '../lib/generation';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

const NOMS_TOURS = { 1: 'Finale', 2: 'Demi-finale', 4: 'Quart de finale', 8: 'Huitième de finale' };
const COURT = { Finale: 'F', 'Demi-finale': '½', 'Quart de finale': '¼', 'Huitième de finale': '⅛' };
const pad = (n) => String(n).padStart(2, '0');

// Tableau final (phase finale), une colonne par tour qu'on fait glisser,
// comme l'espace web : vainqueur en couleur, perdant estompé, match en
// direct encadré, tours pas encore générés en pointillés jusqu'à la finale.
// matchs : avec `resultat` ; nomEquipe(id).
export default function TableauFinal({ matchs, nomEquipe, matchTroisiemePlace = false }) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);

  const elim = matchs.filter((m) => !estPhaseDePoule(m.phase));
  if (!elim.length) return null;
  const tours = {};
  elim.forEach((m) => { (tours[m.phase] = tours[m.phase] || []).push(m); });
  const dateTour = (liste) => Math.max(...liste.map((m) => new Date(m.created_at).getTime()));
  const principales = Object.entries(tours).filter(([nom]) => nom !== NOM_MATCH_TROISIEME_PLACE)
    .sort((a, b) => dateTour(a[1]) - dateTour(b[1]));
  const troisieme = tours[NOM_MATCH_TROISIEME_PLACE];

  // Tours suivants pas encore générés
  const aVenir = [];
  const dernier = principales[principales.length - 1];
  if (dernier && dernier[0] !== 'Finale') {
    let n = dernier[1].length;
    let precedent = dernier[0];
    while (n > 1) {
      n = Math.ceil(n / 2);
      const nom = NOMS_TOURS[n] || `Tour à ${n * 2} équipes`;
      const court = COURT[precedent] || '';
      aVenir.push({ nom, cases: Array.from({ length: n }, (_, k) => [`${t('fil.vainqueur')} ${court} ${2 * k + 1}`, `${t('fil.vainqueur')} ${court} ${2 * k + 2}`]) });
      if (n === 1 && precedent === 'Demi-finale' && matchTroisiemePlace && !troisieme) {
        aVenir.push({ nom: NOM_MATCH_TROISIEME_PLACE, cases: [[`${t('fil.perdant')} ½ 1`, `${t('fil.perdant')} ½ 2`]] });
      }
      precedent = nom;
    }
  }

  const duel = (m) => {
    const r = m.resultat;
    const fini = r?.statut === 'termine';
    const enJeu = r?.statut === 'en_cours';
    const g = fini ? idEquipeGagnante(m) : null;
    const ligne = (id, score) => (
      <View style={[styles.ligne, g && (g === id ? styles.ligneGagnant : null)]}>
        <Text style={[styles.nom, g && (g === id ? styles.gagnant : styles.perdant)]} numberOfLines={1}>{nomEquipe(id)}</Text>
        <Text style={styles.score}>{fini || enJeu ? score : ''}</Text>
      </View>
    );
    if (!m.equipe_b_id) {
      return (
        <View key={m.id} style={styles.duel}>
          <View style={styles.ligne}><Text style={[styles.nom, styles.gagnant]} numberOfLines={1}>{nomEquipe(m.equipe_a_id)}</Text><Text style={styles.exempt}>{t('fil.exempt')}</Text></View>
        </View>
      );
    }
    return (
      <View key={m.id} style={[styles.duel, enJeu && styles.duelEnJeu]}>
        {ligne(m.equipe_a_id, r?.score_a)}
        <View style={styles.sep} />
        {ligne(m.equipe_b_id, r?.score_b)}
      </View>
    );
  };
  const attente = ([a, b], k) => (
    <View key={k} style={[styles.duel, styles.duelAttente]}>
      <View style={styles.ligne}><Text style={styles.texteAttente} numberOfLines={1}>{a}</Text></View>
      <View style={styles.sep} />
      <View style={styles.ligne}><Text style={styles.texteAttente} numberOfLines={1}>{b}</Text></View>
    </View>
  );
  const colonne = (nom, contenu, liste) => {
    const h = liste?.filter((m) => m.horaire).map((m) => new Date(m.horaire)).sort((a, b) => a - b)[0];
    return (
      <View key={nom} style={styles.colonne}>
        <Text style={styles.titreTour}>{libellePhase(nom, t)}{h ? <Text style={styles.heure}>  {pad(h.getHours())}:{pad(h.getMinutes())}</Text> : null}</Text>
        <View style={styles.cases}>{contenu}</View>
      </View>
    );
  };

  return (
    <View>
      <Text style={styles.titre}>{t('fil.tableauFinal')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colonnes}>
        {principales.map(([nom, liste]) => colonne(nom, liste.map(duel), liste))}
        {aVenir.map(({ nom, cases }) => colonne(nom, cases.map(attente)))}
        {troisieme && colonne(NOM_MATCH_TROISIEME_PLACE, troisieme.map(duel), troisieme)}
      </ScrollView>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    titre: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.2, color: c.texte, marginTop: 8, marginBottom: 10 },
    colonnes: { gap: 14, paddingBottom: 6 },
    colonne: { width: 190 },
    titreTour: { fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.3, color: c.lien, marginBottom: 8 },
    heure: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue },
    cases: { flex: 1, justifyContent: 'space-around', gap: 12 },
    duel: { borderRadius: 10, borderWidth: 1, borderColor: c.bordure, backgroundColor: c.surface, overflow: 'hidden' },
    duelEnJeu: { borderColor: c.accent, borderWidth: 1.5 },
    duelAttente: { borderStyle: 'dashed', backgroundColor: 'transparent' },
    sep: { height: 1, backgroundColor: c.bordure },
    ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8, paddingHorizontal: 10 },
    ligneGagnant: { backgroundColor: c.accent + '14' },
    nom: { flex: 1, fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texte },
    gagnant: { color: c.lien },
    perdant: { color: c.texteAttenue, fontFamily: POLICE_TEXTE },
    score: { fontFamily: POLICE_TITRE, fontSize: 17, color: c.texte },
    exempt: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue },
    texteAttente: { fontFamily: POLICE_TEXTE, fontSize: 12.5, fontStyle: 'italic', color: c.texteAttenue },
  });
}
