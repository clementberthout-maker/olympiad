import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE } from '../lib/theme';

function NavigationThemee() {
  const { couleurs } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.accent,
        headerTitleStyle: { fontFamily: POLICE_TITRE, color: couleurs.texte, fontSize: 27 },
        contentStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="inscription" />
      <Stack.Screen name="connexion" />
      <Stack.Screen name="mot-de-passe-oublie" />
      <Stack.Screen
        name="reinitialiser-mot-de-passe"
        options={{ headerLeft: () => null, headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen name="rejoindre" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="creer-tournoi" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="tournoi/[id]/equipes" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="tournoi/[id]/calendrier" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="tournoi/[id]/saisie" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="tournoi/[id]/qrcode" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="suivi/[code]/index" options={{ headerTitle: 'OLYMPIAD' }} />
      <Stack.Screen name="profil" options={{ headerTitle: 'OLYMPIAD' }} />
    </Stack>
  );
}

export default function Layout() {
  const [policesChargees] = useFonts({
    BebasNeue_400Regular,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  if (!policesChargees) return <View style={{ flex: 1, backgroundColor: '#0b0f18' }} />;

  return (
    <ThemeProvider>
      <NavigationThemee />
    </ThemeProvider>
  );
}
