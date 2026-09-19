# Mahnsystem, Warteraum und Rauswurf (Discord-Retention)

Stand 19.09.2026. Übernommen aus MoonTrading, angepasst an Capital Circle
(Branch `agent/retention`). Entscheidungen Simon vom 19.09.2026:
Mahnsystem wie MoonTrading, Anlässe wie MoonTrading, Rauswurf nach 30 Tagen
Karenz, keine Rabatte, Lifetime darf immer beworben werden, Ehemalige werden
vorerst **nicht** angeschrieben (vorbereitet), Antworten laufen über die
Plattform, DM-Widerspruch in den Einstellungen.

---

## 1. Was passiert, wann

### Zahlungsausfall (Mahnsystem)

| Tag | Was | Wo im Code |
|---|---|---|
| 0 | `invoice.payment_failed`: Zahlung `failed` in `payments`, **Zahlungsfall** je Rechnung (`zahlungsfall`), `access_until` bis Fristende gehalten (nie verkürzt), `is_paid` bleibt. Erste Nachricht: **Mail immer**, Discord-DM mit Knopf „Antworten" dazu. Mail ans Team (`contact@capitalcircletrading.com`). | `lib/stripe/webhooks/invoice-payment-failed.ts`, `lib/zahlung/fall.ts` |
| 3 | Erste Erinnerung (Mail + DM) | Nachtlauf `/api/cron/taeglich` |
| 5 | Zweite Erinnerung mit Sperrdatum | Nachtlauf |
| 7 | Sperre: `is_paid` falsch, `access_until` jetzt (Stufe bleibt), Nachricht, Mitgliederrolle weg, **Warteraum** | Nachtlauf |
| jederzeit | `invoice.paid` schliesst den Fall, Rolle zurück, Warteraum ab | `lib/stripe/webhooks/invoice-paid.ts` |

- Ein **zweiter Ausfall** ist eine neue Rechnung und damit ein neuer Fall (die
  alte Mahnstrecke über `email_sequence_log` blieb beim zweiten Mal stumm).
- Wiederholungsversuche derselben Rechnung zählen nur `versuche` hoch.
- Hat die Person inzwischen einen **anderen Zugang** (Lifetime, 1:1, anderes
  aktives Abo, Admin), schliesst der Nachtlauf den Fall statt zu mahnen.
- Ein **Aufschub** (Fallakte) sticht alles: keine Erinnerung, keine Sperre.
- Texte: `config/zahlung.ts`. Der Rückweg kennt den Kanal: in Discord der Knopf
  (frei getippte Antworten kann der Bot nicht lesen — steht in jeder DM), in
  der Mail Support/Mailadresse.
- Mahn-Mails sind **Transaktionsmails**: gehen auch an Abgemeldete, ohne
  Abmeldelink, ohne Werbung. Der Lifetime-Hinweis steht nur in der DM (und dort
  nur ohne Werbewiderspruch).

### Kündigung, Ende, Pause → Warteraum

`subscription.deleted` (am Periodenende oder nach aufgegebenen Wiederholungen),
`subscription.paused` und die Pause über `pause_collection` setzen `is_paid`
auf falsch; danach: Mitgliederrolle weg, Rolle **„Zugang pausiert"** drauf.
Der Warteraum ist ein einziger Kanal mit angepinnter Erklärung und Knopf
„Anliegen klären" (öffnet den jüngsten Zahlungsfall, sonst ein Support-Ticket
der Kategorie Abrechnung).

Nicht in den Warteraum kommt, wer (weiter) Zugang hat, einen laufenden Aufschub
hat oder kein Discord verknüpft hat.

### Nach 30 Tagen: Abschieds-DM und Rauswurf

Der Nachtlauf entfernt vom Server, wer die Mitglieder- oder Warteraumrolle
trägt, ein verknüpftes Konto hat, **keinen Zugang**, kein Lifetime/1:1, kein
laufendes Abo, keinen Aufschub, keine Schutzrolle — und dessen
`access_until` länger als 30 Tage zurückliegt. Vorher geht eine Abschieds-DM
raus (mit Lifetime-Hinweis nur ohne Werbewiderspruch; bei DM-Widerspruch
keine DM). Schranken (`lib/discord/aufraeumen.ts`, `config/discord.ts`):

