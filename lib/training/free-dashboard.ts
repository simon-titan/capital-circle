import type { SupabaseClient } from "@supabase/supabase-js";
import type { FreeDashboardDaten, FreeLektion, FreeZugang } from "@/components/platform/dashboard/types";
import { OPTIONALE_VIDEOS, TRAINING_VIDEOS_PFAD, videoPlatzhalter } from "@/config/training";
import { isPlaylistIndexUnlocked } from "@/lib/module-video";
import { ladeBlueprint } from "@/lib/trading-blueprint";
import { ladeTrainingsStand, type TrainingsStand } from "./stand";
import { ladeTrainingFreigabe, whatsappVerlaengerungUrl, type TrainingFreigabe } from "./zugang";

/**
 * Daten fürs Free-Dashboard (Emres Mockup, 08.11.2026). Stand und Freischaltung
 * kommen aus denselben Quellen wie `/kostenloses-training` (`ladeTrainingsStand`,
 * `ladeTrainingFreigabe`) — an der Zugangslogik ändert sich nichts.
 *
 * Wirft nie: Ein Lesefehler liefert einen leeren Stand statt eines kaputten
 * Dashboards.
 */

function zugangAus(f: TrainingFreigabe | null): FreeZugang {
  if (!f) return { art: "offen" };
  switch (f.art) {
    case "aktiv":
      return { art: "aktiv", restTage: f.restTage };
    case "beendet":
      return { art: "beendet", whatsappUrl: f.verlaengerbar ? whatsappVerlaengerungUrl() : null };
    case "keine":
      return { art: "keine" };
    case "bewerbung":
      // Offen/abgelehnt schickt `proxy.ts` gar nicht erst aufs Dashboard; was hier
      // ankommt, ist angenommen, aber ohne Zugangszeile.
      return { art: "wartet" };
    default:
      // `bezahlt` bei einem Free-Konto heißt: Tabellen fehlen — Training gilt als offen.
      return { art: "offen" };
  }
}

const LEERER_STAND: TrainingsStand = {
  videos: [],
  fertig: [],
  gesehen: 0,
  gesamt: videoPlatzhalter.length,
  abgeschlossen: false,
  naechstes: 1,
  progressMap: {},
  lastVideoId: null,
};

export function baueFreeTraining(stand: TrainingsStand, zugang: FreeZugang): FreeDashboardDaten["training"] {
  const mitZugang = zugang.art === "aktiv" || zugang.art === "offen";
  const { videos, fertig, gesamt } = stand;
  const gesehen = Math.min(stand.gesehen, gesamt);
  const titelVon = (i: number) => videos[i]?.title?.trim() || videoPlatzhalter[i]?.titel || `Lektion ${i + 1}`;
  const lektionHref = (n: number) => `${TRAINING_VIDEOS_PFAD}?video=${n}`;

  const lektionen: FreeLektion[] = Array.from({ length: gesamt }, (_, i) => {
    const nummer = i + 1;
    const vorhanden = i < videos.length;
    const istFertig = Boolean(fertig[i]);
    const aktuell = !istFertig && vorhanden && nummer === stand.naechstes;
    const frei = vorhanden && isPlaylistIndexUnlocked(videos, stand.progressMap, i);
    const status: FreeLektion["status"] = istFertig ? "fertig" : aktuell ? "aktuell" : frei ? "offen" : "gesperrt";
    return {
      nummer,
      titel: titelVon(i),
      optional: vorhanden ? Boolean(videos[i]?.optional) : OPTIONALE_VIDEOS.includes(nummer),
      status,
      // Klickbar nur mit Zugang und nur, was der Kursplayer auch öffnet.
      href: mitZugang && vorhanden && status !== "gesperrt" ? lektionHref(nummer) : null,
    };
  });

  const naechsteVorhanden = stand.naechstes <= videos.length;
  const naechste =
    !stand.abgeschlossen && naechsteVorhanden ? { nummer: stand.naechstes, titel: titelVon(stand.naechstes - 1) } : null;

  // Vorschaubild: die nächste Lektion, sonst die zuletzt gesehene, sonst die erste.
  const zuletzt = stand.lastVideoId ? videos.find((v) => v.id === stand.lastVideoId) : undefined;
  const bildVideo = (naechste ? videos[naechste.nummer - 1] : undefined) ?? zuletzt ?? videos[0];

  return {
    gesehen,
    gesamt,
    prozent: gesamt > 0 ? Math.round((gesehen / gesamt) * 100) : 0,
    abgeschlossen: stand.abgeschlossen,
    naechste,
    thumbnailUrl: bildVideo?.thumbnailSignedUrl ?? null,
    weiterHref: naechste ? lektionHref(naechste.nummer) : TRAINING_VIDEOS_PFAD,
    lektionen,
  };
}

export async function ladeFreeDashboard(
  db: { konto: SupabaseClient; service: SupabaseClient },
  userId: string,
  basis: { firstName: string; showApplyPrompt: boolean },
): Promise<FreeDashboardDaten> {
  const [stand, freigabe, blueprint] = await Promise.all([
    ladeTrainingsStand(db.konto, userId).catch(() => LEERER_STAND),
    ladeTrainingFreigabe(db.service, userId, { is_paid: false, is_admin: false }).catch(() => null),
    ladeBlueprint(),
  ]);
  const zugang = zugangAus(freigabe);
  return {
    ...basis,
    zugang,
    training: baueFreeTraining(stand, zugang),
    // Das Free-Dashboard sehen nur Free-Konten — frei heißt hier: Kurs abgeschlossen.
    blueprint: { pdf: Boolean(blueprint.r2_key), video: Boolean(blueprint.video_uid), frei: stand.abgeschlossen },
  };
}
