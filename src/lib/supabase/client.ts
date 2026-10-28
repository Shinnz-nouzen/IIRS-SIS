
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      `Missing Supabase environment variable(s): ${[
        !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
        !supabasePublishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ]
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
