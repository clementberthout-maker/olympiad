import Svg, { Rect } from 'react-native-svg';

// Symbole OLYMPIAD : 5 barres verticales, cf. OLYMPIAD Logo Assets/README.md.
// Toujours ambre (#ebb517), lisible sur fond sombre comme sur fond clair.
export default function LogoMarque({ taille = 40 }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 100 100">
      <Rect x="18" y="26" width="8" height="48" rx="2" fill="#ebb517" opacity="0.28" />
      <Rect x="32" y="26" width="8" height="48" rx="2" fill="#ebb517" opacity="0.6" />
      <Rect x="46" y="26" width="8" height="48" rx="2" fill="#ebb517" opacity="1" />
      <Rect x="60" y="26" width="8" height="48" rx="2" fill="#ebb517" opacity="0.6" />
      <Rect x="74" y="26" width="8" height="48" rx="2" fill="#ebb517" opacity="0.28" />
    </Svg>
  );
}
