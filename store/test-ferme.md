# OLYMPIAD — Test fermé Google Play

Règle Google (comptes personnels récents) : **au moins 12 testeurs inscrits sans interruption pendant 14 jours** sur un test fermé, avant de pouvoir demander l'accès à la production.

Build utilisé : `versionCode` 5, version `1.0.0` (`olympiad-com.clement-5.aab`, à télécharger depuis la page du build sur expo.dev).

---

## 1. Avant d'envoyer la release

- [ ] **Classification du contenu (B8b)** : *Règles et programmes → Classification du contenu → Modifier le questionnaire*. Répondre « Oui » à la possibilité de signaler un contenu (lien « Signaler ce tournoi » présent dans le build 5). Envoyer.
- [ ] **Testeurs de licence** : *Paramètres (page d'accueil de la Console) → Test de licence*. Y ajouter les adresses Gmail des testeurs. Sans ça, un testeur qui achète le Pass ou le Pro **paie pour de vrai**.

### Réponses au questionnaire de classification (version du 15/10)

| Question | Réponse |
|---|---|
| Catégorie | Toutes les autres types d'applis (utilitaire, productivité, communication ou autre), pas « Jeu » |
| Violence, peur, sexualité, langage grossier, drogues, alcool, tabac, jeux d'argent, contenu choquant | Non |
| Les utilisateurs peuvent interagir ou échanger du contenu | Oui |
| Contenu partagé généré par l'utilisateur = source principale du contenu | Oui |
| Partage public de nudité / de violence explicite | Non / Non |
| Possibilité de bloquer des utilisateurs ou du contenu | Non |
| **Possibilité de signaler des utilisateurs ou du contenu** | **Oui** (seul changement par rapport au 14/10) |
| Modération des conversations | Non (pas de chat) |
| Interactions limitées aux amis invités | Oui (tournoi visible seulement avec le code ou le QR code) |
| Partage de position physique | Non |
| Achat d'articles numériques | Oui |
| Éléments aléatoires (loot boxes) | Non |
| Récompenses en espèces, cartes cadeaux, cryptomonnaie, NFT | Non |
| Navigateur Web ou moteur de recherche | Non |
| Produit d'actualité ou d'éducation | Non |

Résultat du 14/10 : PEGI « ! », USK 12, ESRB Teen, IARC 12+, 14 au Brésil.

## 2. Créer la piste de test fermé

1. *Tester et publier → Tests → Test fermé* → piste **Alpha** → *Gérer la piste*.
2. Onglet **Testeurs** : créer une liste d'adresses e-mail (« Testeurs OLYMPIAD ») avec les adresses Gmail, ou utiliser un groupe Google. Ajouter une adresse de commentaires (l'e-mail de contact).
3. Onglet **Pays/régions** : au minimum France (+ Belgique, Suisse, Canada si des testeurs y vivent).
4. **Créer une release** → *Importer* le fichier `.aab` du build 5 (ou *Ajouter depuis la bibliothèque* s'il y est déjà).
5. Nom de la release : `5 (1.0.0)`. Notes de version : voir plus bas.
6. *Suivant* → *Enregistrer* → **Vue d'ensemble de la publication** → *Envoyer les modifications pour examen*.

L'examen d'une première release en test fermé prend de quelques heures à quelques jours.

## 2 bis. Trouver les testeurs

Seuls comptent les **téléphones Android** avec un compte Google (les amis sur iPhone ne peuvent pas aider ici, mais serviront pour TestFlight).

**Groupe Google plutôt qu'une liste d'e-mails** : créer `olympiad-testeurs@googlegroups.com` (groups.google.com, groupe ouvert à tous), puis l'ajouter dans l'onglet Testeurs de la piste Alpha. Chacun s'inscrit seul au groupe, sans t'envoyer son adresse. Pratique pour les inconnus. Inconvénient : les testeurs de licence se déclarent adresse par adresse (à vérifier dans la Console), donc les inscrits du groupe paieraient vraiment s'ils achètent → leur dire de ne pas acheter, ou leur offrir le Pro par RevenueCat.

Par ordre de priorité :
1. **Entourage** : famille, amis, collègues sur Android. Compter qui a un Android avant de chercher ailleurs.
2. **Le public cible** : ton club, des entraîneurs, des parents de joueurs, des organisateurs de tournois. Ce sont les meilleurs testeurs : ils utiliseront vraiment l'app et donneront des retours utiles pour la demande d'accès à la production.
3. **Échanges entre développeurs** : r/AndroidClosedTesting, r/TestersCommunity, serveurs Discord de développeurs Android. Le principe est « je teste ton app, tu testes la mienne » pendant 14 jours. **Limite :** tu n'as pas de téléphone Android (et la connexion Google est bloquée sur l'émulateur par AVG), donc tu ne peux pas rendre la pareille pour l'instant.
4. **Services payants** (quelques euros à une vingtaine) qui fournissent 12+ testeurs : en dernier recours. L'engagement est faible, et Google le voit dans les réponses à la demande de production.

