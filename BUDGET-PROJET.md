# OLYMPIAD — Budget du projet

**Établi le :** 15 octobre 2026

> Montants indicatifs, d'après les tarifs publics connus mi-2026. À revérifier au moment de payer.
> Conversion utilisée : 1 $ ≈ 0,90 €. « TTC » quand le prix est affiché ainsi en France.

---

## 1. Dépenses déjà effectuées

| Poste | Montant | Date | Fréquence | Remarque |
|---|---|---|---|---|
| Google Play Console (compte développeur) | 25 $ (≈ 23 €) | 11/10/2026 | Une seule fois | Payé et vérifié. |
| Abonnement Claude (outil de développement) | *à compléter* | — | Mensuel | Si tu veux suivre le coût réel du développement. |
| Achats faits pendant les tests internes | 0 € *(à vérifier)* | 14/10/2026 | — | Gratuits si ton compte était testeur de licence ; sinon, vérifier qu'ils ont été remboursés. |
| **Total payé** | **≈ 23 €** *(+ Claude)* | | | |

Tout le reste tourne aujourd'hui sur des offres gratuites : Supabase, EAS (Expo), RevenueCat, GitHub et GitHub Pages, SMTP Gmail.

---

## 2. Dépenses obligatoires à venir

| Poste | Montant | Fréquence | Quand | Remarque |
|---|---|---|---|---|
| Apple Developer Program | 99 € TTC | Chaque année | Avant la publication iOS | Sans lui, pas d'App Store. À renouveler sinon l'app disparaît du store. |
| Nom de domaine `olympiad-app.com` | 10 à 15 € | Chaque année | Dès que possible | Cloudflare (prix coûtant, ≈ 10 €) ou OVHcloud (≈ 12-14 €). Attention : le prix de renouvellement est souvent plus élevé que celui de la 1re année. Protection WHOIS gratuite chez ces deux registrars. |
| Boîte mail `support@olympiad-app.com` | 0 à 85 € | Chaque année | Avec le domaine | Voir les options section 3. |
| **Total minimum 1re année** | **≈ 110 à 200 €** | | | |

---

## 3. Nom de domaine et e-mail professionnel : le détail

### Ce que le domaine permet (et coûte en plus)

| Usage | Coût | Remarque |
|---|---|---|
| Achat du domaine `.com` | 10 à 15 €/an | Un seul domaine suffit. Le `.fr` (≈ 7-10 €/an) en plus est facultatif, seulement pour éviter qu'un autre le prenne. |
| Landing page sur `olympiad-app.com` | 0 € | GitHub Pages accepte un domaine personnalisé, HTTPS compris. Penser à mettre à jour les liens légaux (`lib/liensLegaux.js`) et l'URL de support Apple. |
| Liens universels pour les QR codes (F24) | 0 € | Le domaine permet de faire ouvrir l'app ou le store depuis un QR code scanné sans l'app. |
| Configuration SPF, DKIM, DMARC | 0 € | Indispensable pour que les e-mails n'arrivent pas en spam. |

### Options pour `support@olympiad-app.com`

| Option | Coût | Avantages | Limites |
|---|---|---|---|
| **Zoho Mail « Forever Free »** | 0 € | Vraie boîte mail, jusqu'à 5 adresses, appli mobile. | Pas d'IMAP/POP (pas lisible dans Gmail ou Outlook), 5 Go. |
| E-mail inclus avec le domaine (ex. OVHcloud) | 0 € | Tout chez un seul fournisseur. | Boîte petite et interface basique ; vérifier ce qui est inclus à l'achat. |
| Cloudflare Email Routing + Gmail « Envoyer en tant que » | 0 € | Tu lis et réponds depuis ton Gmail actuel. | Réception par redirection seulement ; l'envoi demande un SMTP (Brevo gratuit), plus technique à régler. |
| **Zoho Mail Lite** | ≈ 12 €/an | IMAP inclus, lisible dans Gmail ou l'app Mail. | — |
| Google Workspace Business Starter | ≈ 7 €/mois (≈ 85 €/an) | Gmail pro, Drive, Agenda, très fiable. | Le plus cher. |

