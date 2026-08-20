import { View, Text, StyleSheet, Pressable, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE_MEDIUM, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

export default function Accueil() {
  const router = useRouter();
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [mesTournois, setMesTournois] = useState([]);

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
      }
      charger();
      return () => { actif = false; };
    }, [])
  );

  async function seDeconnecter() {
    await supabase.auth.signOut();
    setSession(null);
    setProfil(null);
    setMesTournois([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>OLYMPIAD</Text>
      <Text style={styles.soustitre}>Organisez vos tournois de football</Text>

      <Pressable
        style={styles.boutonPrincipal}
        onPress={() => router.push(session ? '/creer-tournoi' : '/inscription')}
      >
        <Text style={styles.texteBoutonPrincipal}>Créer mon tournoi</Text>
      </Pressable>

      <Pressable style={styles.boutonSecondaire} onPress={() => router.push('/rejoindre')}>
        <Text style={styles.texteBoutonSecondaire}>Rejoindre un tournoi</Text>
      </Pressable>

      {session && mesTournois.length > 0 && (
        <>
          <Text style={styles.sectionTitre}>Mes tournois</Text>
          <FlatList
            data={mesTournois}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.carteTournoi}
                onPress={() => router.push(`/tournoi/${item.id}/calendrier`)}
              >
                <View>
                  <Text style={styles.nomTournoi}>{item.nom}</Text>
                  <Text style={styles.dateTournoi}>
                    {new Date(`${item.date_debut}T00:00:00`).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
          />
        </>
      )}

      <View style={styles.bas}>
        {session ? (
          <>
            {profil?.photo_url && (
              <Image source={{ uri: profil.photo_url }} style={styles.avatar} />
            )}
            <Text style={styles.connecteComme}>
              Connecté en tant que {profil?.prenom || session.user.email}
            </Text>
            <View style={styles.ligneLiensBas}>
              <Pressable onPress={() => router.push('/profil')}>
                <Text style={styles.lienBas}>Mon profil</Text>
              </Pressable>
              <Text style={styles.separateurLiens}>·</Text>
              <Pressable onPress={seDeconnecter}>
                <Text style={styles.lienBas}>Se déconnecter</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => router.push('/connexion')}>
            <Text style={styles.lienBas}>Déjà inscrit ? Se connecter</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, paddingTop: 90, backgroundColor: c.fond },
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
    texteBoutonSecondaire: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte },
    sectionTitre: {
      fontFamily: POLICE_TITRE, fontSize: 15, letterSpacing: 0.6,
      color: c.texteAttenue, marginTop: 28, marginBottom: 10,
    },
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
    nomTournoi: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 15, color: c.texte },
    dateTournoi: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.texteAttenue, marginTop: 2 },
    chevron: { fontSize: 20, color: c.texteAttenue },
    bas: { marginTop: 'auto', alignItems: 'center', paddingTop: 40 },
    avatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 8 },
    connecteComme: { fontFamily: POLICE_TEXTE_MEDIUM, fontSize: 12, color: c.texteAttenue, marginBottom: 6 },
    ligneLiensBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    separateurLiens: { fontSize: 13, color: c.bordure },
    lienBas: { fontFamily: POLICE_TEXTE_SEMIBOLD, fontSize: 13, color: c.lien },
  });
}