Garder un tableau simple des inscrits (nom, adresse, inscrit oui/non, installé oui/non) et relancer ceux qui n'ont pas installé.

## 3. Une fois la release validée

- Copier le **lien d'inscription** (onglet Testeurs de la piste Alpha) et l'envoyer avec le message ci-dessous.
- Chaque testeur doit : cliquer sur le lien **avec le compte Google de la liste**, accepter, installer l'app depuis le Play Store, et **ne pas se désinscrire** pendant 14 jours.
- Le compteur de 14 jours démarre quand 12 testeurs sont inscrits. Viser 15 à 20 personnes pour garder de la marge.
- Pendant les 14 jours : demander aux testeurs d'ouvrir l'app plusieurs fois et de laisser un commentaire privé sur la fiche Play Store. Google demande ensuite ce qui a été testé et corrigé.

**Le testeur voit « Désolé, impossible de trouver l'URL demandée » sur play.google.com** (vu le 15/10) :
- lien ouvert dans le navigateur d'une messagerie (Messenger, Instagram, WhatsApp) qui n'est pas connecté à Google → menu « ⋯ » → « Ouvrir dans Chrome », ou copier le lien dans Chrome ;
- compte Google du téléphone différent de l'adresse de la liste → changer de compte (photo en haut à droite dans Chrome) ou ajouter la bonne adresse à la liste ;
- release validée il y a moins de quelques heures → réessayer plus tard ;
- lien incomplet → renvoyer `https://play.google.com/apps/testing/com.clement.olympiad`.

## 4. Après 14 jours

*Tableau de bord → Demander l'accès à la production*. Questions sur : recrutement des testeurs, engagement, retours reçus et modifications faites. Réponse de Google en 7 jours environ.

---

## Message aux testeurs (FR)

> Salut ! Je lance OLYMPIAD, une app pour organiser des tournois sportifs amateurs (calendrier, scores en direct, suivi par QR code). Google me demande 14 jours de test avant la sortie, et j'ai besoin de toi :
>
> 1. Ouvre ce lien dans **Chrome** sur ton téléphone Android (pas dans Messenger, Instagram ou WhatsApp : copie-le et colle-le dans Chrome), connecté avec ton compte Gmail : [LIEN]
> 2. Clique sur « Devenir testeur », puis installe l'app depuis le Play Store.
> 3. Garde l'app installée **14 jours** et ouvre-la de temps en temps (crée un tournoi, ajoute des équipes, saisis un score).
> 4. Si tu vois un bug ou une idée, dis-le moi ou laisse un avis privé sur la fiche.
>
> Les achats sont en mode test : tu ne seras pas débité. Merci !

## Message aux testeurs (EN)

> Hi! I'm launching OLYMPIAD, an app to run amateur sports tournaments (schedule, live scores, QR code following). Google requires 14 days of testing before release, and I need your help:
>
> 1. Open this link in **Chrome** on your Android phone (not inside Messenger, Instagram or WhatsApp: copy it and paste it into Chrome), signed in with your Gmail account: [LINK]
> 2. Tap "Become a tester", then install the app from the Play Store.
> 3. Keep the app installed for **14 days** and open it now and then (create a tournament, add teams, enter a score).
> 4. If you find a bug or have an idea, tell me or leave private feedback on the store listing.
>
> Purchases are in test mode: you won't be charged. Thanks!

## Notes de version (build 5)

`<fr-FR>`
Première version de test d'OLYMPIAD : création de tournois, calendrier automatique, saisie des scores et suivi en direct.
`</fr-FR>`
`<en-US>`
First test version of OLYMPIAD: tournament creation, automatic schedule, score entry and live following.
`</en-US>`
