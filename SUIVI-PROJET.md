# OLYMPIAD — Suivi du projet

> Fichier tenu à jour automatiquement par Claude à chaque modification du projet
> (voir `CLAUDE.md` et le hook `.claude/hooks/verifier-suivi.sh`).

**Dernière mise à jour :** 27 septembre 2026

---

## 1. L'application en bref

OLYMPIAD sert à organiser des tournois sportifs amateurs. L'organisateur crée son tournoi, ajoute les équipes et génère le calendrier, puis saisit les scores au bord du terrain. Les équipes et les spectateurs suivent les résultats en direct avec un code ou un QR code.

**Technique :**
- **Application :** Expo SDK 57, React Native 0.86 et expo-router.
- **Serveur :** Supabase (base Postgres, connexion des comptes, stockage des photos, mises à jour en temps réel).
- **Paiements :** RevenueCat.
- **Code :** dépôt GitHub `clementberthout-maker/olympiad` et projet EAS créé sous le compte `clementberth`.

---

## 2. Ce qui a été fait

### Base de départ (19 août 2026)
- Écran d'accueil : créer un tournoi ou en rejoindre un avec un code.
- Création d'un tournoi : format et deux règles de départage.
- Comptes organisateurs avec email et mot de passe.
- Génération du calendrier (poules et premier tour à élimination directe).
- Saisie des résultats et suivi public en temps réel.
- Schéma de base de données avec des règles d'accès (RLS) sur chaque table.

### Phase finale et planning (19 août)
- Tours suivants générés automatiquement (demi-finale, finale), avec exempts et tirs au but en cas d'égalité.
- Poules organisées par journées, pour qu'une équipe n'enchaîne pas ses matchs.
- Affichage des matchs « par poule » ou « par terrain ».

### Profil et comptes (20 août)
- Photo de profil (stockage Supabase « avatars »).
- Écran « Mon profil » : nom, prénom, club, photo.
- Mot de passe oublié : lien envoyé par email qui rouvre l'application.
- L'ancien mot de passe est demandé pour en choisir un nouveau.
- Le calendrier se génère tout seul au premier enregistrement.
- Nettoyage des règles d'accès temporaires et d'un fichier inutilisé.

### QR code (20 août)
- Un QR code par tournoi (lien de suivi, partage, copie du code).
- Scan avec la caméra pour rejoindre un tournoi.
- Message clair si le code n'existe pas, et écran de secours pour une page introuvable.

### Identité visuelle (20 août)
- Thème clair et sombre, avec un accent ambre et un fond bleu nuit.
- Polices Bebas Neue pour les titres et Work Sans pour le texte.
- Logo complet dans `assets/logo/` (SVG et PNG de 16 à 1024 px).

### Classement et finales (20 août)
- Match pour la 3e place (optionnel) et affichage du podium.
- Classement de poule détaillé (victoires, nuls, défaites, marqués, encaissés, différence).
- Suppression d'une équipe possible même après la génération du calendrier.
- Corrections de boutons retour et recherche du code sans tenir compte des majuscules.

### Nouvelles fonctions (jusqu'au 7 septembre)
- 5 sports avec leur propre barème et vocabulaire : football, rugby, handball, basket et tennis (sets gagnants, simple ou double).
- Points bonus.
- Co-organisateurs : code d'invitation, droits différents par personne, écran « rejoindre comme organisateur ».
- Export PDF du programme.
- Vue grand écran (`affichage.js`).
- Application traduite en français et en anglais.
- Messages d'erreur gérés au même endroit.
- Identifiants enregistrés sur le téléphone, de façon chiffrée.
- Retours par vibrations et chargements animés.

### Monétisation (7 septembre)
- **Gratuit :** 12 équipes maximum par tournoi, sans export PDF ni co-organisateurs.
- **Pass Tournoi :** achat unique qui débloque un seul tournoi.
- **Pro :** abonnement mensuel ou annuel qui débloque tous les tournois.
- Écran d'achat avec « restaurer mes achats », section abonnement dans le profil, et colonne `debloque` dans la table des tournois.
- Configuration des builds (`eas.json`) et permissions caméra et photos.

