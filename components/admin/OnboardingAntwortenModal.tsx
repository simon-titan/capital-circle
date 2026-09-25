"use client";

import {
  Box,
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  AdminLabel,
  StatusPill,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
} from "@/components/admin/adminUi";

type Detail = {
  ok: boolean;
  error?: string;
  antworten: { frage: string; antwort: string }[];
  attribution: Record<string, unknown> | null;
  bestand: boolean | null;
  schritte: { discord: string | null; vorstellung: string | null; kurs: string | null } | null;
  profil: {
    onboarding_gestartet_am: string | null;
    onboarding_fragen_am: string | null;
    onboarding_abgeschlossen_am: string | null;
    passwort_gesetzt_am: string | null;
  } | null;
};

function datum(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

/** Antworten eines Mitglieds aus dem Onboarding (Spalte „Onboarding" in `/admin/mitglieder`). */
export function OnboardingAntwortenModal({
  user,
  onClose,
}: {
  user: { id: string; email: string } | null;
  onClose: () => void;
}) {
  // Geladen wird je Mitglied; ein Stand für ein anderes Mitglied gilt als „lädt noch".
  const [geladen, setGeladen] = useState<{ id: string; detail: Detail } | null>(null);
  const detail = geladen && user && geladen.id === user.id ? geladen.detail : null;

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let abgebrochen = false;
    const id = userId;
    fetch(`/api/admin/icp?user=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<Detail>)
      .then((d) => {
        if (!abgebrochen) setGeladen({ id, detail: d });
      })
      .catch(() => {
        if (!abgebrochen) setGeladen({ id, detail: { ok: false, error: "Keine Verbindung." } as Detail });
      });
    return () => {
      abgebrochen = true;
    };
  }, [userId]);

  const attribution = detail?.attribution
    ? Object.entries(detail.attribution).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <Modal isOpen={Boolean(user)} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps} mx={4}>
        <ModalHeader {...adminModalHeaderProps}>
          Onboarding
          <Text fontSize="13px" fontWeight={400} color="var(--cc-text-2)" mt={1} noOfLines={1}>
            {user?.email}
          </Text>
        </ModalHeader>
        <ModalCloseButton color="var(--cc-text-2)" />
        <ModalBody>
          {!detail ? (
            <Text fontSize="sm" color="var(--cc-text-2)">
              Wird geladen …
            </Text>
          ) : !detail.ok ? (
            <Text fontSize="sm" color="var(--cc-text-2)">
              {detail.error ?? "Nicht verfügbar."}
            </Text>
          ) : (
            <Stack spacing={5}>
              {detail.antworten.length === 0 ? (
                <Text fontSize="sm" color="var(--cc-text-2)">
                  Noch keine Antworten.
                </Text>
              ) : (
                <Stack spacing={3.5}>
                  {detail.bestand != null ? (
                    <Box>
                      <StatusPill tone={detail.bestand ? "neutral" : "attention"}>
                        {detail.bestand ? "Bestandsmitglied" : "Neukäufer"}
                      </StatusPill>
                    </Box>
                  ) : null}
                  {detail.antworten.map((a) => (
                    <Box key={a.frage}>
                      <Text fontSize="12px" color="var(--cc-text-2)" lineHeight={1.4}>
                        {a.frage}
                      </Text>
                      <Text fontSize="14px" color="var(--cc-text)" fontWeight={500} mt={0.5}>
                        {a.antwort}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              )}

              <Divider borderColor="var(--cc-line)" />

              <Stack spacing={2}>
                <AdminLabel>Ablauf</AdminLabel>
                {[
                  ["Gestartet", detail.profil?.onboarding_gestartet_am],
                  ["Fragen beantwortet", detail.profil?.onboarding_fragen_am],
                  ["Discord verbunden", detail.schritte?.discord],
                  ["Vorgestellt", detail.schritte?.vorstellung],
                  ["Kurs gestartet", detail.schritte?.kurs],
                  ["Abgeschlossen", detail.profil?.onboarding_abgeschlossen_am],
                  ["Passwort bekannt seit", detail.profil?.passwort_gesetzt_am],
                ].map(([label, wert]) => (
                  <Stack key={label as string} direction="row" justify="space-between" fontSize="13px">
                    <Text color="var(--cc-text-2)">{label}</Text>
                    <Text className="cc-num" color={wert ? "var(--cc-text)" : "var(--cc-text-3)"}>
                      {datum(wert as string | null)}
                    </Text>
                  </Stack>
                ))}
              </Stack>

              {attribution.length ? (
                <>
                  <Divider borderColor="var(--cc-line)" />
                  <Stack spacing={2}>
                    <AdminLabel>Technische Herkunft (UTM)</AdminLabel>
                    {attribution.map(([k, v]) => (
                      <Stack key={k} direction="row" justify="space-between" fontSize="13px" spacing={4}>
                        <Text color="var(--cc-text-2)">{k}</Text>
                        <Text color="var(--cc-text)" textAlign="right" wordBreak="break-all">
                          {String(v)}
                        </Text>
                      </Stack>
                    ))}
                  </Stack>
                </>
              ) : null}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="line" size="sm" onClick={onClose}>
            Schließen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
