import { NextResponse } from "next/server";
import { stempleProfil } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Merkt sich, dass das Konto ein Passwort hat (`profiles.passwort_gesetzt_am`).
 *
 * Supabase verrät das nicht: Konten aus dem Gast-Kauf entstehen ohne Passwort,
 * und `last_sign_in_at` steht auch nach einer Anmeldung per Einmal-Link. Die
 * Stellen, an denen ein Passwort gesetzt oder benutzt wird, melden es deshalb
 * hierher: `SetPasswordForm`, das Profilformular und die Anmeldung mit
 * Passwort. Einzige Wirkung: Der Punkt „Zugang absichern" in der
 * Start-Checkliste verschwindet. Deshalb reicht die Sitzung als Ausweis.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });
  await stempleProfil(createServiceClient(), auth.user.id, "passwort_gesetzt_am");
  return NextResponse.json({ ok: true });
}
