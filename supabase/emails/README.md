# E-mails Supabase (C12)

L'app envoie trois e-mails via Supabase Auth :

| E-mail | Déclenché par | Lien de retour |
|---|---|---|
| Confirmation d'inscription | `app/inscription.js` (`signUp`) | Site URL → `docs/compte-confirme.html` |
| Mot de passe oublié | `app/mot-de-passe-oublie.js` | `olympiad://reinitialiser-mot-de-passe` (doit être autorisé) |
| Changement d'adresse | `app/profil.js` (`updateUser({ email })`) | Site URL → `docs/compte-confirme.html` |

Le service d'e-mails par défaut de Supabase n'envoie que quelques e-mails par heure : il faut un SMTP personnalisé.

## 1. Mot de passe d'application Gmail

Sans nom de domaine, l'envoi passe par le serveur SMTP de Gmail (environ 500 e-mails par jour), avec l'adresse `clement.berthout@gmail.com`. Les e-mails partent vraiment de Google, donc ils passent les contrôles anti-spam (SPF, DKIM, DMARC).

1. Compte Google → **Sécurité** → activer la **validation en deux étapes** (obligatoire).
2. Ouvrir https://myaccount.google.com/apppasswords → nom `Supabase OLYMPIAD` → **Créer**.
3. Copier le code de 16 lettres. Il ne sera plus affiché : le coller directement dans Supabase (étape 2), ne pas le garder ailleurs.

Pour arrêter l'envoi un jour : supprimer ce mot de passe d'application (le mot de passe du compte Google ne change pas).

## 2. SMTP dans Supabase

*Authentication → Emails → SMTP Settings → Enable custom SMTP*

| Champ | Valeur |
|---|---|
| Sender email | `clement.berthout@gmail.com` (doit être l'adresse Gmail elle-même) |
| Sender name | `OLYMPIAD` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Minimum interval | `30` secondes (par défaut, pour un même utilisateur) |
| Username | `clement.berthout@gmail.com` |
| Password | le mot de passe d'application de 16 lettres (sans espaces) |

Puis *Authentication → Rate Limits* : « Rate limit for sending emails » → `100` par heure (Supabase le met à 30 après l'activation du SMTP).

## 3. URL de redirection

*Authentication → URL Configuration*

- **Site URL** : `https://clementberthout-maker.github.io/olympiad/compte-confirme.html`
- **Redirect URLs** (Add URL) :
  - `olympiad://**` (lien du mot de passe oublié, dans l'app installée)
  - `exp://**` (seulement pour les tests avec Expo en développement)
  - `https://clementberthout-maker.github.io/olympiad/**`

Sans `olympiad://**`, Supabase ignore le lien de l'app et renvoie vers la Site URL : le mot de passe oublié ne marcherait plus.

## 4. Modèles d'e-mails

*Authentication → Emails → Templates*. Pour chaque modèle, remplacer le sujet et coller le contenu du fichier (onglet « Source »).

| Modèle Supabase | Sujet | Fichier |
|---|---|---|
| Confirm signup | `Confirme ton adresse · Confirm your email — OLYMPIAD` | `confirmation.html` |
| Reset password | `Nouveau mot de passe · New password — OLYMPIAD` | `reinitialisation.html` |
| Change email address | `Changement d'adresse · Email change — OLYMPIAD` | `changement-email.html` |

Les modèles sont en français puis en anglais : Supabase ne sait pas dans quelle langue l'utilisateur a l'app.

### Avertissement avant suppression d'un compte inactif

Cet e-mail n'est pas envoyé par Supabase Auth mais par l'Edge Function `comptes-inactifs`, lancée chaque nuit par `pg_cron` (migration « Suppression automatique des comptes inactifs » dans `supabase/schema.sql`). Son modèle est dans `supabase/functions/comptes-inactifs/modele.ts`, avec la même présentation.

Elle envoie par le même compte Gmail, avec ses propres secrets (*Edge Functions → Secrets*) : `SMTP_USER`, `SMTP_PASSWORD` (créer un second mot de passe d'application, nom `Supabase OLYMPIAD comptes inactifs`, pour pouvoir le retirer séparément) et `CRON_SECRET`. Mise en place complète : en-tête de `supabase/functions/comptes-inactifs/index.ts`.

## 5. Vérifier

1. *SMTP Settings* : envoyer un e-mail de test, s'il est proposé.
2. Dans l'app (build 5 ou Expo) : « Mot de passe oublié » avec ton adresse → l'e-mail arrive (vérifier aussi les spams), le lien ouvre l'écran « Nouveau mot de passe ».
3. Créer un compte avec une autre adresse (par exemple `clement.berthout+test@gmail.com`) → e-mail de confirmation → la page « Adresse confirmée » s'affiche → connexion dans l'app.
4. Supprimer ensuite ce compte de test depuis « Mon profil ».

## Limite connue : lien « Mot de passe oublié » valable environ 5 minutes

Testé le 15/10 : le lien arrive bien dans l'app, mais s'il est ouvert plus de 5 minutes environ après la demande, Supabase refuse l'échange final (erreur 422, alerte « Lien expiré » dans l'app). C'est la durée de vie de la demande PKCE côté Supabase, pas celle du lien de l'e-mail. L'e-mail le signale. Le lien doit aussi être ouvert sur l'appareil où la demande a été faite.

Piste pour un prochain build : remplacer le lien par un code à 6 chiffres (`{{ .Token }}` dans le modèle, `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` dans l'app), valable 1 heure et utilisable depuis n'importe quel appareil.

Après les tests web, retirer `http://localhost:8083/**` des Redirect URLs.
