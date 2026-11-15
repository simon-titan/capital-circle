import { notFound } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminFrame } from "@/components/admin/AdminSidebar";
import { TrainingBewerbungen } from "@/components/admin/TrainingBewerbungen";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { bewerbung } from "@/config/training";
import type { BoardBewerbung } from "@/lib/training/board";

export const dynamic = "force-dynamic";

/** `/vorschau/mentoring/bewerbungen` — Free-Bewerbungen mit Beispieldaten, **nur lokal** (Produktion 404). */
export default function Seite() {
  if (process.env.NODE_ENV === "production") notFound();
  const jetzt = Date.now();
  const vor = (min: number) => new Date(jetzt - min * 60_000).toISOString();
  const b = (id: string, name: string, minuten: number, bestaetigt: boolean, status: BoardBewerbung["status"], kontakt: boolean, telefon: string | null): BoardBewerbung => ({
    id,
    user_id: `u-${id}`,
    name,
    email: `${name.split(" ")[0]!.toLowerCase()}@beispiel.de`,
    antworten: {
      stand: "Trade seit einem Jahr nebenbei, meistens NQ. Habe zwei Funded-Challenges knapp verloren.",
      schwierigkeit: "Ich halte meine Regeln nicht ein, sobald ich zwei Verluste hintereinander habe.",
      warum: "Ich will endlich einen klaren Prozess und Leute, die genauso ernsthaft dabei sind.",
    },
    kontakt_gewuenscht: kontakt,
    telefon,
    status,
    eingereicht_am: vor(minuten),
    adresse_bestaetigt_am: bestaetigt ? vor(minuten - 1) : null,
    geprueft_am: status === "offen" ? null : vor(minuten - 60),
    notiz: status === "abgelehnt" ? "Erwartung passt nicht (will in 2 Wochen Vollzeit traden)" : null,
    kanal: "youtube",
  });
  const liste = [
    b("1", "Test Funnel", 12, true, "offen", true, "+49 151 2345678"),
    b("2", "Jonas Weber", 95, true, "offen", false, null),
    b("3", "Mara Schulte", 30, false, "offen", true, "+49 160 9876543"),
    b("4", "Ben Wolf", 3000, true, "angenommen", false, null),
    b("5", "Niklas Braun", 4000, true, "abgelehnt", false, null),
  ];
  return (
    <AdminFrame>
      <Box maxW="1200px" mx="auto">
        <AdminPageHeader title="Free-Bewerbungen" subtitle="Bewerbungen für den kostenlosen Kurs über /training. Annehmen schaltet 30 Tage frei und schickt A02, Ablehnen schickt A03 — endgültig." />
        <TrainingBewerbungen bewerbungen={liste} fragen={bewerbung.fragen} />
      </Box>
    </AdminFrame>
  );
}
