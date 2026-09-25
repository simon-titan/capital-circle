# Umsetzungsplan: Trading Journal – jeder Trade ein eigener Eintrag

Quelle: `TRADING JOURNAL.svg` (25.09.2026). Stand des Repos: 25.09.2026, letzte Migration `104`.

Ziel laut Vorgabe: Struktur bleibt. Aus der Tabellenzeile wird ein Journal-Eintrag:
**Trade auswählen → Details ansehen → Notizen schreiben → Bilder hinzufügen → später auswerten.**

## Ist-Stand (relevant)

| Thema | Stelle |
|---|---|
| Routen | `app/(platform)/trading-journal/` mit Home `page.tsx`, `trades/`, `dashboard/`, `tage/`. **Keine** Detail-Route |
| Daten laden | `components/journal/JournalProvider.tsx` Z. 118–129: alle Trades des Kontos im Browser, nur `reload()` |
| Tabelle | `components/journal/TradesTable.tsx`: Desktop-Tabelle Z. 114–181, Mobil-Karten Z. 184–218, **kein Klick-Handler**. Wird auch in `journal/dashboard/DashboardView.tsx:94` genutzt |
| Tabelle `journal_trades` | Migration `060_journal_v2.sql`, u. a. `source` (`manual`/`tradovate_csv`), `qty`, Entry/Exit Preis+Zeit, `point_value`, `gross_pnl`, `fees`, `net_pnl` (generiert), **`notes`** und **`screenshot_storage_key`** (nur ein Bild) existieren schon, dazu `tags`, `external_ids`, `import_batch_id`, `dedupe_key` |
| RLS | select/insert/update/delete je eigene Zeile, Löschen wäre also im Browser schon erlaubt |
| Import | `app/api/journal/import/route.ts` (Tradovate/TradingView-Orders-CSV), setzt **keine Gebühren** |
| Löschen / Bearbeiten | Keine API-Route und keine UI |
| Home-Abschnitte | `components/journal/home/HomeView.tsx` Z. 35 `<ApexPromoCard />`, Z. 37 `<YoutubeCarousel />` („Neueste Videos“) |
| Upload | `lib/storage.ts` (`getPresignedPutUrl`, `getPresignedGetUrl`, **kein Löschen**), `components/admin/ImageDropZone.tsx` (nur **eine** Datei), Vorlage für Mitglieder-Upload: `app/api/certificates/presign-upload` + Präfix-Check in `app/api/certificates/route.ts:78` |
| Altlast | `app/api/trading-journal/screenshot/route.ts` arbeitet auf den v1-Tabellen und wird nirgends aufgerufen |

## Umsetzung

### 1. Trades löschen
- **Server-Route** `DELETE /api/journal/trades/[id]` (nicht nur der Browser über RLS), weil die
  Bilder in R2 mit weg müssen.
  - Prüft `hasActivePaidAccess` und dass der Trade dem Nutzer gehört.
  - Liest die Bild-Keys, löscht die Zeile (Bilder per FK-Cascade) und danach die R2-Objekte.
  - R2-Fehler beim Löschen werden nur geloggt, der Trade ist trotzdem weg.
- `lib/storage.ts`: neue Funktion `deleteObject(key)` (`DeleteObjectCommand`).
- UI: Mülleimer-Icon am Zeilenende (Desktop) bzw. im Menü der Karte (Mobil) und in der
  Detailansicht. Bestätigung per Chakra `AlertDialog`: „Möchtest du diesen Trade wirklich löschen?“
  Buttons „Abbrechen“ / „Löschen“ (rot, semantisch). Klick auf das Icon mit `stopPropagation`,
  damit die Zeile nicht die Detailansicht öffnet.
- `JournalProvider`: `removeTrade(id)` filtert den State sofort. Statistiken, Kalender und Dashboard
  rechnen damit ohne Neuladen neu.
- **Achtung Re-Import:** Wird dieselbe CSV erneut importiert, kommt ein gelöschter Trade zurück, weil
  sein `dedupe_key` dann nicht mehr existiert. Das lässt sich über eine Tabelle
  `journal_trade_geloescht (user_id, dedupe_key)` verhindern, die der Import überspringt. Siehe
  offene Fragen.

### 2. Detailansicht pro Trade
- Neue Route `app/(platform)/trading-journal/trades/[id]/page.tsx`. Der Client liest den Trade aus
  dem `JournalProvider`, bei Direktaufruf holt er ihn einzeln (RLS schützt).
- Tabellenzeilen und Mobil-Karten werden klickbar (`router.push`, zusätzlich echter Link in der
  ersten Zelle für Tastatur und Mittelklick). Das gilt auch für die Tabelle auf dem Journal-Dashboard.
- **Aufbau** (bewusst keine Riesentabelle):
  1. Kopf: Symbol + Contract, Richtungs-Pill Long/Short, Datum, Netto-P&L groß (Grün/Rot nur
     semantisch), „Gewinn“/„Verlust“. Zurück-Link, Vor/Zurück zum nächsten Trade.
  2. Kennzahlen-Raster (2×4, mobil 2×n):
     - Kontrakte, Entry, Exit, Punkte (Exit−Entry, richtungsbereinigt)
     - Brutto-P&L, Gebühren, Netto-P&L, Punktwert
  3. Zeitleiste: Entry-Uhrzeit → Exit-Uhrzeit mit Dauer („14 Min. 32 s“). Die Dauer wird aus
     `exit_time − entry_time` berechnet und nicht gespeichert.
  4. Quelle: „Manuell“ oder „Tradovate-Import“ mit Dateiname und Importdatum aus
     `journal_import_batches`. Order-IDs aus `external_ids` liegen eingeklappt unter
     „Import-Details“.
  5. Notizen (Punkt 3), Bilder (Punkt 4).
