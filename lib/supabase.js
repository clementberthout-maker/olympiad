import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Remplace ces deux valeurs par celles de ton propre projet Supabase
// (Project Settings > API dans le tableau de bord Supabase)
const SUPABASE_URL = 'https://kqowpznkihaxamuizjzq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JhPDibj6cbhyFtoQac-owg_6ffE-kJ2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
