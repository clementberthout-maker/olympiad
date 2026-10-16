# Ajouts dans docs/site.js

1. Dans l'objet `EN` (traductions anglaises), avant `'pied.conf'` :

```js
    'intro.sous': 'Tonight, the stadium is yours.', 'intro.molette': 'Scroll down', 'intro.legende': 'At the centre of the pitch, the organizer is preparing the tournament.', 'intro.passer': 'Skip intro',
```

2. À la fin de `changerLangue()` (après `appliquerLangue();`) et à la fin de `choisirTheme()` (après `majIconeTheme();`) :

```js
    if (window.olympiadIntroRafraichir) window.olympiadIntroRafraichir();
```

Le reste de site.js (barre de lecture qui démarre à `#accueil`) est resté en place : il fonctionne avec ou sans intro.
