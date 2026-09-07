import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { useLangue } from '../lib/LangueContext';
import { POLICE_TEXTE } from '../lib/theme';

// Champ de saisie de mot de passe avec un bouton "œil" pour basculer entre
// texte masqué et visible — utile à la connexion et à l'inscription, les
// seuls moments où on saisit un mot de passe sans jamais le revoir ailleurs
// (une faute de frappe passe alors inaperçue).
export default function ChampMotDePasse(props) {
  const { couleurs } = useTheme();
  const { t } = useLangue();
  const styles = useMemo(() => creerStyles(couleurs), [couleurs]);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.conteneur}>
      <TextInput
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        {...props}
      />
      <Pressable
        style={styles.boutonOeil}
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t(visible ? 'commun.masquerMotDePasse' : 'commun.afficherMotDePasse')}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={couleurs.texteAttenue} />
      </Pressable>
    </View>
  );
}

function creerStyles(c) {
  return StyleSheet.create({
    conteneur: { justifyContent: 'center' },
    input: {
      borderWidth: 1,
      borderColor: c.bordure,
      backgroundColor: c.surface2,
      borderRadius: 10,
      padding: 13,
      paddingRight: 42,
      fontSize: 14.5,
      fontFamily: POLICE_TEXTE,
      color: c.texte,
    },
    boutonOeil: {
      position: 'absolute',
      right: 4,
      height: '100%',
      width: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
