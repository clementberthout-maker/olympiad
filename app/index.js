import { View, Text, StyleSheet, Pressable, FlatList, Image, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TITRE, POLICE_TEXTE_MEDIUM, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';
import { listerTournoisSuivis, retirerTournoiSuivi } from '../lib/tournoisSuivis';
import { infosSport } from '../lib/sports';
import { vibrerAttention } from '../lib/haptique';
import LogoMarque from '../components/LogoMarque';
import Squelette from '../components/Squelette';
import BoutonLangue from '../components/BoutonLangue';

const NOMBRE_TOURNOIS_APERCU = 2;

// Un tournoi OLYMPIAD se déroule sur une seule journée (date_debut) : le
// statut se déduit donc simplement de cette date, sans requête supplémentaire.
function statutTournoi(dateDebut) {
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const date = new Date(`${dateDebut}T00:00:00`);
  if (date.getTime() === aujourdHui.getTime()) return 'aujourdhui';
  if (date.getTime() > aujourdHui.getTime()) return 'avenir';
  return 'termine';
}

export default function Accueil() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const { t, langue } = useLangue();
  const locale = langue === 'en' ? 'en-US' : 'fr-FR';
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  // Cet écran masque le header par défaut (voir _layout.js), donc rien
  // d'autre ne tient compte de la barre de statut : sans cet ajout, le logo
  // se retrouve collé sous la barre de statut sur Android (edge-to-edge).
  const paddingHaut = { paddingTop: insets.top + 24 };
  // Le bloc "Connecté comme…" / Mon profil / Se déconnecter est poussé en
  // bas de l'écran (marginTop: 'auto') : sans cette marge il se retrouve
  // sous la barre système Android (geste ou boutons), ce qui rend les liens
  // difficilement cliquables.
  const paddingBas = { paddingBottom: insets.bottom + 24 };
  const [chargement, setChargement] = useState(true);
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [mesTournois, setMesTournois] = useState([]);
  const [tournoisSuivis, setTournoisSuivis] = useState([]);
  const [mesTournoisEtendu, setMesTournoisEtendu] = useState(false);
  const [suivisEtendu, setSuivisEtendu] = useState(false);

  const LABEL_STATUT = {
    aujourdhui: t('accueil.statutAujourdhui'), avenir: t('accueil.statutAvenir'), termine: t('accueil.statutTermine'),
  };

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      async function charger() {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!actif) return;
        setSession(s);
        if (s) {
          const { data: p } = await supabase
            .from('profils')
            .select('*')
            .eq('id', s.user.id)
            .maybeSingle();
          if (actif) setProfil(p);

          const { data: tournois } = await supabase
            .from('tournois')
            .select('*')
            .eq('organisateur_id', s.user.id)
            .order('created_at', { ascending: false });
          if (actif) setMesTournois(tournois || []);
        } else {
          setProfil(null);
          setMesTournois([]);
        }

        const suivis = await listerTournoisSuivis();
        if (actif) setTournoisSuivis(suivis);
        if (actif) setChargement(false);
      }
      charger();
      return () => { actif = false; };
    }, [])
  );

  function oublierTournoiSuivi(code, nom) {
    Alert.alert(
      t('accueil.oublierTitre'),
      t('accueil.oublierMessage', { nom }),
      [
        { text: t('commun.annuler'), style: 'cancel' },
        {
          text: t('accueil.oublier'),
          style: 'destructive',
          onPress: async () => {
            vibrerAttention();
            await retirerTournoiSuivi(code);
            setTournoisSuivis((liste) => liste.filter((t2) => t2.code !== code));
          },
        },
      ]
    );
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    setSession(null);
    setProfil(null);
    setMesTournois([]);
  }

  if (chargement) {
    return (
      <View style={[styles.container, paddingHaut]}>
        <View style={styles.logo}>
          <Squelette width={38} height={38} radius={19} />
          <Squelette width={140} height={30} />
        </View>
        <Squelette width={200} height={13} style={{ alignSelf: 'center', marginTop: 12, marginBottom: 36 }} />
        <Squelette height={44} radius={10} />
        <Squelette width={90} height={11} style={{ marginTop: 28, marginBottom: 10 }} />
        <Squelette height={62} radius={10} style={{ marginBottom: 8 }} />
        <Squelette height={62} radius={10} />
      </View>
    );
  }

  function listeTournoisSuivis(serre) {
    return (
    <>
      <View style={[styles.ligneSectionTitre, serre && styles.ligneSectionTitreSerree]}>
        <Text style={styles.sectionTitre}>{t('accueil.tournoisSuivis')}</Text>
        {tournoisSuivis.length > NOMBRE_TOURNOIS_APERCU && (
          <Pressable onPress={() => setSuivisEtendu((v) => !v)}>
            <Text style={styles.lienVoirTout}>
              {suivisEtendu ? t('accueil.voirMoins') : t('accueil.voirTout', { n: tournoisSuivis.length })}
            </Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={suivisEtendu ? tournoisSuivis : tournoisSuivis.slice(0, NOMBRE_TOURNOIS_APERCU)}
        keyExtractor={(item) => item.code}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const statut = statutTournoi(item.dateDebut);
          return (
            <Pressable style={styles.carteTournoi} onPress={() => router.push(`/suivi/${item.code}`)}>
              <MaterialCommunityIcons
                name={infosSport(item.sport).icone}
                size={20}
                color={couleurs.accent}
                style={styles.iconeSport}
              />
              <View style={styles.infoTournoi}>
                <Text style={styles.nomTournoi} numberOfLines={1}>{item.nom}</Text>
                <Text style={styles.dateTournoi}>
                  {new Date(`${item.dateDebut}T00:00:00`).toLocaleDateString(locale, {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={[styles.badgeStatut, styles[`badgeStatut_${statut}`]]}>
                <Text style={[styles.texteBadgeStatut, styles[`texteBadgeStatut_${statut}`]]}>
                  {LABEL_STATUT[statut]}
                </Text>
              </View>
              <Pressable
                style={styles.boutonOublier}
                onPress={() => oublierTournoiSuivi(item.code, item.nom)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={17} color={couleurs.texteAttenue} />
              </Pressable>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
      />
    </>
    );
  }

  if (!session) {
    return (
      <ScrollView contentContainerStyle={[styles.container, paddingHaut, paddingBas]}>
        <View style={styles.enteteAccueil}>
          <BoutonLangue />
        </View>
        <View style={styles.logo}>
          <LogoMarque taille={38} />
          <Text style={styles.titre}>OLYMPIAD</Text>
        </View>
        <Text style={styles.soustitre}>{t('accueil.sousTitre')}</Text>

        <Pressable style={styles.boutonPrincipal} onPress={() => router.push('/inscription')}>
          <Text style={styles.texteBoutonPrincipal}>{t('accueil.creerMonTournoi')}</Text>
        </Pressable>

        <Pressable style={styles.boutonSecondaire} onPress={() => router.push('/rejoindre')}>
          <Text style={styles.texteBoutonSecondaire}>{t('accueil.rejoindreUnTournoi')}</Text>
        </Pressable>

        {tournoisSuivis.length > 0 && listeTournoisSuivis(false)}

        <View style={styles.bas}>
          <Pressable onPress={() => router.push('/connexion')}>
            <Text style={styles.lienBas}>{t('accueil.dejaInscrit')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, paddingHaut, paddingBas]}>
      <View style={styles.enteteAccueil}>
        <BoutonLangue />
      </View>
      <View style={styles.logo}>
        <LogoMarque taille={38} />
        <Text style={styles.titre}>OLYMPIAD</Text>
      </View>
      <Text style={styles.soustitre}>{t('accueil.sousTitre')}</Text>

      <View style={styles.rangeeActions}>
        <Pressable style={styles.boutonActionPrincipale} onPress={() => router.push('/choisir-sport')}>
          <Text style={styles.texteActionPrincipale} numberOfLines={1} adjustsFontSizeToFit>
            {t('accueil.creerUnTournoi')}
          </Text>
        </Pressable>
        <Pressable style={styles.boutonActionSecondaire} onPress={() => router.push('/rejoindre')}>
          <Text style={styles.texteActionSecondaire} numberOfLines={1} adjustsFontSizeToFit>
            {t('accueil.rejoindre')}
          </Text>
        </Pressable>
      </View>

      {mesTournois.length > 0 && (
        <>
          <View style={styles.ligneSectionTitre}>
            <Text style={styles.sectionTitre}>{t('accueil.mesTournois')}</Text>
            {mesTournois.length > NOMBRE_TOURNOIS_APERCU && (
              <Pressable onPress={() => setMesTournoisEtendu((v) => !v)}>
                <Text style={styles.lienVoirTout}>
                  {mesTournoisEtendu ? t('accueil.voirMoins') : t('accueil.voirTout', { n: mesTournois.length })}
                </Text>
              </Pressable>
            )}
          </View>
          <FlatList
            data={mesTournoisEtendu ? mesTournois : mesTournois.slice(0, NOMBRE_TOURNOIS_APERCU)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const statut = statutTournoi(item.date_debut);
              return (
                <Pressable
                  style={styles.carteTournoi}
                  onPress={() => router.push(`/tournoi/${item.id}/calendrier`)}
                >
                  <MaterialCommunityIcons
                    name={infosSport(item.sport).icone}
                    size={20}
                    color={couleurs.accent}
                    style={styles.iconeSport}
                  />
                  <View style={styles.infoTournoi}>
                    <Text style={styles.nomTournoi} numberOfLines={1}>{item.nom}</Text>
                    <Text style={styles.dateTournoi}>
                      {new Date(`${item.date_debut}T00:00:00`).toLocaleDateString(locale, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.badgeStatut, styles[`badgeStatut_${statut}`]]}>
                    <Text style={[styles.texteBadgeStatut, styles[`texteBadgeStatut_${statut}`]]}>
                      {LABEL_STATUT[statut]}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.boutonQrCarte}
                    onPress={() => router.push(`/tournoi/${item.id}/qrcode`)}
                    hitSlop={8}
                  >
                    <Ionicons name="qr-code-outline" size={18} color={couleurs.texteAttenue} />
                  </Pressable>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            }}
          />
        </>
      )}

      {tournoisSuivis.length > 0 && listeTournoisSuivis(true)}

      <View style={styles.bas}>
        {profil?.photo_url && (
          <Image source={{ uri: profil.photo_url }} style={styles.avatar} />
        )}
        <Text style={styles.connecteComme}>
          {t('accueil.connecteComme', { nom: profil?.prenom || session.user.email })}
        </Text>
        <View style={styles.ligneLiensBas}>
          <Pressable onPress={() => router.push('/profil')}>
            <Text style={styles.lienBas}>{t('accueil.monProfil')}</Text>
          </Pressable>
          <Text style={styles.separateurLiens}>·</Text>
          <Pressable onPress={seDeconnecter}>
            <Text style={styles.lienBas}>{t('accueil.seDeconnecter')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 24, backgroundColor: c.fond },
    enteteAccueil: { alignItems: 'flex-end', marginBottom: 4 },
    rangeeActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    boutonActionPrincipale: {
      flex: 1, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
    },
    texteActionPrincipale: {
      color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 15.5, letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    boutonActionSecondaire: {
      flex: 1, borderWidth: 1, borderColor: c.bordure, backgroundColor: c.surface2,
      borderRadius: 10, paddingVertical: 13, alignItems: 'center',
    },
    texteActionSecondaire: {
      color: c.texte, fontFamily: POLICE_TITRE, fontSize: 15.5, letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    logo: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    },
    titre: {
      fontSize: 60, fontFamily: POLICE_TITRE, textAlign: 'center',
      letterSpacing: 1, color: c.texte,
    },
    soustitre: {
      fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 15, color: c.texteAttenue,
      textAlign: 'center', marginBottom: 36,
    },
    boutonPrincipal: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 10,
    },
    texteBoutonPrincipal: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 19, letterSpacing: 0.5 },
    boutonSecondaire: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
    },
    texteBoutonSecondaire: { color: c.texte, fontFamily: POLICE_TITRE, fontSize: 19, letterSpacing: 0.5 },
    ligneSectionTitre: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 28, marginBottom: 10,
    },
    ligneSectionTitreSerree: { marginTop: 2 },
    sectionTitre: { fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.6, color: c.texteAttenue },
    lienVoirTout: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 12.5, color: c.lien },
    carteTournoi: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    iconeSport: { marginRight: 10 },
    infoTournoi: { flex: 1, flexShrink: 1, marginRight: 8 },
    nomTournoi: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte },
    dateTournoi: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
    badgeStatut: {
      borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, marginRight: 8,
    },
    badgeStatut_aujourdhui: { backgroundColor: c.accent + '22' },
    badgeStatut_avenir: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.bordure },
    badgeStatut_termine: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.bordure },
    texteBadgeStatut: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 9, letterSpacing: 0.3 },
    texteBadgeStatut_aujourdhui: { color: c.accent },
    texteBadgeStatut_avenir: { color: c.texteAttenue },
    texteBadgeStatut_termine: { color: c.texteAttenue },
    boutonQrCarte: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.bordure,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    boutonOublier: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    chevron: { fontSize: 20, color: c.texteAttenue },
    bas: { marginTop: 'auto', alignItems: 'center', paddingTop: 40 },
    avatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 8 },
    connecteComme: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.texteAttenue, marginBottom: 6 },
    ligneLiensBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    separateurLiens: { fontSize: 13, color: c.bordure },
    lienBas: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
  });
}
