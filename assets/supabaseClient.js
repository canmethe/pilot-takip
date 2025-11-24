// Supabase client initialization for Pilot Flight Tracker
// Static config because app runs as plain HTML (no Vite bundler)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These values are the same as in your .env file
const supabaseUrl = "https://rssvycjcwxhjivloajqk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzc3Z5Y2pjd3hoaml2bG9hanFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzE3NjIsImV4cCI6MjA3ODcwNzc2Mn0.KRvvDCYIfirHxYwDZ1q9zQMvvr58Xi3c8ZdvUqlkg_A";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or anon key missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: get current user (assumes you handle auth elsewhere)
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Ignore "Auth session missing" error which is normal when not logged in
      if (error.name === 'AuthSessionMissingError' || error.message.includes('Auth session missing')) {
        return null;
      }
      console.warn("Supabase getUser error", error);
      return null;
    }
    return data.user || null;
  } catch (err) {
    // Catch any thrown errors
    if (err.name === 'AuthSessionMissingError' || (err.message && err.message.includes('Auth session missing'))) {
      return null;
    }
    console.warn("Supabase getUser exception", err);
    return null;
  }
}

// Auth helpers
export async function signUpEmail(email, password) {
  if (!email || !password) throw new Error('Missing email/password');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user || null;
}

export async function signInEmail(email, password) {
  if (!email || !password) throw new Error('Missing email/password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user || null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

export function onAuthStateChange(cb) {
  supabase.auth.onAuthStateChange((_event, session) => {
    cb(session ? session.user : null);
  });
}