### Dernière session (27 septembre)
- Correction Android : le Pass et le Pro sont maintenant reconnus par leur type d'offre, et non plus par l'identifiant du produit. Sur Android, cet identifiant contenait aussi le nom de la formule, donc la comparaison échouait toujours.
- Politique de confidentialité rédigée (`POLITIQUE-CONFIDENTIALITE.md`) et sa version web (`docs/politique-confidentialite.html`), à héberger sur GitHub Pages.
- Création de ce fichier de suivi, mis à jour automatiquement.

### Suppression du compte (27 septembre)
- Bouton « Supprimer mon compte » en bas de « Mon profil », avec double confirmation et rappel de résilier l'abonnement Pro dans le store.
- Fonction SQL `supprimer_mon_compte()` : supprime les accès co-organisateur, les tournois créés (et en cascade équipes, matchs, résultats), le profil et le compte. La photo est supprimée juste avant par l'app.
- Page web `docs/suppression-compte.html`, à donner à Google Play comme lien de suppression.
- Politique de confidentialité mise à jour (suppression depuis l'app).
- Migration exécutée sur Supabase et suppression testée avec un compte de test.

### Liens légaux et conditions d'utilisation (27 septembre)
- Écran d'achat : prix affiché par période (« / mois », « / an », « achat unique »), texte sur le renouvellement automatique et la résiliation, liens vers les conditions d'utilisation et la politique de confidentialité.
- « Mon profil » : nouvelle section « Informations légales » avec les deux liens.
- Adresses des pages légales centralisées dans `lib/liensLegaux.js`, liens dans `components/LiensLegaux.js`.
- Première version des conditions d'utilisation : `docs/conditions-utilisation.html`, relue et validée.

### Identifiant iOS (27 septembre)
- `app.json` : `ios.bundleIdentifier` = `com.clementberthout.olympiad` (le même qu'Android). Il ne pourra plus changer après la première publication.
- `ITSAppUsesNonExemptEncryption: false` : l'app n'utilise que le chiffrement standard (HTTPS), ce qui évite la question sur le chiffrement à chaque envoi à Apple.
- `supportsTablet: false` : l'app n'est pas pensée pour l'iPad pour l'instant, donc pas de captures iPad à fournir ni de test iPad par Apple.

### Âge minimum : 15 ans (27 septembre)
- Création d'un compte réservée aux 15 ans et plus (âge de la majorité numérique en France). Suivre un tournoi reste ouvert à tous, sans compte.
- Politique de confidentialité (section « Mineurs ») et conditions d'utilisation mises à jour.
- Écran d'inscription : mention « En créant un compte, tu confirmes avoir au moins 15 ans et accepter… », avec les liens légaux.

### Déblocage des tournois vérifié côté serveur (27 septembre)
- L'app ne peut plus marquer elle-même un tournoi comme payé : un déclencheur SQL (`proteger_debloque`) refuse toute modification de `debloque` venant de l'app.
- Nouvelle Edge Function `supabase/functions/valider-pass-tournoi` : vérifie l'achat du Pass Tournoi auprès de RevenueCat, puis débloque le tournoi. Chaque achat ne débloque qu'un seul tournoi (table `passes_tournoi_utilises`).
- Choix d'une vérification à la demande plutôt qu'un webhook : RevenueCat ne sait pas à quel tournoi un Pass est destiné.
- Écran d'achat : si l'achat réussit mais que le déblocage échoue, le Pass reste disponible, avec un nouveau lien « J'ai déjà un Pass Tournoi non utilisé ».
- Pass acheté pendant un brouillon : appliqué par le serveur juste après la création du tournoi.
- `typescript` et `tsconfig.json` ajoutés automatiquement par Expo (déclenché par le fichier `.ts` de l'Edge Function). L'app reste en JavaScript ; `supabase/functions` est exclu de `tsconfig.json`.

---

## 3. Ce qu'il reste à faire

Légende : `[ ]` à faire · `[x]` fait

### A. Code : obligatoire pour être accepté sur les stores
- [x] **A1. Suppression du compte dans l'application.** *Fait et testé le 27/09.* Apple l'exige, et Google demande aussi un lien web de suppression. Il faut une fonction côté serveur (fonction SQL ou Edge Function) qui supprime les tournois, la photo et le compte, plus un bouton dans « Mon profil ».
- [x] **A2. Liens légaux sur l'écran d'achat et dans le profil.** Apple exige, pour tout abonnement, un lien vers la politique de confidentialité et un vers les conditions d'utilisation. L'écran doit aussi indiquer le prix, la durée et le renouvellement automatique. *Fait le 27/09.*
- [x] **A3. Conditions d'utilisation.** *Rédigées et validées le 27/09 (`docs/conditions-utilisation.html`), liées dans l'app. À compléter avec l'éditeur si tu passes sous statut d'entreprise.*
- [x] **A4. `ios.bundleIdentifier` dans `app.json`.** Il manque (par exemple `com.clementberthout.olympiad`), et le build iOS ne peut pas se faire sans. *Fait le 27/09 : `com.clementberthout.olympiad`.*
- [x] **A5. Section « Mineurs » de la politique.** Il faudrait l'aligner avec la classification d'âge que tu déclareras sur les stores. *Fait le 27/09 : comptes réservés aux 15 ans et plus.*

### B. Code : fortement recommandé
- [x] **B6. Sécuriser le déblocage des tournois.** *Code fait le 27/09 (vérification à la demande par Edge Function plutôt que webhook). Migration SQL exécutée et Edge Function déployée le 27/09 (version 1, active). Reste à définir le secret `REVENUECAT_SECRET_KEY` (après C11), puis tester avec D15.* Aujourd'hui, l'application écrit elle-même `debloque = true`. Les règles d'accès permettent à un organisateur de modifier son tournoi, donc un utilisateur un peu technique pourrait se débloquer gratuitement en appelant la base directement. La solution : un webhook RevenueCat qui appelle une Edge Function Supabase, et interdire la modification de `debloque` par le client.
- [ ] **B7. Faire respecter la limite de 12 équipes par la base de données.** Elle n'est vérifiée que dans l'application (`equipes.js`).
- [ ] **B8. Faire le ménage.**
  - Déplacer `@expo/ngrok` dans les dépendances de développement.
  - Mettre le README à jour (sa liste « ce qu'il reste à faire » date du début du projet).
  - Relancer `npx expo-doctor`.

### C. Comptes et configuration externes
- [ ] **C9. Comptes développeur :** Apple Developer (99 $/an) et Google Play Console (25 $ une seule fois). Google impose aux nouveaux comptes personnels un test fermé d'au moins 12 testeurs pendant 14 jours avant la production.
- [ ] **C10. Produits à créer dans les deux stores :**
  - Pass Tournoi : achat unique (non consommable).
  - Pro : abonnement mensuel et annuel. Sur iOS, il faut un groupe d'abonnements ; sur Android, un seul produit avec deux formules.
- [ ] **C11. RevenueCat :**
  - Relier les deux stores (clé API App Store Connect, compte de service Google).
  - Créer l'entitlement `pro` et une offre « current » avec trois packages : Lifetime, Monthly et Annual.
  - Mettre les clés dans `.env` et dans les variables d'environnement EAS (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).
  - Créer une clé secrète RevenueCat (API v1, `sk_...`) et l'enregistrer dans Supabase comme secret `REVENUECAT_SECRET_KEY` de l'Edge Function (voir B6).
- [ ] **C12. Supabase :**
  - Vérifier que toutes les migrations de `schema.sql` sont bien passées en production, jusqu'à `debloque`.
  - Configurer les URL de redirection pour l'app (`olympiad://`).
  - Brancher un envoi d'emails SMTP personnalisé : le service d'emails par défaut est très limité en production.
- [x] **C13. Publier la politique de confidentialité :** activer GitHub Pages sur le dossier `/docs` (le dépôt doit être public, ou la page hébergée ailleurs) et noter l'adresse obtenue. *Fait : les pages sont en ligne sur https://clementberthout-maker.github.io/olympiad/ (`politique-confidentialite.html`, `conditions-utilisation.html`, `suppression-compte.html`). Le lien de suppression à déclarer à Google est `suppression-compte.html`.*

### D. Builds et tests
- [ ] **D14.** `eas build --profile development` sur un vrai téléphone. Les achats ne marchent pas dans Expo Go.
- [ ] **D15. Tester les achats :**
  - iOS : TestFlight avec un compte sandbox.
  - Android : piste de test interne avec des testeurs de licence.
  - Parcours à couvrir : Pass acheté sur un tournoi encore en brouillon, Pass sur un tournoi existant, Pro, restauration, et changement de téléphone.
- [ ] **D16. Tester l'application entière :** chaque sport, la phase finale, les co-organisateurs, l'export PDF, le QR code, la réinitialisation du mot de passe, les deux thèmes et les deux langues, sur iPhone et sur Android.

### E. Fiches des stores
- [ ] **E17. Visuels :** captures d'écran (iPhone 6,7" et téléphone Android ; pas d'iPad, `supportsTablet` étant à `false`) et bannière Google de 1024×500.
- [ ] **E18. Textes en français et en anglais :** nom, sous-titre, description et mots-clés.
- [ ] **E19. Formulaires :**
  - App Privacy (Apple) et Data Safety (Google) : email, nom, photo et achats collectés ; pas de pistage ni de publicité.
  - Classification d'âge : répondre au questionnaire d'Apple et à celui de Google (IARC) selon le contenu réel (pas de violence, pas de contenu choquant ; noms d'équipes saisis par les utilisateurs et visibles avec le code du tournoi).
  - Public cible sur Google Play : 13-15 ans, 16-17 ans et 18 ans et plus (comptes dès 15 ans). Ne pas cocher de tranche de moins de 13 ans, pour ne pas relever du programme « Familles ».
  - Adresse de la politique de confidentialité et adresse de support.
- [ ] **E20. Compte de démonstration** pour les équipes de validation Apple et Google, avec un tournoi déjà rempli.

### F. Mise en ligne
- [ ] **F21.** `eas build --profile production --platform all`, puis `eas submit`.
- [ ] **F22.** Envoyer en validation. Apple répond en 1 à 3 jours en général. Chez Google, prévoir le test fermé de 14 jours si ton compte est concerné.
- [ ] **F23. Après la sortie :** surveiller les plantages (Sentry ou `expo-insights`, à ajouter si tu veux), les tableaux de bord RevenueCat et Supabase, et prévoir les mises à jour avec `eas update`.

**Priorité conseillée :** commence par A1 à A4 (du code, sans dépendance extérieure) et, en parallèle, ouvre les comptes développeur (C9). La validation des comptes et le test fermé Google sont ce qui prend le plus de temps.

---

## 4. Journal des modifications

Une ligne par modification, la plus récente en haut.

| Date | Modification |
|------|--------------|
| 2026-09-27 | Cache du CLI Supabase (`supabase/.temp/`) retiré du dépôt et ignoré |
| 2026-09-27 | Migration B6 exécutée et Edge Function `valider-pass-tournoi` déployée sur Supabase |
| 2026-09-27 | Déblocage des tournois vérifié côté serveur : Edge Function `valider-pass-tournoi`, déclencheur SQL, lien « Pass non utilisé » (B6) |
| 2026-09-27 | Âge minimum de 15 ans : politique, conditions d'utilisation et écran d'inscription (A5) |
| 2026-09-27 | Identifiant iOS `com.clementberthout.olympiad` (A4), iPad désactivé ; conditions d'utilisation validées (A3) |
| 2026-09-27 | Liens légaux et mentions d'abonnement sur l'écran d'achat et le profil (A2), première version des conditions d'utilisation |
| 2026-09-27 | Suppression du compte depuis « Mon profil » (A1), page web de suppression, politique mise à jour |
| 2026-09-27 | `.gitattributes` : scripts `.sh` toujours en fins de ligne Unix (LF) |
| 2026-09-27 | Création de `SUIVI-PROJET.md`, de `CLAUDE.md` et du hook de mise à jour automatique |
| 2026-09-27 | Détection Pass Tournoi / Pro par type d'offre (correctif Android) ; politique de confidentialité |
| 2026-09-07 | Ignore `.idea/` |
| 2026-09-07 | Monétisation freemium (RevenueCat), co-organisateurs, export PDF, vue grand écran, 5 sports |
| 2026-08-21 | Sauvegarde avant passage sur Mac |
| 2026-08-20 | Match pour la 3e place, classement détaillé, corrections de navigation |
| 2026-08-20 | Nouvelle identité visuelle (thème B) |
| 2026-08-20 | Message clair pour un code d'accès introuvable |
| 2026-08-20 | Scan de QR code pour rejoindre un tournoi |
| 2026-08-20 | Mot de passe oublié, ancien mot de passe requis, QR code du tournoi |
| 2026-08-20 | Nettoyage des policies RLS temporaires et d'un fichier mort |
| 2026-08-20 | Photo de profil, génération du calendrier initial |
| 2026-08-19 | Phase finale à élimination directe, planning amélioré |
| 2026-08-19 | État initial du projet |
