import * as Haptics from 'expo-haptics';

// Petits retours haptiques utilisés aux moments clés (score, suppression).
// Best-effort : le web et certains appareils n'ont pas de vibreur, donc
// chaque appel est silencieusement ignoré en cas d'erreur.

export function vibrerLeger() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function vibrerSucces() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function vibrerAttention() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
