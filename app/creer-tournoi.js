import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CarteSelectionnable from '../components/CarteSelectionnable';
import SelecteurDate from '../components/SelecteurDate';
import IndicateurEtapes from '../components/IndicateurEtapes';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

export default function CreerTournoi() {
  const { sport: sportParam } = useLocalSearchParams(); // choisi sur l'écran précédent, voir choisir-sport.js
  const sport = sportParam || 'football';
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [nom, setNom] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState('mixte');
  const [tennisDouble, setTennisDouble] = useState(false);
  const [departagePoule, setDepartagePoule] = useState('diff_buts');
  // Le rugby n'a pas de tirs au but et le basket a ses propres options
  // (tirs au panier) : valeur par défaut différente selon le sport (voir
  // departagesElimination ci-dessous pour les options proposées).
  const [departageElimination, setDepartageElimination] = useState(
    sport === 'rugby' ? 'prolongation'
      : sport === 'basketball' ? 'prolongation_tirs_panier'
        : 'prolongations_tab'
  );
  const [reglagesAvancesOuverts, setReglagesAvancesOuverts] = useState(false);

  const formats = useMemo(() => ([
    { valeur: 'mixte', label: t('creerTournoi.formatMixte') },
    { valeur: 'poules', label: t('creerTournoi.formatPoules') },
    { valeur: 'elimination_directe', label: t('creerTournoi.formatElimination') },
  ]), [t]);

  const departagesPoule = useMemo(() => ([
    { valeur: 'diff_buts', label: t(`sports.${sport}.libelleDiffScore`) },
    { valeur: 'confrontation_directe', label: t('creerTournoi.confrontationDirecte') },
  ]), [sport, t]);

  const departagesElimination = useMemo(() => {
    if (sport === 'rugby') {
      return [
        { valeur: 'prolongation', label: t('creerTournoi.prolongation') },
        { valeur: 'mort_subite', label: t('creerTournoi.mortSubite') },
        { valeur: 'drop_goal', label: t('creerTournoi.dropGoal') },
      ];
    }
    if (sport === 'basketball') {
      return [
        { valeur: 'prolongation_tirs_panier', label: t('creerTournoi.prolongationTirsPanier') },
        { valeur: 'prolongation_vainqueur', label: t('creerTournoi.prolongationVainqueur') },
        { valeur: 'tirs_panier_direct', label: t('creerTournoi.tirsPanierDirect') },
      ];
    }
    return [
      { valeur: 'prolongations_tab', label: t('creerTournoi.prolongationsTab') },
      { valeur: 'tab_direct', label: t('creerTournoi.tabDirect') },
    ];
  }, [sport, t]);

  // Le tournoi n'est créé en base qu'une fois tous les réglages (équipes,
  // horaires...) renseignés à l'étape suivante — voir tournoi/[id]/equipes.js.
  // Cet écran se contente de collecter les premières informations.
  function allerEtapeSuivante() {
    if (!nom || !date) {
      Alert.alert(t('creerTournoi.champsManquantsTitre'), t('creerTournoi.champsManquantsMessage'));
      return;
    }
    router.push({
      pathname: '/tournoi/[id]/equipes',
      params: {
        id: 'nouveau', sport, nom, date, format, departagePoule, departageElimination,
        tennisDouble: tennisDouble ? '1' : '0',
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <IndicateurEtapes etape={2} total={3} label={t('commun.etape', { n: 2, total: 3, label: t('creerTournoi.etapeLabel') })} />
      <Text style={styles.eyebrow}>{t(`sports.${sport}.label`)}</Text>

      <Text style={styles.label}>{t('creerTournoi.nomDuTournoi')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('creerTournoi.placeholderNom')}
        value={nom}
        onChangeText={setNom}
        returnKeyType="done"
      />

      <Text style={styles.label}>{t('creerTournoi.date')}</Text>
      <SelecteurDate value={date} onChange={setDate} placeholder={t('creerTournoi.choisirLaDate')} />

      <Text style={styles.label}>{t('creerTournoi.format')}</Text>
      {formats.map((f) => (
        <CarteSelectionnable
          key={f.valeur}
          label={f.label}
          selectionnee={format === f.valeur}
          onPress={() => setFormat(f.valeur)}
        />
      ))}

      <Pressable
        style={styles.enteteAvance}
        onPress={() => setReglagesAvancesOuverts((v) => !v)}
      >
        <Text style={styles.labelAvance}>{t('creerTournoi.reglagesAvances')}</Text>
        <Text style={styles.chevronAvance}>{reglagesAvancesOuverts ? '︿' : '﹀'}</Text>
      </Pressable>
      {!reglagesAvancesOuverts && (
        <Text style={styles.aideAvance}>{t('creerTournoi.aideAvance')}</Text>
      )}

      {reglagesAvancesOuverts && (
        <>
          {sport === 'tennis' && (
            <>
              <Text style={styles.label}>{t('creerTournoi.simpleOuDouble')}</Text>
              <CarteSelectionnable
                label={t('creerTournoi.simple')}
                selectionnee={!tennisDouble}
                onPress={() => setTennisDouble(false)}
              />
              <CarteSelectionnable
                label={t('creerTournoi.double')}
                selectionnee={tennisDouble}
                onPress={() => setTennisDouble(true)}
              />
            </>
          )}

          <Text style={styles.label}>{t('creerTournoi.departagePoule')}</Text>
          {departagesPoule.map((d) => (
            <CarteSelectionnable
              key={d.valeur}
              label={d.label}
              selectionnee={departagePoule === d.valeur}
              onPress={() => setDepartagePoule(d.valeur)}
            />
          ))}

          {sport !== 'tennis' && (
            <>
              <Text style={styles.label}>{t('creerTournoi.departageElimination')}</Text>
              {departagesElimination.map((d) => (
                <CarteSelectionnable
                  key={d.valeur}
                  label={d.label}
                  selectionnee={departageElimination === d.valeur}
                  onPress={() => setDepartageElimination(d.valeur)}
                />
              ))}
            </>
          )}
        </>
      )}

      <Pressable style={styles.bouton} onPress={allerEtapeSuivante}>
        <Text style={styles.texteBouton}>{t('creerTournoi.suivant')}</Text>
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
    enteteAvance: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderColor: c.bordure,
    },
    labelAvance: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 14, color: c.texte },
    chevronAvance: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.texteAttenue },
    aideAvance: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
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
