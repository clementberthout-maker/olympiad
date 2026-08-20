import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COULEURS_CLAIR, COULEURS_SOMBRE } from './theme';

const CLE_THEME = 'olympiad:theme';
const ThemeContext = createContext(null);

// Fournit le thème (clair/sombre) à toute l'app : suit le réglage du
// téléphone par défaut, mais l'utilisateur peut le forcer manuellement
// (choix mémorisé sur l'appareil).
export function ThemeProvider({ children }) {
  const schemeSysteme = useColorScheme();
  const [theme, setThemeState] = useState(schemeSysteme === 'dark' ? 'sombre' : 'clair');

  useEffect(() => {
    AsyncStorage.getItem(CLE_THEME).then((valeur) => {
      if (valeur === 'clair' || valeur === 'sombre') setThemeState(valeur);
    });
  }, []);

  function setTheme(valeur) {
    setThemeState(valeur);
    AsyncStorage.setItem(CLE_THEME, valeur);
  }

  const couleurs = theme === 'sombre' ? COULEURS_SOMBRE : COULEURS_CLAIR;

  return (
    <ThemeContext.Provider value={{ theme, couleurs, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const contexte = useContext(ThemeContext);
  if (!contexte) throw new Error('useTheme doit être utilisé à l\'intérieur de ThemeProvider');
  return contexte;
}
