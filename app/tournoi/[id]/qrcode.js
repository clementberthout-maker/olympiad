import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../../../lib/theme';

export default function QrCodeTournoi() {
  const { id } = useLocalSearchParams();
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
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

function creerStyles(c) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, paddingTop: 32, alignItems: 'center', backgroundColor: c.fond },
    titre: { fontFamily: POLICE_TITRE, fontSize: 22, letterSpacing: 0.3, color: c.texte, textAlign: 'center' },
    soustitre: {
      fontFamily: POLICE_TEXTE, fontSize: 13, color: c.texteAttenue, textAlign: 'center', marginTop: 8, marginBottom: 28,
    },
    // La carte du QR reste toujours claire (fond blanc, code sombre) pour
    // garantir une bonne lisibilité par un lecteur, quel que soit le thème
    // choisi dans l'app.
    carteQr: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#eeeeee',
      borderRadius: 16,
      padding: 20,
    },
    labelCode: { fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue, marginTop: 28 },
    code: {
      fontFamily: POLICE_TITRE, fontSize: 22, color: c.texte, marginTop: 6, letterSpacing: 1,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 15,
      paddingHorizontal: 32,
      alignItems: 'center',
      marginTop: 32,
    },
    texteBouton: { color: c.accentEncre, fontFamily: POLICE_TITRE, fontSize: 16, letterSpacing: 0.3 },
  });
}
