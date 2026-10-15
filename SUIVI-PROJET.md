# OLYMPIAD — Suivi du projet

> Fichier tenu à jour automatiquement par Claude à chaque modification du projet
> (voir `CLAUDE.md` et le hook `.claude/hooks/verifier-suivi.sh`).

**Dernière mise à jour :** 15 octobre 2026

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

### Limite de 12 équipes appliquée par la base (27 septembre)
- Déclencheur SQL `limiter_equipes` : refuse la 13e équipe d'un tournoi (code `OLY01`), sauf s'il est débloqué par un Pass Tournoi ou si son organisateur principal est Pro.
- Abonnement Pro connu du serveur : table `abonnements_pro` (date de fin), remplie par la nouvelle Edge Function `synchroniser-pro` après vérification auprès de RevenueCat. L'app la déclenche dès que RevenueCat signale un Pro actif.
- Code commun des Edge Functions regroupé dans `supabase/functions/_shared/commun.ts` (`valider-pass-tournoi` réécrite pour l'utiliser, même comportement).
- Écran des équipes : si la base refuse, resynchronisation du Pro et nouvel essai, sinon ouverture de l'écran d'achat. Une création de tournoi refusée pour cette raison est annulée, et le brouillon est conservé.

### Ménage (27 septembre)
- `expo-doctor` : 14 paquets Expo alignés sur les versions correctives attendues par le SDK 57 ; 21/21 vérifications passent.
- `@expo/ngrok` déplacé dans les dépendances de développement.
- `npm audit fix` : failles « élevées » de `@xmldom/xmldom` (outil de build) corrigées. Restent 14 alertes « modérées » dans des dépendances internes d'Expo, corrigeables seulement en rétrogradant `expo-router` et `expo-sharing` : ignorées.
- README réécrit pour décrire l'app actuelle (fonctionnalités, structure, installation, Edge Functions, publication).

### Landing page (28 septembre)
- `docs/index.html`, publiée sur GitHub Pages : présentation, « Comment ça marche », fonctionnalités, sports, offres, aide (FAQ), contact, liens légaux.
- Identité de l'app (ambre, bleu nuit, Bebas Neue, Work Sans), thèmes clair et sombre, adaptée au mobile.
- Sans captures : aperçu de l'écran de suivi dessiné en HTML. Boutons « Bientôt sur l'App Store / Google Play ».
- Sert d'URL de support pour Apple : https://clementberthout-maker.github.io/olympiad/#aide

---

### Publication Google Play : démarrage (11 octobre)
- Compte Google Play Console créé et vérifié.
- App « OLYMPIAD » créée dans la Console (gratuite, Play App Signing).
- Premier build de production Android sur EAS (clé de signature gérée par Expo), sans clé RevenueCat : il sert à débloquer la création des produits dans la Console.
- Le build `versionCode` 2 a échoué : `package-lock.json` refusé par `npm ci` sur EAS (npm 10). Cause : `react-native-reanimated` (dépendance optionnelle d'`expo-router`) installé en version trop récente, avec un `react-native-worklets` incompatible avec Expo. Corrigé en déclarant `react-native-reanimated` 4.5.1 et `react-native-worklets` 0.10.1, et en alignant les paquets Expo (`expo-doctor` : 21/21). Build relancé : `versionCode` 3 réussi (fichier `.aab` disponible sur EAS).
- La fiche Play Console était liée au nom de package `com.clement.olympiad` : identifiant Android **et** iOS passé de `com.clementberthout.olympiad` à `com.clement.olympiad` dans `app.json` (et le README). Nouvelle clé de signature Android générée par EAS pour ce nom. Nouveau build réussi (`versionCode` 2, la numérotation repart de zéro pour ce nouvel identifiant).
- Ce build a été refusé par la Console : « mauvaise clé ». La fiche attend l'ancienne clé d'upload EAS (SHA1 `58:99:E4:63…`, celle de `com.clementberthout.olympiad`), pas la nouvelle (`AC:F1…`). En cours : télécharger l'ancienne clé dans `credentials.json` (`app.json` remis **temporairement** sur `com.clementberthout.olympiad` côté Android), puis la renvoyer chez EAS pour `com.clement.olympiad` et refaire le build. `credentials.json`, `credentials/`, `*.jks` et `*.keystore` ajoutés au `.gitignore`. Ancienne clé téléchargée dans `credentials.json` (`Build Credentials -tIFI9s9C1`) ; `app.json` remis sur `com.clement.olympiad`  ; clé envoyée chez EAS pour ce nom (configuration `gqma_0PWKl`, SHA1 `58:99…` vérifié). Build `versionCode` 3 réussi, signé avec la clé `58:99…` (vérifié). `credentials.json` et `credentials/` restent en local comme sauvegarde de la clé (ignorés par git).
- Release de test interne publiée (`versionCode` 3, `com.clement.olympiad`). Profil de paiement Google créé (particulier, nom sur les relevés `OLYMPIAD`).

### RevenueCat Android (12 octobre)
- Projet RevenueCat, app Google Play `com.clement.olympiad`, compte de service Google Cloud (`olympiad-revenuecat`, rôles Pub/Sub Admin et Monitoring Viewer) invité dans la Play Console avec les droits financiers et commandes.
- Produits importés, entitlement `pro`, offre `default` (Monthly, Annual, Lifetime) ; entitlement de démonstration du Test Store supprimé.
- Clé publique `goog_…` dans `.env` et dans les variables EAS ; build Android `versionCode` 4 réussi avec les achats actifs (clé `58:99…` et clé `goog_…` vérifiées dans le bundle), publié en test interne. Secret `REVENUECAT_SECRET_KEY` défini dans Supabase.

### Émulateur Android (13 octobre)
- Pas de téléphone Android sous la main : les tests Android se font sur l'émulateur `Pixel_7` (Android 16, image Google Play, Play Store activé).
- L'émulateur restait « offline » quand il était lancé depuis le SDK de `C:\Users\Clément…` (le « é » du chemin le bloque). Il démarre avec le SDK `C:\Android\Sdk` (variables `ANDROID_HOME` et `ANDROID_AVD_HOME` sur `C:\Android\…`). Android Studio pointe maintenant sur ce SDK.
- Écran noir avec le rendu graphique matériel (pilote Intel Iris Xe) : l'émulateur est réglé en rendu logiciel (`hw.gpu.mode=swiftshader_indirect`). Plus lent, mais l'affichage fonctionne.
- **Bloquant :** la connexion au compte Google échoue sur l'émulateur (« problem connecting to accounts.google.com », `ERR_CERT_AUTHORITY_INVALID`). L'analyse HTTPS d'AVG remplace les certificats par le sien, qu'Android refuse. AVG est protégé par un mot de passe inconnu : il faut ce mot de passe (ou la personne qui gère AVG) pour désactiver l'analyse HTTPS. Un relais local (Node) a été essayé sans succès : AVG intercepte aussi Node, y compris pour Supabase et RevenueCat. Autre piste : un vrai téléphone (emprunté, ou distant comme Samsung Remote Test Lab).

### Tests d'achat et fiche Google Play (14 octobre)
- Achats testés en test interne (version 4) : Pass Tournoi, Pro, restauration. Tout fonctionne, à recontrôler une fois.
- Textes de la fiche Play Store rédigés en français et en anglais (`store/fiche-google-play.md`), longueurs vérifiées.
- Icône Play Store 512 × 512 générée depuis `assets/icon.png`, coins remplis avec le fond de l'app (`store/icone-512.png`).
- Image de présentation 1024 × 500 générée avec les polices (Bebas Neue, Work Sans) et les couleurs de l'app (`store/banniere-1024x500.png`).
- Déclarations Google faites : classification du contenu, informations de connexion (compte démo avec Pro offert), public cible, sécurité des données.
- Aperçu web pour les captures d'écran publiques : configuration `olympiad-web-dev` dans `.claude/launch.json` (`expo start --web --port 8082 --offline`), `react-native-web` installé localement sans l'ajouter à `package.json` (relancer `npm install --no-save react-native-web@~0.21.0` après un `npm ci`).
- `lib/achats.js` : sur le web, plus de clé RevenueCat (`Platform.select`, mode gratuit). Avant, la clé Android y était envoyée et le SDK plantait au démarrage. Aucun effet sur iOS ni Android.

### Captures d'écran Play Store (15 octobre)
- Tournoi de démonstration renommé (« Tournoi U13 de printemps », équipes aux noms réalistes).
- 4 captures des écrans publics générées en 1080 × 1919, thème sombre, avec la version web de l'app pilotée par Edge (`puppeteer-core`, fenêtre 480 × 853) : `store/captures/1-classement.png`, `2-resultats.png`, `3-matchs-a-venir.png`, `4-accueil.png`.
- Vue spectateur : « Supprimer ce tournoi » devient « Retirer de mes tournois suivis », titre et bouton de confirmation alignés (`lib/traductions.js` FR et EN, `app/suivi/[code]/index.js`).
- `lib/identifiantsEnregistres.js` : sur le web, « se souvenir de moi » est inactif (pas de stockage sécurisé, `expo-secure-store` n'existe pas dans un navigateur). Avant, la page de connexion web plantait. Aucun effet sur iOS ni Android.
- `app/connexion.js` : sur le web, après une connexion réussie, l'app va directement à l'accueil (au lieu de la fenêtre « Enregistrer tes identifiants ? »).
- `lib/alertesWeb.js` (importé dans `app/_layout.js`) : sur le web, `Alert.alert` est remplacé par les boîtes de dialogue du navigateur (`confirm` / `alert`). Avant, toutes les confirmations (régénérer le calendrier, supprimer…) et les messages d'erreur étaient invisibles dans l'aperçu web. Aucun effet sur iOS ni Android.
- Fiche anglaise : image de présentation `store/banniere-1024x500-en.png` et 7 captures avec l'app en anglais dans `store/captures-en/` (langue forcée par `olympiad:langue` dans le navigateur, remise à zéro ensuite).
- `components/RouePicker.js` : toucher une valeur la sélectionne (sur téléphone aussi), et sur le web la valeur est validée quand le défilement s'arrête. Avant, l'heure de départ ne pouvait pas être réglée dans l'aperçu web.
- 3 captures organisateur ajoutées (connexion faite par l'utilisateur dans une fenêtre Edge, captures par script) : `5-calendrier-organisateur.png`, `6-qrcode.png`, `7-choix-du-sport.png`. La capture « Mes tournois » n'est pas gardée, car elle affiche l'email du compte démo.
- Calendrier du tournoi démo régénéré (2 terrains, départ 9 h, samedi) avec les corrections web, et les 7 captures refaites. **Reste :** noms d'équipes sans accents (Etoile, Riviere, Vallee). Auparavant, les matchs s'affichaient « jeu. » de 11 h à 3 h du matin alors que le tournoi est le samedi 7 novembre. Les horaires semblent rester sur l'ancienne date (22 octobre, un jeudi) après le changement de date, et un seul terrain étire la journée. À vérifier : changer la date d'un tournoi devrait-il décaler ses matchs ?

### Signalement et traductions des phases (15 octobre)
- Suivi public : lien « Signaler ce tournoi » (e-mail prérempli vers l'adresse de contact avec le nom et le code du tournoi), au-dessus de « Retirer de mes tournois suivis ». Conditions d'utilisation, article 4, complétées (date du 15 octobre).
- Noms de phase traduits à l'affichage, sans toucher à la base (`lib/phases.js`, clés `phases.*` dans `lib/traductions.js`) : calendrier, vue grand écran, suivi public, saisie, export PDF.
- Horaire des matchs à venir sur une seule ligne en anglais ; couleur du badge de langue.
- Captures FR et EN refaites avec ces corrections (`store/captures/`, `store/captures-en/`).
- Commits `a7bcab8` et `7478da3` poussés sur GitHub (conditions d'utilisation à jour en ligne). Build Android `versionCode` 5 réussi avec toutes ces corrections (clé `58:99…`, clé RevenueCat et lien « Signaler » vérifiés dans le bundle), pour le test fermé.

### Préparation du test fermé (15 octobre)
- Guide pas à pas `store/test-ferme.md` : classification à refaire (B8b), testeurs de licence, piste Alpha, release du build 5, lien d'inscription, demande d'accès à la production, messages aux testeurs (FR, EN) et notes de version.
- Classification du contenu refaite avec « Oui » au signalement : résultat inchangé. Release Alpha du build 5 envoyée en examen avec la liste « TEST FERMÉ ».
- Réponses complètes au questionnaire de classification notées dans le guide (« Oui » au signalement, le reste inchangé depuis le 14/10).
- Section « Trouver les testeurs » ajoutée au guide : groupe Google, entourage, public cible (clubs), échanges entre développeurs, services payants en dernier recours.
- Pas de compte de service pour `eas submit` : le `.aab` du build 5 est importé à la main dans la Console.

### E-mails Supabase (15 octobre)
- Sans nom de domaine : envoi par le SMTP de Gmail (`smtp.gmail.com`, mot de passe d'application), qui passe les contrôles anti-spam contrairement à Brevo avec une adresse Gmail.
- Page `docs/compte-confirme.html` (FR, EN selon le navigateur) : retour après la confirmation d'inscription ou de changement d'adresse, message « Lien expiré » si Supabase renvoie une erreur, bouton `olympiad://connexion`. Avant, ces liens renvoyaient vers la Site URL par défaut (`localhost:3000`).
- Modèles d'e-mails bilingues aux couleurs de l'app (`supabase/emails/` : confirmation, mot de passe oublié, changement d'adresse) et guide de configuration (`supabase/emails/README.md` : SMTP, limite d'envoi, Site URL, URL de redirection `olympiad://**`, tests).
- Configuré dans Supabase par l'utilisateur : SMTP Gmail, Site URL, Redirect URLs (`olympiad://**`, `exp://**`, GitHub Pages), trois modèles d'e-mails.
- Testé dans l'aperçu web : e-mails reçus avec le bon modèle ; « Mot de passe oublié » mène à l'écran « Nouveau mot de passe » ; inscription confirmée puis connexion réussie (compte `+test`).
- Limite trouvée : le lien « Mot de passe oublié » ne marche qu'environ 5 minutes après la demande (erreur 422 ensuite). L'e-mail le dit maintenant ; code à 6 chiffres prévu au prochain build (D16c).
- Dans l'aperçu web, Supabase renvoie la confirmation d'inscription vers la page d'origine (`localhost`) si elle est autorisée ; sur téléphone, ce sera la Site URL (`compte-confirme.html`).

## 3. Ce qu'il reste à faire

Légende : `[ ]` à faire · `[x]` fait

### A. Code : obligatoire pour être accepté sur les stores
- [x] **A1. Suppression du compte dans l'application.** *Fait et testé le 27/09.* Apple l'exige, et Google demande aussi un lien web de suppression. Il faut une fonction côté serveur (fonction SQL ou Edge Function) qui supprime les tournois, la photo et le compte, plus un bouton dans « Mon profil ».
- [x] **A2. Liens légaux sur l'écran d'achat et dans le profil.** Apple exige, pour tout abonnement, un lien vers la politique de confidentialité et un vers les conditions d'utilisation. L'écran doit aussi indiquer le prix, la durée et le renouvellement automatique. *Fait le 27/09.*
- [x] **A3. Conditions d'utilisation.** *Rédigées et validées le 27/09 (`docs/conditions-utilisation.html`), liées dans l'app. À compléter avec l'éditeur si tu passes sous statut d'entreprise.*
- [x] **A4. `ios.bundleIdentifier` dans `app.json`.** Il manque (par exemple `com.clementberthout.olympiad`), et le build iOS ne peut pas se faire sans. *Fait le 27/09 ; identifiant changé le 11/10 en `com.clement.olympiad` (Android et iOS), pour correspondre à la fiche Play Console.*
- [x] **A5. Section « Mineurs » de la politique.** Il faudrait l'aligner avec la classification d'âge que tu déclareras sur les stores. *Fait le 27/09 : comptes réservés aux 15 ans et plus.*

### B. Code : fortement recommandé
- [x] **B6. Sécuriser le déblocage des tournois.** *Code fait le 27/09 (vérification à la demande par Edge Function plutôt que webhook). Migration SQL exécutée (déclencheur `proteger_debloque` vérifié actif) et Edge Function déployée le 27/09 (version 1, active). Secret `REVENUECAT_SECRET_KEY` défini le 12/10 ; reste à tester avec D15.* Aujourd'hui, l'application écrit elle-même `debloque = true`. Les règles d'accès permettent à un organisateur de modifier son tournoi, donc un utilisateur un peu technique pourrait se débloquer gratuitement en appelant la base directement. La solution : un webhook RevenueCat qui appelle une Edge Function Supabase, et interdire la modification de `debloque` par le client.
- [x] **B7. Faire respecter la limite de 12 équipes par la base de données.** *Fait le 27/09 : migration exécutée, Edge Functions déployées (`valider-pass-tournoi` v2, `synchroniser-pro` v1), limite testée dans l'app. Le Pro ne sera reconnu par le serveur qu'une fois `REVENUECAT_SECRET_KEY` défini (C11).* Elle n'est vérifiée que dans l'application (`equipes.js`).
- [x] **B8. Faire le ménage.** *Fait le 27/09.*
  - Déplacer `@expo/ngrok` dans les dépendances de développement.
  - Mettre le README à jour (sa liste « ce qu'il reste à faire » date du début du projet).
  - Relancer `npx expo-doctor`.
- [x] **B8c. Petits défauts vus sur les captures (15/10).** *Corrigés le 15/10 : noms de phase traduits à l'affichage (`lib/phases.js`, « Group A », « Semi-final »…, écrans et export PDF), horaire sur une ligne (`minWidth`), couleur du badge de langue (`components/BoutonLangue.js` ; sur téléphone c'est un drapeau emoji, les lettres n'apparaissent que sous Windows).*
  - Noms des poules enregistrés en français dans la base (`Poule A`, `app/tournoi/[id]/equipes.js:491`) : un utilisateur anglophone voit « Poule A » au lieu de « Group A ». Traduire à l'affichage (motif `Poule X`) ou enregistrer seulement la lettre.
  - En anglais, les horaires « Sat 12:45 PM » passent sur deux lignes dans « Matchs à venir » du suivi public.
  - Badge de langue « FR » de l'accueil presque illisible en thème sombre (texte foncé sur fond foncé).
- [x] **B8b. Signaler un contenu (règle Google sur le contenu généré par les utilisateurs).** *Le 15/10 : libellé spectateur « Supprimer ce tournoi » remplacé par « Retirer de mes tournois suivis » (il ne retirait que le tournoi de la liste du téléphone). Lien « Signaler ce tournoi » ajouté le 15/10 sur le suivi public (e-mail prérempli avec le nom et le code du tournoi, `signalerTournoi` dans `lib/liensLegaux.js`), et mentionné à l'article 4 des conditions d'utilisation (`docs/conditions-utilisation.html`, à publier sur GitHub Pages). **Après la mise à jour de l'app**, refaire le questionnaire de classification Google en répondant « Oui » à « possibilité de signaler ».* Dans le questionnaire de classification, le contenu partagé (nom du tournoi, équipes, scores saisis par l'organisateur) est déclaré comme source principale du contenu, et il n'existe pas de fonction pour bloquer ou signaler. Ajouter un lien « Signaler ce tournoi » sur l'écran de suivi public, qui ouvre un email vers l'adresse de contact avec le code du tournoi (et le mentionner dans les conditions d'utilisation). À livrer dans la version envoyée en test fermé.

### C. Comptes et configuration externes
- [ ] **C9. Comptes développeur :** *Google Play Console : fait et vérifié le 11/10. Reste Apple.* Apple Developer (99 $/an) et Google Play Console (25 $ une seule fois). Google impose aux nouveaux comptes personnels un test fermé d'au moins 12 testeurs pendant 14 jours avant la production.
- [ ] **C10. Produits à créer dans les deux stores :** *Google : profil de paiement (particulier) créé le 11/10 ; produits créés et actifs le 11/10 : `pass_tournoi` (option d'achat `achat`, rétrocompatible, contenu numérique) et `pro` (formules `mensuel` et `annuel`). Reste Apple.*
  - Pass Tournoi : achat unique **consommable** (un Pass par tournoi, rachetable ; RevenueCat consomme l'achat sur Android). Sur iOS : type « Consommable », pas « Non consommable ».
  - Pro : abonnement mensuel et annuel. Sur iOS, il faut un groupe d'abonnements ; sur Android, un seul produit avec deux formules.
- [ ] **C11. RevenueCat :** *Android fait le 12/10 : compte de service Google relié (2 vérifications sur 3 au vert, la validation des achats d'abonnement attend la propagation chez Google), entitlement `pro` (`pro:mensuel`, `pro:annuel`), offre `default` avec `$rc_monthly` → `pro:mensuel`, `$rc_annual` → `pro:annuel`, `$rc_lifetime` → `pass_tournoi` (consommable), clé `goog_…` dans `.env` et dans EAS (production, preview, development). Clé secrète `REVENUECAT_SECRET_KEY` (API v1) enregistrée dans Supabase le 12/10. Reste iOS.*
  - Relier les deux stores (clé API App Store Connect, compte de service Google).
  - Créer l'entitlement `pro` et une offre « current » avec trois packages : Lifetime, Monthly et Annual.
  - Mettre les clés dans `.env` et dans les variables d'environnement EAS (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).
  - Créer une clé secrète RevenueCat (API v1, `sk_...`) et l'enregistrer dans Supabase comme secret `REVENUECAT_SECRET_KEY` de l'Edge Function (voir B6).
- [ ] **C12. Supabase :**
  - Vérifier que toutes les migrations de `schema.sql` sont bien passées en production, jusqu'à `debloque`.
  - Configurer les URL de redirection pour l'app (`olympiad://`). *Préparé le 15/10 : Site URL `compte-confirme.html` et `olympiad://**`, voir `supabase/emails/README.md`. Page en ligne le 15/10 (commits poussés, vérifiée : « Adresse confirmée » et « Lien expiré »). Reste à saisir dans Supabase.*
  - Brancher un envoi d'emails SMTP personnalisé : le service d'emails par défaut est très limité en production. *Préparé le 15/10 : SMTP Gmail et modèles FR/EN dans `supabase/emails/`. Configuré et testé le 15/10 (inscription et mot de passe oublié, dans l'aperçu web). Reste : retirer `http://localhost:8083/**` des Redirect URLs, supprimer le compte `+test`, et vérifier le mot de passe oublié sur un vrai téléphone (premiers testeurs).*
- [x] **C13. Publier la politique de confidentialité :** activer GitHub Pages sur le dossier `/docs` (le dépôt doit être public, ou la page hébergée ailleurs) et noter l'adresse obtenue. *Fait : les pages sont en ligne sur https://clementberthout-maker.github.io/olympiad/ (`politique-confidentialite.html`, `conditions-utilisation.html`, `suppression-compte.html`). Le lien de suppression à déclarer à Google est `suppression-compte.html`.*

### D. Builds et tests
- [ ] **D14.** *Pas de téléphone Android : émulateur `Pixel_7` avec Play Store prêt le 13/10.* `eas build --profile development` sur un vrai téléphone. Les achats ne marchent pas dans Expo Go.
- [ ] **D15. Tester les achats :**
  - iOS : TestFlight avec un compte sandbox.
  - Android : piste de test interne avec des testeurs de licence. *Fait le 14/10 (version 4, testeur de licence) : les parcours d'achat fonctionnent, à recontrôler une fois. Reste iOS (TestFlight).*
  - Parcours à couvrir : Pass acheté sur un tournoi encore en brouillon, Pass sur un tournoi existant, Pro, restauration, et changement de téléphone.
- [ ] **D16. Tester l'application entière :** chaque sport, la phase finale, les co-organisateurs, l'export PDF, le QR code, la réinitialisation du mot de passe, les deux thèmes et les deux langues, sur iPhone et sur Android.
- [ ] **D16c. Mot de passe oublié par code (prochain build) :** le lien de réinitialisation n'est valable qu'environ 5 minutes et seulement sur l'appareil qui a fait la demande (PKCE, testé le 15/10). Le remplacer par un code à 6 chiffres saisi dans l'app (`{{ .Token }}`, `verifyOtp` type `recovery`). Détails dans `supabase/emails/README.md`.
- [ ] **D16b. Au prochain build (après les retours du test fermé) :** appliquer les mises à jour correctives signalées par Expo Doctor sur le build 5 (`npx expo install --fix` : expo 57.0.29, expo-constants 57.0.22, expo-linking 57.0.13, expo-router 57.0.27, expo-sharing 57.0.23), puis vérifier `npm ci` avec npm 10 avant de lancer le build. Avertissement seulement, le build 5 est gardé pour le test fermé.

### E. Fiches des stores
- [ ] **E17. Visuels :** captures d'écran (iPhone 6,7" et téléphone Android ; pas d'iPad, `supportsTablet` étant à `false`) et bannière Google de 1024×500. *Icône Google 512 × 512 et image de présentation 1024 × 500 prêtes le 14/10 (`store/icone-512.png`, `store/banniere-1024x500.png`). 4 captures des écrans publics (1080 × 1919, thème sombre) prêtes le 15/10 dans `store/captures/` ; restent des captures organisateur (création, saisie des scores) sur un téléphone, et les captures iPhone.* *Fiche Google Play terminée le 15/10 (FR et EN, icône, bannières, captures). Reste Apple.*
- [ ] **E18. Textes en français et en anglais :** nom, sous-titre, description et mots-clés. *Google Play : nom, description courte et complète rédigés le 14/10 en français et en anglais dans `store/fiche-google-play.md`, à relire. Reste Apple (sous-titre, mots-clés).* *Saisis dans la Play Console le 15/10.*
- [ ] **E19. Formulaires :** *Google, le 14/10 : politique de confidentialité, classification du contenu (envoyée : PEGI « ! », USK 12, ESRB Teen, IARC 12+, 14 au Brésil, relevés à cause du contenu partagé sans signalement, voir B8b), informations de connexion, public cible (13-15, 16-17, 18+, pas les enfants) et sécurité des données (7 types collectés, aucun partagé, chiffrés en transit, suppression du compte par lien) faits.*
  - App Privacy (Apple) et Data Safety (Google) : email, nom, photo et achats collectés ; pas de pistage ni de publicité.
  - Classification d'âge : répondre au questionnaire d'Apple et à celui de Google (IARC) selon le contenu réel (pas de violence, pas de contenu choquant ; noms d'équipes saisis par les utilisateurs et visibles avec le code du tournoi).
  - Public cible sur Google Play : 13-15 ans, 16-17 ans et 18 ans et plus (comptes dès 15 ans). Ne pas cocher de tranche de moins de 13 ans, pour ne pas relever du programme « Familles ».
  - Adresse de la politique de confidentialité et adresse de support. *Support : https://clementberthout-maker.github.io/olympiad/#aide ; marketing : https://clementberthout-maker.github.io/olympiad/*
- [ ] **E20. Compte de démonstration** *Google : créé le 14/10, Pro offert par RevenueCat (entitlement promotionnel `pro`), tournoi de démonstration, identifiants déclarés dans « Informations de connexion ». À réutiliser pour Apple.* pour les équipes de validation Apple et Google, avec un tournoi déjà rempli.

### F. Mise en ligne
- [ ] **F21.** `eas build --profile production --platform all`, puis `eas submit`.
- [ ] **F22.** Envoyer en validation. Apple répond en 1 à 3 jours en général. Chez Google, prévoir le test fermé de 14 jours si ton compte est concerné. *Google, prochaine étape : test fermé (canal Alpha) avec le build 5 (`olympiad-com.clement-5.aab`), au moins 12 testeurs pendant 14 jours.* *Étapes dans `store/test-ferme.md`.*
  - [ ] Recruter 15 à 20 testeurs sur Android (liste d'e-mails « TEST FERMÉ » créée le 15/10 avec 3 testeurs ; pistes dans `store/test-ferme.md`, section 2 bis).
  - [x] Refaire la classification du contenu (« Oui » au signalement, B8b). *Envoyée le 15/10 à 12 h 47 : classification inchangée (PEGI « ! », USK 12, ESRB Teen, IARC 12+, 14 au Brésil), cohérente avec les comptes dès 15 ans.*
  - [ ] Ajouter les testeurs comme testeurs de licence (sinon leurs achats sont réels).
  - [x] Piste Alpha : liste de testeurs, pays, release du build 5, envoi en examen. *Envoyé en examen le 15/10, en attente de validation par Google.*
  - [ ] Release validée : envoyer le lien d'inscription à 15-20 testeurs (12 minimum).
  - [ ] 14 jours avec 12 testeurs inscrits sans interruption, puis « Demander l'accès à la production ».
- [ ] **F22b. Landing page :** remplacer les boutons « Bientôt sur… » par les vrais liens des fiches App Store et Google Play, et ajouter des captures d'écran.
- [ ] **F23. Après la sortie :** surveiller les plantages (Sentry ou `expo-insights`, à ajouter si tu veux), les tableaux de bord RevenueCat et Supabase, et prévoir les mises à jour avec `eas update`.
- [ ] **F24. QR codes lisibles sans l'app (amélioration) :** aujourd'hui le QR code ouvre un lien `olympiad://…` qui ne fonctionne que si l'app est installée. Le faire pointer vers une page web qui ouvre l'app ou redirige vers le bon store (liens universels / App Links).

**Priorité conseillée :** commence par A1 à A4 (du code, sans dépendance extérieure) et, en parallèle, ouvre les comptes développeur (C9). La validation des comptes et le test fermé Google sont ce qui prend le plus de temps.

---

## 4. Journal des modifications

Une ligne par modification, la plus récente en haut.

| Date | Modification |
|------|--------------|
| 2026-10-13 | Émulateur Android `Pixel_7` (Play Store) prêt pour les tests, SDK sans accent `C:\Android\Sdk` |
| 2026-10-15 | E-mails Supabase configurés et testés (SMTP Gmail) ; lien « Mot de passe oublié » limité à 5 min, signalé dans l'e-mail (D16c) |
| 2026-10-15 | Commits poussés : `compte-confirme.html` en ligne sur GitHub Pages |
| 2026-10-15 | E-mails Supabase préparés : page `docs/compte-confirme.html`, modèles FR/EN et guide SMTP Gmail (`supabase/emails/`) |
| 2026-10-15 | Classification refaite (« Oui » au signalement, résultat inchangé) ; test fermé Alpha (build 5) envoyé en examen |
| 2026-10-15 | Réponses du questionnaire de classification notées dans `store/test-ferme.md` |
| 2026-10-15 | Liste de testeurs « TEST FERMÉ » créée dans la Play Console (3 adresses) |
| 2026-10-15 | Pistes pour recruter les testeurs du test fermé (`store/test-ferme.md`) |
| 2026-10-15 | Guide du test fermé Google Play (`store/test-ferme.md`) et sous-étapes dans F22 |
| 2026-10-15 | Fiche Google Play terminée (FR, EN) ; prochaine étape : test fermé |
| 2026-10-15 | Build 5 gardé pour le test fermé ; mises à jour Expo reportées au prochain build (D16b) |
| 2026-10-15 | Commits poussés sur GitHub ; build Android `versionCode` 5 réussi |
| 2026-10-15 | Lien « Signaler ce tournoi » (B8b), noms de phase traduits, horaires et badge de langue (B8c), conditions d'utilisation art. 4 ; captures FR et EN refaites |
| 2026-10-15 | Fiche anglaise : bannière et 7 captures en anglais (`store/captures-en/`) ; étape B8c (petits défauts d'affichage) |
| 2026-10-15 | Captures Play Store refaites après régénération du calendrier démo (7 dans `store/captures/`, liste mise à jour dans `store/fiche-google-play.md`) |
| 2026-10-15 | Aperçu web : boîtes de dialogue (`lib/alertesWeb.js`) et roue des heures cliquable (`components/RouePicker.js`) |
| 2026-10-15 | Connexion web : accès direct à l'accueil (`app/connexion.js`) ; 3 captures organisateur |
| 2026-10-15 | Page de connexion web réparée (`lib/identifiantsEnregistres.js`, identifiants non mémorisés sur le web) |
| 2026-10-15 | Captures Play Store des écrans publics (`store/captures/`) ; libellé spectateur « Retirer de mes tournois suivis » (FR, EN) |
| 2026-10-14 | Aperçu web (`olympiad-web-dev`) et correctif RevenueCat sur le web (`lib/achats.js`) |
| 2026-10-14 | Image de présentation Google Play 1024 × 500 (`store/banniere-1024x500.png`) |
| 2026-10-14 | Formulaires Google « Cible » et « Sécurité des données » enregistrés |
| 2026-10-14 | Compte de démonstration (Pro offert) et informations de connexion déclarés à Google ; classification du contenu envoyée |
| 2026-10-14 | Classification du contenu Google en cours ; ajout de l'étape B8b (lien « Signaler ce tournoi ») |
| 2026-10-14 | Textes de la fiche Google Play (FR, EN) et icône 512 px dans `store/` |
| 2026-10-14 | Achats testés sur Android en test interne (Pass, Pro, restauration) |
| 2026-10-12 | Secret `REVENUECAT_SECRET_KEY` défini dans Supabase ; version 4 publiée en test interne |
| 2026-10-12 | RevenueCat Android configuré (compte de service, entitlement `pro`, offre `default`), clé publique dans EAS ; build Android `versionCode` 4 lancé |
| 2026-10-11 | Produits Google Play créés : `pass_tournoi`, `pro` (`mensuel`, `annuel`) |
| 2026-10-11 | Test interne Google Play publié, profil de paiement créé ; Pass Tournoi noté comme consommable |
| 2026-10-11 | Clé de signature : ancienne clé d'upload rattachée à `com.clement.olympiad` ; fichiers de clés ignorés par git |
| 2026-10-11 | Identifiant Android et iOS : `com.clement.olympiad` (celui enregistré dans la Play Console) |
| 2026-10-11 | Dépendances : reanimated et worklets déclarés aux versions du SDK 57, paquets Expo alignés (build EAS qui échouait sur `npm ci`) |
| 2026-10-11 | Compte Google Play vérifié, app créée dans la Console, premier build Android de production lancé sur EAS |
| 2026-09-28 | Landing page `docs/index.html` (présentation, offres, aide, contact) ; URL de support Apple |
| 2026-09-27 | Ménage (B8) : paquets Expo alignés, `@expo/ngrok` en dev, `npm audit fix`, README réécrit |
| 2026-09-27 | Limite de 12 équipes appliquée par la base, abonnement Pro synchronisé côté serveur (B7) |
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
