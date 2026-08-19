import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function RejoindreTournoi() {
  const router = useRouter();
  const [code, setCode] = useState('');

  function accederAuTournoi() {
    if (code) router.push(`/suivi/${code}`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>Rejoindre un tournoi</Text>
        <Text style={styles.soustitre}>Saisis le code d'accès communiqué par l'organisateur</Text>

        <TextInput
          style={styles.input}
          placeholder="ex : tournoifinannee20260818"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={accederAuTournoi}
        />

        <Pressable style={styles.bouton} onPress={accederAuTournoi}>
          <Text style={styles.texteBouton}>Accéder au tournoi</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },
  titre: { fontSize: 22, fontWeight: '600' },
  soustitre: { fontSize: 13, color: '#888', marginBottom: 24 },
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
