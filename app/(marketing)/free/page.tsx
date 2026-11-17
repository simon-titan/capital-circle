import { permanentRedirect } from "next/navigation";
import { TRAINING_PFAD } from "@/config/training";

/**
 * `/free` war der alte kostenlose Weg (Bewerbung, Freigabe durch einen Admin,
 * 5-Tage-Mails). Seit 02.11.2026 ersetzt durch das Free Training unter
 * `/training` (Entscheidung Simon). Die Adresse steht noch in alten Links und
 * Mails, deshalb eine dauerhafte Weiterleitung statt 404.
 *
 * `FreeLandingExperience` und `/api/applications/create` bleiben im Code,
 * werden aber von keiner Seite mehr erreicht.
 */
export default function FreePage() {
  permanentRedirect(TRAINING_PFAD);
}
