/**
 * Synct alle unbezahlten Mitglieder als Resend-Contacts in ein Resend-Segment
 * (Whop-Migrations-Kampagne). Der eigentliche Versand läuft bewusst über
 * Resend als Single-Source-of-Truth für die Empfängerliste — siehe
 * `config/whop-migration-campaign.ts` und `app/api/admin/campaigns/whop-migration/route.ts`.
 * Das erlaubt, im Resend-Dashboard weitere Kontakte (die nicht auf der
 * Plattform registriert sind) manuell demselben Segment hinzuzufügen.
 *
 * Idempotent: bestehende Contacts werden aktualisiert (nicht dupliziert),
 * Segment-Mitgliedschaft wird bei jedem Lauf erneut sichergestellt.
 *
 * Nutzung:
 *   npm run sync:whop-segment                # erstellt Segment falls nötig, synct alle
 *   npm run sync:whop-segment -- --dry-run    # nur zählen, nichts an Resend senden
 *
 * ENV:
 *   RESEND_API_KEY            erforderlich
 *   RESEND_WHOP_SEGMENT_ID    optional — ohne wird ein neues Segment angelegt
 *                              und die ID am Ende ausgegeben. Danach bitte in
 *                              .env.local / Vercel-Env persistieren, damit
 *                              spätere Läufe UND der Admin-Trigger dasselbe
 *                              Segment treffen.
 */
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY?.trim();

if (!supabaseUrl || !serviceRole) {
  console.error("✗ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env first.");
  process.exit(1);
}
if (!resendKey) {
  console.error("✗ RESEND_API_KEY fehlt.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole);
const resend = new Resend(resendKey);

function splitName(fullName, email) {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  const local = email.split("@")[0] ?? "";
  const firstName = local.charAt(0).toUpperCase() + local.slice(1);
  return { firstName: firstName || "Trader", lastName: "" };
}

/**
 * `profiles` hat keine `email`-Spalte (die liegt in `auth.users`, nicht per
 * PostgREST erreichbar) — Email kommt daher über die Admin-API, paginiert
 * über alle Nutzer:innen.
 */
async function fetchEmailById() {
  const map = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("✗ auth.admin.listUsers fehlgeschlagen:", error.message);
      process.exit(1);
    }
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

const emailById = await fetchEmailById();

const PAGE_SIZE = 1000;
const profileRows = [];
let from = 0;
for (;;) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_paid", false)
    .eq("is_admin", false)
    .is("unsubscribed_at", null)
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("✗ Supabase-Query fehlgeschlagen:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  profileRows.push(...data);
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

const profiles = [];
let skippedNoEmail = 0;
for (const row of profileRows) {
  const email = emailById.get(row.id);
  if (!email) {
    skippedNoEmail += 1;
    continue;
  }
  profiles.push({ email, full_name: row.full_name });
}

console.log(`→ ${profiles.length} unbezahlte Mitglieder gefunden.`);
if (skippedNoEmail > 0) {
  console.warn(`⚠ ${skippedNoEmail} Profile ohne auffindbare Email übersprungen.`);
}

if (dryRun) {
  console.log("→ --dry-run: kein Resend-Aufruf, keine Änderungen.");
  process.exit(0);
}

let segmentId = process.env.RESEND_WHOP_SEGMENT_ID?.trim();
if (!segmentId) {
  const { data, error } = await resend.segments.create({
    name: "Capital Circle – Whop Reaktivierung",
  });
  if (error || !data) {
    console.error("✗ Segment-Erstellung fehlgeschlagen:", error?.message);
    process.exit(1);
  }
  segmentId = data.id;
  console.log(`✓ Neues Segment angelegt: ${segmentId}`);
  console.log(
    "  → Bitte als RESEND_WHOP_SEGMENT_ID in .env.local + Vercel-Env speichern,\n" +
      "    sonst legt der nächste Lauf (oder der Admin-Trigger) ein zweites Segment an.",
  );
} else {
  console.log(`→ Nutze bestehendes Segment: ${segmentId}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Der Resend-SDK-Aufruf hat kein eigenes Timeout — vereinzelt hängt ein
 * einzelner Request (beobachtet, Ursache unklar) und blockiert damit die
 * komplette sequenzielle Schleife für immer. Deshalb hartes Timeout pro
 * Versuch; ein Timeout zählt wie ein Rate-Limit als retrybar.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function upsertContact({ email, firstName, lastName }) {
  const { error: updateError } = await resend.contacts.update({
    email,
    firstName,
    lastName: lastName || null,
    unsubscribed: false,
  });

  if (updateError && updateError.name === "not_found") {
    const { error: createError } = await resend.contacts.create({
      email,
      firstName,
      lastName: lastName || undefined,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    });
    if (createError) throw new Error(createError.message);
  } else if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: segError } = await resend.contacts.segments.add({ email, segmentId });
  if (segError) throw new Error(segError.message);
}

let synced = 0;
let failed = 0;
for (const profile of profiles) {
  const { firstName, lastName } = splitName(profile.full_name, profile.email);

  let attempt = 0;
  for (;;) {
    try {
      await withTimeout(upsertContact({ email: profile.email, firstName, lastName }), 15000);
      synced += 1;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((/rate.?limit/i.test(msg) || msg === "timeout") && attempt < 3) {
        attempt += 1;
        await sleep(500 * attempt);
        continue;
      }
      failed += 1;
      console.error(`✗ ${profile.email}: ${msg}`);
      break;
    }
  }

  if ((synced + failed) % 50 === 0) {
    console.log(`  … ${synced + failed}/${profiles.length}`);
  }
  await sleep(120);
}

console.log(`✓ Fertig: ${synced} synct, ${failed} fehlgeschlagen. Segment: ${segmentId}`);
