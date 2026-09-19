import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { discordBotConfigured } from "@/lib/discord/api";
import { setzeMitgliedsrolle } from "@/lib/discord/mitgliedschaft";
import { setzeWarteraumrolle } from "@/lib/discord/warteraum";

/**
 * POST — Discord-Verknüpfung lösen. **Kein Rauswurf vom Server mehr.**
 *
 * ── Warum hier kein Rauswurf mehr steht (Entscheidung Simon, 19.09.2026) ─────
 *
 * Bis hierher warf diese Route jeden vom Server, der „Trennen" drückte — ohne
 * Rückfrage und ohne zu prüfen, ob ein Abo läuft. Im Schwesterprojekt hat
 * genau diese Stelle einen zahlenden Kunden erwischt, der nur seine
 * Verknüpfung erneuern wollte. Trennen ist wieder das, was das Wort sagt: Die
 * Verknüpfung verschwindet, und mit ihr die Rollen, die das System vergeben
 * hat (Mitgliederrolle und Warteraum). Das ist mit einem Klick umkehrbar, ein
 * Rauswurf bräuchte eine neue Einladung. Vom Server entfernt wird nur noch der
 * Nachtlauf nach der Karenz (`lib/discord/aufraeumen.ts`).
 *
 * ── Warum beide Rollen mit weg müssen ───────────────────────────────────────
 *
 * Nach dem Trennen gehört das Discord-Konto zu keinem Profil mehr und taucht in
 * keinem Abgleich mehr auf. Eine stehengebliebene Mitgliederrolle wäre Zugang
 * für immer, eine stehengebliebene Warteraumrolle ein Kanal, der für immer
 * sagt, die Mitgliedschaft ruhe.
 *
 * Geschrieben wird mit dem Service-Client; die `user.id` kommt ausschliesslich
 * aus der geprüften Sitzung. Rollen: best-effort, das Lösen hängt nicht daran.
 *
 * Erfolg: JSON { ok: true, redirect }. Fehler: JSON { ok: false, error }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const service = createServiceClient();

  // Discord-ID **vor** dem Löschen lesen — aus beiden Quellen.
  const [{ data: dcRow }, { data: profilRow }] = await Promise.all([
    service.from("discord_connections").select("discord_user_id").eq("user_id", user.id).maybeSingle(),
    service.from("profiles").select("discord_id").eq("id", user.id).maybeSingle(),
  ]);

  const discordUserId =
    (dcRow?.discord_user_id as string | null) ?? (profilRow?.discord_id as string | null) ?? null;

  const { error: delErr } = await service.from("discord_connections").delete().eq("user_id", user.id);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  const { error: profileErr } = await service
    .from("profiles")
    .update({
      discord_id: null,
      discord_username: null,
      discord_access_token: null,
      discord_refresh_token: null,
    })
    .eq("id", user.id);

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  if (discordUserId && discordBotConfigured()) {
    try {
      await setzeMitgliedsrolle(discordUserId, false);
    } catch (err) {
      console.error("[discord/disconnect] Mitgliederrolle nicht entziehbar:", err);
    }
    await setzeWarteraumrolle(discordUserId, false);
  }

  const next = new URL(request.url).searchParams.get("next");
  const target = next?.startsWith("/") ? next : "/dashboard";
  return NextResponse.json({
    ok: true as const,
    redirect: `${target}?discord=disconnected`,
  });
}
