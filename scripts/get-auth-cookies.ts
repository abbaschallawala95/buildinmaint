// Prints Cookie header value for an authenticated session, for curl-based smoke tests.
// Usage: npx tsx scripts/get-auth-cookies.ts <email> <password>
import "./load-env";
import { createServerClient } from "@supabase/ssr";

async function main() {
  const [email, password] = process.argv.slice(2);
  const jar: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) jar[name] = value;
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Login failed:", error.message);
    process.exit(1);
  }

  const cookieHeader = Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  console.log(cookieHeader);
}

main();
