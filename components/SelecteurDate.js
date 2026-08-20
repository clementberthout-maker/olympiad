import { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { POLICE_TITRE, POLICE_TEXTE, POLICE_TEXTE_SEMIBOLD } from '../lib/theme';

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function construireGrille(annee, mois) {
  const premierJour = new Date(annee, mois, 1);
  const decalage = (premierJour.getDay() + 6) % 7; // lundi = 0
  const nombreJours = new Date(annee, mois + 1, 0).getDate();
  const cellules = Array(decalage).fill(null);
  for (let jour = 1; jour <= nombreJours; jour++) cellules.push(jour);
  return cellules;
}

// Sélecteur de date sous forme de calendrier visuel (sans saisie manuelle),
// utilisé pour la date du tournoi à la création.
export default function SelecteurDate({ value, onChange, placeholder = 'Choisir une date' }) {
  const { couleurs } = useTheme();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [visible, setVisible] = useState(false);
  const dateInitiale = value ? new Date(`${value}T00:00:00`) : new Date();
  const [vueAnnee, setVueAnnee] = useState(dateInitiale.getFullYear());
  const [vueMois, setVueMois] = useState(dateInitiale.getMonth());

  const cellules = construireGrille(vueAnnee, vueMois);

  function changerMois(delta) {
    let m = vueMois + delta;
    let a = vueAnnee;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setVueMois(m);
    setVueAnnee(a);
  }

  function choisirJour(jour) {
    const iso = `${vueAnnee}-${pad(vueMois + 1)}-${pad(jour)}`;
    onChange(iso);
    setVisible(false);
  }

  const texteAffiche = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : placeholder;

  return (
    <>
      <Pressable style={styles.champ} onPress={() => setVisible(true)}>
        <Text style={value ? styles.texteChamp : styles.placeholder}>{texteAffiche}</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.fond} onPress={() => setVisible(false)}>
          <Pressable style={styles.carte} onPress={() => {}}>
            <View style={styles.entete}>
              <Pressable onPress={() => changerMois(-1)} style={styles.flecheZone}>
                <Text style={styles.fleche}>‹</Text>
              </Pressable>
              <Text style={styles.titreMois}>{MOIS[vueMois]} {vueAnnee}</Text>
              <Pressable onPress={() => changerMois(1)} style={styles.flecheZone}>
                <Text style={styles.fleche}>›</Text>
              </Pressable>
            </View>

            <View style={styles.ligneJours}>
              {JOURS.map((j, i) => (
                <Text key={i} style={styles.jourEntete}>{j}</Text>
              ))}
            </View>

            <View style={styles.grille}>
              {cellules.map((jour, i) => {
                const estSelectionne =
                  value === (jour ? `${vueAnnee}-${pad(vueMois + 1)}-${pad(jour)}` : null);
                return (
                  <Pressable
                    key={i}
                    style={[styles.cellule, estSelectionne && styles.celluleSelectionnee]}
                    disabled={!jour}
                    onPress={() => jour && choisirJour(jour)}
                  >
                    {jour && (
                      <Text style={[styles.texteCellule, estSelectionne && styles.texteCelluleSelectionne]}>
                        {jour}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    champ: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      padding: 13,
    },
    texteChamp: { fontFamily: POLICE_TEXTE, fontSize: 14.5, color: c.texte },
    placeholder: { fontFamily: POLICE_TEXTE, fontSize: 14.5, color: c.texteAttenue },
    fond: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    carte: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.bordure,
      borderRadius: 16,
      padding: 20,
      width: 320,
    },
    entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    flecheZone: { padding: 8 },
    fleche: { fontSize: 22, color: c.accent },
    titreMois: { fontFamily: POLICE_TITRE, fontSize: 16, color: c.texte, letterSpacing: 0.3 },
    ligneJours: { flexDirection: 'row', marginBottom: 4 },
    jourEntete: { flex: 1, textAlign: 'center', fontFamily: POLICE_TEXTE, fontSize: 12, color: c.texteAttenue },
    grille: { flexDirection: 'row', flexWrap: 'wrap' },
    cellule: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    celluleSelectionnee: { backgroundColor: c.accent },
    texteCellule: { fontFamily: POLICE_TEXTE, fontSize: 14, color: c.texte },
    texteCelluleSelectionne: { fontFamily: POLICE_TEXTE_SEMIBOLD, color: c.accentEncre },
  });
}