- Gebühren: Beim Import leer. In der Detailansicht mit „—“ anzeigen und direkt editierbar machen.
  `net_pnl` ist eine generierte Spalte und rechnet dann von selbst neu.

### 3. Notizen pro Trade
- Die Spalte `notes` gibt es schon, eine Migration ist dafür nicht nötig.
- Ein freies Textfeld (`Textarea`, wächst mit) unter der Überschrift „Notizen“. Als Platzhalter
  stehen die Leitfragen aus der Vorgabe, als Hilfe und nicht als Pflichtfelder: „Warum habe ich den
  Trade genommen? Was war mein Bias? …“
- Speichert automatisch (800 ms nach der letzten Eingabe und beim Verlassen) über
  `PATCH /api/journal/trades/[id]` mit `{ notes }`. Neben dem Feld steht „Gespeichert“ bzw.
  „Speichert …“. Die Route setzt `updated_at` von Hand, weil es keinen Trigger gibt.
- In der Tabelle kennzeichnet ein kleines Notiz-Icon Trades mit Notiz.

### 4. Bilder pro Trade (mehrere)
**Migration `NNN_journal_trade_bilder.sql`** (nächste freie Nummer):

```sql
create table if not exists public.journal_trade_bilder (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.journal_trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  content_type text not null,
  bytes integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists journal_trade_bilder_trade_idx on public.journal_trade_bilder(trade_id);
-- RLS: select/delete eigene Zeilen; insert nur über die API (Präfix-Check).
```

Bestehende `screenshot_storage_key`-Werte vorher zählen. Sind welche da, als erstes Bild übernehmen,
danach die Spalte stilllegen.

- **Routen** unter `app/api/journal/trades/[id]/bilder/`:
  - `POST …/presign`:
    - Prüft Zugang und Eigentum.
    - MIME-Allowlist `image/png|jpeg|webp`, max. 10 MB, max. 12 Bilder pro Trade.
    - Key `journal/${userId}/${tradeId}/${uuid}.${ext}`.
    - Liefert `{ presignedUrl, storageKey }`.
  - `POST …`: registriert das Bild. Präfix-Check wie bei den Zertifikaten.
  - `GET …`: Liste mit signierten URLs.
  - `DELETE …/[bildId]`: löscht Zeile und R2-Objekt.
- **UI:**
  - Galerie-Raster (2–3 Spalten) mit Lightbox und Löschen per Bestätigung.
  - Uploads **nur per Drag & Drop** (der Windows-Dateidialog friert beim Nutzer den Browser ein).
    Dafür `ImageDropZone` um `mehrere` erweitern oder eine schlanke `JournalBildZone` bauen, die
    mehrere Dateien annimmt.
  - Zusätzlich **Einfügen aus der Zwischenablage** (Strg+V auf der Detailseite): Trader machen
    Screenshots per Snipping-Tool. Das ist der schnellste Weg und umgeht den Dateidialog ganz.
  - Upload-Fortschritt pro Bild, Fehlermeldung bei zu großer Datei.
- Die verwaiste Route `app/api/trading-journal/screenshot` löschen.
- `scripts/check-rls.mjs` und `scripts/check-r2-dateien.mjs` um die neue Tabelle bzw. das Präfix
  `journal/` ergänzen.
- Aufräumen: Wird ein ganzes Konto oder ein Import-Batch gelöscht, bleiben R2-Objekte liegen
  (Cascade nur in der DB). Die Löschpfade für Konto und Batch sammeln die Keys vorher ein.

### 5. Journal-Home aufräumen
- `HomeView.tsx`: `ApexPromoCard` und `YoutubeCarousel` samt Imports raus, danach das Raster prüfen,
  damit keine Lücken entstehen.
- `YoutubeCarousel.tsx`, `app/api/journal/youtube/route.ts` und `lib/journal/youtube.ts` löschen.
  Sie werden nirgends sonst genutzt. `YOUTUBE_CHANNEL_ID` aus `lib/env.ts` und `DEPLOY-VERCEL.md`
  austragen.
- `ApexPromoCard` wird **nicht** gelöscht, sondern wandert auf die neue Propfirms-Seite (siehe
  `tools-tradingview-tradesyncer-propfirms.md`). `config/apex-promo.ts` bleibt, der Ticker braucht
  es.

## Reihenfolge und Aufwand

1. Home aufräumen, ca. 1 h.
2. Detailansicht + klickbare Zeilen, ca. 1 Tag.
3. Löschen mit Bestätigung + `deleteObject`, ca. 0,5 Tage.
4. Notizen mit Autosave, ca. 0,5 Tage.
5. Bilder (Migration, Routen, Drop-Zone + Einfügen, Galerie), ca. 1,5 Tage.

Test:
- `npm run db:check` nach der Migration, `node scripts/check-rls.mjs`.
- Manuell durchspielen: Trade importieren → öffnen → Notiz → 3 Bilder (Drag & Drop + Strg+V) →
  1 Bild löschen → Trade löschen → in R2 prüfen, dass die Objekte weg sind.

## Offene Fragen

1. Soll ein gelöschter importierter Trade bei erneutem CSV-Import **wiederkommen** oder dauerhaft
   weg bleiben? Empfehlung: weg bleiben (Tabelle mit gelöschten `dedupe_key`s).
2. Sollen in der Detailansicht außer Notizen und Gebühren weitere Felder korrigierbar sein (z. B.
   Kontrakte, Preise)?
3. `tags` existiert schon in der Tabelle. Sollen wir Setups/Tags jetzt mit einbauen, oder bleibt es
   bewusst beim freien Notizfeld?
