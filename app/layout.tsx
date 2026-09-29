import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { Providers } from "@/components/providers";
import { getAppUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Capital Circle Institut",
  description: "Exklusive Trading-Lernplattform",
  /*
   * Vorschaubild beim Teilen eines Links (WhatsApp, Telegram, LinkedIn, X …):
   * `app/opengraph-image.png` im Look des Hero, Alt-Text daneben in
   * `opengraph-image.alt.txt`. Next hängt es an jede Seite, die kein eigenes
   * `openGraph` setzt; Titel und Beschreibung kommen dann aus der Seite.
   * Seiten mit eigenem `openGraph` (`/discord`, `/termin`) müssen ihr Bild
   * selbst mitbringen — ein `openGraph` in der Seite ersetzt diesen Block
   * vollständig, statt ihn zu ergänzen.
   *
   * `metadataBase` macht die Bildadresse absolut; ohne sie stünde im Tag die
   * Deployment-URL oder `localhost`, und die Portale laden nichts.
   */
  metadataBase: new URL(getAppUrl()),
  openGraph: {
    type: "website",
    siteName: "Capital Circle",
    locale: "de_DE",
  },
  /*
   * Eigene Dateinamen statt `/new-apple.png` (20.09.2026): Browser halten
   * Favicons hartnäckig im Zwischenspeicher, teils über Wochen. Nach dem
   * Logowechsel blieb deshalb das alte Zeichen stehen. Eine neue Adresse ist
   * der einzige zuverlässige Weg, das aufzulösen — wer das Zeichen erneut
   * ändert, vergibt wieder einen neuen Namen.
   */
  icons: {
    icon: [{ url: "/logo/favicon-512.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/logo/favicon-512.png",
    // Zusätzlich public/apple-touch-icon.png (Kopie) — Safari holt die URL oft direkt
    apple: [{ url: "/logo/apple-touch-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Inter selbst gehostet über `next/font` (`app/fonts.ts`) — kein Request an
    // Google. Die Klasse setzt `--font-inter` für globals.css und das Theme.
    <html lang="de" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
