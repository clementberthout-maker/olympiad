# OLYMPIAD — Assets logo

## Le symbole
Cinq bâtonnets verticaux, centrés dans un carré à coins arrondis (radius 22% — format icône iOS/Android standard). La barre centrale est pleine, les barres autour s'estompent en opacité (0.6 puis 0.28) vers l'extérieur. Évoque à la fois un panneau de score et un point culminant de classement/podium, sans figuration littérale.

## Couleurs
- Ambre/or (accent) : `#ebb517`
- Bleu nuit (fond sombre) : `#0b0f18`
- Blanc cassé (fond clair) : `#f2f5fb`
- Monochrome : `#000000` / `#ffffff`

## Typographie
Wordmark "OLYMPIAD" en **Bebas Neue** (Google Fonts), tout capitales, letter-spacing léger (~4px à cette taille). Charger la police dans le projet cible :
`https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap`

## Fichiers fournis

### Icône d'application (fond fixe navy)
- `icon.svg` — icône complète (carré rx22, fond navy, barres ambre), source vectorielle
- `icon-1024.png`, `icon-512.png`, `icon-192.png`, `icon-180.png`, `icon-128.png`, `icon-64.png`, `icon-32.png`, `icon-16.png` — rasters pour app stores / favicons / manifest

### Symbole seul (sans fond, pour usage flexible)
- `mark-amber.svg` — barres ambre, transparent
- `mark-mono-black.svg` / `mark-mono-white.svg` — versions noir/blanc pur

### Wordmark seul
- `wordmark-dark.svg` — fond navy, texte ambre
- `wordmark-light.svg` — fond blanc cassé, texte navy

### Lockup horizontal (symbole + wordmark)
- `lockup-dark.svg` — fond navy, symbole + texte ambre/blanc cassé
- `lockup-light.svg` — fond blanc cassé, symbole + texte navy
- `lockup-mono-black.svg` / `lockup-mono-white.svg` — versions monochromes

## Usage
- L'icône d'application (`icon.svg` + rasters) est fixe : toujours fond navy + barres ambre, quel que soit le thème de l'app.
- Le symbole et le wordmark s'inversent selon le fond : ambre sur navy, navy sur blanc cassé (contraste garanti dans les deux contextes).
- Zone de sécurité recommandée autour du symbole seul : ne pas recadrer plus près que les bords du viewBox (100×100 pour `mark-*.svg`).
- Les fichiers `.svg` sont vectoriels et éditables (couleurs, échelle) dans tout éditeur ou directement en code (React, HTML/CSS, etc.).
