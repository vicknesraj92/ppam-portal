import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars are missing. Copy .env.example to .env.local and fill in your project URL + anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Members log in with their IC number, but Supabase Auth needs an
// email-shaped identifier — this converts "950101-10-1234" into a
// stable pseudo-email used only internally for authentication.
export function icToPseudoEmail(icNumber) {
  const cleaned = icNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `${cleaned}@members.ppam.local`;
}