**Conseil :** domaine chez Cloudflare ou OVHcloud + Zoho Mail (gratuit au départ, Lite à 12 €/an si tu veux le lire dans Gmail). Workspace seulement si tu en as l'usage pour autre chose.

### E-mails automatiques de l'app (Supabase)

| Option | Coût | Remarque |
|---|---|---|
| SMTP Gmail actuel | 0 € | Limité à environ 500 e-mails par jour, expéditeur `@gmail.com`. Suffit pour démarrer. |
| Brevo ou Resend avec le domaine | 0 € | Gratuit jusqu'à 300 e-mails/jour (Brevo) ou 3 000/mois (Resend). Expéditeur `noreply@olympiad-app.com`, plus pro et meilleur passage anti-spam. |

---

## 4. Dépenses auxquelles on ne pense pas forcément

### Services techniques (gratuits au départ, payants si l'app grandit)

| Poste | Gratuit jusqu'à… | Puis | Recommandation |
|---|---|---|---|
| **Supabase** | 500 Mo de base, 1 Go de photos, 50 000 utilisateurs actifs/mois. **Un projet gratuit est mis en pause après 7 jours sans activité**, et n'a pas de sauvegarde automatique. | Pro : 25 $/mois (≈ 23 €/mois, ≈ 270 €/an) | Passer en Pro dès qu'il y a de vrais utilisateurs : une pause ou une perte de données serait le pire scénario. |
| EAS Build (Expo) | 30 builds/mois (dont 15 iOS), file d'attente lente | Starter : 19 $/mois | Le gratuit suffit. Payer un mois ponctuellement si un correctif urgent attend trop. |
| EAS Update (mises à jour sans passer par les stores) | 1 000 utilisateurs/mois | Inclus dans Starter | Gratuit au départ. |
| RevenueCat | 2 500 $ de revenus mensuels | 1 % des revenus au-delà | Rien à payer tant que l'app ne gagne pas plus de 2 500 $/mois. |
| Sentry (suivi des plantages, F23) | 5 000 erreurs/mois | 26 $/mois | Gratuit largement suffisant. |
| GitHub, GitHub Pages | Illimité pour ce projet | — | 0 €. |

### Commissions et taxes sur les ventes (proportionnelles aux revenus)

