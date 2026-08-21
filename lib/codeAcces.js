// Génère un code d'accès aléatoire à 6 caractères (ex : "a3f9k2"). Les
// caractères ambigus (0/o, 1/i/l) sont exclus pour rester lisible quand il
// est retapé à la main.

const CARACTERES = 'abcdefghjkmnpqrstuvwxyz23456789';
const LONGUEUR_CODE = 6;

export function genererCodeAcces() {
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE; i++) {
    code += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return code;
}
