# Visuels de la fiche Play Console — SPORTIMATCH

Règles Google revérifiées le 05/11/2026 (page d'aide « Add preview assets »).

## À téléverser

Emplacement : Accroître le nombre d'utilisateurs > Présence sur le Store > Fiche principale (langue choisie en haut de page).

| Emplacement de la console | Français (fr-FR) | Anglais (en-US) | Exigence Google |
|---|---|---|---|
| Icône de l'application | `01-logos/play-console/icone-512.png` | le même fichier | PNG 32 bits, 512 × 512, 1 024 Ko max : 415 Ko |
| Image de présentation | `02-banniere/banniere-1024x500-fr.png` | `02-banniere/banniere-1024x500-en.png` | PNG 24 bits sans transparence, 1024 × 500 |
| Captures d'écran pour téléphone | `03-captures/fr/` (**à venir**) | `03-captures/en/` (**à venir**) | voir plus bas |

Texte alternatif de la bannière (140 caractères max) :
- FR : `Logo SPORTIMATCH en panneau LED. Organise ton tournoi. Tout le monde suit en direct.`
- EN : `SPORTIMATCH LED scoreboard logo. Run your tournament. Everyone follows live.`

## Logos (`01-logos/`)

Tous portent le nouveau logo validé. Le symbole à 5 barres et le mot OLYMPIAD ne restent que dans `archives/logo-olympiad/`.

- `play-console/` : icône à téléverser
- `logo/` : logo large, en PNG (1154 × 614) et en SVG
- `icone-app/` : icônes de l'app (`icon.png`, `adaptive-icon.png`, `favicon.png`)
- `icone-arrondie/` : icône à coins arrondis, en SVG et en PNG de 16 à 1024 px

Ce sont des copies : les originaux restent dans `assets/`, `docs/` et `store/`. Les SVG contiennent des milliers de cercles et un flou : utiliser les PNG pour l'affichage.

## Bannière (`02-banniere/`)

`banniere-source.html` permet de la refaire (ajouter `?lang=en` pour l'anglais). Elle remplace `store/banniere-1024x500*.png`, dont le logo était collé à gauche.

Conseil Google non obligatoire : éviter une image de marque trop proche de l'icône. Le logo y figure quand même, à la demande de Clément.

## Captures (`03-captures/`) : en attente

Elles doivent venir du build 9. `store/captures/` et `store/captures-en/` (refaites le 05/11, 1080 × 1920, conformes au format Google) viennent de l'aperçu web : ne pas les présenter comme issues du build 9.

**Source retenue : le rapport de pré-lancement de Google.** Il teste le bundle dès son import, sans attendre la validation, en général en moins d'une heure, sur de vrais appareils.
Emplacement : Tester et publier > Tests > Rapport de pré-lancement > détails du build 9 > onglet Captures d'écran.

Limites à contrôler :
- L'aide ne dit pas si les captures se téléchargent.
- Le robot choisit les écrans parcourus, et les appareils sont situés aux États-Unis : l'app peut y être en anglais.
- Sans identifiants de test (Paramètres du rapport), il ne voit pas les écrans organisateur. Ces identifiants sont à saisir par Clément.
- Aucun achat pendant le test : l'écran des offres peut être incomplet.

Écrans souhaités, par ordre d'intérêt :
1. Suivi public : classement
2. Suivi public : fil de la journée et résultats
3. Calendrier organisateur
4. Saisie d'un score
5. QR code du tournoi
6. Création du tournoi
7. Choix du sport
8. Offres, si les prix s'affichent

Contrôles avant de les ranger ici :
- Exigé : 2 à 8 captures, JPEG ou PNG 24 bits sans transparence, côté de 320 à 3840 px, grand côté au plus 2 fois le petit.
- Conseillé : au moins 4 captures, 1080 × 1920 au minimum (9:16). Un écran de 1080 × 2400 dépasse le rapport 2:1 et devra être recadré.
- Aucune donnée personnelle : l'écran « Mes tournois » affichait l'e-mail du compte démo, ne pas le garder.
- Ni le nom OLYMPIAD, ni la carte « Olympiade multisports ».
- Barre d'état sans notification ni opérateur.
