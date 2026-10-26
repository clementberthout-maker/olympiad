import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { infosSport } from '../lib/sports';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

// Classement général et liste des épreuves d'une olympiade, communs à
// l'écran de l'organisateur (olympiade/[id]) et au suivi public
// (suivi-olympiade/[code]). `donnees` : résultat de chargerOlympiade.
export default function VueOlympiade({ donnees, onOuvrirEpreuve }) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const { olympiade, epreuves, classement } = donnees;
  const terminees = epreuves.filter((e) => e.places);
  const bareme = olympiade.bareme || [];

  return (
    <>
      <Text style={styles.section}>{t('olympiade.classementGeneral')}</Text>
      <Text style={styles.aide}>
        {terminees.length
          ? t('olympiade.epreuvesComptees', { n: terminees.length, total: epreuves.length })
          : t('olympiade.aucuneEpreuveTerminee')}
      </Text>
      {classement.length === 0 ? (
        <Text style={styles.aide}>{t('olympiade.aucuneEquipe')}</Text>
      ) : classement.map((ligne) => {
        const details = terminees
          .filter((e) => ligne.points[e.tournoi.id] !== undefined)
          .map((e) => `${t(`sports.${e.tournoi.sport}.label`)} ${ligne.points[e.tournoi.id]}`)
          .join(' · ');
        return (
          <View key={ligne.equipe.id} style={[styles.ligne, ligne.rang === 1 && terminees.length > 0 && styles.ligneTete]}>
            <Text style={styles.rang}>{ligne.rang}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom} numberOfLines={1}>{ligne.equipe.nom}</Text>
              {details ? <Text style={styles.details} numberOfLines={1}>{details}</Text> : null}
            </View>
            <Text style={styles.total}>{ligne.total}</Text>
            <Text style={styles.unite}>{t('olympiade.pts')}</Text>
          </View>
        );
      })}
      {bareme.length > 0 && (
        <Text style={styles.bareme}>{t('olympiade.baremeResume', { points: bareme.join(' · ') })}</Text>
      )}

      <Text style={styles.section}>{t('olympiade.epreuves')}</Text>
      {epreuves.length === 0 && <Text style={styles.aide}>{t('olympiade.aucuneEpreuve')}</Text>}
      {epreuves.map(({ tournoi, statut }) => (
        <Pressable key={tournoi.id} style={styles.carte} onPress={() => onOuvrirEpreuve(tournoi)}>
          <MaterialCommunityIcons name={infosSport(tournoi.sport).icone} size={20} color={couleurs.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nom} numberOfLines={1}>{tournoi.nom}</Text>
            <Text style={styles.details}>{t(`sports.${tournoi.sport}.label`)}</Text>
          </View>
          <View style={[styles.badge, statut !== 'avenir' && styles.badgeActif]}>
            <Text style={[styles.texteBadge, statut !== 'avenir' && styles.texteBadgeActif]}>
              {t(`olympiade.statut.${statut}`)}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    section: { fontFamily: POLICE_TITRE, fontSize: 18, letterSpacing: 0.3, color: c.texte, marginTop: 22, marginBottom: 4 },
    aide: { fontFamily: POLICE_TEXTE, fontSize: 12.5, color: c.texteAttenue, marginBottom: 10 },
    ligne: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure, borderRadius: 10,
      paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6,
    },
    ligneTete: { borderLeftWidth: 3, borderLeftColor: c.accent },
    rang: { fontFamily: POLICE_TITRE, fontSize: 18, color: c.accent, width: 24, textAlign: 'center' },
    nom: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14.5, color: c.texte },
    details: { fontFamily: POLICE_TEXTE, fontSize: 11.5, color: c.texteAttenue, marginTop: 2 },
    total: { fontFamily: POLICE_TITRE, fontSize: 20, color: c.texte },
    unite: { fontFamily: POLICE_TEXTE, fontSize: 11, color: c.texteAttenue },
    bareme: { fontFamily: POLICE_TEXTE, fontSize: 11.5, color: c.texteAttenue, marginTop: 4 },
    carte: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.bordure, borderRadius: 10,
      padding: 12, marginBottom: 8,
    },
    badge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.bordure },
    badgeActif: { backgroundColor: c.accent + '22', borderColor: 'transparent' },
    texteBadge: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 9, letterSpacing: 0.3, color: c.texteAttenue },
    texteBadgeActif: { color: c.accent },
    chevron: { fontSize: 20, color: c.texteAttenue },
  });
}
