# Intro 3D du site (validée, mise de côté)

Animation d'ouverture du site OLYMPIAD, **validée le 15 octobre 2026** puis
retirée du site à la demande, pour être remise en ligne plus tard. **Ne plus
la modifier** : elle est conservée telle qu'elle a été validée.

## Ce que fait l'animation

Un seul plan-séquence en 3D temps réel (Three.js 0.160, WebGL), piloté par la
molette, sans coupure :

1. Vue plongeante sur un stade éclairé la nuit : tribunes et foule, rampe de
   projecteurs, faisceaux dans la brume, flashs, panneaux LED OLYMPIAD, ville
   autour. Titre « OLYMPIAD — Ce soir, le stade est à toi. » et « Fais défiler ».
2. Descente vers le rond central, où un organisateur travaille à un bureau.
3. Passage derrière lui (légende « Au centre du terrain, l'organisateur prépare
   son tournoi. »), puis par-dessus son épaule.
4. Zoom dans l'écran de son portable, qui affiche la vraie page d'accueil (la
   page chargée dans un iframe `?ecran=1`, posée en CSS 3D sur l'écran). Quand
   l'écran remplit la fenêtre, l'intro laisse place au site au pixel près
   (fondu sur mobile). Bouton « Passer l'intro ».

Détails techniques : textures dessinées dans le code (pelouse, foule, LED,
façade), HDRI de nuit et textures PBR Poly Haven (CC0), modèles 3D Poly Haven
(carnets, plante), avatar humain Microsoft Rocketbox (MIT) posé assis au
clavier par cinématique inverse, occlusion ambiante (GTAO) et halo (bloom).
Licences : `assets/3d/LICENCE.md`.

## Contenu de ce dossier

| Élément | Rôle | Destination pour la restaurer |
|---|---|---|
| `intro3d.js` | Toute la scène 3D et la caméra | `docs/intro3d.js` |
| `assets/3d/` | HDRI, textures, modèles, personnage (≈ 14 Mo) | `docs/assets/3d/` |
| `extraits/index-head.html` | Détection du mode `?ecran=1` | dans le `<script>` du `<head>` de `docs/index.html` |
| `extraits/index-intro.html` | Calque de l'intro, bouton, espace de défilement | `docs/index.html`, juste avant `<div id="accueil"></div>` |
| `extraits/index-scripts.html` | Carte d'import Three.js et script module | `docs/index.html`, après `<script src="site.js" defer></script>` |
| `extraits/site.css` | Styles de l'intro | à la fin de `docs/site.css` |
| `extraits/site-js.md` | Traductions anglaises et rafraîchissement de l'écran | dans `docs/site.js` (voir le fichier) |

## Remettre l'intro en ligne

1. Copier `intro3d.js` dans `docs/` et `assets/3d/` dans `docs/assets/3d/`.
2. Coller les trois extraits HTML, l'extrait CSS et les ajouts de `site-js.md`
   aux endroits indiqués.
3. Aperçu local : `node .claude/serveur-site.js`, puis http://localhost:5500,
   en partant du haut de la page.
4. Tester : ordinateur et téléphone, thème clair et sombre, français et
   anglais, arrivée sur le site (l'écran du portable ne doit pas rester affiché).