- höchstens **15 je Nacht**, sonst niemand (Datenfehler, keine Abwanderung),
- fehlt eine **Schutzrolle** (`SCHUTZROLLEN`: CEO, ADMIN, CC Mod, CC Elite,
  CC Member) auf dem Server, läuft gar nichts,
- **Abbruch bei 403** (fehlendes „Kick Members" oder höhere Rolle),
- ohne Enddatum im Profil keine Fälligkeit,
- Protokoll in `user_audit_log` (`discord_rauswurf`, `discord_rauswurf_angehalten`).

**Trennen** der Discord-Verknüpfung wirft **nicht** mehr vom Server; es
entzieht nur Mitglieder- und Warteraumrolle.

### Die Zugangsregel

Discord richtet sich nach derselben Regel wie Institut, Videos und Anhänge:
**`is_paid` oder Admin** (`hatInhaltsZugang` in `lib/membership.ts`,
`hatZugang` in `lib/discord/mitgliedschaft.ts`). Nicht `evaluateAccess()` —
der Whop-Altbestand steht auf `free` mit `is_paid = true` und behält so Rolle
und Server. Zusätzlich entzieht der Abgleich eine Rolle nur mit Enddatum im
Profil (`access_until` gesetzt).

Trockenlauf gegen den Bestand vom 19.09.2026 (nur lesend): 38 verknüpfte
Konten (36 Whop-Altbestand, 1 Lifetime, 1 Free), **0** Rollenentzüge, **0**
Rückgaben im Nachtlauf, **0** fällige Rauswürfe.

### Fallakte (Admin)

`/admin/zahlungsstoerungen` (Liste) und `/admin/zahlungsstoerungen/[id]`
(Akte): Verlauf mit Kundenantworten, Antworten aus der Plattform (gehen als DM
mit Knopf **und** Mail raus), interne Notiz, Aufschub (Rolle „admin": gibt
gesperrten Zugang zurück, hält `access_until`/`is_paid` bis zum Ende, Eintrag in
`user_audit_log`), Schliessen (ab „support"). Antworten des Kunden lösen eine
Mail ans Team aus.

### Lifetime, Rabatte, Rückgewinnung

- **Lifetime** kaufen darf, wer zahlt oder **je gezahlt** hat (Abo in
  `subscriptions` oder erfolgreiche Zahlung). Nie zahlende Free-Nutzer nicht.
  Karte auf `/einstellungen/abonnement#lifetime`. Beim Kauf: überfällige Abos
  sofort beendet (stoppt Stripes Einzug), laufende zum Periodenende, offene
  Fälle geschlossen, Rolle zurück.
- **Keine Rabatte**: Der Rabatt-Schritt im Kündigungs-Flow ist entfernt;
  `/api/stripe/subscription/discount` bleibt, wird nicht angeboten.
  `STRIPE_RETENTION_COUPON_ID` sollte nicht gesetzt sein.
- **Rückgewinnungs-Mail** (14 Tage nach Kündigung, Cron `reactivation-offers`):
  ohne Gratismonat, mit Abmeldelink, nur mit Schalter
  `app_settings.rueckgewinnung_mail` — **Standard aus**.
- **Kampagne „Rückgewinnung/Lifetime"** (`/api/admin/rueckgewinnung`):
  vorbereitet, **nicht ausgelöst**. Trockenlauf, Einzeltest, Versandprotokoll
  `kampagne_versand`, Mail + DM, max. 100 je Aufruf.

---

## 2. Einrichtung

### Migrationen (Supabase SQL-Editor, in dieser Reihenfolge)

1. `080_zahlungsfall.sql` — `zahlungsfall`, `zahlungsfall_nachricht`
2. `081_discord_dm_widerspruch.sql` — `profiles.discord_dm_widerspruch`
3. `082_rueckgewinnung.sql` — `kampagne_versand`, Schalter `rueckgewinnung_mail` (aus)

`npm run db:pending` baut die Sammeldatei, `npm run db:check` bestätigt.
Alles läuft auch vor den Migrationen weiter (ohne Fälle, ohne Widerspruch);
der Webhook hält dann den Zugang bis zur Frist und verschickt die erste Mail.

### Umgebungsvariablen (Vercel, Production)

| Variable | Pflicht | Wofür |
|---|---|---|
| `CRON_SECRET` | ja | Nachtlauf, Probe, Kampagne, Warteraum-Läufe — **fail-closed**, ohne sie ist alles zu |
| `DISCORD_PUBLIC_KEY` | ja | Knopf-Rückweg. Developer Portal → General Information → **Public Key** (64 Hex-Zeichen, nicht die Application-ID) |
| `DISCORD_WAITING_ROOM_ROLE_ID` | für den Warteraum | ID der Rolle „Zugang pausiert" |
| `DISCORD_WAITING_ROOM_CHANNEL_ID` | für die Erklärung | ID des Kanals `zugang-pausiert` |
| `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID` | vorhanden | unverändert |

### Discord (Server und Developer Portal)

1. **Bot-Rechte**: „Manage Roles" und „Kick Members" (der Bot trägt derzeit die
   Rolle ADMIN mit Administrator — genügt). **Server Members Intent** ist an.
2. **Rolle anlegen**: Name `Zugang pausiert`, keine Berechtigungen, **nicht**
   getrennt anzeigen, Position **unter** der Bot-Rolle.
3. **Kanal `zugang-pausiert`**:

   | Wer | Kanal ansehen | Verlauf anzeigen | Nachrichten senden | Threads |
   |---|---|---|---|---|
   | `@everyone` | verweigert | verweigert | verweigert | verweigert |
   | `Zugang pausiert` | **erlaubt** | **erlaubt** | verweigert | verweigert |
   | Bot | erlaubt | erlaubt | erlaubt | |

4. **Alles andere verbergen**: Für jede Kategorie mit für `@everyone`
   sichtbaren Kanälen `Zugang pausiert` → Kanal ansehen: verweigert. Heisst der
   Kanal anders, `WARTERAUM_KANAL` in `config/zahlung.ts` nachziehen.
5. `npm run discord:check` — rechnet u. a. aus, welche Kanäle ein Mitglied im
   Warteraum sieht (soll: genau einer, lesbar, ohne Schreibrecht).
6. Erklärung posten: `npm run discord:warteraum -- --url https://www.capitalcircletrading.com`
   (Probe), dann `-- --write`. Beliebig oft wiederholbar, höchstens eine Nachricht.
7. **Nach dem Deploy** im Developer Portal → General Information →
   Interactions Endpoint URL:
   `https://www.capitalcircletrading.com/api/discord/interactions`.
   Discord prüft sofort mit einem PING; vor dem Deploy lässt sich die Adresse
   nicht speichern.

### Stripe (Dashboard → Billing → Einstellungen → Abonnements/Wiederholungen)

- **Smart Retries** auf einen Zeitraum von **einer Woche** stellen — passend zu
  `FRIST_TAGE = 7` in `config/zahlung.ts`. Wer den Zeitraum ändert, zieht die
  Zahl mit.
- **Wenn alle Versuche fehlschlagen: Abo als unbezahlt markieren** (nicht
  kündigen). Dann bleibt die Rechnung bezahlbar, und wer sie begleicht, ist
  sofort wieder drin — genau das sagen die Nachrichten. Bei „kündigen" käme
  `subscription.deleted`, und die alte Rechnung brächte den Zugang nicht zurück.
- Stripes eigene Kunden-Mails zu fehlgeschlagenen Zahlungen am besten aus —
  sonst bekommt der Kunde zwei Mahnungen.

### Cron

`vercel.json`: `/api/cron/taeglich` um `0 2 * * *` (UTC). `process-dunning`
ist entfernt. Ein Cron, der in ein Deployment fällt, fällt still aus; jede
Erinnerung hängt an einem Zähler und jede Sperre an der Frist, der nächste Lauf
holt es nach.

---

## 3. Bedienung und Skripte

| Befehl | Was |
|---|---|
| `npm run discord:check` | Rechte, Rollenposition, Schutzrollen, Intent, Warteraum-Sichtbarkeit, Public Key. `-- --rollentest <eigene-id>` setzt und entzieht die Mitgliederrolle einmal |
| `npm run discord:warteraum -- --url … [--write]` | angepinnte Erklärung setzen/angleichen |
| `npm run discord:warteraum-rolle -- --url …` | Bestand nachziehen: Probe, dann `--write --anzahl <n>`; Einzeltest `--nur <discord-id> --write [--entziehen]` |
| `npm run discord:sync [-- --apply [--warteraum]]` | Bestandsabgleich der Mitgliederrolle (Admin-Knopf unter `/admin/discord` dasselbe) |
| `npm run zahlung:probe -- --url … --email <eigene>` | Probefall ohne Frist an das eigene Konto (`--art erinnerung` oder `--art gesperrt`, `--ohne-discord`, `--aufraeumen`) |
| `npm run rueckgewinnung -- --url …` | Kampagne: Trockenlauf; `--nur-an <eigene> --write`; `--write --limit 25`; `--schalter an` bzw. `--schalter aus` |
| `curl -H "Authorization: Bearer $CRON_SECRET" "…/api/cron/taeglich?probe=1"` | Was der Nachtlauf heute täte (schreibt nichts) |

`CRON_SECRET` muss lokal denselben Wert haben wie in Vercel.

---

## 4. Testplan am eigenen Konto

1. Migrationen einspielen, `npm run db:check`.
2. Env setzen, deployen, Interactions-URL eintragen, `npm run discord:check`.
3. Warteraum: Rolle/Kanal anlegen, `npm run discord:warteraum -- --write`;
   `npm run discord:warteraum-rolle -- --nur <eigene-id> --write` → in Discord
   prüfen: nur der Kanal sichtbar, Textfeld gesperrt, Knopf öffnet das Formular
   (ohne Fall: Ticket unter `/support`). Danach `--entziehen`.
4. Mahnung: `npm run zahlung:probe -- --email <eigene>` → DM + Mail kommen;
   in Discord „Antworten" → Text → Mail ans Team; in
   `/admin/zahlungsstoerungen/<fall>` die Antwort sehen und zurückschreiben →
   DM + Mail. `--art erinnerung`, `--art gesperrt` für die anderen Texte.
   Aufräumen mit `--aufraeumen`.
5. DM-Widerspruch: unter `/einstellungen/profil` Discord-Nachrichten aus →
   erneute Probe: keine DM, Mail kommt.
6. Nachtlauf: `?probe=1` ansehen (erwartet: keine Sperren, keine Rauswürfe).
7. Stripe-Testmodus: `npm run stripe:e2e` (Szenario f prüft Ausfall/Nachzahlung
   nach dem neuen Ablauf).
8. Lifetime: mit einem Testkonto mit Stripe-Vergangenheit, aber ohne Zugang,
   `/einstellungen/abonnement#lifetime` — Karte sichtbar; ohne
   Stripe-Vergangenheit nicht.

---

## 5. Bewusst anders als MoonTrading

- **Zugangsregel** `is_paid` oder Admin (Inhaltsregel), zusätzlich
  `access_until` als Enddatum; Sperre lässt die Stufe stehen.
- Warteraum-Knopf ohne Fall → **Support-Ticket** (MoonTrading: Ticket im
  eigenen Supportsystem, gleiche Idee).
- Team-Meldung über **`after()`** nach der Discord-Antwort (drei Sekunden).
- **Rauswurf** nur für verknüpfte Konten mit Enddatum; keine
  Einordnung Unzuordenbarer, keine Freigabeliste.
- **Nachtlauf-Rollenabgleich** (MoonTrading gibt nur zurück): entzieht auch,
  aber nur mit Enddatum und höchstens 25 je Nacht; gibt nur aus dem Warteraum zurück.
- Probefälle **ohne Frist** (in MoonTrading setzte die Probe versehentlich eine).
- Direktnachrichten ohne Vorschaukarten und ohne Erwähnungen.
