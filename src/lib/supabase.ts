import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL as ENV_URL, SUPABASE_ANON_KEY as ENV_KEY } from "@env";
import type { Database } from "../shared-types";

const url = ENV_URL || "https://slmakefgxtupbpdolxib.supabase.co";
const anonKey = ENV_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsbWFrZWZneHR1cGJwZG9seGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDUwNzgsImV4cCI6MjEwMTg4MTA3OH0.9lZp2SuM8u_gZa8UkuiL42ifP3CCp5vNeOt_JmdUndc";

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

