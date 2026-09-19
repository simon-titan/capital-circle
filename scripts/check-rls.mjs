/**
 * Prueft die Zeilen-Sicherheit (RLS) der echten Datenbank so, wie ein Angreifer
 * sie sieht: mit dem oeffentlichen anon-Key und dem Login eines frischen Kontos.
 *
 * Warum ein eigenes Skript: `npm run db:check` erkennt Migrationen an den Tabellen
 * und Spalten, die sie anlegen. Die Sicherheits-Migrationen 073–077 legen nichts
 * an, sie aendern Policies und Trigger — ob sie eingespielt sind, zeigt nur ihre
 * Wirkung. Genau die misst dieses Skript.
 *
 * Ablauf:
 *   1. Befund vorab (nur lesend, Service-Client): Admin-Konten, auffaellige Nachweise.
 *   2. Wegwerf-Konten anlegen (Service-Client, `email_confirm: true`, Adressen
 *      `delivered+cc-rls-probe-…@resend.dev` — Resends Test-Postfach, es geht
 *      keine Mail an echte Menschen):
 *        A = „Angreifer“ (ohne Zahlung), B = „Opfer“, C = Admin-Probe (nur wenn
 *        074 eingespielt), P = zahlendes Konto. P durchlaeuft nacheinander die
 *        Profilzustaende, die es im Bestand gibt (Abo, Whop-Altbestand, Lifetime,
 *        pausiertes Abo) — gesetzt ueber den Service-Client, nur an P.
 *      Schreibversuche auf „fremde“ Zeilen zielen ausschliesslich auf B — echte
 *      Mitgliederdaten werden nie beschrieben, auch dann nicht, wenn eine Luecke
 *      offen ist.
 *   3. Versuche mit A: Selbst-Eskalation, fremde Profile lesen/aendern, die
 *      Schreibwege aus Migration 075, Lesen fremder Zeilen in allen Tabellen.
 *      Bezahlte Inhalte (076): Was A, P und C in den Inhaltstabellen sehen, wird
 *      mit dem Bestand verglichen, den der Service-Client sieht — A darf nur die
 *      freien Zeilen sehen (Free-Kurs, freie Anhaenge, freie Live-Kategorie), P
 *      und C alles. Fortschritt (077): Schreibversuche auf `user_progress`.
 *      Discord-Tokens (077): Anzahl gespeicherter Tokens.
 *      Jeder Versuch meldet „gesperrt ✅“ oder „offen ❌“. Was die App legitim
 *      ueber den Nutzer-Client tut, wird mitgeprueft („erlaubt ✅“ / „kaputt ❌“),
 *      damit eine zu scharfe Regel auffaellt, bevor Nutzer sie bemerken.
 *   4. Aufraeumen im `finally` mit den gemerkten IDs: Probe-Zeilen, Profilzeilen
 *      (das Loeschen des Auth-Users entfernt das Profil NICHT — kein Cascade),
 *      Auth-User. Danach wird per Abfrage belegt, dass alles weg ist.
 *
 * Es werden keine Werte aus `.env.local` und keine Inhalte fremder Zeilen
 * ausgegeben — bei Leseversuchen nur die Anzahl sichtbarer Zeilen.
 * Inhaltstabellen werden nur gelesen, nie beschrieben; geschrieben wird
 * ausschliesslich in Zeilen, die den Wegwerf-Konten gehoeren.
 *
 *   npm run db:check-rls
 *
 * Exit-Code 1, sobald ein Versuch „offen ❌“ oder „kaputt ❌“ meldet.
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false, quiet: true });
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!URL || !ANON || !SERVICE) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY muessen gesetzt sein.",
  );
  process.exit(2);
}

const OHNE_SITZUNG = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(URL, SERVICE, OHNE_SITZUNG);
const anon = createClient(URL, ANON, OHNE_SITZUNG);

const ZEIT = Date.now();
/** Alle angelegten Wegwerf-Konten — wird VOR dem Login befuellt, damit das Aufraeumen jede ID kennt. */
const konten = [];
const ergebnisse = [];

// ── Ausgabe ─────────────────────────────────────────────────────────────────

function abschnitt(titel) {
  console.log(`\n── ${titel} ${"─".repeat(Math.max(0, 72 - titel.length))}`);
}

/** Ein Angriff: `zu` = true heisst, die Datenbank hat ihn abgewehrt. */
function sperre(zu, text, detail) {
  ergebnisse.push({ fehler: !zu });
  console.log(`  ${zu ? "gesperrt ✅" : "offen ❌   "}  ${text}${detail ? `  (${detail})` : ""}`);
}

/** Ein legitimer Weg der App: `geht` = true heisst, er funktioniert weiter. */
function erlaubt(geht, text, detail) {
  ergebnisse.push({ fehler: !geht });
  console.log(`  ${geht ? "erlaubt ✅ " : "kaputt ❌  "}  ${text}${detail ? `  (${detail})` : ""}`);
}

function hinweis(text) {
  console.log(`  Hinweis     ${text}`);
}

function kurz(fehler) {
  if (!fehler) return "";
  return [fehler.code, fehler.message].filter(Boolean).join(" ").slice(0, 140);
}

const istRlsAbweisung = (fehler) => fehler?.code === "42501" || /row-level security/i.test(fehler?.message ?? "");
const tabelleFehlt = (fehler) =>
  fehler?.code === "42P01" || fehler?.code === "PGRST205" || /does not exist|schema cache/i.test(fehler?.message ?? "");

// ── Konten ──────────────────────────────────────────────────────────────────

