import { supabase } from './supabase';
import { classementFinalTournoi, classementGeneral, statutEpreuve } from './olympiade';

// Charge une olympiade (par id ou par code d'accès) avec ses équipes, ses
// épreuves (hors corbeille) et leurs matchs, puis calcule le classement
// final de chaque épreuve et le classement général (voir lib/olympiade.js).
// Retourne null si l'olympiade n'existe pas (ou plus).
export async function chargerOlympiade({ id, code }) {
  let requete = supabase.from('olympiades').select('*');
  requete = id ? requete.eq('id', id) : requete.ilike('code_acces', String(code).trim());
  const { data: olympiade, error } = await requete.maybeSingle();
  if (error) throw error;
  if (!olympiade) return null;

  const [{ data: equipesOlympiade }, { data: tournois }] = await Promise.all([
    supabase.from('olympiade_equipes').select('*').eq('olympiade_id', olympiade.id).order('created_at'),
    supabase.from('tournois').select('*').eq('olympiade_id', olympiade.id).is('supprime_le', null).order('created_at'),
  ]);
  const ids = (tournois || []).map((t) => t.id);

  let poules = [];
  let equipes = [];
  let matchs = [];
  if (ids.length) {
    // Résultats embarqués avec leurs matchs (un seul aller-retour, sans
    // longue liste d'identifiants dans l'adresse).
    const reponses = await Promise.all([
      supabase.from('poules').select('*').in('tournoi_id', ids).order('nom'),
      supabase.from('equipes').select('*').in('tournoi_id', ids),
      supabase.from('matchs').select('*, resultats(*)').in('tournoi_id', ids).order('horaire'),
    ]);
    const erreur = reponses.find((r) => r.error)?.error;
    if (erreur) throw erreur;
    [poules, equipes, matchs] = reponses.map((r) => r.data || []);
    matchs = matchs.map(({ resultats, ...m }) => ({
      ...m,
      resultat: (Array.isArray(resultats) ? resultats[0] : resultats) || undefined,
    }));
  }

  const epreuves = (tournois || []).map((tournoi) => {
    const matchsEpreuve = matchs.filter((m) => m.tournoi_id === tournoi.id);
    const equipesEpreuve = equipes.filter((e) => e.tournoi_id === tournoi.id);
    const places = classementFinalTournoi({
      tournoi,
      poules: poules.filter((p) => p.tournoi_id === tournoi.id),
      equipes: equipesEpreuve,
      matchs: matchsEpreuve,
    });
    return { tournoi, equipes: equipesEpreuve, places, statut: statutEpreuve(matchsEpreuve, places) };
  });

  return {
    olympiade,
    equipesOlympiade: equipesOlympiade || [],
    epreuves,
    classement: classementGeneral(equipesOlympiade || [], epreuves, olympiade.bareme || undefined),
  };
}
