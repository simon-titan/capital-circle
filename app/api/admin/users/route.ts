import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendWelcomeMail } from "@/lib/email/welcome-mail";
import { requireAdmin } from "@/lib/supabase/admin-auth";

/** Service-Role-Client — nur serverseitig, nie im Browser. */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** POST — Nutzer anlegen */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    fullName?: string;
    isAdmin?: boolean;
    isPaid?: boolean;
  };

  const { email, password, fullName, isAdmin = false, isPaid = false } = body;

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ ok: false, error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
  }

  const service = getServiceClient();

  const { data, error: createErr } = await service.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
    user_metadata: fullName?.trim() ? { full_name: fullName.trim() } : undefined,
  });

  if (createErr || !data.user) {
    return NextResponse.json(
      { ok: false, error: createErr?.message ?? "Nutzer konnte nicht angelegt werden." },
      { status: 400 },
    );
  }

  const { error: profileErr } = await service
    .from("profiles")
    .update({ is_admin: isAdmin, is_paid: isPaid, full_name: fullName?.trim() || null })
    .eq("id", data.user.id);

  if (profileErr) {
    return NextResponse.json(
      { ok: false, error: `Nutzer angelegt, aber Profil-Update fehlgeschlagen: ${profileErr.message}` },
      { status: 500 },
    );
  }

  try {
    await sendWelcomeMail(email.trim(), password.trim(), fullName?.trim());
  } catch (mailErr) {
    console.error("[welcome-mail] Fehler:", mailErr);
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email, isAdmin, isPaid },
  });
}

/** GET — Mitglieder-Liste (mit E-Mail aus auth.users) */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = getServiceClient();

  const [listResult, profilesResult] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 500 }),
    service
      .from("profiles")
      .select("id,full_name,username,is_admin,is_paid,codex_accepted,discord_username,created_at"),
  ]);

  const { data: authUsers, error: listErr } = listResult;
  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const { data: profiles } = profilesResult;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const users = (authUsers.users ?? []).map((u) => {
    const p = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      fullName: (p?.full_name as string | null) ?? null,
      username: (p?.username as string | null) ?? null,
      isAdmin: Boolean(p?.is_admin),
      isPaid: Boolean(p?.is_paid),
      codexAccepted: Boolean(p?.codex_accepted),
      discordUsername: (p?.discord_username as string | null) ?? null,
      createdAt: u.created_at,
    };
  });

  return NextResponse.json({ ok: true, users });
}

/** PATCH — Profil-Felder aktualisieren (is_admin, is_paid) */
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as { id?: string; updates?: Record<string, unknown> };
  if (!body.id || !body.updates) {
    return NextResponse.json({ ok: false, error: "id und updates erforderlich." }, { status: 400 });
  }

  const service = getServiceClient();
  const { error: pErr } = await service.from("profiles").update(body.updates).eq("id", body.id);
  if (pErr) {
    return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — Nutzer löschen */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id fehlt." }, { status: 400 });

  const service = getServiceClient();
  const { error: delErr } = await service.auth.admin.deleteUser(id);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
