/**
 * Testet den Bild-Upload so, wie ihn der Admin im Browser geht — aber gegen die
 * echte Route, nicht an ihr vorbei:
 *
 *   1. Test-Admin anlegen (oder wiederverwenden) und anmelden
 *   2. GET /api/admin/presign-upload MIT Sitzungs-Cookie
 *   3. PUT der Datei auf die zurueckgegebene URL
 *   4. Aufraeumen (Objekt loeschen, Test-Admin loeschen)
 *
 * Unterschied zu check-r2-upload.mjs: Das dort prueft die Bausteine
 * (`getPresignedPutUrl` direkt). Hier laeuft der Weg ueber requireAdmin,
 * buildAdminStorageKey und den Route-Handler — also alles, was im Browser
 * tatsaechlich beteiligt ist.
 *
 *   node scripts/check-upload-route.mjs [basis-url]
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false });
}

const BASIS = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
/** Projekt-Ref aus der Supabase-URL — daraus leitet sich der Cookie-Name ab. */
const REF = new URL(URL_SB).hostname.split(".")[0];

let fehler = 0;
const ok = (s) => console.log(`  OK    ${s}`);
const bad = (s) => {
  fehler++;
  console.log(`  FEHLT ${s}`);
};

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
const email = `upload-pruefung+${Date.now()}@capitalcircletrading.com`;
const passwort = `Pruef-${crypto.randomUUID()}`;
let userId = null;

try {
  // ── 1. Test-Admin ──────────────────────────────────────────────────────────
  const { data: erstellt, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: passwort,
    email_confirm: true,
  });
  if (userErr) throw new Error(`Test-Nutzer anlegen: ${userErr.message}`);
  userId = erstellt.user.id;
  const { error: profErr } = await admin.from("profiles").update({ is_admin: true }).eq("id", userId);
  if (profErr) throw new Error(`is_admin setzen: ${profErr.message}`);
  ok(`Test-Admin angelegt (${userId.slice(0, 8)}…)`);

  // ── 2. Anmelden und Sitzungs-Cookie bauen ─────────────────────────────────
  const anon = createClient(URL_SB, ANON, { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await anon.auth.signInWithPassword({ email, password: passwort });
  if (signErr) throw new Error(`Anmelden: ${signErr.message}`);

  // @supabase/ssr legt die Sitzung als base64-kodiertes JSON unter
  // `sb-<ref>-auth-token` ab; lange Werte werden auf `.0`, `.1` … aufgeteilt.
  const rohCookie = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64");
  const TEILGROESSE = 3180;
  const teile = [];
  for (let i = 0; i < rohCookie.length; i += TEILGROESSE) teile.push(rohCookie.slice(i, i + TEILGROESSE));
  const cookie =
    teile.length === 1
      ? `sb-${REF}-auth-token=${teile[0]}`
      : teile.map((t, i) => `sb-${REF}-auth-token.${i}=${t}`).join("; ");
  ok(`Angemeldet, Cookie gebaut (${teile.length} Teil(e))`);

  // ── 3. Presign ueber die echte Route ──────────────────────────────────────
  const params = new URLSearchParams({
    folder: "covers",
    fileName: "Pruefbild äöü.png",
    contentType: "image/png",
  });
  const presignRes = await fetch(`${BASIS}/api/admin/presign-upload?${params}`, { headers: { cookie } });
  const presignText = await presignRes.text();
  let presign;
  try {
    presign = JSON.parse(presignText);
  } catch {
    throw new Error(`Presign-Antwort ist kein JSON (HTTP ${presignRes.status}): ${presignText.slice(0, 200)}`);
  }
  if (!presignRes.ok || !presign.ok) {
    bad(`Presign: HTTP ${presignRes.status} — ${presign.error ?? presignText.slice(0, 150)}`);
    throw new Error("Presign fehlgeschlagen, Abbruch");
  }
  ok(`Presign ueber die Route: HTTP ${presignRes.status}, Key ${presign.storageKey}`);

  // ── 4. Hochladen wie der Browser ──────────────────────────────────────────
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const put = await fetch(presign.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png", Origin: BASIS },
    body: png,
  });
  if (put.ok) ok(`PUT auf Cloudflare: HTTP ${put.status}`);
  else bad(`PUT fehlgeschlagen: HTTP ${put.status} — ${(await put.text()).slice(0, 200)}`);

  // ── 5. Aufraeumen ─────────────────────────────────────────────────────────
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT.trim(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    },
  }).send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key: presign.storageKey }));
  ok("Testobjekt wieder geloescht");
} catch (e) {
  bad(e instanceof Error ? e.message : String(e));
} finally {
  if (userId) {
    // Die profiles-Zeile haengt an einem Trigger, nicht an einem Cascade —
    // ohne das explizite Loeschen bleibt eine Karteileiche im Mitgliederbereich.
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    console.log("  OK    Test-Admin und Profil wieder entfernt");
  }
}

console.log(fehler === 0 ? "\nDer echte Upload-Weg funktioniert." : `\n${fehler} Problem(e).`);
process.exit(fehler === 0 ? 0 : 1);
