import { Alert, Platform } from 'react-native';

// Sur le web (aperçu), Alert.alert de React Native n'affiche rien : les
// confirmations (régénérer, supprimer…) et les messages d'erreur seraient
// perdus. On le remplace par les boîtes de dialogue du navigateur.
// Importé une fois dans app/_layout.js. Aucun effet sur iOS ni Android.
if (Platform.OS === 'web') {
  Alert.alert = (titre, message, boutons) => {
    const texte = [titre, message].filter(Boolean).join('\n\n');
    const liste = boutons || [];
    const annuler = liste.find((b) => b.style === 'cancel');
    const actions = liste.filter((b) => b !== annuler);

    // Simple message (aucun ou un seul bouton) : alerte puis action éventuelle
    if (actions.length <= 1 && !annuler) {
      window.alert(texte);
      actions[0]?.onPress?.();
      return;
    }
    // Confirmation : OK = la dernière action (celle mise en avant), Annuler = bouton cancel
    if (window.confirm(texte)) actions[actions.length - 1]?.onPress?.();
    else annuler?.onPress?.();
  };
}