async function kontoAnlegen(kennung) {
  const email = `delivered+cc-rls-probe-${ZEIT}-${kennung}@resend.dev`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS-Pruefung ${kennung.toUpperCase()}` },
  });
  if (error || !data?.user) throw new Error(`Konto ${kennung} konnte nicht angelegt werden: ${kurz(error)}`);
  const id = data.user.id;
  konten.push({ kennung, id });

  const client = createClient(URL, ANON, OHNE_SITZUNG);
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) {
    // Fallback, falls Passwort-Login gesperrt ist (z. B. Captcha): Magic-Link-Token
    // ueber die Admin-API erzeugen und direkt einloesen. Es wird keine Mail verschickt.
    const link = await service.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) throw new Error(`Login ${kennung} fehlgeschlagen: ${kurz(login.error)}`);
    const otp = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (otp.error) throw new Error(`Login ${kennung} fehlgeschlagen: ${kurz(otp.error)}`);
  }

  // Das Profil legt der Registrierungs-Trigger an (Migration 003).
  const { data: profil } = await service.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!profil) throw new Error(`Konto ${kennung}: Profilzeile fehlt — Trigger handle_new_user pruefen.`);
  return { kennung, id, client };
}

async function profilVon(id, spalten) {
  const { data, error } = await service.from("profiles").select(spalten).eq("id", id).maybeSingle();
  if (error) throw new Error(`Profil lesen (Service): ${kurz(error)}`);
  return data;
}

// ── 1. Befund vorab ─────────────────────────────────────────────────────────

async function befundVorab() {
  abschnitt("Befund vorab (nur lesend)");

  const { data: admins, error: adminFehler } = await service
    .from("profiles")
    .select("id, admin_role, created_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: false });
  if (adminFehler) {
    hinweis(`Admin-Liste nicht lesbar: ${kurz(adminFehler)}`);
  } else {
    hinweis(`${admins.length} Profile mit is_admin = true (neueste zuerst — unbekannte Konten pruefen):`);
    for (const a of admins) {
      console.log(`              ${a.id.slice(0, 8)}…  Rolle ${a.admin_role ?? "—"}  angelegt ${String(a.created_at).slice(0, 10)}`);
    }
  }

  const { data: nachweise, error: nachweisFehler } = await service
    .from("certificates")
    .select("user_id, storage_key, status, reviewed_by, is_public");
  if (nachweisFehler) {
    hinweis(`certificates nicht lesbar: ${kurz(nachweisFehler)}`);
  } else {
    const fremderSchluessel = nachweise.filter((n) => !String(n.storage_key).startsWith(`certificates/${n.user_id}/`));
    const ohnePruefer = nachweise.filter((n) => (n.status === "approved" || n.is_public) && !n.reviewed_by);
    hinweis(
      `certificates: ${nachweise.length} Zeilen, davon ${fremderSchluessel.length} mit Dateischluessel ausserhalb des eigenen Ordners, ` +
        `${ohnePruefer.length} freigegeben/oeffentlich ohne Pruefer (beides sollte 0 sein).`,
    );
  }
}

// ── 2. Profile ──────────────────────────────────────────────────────────────

const ESKALATION = {
  is_admin: true,
  admin_role: "editor", // bewusst nicht 'owner': das haette Nebenwirkungen auf die Owner-Logik
  is_paid: true,
  membership_tier: "lifetime",
  access_until: "2099-12-31T00:00:00+00:00",
  stripe_customer_id: `cus_rlsprobe${ZEIT}`,
  lifetime_purchased_at: "2026-01-01T00:00:00+00:00",
  lifetime_offer_group: "rls-probe",
  application_status: "approved",
  step2_application_status: "approved",
  dunning_admin_note: "rls-probe",
  payment_failed_email_1_sent_at: "2026-01-01T00:00:00+00:00",
  ht_upsell_email_sent_at: "2026-01-01T00:00:00+00:00",
  created_at: "2000-01-01T00:00:00+00:00",
  discord_id: "rls-probe",
  discord_access_token: "rls-probe",
  discord_refresh_token: "rls-probe",
};

function gleich(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return a == b;
  const datum = /^\d{4}-\d\d-\d\d/;
  if (typeof a === "string" && typeof b === "string" && datum.test(a) && datum.test(b)) {
    // `streak_last_activity` ist eine date-Spalte: Postgres kuerzt den Zeitstempel,
    // den die App hineinschreibt, auf den Tag. Dann nur den Tag vergleichen.
    if (a.length === 10 || b.length === 10) return a.slice(0, 10) === b.slice(0, 10);
    return new Date(a).getTime() === new Date(b).getTime();
  }
  return a === b;
}

async function profilePruefen(A, B) {
  abschnitt("profiles — Lesen");

  const eigen = await A.client.from("profiles").select("id, full_name, is_admin, is_paid").eq("id", A.id).maybeSingle();
  erlaubt(Boolean(eigen.data) && !eigen.error, "eigenes Profil lesen", kurz(eigen.error));

  const fremd = await A.client.from("profiles").select("id").eq("id", B.id);
  sperre((fremd.data ?? []).length === 0, "fremdes Profil lesen", fremd.error ? kurz(fremd.error) : `${(fremd.data ?? []).length} Zeile(n) sichtbar`);

  const alle = await A.client.from("profiles").select("id", { count: "exact", head: true });
  sperre((alle.count ?? 0) <= 1, "alle Profile zaehlen", `${alle.count ?? 0} Zeilen sichtbar, erwartet 1`);

  const anonymLesen = await anon.from("profiles").select("id", { count: "exact", head: true });
  sperre((anonymLesen.count ?? 0) === 0, "Profile ohne Login lesen", `${anonymLesen.count ?? 0} Zeilen sichtbar`);

  const rpc = await A.client.rpc("ist_admin");
  const hatIstAdmin = !rpc.error;
  if (rpc.error) {
    hinweis(`public.ist_admin() fehlt — Migration 074 ist nicht eingespielt (${kurz(rpc.error)})`);
  } else {
    sperre(rpc.data === false, "ist_admin() meldet fuer ein normales Konto false", `Ergebnis ${JSON.stringify(rpc.data)}`);
  }

  abschnitt("profiles — Schreiben");

  // Legitime Wege der App ueber den Nutzer-Client (Profilformular, Onboarding,
  // Streak/Lernzeit, letzter Login, Discord trennen). Diese muessen weiter gehen.
  const jetzt = new Date().toISOString();
  const legitim = {
    full_name: "RLS-Pruefung A",
    username: `rls-probe-${ZEIT}`,
    avatar_url: null,
    codex_accepted: true,
    codex_accepted_at: jetzt,
    intro_video_watched: true,
    intro_video_watched_at: jetzt,
    usage_agreement_accepted: true,
    usage_agreement_accepted_at: jetzt,
    streak_current: 1,
    streak_longest: 1,
    streak_last_activity: jetzt,
    total_learning_minutes: 1,
    last_login_at: jetzt,
    churn_email_1_sent_at: null,
    churn_email_2_sent_at: null,
    discord_id: null,
    discord_username: null,
    discord_access_token: null,
    discord_refresh_token: null,
  };
  const legitUpdate = await A.client.from("profiles").update(legitim).eq("id", A.id);
  const nachLegit = await profilVon(A.id, Object.keys(legitim).join(","));
  const abweichend = Object.keys(legitim).filter((k) => !gleich(nachLegit?.[k], legitim[k]));
  erlaubt(
    !legitUpdate.error && abweichend.length === 0,
    "eigene Profilfelder aendern (Name, Onboarding, Streak, Login, Discord trennen)",
    legitUpdate.error ? kurz(legitUpdate.error) : abweichend.length ? `nicht uebernommen: ${abweichend.join(", ")}` : "",
  );

  // Selbst-Eskalation: ein Update mit allen geschuetzten Spalten, danach jede
  // Spalte einzeln ueber den Service-Client nachlesen. Ob der Trigger (073) still
  // zuruecksetzt oder ablehnt, ist egal — gezaehlt wird, was in der Zeile steht.
  const vorher = await profilVon(A.id, Object.keys(ESKALATION).join(","));
  const eskalation = await A.client.from("profiles").update(ESKALATION).eq("id", A.id);
  const nachher = await profilVon(A.id, Object.keys(ESKALATION).join(","));
  for (const spalte of Object.keys(ESKALATION)) {
    const geaendert = !gleich(nachher?.[spalte], vorher?.[spalte]);
    sperre(!geaendert, `Selbst-Eskalation: ${spalte} am eigenen Profil setzen`, geaendert ? "Wert wurde uebernommen" : "");
  }
  if (eskalation.error) hinweis(`Die Datenbank hat das Eskalations-Update abgelehnt: ${kurz(eskalation.error)}`);

  // Fremde Zeile aendern — Ziel ist ausschliesslich das Wegwerf-Konto B.
  const bVorher = await profilVon(B.id, "full_name, is_paid");
  const fremdUpdate = await A.client.from("profiles").update({ full_name: "gekapert", is_paid: true }).eq("id", B.id);
  const bNachher = await profilVon(B.id, "full_name, is_paid");
  sperre(
    gleich(bNachher?.full_name, bVorher?.full_name) && gleich(bNachher?.is_paid, bVorher?.is_paid),
    "fremdes Profil aendern",
    kurz(fremdUpdate.error),
  );

  return { hatIstAdmin };
}

/** Laeuft zuletzt: loescht A's Profil und versucht, es selbst neu anzulegen. */
async function profilEinfuegenPruefen(A) {
  abschnitt("profiles — Einfuegen");
  await service.from("profiles").delete().eq("id", A.id);
  const einfuegen = await A.client
    .from("profiles")
    .insert({ id: A.id, full_name: "RLS-Pruefung A", is_admin: true, is_paid: true, membership_tier: "lifetime" });
  if (einfuegen.error) {
    sperre(istRlsAbweisung(einfuegen.error), "eigenes Profil mit Rechten selbst anlegen", kurz(einfuegen.error));
    return;
  }
  const neu = await profilVon(A.id, "is_admin, is_paid, membership_tier");
  const rechte = Boolean(neu?.is_admin) || Boolean(neu?.is_paid) || neu?.membership_tier !== "free";
  sperre(!rechte, "eigenes Profil mit Rechten selbst anlegen", rechte ? "Rechte uebernommen" : "Anlegen moeglich, Rechte-Spalten erzwungen (073)");
  hinweis("Nutzer koennen ihr Profil noch selbst anlegen — mit 074 entfaellt profiles_insert_own.");
}

async function adminPruefen(C, B) {
  abschnitt("profiles — Admin-Sicht (Wegwerf-Admin C)");
  const { error } = await service.from("profiles").update({ is_admin: true }).eq("id", C.id);
  if (error) {
    hinweis(`C konnte nicht zum Admin gemacht werden: ${kurz(error)}`);
    return;
  }
  const rpc = await C.client.rpc("ist_admin");
  erlaubt(rpc.data === true, "ist_admin() erkennt Admins", kurz(rpc.error) || `Ergebnis ${JSON.stringify(rpc.data)}`);
  const alle = await C.client.from("profiles").select("id", { count: "exact", head: true });
  erlaubt((alle.count ?? 0) > 3, "Admin liest alle Profile (requireAdminRole zaehlt Owner darueber)", `${alle.count ?? 0} Zeilen sichtbar`);
  const fremd = await C.client.from("profiles").select("id").eq("id", B.id).maybeSingle();
  erlaubt(Boolean(fremd.data), "Admin liest ein fremdes Profil", kurz(fremd.error));
}

// ── 3. Weitere Tabellen: Schreibwege (Migration 075) ────────────────────────

/**
 * Versuch als A; gelingt er, wird die Zeile sofort ueber den Service-Client entfernt.
 * `mitRueckgabe: false` fuer Clients ohne Lese-Policy auf der Tabelle (anon): Ein
 * INSERT … RETURNING scheitert sonst an der SELECT-Policy und saehe faelschlich
 * wie eine gesperrte Einfuege-Policy aus.
 */
async function einfuegenVersuch(client, tabelle, zeile, text, { mitRueckgabe = true } = {}) {
  const res = mitRueckgabe
    ? await client.from(tabelle).insert(zeile).select("id")
    : await client.from(tabelle).insert(zeile);
  if (!res.error) {
    for (const r of res.data ?? []) if (r.id) await service.from(tabelle).delete().eq("id", r.id);
    sperre(false, text, "Zeile wurde angelegt (und gleich wieder geloescht)");
    return;
  }
  if (tabelleFehlt(res.error)) {
    hinweis(`${tabelle}: Tabelle fehlt — ${text} nicht pruefbar`);
    return;
  }
  // Nur eine RLS-Abweisung zaehlt als „gesperrt“. Andere Fehler (Fremdschluessel,
  // Check-Constraint) heissen: Die Policy liess durch, nur etwas anderes hielt an.
  sperre(istRlsAbweisung(res.error), text, kurz(res.error));
}

async function weitereTabellenSchreiben(A) {
  abschnitt("Weitere Tabellen — Schreiben (Migration 075)");

  const eigenerOrdner = `certificates/${A.id}/${ZEIT}-rls-probe.png`;
  const beschriftung = "RLS-Pruefung — wird sofort geloescht";
  await einfuegenVersuch(
    A.client,
    "certificates",
    { user_id: A.id, storage_key: eigenerOrdner, caption: beschriftung, status: "approved" },
    "certificates: Nachweis selbst freigeben (status = approved)",
  );
  await einfuegenVersuch(
    A.client,
    "certificates",
    { user_id: A.id, storage_key: eigenerOrdner, caption: beschriftung, is_public: true },
    "certificates: Nachweis selbst oeffentlich schalten",
  );
  await einfuegenVersuch(
    A.client,
    "certificates",
    { user_id: A.id, storage_key: "covers/cc-rls-probe.png", caption: beschriftung },
    "certificates: fremden Dateischluessel eintragen",
  );
  await einfuegenVersuch(
    A.client,
    "certificates",
    { user_id: A.id, storage_key: `certificates/${A.id}/../../covers/cc-rls-probe.png`, caption: beschriftung },
    "certificates: Dateischluessel mit ../ eintragen",
  );
  {
    // So schreibt POST /api/certificates — muss weiter gehen.
    const res = await A.client
      .from("certificates")
      .insert({ user_id: A.id, storage_key: eigenerOrdner, caption: beschriftung })
      .select("id");
    for (const r of res.data ?? []) await service.from("certificates").delete().eq("id", r.id);
    erlaubt(!res.error, "certificates: Nachweis einreichen wie die App", kurz(res.error));
  }

  await einfuegenVersuch(
    A.client,
    "discord_connections",
    { user_id: A.id, discord_user_id: `rls-probe-${ZEIT}` },
    "discord_connections: Verknuepfung mit frei gewaehlter Discord-ID anlegen",
  );
  {
    // Aendern: Zeile wie im OAuth-Callback ueber den Service-Client anlegen, dann als A umbiegen.
    const alt = `rls-probe-${ZEIT}-a`;
    const anlegen = await service.from("discord_connections").insert({ user_id: A.id, discord_user_id: alt });
    if (anlegen.error) {
      hinweis(`discord_connections: Testzeile nicht anlegbar — Aendern nicht pruefbar (${kurz(anlegen.error)})`);
    } else {
      const aendern = await A.client
        .from("discord_connections")
        .update({ discord_user_id: `rls-probe-${ZEIT}-b` })
        .eq("user_id", A.id);
      const { data: jetzt } = await service.from("discord_connections").select("discord_user_id").eq("user_id", A.id).maybeSingle();
      sperre(jetzt?.discord_user_id === alt, "discord_connections: Discord-ID der eigenen Verknuepfung umbiegen", kurz(aendern.error));
      const lesen = await A.client.from("discord_connections").select("discord_user_id").eq("user_id", A.id).maybeSingle();
      erlaubt(Boolean(lesen.data), "discord_connections: eigene Verknuepfung lesen", kurz(lesen.error));
      const loeschen = await A.client.from("discord_connections").delete().eq("user_id", A.id);
      const { data: rest } = await service.from("discord_connections").select("user_id").eq("user_id", A.id);
      erlaubt(!loeschen.error && (rest ?? []).length === 0, "discord_connections: eigene Verknuepfung trennen", kurz(loeschen.error));
    }
  }

  await einfuegenVersuch(
    A.client,
    "support_tickets",
    { user_id: A.id, subject: beschriftung, status: "resolved", priority: "high", first_response_at: new Date().toISOString() },
    "support_tickets: Ticket mit Prioritaet/Status/Antwortstempel anlegen",
  );
  {
    const res = await A.client.from("support_tickets").insert({ user_id: A.id, subject: beschriftung, category: null }).select("id");
    for (const r of res.data ?? []) await service.from("support_tickets").delete().eq("id", r.id);
    erlaubt(!res.error, "support_tickets: Ticket anlegen wie die App", kurz(res.error));
  }

  await einfuegenVersuch(
    A.client,
    "step2_applications",
    { user_id: A.id, answers: {}, status: "approved" },
    "step2_applications: Bewerbung mit Status approved anlegen",
  );
  await einfuegenVersuch(
    A.client,
    "cancellations",
    { user_id: A.id, reason: beschriftung },
    "cancellations: Kuendigungseintrag direkt anlegen",
  );
  // Ohne Login, mit einem Link, den es nicht gibt: Selbst wenn die Policy
  // durchlaesst, verhindert der Fremdschluessel die Zeile — es entsteht nichts.
  await einfuegenVersuch(
    anon,
    "insight_tracking_events",
    { link_slug: `cc-rls-probe-${ZEIT}`, event_type: "visit", session_id: "rls-probe" },
    "insight_tracking_events: Tracking-Ereignis ohne Login anlegen",
    { mitRueckgabe: false },
  );
}

// ── 4. Weitere Tabellen: Lesen ──────────────────────────────────────────────

/**
 * Tabellen, in denen ein frisches Konto keine einzige Zeile sehen darf: Es hat
 * selbst noch nichts angelegt, jede sichtbare Zeile gehoert also jemand anderem.
 */
const PRIVAT = [
  "subscriptions",
  "payments",
  "stripe_webhook_events",
  "checkout_sessions",
  "coupons",
  "coupon_redemptions",
  "cancellations",
  "kuendigungen",
  "applications",
  "high_ticket_applications",
  "step2_applications",
  "email_sequence_log",
  "user_audit_log",
  "gdpr_export_requests",
  "support_tickets",
  "support_ticket_messages",
  "discord_connections",
  "discord_invites",
  "discord_leads",
  "discord_page_visits",
  "discord_video_views",
  "discord_channels",
  "discord_sync_log",
  "telegram_leads",
  "insight_tracking_links",
  "insight_tracking_events",
  "trading_journals",
  "trading_journal_trades",
  "journal_accounts",
  "journal_import_batches",
  "journal_trades",
  "user_notes",
  "user_progress",
  "homework_user_official_done",
  "homework_user_custom_tasks",
  "news_saves",
  "news_read_status",
];

async function zaehlen(client, tabelle, filter) {
  let q = client.from(tabelle).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  return q;
}

async function weitereTabellenLesen(A) {
  abschnitt("Weitere Tabellen — fremde Zeilen lesen (frisches Konto A)");
  for (const tabelle of PRIVAT) {
    const res = await zaehlen(A.client, tabelle);
    if (res.error && tabelleFehlt(res.error)) {
      hinweis(`${tabelle}: Tabelle fehlt in der Datenbank`);
      continue;
    }
    sperre(!res.error ? (res.count ?? 0) === 0 : true, `${tabelle} lesen`, res.error ? kurz(res.error) : `${res.count ?? 0} fremde Zeile(n)`);
  }
  {
    // Freigegebene, oeffentliche Nachweise sind fuer alle gedacht (/erfolge) — alles andere nicht.
    const res = await zaehlen(A.client, "certificates", (q) => q.or("status.neq.approved,is_public.eq.false"));
    sperre(!res.error ? (res.count ?? 0) === 0 : true, "certificates lesen (nicht freigegebene)", res.error ? kurz(res.error) : `${res.count ?? 0} fremde Zeile(n)`);
  }
  {
    const res = await zaehlen(anon, "app_settings");
    hinweis(`app_settings: ${res.count ?? 0} Eintraege ohne Login lesbar (gewollt: Wartungsmodus, Lifetime-Schalter — dort keine Geheimnisse ablegen)`);
  }
}

// ── 5. Bezahlte Inhalte (Migration 076) ────────────────────────────────────

const INHALTE = ["videos", "video_attachments", "standalone_attachments", "quizzes", "analysis_posts", "live_session_videos"];

/** Alle Zeilen einer Tabelle, seitenweise (PostgREST liefert hoechstens 1000 je Anfrage). */
async function alleZeilen(client, tabelle, spalten) {
  const zeilen = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await client.from(tabelle).select(spalten).order("id").range(von, von + 999);
    if (error) return { zeilen, fehler: error };
    zeilen.push(...(data ?? []));
    if (!data || data.length < 1000) return { zeilen, fehler: null };
  }
}

function einzeln(v) {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

/**
 * Bestand ueber den Service-Client: je Inhaltstabelle alle IDs und die IDs, die
 * auch ohne Zahlung lesbar sein sollen. Die Regel ist dieselbe wie in Migration
 * 076 (`modul_ist_frei`, `video_ist_frei`, `live_session_ist_frei`) — sie steht
 * hier bewusst noch einmal ausgeschrieben, damit das Skript die Datenbank prueft
 * und nicht sich selbst.
 */
async function inhaltsBestand() {
  const lies = async (tabelle, spalten) => {
    const { zeilen, fehler } = await alleZeilen(service, tabelle, spalten);
    if (fehler) throw new Error(`${tabelle} lesen (Service): ${kurz(fehler)}`);
    return zeilen;
  };
  const kurse = await lies("courses", "id, is_free");
  const modulZeilen = await lies("modules", "id, course_id");
  const subkategorien = await lies("subcategories", "id, module_id");
  const videos = await lies("videos", "id, is_published, module_id, subcategory_id");
  const videoAnhaenge = await lies("video_attachments", "id, video_id, is_free");
  const anhaenge = await lies("standalone_attachments", "id, is_free");
  const quizze = await lies("quizzes", "id, module_id");
  const analysen = await lies("analysis_posts", "id");
  const sessions = await lies("live_sessions", "id, live_session_categories ( title )");
  const sessionVideos = await lies("live_session_videos", "id, session_id");

  const freieKurse = new Set(kurse.filter((k) => k.is_free === true).map((k) => k.id));
  const freieModule = new Set(modulZeilen.filter((m) => freieKurse.has(m.course_id)).map((m) => m.id));
  const modulVonSub = new Map(subkategorien.map((s) => [s.id, s.module_id]));
  const freieVideos = new Set(
    videos
      .filter((v) => v.is_published === true && freieModule.has(v.module_id ?? modulVonSub.get(v.subcategory_id)))
      .map((v) => v.id),
  );
  const freieSessions = new Set(
    sessions
      .filter((s) => String(einzeln(s.live_session_categories)?.title ?? "").toLowerCase().includes("wochenrecap"))
      .map((s) => s.id),
  );

  const ids = (zeilen) => new Set(zeilen.map((z) => z.id));
  return {
    alle: {
      videos: ids(videos),
      video_attachments: ids(videoAnhaenge),
      standalone_attachments: ids(anhaenge),
      quizzes: ids(quizze),
      analysis_posts: ids(analysen),
      live_session_videos: ids(sessionVideos),
    },
    frei: {
      videos: freieVideos,
      video_attachments: ids(videoAnhaenge.filter((a) => a.is_free === true && freieVideos.has(a.video_id))),
      standalone_attachments: ids(anhaenge.filter((a) => a.is_free === true)),
      quizzes: ids(quizze.filter((q) => freieModule.has(q.module_id))),
      analysis_posts: new Set(),
      live_session_videos: ids(sessionVideos.filter((v) => freieSessions.has(v.session_id))),
    },
    // Fuer die Fortschritts-Pruefung: ein Modul aus einem bezahlten und eines aus einem Free-Kurs.
    bezahltesModul: modulZeilen.find((m) => m.course_id && !freieKurse.has(m.course_id))?.id ?? null,
    freiesModul: modulZeilen.find((m) => freieModule.has(m.id))?.id ?? null,
  };
}

/** Konto ohne Zugang: keine bezahlte Zeile sichtbar, alle freien Zeilen sichtbar. */
async function ohneZugangLesen(konto, bestand, wer) {
  for (const tabelle of INHALTE) {
    const { zeilen, fehler } = await alleZeilen(konto.client, tabelle, "id");
    if (fehler) {
      sperre(true, `${wer}: ${tabelle} lesen`, kurz(fehler));
      continue;
    }
    const frei = bestand.frei[tabelle];
    const bezahltSichtbar = zeilen.filter((z) => !frei.has(z.id)).length;
    const bezahltGesamt = bestand.alle[tabelle].size - frei.size;
    sperre(bezahltSichtbar === 0, `${wer}: bezahlte Zeilen in ${tabelle} lesen`, `${bezahltSichtbar} von ${bezahltGesamt} sichtbar`);
    if (frei.size === 0) continue;
    const freiSichtbar = zeilen.filter((z) => frei.has(z.id)).length;
    erlaubt(freiSichtbar === frei.size, `${wer}: freie Zeilen in ${tabelle} lesen`, `${freiSichtbar} von ${frei.size} sichtbar`);
  }
}

/** Konto mit Zugang (oder Admin): jede Zeile sichtbar. */
async function mitZugangLesen(konto, bestand, wer) {
  for (const tabelle of INHALTE) {
    const { zeilen, fehler } = await alleZeilen(konto.client, tabelle, "id");
    const gesamt = bestand.alle[tabelle].size;
    erlaubt(
      !fehler && zeilen.length === gesamt,
      `${wer}: ${tabelle} vollstaendig lesen`,
      fehler ? kurz(fehler) : `${zeilen.length} von ${gesamt} sichtbar`,
    );
  }
}

let hatZugangFehltGemeldet = false;

async function hatZugangMeldet(konto, erwartet, wer) {
  const rpc = await konto.client.rpc("hat_zugang");
  if (rpc.error) {
    if (!hatZugangFehltGemeldet) {
      hinweis(`public.hat_zugang() fehlt — Migration 076 ist nicht eingespielt (${kurz(rpc.error)})`);
      hatZugangFehltGemeldet = true;
    }
    return;
  }
  const text = `${wer}: hat_zugang() meldet ${erwartet}`;
  if (erwartet) erlaubt(rpc.data === true, text, `Ergebnis ${JSON.stringify(rpc.data)}`);
  else sperre(rpc.data === false, text, `Ergebnis ${JSON.stringify(rpc.data)}`);
}

const IN_30_TAGEN = new Date(Date.now() + 30 * 86_400_000).toISOString();
const MORGEN = new Date(Date.now() + 86_400_000).toISOString();

/**
 * Die Profilzustaende mit Zahlung aus dem Bestand (Stand 19.09.2026) plus das
 * pausierte Abo. Regel: Zugang heisst `is_paid` (oder Admin) — unabhaengig von
 * Stufe und `access_until`. Die Whop-Altkonten (Stufe `free`, `is_paid = true`)
 * muessen deshalb alles lesen, ein pausiertes Abo (`is_paid = false`, Zugang
 * bis Periodenende) nichts — so entscheidet auch das Institut.
 */
const ZAHL_ZUSTAENDE = [
  { name: "Abo", zugang: true, profil: { membership_tier: "monthly", is_paid: true, access_until: IN_30_TAGEN } },
  { name: "Whop-Altbestand", zugang: true, profil: { membership_tier: "free", is_paid: true, access_until: null } },
  { name: "Lifetime", zugang: true, profil: { membership_tier: "lifetime", is_paid: true, access_until: null } },
  { name: "Abo pausiert", zugang: false, profil: { membership_tier: "monthly", is_paid: false, access_until: MORGEN } },
];

async function inhaltePruefen(A, P, C, bestand) {
  abschnitt("Bezahlte Inhalte — Konto ohne Zahlung (A)");
  hinweis(`Bestand (frei/gesamt): ${INHALTE.map((t) => `${t} ${bestand.frei[t].size}/${bestand.alle[t].size}`).join(", ")}`);
  const ohneFreie = INHALTE.filter((t) => t !== "analysis_posts" && bestand.frei[t].size === 0);
  if (ohneFreie.length > 0) {
    hinweis(`keine freien Zeilen im Bestand, Freigabe dort nicht pruefbar: ${ohneFreie.join(", ")}`);
  }
  await hatZugangMeldet(A, false, "ohne Zahlung");
  await ohneZugangLesen(A, bestand, "ohne Zahlung");

  for (const zustand of ZAHL_ZUSTAENDE) {
    abschnitt(`Bezahlte Inhalte — ${zustand.name} (P)`);
    const { error } = await service.from("profiles").update(zustand.profil).eq("id", P.id);
    if (error) {
      hinweis(`P konnte nicht auf „${zustand.name}“ gesetzt werden: ${kurz(error)}`);
      continue;
    }
    await hatZugangMeldet(P, zustand.zugang, zustand.name);
    if (zustand.zugang) await mitZugangLesen(P, bestand, zustand.name);
    else await ohneZugangLesen(P, bestand, zustand.name);
  }
  // P fuer die Fortschritts-Pruefung wieder als Abo.
  await service.from("profiles").update(ZAHL_ZUSTAENDE[0].profil).eq("id", P.id);

  if (C) {
    abschnitt("Bezahlte Inhalte — Admin (C)");
    await hatZugangMeldet(C, true, "Admin");
    await mitZugangLesen(C, bestand, "Admin");
  }
}

// ── 6. Fortschritt (Migration 077) ──────────────────────────────────────────

async function fortschrittVon(userId, moduleId) {
  const { data } = await service
    .from("user_progress")
    .select("id, completed, completed_at")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}

async function fortschrittPruefen(A, B, P, bestand) {
  abschnitt("user_progress — Schreiben (Migration 077)");
  const { bezahltesModul, freiesModul } = bestand;
  if (!bezahltesModul) {
    hinweis("Kein Modul in einem bezahlten Kurs gefunden — Pruefung uebersprungen.");
    return;
  }

  // So schreibt POST /api/progress: Upsert auf (user_id, module_id), ohne Rueckgabe.
  const wieDieApp = (konto, moduleId, extra = {}) =>
    konto.client
      .from("user_progress")
      .upsert(
        { user_id: konto.id, module_id: moduleId, video_progress_seconds: 1, updated_at: new Date().toISOString(), ...extra },
        { onConflict: "user_id,module_id" },
      );

  try {
    {
      const res = await wieDieApp(A, bezahltesModul);
      const zeile = await fortschrittVon(A.id, bezahltesModul);
      sperre(!zeile, "ohne Zahlung: Fortschritt zu einem bezahlten Modul anlegen", zeile ? "Zeile wurde angelegt" : kurz(res.error));
    }
    {
      const res = await A.client.from("user_progress").insert({ user_id: B.id, module_id: bezahltesModul, completed: true });
      const zeile = await fortschrittVon(B.id, bezahltesModul);
      sperre(!zeile, "Fortschritt fuer ein fremdes Konto anlegen", zeile ? "Zeile wurde angelegt" : kurz(res.error));
    }

    if (freiesModul) {
      const res = await wieDieApp(A, freiesModul);
      const zeile = await fortschrittVon(A.id, freiesModul);
      erlaubt(Boolean(zeile), "ohne Zahlung: Fortschritt im Free-Kurs speichern wie die App", kurz(res.error));
    } else {
      hinweis("Kein Modul in einem Free-Kurs gefunden — Freigabe fuer Konten ohne Zahlung nicht pruefbar.");
    }

    {
      const res = await wieDieApp(P, bezahltesModul, { completed: true, completed_at: new Date().toISOString() });
      const zeile = await fortschrittVon(P.id, bezahltesModul);
      erlaubt(Boolean(zeile?.completed), "Abo: Fortschritt zu einem bezahlten Modul speichern wie die App", kurz(res.error));
      if (zeile) {
        const zurueck = await P.client.from("user_progress").update({ completed: false, completed_at: null }).eq("id", zeile.id);
        const danach = await fortschrittVon(P.id, bezahltesModul);
        sperre(danach?.completed === true, "abgeschlossenes Modul wieder auf „nicht abgeschlossen“ setzen", kurz(zurueck.error));
        const loeschen = await P.client.from("user_progress").delete().eq("id", zeile.id);
        const rest = await fortschrittVon(P.id, bezahltesModul);
        sperre(Boolean(rest), "eigenen Fortschritt loeschen (die App tut das nie)", kurz(loeschen.error));
      }
    }
  } finally {
    // Sofort aufraeumen: `user_progress.user_id` haengt ohne Cascade an `profiles`,
    // und die letzte Pruefung loescht A's Profilzeile.
    await service.from("user_progress").delete().in("user_id", [A.id, B.id, P.id]);
  }
}

// ── 7. Discord-Tokens (Migration 077) ───────────────────────────────────────

async function discordTokensPruefen() {
  abschnitt("Discord-OAuth-Tokens (Migration 077)");
  for (const tabelle of ["profiles", "discord_connections"]) {
    const res = await service
      .from(tabelle)
      .select("*", { count: "exact", head: true })
      .or("discord_access_token.not.is.null,discord_refresh_token.not.is.null");
    sperre(
      !res.error && (res.count ?? 0) === 0,
      `${tabelle}: gespeicherte Discord-Tokens im Klartext`,
      res.error ? kurz(res.error) : `${res.count ?? 0} Zeile(n) mit Token`,
    );
  }
}

// ── 8. Aufraeumen ───────────────────────────────────────────────────────────

// `user_progress` zuerst: `user_id` haengt ohne Cascade an `profiles`.
const PROBE_TABELLEN = [
  "user_progress",
  "certificates",
  "support_tickets",
  "step2_applications",
  "cancellations",
  "discord_connections",
];

async function aufraeumen() {
  abschnitt("Aufraeumen");
  if (konten.length === 0) {
    console.log("  Es wurden keine Konten angelegt.");
    return true;
  }
  const ids = konten.map((k) => k.id);

  for (const tabelle of PROBE_TABELLEN) {
    const { error } = await service.from(tabelle).delete().in("user_id", ids);
    if (error && !tabelleFehlt(error)) console.log(`  ${tabelle}: Loeschen fehlgeschlagen — ${kurz(error)}`);
  }
  await service.from("insight_tracking_events").delete().eq("link_slug", `cc-rls-probe-${ZEIT}`);
  // Profilzeilen ausdruecklich loeschen: profiles.id haengt nicht per Cascade an auth.users.
  const { error: profilFehler } = await service.from("profiles").delete().in("id", ids);
  if (profilFehler) console.log(`  profiles: Loeschen fehlgeschlagen — ${kurz(profilFehler)}`);
  for (const id of ids) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) console.log(`  Auth-User ${id.slice(0, 8)}…: Loeschen fehlgeschlagen — ${kurz(error)}`);
  }

  // Beleg: alles weg?
  let sauber = true;
  const { data: restProfile, error: restFehler } = await service.from("profiles").select("id").in("id", ids);
  if (restFehler || (restProfile ?? []).length > 0) {
    sauber = false;
    console.log(`  ❌ profiles: ${(restProfile ?? []).length} Zeile(n) uebrig ${kurz(restFehler)}`);
  }
  for (const tabelle of PROBE_TABELLEN) {
    const { data, error } = await service.from(tabelle).select("user_id").in("user_id", ids);
    if (error && tabelleFehlt(error)) continue;
    if (error || (data ?? []).length > 0) {
      sauber = false;
      console.log(`  ❌ ${tabelle}: ${(data ?? []).length} Zeile(n) uebrig ${kurz(error)}`);
    }
  }
  for (const k of konten) {
    const { data, error } = await service.auth.admin.getUserById(k.id);
    const nochDa = Boolean(data?.user) && !error;
    if (nochDa) {
      sauber = false;
      console.log(`  ❌ Auth-User ${k.kennung.toUpperCase()} (${k.id}) existiert noch`);
    }
  }
  if (sauber) {
    console.log(`  ${konten.length} Wegwerf-Konten entfernt — belegt: keine Profilzeile, keine Probe-Zeile, kein Auth-User mehr.`);
    console.log(`  IDs: ${konten.map((k) => `${k.kennung.toUpperCase()}=${k.id}`).join("  ")}`);
  } else {
    console.log("  ❌ Nicht alles entfernt — die IDs oben von Hand im Supabase-Dashboard loeschen.");
  }
  return sauber;
}

// ── Ablauf ──────────────────────────────────────────────────────────────────

let sauber = false;
try {
  console.log("RLS-Pruefung gegen die echte Datenbank (Wegwerf-Konten, anon-Key + Login)");
  await befundVorab();

  const A = await kontoAnlegen("a");
  const B = await kontoAnlegen("b");

  // Lesen zuerst: Solange A noch nichts angelegt hat, ist jede sichtbare Zeile fremd.
  await weitereTabellenLesen(A);
  const { hatIstAdmin } = await profilePruefen(A, B);
  let C = null;
  if (hatIstAdmin) {
    C = await kontoAnlegen("c");
    await adminPruefen(C, B);
  } else {
    hinweis("Admin-Sicht nicht geprueft — erst nach Migration 074 sinnvoll.");
  }
  await weitereTabellenSchreiben(A);

  const P = await kontoAnlegen("p");
  const bestand = await inhaltsBestand();
  await inhaltePruefen(A, P, C, bestand);
  await fortschrittPruefen(A, B, P, bestand);
  await discordTokensPruefen();
  await profilEinfuegenPruefen(A);
} catch (err) {
  ergebnisse.push({ fehler: true });
  console.error(`\nAbbruch: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  try {
    sauber = await aufraeumen();
  } catch (err) {
    console.error(`  ❌ Aufraeumen abgebrochen: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`  Von Hand loeschen (profiles-Zeile UND Auth-User): ${konten.map((k) => k.id).join(", ")}`);
  }
}

const fehler = ergebnisse.filter((e) => e.fehler).length;
abschnitt("Ergebnis");
console.log(
  fehler === 0
    ? "  Alle Versuche gesperrt, alle App-Wege funktionieren."
    : `  ${fehler} Punkt(e) mit ❌ — siehe oben. Offene Luecken schliessen die Migrationen 073–077.`,
);
process.exit(fehler === 0 && sauber ? 0 : 1);
