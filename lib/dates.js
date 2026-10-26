// Dates d'un tournoi ou d'une olympiade : un seul jour (date_debut) ou
// plusieurs (date_debut → date_fin). Dates au format AAAA-MM-JJ.

function enDate(iso) {
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`);
}

function aujourdhuiIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Dernier jour (AAAA-MM-JJ) : date_fin, ou date_debut pour un seul jour.
export function dernierJour(dateDebut, dateFin) {
  return String(dateFin || dateDebut).slice(0, 10);
}

// "7 novembre 2026", "7 – 9 novembre 2026" ou "30 nov. – 2 déc. 2026".
export function formaterPeriode(dateDebut, dateFin, locale) {
  const debut = enDate(dateDebut);
  const complet = { day: 'numeric', month: 'long', year: 'numeric' };
  if (!dateFin || String(dateFin).slice(0, 10) === String(dateDebut).slice(0, 10)) {
    return debut.toLocaleDateString(locale, complet);
  }
  const fin = enDate(dateFin);
  const finTexte = fin.toLocaleDateString(locale, complet);
  if (debut.getFullYear() !== fin.getFullYear()) return `${debut.toLocaleDateString(locale, complet)} – ${finTexte}`;
  if (debut.getMonth() !== fin.getMonth()) {
    return `${debut.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${finTexte}`;
  }
  return `${debut.getDate()} – ${finTexte}`;
}

// 'avenir', 'aujourdhui' (un seul jour, aujourd'hui), 'encours' (plusieurs
// jours, aujourd'hui compris) ou 'termine'.
export function statutPeriode(dateDebut, dateFin) {
  const jour = aujourdhuiIso();
  const debut = String(dateDebut).slice(0, 10);
  const fin = dernierJour(dateDebut, dateFin);
  if (jour < debut) return 'avenir';
  if (jour > fin) return 'termine';
  return fin === debut ? 'aujourdhui' : 'encours';
}
