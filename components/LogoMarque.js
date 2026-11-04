import { Image } from 'react-native';

// Logo SPORTIMATCH : panneau LED noir qui contient déjà le nom, lisible sur fond
// sombre comme sur fond clair. PNG exporté depuis docs/sportimatch-logo.svg
// (le SVG, avec ses milliers de cercles et son flou, est trop lourd pour l'app).
const RATIO = 1154 / 614;

export default function LogoMarque({ hauteur = 40 }) {
  return (
    <Image
      source={require('../assets/logo-sportimatch.png')}
      style={{ height: hauteur, width: hauteur * RATIO }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="SPORTIMATCH"
    />
  );
}