| Poste | Montant | Remarque |
|---|---|---|
| Commission Apple | 15 % | **À condition de s'inscrire au « App Store Small Business Program »** (gratuit, à faire après la création du compte). Sinon 30 %. |
| Commission Google | 15 % | Automatique sur le 1er million de dollars par an, et toujours 15 % sur les abonnements. |
| TVA | Incluse dans le prix | Apple et Google collectent et reversent la TVA eux-mêmes. Un abonnement à 4,99 € TTC rapporte environ 4,99 / 1,20 × 0,85 ≈ 3,53 €. |
| Cotisations sociales (micro-entreprise) | ≈ 21 à 26 % du chiffre d'affaires | Taux selon la catégorie d'activité retenue par l'URSSAF (vente d'app : à faire confirmer). Payées seulement s'il y a des revenus. |
| Impôt sur le revenu | Variable | Option « versement libératoire » possible (1 à 2,2 % du chiffre d'affaires) selon tes revenus. |

### Statut et administratif

| Poste | Coût | Remarque |
|---|---|---|
| Création d'une micro-entreprise | 0 € | Sur le guichet unique de l'INPI. Nécessaire dès que les ventes deviennent régulières. Méfie-toi des sites qui la font payer. |
| CFE (cotisation foncière des entreprises) | 0 € la 1re année | Puis exonérée si le chiffre d'affaires annuel est ≤ 5 000 € ; au-delà, souvent 100 à 500 €/an selon la commune. |
| Compte bancaire dédié | 0 à 10 €/mois | Obligatoire en micro-entreprise après 2 ans au-dessus de 10 000 € de chiffre d'affaires ; conseillé dès le départ. Banques en ligne gratuites possibles. |
| Adresse de domiciliation | 0 ou 15 à 30 €/mois | **Apple (règlement européen DSA) et Google affichent publiquement l'adresse et le téléphone des développeurs qui vendent dans l'app.** Une domiciliation évite d'exposer ton adresse personnelle. |
| Assurance responsabilité civile pro | 0 ou 100 à 300 €/an | Facultative pour une app ; rassurante si tu signes avec des clubs ou des fédérations. |
| Expert-comptable | 0 € | Inutile en micro-entreprise. |

### Propriété intellectuelle

| Poste | Coût | Remarque |
|---|---|---|
| Recherche d'antériorité | 0 € | Sur data.inpi.fr et euipo.europa.eu, avant toute dépense. |
| Dépôt de la marque en France (INPI) | 190 € pour 1 classe, + 40 € par classe (classes 9 et 42 : 230 €) | Valable 10 ans. |
| Marque de l'Union européenne (EUIPO) | 850 € | Seulement si l'app vise vraiment l'Europe. |

> ⚠️ **Point à vérifier avant de payer le domaine ou la marque :** en France, le Code du sport (article L141-5) confie au Comité national olympique (CNOSF) la protection des termes « olympique » et « olympiade ». Le nom « OLYMPIAD » en est très proche, surtout pour une app de sport : risque d'opposition à un dépôt de marque, voire de demande de changement de nom après la sortie. Mieux vaut le faire vérifier (conseil en propriété industrielle, ou consultation INPI) avant d'investir dans le nom.

### Matériel de test

| Poste | Coût | Remarque |
|---|---|---|
| iPhone de test | 0 € ou ≈ 150-250 € (occasion) | Il faut tester sur iPhone avant la sortie iOS (D16). Emprunter un iPhone suffit, via TestFlight. Pas besoin de Mac : EAS compile dans le cloud. |
| Téléphone Android de test | 0 € ou ≈ 80-150 € (occasion) | L'émulateur est bloqué par AVG ; un vrai téléphone, même d'entrée de gamme, simplifie les tests. |

### Promotion (facultatif)

| Poste | Coût | Remarque |
|---|---|---|
| Flyers ou affiches avec QR code pour les clubs | 20 à 50 € | Imprimeur en ligne. |
| Publicité (Meta, Google Ads, Apple Search Ads) | Au choix, ex. 50 à 100 €/mois | À lancer seulement une fois les premiers retours bons. |

---

## 5. Synthèse : 1re année

| Scénario | Contenu | Coût 1re année | Puis chaque année |
|---|---|---|---|
| **Minimum** | Google (déjà payé) + Apple + domaine + e-mail gratuit | ≈ 135 € (dont 23 € déjà payés) | ≈ 110 € |
| **Recommandé** | Minimum + Zoho Mail Lite + Supabase Pro dès la sortie publique | ≈ 420 € | ≈ 400 € |
| **Complet** | Recommandé + marque INPI (2 classes) + téléphone Android d'occasion + flyers | ≈ 800 € | ≈ 400 € |

Hors commissions des stores, cotisations et impôts, qui ne sont dus que sur les revenus.

**Calendrier conseillé :**
1. Maintenant : vérifier le risque sur le nom « OLYMPIAD » (gratuit), puis acheter le domaine et créer `support@`.
2. Avant iOS : Apple Developer (99 €) et inscription au Small Business Program.
3. À la sortie publique : Supabase Pro, et micro-entreprise dès les premières ventes régulières.
4. Plus tard, si l'app décolle : marque, EAS payant, publicité.
