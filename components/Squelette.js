import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

// Barre grise pulsante utilisée comme état de chargement, à la place d'un
// écran blanc ou d'un simple texte "Chargement…".
export default function Squelette({ width = '100%', height = 14, radius = 6, style }) {
  const { couleurs } = useTheme();
  const opacite = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacite, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [opacite]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: couleurs.surface2, opacity: opacite },
        style,
      ]}
    />
  );
}
