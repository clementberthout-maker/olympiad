import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { LangueProvider } from '../lib/LangueContext';
import { POLICE_TITRE } from '../lib/theme';
import LogoMarque from '../components/LogoMarque';
import BoutonRetour from '../components/BoutonRetour';

function TitreEnTete({ couleurs }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <LogoMarque taille={22} />
      <Text style={{ fontFamily: POLICE_TITRE, color: couleurs.texte, fontSize: 22 }}>OLYMPIAD</Text>
    </View>
  );
}

function NavigationThemee() {
  const { couleurs } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitle: () => <TitreEnTete couleurs={couleurs} />,
        headerLeft: ({ canGoBack }) => <BoutonRetour canGoBack={canGoBack} />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: couleurs.fond },
        headerTintColor: couleurs.accent,
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
      <Stack.Screen name="rejoindre" />
      <Stack.Screen name="choisir-sport" />
      <Stack.Screen name="creer-tournoi" />
      <Stack.Screen name="tournoi/[id]/equipes" />
      <Stack.Screen name="tournoi/[id]/calendrier" />
      <Stack.Screen name="tournoi/[id]/saisie" />
      <Stack.Screen name="tournoi/[id]/qrcode" />
      <Stack.Screen name="suivi/[code]/index" />
      <Stack.Screen name="profil" />
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
      <LangueProvider>
        <NavigationThemee />
      </LangueProvider>
    </ThemeProvider>
  );
}
