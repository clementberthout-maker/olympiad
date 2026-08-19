import { View, Text, StyleSheet, Pressable, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function Accueil() {
  const router = useRouter();
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
        <Text style={styles.texteBoutonSecondaire}>Rejoindre un tournoi (code d'accès)</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 90 },
  titre: { fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  soustitre: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 36 },
  boutonPrincipal: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  texteBoutonPrincipal: { color: '#fff', fontSize: 16, fontWeight: '500' },
  boutonSecondaire: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  texteBoutonSecondaire: { fontSize: 15, fontWeight: '500', color: '#333' },
  sectionTitre: { fontSize: 13, fontWeight: '600', color: '#888', marginTop: 28, marginBottom: 10 },
  carteTournoi: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7f7f8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  nomTournoi: { fontSize: 15, fontWeight: '500' },
  dateTournoi: { fontSize: 12, color: '#888', marginTop: 2 },
  chevron: { fontSize: 20, color: '#bbb' },
  bas: { marginTop: 'auto', alignItems: 'center', paddingTop: 40 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 8 },
  connecteComme: { fontSize: 12, color: '#999', marginBottom: 6 },
  ligneLiensBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  separateurLiens: { fontSize: 13, color: '#ccc' },
  lienBas: { fontSize: 13, color: '#4338ca' },
});
