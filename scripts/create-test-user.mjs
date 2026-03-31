import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) {
    dotenv.config({ path: full, override: false });
  }
}

const email = process.argv[2];
const password = process.argv[3];
const isAdminArg = process.argv[4] ?? "false";

if (!email || !password) {
  console.error("Usage: node scripts/create-test-user.mjs <email> <password> [isAdmin]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRole);
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error || !data.user) {
  console.error("User creation failed:", error?.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ is_admin: isAdminArg === "true" })
  .eq("id", data.user.id);

if (profileError) {
  console.error("Profile update failed:", profileError.message);
  process.exit(1);
}

console.log("User created:", data.user.id, email, "is_admin:", isAdminArg === "true");
