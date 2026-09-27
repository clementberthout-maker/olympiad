# OLYMPIAD

Application mobile (iOS et Android) pour organiser des tournois sportifs
amateurs : l'organisateur crée son tournoi, ajoute les équipes et génère le
calendrier, puis saisit les scores au bord du terrain. Les équipes et les
spectateurs suivent les résultats en direct avec un code ou un QR code, sans
compte.

> L'état d'avancement du projet et les étapes restantes avant la mise en
> ligne sont suivis dans [SUIVI-PROJET.md](SUIVI-PROJET.md).

## Fonctionnalités

- 5 sports (football, rugby, handball, basket, tennis), chacun avec son
  barème et son vocabulaire
- Formats poules, élimination directe ou mixte ; génération du calendrier
  par journées et par terrain ; phase finale avec exempts, tirs au but et
  match pour la 3e place
- Saisie des scores, classement de poule détaillé, suivi public en temps réel
- QR code par tournoi, vue grand écran, export PDF du programme
- Co-organisateurs avec droits par personne
- Comptes organisateurs (dès 15 ans), photo de profil, mot de passe oublié,
  suppression du compte
- Thème clair / sombre, français / anglais
- Freemium : gratuit jusqu'à 12 équipes par tournoi ; **Pass Tournoi**
  (achat unique, un tournoi) ; **Pro** (abonnement, tous les tournois)

## Technique

| Élément | Choix |
|---|---|
| Application | Expo SDK 57, React Native, expo-router (JavaScript) |
| Backend | Supabase : Postgres + RLS, authentification, stockage, temps réel |
| Achats | RevenueCat (`react-native-purchases`) |
| Vérification des achats | Edge Functions Supabase (Deno) |
| Builds | EAS Build / EAS Submit |
| Pages légales | GitHub Pages, dossier `docs/` |

## Structure

```
app/                          Écrans (expo-router)
  index.js                    Accueil
  choisir-sport.js, creer-tournoi.js
                              Parcours de création d'un tournoi
  tournoi/[id]/equipes.js     Équipes et réglages (organisateur)
  tournoi/[id]/calendrier.js  Calendrier, classement, phases suivantes
  tournoi/[id]/saisie.js      Saisie d'un score
  tournoi/[id]/co-organisateurs.js, qrcode.js, affichage.js
  suivi/[code]/index.js       Suivi public (équipes, spectateurs)
  paywall.js                  Écran d'achat (Pass Tournoi, Pro)
  profil.js, inscription.js, connexion.js, ...
components/                   Composants réutilisés
lib/
  supabase.js                 Client Supabase (URL et clé publique)
  achats.js                   RevenueCat : statut Pro, achats, déblocage
  generation.js, classement.js
                              Calendrier et classements
  traductions.js              Textes FR / EN
  liensLegaux.js              Adresses des pages légales
supabase/
  schema.sql                  Schéma et migrations, dans l'ordre
  functions/                  Edge Functions (Deno)
    _shared/commun.ts         Code commun (auth, RevenueCat)
    valider-pass-tournoi/     Applique un Pass Tournoi acheté à un tournoi
    synchroniser-pro/         Enregistre l'abonnement Pro côté serveur
docs/                         Pages légales publiées sur GitHub Pages
SUIVI-PROJET.md               Suivi du projet (tenu à jour à chaque modification)
```

## Installation

Prérequis : Node.js, un projet Supabase, un compte Expo (EAS).

1. **Dépendances**

   ```
   npm install
   ```

2. **Supabase**
   - Exécuter `supabase/schema.sql` dans le SQL Editor. Le fichier est
     une suite de migrations, à passer dans l'ordre ; sur un projet
     existant, n'exécuter que les nouvelles.
   - L'URL du projet et la clé publique sont dans `lib/supabase.js`.
   - Déployer les Edge Functions (après `npx supabase login`) :

     ```
     npx supabase functions deploy --project-ref <ref-du-projet>
     ```

   - Définir leur secret `REVENUECAT_SECRET_KEY` (clé secrète RevenueCat
     API v1, `sk_...`) dans Edge Functions > Secrets.

3. **RevenueCat** : copier `.env.example` en `.env` et y mettre les clés
   publiques iOS et Android (voir `lib/achats.js`). Sans clé, l'app
   reste en mode gratuit.

## Lancer l'application

```
npx expo start
```

Expo Go suffit pour la plupart des écrans. Les achats intégrés
nécessitent un build de développement :

```
eas build --profile development
```

## Publier

```
eas build --profile production --platform all
eas submit --platform all
```

Identifiant de l'app (iOS et Android) : `com.clementberthout.olympiad`.

## Pages légales

Publiées sur https://clementberthout-maker.github.io/olympiad/ depuis
`docs/` : politique de confidentialité, conditions d'utilisation,
suppression du compte.
