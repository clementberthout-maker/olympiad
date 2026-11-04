# SPORTIMATCH — Assets logo

## Le logo
Panneau LED noir sur deux lignes : SPORTI en blanc, MATCH en jaune. Il contient déjà le nom : ne pas lui ajouter de texte à côté.

## Fichiers

### Sources vectorielles (copies de `docs/`)
- `sportimatch-logo.svg` : logo large, environ 1,88:1
- `icon.svg` : icône carrée à coins arrondis, 1024 × 1024

Ces SVG contiennent 2 000 à 3 400 cercles et un flou : ne pas les afficher tels quels dans l'app, utiliser un PNG.

### Exports de l'icône (coins arrondis, fond transparent aux coins)
- `icon-1024.png`, `icon-512.png`, `icon-192.png`, `icon-180.png`, `icon-128.png`, `icon-64.png`, `icon-32.png`, `icon-16.png`

En dessous de 64 px, le nom devient difficile à lire.

## Fichiers utilisés ailleurs (ne pas confondre)
- `assets/logo-sportimatch.png` : le logo affiché dans l'app (`components/LogoMarque.js`)
- `assets/icon.png`, `assets/adaptive-icon.png` : icônes de l'app, en carré plein sans coins arrondis, car iOS et Android appliquent leur propre masque
- `assets/favicon.png` : favicon de la version web
- `store/icone-512.png` : icône Google Play, en carré plein

## Ancien logo
Le symbole à 5 barres et le mot OLYMPIAD sont archivés dans `archives/logo-olympiad/`.
