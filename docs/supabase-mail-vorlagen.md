# Supabase-Mailvorlagen (Deutsch)

Zum Einsetzen unter **Supabase → Authentication → Emails**, je Vorlage Betreff und
HTML ersetzen. Absender und Versandweg stellt das eigene SMTP (Resend) — siehe
[`DEPLOY-VERCEL.md`](../DEPLOY-VERCEL.md).

## Warum es sie überhaupt braucht

**Die Plattform verschickt ihre Mails nicht über Supabase.** Willkommensmail,
Passwort-Link, Mahnungen und alles Weitere laufen über Resend mit den Vorlagen aus
`lib/email/templates/`. Supabase kommt nur zum Zug, wenn jemand im Supabase-Dashboard
von Hand einen Link verschickt, wenn später eine Registrierung mit Bestätigungsmail
dazukommt oder wenn ein Mitglied seine Anmelde-Adresse ändert. Genau dafür stehen die
Vorlagen hier: damit in diesen Fällen keine englische Standardmail mit fremdem
Absendernamen beim Mitglied landet.

Die Gestaltung ist bewusst schlicht gehalten (eine Karte, ein Knopf, kein Logo-Bild):
Die Vorlagen werden selten benutzt, sollen aber zur übrigen Post passen — Graphit,
Champagner-Gold `#D4B080`, dieselbe Ansprache.

`{{ .ConfirmationURL }}` u. Ä. sind Supabase-Platzhalter und müssen wörtlich stehen
bleiben. `{{ .SiteURL }}` löst Supabase aus der Site-URL des Projekts auf.

---

## Gemeinsames Gerüst

Jede Vorlage unten ist vollständig; sie teilen sich nur dieses Muster. Wer eine Vorlage
ändert, ändert die anderen mit, sonst laufen sie auseinander.

```
Hülle (dunkler Grund) → Karte → Überschrift → ein Absatz → Gold-Knopf →
Ersatzlink zum Kopieren → Fußzeile mit Anbieter
```

---

## 1. Confirm signup (Registrierung bestätigen)

**Betreff:** `Bitte bestätige deine E-Mail-Adresse`

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Bestätige deine E-Mail-Adresse</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Klick auf den Knopf, dann ist deine Adresse bestätigt und dein Zugang steht.
      Wenn du dich nicht angemeldet hast, ignoriere diese Nachricht einfach.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D4B080;color:#1A140C;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">E-Mail bestätigen</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Falls der Knopf nicht funktioniert, kopier diese Adresse in deinen Browser:<br>
      <span style="color:#D4D7DB;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```

---

## 2. Magic Link (Anmeldelink)

**Betreff:** `Dein Anmeldelink für Capital Circle`

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Dein Anmeldelink</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Mit diesem Link meldest du dich ohne Passwort an. Er gilt nur kurz und nur einmal.
      Wenn du ihn nicht angefordert hast, ignoriere diese Nachricht.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D4B080;color:#1A140C;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">Jetzt anmelden</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Falls der Knopf nicht funktioniert, kopier diese Adresse in deinen Browser:<br>
      <span style="color:#D4D7DB;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```

---

## 3. Reset Password (Passwort zurücksetzen)

**Betreff:** `Neues Passwort für Capital Circle`

> Achtung: Den regulären Weg „Passwort vergessen" auf der Website verschickt die
> Plattform selbst über Resend (`lib/email/templates/passwort-zuruecksetzen.tsx`).
> Diese Vorlage greift nur, wenn der Link aus dem Supabase-Dashboard kommt.

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Neues Passwort setzen</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Klick auf den Knopf und wähl ein neues Passwort. Der Link gilt nur einmal.
      Wenn du kein neues Passwort wolltest, ignoriere diese Nachricht — dein
      bisheriges bleibt gültig.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D4B080;color:#1A140C;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">Passwort ändern</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Falls der Knopf nicht funktioniert, kopier diese Adresse in deinen Browser:<br>
      <span style="color:#D4D7DB;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```

---

## 4. Change Email Address (Adresse ändern)

**Betreff:** `Bestätige deine neue E-Mail-Adresse`

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Neue Adresse bestätigen</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Du möchtest die Adresse deines Kontos von <span style="color:#F2F3F5;">{{ .Email }}</span>
      auf <span style="color:#F2F3F5;">{{ .NewEmail }}</span> ändern. Mit dem Knopf wird die
      Änderung wirksam. Warst du das nicht, tu nichts — dann bleibt alles, wie es ist.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D4B080;color:#1A140C;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">Änderung bestätigen</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Falls der Knopf nicht funktioniert, kopier diese Adresse in deinen Browser:<br>
      <span style="color:#D4D7DB;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```

---

## 5. Invite user (Einladung)

**Betreff:** `Du bist bei Capital Circle eingeladen`

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Deine Einladung</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Für dich wurde ein Zugang zu Capital Circle angelegt. Über den Knopf setzt du dein
      Passwort und kommst direkt in den Mitgliederbereich.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D4B080;color:#1A140C;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">Zugang einrichten</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Falls der Knopf nicht funktioniert, kopier diese Adresse in deinen Browser:<br>
      <span style="color:#D4D7DB;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```

---

## 6. Reauthentication (Bestätigungscode)

**Betreff:** `Dein Bestätigungscode`

```html
<div style="background:#12171C;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#191E23;border:1px solid #292E32;border-radius:14px;padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#D4B080;">Capital Circle</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F2F3F5;font-weight:600;">Dein Bestätigungscode</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#D4D7DB;">
      Gib diesen Code ein, um die Änderung zu bestätigen. Er gilt nur kurz.
    </p>
    <p style="margin:0 0 24px;font-size:30px;letter-spacing:0.2em;font-weight:600;color:#F2F3F5;">{{ .Token }}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#A3A9B0;">
      Hast du nichts geändert, ignoriere diese Nachricht.
    </p>
    <hr style="border:none;border-top:1px solid #292E32;margin:28px 0 16px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#80868D;">
      Capital Circle · Emre Kopal · Wilhelmstraße 8, 32602 Vlotho<br>
      contact@capitalcircletrading.com
    </p>
  </div>
</div>
```
