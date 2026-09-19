import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Capital Circle Institut",
  description: "Exklusive Trading-Lernplattform",
  icons: {
    icon: [{ url: "/new-apple.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/new-apple.png",
    // Zusätzlich public/apple-touch-icon.png (Kopie) — Safari holt die URL oft direkt
    apple: [{ url: "/new-apple.png", sizes: "512x512", type: "image/png" }],
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
