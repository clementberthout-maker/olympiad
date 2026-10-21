# OLYMPIAD — Suivi du projet

> Fichier tenu à jour automatiquement par Claude à chaque modification du projet
> (voir `CLAUDE.md` et le hook `.claude/hooks/verifier-suivi.sh`).

**Dernière mise à jour :** 21 octobre 2026

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
- Premier retour d'un testeur : « impossible de trouver l'URL » sur play.google.com, lien ouvert dans le navigateur de Messenger. Message aux testeurs corrigé (ouvrir dans Chrome) et section de dépannage ajoutée au guide.
- Release Alpha validée par Google le 15/10. Alerte « optimisation du code DEX » (R8 non activé) à corriger avant février 2027 (D16d).
- Pas de compte de service pour `eas submit` : le `.aab` du build 5 est importé à la main dans la Console.

### E-mails Supabase (15 octobre)
- Sans nom de domaine : envoi par le SMTP de Gmail (`smtp.gmail.com`, mot de passe d'application), qui passe les contrôles anti-spam contrairement à Brevo avec une adresse Gmail.
- Page `docs/compte-confirme.html` (FR, EN selon le navigateur) : retour après la confirmation d'inscription ou de changement d'adresse, message « Lien expiré » si Supabase renvoie une erreur, bouton `olympiad://connexion`. Avant, ces liens renvoyaient vers la Site URL par défaut (`localhost:3000`).
- Modèles d'e-mails bilingues aux couleurs de l'app (`supabase/emails/` : confirmation, mot de passe oublié, changement d'adresse) et guide de configuration (`supabase/emails/README.md` : SMTP, limite d'envoi, Site URL, URL de redirection `olympiad://**`, tests).
- Configuré dans Supabase par l'utilisateur : SMTP Gmail, Site URL, Redirect URLs (`olympiad://**`, `exp://**`, GitHub Pages), trois modèles d'e-mails.
- Testé dans l'aperçu web : e-mails reçus avec le bon modèle ; « Mot de passe oublié » mène à l'écran « Nouveau mot de passe » ; inscription confirmée puis connexion réussie (compte `+test`).
- Limite trouvée : le lien « Mot de passe oublié » ne marche qu'environ 5 minutes après la demande (erreur 422 ensuite). L'e-mail le dit maintenant ; code à 6 chiffres prévu au prochain build (D16c).
- « Supprimer mon compte » ne répond pas dans le navigateur intégré de Claude (il bloque `confirm()`) : ce n'est pas un bug de l'app. Compte de test supprimé, `localhost:8083` retiré des Redirect URLs.
- Dans l'aperçu web, Supabase renvoie la confirmation d'inscription vers la page d'origine (`localhost`) si elle est autorisée ; sur téléphone, ce sera la Site URL (`compte-confirme.html`).

### Budget (15 octobre)
- `BUDGET-PROJET.md` : dépenses déjà faites (Google Play, 25 $), dépenses obligatoires à venir (Apple 99 €/an, domaine `olympiad-app.com`, e-mail `support@`), options pour l'e-mail pro, services gratuits qui deviendront payants (Supabase Pro conseillé à la sortie), commissions, statut, marque, matériel de test, synthèse sur un an (≈ 135 € minimum, ≈ 420 € recommandé).
- Risque relevé : le terme « olympiade » est protégé en France (Code du sport, art. L141-5). À vérifier avant d'acheter le domaine ou de déposer la marque.

### Site internet (15 octobre)
- `docs/index.html` refait en site complet, avec la même identité que l'app (ambre, bleu nuit, Bebas Neue, Work Sans), styles et scripts séparés dans `docs/site.css` et `docs/site.js`. L'ancre `#aide` (URL de support Apple) est conservée.
- **Simulateur de l'app dans la page** : accueil, choix du sport, création (formats, départages, simple/double, sets gagnants), équipes (limite de 12, points bonus, terrains, poules, qualifiés, horaires et pause déjeuner, heure de fin estimée), calendrier par poule ou par terrain, saisie des scores (en cours/terminé, tirs au but, bonus), classements, phase finale, 3e place, podium, QR code, vue spectateur, grand écran, co-organisateurs et droits, export PDF (impression), paywall simulé, rejoindre par code ou comme organisateur, profil (photo, thème, langue, suppression), connexion, inscription, mot de passe oublié. Le moteur reprend `lib/generation.js` et `lib/classement.js`.
- Temps réel entre onglets (BroadcastChannel) : la vue spectateur ouverte depuis le QR code se met à jour dès qu'un score est saisi. Tout reste dans le navigateur (localStorage), rien n'est envoyé.
- Site interactif : téléphone animé avec scores en direct, 14 « fonctionnalités à découvrir » cochées au fil de l'essai, grille des fonctionnalités filtrable, onglets par sport (barème, départages), recherche dans l'aide, français/anglais, thème clair/sombre, adapté au mobile.
- **Intro 3D à la molette** (`archives/intro-3d/intro3d.js`, Three.js 0.160 chargé depuis jsDelivr) : un seul plan-séquence, sans coupure. Vue plongeante sur un stade éclairé la nuit (tribunes et foule, rampe de projecteurs, faisceaux dans la brume, panneaux LED OLYMPIAD, ville autour), descente vers le rond central, passage derrière l'organisateur assis à son bureau (chaise, portable, lampe, tasse, ombres portées), puis par-dessus son épaule jusque dans l'écran du portable. L'écran affiche la vraie page d'accueil (iframe `?ecran=1` posée en CSS 3D sur l'écran) ; quand il remplit la fenêtre, la page prend le relais au pixel près (fondu sur mobile). Textures dessinées dans le code (pelouse, foule, bois, cheveux), aucun fichier 3D à télécharger. Remplace l'intro SVG (`intro.js` supprimé). Sans WebGL, le site s'ouvre directement sur l'accueil.
- **Intro plus réaliste (ressources CC0 Poly Haven, `archives/intro-3d/assets/3d/`, ≈ 11 Mo, détail dans `LICENCE.md`)** : éclairage d'ambiance et reflets par un HDRI de nuit, textures PBR (plateau en noyer, chaise en cuir, sweat en polaire, jean), vrais modèles 3D de carnets et de plante grasse, occlusion ambiante (GTAO) de près, mains avec doigts. Chargées après le premier affichage. Poly Haven n'a ni portable moderne, ni chaise de bureau, ni personnage : ceux-ci restent modélisés dans le code.
- **Bug corrigé** : en arrivant sur le site, la page affichée dans l'écran du portable restait visible et figée par-dessus le site (visibilité forcée sur l'élément). La position de défilement est aussi relue à chaque image.
- **Organisateur réaliste** : avatar humain Microsoft Rocketbox (licence MIT, `archives/intro-3d/assets/3d/personnage/`, ≈ 1,7 Mo après conversion des textures TGA de 12 Mo en JPEG/PNG 1024 px). Posé assis os par os : buste penché vers l'écran, cuisses et mollets, cinématique inverse des bras jusqu'au clavier, doigts posés ; animation discrète (doigts qui tapent, respiration, tête). Chaise ajustée, deux éléments seulement du modèle de carnets. Le personnage dessiné reste en secours pendant le chargement.
- Aperçu local : `node .claude/serveur-site.js` (configuration `site-vitrine` dans `.claude/launch.json`). Vérifié dans le navigateur (desktop et mobile, FR/EN, clair/sombre).
- Modèle 3D de l'organisateur ajouté dans `archives/intro-3d/assets/3d/personnage/` (`organisateur.fbx` et textures `m017_*`, ≈ 1,7 Mo). Source et licence à noter dans `LICENCE.md`.

### Nouveau nom de l'application (15 octobre)
- Pistes étudiées pour remplacer OLYMPIAD (racine « olymp- » à éviter, art. L141-5 du Code du sport) : PODIAD, TOURNIAD, STADION, AGORIA…
- Premières vérifications sur STADION et AGORIA : les deux sont déjà pris. STADION est le nom d'une agence numérique sportive londonienne. AGORIA est celui de la fédération belge de la technologie, et aussi d'un DJ. Leurs domaines .app, .fr et .com sont enregistrés. Variantes proposées : STADIOS, AGORAE, AGORENA.
- Le 16/10, vérification de STADIOS, STADIONA et AGORAE (recherche web et registres des domaines). Aucune entreprise ni appli trouvée à ces noms exacts. **STADIONA** est la seule dont `stadiona.app` et `stadiona.fr` sont libres (`.com` pris). Les domaines .app, .fr et .com de STADIOS et d'AGORAE sont tous pris. Une agence londonienne s'appelle déjà « Stadion », donc STADIONA lui ressemble un peu. Marques INPI et EUIPO pas encore vérifiées.

### Intro 3D validée, puis retirée du site (15 octobre)
- **Validée** par Clément le 15 octobre dans sa dernière version (avatar Rocketbox). **Consigne : ne plus modifier l'animation 3D.**
- **Retirée entièrement du site** pour l'instant : plus aucun code, style, script Three.js ni ressource 3D dans `docs/` (le site s'ouvre directement sur l'accueil). Seule trace conservée : l'ancre vide `<div id="accueil">` en haut de la page, cible des logos.
- **Conservée à l'identique** dans `archives/intro-3d/` (hors GitHub Pages) : `intro3d.js`, ressources `assets/3d/` (≈ 14 Mo : HDRI, textures, modèles, personnage, licences CC0 et MIT), extraits exacts à remettre dans `docs/index.html`, `docs/site.css` et `docs/site.js`, et un `README.md` qui décrit l'animation et la procédure de remise en ligne.
- Rappel du déroulé validé : vue plongeante sur le stade de nuit → descente vers le rond central → derrière l'organisateur assis à son bureau → par-dessus son épaule → zoom dans l'écran du portable, qui affiche la vraie page d'accueil ; un seul plan, sans coupure, piloté par la molette, avec un bouton « Passer l'intro ».

### Accueil du site retouché (15 octobre)
- Badges « Bientôt disponible sur » App Store et Google Play remontés juste sous le grand titre, visibles dès l'ouverture (ordinateur et téléphone) et redessinés : couleurs inversées très contrastées, plus grands, étiquette ambre « Bientôt ».
- Chiffres du héros retirés (5 sports, 3 formats, 0 compte pour les spectateurs).
- Aide : barre de recherche retirée (questions affichées directement).

### Espace organisateur sur le site (15 octobre)
- Première approche abandonnée à la demande de Clément : publier l'app compilée pour le web (`docs/app/`). Tout a été retiré, et le code de l'app est revenu à son état d'origine (aucun changement pour iPhone et Android).
- **Espace organisateur conçu pour le site** : `docs/espace.html` + `docs/espace/` (`espace.js`, `espace.css`, `donnees.js`). Même D.A. que le site (en-tête, couleurs, polices, thème clair/sombre, FR/EN), avec des animations : transitions de pages, cartes en cascade, assistant à étapes, panneau de saisie coulissant, scores qui rebondissent, matchs mis à jour en surbrillance, podium qui monte, halo qui suit la souris.
- **Branché directement sur la base Supabase de l'app** (supabase-js 2.45.4 depuis jsDelivr, même clé publique que `lib/supabase.js`) : mêmes tables, mêmes règles d'accès, mêmes écritures que l'app (création du tournoi puis des équipes, des poules et des matchs, résultats `termine`, phases finales, invitations co-organisateurs). Le moteur de l'app est copié à l'identique dans `docs/espace/moteur/` (`generation.js`, `classement.js`, `sports.js`) : **à recopier si `lib/` change.**
- **Fonctions** : connexion, création de compte (15 ans et plus, liens légaux), mot de passe oublié (retour sur `espace.html?reinit=1`) ; tableau de bord des tournois (organisateur et co-organisateur, statut du jour) ; assistant de création en 4 étapes (sport, format et départages, équipes avec collage d'une liste, organisation et horaires, avec l'estimation de l'heure de fin) ; page tournoi avec onglets Matchs (par poule ou par terrain, saisie au clavier, tirs au but, points bonus), Classement (tableaux de poule, tableau final, podium), Équipes (ajout, retrait, régénération du calendrier) et Réglages (horaires, terrains, qualifiés, suppression) ; phase finale, tour suivant et 3e place ; QR code imprimable, grand écran, co-organisateurs avec leurs droits, export PDF (impression), profil (photo, informations, e-mail, mot de passe, suppression du compte) ; temps réel Supabase avec indicateur « EN DIRECT ».
- **Suivi public sans compte** : `espace.html#/suivi/<code>` (classement et calendrier en direct). Le QR code généré depuis le site pointe vers cette page web, alors que celui de l'app ouvre `olympiad://suivi/…` (voir F24).
- **Offres** : l'abonnement Pro est lu dans `abonnements_pro`. Le déblocage est lu dans `tournois.debloque`. Les achats restent dans l'app mobile, et l'espace l'explique (limite de 12 équipes, PDF, co-organisateurs).
- **Mode démo** : `espace.html?demo=1`, avec des données fictives dans le navigateur et le temps réel entre onglets. Il sert de découverte pour les visiteurs (bouton « Découvrir en démo » sur le site) et de banc d'essai.
- **Site** : bouton « Espace organisateur » dans l'en-tête, section « Ton tournoi, aussi sur ordinateur » (ouvrir, se connecter, démo), bouton dans la section finale.
- **Vérifié en local** : en mode démo, tout le parcours (création d'un tournoi de rugby à 8 équipes, saisie, phase finale, finale, podium, onglets, QR code, grand écran, suivi public mis à jour en direct dans un autre onglet, mobile) ; en mode réel, la page de connexion et une requête publique à la base. **Testé avec un vrai compte par Clément le 16/10 (en ligne) : tout fonctionne.**

### Navigation sur une seule page (16 octobre)
- Plus aucun nouvel onglet sur le site. Les liens légaux du simulateur et de l'espace organisateur, ainsi que les liens CNIL et Apple des pages légales, s'ouvrent dans la même page.
- Simulateur : « Vue spectateur » s'affiche directement dans le téléphone du simulateur. Le texte d'astuce est adapté (FR/EN).
- Espace organisateur : « Vue spectateur » s'ouvre dans la même page, avec un bouton « Retour à la gestion du tournoi ».
- Vérifié en local : un seul onglet ouvert, retour à la gestion avec tous les droits.

### Grand écran interactif et sélecteurs date/heure (16 octobre)
- Grand écran : un clic (ou Entrée) sur un match ouvre la saisie du score sans quitter le grand écran. Quand toutes les poules sont terminées, un bandeau propose de générer la phase finale (ou le tour suivant), directement depuis le grand écran.
- Plein écran appliqué à toute la page pour que la fenêtre de saisie reste visible par-dessus.
- Réglages et assistant de création : calendrier et sélecteur d'horaire refaits dans la D.A. (fenêtre animée, mois en glissé, aujourd'hui et week-ends marqués, colonnes heures/minutes défilantes avec aperçu), à la place des fenêtres du navigateur.
- Vérifié en local (mode démo) : saisie et génération des demi-finales depuis le grand écran, choix d'une date et d'un horaire enregistrés dans les réglages.
- Sélecteur de nombres dans la même D.A. (terrains, poules, qualifiés, sets, durée des matchs, mi-temps, pause entre matchs) : fenêtre animée avec boutons −/+, jauge et valeurs rapides, dans les réglages et dans l'assistant de création.
- Réglages : les horaires de la pause déjeuner sont verrouillés (grisés, avec un cadenas) tant que la pause déjeuner n'est pas activée.

### Test complet du site et de l'app (16 octobre)
- **Testé** : site vitrine (navigation, FAQ, filtres, sports, FR/EN, thèmes, mobile), simulateur (5 sports, 3 formats, limite de 12, achat simulé, phase finale, podium, QR, grand écran, co-organisateurs, PDF, spectateur, temps réel entre onglets, profil), espace organisateur en démo (tout le parcours) et connecté avec le compte démo, app en aperçu web connectée (création, saisie, tirs au but, phase finale, grand écran, QR, régénération, suppression, thème, langue). Temps réel vérifié entre l'app et le site dans les deux sens. Tournoi de test supprimé ; tournoi démo U13 non modifié.
- **Fonctionne** : génération du calendrier, classements et départages, limite de 12 (app, site, base), tirs au but obligatoires en cas d'égalité, verrouillage des poules après la phase finale, droits des co-organisateurs, PDF, QR, suivi public en direct, suppression avec confirmation. Moteur de `docs/espace/moteur/` identique à `lib/`. Aucune erreur JavaScript.
- **Pas testable ici** : achats et Pro dans l'app (RevenueCat désactivé sur le web), caméra, partage natif, e-mail « Signaler », vrai téléphone.
- Défauts trouvés : voir G25 à G33.

### Tirage de la phase finale corrigé (16 octobre)
- `lib/generation.js` : les qualifiés sont rangés par tête de série (tous les 1ers de poule, puis tous les 2es…). Exempts aux meilleures têtes de série, puis la meilleure affronte la moins bonne : avec 2 poules, A1–B2 et B1–A2. Deux équipes d'une même poule ne se croisent plus au premier tour quand c'est évitable.
- Tours suivants : les gagnants sont re-classés par tête de série (nouvelle fonction `qualifiesParTeteDeSerie`, passée à `genererTourSuivant`), donc deux 1ers de poule ne se retrouvent qu'en finale. Plus de tirage au sort à chaque tour. En élimination directe seule, le premier tour reste tiré au sort et les tours suivants gardent l'ordre des matchs.
- Aucune modification de la base : l'ordre du tableau se recalcule à partir des classements de poule.
- Appliqué dans l'app (`app/tournoi/[id]/calendrier.js`), dans l'espace (`docs/espace/moteur/generation.js` recopié, `espace.js`) et dans le simulateur (`docs/site.js`). Message du simulateur « Quart de finale générée » remplacé par « Tour généré : … ».
- Vérifié : script de test (2 400 tirages, 2 à 4 poules, avec exempts, jusqu'à la finale : tout passe), simulateur et espace en démo jusqu'à la finale, app compilée et calendrier ouvert sans erreur. **À livrer dans le prochain build** pour les téléphones.

### Calendrier en direct et horaires qui débordent (16 octobre)
- **G27** : le calendrier organisateur de l'app (`app/tournoi/[id]/calendrier.js`) s'abonne au temps réel tant qu'il est affiché (résultats et matchs du tournoi, rafales regroupées, résultats des autres tournois ignorés). Un score saisi ou effacé par un co-organisateur, ou depuis le site, apparaît sans quitter l'écran.
- **G28** : nouvelle fonction `finEstimeePremierePhase` (et `joursApresDebut`) dans `lib/generation.js`, recopiée dans `docs/espace/moteur/`. L'app affiche maintenant « Fin des poules vers HH:MM » au-dessus du bouton de création. Si les matchs finissent le lendemain, l'heure s'affiche en rouge avec un conseil, et une confirmation est demandée avant de créer ou de régénérer le calendrier. Traductions FR/EN ajoutées (`lib/traductions.js`). Dans l'espace (assistant de création) et dans le simulateur, l'estimation indique « le lendemain » en rouge (corrige aussi « fin des premier tour »).
- Vérifié dans l'aperçu web avec le compte démo : alerte à 22:15 le lendemain (12 équipes, 1 terrain, 60 min), création annulée sans rien écrire ; 8 équipes sur 2 terrains : « Fin des poules vers 16:15 », sans alerte ; score saisi puis effacé sur le site, visible aussitôt dans le calendrier de l'app. Tournoi de test supprimé. **À livrer dans le prochain build.**
- Pas changé : les durées par défaut de l'app (60 min et 15 min de pause), ni la phase finale générée tard le soir (seules les poules et le premier tour sont estimés).

### Scores « en cours » en direct (16 octobre)
- **Saisie** : choix « En cours / Terminé » dans l'app (`app/tournoi/[id]/saisie.js`) et dans l'espace (tiroir de saisie). « Terminé » reste le choix par défaut. Un score « en cours » est enregistré avec le statut `en_cours` (colonne déjà présente, aucune migration). Il ne compte ni au classement ni pour débloquer le tour suivant, et les tirs au but ne sont demandés qu'au statut « Terminé ».
- **Affichage** : nouveau badge « ● EN DIRECT » (`components/BadgeEnDirect.js`) avec le score provisoire sur le calendrier organisateur, le grand écran et le suivi public de l'app. Le suivi public a maintenant une section « En direct » en tête (onglets Classement, Aperçu et Calendrier). Le match en cours est retiré des « à venir », et le bandeau « Prochain match » montre le score en cours. Côté site, les cartes de match (gestion et suivi public) et le grand écran de l'espace affichent aussi le direct, matchs en cours en tête. Traductions FR/EN ajoutées.
- **Site** : la carte « Vue grand écran » précise que la version complète passe par l'espace organisateur sur ordinateur.
- Vérifié avec le compte démo : 1-0 « en cours » saisi dans l'app, visible en direct dans l'espace, la vue spectateur web et le grand écran, sans compter au classement. Passé à 2-0 « terminé » depuis le site : l'app se met à jour seule et le classement compte le match. 1-1 « en cours » saisi sur le site : section « En direct » dans le suivi de l'app et sur ses deux grands écrans. Tournoi de test supprimé. **À livrer dans le prochain build.**

### Équipes, co-organisateurs et tournois suivis (16 octobre)
- **G29** : une fois la phase à élimination directe lancée (ou dès la création d'un tournoi 100% élimination), retirer une équipe est refusé avec un message « Retrait impossible pour l'instant » qui invite à régénérer le calendrier (`app/tournoi/[id]/equipes.js`, `docs/espace/espace.js`, traductions FR/EN).
- **G30** : `rejoindre_comme_co_organisateur` (`supabase/schema.sql`) renvoie le tournoi sans rien ajouter quand c'est l'organisateur principal qui saisit son propre code (même règle en mode démo, `docs/espace/donnees.js`). Migration exécutée dans Supabase le 16/10, avec le ménage des lignes existantes.
- **G31** : un tournoi supprimé disparaît des « Tournois suivis ». Il est retiré quand son organisateur le supprime depuis l'app, et quand on ouvre un code qui n'existe plus (pas en cas de simple erreur réseau).
- Vérifié dans l'aperçu web : retrait refusé dans l'app et dans l'espace (démo), code fantôme retiré de la liste, tournoi supprimé retiré de la liste, organisateur non ajouté à son propre tournoi (démo). Tournoi de test supprimé. **À livrer dans le prochain build.**

### Petits défauts de l'app (16 octobre, G33)
- Code d'accès affiché en majuscules dans l'app (écran QR, copie, partage, e-mail « Signaler »), comme sur le site. Le champ « Rejoindre » passe aussi en majuscules (exemple « A3F9K2 »). La recherche ignorait déjà la casse : les anciens codes et liens fonctionnent toujours.
- Tutoiement partout dans l'app : « Tu fais partie de quelle équipe ? », « Ton prochain match », « Dernier résultat de ton équipe », retrait des tournois suivis, aide des horaires (`lib/traductions.js`).
- Match pour la 3e place activé par défaut à la création, dans l'app et dans l'espace, comme dans le simulateur : le podium est complet sans réglage. Il reste désactivable, et les tournois existants gardent leur réglage.
- Vérifié dans l'aperçu web : code « S2BA4A » sur l'écran QR, code tapé en minuscules converti et trouvé, textes tutoyés, « Oui » présélectionné pour la 3e place. **À livrer dans le prochain build.**

### Site, espace organisateur et pages légales (16 octobre, G32 et G33)
- **Site** : titre de l'onglet traduit en anglais ; téléphone de l'accueil entièrement traduit (titre, « 8 teams », « LIVE », onglets). Section Sports : plus de case « pts nul » pour le tennis. Simulateur : « Voir un tournoi en direct » et « Charger un tournoi de démo » demandent confirmation avant de remplacer le tournoi du visiteur (le tournoi de démo est marqué `demo`).
- **Espace organisateur** : message quand une équipe est déjà dans la liste (assistant et onglet Équipes) ; jours passés grisés dans le calendrier (la date déjà choisie reste sélectionnable) ; liens vers la politique de confidentialité et les conditions d'utilisation dans « Mon profil » ; lien « Signaler ce tournoi » sur la vue spectateur web (e-mail prérempli avec le nom et le code, comme dans l'app).
- **Bug corrigé** : deux lignes de code avaient perdu un « $ » lors d'un remplacement automatique (`$$(` devenu `$(`). Le choix « En cours / Terminé » de l'espace (publié avec G26) ne se mettait plus à jour visuellement, même si le statut choisi était bien enregistré. La même erreur sur les boutons de démo du site a été repérée et corrigée avant publication.
- **G32** : lien « ← Retour au site OLYMPIAD » en haut et en bas de `politique-confidentialite.html`, `conditions-utilisation.html` et `suppression-compte.html`. Politique de confidentialité mise à jour au 16/10 (HTML et `POLITIQUE-CONFIDENTIALITE.md`) : nouvelle section « Site internet et espace organisateur » (même compte et mêmes données, session et préférences gardées dans le navigateur, simulateur et démo qui restent dans le navigateur, aucune mesure d'audience ni publicité, GitHub Pages, Google Fonts, jsDelivr et cdnjs qui reçoivent l'adresse IP, signalement par e-mail) et prestataires du site ajoutés à la section 3.
- Vérifié dans le navigateur : titre et téléphone en anglais, barème du tennis, confirmation avant de remplacer un tournoi du simulateur, doublon signalé, jours passés désactivés, liens légaux du profil, lien « Signaler », bascule « En cours » de l'espace, liens de retour des trois pages légales. Pas de build nécessaire : en ligne dès la publication sur GitHub Pages.
- À envisager : héberger les polices sur le site plutôt que chez Google Fonts, pour ne plus transmettre l'adresse IP des visiteurs à Google.

### Préparation du build 6 (16 octobre)
- D16b : `npx expo install --fix` (expo 57.0.30, expo-linking 57.0.13, expo-router 57.0.28, expo-sharing 57.0.23, expo-constants 57.0.22 dans le lockfile). `expo-doctor` : 21/21. `npm ci` vérifié avec npm 10.9.9 (comme EAS) dans un dossier à part : OK. Bundle Android compilé en local (Hermes, 6,5 Mo) avec les nouveaux textes, la clé RevenueCat `goog_` présente.
- `npm audit` : 34 alertes (1 critique, 21 élevées), toutes dans les outils de compilation (Metro, Expo CLI, serveur de développement, signature de code), pas dans le code livré. Les correctifs proposés font revenir Expo ou React Native à de très anciennes versions : ignorés, comme le 27/09.
- `react-native-web` réinstallé sans l'ajouter à `package.json` (la mise à jour l'avait retiré), pour l'aperçu web.
- Contenu du build 6 : tirage de la phase finale (G25), calendrier en direct (G27), heure de fin et alerte de débordement (G28), scores « en cours » (G26), retrait d'équipe bloqué (G29), tournois supprimés retirés des suivis (G31), code en majuscules, tutoiement, 3e place par défaut (G33). Version affichée inchangée (1.0.0), `versionCode` 6 attribué par EAS. Pas de mot de passe oublié par code (D16c), gardé pour plus tard.
- Notes de version FR/EN du build 6 ajoutées à `store/test-ferme.md`.
- **Build 6 réussi sur EAS le 16/10** (`versionCode` 6, clé `gqma_0PWKl` / SHA1 `58:99…` comme le build 5, clé RevenueCat chargée depuis l'environnement production) : https://expo.dev/accounts/clementberth/projects/olympiad/builds/ad4cb98f-9c60-4227-bcfc-2f289842406d. **Reste** : importer le `.aab` dans la Play Console (test fermé, piste Alpha), coller les notes de version et envoyer en examen.

### Conformité légale du site (20 octobre)
- Audit : pas de cookie publicitaire ni de statistiques, seulement du stockage strictement nécessaire (connexion, thème, langue, démo), donc **pas de bandeau cookies à prévoir**. Règles d'accès (RLS) déjà sur toutes les tables.
- **Polices hébergées sur le site** (`docs/polices/`, Bebas Neue et Work Sans en TTF, licences OFL jointes) : plus aucun appel à Google Fonts, y compris pour l'export PDF de l'espace.
- **Nouvelle page `docs/mentions-legales.html`** : éditeur (personne physique, non professionnel, adresse non publiée selon l'art. 6-III-2 LCEN), directeur de la publication, hébergeurs (GitHub, Supabase), propriété intellectuelle, cookies, signalement. Liée depuis le pied du site (FR/EN), le profil du simulateur et de l'espace, la politique, les CGU et la page de suppression. L'app n'avait que les liens CGU et politique (« Informations légales » du profil).
- **Politique de confidentialité** (HTML et `POLITIQUE-CONFIDENTIALITE.md`, au 20/10) : section cookies précisée, Google Fonts retiré, durées de conservation détaillées (comptes inactifs supprimés après 3 ans avec avertissement 30 jours avant, e-mails gardés 1 an au plus, journaux techniques, achats, stockage du navigateur).
- **CGU** (au 20/10) : droit de rétractation (perte du délai de 14 jours pour un contenu numérique fourni immédiatement, art. L221-28 13°) et lien vers les mentions légales.
- Vérifié dans le navigateur : polices chargées depuis le site (aucune requête Google), page des mentions légales, liens dans le pied du site et le profil de l'espace.

### Suppression automatique des comptes inactifs (20 octobre)
- Migration « Suppression automatique des comptes inactifs » dans `supabase/schema.sql` : table `avertissements_inactivite` (date de l'avertissement, pour ne pas le renvoyer), fonctions réservées à la clé `service_role` (`comptes_a_avertir`, `noter_avertissement`, `comptes_a_supprimer`, `supprimer_compte_inactif`) et tâche `pg_cron` quotidienne à 3 h UTC qui appelle l'Edge Function par `pg_net`.
- Inactivité mesurée sur la plus récente de la création, de la dernière connexion et du dernier renouvellement de session : l'app garde la session ouverte, donc `last_sign_in_at` seul aurait fait supprimer des utilisateurs actifs.
- Avertissement à 3 ans moins 30 jours ; suppression à 3 ans, au plus tôt 30 jours après l'avertissement, et seulement sans aucune activité depuis. Une connexion annule l'avertissement.
- Suppression commune avec « Supprimer mon compte » (`supprimer_donnees_compte`, même comportement) ; la photo est retirée du bucket `avatars` par l'Edge Function.
- Nouvelle Edge Function `supabase/functions/comptes-inactifs` : supprime puis avertit (au plus 50 e-mails par nuit), e-mail FR/EN aux couleurs de l'app (`modele.ts`) envoyé par Gmail (port 465), mode `simulation` pour compter sans agir. Protégée par un secret partagé avec `pg_cron` (Vault).
- Relu : syntaxe de la fonction et rendu de l'e-mail vérifiés avec Node ; pas de test contre la vraie base (ni `deno` ni la CLI Supabase sur la machine).
- **Mis en place sur Supabase le 20/10** avec l'utilisateur : mot de passe d'application Gmail dédié, secrets `SMTP_USER`, `SMTP_PASSWORD`, `CRON_SECRET`, secrets Vault, migration exécutée (tâche `comptes-inactifs-quotidien` créée). Testé : simulation (0 compte à avertir ou supprimer) et appel réel par `pg_net` avec le secret de Vault (réponse 200, rien supprimé ni envoyé).
- Déploiement par la CLI impossible sur ce PC (`TransportError`) : l'antivirus inspecte les connexions HTTPS avec son propre certificat. Fonction déployée depuis l'éditeur du tableau de bord, en un seul fichier (`index.ts` + `modele.ts` + partie utile de `_shared/commun.ts`), vérification JWT désactivée. Pour Node, ajouter `--use-system-ca`.

### Security Advisor de Supabase (20 octobre)
- 0 erreur. Correctifs préparés dans `supabase/schema.sql` (à exécuter) : `search_path` fixé sur `proteger_debloque`, `EXECUTE` retiré aux fonctions de déclencheur (`gerer_nouvel_utilisateur`, `limiter_equipes`, `proteger_debloque`) et à `anon` sur `rejoindre_comme_co_organisateur`, lecture du bucket `avatars` par l'API limitée à sa propre photo (les adresses publiques des photos marchent toujours).
- Migration exécutée par Clément ; changement de photo testé avec son compte dans l'espace.
- **Retirer la photo** : la fonction n'existait ni dans l'app ni dans l'espace (ce n'était pas un effet de la migration). Ajoutée dans le profil de l'espace (lien sous le nom, confirmation, fichier supprimé du bucket et `photo_url` vidé), vérifiée en mode démo.
- Laissés volontairement, avec la raison notée dans le fichier : `a_le_droit` (évaluée par les policies pendant la lecture des spectateurs), fonctions voulues pour les connectés, `pg_net` dans `public`, table `avertissements_inactivite` sans policy, mots de passe piratés (plan Pro).

### Plusieurs terrains mieux utilisés (20 octobre)
- Constat : le moteur faisait déjà jouer un match par terrain en même temps, mais attendait la fin de chaque journée de poule avant la suivante, ce qui laissait des terrains vides (10 équipes, 2 poules, 3 terrains : 10 créneaux au lieu de 7). Et la finale passait après le match pour la 3e place, même avec 2 terrains.
- **Poules** (`lib/generation.js`, copie `docs/espace/moteur/generation.js` et démo `docs/site.js`) : chaque créneau est rempli avec autant de matchs que de terrains, en piochant dans l'ordre des journées. Les équipes qui se sont reposées passent d'abord ; une équipe peut enchaîner 2 matchs pour ne pas laisser un terrain vide, mais pas 3 si c'est évitable. 200 essais comparés à l'ancien plan, le moins coûteux gardé (durée d'abord, puis enchaînements). Exemples : 8 équipes / 2 poules / 3 terrains 6 → 5 créneaux, 9 équipes / 3 poules / 2 terrains 6 → 5, 12 équipes / 2 poules / 4 terrains 10 → 8. Avec une seule grande poule et beaucoup de terrains (5 équipes sur 2 terrains, 7 sur 3), le plan peut être un peu plus long qu'avant, pour éviter qu'une équipe joue 3 matchs ou plus d'affilée.
- **Finale et 3e place** : nouvelle fonction `genererFinaleEtTroisiemePlace`, au même horaire sur 2 terrains (sinon 3e place puis finale), utilisée par l'app (`calendrier.js`) et l'espace. La démo du site le faisait déjà.
- Vérifié : calendriers simulés avec Node (jamais une équipe sur 2 terrains en même temps, chaque rencontre une seule fois, pause déjeuner respectée), moteur de l'espace et page d'accueil chargés dans le navigateur sans erreur. App : à livrer au prochain build.

### Pass Tournoi limité dans le temps (20 octobre)
- Constat : un tournoi débloqué le restait pour toujours, et sa date restait modifiable. Un club pouvait donc renommer, redater et régénérer le même tournoi chaque année avec un seul Pass.
- **Nouvelle règle :** le Pass est valable jusqu'à 5 jours après la date du tournoi (inclus), et la date d'un tournoi débloqué ne peut plus changer. Le Pro n'est pas concerné.
- **Base** (`supabase/schema.sql`, migration « Pass Tournoi limité dans le temps », exécutée le 20/10) : `limiter_equipes` ne laisse passer la 13e équipe que si le Pass est encore valable ; nouveau déclencheur `proteger_date_tournoi` (code `OLY02`).
- **Edge Function** `valider-pass-tournoi` (redéployée le 20/10) : refuse d'appliquer un Pass à un tournoi passé depuis plus de 5 jours (`pass_expire`), sans consommer l'achat.
- **App** : `passActif`, `passExpire`, `finDuPass` dans `lib/achats.js` ; date figée dans « Modifier le nom et la date » ; l'écran d'achat masque le Pass sur un tournoi trop ancien ; nouveaux messages d'erreur ; textes du Pass et mentions d'achat complétés.
- **Espace web** : même règle (cadenas après expiration, badge « Débloqué » seulement si le Pass est valable, date verrouillée avec la date de fin du Pass), vérifié en mode démo.
- **Conditions d'utilisation** (article 3) complétées et publiées sur GitHub Pages avec le site le 20/10.
- **À livrer dans le prochain build** (noté en D16e).

### Offres proposées sur le site (20 octobre)
- **Espace organisateur** : quand un compte gratuit dépasse 12 équipes (ajout dans l'assistant, collage d'une liste, création du tournoi, onglet Équipes), le message rouge reste et une fenêtre « Passe à la vitesse supérieure » présente le Pass Tournoi et OLYMPIAD Pro. Choisir une offre affiche les étapes dans l'app (dans l'assistant, rappel qu'un Pass s'applique à un tournoi déjà créé). Le message rouge ne s'efface plus après un collage.
- **Accueil** : boutons « Commencer », « Choisir le Pass » et « Passer à Pro » sur les cartes des offres (toute la carte est cliquable). Le Pass et le Pro ouvrent une fenêtre dans la page : étapes d'achat dans l'app, l'offre vaut aussi dans l'espace web avec le même compte, badges des stores « Bientôt », liens vers la démo de l'espace et le simulateur.
- Le site n'encaisse rien : les achats restent dans l'app (App Store, Google Play via RevenueCat), conformément aux conditions d'utilisation. Vérifié en mode démo (FR, EN, téléphone).

### Prix de lancement (20 octobre)
- **Prix validés (TTC France) :** Pass Tournoi 9,99 €, Pro mensuel 14,99 €, Pro annuel « Saison » 59,99 € (≈ 5 €/mois, -67 %). Pas de pack, de Grand Pass ni d'offre structures au lancement. Le Pass garde sa portée (équipes illimitées, PDF, co-organisateurs, jusqu'à 5 jours après le tournoi). Revenu net par vente dans `BUDGET-PROJET.md`.
- **App** (`app/paywall.js`) : ordre Pass, Pro annuel, Pro mensuel ; l'annuel est encadré avec un badge « Saison · le plus avantageux » et une ligne « Soit X / mois, N % de moins que le mensuel », calculée à partir des prix du store (`pricePerMonthString`, `price`), aucun montant écrit en dur. Textes FR et EN dans `lib/traductions.js`. À livrer au prochain build.
- **Site** : prix affichés sur les cartes de l'accueil, dans le simulateur et dans la fenêtre des offres de l'espace, avec la mention « Prix TTC pour la France ; le prix exact dans ton pays est affiché dans l'application ». Vérifié en FR et EN sur le serveur local.
- **Conditions d'utilisation** (article 3) : prix TTC en France ajoutés. À publier avec le site (push).

### Build 7 pour le test fermé (20 octobre)
- expo-doctor 21/21. **Build 7 réussi sur EAS le 21/10** (`versionCode` 7, profil production, clé RevenueCat chargée depuis l'environnement production, même keystore `gqma_0PWKl`) : https://expo.dev/accounts/clementberth/projects/olympiad/builds/c94dd81a-0cdc-470f-9195-5970f6b080bf
- Contenu : terrains mieux utilisés (G34), Pass Tournoi limité dans le temps (B9, D16e), écran d'achat avec l'offre « Saison » et les prix de lancement (C10b).
- Le build 6 n'a jamais été importé dans la Play Console : remplacé par le build 7, qui contient tout son contenu. Notes de version FR/EN du build 7 (contenu des builds 6 et 7) dans `store/test-ferme.md`.
- **Importé dans la piste de test fermé (Alpha) et envoyé en examen le 21/10** (release `7 (1.0.0)`, notes FR/EN collées). Après validation : tester sur téléphone l'écran d'achat (9,99 €, 14,99 €, 59,99 €, badge « Saison ») et les points de D16e.

### Accès Data API explicite (21 octobre)
- Supabase n'accorde plus automatiquement l'accès Data API aux tables créées dans `public` à partir du 30/10/2026 (les tables existantes ne sont pas touchées). Bloc de `grant` ajouté à la fin de `supabase/schema.sql` pour les 11 tables (lecture pour `anon`, lecture/écriture pour `authenticated` et `service_role`), pour que le schéma reste utilisable si le projet est recréé. Sans effet sur le projet actuel ; la RLS reste le filtre. **Règle : toute nouvelle table reçoit ses `grant` dans la même migration.**

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

- [ ] **B9. Pass Tournoi limité dans le temps (20/10).** *Code fait le 20/10. Migration SQL exécutée et Edge Function `valider-pass-tournoi` redéployée le 20/10.* Reste : livrer l'app au prochain build (D16e). Conditions d'utilisation publiées le 20/10.

### C. Comptes et configuration externes
- [ ] **C9. Comptes développeur :** *Google Play Console : fait et vérifié le 11/10. Reste Apple.* Apple Developer (99 $/an) et Google Play Console (25 $ une seule fois). Google impose aux nouveaux comptes personnels un test fermé d'au moins 12 testeurs pendant 14 jours avant la production.
- [ ] **C10. Produits à créer dans les deux stores :** *Google : profil de paiement (particulier) créé le 11/10 ; produits créés et actifs le 11/10 : `pass_tournoi` (option d'achat `achat`, rétrocompatible, contenu numérique) et `pro` (formules `mensuel` et `annuel`). Reste Apple.*
  - Pass Tournoi : achat unique **consommable** (un Pass par tournoi, rachetable ; RevenueCat consomme l'achat sur Android). Sur iOS : type « Consommable », pas « Non consommable ».
  - Pro : abonnement mensuel et annuel. Sur iOS, il faut un groupe d'abonnements ; sur Android, un seul produit avec deux formules.
- [ ] **C10b. Appliquer les prix de lancement (validés le 20/10) :** *Google fait le 20/10 : Pass 9,99 €, Pro mensuel 14,99 €, Pro annuel 59,99 € pour la France (tous les pays convertis depuis les prix HT 8,33 €, 12,49 € et 49,99 €, car la conversion groupée ajoute la TVA ; abonnés de test non migrés). RevenueCat vérifié le 20/10 : 3 produits publiés, entitlement `pro` sur les deux formules seulement, offre `default` inchangée. Reste Apple, et vérifier l'écran d'achat sur le prochain build.* Play Console : `pass_tournoi` 9,99 €, `pro` formule `mensuel` 14,99 €, formule `annuel` 59,99 € (prix en euros, puis conversion automatique pour les autres pays). App Store Connect, à la création des produits : Pass consommable 9,99 €, groupe d'abonnements avec mensuel 14,99 € et annuel 59,99 € (pays de référence France). Rien à changer dans RevenueCat (il lit les prix des stores) ; vérifier ensuite l'écran d'achat sur le build.
- [ ] **C11. RevenueCat :** *Android fait le 12/10 : compte de service Google relié (2 vérifications sur 3 au vert, la validation des achats d'abonnement attend la propagation chez Google), entitlement `pro` (`pro:mensuel`, `pro:annuel`), offre `default` avec `$rc_monthly` → `pro:mensuel`, `$rc_annual` → `pro:annuel`, `$rc_lifetime` → `pass_tournoi` (consommable), clé `goog_…` dans `.env` et dans EAS (production, preview, development). Clé secrète `REVENUECAT_SECRET_KEY` (API v1) enregistrée dans Supabase le 12/10. Reste iOS.*
  - Relier les deux stores (clé API App Store Connect, compte de service Google).
  - Créer l'entitlement `pro` et une offre « current » avec trois packages : Lifetime, Monthly et Annual.
  - Mettre les clés dans `.env` et dans les variables d'environnement EAS (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).
  - Créer une clé secrète RevenueCat (API v1, `sk_...`) et l'enregistrer dans Supabase comme secret `REVENUECAT_SECRET_KEY` de l'Edge Function (voir B6).
- [ ] **C12. Supabase :**
  - Vérifier que toutes les migrations de `schema.sql` sont bien passées en production, jusqu'à `debloque`.
  - Configurer les URL de redirection pour l'app (`olympiad://`). *Préparé le 15/10 : Site URL `compte-confirme.html` et `olympiad://**`, voir `supabase/emails/README.md`. Page en ligne le 15/10 (commits poussés, vérifiée : « Adresse confirmée » et « Lien expiré »). Reste à saisir dans Supabase.*
  - Brancher un envoi d'emails SMTP personnalisé : le service d'emails par défaut est très limité en production. *Préparé le 15/10 : SMTP Gmail et modèles FR/EN dans `supabase/emails/`. Configuré et testé le 15/10 (inscription et mot de passe oublié, dans l'aperçu web). Ménage fait le 15/10 (compte `+test` supprimé, `localhost:8083` retiré des Redirect URLs). Reste : vérifier le mot de passe oublié sur un vrai téléphone (premiers testeurs).*
- [ ] **C14. Nom de domaine et e-mail pro :** *Budget et options détaillés le 15/10 dans `BUDGET-PROJET.md`.* Vérifier d'abord le risque sur le nom (« olympiade » protégé par le CNOSF, art. L141-5 du Code du sport). Puis acheter `olympiad-app.com`, créer `support@olympiad-app.com` (Zoho Mail conseillé), configurer SPF/DKIM/DMARC, brancher le domaine sur GitHub Pages et mettre à jour `lib/liensLegaux.js` et l'URL de support. Facultatif : e-mails Supabase envoyés depuis le domaine (Brevo ou Resend).
- [ ] **C14b. Choisir le nouveau nom (avant C14) :** vérifier les marques sur INPI et TMview (classes 9 et 41), les stores, les domaines et les réseaux sociaux. Ensuite, renommer l'app (nom affiché, logo, textes, fiches des stores, site). L'identifiant `com.clement.olympiad` peut rester.
- [ ] **C15. Avant la sortie publique :** passer Supabase en Pro (un projet gratuit se met en pause après 7 jours sans activité, sans sauvegarde) ; s'inscrire à l'App Store Small Business Program (commission 15 % au lieu de 30 %) ; choisir l'adresse publique de développeur (affichée par Apple et Google) ; créer une micro-entreprise dès les premières ventes régulières.
- [ ] **C16. Conformité légale, à finir avant la sortie publique :**
  - [x] Supprimer automatiquement les comptes inactifs depuis 3 ans (promis dans la politique du 20/10) : tâche planifiée Supabase (`pg_cron`) qui envoie l'e-mail d'avertissement 30 jours avant, puis appelle la suppression. *Fait le 20/10 : migration exécutée, Edge Function `comptes-inactifs` déployée, secrets et Vault configurés, simulation et appel par `pg_net` testés.*
    - [x] Créer un mot de passe d'application Gmail dédié, puis les secrets d'Edge Function `SMTP_USER`, `SMTP_PASSWORD` et `CRON_SECRET`.
    - [x] Déployer la fonction (depuis le tableau de bord, vérification JWT désactivée).
    - [x] Créer les secrets Vault `olympiad_url_projet` et `olympiad_secret_cron` (même valeur que `CRON_SECRET`), puis exécuter la migration.
    - [x] Tester en mode simulation, puis l'appel réel par `pg_net`.
    - [x] Le 21/10 : vérifier le premier passage de nuit (`select status, start_time from cron.job_run_details order by start_time desc limit 3;`). *Fait le 21/10 : passage de 3 h réussi.* Le compte démo des stores doit rester actif (connexion au moins une fois tous les 3 ans). Un vrai envoi d'e-mail n'a pas encore été testé (aucun compte assez ancien).
  - [ ] Dès la micro-entreprise créée : compléter les mentions légales, les CGU et la politique (statut, adresse ou domiciliation, SIRET) et adhérer à un **médiateur de la consommation** (obligatoire pour vendre à des particuliers), à citer dans les CGU.
  - [ ] Supabase : passer l'onglet *Security Advisor*, activer la protection contre les mots de passe compromis, et prévoir des sauvegardes (C15). *Security Advisor passé le 20/10 : 0 erreur, 13 avertissements. Migration « Avertissements du Security Advisor » ajoutée à la fin de `supabase/schema.sql` (search_path de `proteger_debloque`, droits retirés aux fonctions de déclencheur et à `anon`, liste des photos limitée à sa propre photo). Migration exécutée par Clément le 20/10, changement de photo testé dans l'espace. Security Advisor relancé par Clément : 6 avertissements et 1 info, tous voulus (voir section 2). Protection des mots de passe et sauvegardes : au passage en Pro.*
  - [ ] App (prochain build) : ajouter « Retirer la photo » dans « Mon profil », comme dans l'espace (`supprimerPhoto` de `docs/espace/donnees.js`).
  - [ ] Facultatif : ajouter « Mentions légales » aux liens légaux de l'app (`components/LiensLegaux.js`) au prochain build.
- [x] **C13. Publier la politique de confidentialité :** activer GitHub Pages sur le dossier `/docs` (le dépôt doit être public, ou la page hébergée ailleurs) et noter l'adresse obtenue. *Fait : les pages sont en ligne sur https://clementberthout-maker.github.io/olympiad/ (`politique-confidentialite.html`, `conditions-utilisation.html`, `suppression-compte.html`). Le lien de suppression à déclarer à Google est `suppression-compte.html`.*

### D. Builds et tests
- [ ] **D14.** *Pas de téléphone Android : émulateur `Pixel_7` avec Play Store prêt le 13/10.* `eas build --profile development` sur un vrai téléphone. Les achats ne marchent pas dans Expo Go.
- [ ] **D15. Tester les achats :**
  - iOS : TestFlight avec un compte sandbox.
  - Android : piste de test interne avec des testeurs de licence. *Fait le 14/10 (version 4, testeur de licence) : les parcours d'achat fonctionnent, à recontrôler une fois. Reste iOS (TestFlight).*
  - Parcours à couvrir : Pass acheté sur un tournoi encore en brouillon, Pass sur un tournoi existant, Pro, restauration, et changement de téléphone.
- [ ] **D16. Tester l'application entière :** chaque sport, la phase finale, les co-organisateurs, l'export PDF, le QR code, la réinitialisation du mot de passe, les deux thèmes et les deux langues, sur iPhone et sur Android. *Test complet dans l'aperçu web le 16/10 (défauts en G25 à G33) ; reste à refaire sur de vrais téléphones, avec les achats.*
- [ ] **D16d. Optimisation du code Android (R8), avant février 2027 :** alerte Play Console « L'optimisation du code DEX est inférieure à notre seuil » (obscurcissement 2 %, build 5). Installer `expo-build-properties` et activer `android.enableMinifyInReleaseBuilds` (et `enableShrinkResourcesInReleaseBuilds`) dans `app.json`, puis retester toute l'app et les achats sur le build obtenu (R8 peut casser des bibliothèques). Envoyer le fichier `mapping.txt` à la Play Console pour lire les plantages. Pas bloquant pour le test fermé.
- [ ] **D16e. Prochain build : Pass Tournoi limité dans le temps (B9).** Migration SQL et Edge Function en place depuis le 20/10. À tester sur le build : date en lecture seule sur un tournoi débloqué (« Modifier le nom et la date »), Pass masqué sur l'écran d'achat d'un tournoi passé depuis plus de 5 jours, cadenas revenus après expiration, Pass acheté en brouillon toujours appliqué. Ajouter la règle aux notes de version (« Le Pass Tournoi est valable jusqu'à 5 jours après le tournoi »).
- [ ] **D16c. Mot de passe oublié par code (prochain build) :** le lien de réinitialisation n'est valable qu'environ 5 minutes et seulement sur l'appareil qui a fait la demande (PKCE, testé le 15/10). Le remplacer par un code à 6 chiffres saisi dans l'app (`{{ .Token }}`, `verifyOtp` type `recovery`). Détails dans `supabase/emails/README.md`.
- [x] **D16b. Au prochain build (après les retours du test fermé) :** appliquer les mises à jour correctives signalées par Expo Doctor sur le build 5 (`npx expo install --fix` : expo 57.0.29, expo-constants 57.0.22, expo-linking 57.0.13, expo-router 57.0.27, expo-sharing 57.0.23), puis vérifier `npm ci` avec npm 10 avant de lancer le build. Avertissement seulement, le build 5 est gardé pour le test fermé. *Fait le 16/10 pour le build 6 (expo-doctor 21/21, `npm ci` OK avec npm 10).*

### E. Fiches des stores
- [ ] **E17. Visuels :** captures d'écran (iPhone 6,7" et téléphone Android ; pas d'iPad, `supportsTablet` étant à `false`) et bannière Google de 1024×500. *Icône Google 512 × 512 et image de présentation 1024 × 500 prêtes le 14/10 (`store/icone-512.png`, `store/banniere-1024x500.png`). 4 captures des écrans publics (1080 × 1919, thème sombre) prêtes le 15/10 dans `store/captures/` ; restent des captures organisateur (création, saisie des scores) sur un téléphone, et les captures iPhone.* *Fiche Google Play terminée le 15/10 (FR et EN, icône, bannières, captures). Reste Apple.*
- [ ] **E18. Textes en français et en anglais :** nom, sous-titre, description et mots-clés. *Google Play : nom, description courte et complète rédigés le 14/10 en français et en anglais dans `store/fiche-google-play.md`, à relire. Reste Apple (sous-titre, mots-clés).* *Saisis dans la Play Console le 15/10.*
- [ ] **E19. Formulaires :** *Google, le 14/10 : politique de confidentialité, classification du contenu (envoyée : PEGI « ! », USK 12, ESRB Teen, IARC 12+, 14 au Brésil, relevés à cause du contenu partagé sans signalement, voir B8b), informations de connexion, public cible (13-15, 16-17, 18+, pas les enfants) et sécurité des données (7 types collectés, aucun partagé, chiffrés en transit, suppression du compte par lien) faits.*
  - App Privacy (Apple) et Data Safety (Google) : email, nom, photo et achats collectés ; pas de pistage ni de publicité.
  - Classification d'âge : répondre au questionnaire d'Apple et à celui de Google (IARC) selon le contenu réel (pas de violence, pas de contenu choquant ; noms d'équipes saisis par les utilisateurs et visibles avec le code du tournoi).
  - Public cible sur Google Play : 13-15 ans, 16-17 ans et 18 ans et plus (comptes dès 15 ans). Ne pas cocher de tranche de moins de 13 ans, pour ne pas relever du programme « Familles ».
  - Adresse de la politique de confidentialité et adresse de support. *Support : https://clementberthout-maker.github.io/olympiad/#aide ; marketing : https://clementberthout-maker.github.io/olympiad/*
- [ ] **E20. Compte de démonstration** *Profil du compte démo complété (nom et prénom) par Clément le 20/10.* *Google : créé le 14/10, Pro offert par RevenueCat (entitlement promotionnel `pro`), tournoi de démonstration, identifiants déclarés dans « Informations de connexion ». À réutiliser pour Apple.* pour les équipes de validation Apple et Google, avec un tournoi déjà rempli.

### F. Mise en ligne
- [ ] **F21.** `eas build --profile production --platform all`, puis `eas submit`.
- [ ] **F22.** Envoyer en validation. Apple répond en 1 à 3 jours en général. Chez Google, prévoir le test fermé de 14 jours si ton compte est concerné. *Build 7 importé dans le test fermé (Alpha) et envoyé en examen le 21/10 (remplace le build 5 ; le build 6 n'a jamais été envoyé). Avant : test fermé (canal Alpha) avec le build 5 (`olympiad-com.clement-5.aab`), au moins 12 testeurs pendant 14 jours.* *Étapes dans `store/test-ferme.md`.*
  - [ ] Recruter 15 à 20 testeurs sur Android (liste d'e-mails « TEST FERMÉ » créée le 15/10 avec 3 testeurs ; pistes dans `store/test-ferme.md`, section 2 bis).
  - [x] Refaire la classification du contenu (« Oui » au signalement, B8b). *Envoyée le 15/10 à 12 h 47 : classification inchangée (PEGI « ! », USK 12, ESRB Teen, IARC 12+, 14 au Brésil), cohérente avec les comptes dès 15 ans.*
  - [ ] Ajouter les testeurs comme testeurs de licence (sinon leurs achats sont réels).
  - [x] Piste Alpha : liste de testeurs, pays, release du build 5, envoi en examen. *Envoyé en examen le 15/10, en attente de validation par Google.*
  - [ ] Release validée : envoyer le lien d'inscription à 15-20 testeurs (12 minimum). *Release Alpha (build 5) validée par Google le 15/10 ; lien envoyé aux 3 premiers testeurs.*
  - [ ] 14 jours avec 12 testeurs inscrits sans interruption, puis « Demander l'accès à la production ».
- [ ] **F22b. Landing page :** remplacer les boutons « Bientôt sur… » par les vrais liens des fiches App Store et Google Play, et ajouter des captures d'écran. Penser aussi aux badges des fenêtres d'offres (`ouvrirOffre` dans `docs/site.js`, `etapesOffre` dans `docs/espace/espace.js`). *Site refait le 15/10 avec un simulateur de l'app ; restent les liens des stores.*
- [ ] **F22f. Paiement sur le site (facultatif, chantier séparé) :** aujourd'hui les offres du site renvoient vers l'app. Vendre directement sur le web (RevenueCat Web Billing ou Stripe) demanderait : un compte Stripe, des CGU et une politique adaptées (vente directe, rétractation, médiateur), la TVA à gérer soi-même (OSS dès 10 000 € de ventes UE), et un déblocage serveur pour les achats web.
- [ ] **F22d. Remettre l'intro 3D en ligne** (quand Clément le décidera) : suivre `archives/intro-3d/README.md`, sans modifier l'animation. Penser au poids (≈ 14 Mo de ressources chargées après l'accueil) et la retester sur ordinateur et téléphone.
- [ ] **F22e. Espace organisateur : finaliser.**
  - [x] Supabase > Authentication > URL Configuration > Redirect URLs : ajouter `https://clementberthout-maker.github.io/olympiad/espace.html**` *(fait par Clément le 16/10)* (et `http://localhost:5500/olympiad/espace.html**` pour les tests), sinon le lien « Mot de passe oublié » demandé depuis le site ne revient pas sur l'espace.
  - [x] Tester avec un vrai compte : *fait par Clément le 16/10, tout fonctionne.* Connexion, création d'un tournoi, scores vus en direct dans l'app sur un téléphone (et inversement), phase finale, co-organisateurs (avec un tournoi débloqué ou un compte Pro), export PDF, profil et photo, déconnexion.
  - [ ] Garder `docs/espace/moteur/` identique à `lib/generation.js`, `lib/classement.js` et `lib/sports.js`.
- [ ] **F22c. Site : relire et publier.** Relire les textes du nouveau site (FR et EN), tester sur un vrai téléphone, puis pousser pour le mettre en ligne sur GitHub Pages. Le QR code du simulateur pointe vers la page elle-même (`#suivi/code`), pas vers l'app.
- [ ] **F23. Après la sortie :** surveiller les plantages (Sentry ou `expo-insights`, à ajouter si tu veux), les tableaux de bord RevenueCat et Supabase, et prévoir les mises à jour avec `eas update`.
- [ ] **F24. QR codes lisibles sans l'app (amélioration) :** aujourd'hui le QR code ouvre un lien `olympiad://…` qui ne fonctionne que si l'app est installée. Le faire pointer vers une page web qui ouvre l'app ou redirige vers le bon store (liens universels / App Links).

### G. Défauts trouvés au test complet (16/10)
- [x] **G25. Tirage de la phase finale (important) :** *Corrigé le 16/10 (têtes de série croisées, tours suivants re-classés) dans l'app, l'espace et le simulateur ; à livrer au prochain build.* `genererTourAPartirDeListe` (`lib/generation.js:236`) mélange les qualifiés au hasard. Deux équipes d'une même poule se retrouvent en demi-finale (vu 4 fois sur 5, dans l'app aussi : les deux premiers de poule se sont rencontrés). Croiser A1–B2 / B1–A2 (tableau fixe), et garder le tableau pour les tours suivants (aujourd'hui retiré au sort à chaque tour). Recopier ensuite dans `docs/espace/moteur/` et `docs/site.js`.
- [ ] **G26. Site qui promet plus que l'app :** *Score « en cours » fait le 16/10 (app, espace, à livrer au prochain build) ; texte du grand écran précisé sur le site. Reste, après la sortie : refaire le grand écran de l'app (3 colonnes, gros caractères, code d'accès).* le score « en cours » (EN DIRECT) existe dans le simulateur et sur le site, mais pas dans l'app ni dans l'espace (toujours « terminé »). Le grand écran de l'app est une simple liste, sans code d'accès ni gros caractères, contrairement à celui du site. Ajouter ces fonctions à l'app, ou corriger les textes du site.
- [x] **G27. Calendrier organisateur de l'app sans temps réel :** *Corrigé le 16/10 (abonnement temps réel sur l'écran) ; à livrer au prochain build.* `app/tournoi/[id]/calendrier.js` ne se recharge qu'en revenant sur l'écran. Deux bénévoles ne voient pas les scores l'un de l'autre. Seul le suivi public est en direct, et le grand écran se rafraîchit à intervalle.
- [x] **G28. Horaires qui débordent :** *Alerte faite le 16/10 (app, espace, simulateur) ; à livrer au prochain build. Reste à décider : durées par défaut selon le sport.* avec les valeurs par défaut (1 terrain, matchs de 60 min, 15 min de pause), 12 équipes finissent leurs poules « à 22:15 », en fait le lendemain, sans alerte. Prévenir quand la fin dépasse la journée, et revoir les durées par défaut (60 min au football).
- [x] **G29. Équipe retirée après la phase finale :** *Retrait bloqué le 16/10 (app, espace) ; à livrer au prochain build.* sa demi-finale est supprimée et le tableau devient incohérent (finaliste sans demi-finale). Bloquer le retrait une fois la phase finale lancée, ou demander de régénérer.
- [x] **G30. Co-organisateur de son propre tournoi :** *Corrigé le 16/10 dans `schema.sql` et la démo ; migration exécutée dans Supabase par Clément le 16/10.* `rejoindre_comme_co_organisateur` (`supabase/schema.sql`) laisse l'organisateur principal s'ajouter à son propre tournoi. Ignorer ce cas dans la fonction.
- [x] **G31. Tournoi supprimé encore dans « Tournois suivis »** *Corrigé le 16/10 ; à livrer au prochain build.* (app) : il s'ouvre sur « Tournoi introuvable », sans moyen de le retirer. Le retirer de la liste dans ce cas.
- [x] **G32. Pages légales sans retour au site :** *Fait le 16/10 (liens de retour, politique de confidentialité complétée pour le site et l'espace).* tout s'ouvre dans la même page, mais `politique-confidentialite.html`, `conditions-utilisation.html` et `suppression-compte.html` n'ont aucun lien vers l'accueil. Ajouter un lien « Retour au site ». La politique (27/09) ne parle pas encore du site ni de l'espace organisateur.
- [x] **G33. Petits défauts :** *Fait le 16/10 pour l'app, le site et l'espace (« Bonjour » sans prénom vient du profil vide). Profil du compte démo complété le 20/10.* titre de l'onglet du site resté en français en anglais, et « Football · 8 équipes » non traduit dans le téléphone de l'accueil ; « Bonjour » sans prénom dans l'espace (profil du compte démo vide : le remplir pour Google et Apple) ; « Quart de finale générée » (masculin) ; « fin des premier tour » (simulateur) ; tennis affiché « 1 pt nul » alors qu'il n'y a pas de nul ; code d'accès en minuscules dans l'app, en majuscules sur le site ; « Vous faites partie de quelle équipe ? » (vouvoiement) dans l'app ; doublon d'équipe ignoré sans message dans l'espace ; dates passées sélectionnables ; pas de lien « Signaler » sur le suivi public du site ; ni liens légaux dans le profil de l'espace ; « Voir un tournoi en direct » du site remplace le tournoi du simulateur sans prévenir ; match pour la 3e place activé par défaut dans le simulateur mais pas dans l'app.
- [x] **G34. Plusieurs terrains mal utilisés :** *Corrigé le 20/10 (app, espace, site) ; à livrer au prochain build.* des terrains restaient vides entre deux journées de poule, et la finale se jouait après la 3e place même avec 2 terrains.

**Priorité conseillée :** commence par A1 à A4 (du code, sans dépendance extérieure) et, en parallèle, ouvre les comptes développeur (C9). La validation des comptes et le test fermé Google sont ce qui prend le plus de temps.

---

## 4. Journal des modifications

Une ligne par modification, la plus récente en haut.

| Date | Modification |
|------|--------------|
| 2026-10-21 | Grants Data API explicites ajoutés dans `schema.sql` (changement Supabase du 30/10) |
| 2026-10-21 | Comptes inactifs : premier passage de nuit de la tâche `pg_cron` vérifié, réussi (C16) |
| 2026-10-21 | Build 7 importé dans le test fermé (Alpha) et envoyé en examen |
| 2026-10-21 | Build 7 Android réussi sur EAS (`versionCode` 7), à importer dans la piste du test fermé |
| 2026-10-21 | Build 6 jamais importé, remplacé par le build 7 ; notes du build 7 complétées avec le contenu du build 6 |
| 2026-10-20 | Build 7 Android lancé sur EAS (`versionCode` 7) pour le test fermé ; notes de version ajoutées |
| 2026-10-20 | Play Console : prix de lancement saisis (Pass 9,99 €, Pro 14,99 € et 59,99 € pour la France ; autres pays convertis depuis les prix HT) ; RevenueCat vérifié (C10b) |
| 2026-10-20 | Prix de lancement : Pass 9,99 €, Pro 14,99 €/mois ou 59,99 €/an « Saison » (écran d'achat, site, CGU, budget) ; prix des stores à saisir (C10b) |
| 2026-10-20 | Migration « Pass Tournoi limité dans le temps » exécutée, `valider-pass-tournoi` redéployée (B9) |
| 2026-10-20 | Site : fenêtre des offres à la limite de 12 équipes dans l'espace, offres cliquables sur l'accueil (achat dans l'app) |
| 2026-10-20 | Conditions d'utilisation publiées (Pass Tournoi limité) ; Pass noté pour le prochain build (D16e) |
| 2026-10-20 | Pass Tournoi valable jusqu'à 5 jours après le tournoi, date figée une fois débloqué (B9) |
| 2026-10-20 | Plusieurs terrains mieux utilisés : poules sans terrain vide entre les journées, finale et 3e place en même temps (G34) |
| 2026-10-20 | Security Advisor relancé : 6 avertissements et 1 info restants, tous voulus |
| 2026-10-20 | Migration Security Advisor exécutée ; « Retirer la photo » ajouté au profil de l'espace organisateur |
| 2026-10-20 | Security Advisor de Supabase passé (0 erreur) : migration de correctifs ajoutée à `schema.sql`, à exécuter (C16) |
| 2026-10-20 | Comptes inactifs mis en place sur Supabase : secrets, Vault, Edge Function `comptes-inactifs` déployée, migration exécutée, tests réussis (C16) |
| 2026-10-20 | Suppression automatique des comptes inactifs depuis 3 ans : migration `pg_cron`, Edge Function `comptes-inactifs` et e-mail d'avertissement FR/EN (pas encore exécuté sur Supabase) |
| 2026-10-20 | Site : polices hébergées sur le site, page Mentions légales, politique (cookies, durées de conservation) et CGU (rétractation) complétées |
| 2026-10-20 | Profil du compte démo complété (nom et prénom) : E20 et G33 à jour |
| 2026-10-16 | Build 6 Android réussi sur EAS (`versionCode` 6), à importer dans la Play Console |
| 2026-10-16 | Build 6 préparé : mises à jour Expo (D16b), expo-doctor 21/21, `npm ci` npm 10 et bundle Android vérifiés, notes de version ; rappel de remplir le profil du compte démo (E20) |
| 2026-10-16 | Site et espace : traductions, tennis, confirmation de la démo, doublons, dates passées, liens légaux, « Signaler » (G33) ; pages légales avec retour au site et politique de confidentialité complétée (G32) ; correction de `$$(` |
| 2026-10-16 | App : code d'accès en majuscules, tutoiement partout, match pour la 3e place activé par défaut (G33, partie app) |
| 2026-10-16 | Retrait d'équipe bloqué après la phase finale (G29), organisateur exclu de ses co-organisateurs (G30, migration exécutée), tournois supprimés retirés des suivis (G31) |
| 2026-10-16 | Scores « en cours » : saisie et badge EN DIRECT dans l'app et l'espace, section « En direct » du suivi public (G26, partie 1) |
| 2026-10-16 | App : calendrier organisateur en temps réel (G27) ; heure de fin estimée et alerte si les matchs débordent sur le lendemain dans l'app, l'espace et le simulateur (G28) |
| 2026-10-16 | Phase finale : tirage par têtes de série croisées (A1–B2, B1–A2), sans même poule au 1er tour (G25), dans l'app, l'espace et le simulateur |
| 2026-10-16 | Test complet du site, de l'espace organisateur et de l'app (compte démo) : défauts notés en G25 à G33 |
| 2026-10-16 | Espace organisateur : sélecteur de nombres (terrains, poules, durées) et horaires de pause déjeuner verrouillés si la pause est désactivée |
| 2026-10-16 | Espace organisateur : saisie des scores et phase finale depuis le grand écran ; calendrier et sélecteur d'horaire refaits dans la D.A. |
| 2026-10-16 | Site : plus aucun nouvel onglet (liens légaux, vue spectateur du simulateur et de l'espace) ; Redirect URL Supabase ajoutée (F22e) |
| 2026-10-16 | Espace organisateur testé en ligne avec un vrai compte par Clément : tout fonctionne (F22e) |
| 2026-10-16 | Nom : STADIOS, STADIONA et AGORAE vérifiés ; seul STADIONA a ses domaines .app et .fr libres |
| 2026-10-16 | Commits poussés : nouveau site, espace organisateur (`docs/espace.html`) et archive de l'intro 3D en ligne sur GitHub Pages |
| 2026-10-15 | Espace organisateur propre au site (`docs/espace.html`, `docs/espace/`) : même D.A., animations, branché sur Supabase, moteur de l'app copié, suivi public, mode démo ; version web compilée de l'app abandonnée et retirée |
| 2026-10-15 | Site : badges App Store / Google Play remontés et plus voyants, chiffres du héros et recherche de l'Aide retirés |
| 2026-10-15 | Intro 3D validée (à ne plus modifier) puis retirée du site ; conservée dans `archives/intro-3d/` avec sa procédure de remise en ligne (F22d) |
| 2026-10-15 | Intro 3D : organisateur remplacé par un avatar réaliste Rocketbox (MIT) posé assis au clavier |
| 2026-10-15 | Nouveau nom : pistes proposées, STADION et AGORIA déjà pris (variantes STADIOS, AGORAE, AGORENA) ; modèle 3D de l'organisateur ajouté (`archives/intro-3d/assets/3d/personnage/`) |
| 2026-10-15 | Intro 3D : HDRI, textures PBR et modèles 3D CC0 Poly Haven (`archives/intro-3d/assets/3d/`), occlusion ambiante ; correction de l'écran figé à l'arrivée sur le site |
| 2026-10-15 | Site : intro refaite en 3D temps réel (`archives/intro-3d/intro3d.js`, Three.js), plan continu du stade vu en plongée jusqu'à l'écran du portable ; `intro.js` supprimé |
| 2026-10-15 | Site : intro animée à la molette (`docs/intro.js`), du stade de nuit vu de haut jusqu'à l'écran du portable de l'organisateur |
| 2026-10-15 | Nouveau site (`docs/index.html`, `site.css`, `site.js`) : même D.A. que l'app, simulateur interactif de toutes les fonctionnalités, temps réel entre onglets, FR/EN, clair/sombre |
| 2026-10-15 | Budget du projet (`BUDGET-PROJET.md`) : dépenses faites et à venir, domaine, e-mail pro, coûts cachés ; étapes C14 et C15 ajoutées |
| 2026-10-13 | Émulateur Android `Pixel_7` (Play Store) prêt pour les tests, SDK sans accent `C:\Android\Sdk` |
| 2026-10-15 | Premier retour testeur : lien d'inscription introuvable dans Messenger ; conseil « ouvrir dans Chrome » et dépannage ajoutés à `store/test-ferme.md` |
| 2026-10-15 | Release Alpha (build 5) validée par Google ; alerte optimisation DEX notée (D16d, avant février 2027) |
| 2026-10-15 | Ménage après les tests e-mail : compte de test supprimé, `localhost:8083` retiré des Redirect URLs |
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
