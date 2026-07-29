// One-off bootstrap script: creates the first Super Admin (auth user + profile).
// Run with: npx tsx scripts/seed-super-admin.ts <email> <password> <name>
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [email, password, name = "Super Admin"] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/seed-super-admin.ts <email> <password> [name]");
    process.exit(1);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("Failed to create auth user:", error?.message);
    process.exit(1);
  }

  await prisma.profile.create({
    data: {
      authUserId: data.user.id,
      name,
      email,
      role: "SUPER_ADMIN",
    },
  });

  console.log(`Super Admin created: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
