import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stack } from "@chakra-ui/react";
import { PaketZeile } from "@/components/billing/PaketZeile";
import type { Tier } from "@/components/billing/format";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { createClient } from "@/lib/supabase/server";
import { ProfilFormular } from "./ProfilFormular";

export const metadata: Metadata = {
  title: "Profil — Capital Circle",
};

export const dynamic = "force-dynamic";

/**
 * Profilseite — Einstieg in den Konto-Bereich.
 *
 * Die Seite selbst lädt nur das Paket und bleibt dafür ein Server-Bauteil:
 * Tarif, Preis und Laufzeit liegen in derselben Abfrage, die auch die
 * Abo-Seite nutzt (`ladeAboKontext`). Im Client wäre dasselbe eine zweite
 * Runde zur Datenbank, nachdem `ProfilFormular` sein Profil ohnehin schon
 * geholt hat — und die Zeile stünde erst nach dem ersten Rendern da.
 *
 * Stripe wird hier **nicht** gefragt. Das tut die Abo-Seite, die auch Pause
 * und Rabatt zeigt; für eine Zusammenfassung mit Link ist ein API-Aufruf pro
 * Profilaufruf zu teuer.
 */
export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login?next=/einstellungen/profil");

  const kontext = await ladeAboKontext(user.id);
  const tier = (kontext?.tier ?? "free") as Tier;

  return (
    <Stack spacing={5}>
      <PaketZeile
        tier={tier}
        abo={
          kontext?.abo
            ? {
                status: kontext.abo.status,
                currentPeriodEnd: kontext.abo.currentPeriodEnd,
                cancelAtPeriodEnd: kontext.abo.cancelAtPeriodEnd,
              }
            : null
        }
        lifetimeGekauftAm={kontext?.lifetimePurchasedAt ?? null}
        accessUntil={kontext?.accessUntil ?? null}
      />

      <ProfilFormular />
    </Stack>
  );
}
