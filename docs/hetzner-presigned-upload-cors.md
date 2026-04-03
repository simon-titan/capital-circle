# Hetzner Object Storage: CORS für Browser-Uploads (Presigned PUT)

Die Next.js-App auf **Vercel** darf nur kleine Request-Bodies an API-Routen senden (~4.5 MB). Große Dateien werden **direkt zum Bucket** hochgeladen (Presigned URL). Dafür muss der Bucket **CORS** für die Web-App-Origins erlauben.

## Einmalig anwenden

1. AWS CLI installieren und mit Hetzner-Credentials konfigurieren (gleiche Werte wie `HETZNER_ACCESS_KEY` / `HETZNER_SECRET_KEY` in `.env`).

2. `HETZNER_ENDPOINT` aus `.env` verwenden (z. B. `https://nbg1.your-objectstorage.com`) und `HETZNER_BUCKET_NAME` (z. B. `capitalcircle`).

3. CORS setzen:

```bash
aws s3api put-bucket-cors \
  --endpoint-url "https://nbg1.your-objectstorage.com" \
  --bucket "capitalcircle" \
  --cors-configuration file://scripts/hetzner-bucket-cors.example.json
```

Passe bei Bedarf `AllowedOrigins` in [`scripts/hetzner-bucket-cors.example.json`](../scripts/hetzner-bucket-cors.example.json) an (eigene Vercel-Preview-URLs, Staging-Domain).

4. Prüfen:

```bash
aws s3api get-bucket-cors --endpoint-url "https://nbg1.your-objectstorage.com" --bucket "capitalcircle"
```

Ohne korrektes CORS schlagen Browser-`PUT`-Requests zum Presigned URL mit CORS-Fehlern fehl.
