# OLYMPIAD — Projet Expo (MVP)

Ce dossier contient le code de départ de l'application, correspondant aux
fichiers `01` à `05` du dossier de spécification et aux maquettes validées.

## Ce qui est déjà codé

- Écran d'accueil (créer un tournoi / rejoindre un tournoi par code)
- Création d'un tournoi avec cartes sélectionnables pour le format et les
  deux règles de départage
- Saisie des résultats (écran organisateur, bord de terrain)
- Écran de suivi unifié équipe/spectateur, avec classement calculé en
  temps réel et bandeau "prochain match" pour une équipe
- Schéma de base de données Supabase complet (`supabase/schema.sql`)

## Ce qu'il reste à faire pour avoir un MVP utilisable

- Écran organisateur pour ajouter les équipes à un tournoi
- Génération automatique du calendrier des matchs
- Association d'une équipe à son propre lien de suivi (pour activer le
  bandeau "prochain match" — actuellement désactivé par défaut)
- Authentification organisateur (email/mot de passe via Supabase Auth)

On avancera sur ces points ensemble à la prochaine étape.

## Installation (chez toi, avec Node.js installé)

### 1. Créer un compte et un projet Supabase (gratuit)

1. Va sur https://supabase.com et crée un compte.
2. Crée un nouveau projet (choisis une région proche de toi, ex : Europe).
3. Une fois le projet créé, va dans **SQL Editor** et colle le contenu du
   fichier `supabase/schema.sql`, puis exécute-le. Cela crée toutes les
   tables et les règles de sécurité.
4. Va dans **Project Settings > API** : note l'**URL du projet** et la
   clé **anon public**.

### 2. Configurer le projet

Ouvre `lib/supabase.js` et remplace :
```
const SUPABASE_URL = 'https://TON-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'TA_CLE_PUBLIQUE_ANON';
```
par tes propres valeurs récupérées à l'étape précédente.

### 3. Installer les dépendances

Dans un terminal, à la racine du dossier `olympiad-app` :
```
npm install
```

### 4. Lancer l'application

```
npx expo start
```

Un QR code apparaît dans le terminal. Installe l'application **Expo Go**
sur ton téléphone (iOS ou Android), puis scanne le code : l'application se
lance directement sur ton téléphone.

## Structure du projet

```
app/                      Écrans de l'application (routeur expo-router)
  index.js                Accueil
  creer-tournoi.js         Création d'un tournoi (organisateur)
  tournoi/[id]/saisie.js   Saisie d'un résultat (organisateur)
  suivi/[code]/index.js    Suivi du tournoi (équipe / spectateur)
components/
  CarteSelectionnable.js   Carte de sélection réutilisée (format, départages)
lib/
  supabase.js              Connexion au backend Supabase
  classement.js             Calcul du classement (barème 3/1/0, départages)
supabase/
  schema.sql                Schéma de base de données à exécuter sur Supabase
```
