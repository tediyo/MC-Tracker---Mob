import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mc-tracker/shared-types";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://slmakefgxtupbpdolxib.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsbWFrZWZneHR1cGJwZG9seGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDUwNzgsImV4cCI6MjEwMTg4MTA3OH0.9lZp2SuM8u_gZa8UkuiL42ifP3CCp5vNeOt_JmdUndc";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
