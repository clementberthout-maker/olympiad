import {
  View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, ScrollView, Platform, Alert,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';

// Retrouve le code d'accès à partir du texte scanné : soit un lien OLYMPIAD
// (ex: olympiad://suivi/ABC123 ou exp://.../--/suivi/ABC123), soit
// directement le code si le QR ne contient pas un lien reconnu.
function extraireCode(texteScanne) {
  try {
    const { path } = Linking.parse(texteScanne);
    if (path) {
      const segments = path.split('/').filter(Boolean);
      const index = segments.indexOf('suivi');
      if (index !== -1 && segments[index + 1]) return segments[index + 1];
    }
  } catch {
    // Pas un lien reconnu : on utilise le texte scanné tel quel.
  }
  return texteScanne;
}

// Un code d'accès (voir lib/codeAcces.js) n'est fait que de lettres et de
// chiffres. Si le texte scanné ne ressemble pas à ça (ex: un QR code sans
// rapport, ou un lien qu'on n'a pas su interpréter), on ne navigue pas.
function estCodeValide(texte) {
  return /^[a-z0-9]{1,40}$/i.test(texte);
}

export default function RejoindreTournoi() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [permission, demanderPermission] = useCameraPermissions();
  const [scanActif, setScanActif] = useState(true);
  const dejaScanneRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      dejaScanneRef.current = false;
      setScanActif(true);
      if (permission && !permission.granted && permission.canAskAgain) {
        demanderPermission();
      }
    }, [permission?.granted])
  );

  function accederAuTournoi(valeur) {
    const codeFinal = (valeur ?? code).trim();
    if (codeFinal) router.push(`/suivi/${codeFinal}`);
  }

  function surScan({ data }) {
    if (dejaScanneRef.current) return;
    dejaScanneRef.current = true;

    const codeScanne = extraireCode(data);
    if (!estCodeValide(codeScanne)) {
      Alert.alert('QR code non reconnu', "Ce QR code ne correspond pas à un tournoi OLYMPIAD.", [
        { text: 'OK', onPress: () => { dejaScanneRef.current = false; } },
      ]);
      return;
    }

    setScanActif(false);
    accederAuTournoi(codeScanne);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Rejoindre un tournoi</Text>
        <Text style={styles.soustitre}>
          Scanne le QR code du tournoi, ou saisis le code d'accès communiqué par l'organisateur
        </Text>

        <View style={styles.cadreCamera}>
          {permission?.granted && scanActif ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={surScan}
            />
          ) : (
            <View style={styles.zonePermission}>
              <Text style={styles.textePermission}>
                {permission?.granted
                  ? 'QR code détecté…'
                  : permission?.canAskAgain === false
                    ? "Autorise l'accès à la caméra dans les réglages de ton téléphone pour scanner un QR code."
                    : "Autorise l'accès à la caméra pour scanner un QR code."}
              </Text>
              {!permission?.granted && permission?.canAskAgain !== false && (
                <Pressable style={styles.boutonAutoriser} onPress={demanderPermission}>
                  <Text style={styles.texteBoutonAutoriser}>Autoriser la caméra</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Text style={styles.separateurTexte}>ou</Text>

        <TextInput
          style={styles.input}
          placeholder="ex : tournoifinannee20260818"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => accederAuTournoi()}
        />

        <Pressable style={styles.bouton} onPress={() => accederAuTournoi()}>
          <Text style={styles.texteBouton}>Accéder au tournoi</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  titre: { fontSize: 22, fontWeight: '600' },
  soustitre: { fontSize: 13, color: '#888', marginTop: 8, marginBottom: 24 },
  cadreCamera: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f2',
  },
  camera: { flex: 1 },
  zonePermission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  textePermission: { fontSize: 13, color: '#888', textAlign: 'center' },
  boutonAutoriser: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  texteBoutonAutoriser: { color: '#fff', fontSize: 13, fontWeight: '500' },
  separateurTexte: { fontSize: 12, color: '#bbb', textAlign: 'center', marginVertical: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  bouton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  texteBouton: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
