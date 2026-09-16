# Cloudflare R2: CORS für Browser-Uploads (Presigned PUT)

> Ersetzt seit 16.09.2026 die frühere Hetzner-Anleitung. Der Hetzner-Bucket
> `capitalcircle` existiert nicht mehr (`NoSuchBucket` in nbg1/fsn1/hel1), die
> zugehörigen Schlüssel antworten mit `InvalidAccessKeyId`.

Die Next.js-App auf **Vercel** nimmt nur begrenzte Request-Bodies an API-Routen entgegen.
Große Dateien gehen deshalb **direkt zum Bucket** (Presigned PUT) — der Browser spricht
R2 an, nicht unseren Server. Damit das erlaubt ist, braucht der Bucket eine CORS-Regel
für die Ursprünge der Web-App.

## Eigenheiten von R2 gegenüber Hetzner

- **Region ist immer `auto`.** R2 kennt keine S3-Regionen; `lib/storage.ts` setzt das fest.
- **EU-Jurisdiktion.** Der Bucket `capital-circle` liegt aus DSGVO-Gründen in der EU.
  Das steht im S3-Endpunkt (`.eu.` im Host) und muss bei **jedem** Aufruf der
  Cloudflare-REST-API als Kopfzeile `cf-r2-jurisdiction: eu` mitgeschickt werden.
  Ohne die Kopfzeile antwortet die API mit *„The specified bucket does not exist"*,
  obwohl der Bucket existiert — eine leicht in die Irre führende Fehlermeldung.

## Aktueller Stand

Gesetzt sind `GET`, `PUT`, `HEAD` für alle Kopfzeilen und diese Ursprünge:

```
https://capitalcircletrading.com
https://www.capitalcircletrading.com
https://capital-circle-s5bg.vercel.app
http://localhost:3000
```

⚠️ **Branch-Preview-Deployments sind nicht abgedeckt.** Vercel vergibt dafür eigene
Adressen der Form `capital-circle-git-<branch>-<team>.vercel.app`. Bild-Uploads scheitern
dort mit einem CORS-Fehler, bis die Adresse nachgetragen wird.

## Prüfen und setzen

Der schnellste Weg ist die Cloudflare-REST-API — die AWS CLI kann es auch, braucht aber
zusätzlich ein konfiguriertes Profil.

```bash
# Lesen
curl -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN" \
     -H "cf-r2-jurisdiction: eu" \
     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME/cors"
```

Als Rumpf dient [`scripts/r2-bucket-cors.example.json`](../scripts/r2-bucket-cors.example.json) —
dort die `origins` anpassen (eigene Preview-Adresse, Staging-Domain).

```bash
# Setzen
cp scripts/r2-bucket-cors.example.json cors.json   # und anpassen
curl -X PUT \
     -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN" \
     -H "cf-r2-jurisdiction: eu" \
     -H "Content-Type: application/json" \
     --data @cors.json \
     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$R2_BUCKET_NAME/cors"
```

Der API-Token braucht dafür die R2-Berechtigung; der Stream-Token im Projekt hat sie.

## Ende-zu-Ende prüfen

Zwei Skripte decken den ganzen Weg ab, statt nur die Konfiguration anzusehen:

- `npm run r2:check-upload` — spielt den Browser nach: CORS-Preflight, Presigned PUT,
  Rücklesen, inklusive Bild-Fall.
- `npm run check:upload-route` — der ehrlichere Test: legt ein Test-Admin-Konto an, meldet
  sich an, baut das echte `sb-<ref>-auth-token`-Cookie, ruft
  `/api/admin/presign-upload` auf, lädt hoch und räumt hinterher auf. Damit ist der
  komplette authentifizierte Pfad geprüft, nicht nur der Bucket.

Ohne passendes CORS schlagen die Browser-`PUT`-Requests an die Presigned URL fehl — im
Netzwerk-Tab sichtbar als abgebrochener Preflight, in der Konsole als CORS-Fehler.
