import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerBackTitleVisible: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="inscription" />
      <Stack.Screen name="connexion" />
      <Stack.Screen name="rejoindre" />
      <Stack.Screen name="creer-tournoi" />
      <Stack.Screen
        name="tournoi/[id]/equipes"
        options={{
          headerTitle: 'OLYMPIAD',
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="tournoi/[id]/calendrier" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="tournoi/[id]/saisie" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="suivi/[code]" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen
        name="profil"
        options={{
          headerTitle: 'OLYMPIAD',
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
