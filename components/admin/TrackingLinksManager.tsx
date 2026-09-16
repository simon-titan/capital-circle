"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminDangerButtonProps,
  adminFormLabelProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
  adminTableSx,
} from "@/components/admin/adminUi";

interface TrackingLink {
  id: string;
  label: string;
  slug: string;
  created_at: string;
  visits: number;
  applications: number;
}

function conversionRate(visits: number, applications: number): string {
  if (visits === 0) return "—";
  return `${((applications / visits) * 100).toFixed(1)} %`;
}

function buildTrackingUrl(slug: string): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  return `${base}/insight?ref=${encodeURIComponent(slug)}`;
}

/* ── Create-Link Modal ─────────────────────────────────────────────────────── */

function CreateLinkModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (link: TrackingLink) => void;
}) {
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ label?: string; slug?: string }>({});

  useEffect(() => {
    if (!isOpen) {
      setLabel("");
      setSlug("");
      setSlugManual(false);
      setSaving(false);
      setServerError(null);
      setErrors({});
    }
  }, [isOpen]);

  // Auto-Slug aus Label ableiten (außer wenn manuell bearbeitet)
  useEffect(() => {
    if (slugManual) return;
    const auto = label
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setSlug(auto);
  }, [label, slugManual]);

  function validate(): boolean {
    const errs: { label?: string; slug?: string } = {};
    if (!label.trim()) errs.label = "Bezeichnung ist erforderlich.";
    if (!slug.trim()) errs.slug = "Slug ist erforderlich.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await fetch("/api/admin/tracking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: label.trim(), slug: slug.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; item?: TrackingLink };
      if (!json.ok) {
        setServerError(json.error ?? "Fehler beim Erstellen.");
        return;
      }
      if (json.item) onCreated(json.item);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps}>
        <ModalHeader {...adminModalHeaderProps} pt={6} pb={2}>
          Neuen Tracking-Link erstellen
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={4}>
            <FormControl isInvalid={Boolean(errors.label)} isRequired>
              <FormLabel {...adminFormLabelProps}>Bezeichnung (Kanal)</FormLabel>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Instagram Bio"
                {...adminInputProps}
              />
              <FormErrorMessage>{errors.label}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(errors.slug)} isRequired>
              <FormLabel {...adminFormLabelProps}>URL-Slug</FormLabel>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value);
                }}
                placeholder="instagram-bio"
                {...adminInputProps}
                fontSize="sm"
              />
              <FormHelperText color="var(--cc-text-3)" fontSize="12px">
                Wird zu{" "}
                <Box as="span" color="var(--cc-text-2)">
                  /insight?ref={slug || "..."}
                </Box>
              </FormHelperText>
              <FormErrorMessage>{errors.slug}</FormErrorMessage>
            </FormControl>

            {serverError && (
              <Alert status="error" variant="subtle" {...adminAlertProps("error")}>
                <AlertIcon color={adminAlertIconColor("error")} />
                <Text fontSize="sm">{serverError}</Text>
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button
            variant="ghost"
            onClick={onClose}
            color="var(--cc-text-2)"
            _hover={{ bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" }}
          >
            Abbrechen
          </Button>
          <Button variant="gold" onClick={handleSubmit} isLoading={saving} loadingText="Erstellen…">
            Link erstellen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ── Delete Confirm Modal ──────────────────────────────────────────────────── */

function DeleteConfirmModal({
  link,
  onClose,
  onDeleted,
}: {
  link: TrackingLink | null;
  onClose: () => void;
  onDeleted: (slug: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!link) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tracking?slug=${encodeURIComponent(link.slug)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        onDeleted(link.slug);
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={Boolean(link)} onClose={onClose} size="sm" isCentered>
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps}>
        <ModalHeader {...adminModalHeaderProps} pt={6} pb={2}>
          Link löschen?
        </ModalHeader>
        <ModalBody pb={2}>
          <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.65">
            Der Link{" "}
            <Box as="span" color="var(--cc-text)" fontWeight={500}>
              {link?.slug}
            </Box>{" "}
            und alle zugehörigen Tracking-Daten werden unwiderruflich gelöscht.
          </Text>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button
            variant="ghost"
            onClick={onClose}
            color="var(--cc-text-2)"
            _hover={{ bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" }}
          >
            Abbrechen
          </Button>
          <Button {...adminDangerButtonProps} onClick={handleDelete} isLoading={deleting} loadingText="Löschen…">
            Endgültig löschen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */

export function TrackingLinksManager() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TrackingLink | null>(null);
  const createModal = useDisclosure();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tracking");
      const json = (await res.json()) as { ok: boolean; items?: TrackingLink[] };
      if (json.ok) setLinks(json.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreated(link: TrackingLink) {
    setLinks((prev) => [link, ...prev]);
    toast({
      title: "Link erstellt",
      description: `/${link.slug} ist jetzt aktiv.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }

  function handleDeleted(slug: string) {
    setLinks((prev) => prev.filter((l) => l.slug !== slug));
    toast({
      title: "Link gelöscht",
      status: "info",
      duration: 2500,
      isClosable: true,
    });
  }

  async function copyToClipboard(slug: string) {
    const url = buildTrackingUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link kopiert!", status: "success", duration: 2000, isClosable: true });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", status: "error", duration: 2000, isClosable: true });
    }
  }

  const totalVisits = links.reduce((s, l) => s + l.visits, 0);
  const totalApplications = links.reduce((s, l) => s + l.applications, 0);

  return (
    <>
      {/* Header + Create Button */}
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        {/* Summary Stats */}
        <HStack spacing={6}>
          <Box>
            <AdminLabel mb={1}>Gesamt Visits</AdminLabel>
            <Text fontSize="24px" fontWeight={600} lineHeight={1.2} className="cc-num" color="var(--cc-text)">
              {totalVisits.toLocaleString("de-DE")}
            </Text>
          </Box>
          <Box w="1px" h="36px" bg="var(--cc-line)" />
          <Box>
            <AdminLabel mb={1}>Gesamt Bewerbungen</AdminLabel>
            <Text fontSize="24px" fontWeight={600} lineHeight={1.2} className="cc-num" color="var(--cc-text)">
              {totalApplications.toLocaleString("de-DE")}
            </Text>
          </Box>
          <Box w="1px" h="36px" bg="var(--cc-line)" />
          <Box>
            <AdminLabel mb={1}>Conv.-Rate</AdminLabel>
            <Text fontSize="24px" fontWeight={600} lineHeight={1.2} className="cc-num" color="var(--cc-text)">
              {conversionRate(totalVisits, totalApplications)}
            </Text>
          </Box>
        </HStack>

        <Button variant="gold" size="sm" leftIcon={<Plus size={16} />} onClick={createModal.onOpen}>
          Neuen Link erstellen
        </Button>
      </HStack>

      {/* Table */}
      <Box mt={6} className={ADMIN_CARD_CLASS} overflow="hidden">
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="14px">
              Lade Tracking-Links…
            </Text>
          </Box>
        ) : links.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="14px" mb={2}>
              Noch keine Tracking-Links erstellt.
            </Text>
            <Text color="var(--cc-text-3)" fontSize="12px">
              Erstelle deinen ersten Link um Kanal-Performance zu messen.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" px={2} py={1}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Kanal", "Slug", "Visits", "Bewerbungen", "Conv.-Rate", ""].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {links.map((link) => {
                  const cr = link.visits > 0
                    ? ((link.applications / link.visits) * 100).toFixed(1)
                    : null;

                  return (
                    <Tr key={link.id}>
                      {/* Kanal */}
                      <Td>
                        <Text fontSize="14px" fontWeight={500} color="var(--cc-text)">
                          {link.label}
                        </Text>
                      </Td>

                      {/* Slug + URL-Link */}
                      <Td>
                        <HStack spacing={2}>
                          <Text
                            fontSize="12px"
                            color="var(--cc-text-soft)"
                            bg="rgba(255, 255, 255, 0.04)"
                            px={2}
                            py={0.5}
                            borderRadius="6px"
                            border="1px solid var(--cc-line)"
                          >
                            {link.slug}
                          </Text>
                          <IconButton
                            aria-label="Link öffnen"
                            icon={<ExternalLink size={13} />}
                            size="xs"
                            variant="ghost"
                            color="var(--cc-text-3)"
                            _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.05)" }}
                            as="a"
                            href={buildTrackingUrl(link.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        </HStack>
                      </Td>

                      {/* Visits */}
                      <Td>
                        <Text fontSize="14px" className="cc-num" color="var(--cc-text)">
                          {link.visits.toLocaleString("de-DE")}
                        </Text>
                      </Td>

                      {/* Bewerbungen */}
                      <Td>
                        <Text
                          fontSize="14px"
                          fontWeight={link.applications > 0 ? 600 : 400}
                          className="cc-num"
                          color={link.applications > 0 ? "var(--cc-text)" : "var(--cc-text-3)"}
                        >
                          {link.applications.toLocaleString("de-DE")}
                        </Text>
                      </Td>

                      {/* Conv.-Rate */}
                      <Td>
                        {cr !== null ? (
                          <StatusPill
                            className="cc-num"
                            tone={
                              parseFloat(cr) >= 10
                                ? "success"
                                : parseFloat(cr) >= 5
                                  ? "attention"
                                  : "neutral"
                            }
                          >
                            {cr} %
                          </StatusPill>
                        ) : (
                          <Text fontSize="12px" color="var(--cc-text-3)">
                            —
                          </Text>
                        )}
                      </Td>

                      {/* Aktionen */}
                      <Td>
                        <HStack spacing={1} justify="flex-end">
                          <IconButton
                            aria-label="Link kopieren"
                            icon={<Copy size={14} />}
                            size="xs"
                            variant="ghost"
                            color="var(--cc-text-3)"
                            _hover={{ color: "var(--cc-gold-light)", bg: "var(--cc-gold-wash)" }}
                            borderRadius="6px"
                            onClick={() => copyToClipboard(link.slug)}
                          />
                          <IconButton
                            aria-label="Link löschen"
                            icon={<Trash2 size={14} />}
                            size="xs"
                            variant="ghost"
                            color="var(--cc-text-3)"
                            _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.08)" }}
                            borderRadius="6px"
                            onClick={() => setDeleteTarget(link)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Text fontSize="12px" color="var(--cc-text-3)" mt={2}>
        Visits werden pro Browser-Session dedupliziert. Bewerbungen werden nicht dedupliziert.
      </Text>

      {/* Modals */}
      <CreateLinkModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onCreated={handleCreated}
      />
      <DeleteConfirmModal
        link={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
