import { createContext, useContext, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fr, en } from './traductions';

const CLE_LANGUE = 'olympiad:langue';
const LangueContext = createContext(null);

function langueDuTelephone() {
  const code = Localization.getLocales?.()[0]?.languageCode;
  return code === 'fr' ? 'fr' : 'en';
}

function resoudre(dictionnaire, cle) {
  return cle.split('.').reduce((objet, morceau) => (objet ? objet[morceau] : undefined), dictionnaire);
}

function interpoler(texte, params) {
  if (!params) return texte;
  return texte.replace(/\{\{(\w+)\}\}/g, (_, cle) => (params[cle] ?? ''));
}

// Fournit la langue (fr/en) à toute l'app : suit la langue du téléphone par
// défaut, mais l'utilisateur peut la forcer manuellement depuis son profil
// (choix mémorisé sur l'appareil) — même principe que lib/ThemeContext.js.
export function LangueProvider({ children }) {
  const [langue, setLangueState] = useState(langueDuTelephone());

  useEffect(() => {
    AsyncStorage.getItem(CLE_LANGUE).then((valeur) => {
      if (valeur === 'fr' || valeur === 'en') setLangueState(valeur);
    });
  }, []);

  function setLangue(valeur) {
    setLangueState(valeur);
    AsyncStorage.setItem(CLE_LANGUE, valeur);
  }

  function t(cle, params) {
    const dictionnaire = langue === 'en' ? en : fr;
    const valeur = resoudre(dictionnaire, cle) ?? resoudre(fr, cle) ?? cle;
    return typeof valeur === 'string' ? interpoler(valeur, params) : valeur;
  }

  return (
    <LangueContext.Provider value={{ langue, setLangue, t }}>
      {children}
    </LangueContext.Provider>
  );
}

export function useLangue() {
  const contexte = useContext(LangueContext);
  if (!contexte) throw new Error('useLangue doit être utilisé à l\'intérieur de LangueProvider');
  return contexte;
}
