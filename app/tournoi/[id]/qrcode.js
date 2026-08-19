import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../../lib/supabase';

export default function QrCodeTournoi() {
  const { id } = useLocalSearchParams();
  const [tournoi, setTournoi] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      supabase.from('tournois').select('*').eq('id', id).single().then(({ data }) => {
        if (actif) setTournoi(data);
      });
      return () => { actif = false; };
    }, [id])
  );

  if (!tournoi) return null;

  const lien = Linking.createURL(`suivi/${tournoi.code_acces}`);

  function partager() {
    Share.share({
      message: `Suis le tournoi "${tournoi.nom}" sur OLYMPIAD !\nCode d'accès : ${tournoi.code_acces}\n${lien}`,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>{tournoi.nom}</Text>
      <Text style={styles.soustitre}>
        Fais scanner ce QR code aux équipes et spectateurs pour qu'ils accèdent directement au
        suivi du tournoi.
      </Text>

      <View style={styles.carteQr}>
        <QRCode value={lien} size={220} />
      </View>

      <Text style={styles.labelCode}>Ou avec le code d'accès</Text>
      <Text style={styles.code}>{tournoi.code_acces}</Text>

      <Pressable style={styles.bouton} onPress={partager}>
        <Text style={styles.texteBouton}>Partager le lien</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 32, alignItems: 'center' },
  titre: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  soustitre: {
    fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 28,
  },
  carteQr: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 20,
  },
  labelCode: { fontSize: 12, color: '#888', marginTop: 28 },
  code: {
    fontSize: 20, fontWeight: '600', fontFamily: 'monospace', marginTop: 6, letterSpacing: 1,
  },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  texteBouton: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
