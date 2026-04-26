"use client";

import {
  Alert,
  AlertIcon,
  Badge,
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
      <ModalOverlay bg="rgba(0,0,0,0.70)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(12,12,16,0.98)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="20px"
        boxShadow="0 24px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(212,175,55,0.06)"
      >
        <ModalHeader
          pt={6}
          pb={2}
          fontSize="lg"
          className="inter-semibold"
          color="var(--color-text-primary)"
        >
          Neuen Tracking-Link erstellen
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={4}>
            <FormControl isInvalid={Boolean(errors.label)} isRequired>
              <FormLabel
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="0.06em"
                color="rgba(255,255,255,0.55)"
                className="inter-semibold"
              >
                Bezeichnung (Kanal)
              </FormLabel>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Instagram Bio"
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.10)"
                color="var(--color-text-primary)"
                _placeholder={{ color: "rgba(255,255,255,0.25)" }}
                _hover={{ borderColor: "rgba(212,175,55,0.35)" }}
                _focus={{ borderColor: "rgba(212,175,55,0.60)", boxShadow: "0 0 0 1px rgba(212,175,55,0.40)" }}
                borderRadius="10px"
                className="inter"
              />
              <FormErrorMessage>{errors.label}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={Boolean(errors.slug)} isRequired>
              <FormLabel
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="0.06em"
                color="rgba(255,255,255,0.55)"
                className="inter-semibold"
              >
                URL-Slug
              </FormLabel>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value);
                }}
                placeholder="instagram-bio"
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.10)"
                color="var(--color-text-primary)"
                _placeholder={{ color: "rgba(255,255,255,0.25)" }}
                _hover={{ borderColor: "rgba(212,175,55,0.35)" }}
                _focus={{ borderColor: "rgba(212,175,55,0.60)", boxShadow: "0 0 0 1px rgba(212,175,55,0.40)" }}
                borderRadius="10px"
                className="inter"
                fontFamily="JetBrains Mono, monospace"
                fontSize="sm"
              />
              <FormHelperText color="rgba(255,255,255,0.30)" fontSize="xs" className="inter">
                Wird zu <Box as="span" fontFamily="JetBrains Mono, monospace">/insight?ref={slug || "..."}</Box>
              </FormHelperText>
              <FormErrorMessage>{errors.slug}</FormErrorMessage>
            </FormControl>

            {serverError && (
              <Alert
                status="error"
                variant="subtle"
                bg="rgba(229,72,77,0.10)"
                borderRadius="10px"
                border="1px solid rgba(229,72,77,0.22)"
              >
                <AlertIcon />
                <Text fontSize="sm" className="inter">{serverError}</Text>
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button
            variant="ghost"
            onClick={onClose}
            color="rgba(255,255,255,0.45)"
            _hover={{ bg: "rgba(255,255,255,0.06)" }}
            borderRadius="10px"
            className="inter"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={saving}
            loadingText="Erstellen…"
            borderRadius="10px"
            className="inter-semibold"
            bg="rgba(212,175,55,0.15)"
            color="var(--color-accent-gold)"
            border="1px solid rgba(212,175,55,0.35)"
            _hover={{ bg: "rgba(212,175,55,0.25)", borderColor: "rgba(212,175,55,0.60)" }}
          >
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
      <ModalOverlay bg="rgba(0,0,0,0.70)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(12,12,16,0.98)"
        border="1px solid rgba(229,72,77,0.18)"
        borderRadius="20px"
        boxShadow="0 24px 80px rgba(0,0,0,0.70)"
      >
        <ModalHeader fontSize="md" className="inter-semibold" color="var(--color-text-primary)" pt={6} pb={2}>
          Link löschen?
        </ModalHeader>
        <ModalBody pb={2}>
          <Text fontSize="sm" color="rgba(255,255,255,0.60)" className="inter" lineHeight="1.65">
            Der Link <Box as="span" fontFamily="JetBrains Mono, monospace" color="var(--color-text-primary)" fontSize="xs">{link?.slug}</Box>{" "}
            und alle zugehörigen Tracking-Daten werden unwiderruflich gelöscht.
          </Text>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button
            variant="ghost"
            onClick={onClose}
            color="rgba(255,255,255,0.45)"
            _hover={{ bg: "rgba(255,255,255,0.06)" }}
            borderRadius="10px"
            className="inter"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleDelete}
            isLoading={deleting}
            loadingText="Löschen…"
            borderRadius="10px"
            className="inter-semibold"
            bg="rgba(229,72,77,0.15)"
            color="rgba(248,113,113,0.90)"
            border="1px solid rgba(229,72,77,0.30)"
            _hover={{ bg: "rgba(229,72,77,0.25)" }}
          >
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
            <Text fontSize="xs" color="rgba(255,255,255,0.40)" className="inter-semibold" textTransform="uppercase" letterSpacing="0.08em">
              Gesamt Visits
            </Text>
            <Text fontSize="2xl" className="inter-bold" color="var(--color-text-primary)">
              {totalVisits.toLocaleString("de-DE")}
            </Text>
          </Box>
          <Box w="1px" h="36px" bg="rgba(255,255,255,0.08)" />
          <Box>
            <Text fontSize="xs" color="rgba(255,255,255,0.40)" className="inter-semibold" textTransform="uppercase" letterSpacing="0.08em">
              Gesamt Bewerbungen
            </Text>
            <Text fontSize="2xl" className="inter-bold" color="var(--color-accent-gold)">
              {totalApplications.toLocaleString("de-DE")}
            </Text>
          </Box>
          <Box w="1px" h="36px" bg="rgba(255,255,255,0.08)" />
          <Box>
            <Text fontSize="xs" color="rgba(255,255,255,0.40)" className="inter-semibold" textTransform="uppercase" letterSpacing="0.08em">
              Conv.-Rate
            </Text>
            <Text fontSize="2xl" className="inter-bold" color="var(--color-text-primary)">
              {conversionRate(totalVisits, totalApplications)}
            </Text>
          </Box>
        </HStack>

        <Button
          leftIcon={<Plus size={16} />}
          onClick={createModal.onOpen}
          borderRadius="10px"
          className="inter-semibold"
          bg="rgba(212,175,55,0.15)"
          color="var(--color-accent-gold)"
          border="1px solid rgba(212,175,55,0.35)"
          _hover={{ bg: "rgba(212,175,55,0.25)", borderColor: "rgba(212,175,55,0.60)" }}
          size="sm"
        >
          Neuen Link erstellen
        </Button>
      </HStack>

      {/* Table */}
      <Box
        mt={6}
        borderRadius="16px"
        border="1px solid rgba(255,255,255,0.07)"
        overflow="hidden"
        bg="rgba(255,255,255,0.02)"
      >
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm">
              Lade Tracking-Links…
            </Text>
          </Box>
        ) : links.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm" mb={2}>
              Noch keine Tracking-Links erstellt.
            </Text>
            <Text color="rgba(255,255,255,0.20)" className="inter" fontSize="xs">
              Erstelle deinen ersten Link um Kanal-Performance zu messen.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid rgba(255,255,255,0.06)">
                  {["Kanal", "Slug", "Visits", "Bewerbungen", "Conv.-Rate", ""].map((h) => (
                    <Th
                      key={h}
                      py={3}
                      px={4}
                      fontSize="10px"
                      letterSpacing="0.10em"
                      textTransform="uppercase"
                      color="rgba(255,255,255,0.35)"
                      className="inter-semibold"
                      fontWeight={600}
                    >
                      {h}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {links.map((link) => {
                  const cr = link.visits > 0
                    ? ((link.applications / link.visits) * 100).toFixed(1)
                    : null;

                  return (
                    <Tr
                      key={link.id}
                      borderBottom="1px solid rgba(255,255,255,0.04)"
                      _last={{ borderBottom: "none" }}
                      _hover={{ bg: "rgba(255,255,255,0.025)" }}
                      transition="background 150ms ease"
                    >
                      {/* Kanal */}
                      <Td py={3.5} px={4}>
                        <Text
                          fontSize="sm"
                          className="inter-semibold"
                          color="var(--color-text-primary)"
                        >
                          {link.label}
                        </Text>
                      </Td>

                      {/* Slug + URL-Link */}
                      <Td py={3.5} px={4}>
                        <HStack spacing={2}>
                          <Text
                            fontSize="xs"
                            fontFamily="JetBrains Mono, monospace"
                            color="rgba(212,175,55,0.75)"
                            bg="rgba(212,175,55,0.07)"
                            px={2}
                            py={0.5}
                            borderRadius="6px"
                            border="1px solid rgba(212,175,55,0.15)"
                          >
                            {link.slug}
                          </Text>
                          <IconButton
                            aria-label="Link öffnen"
                            icon={<ExternalLink size={13} />}
                            size="xs"
                            variant="ghost"
                            color="rgba(255,255,255,0.30)"
                            _hover={{ color: "rgba(255,255,255,0.70)" }}
                            as="a"
                            href={buildTrackingUrl(link.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        </HStack>
                      </Td>

                      {/* Visits */}
                      <Td py={3.5} px={4}>
                        <Text fontSize="sm" className="inter" color="var(--color-text-primary)">
                          {link.visits.toLocaleString("de-DE")}
                        </Text>
                      </Td>

                      {/* Bewerbungen */}
                      <Td py={3.5} px={4}>
                        <Text
                          fontSize="sm"
                          className="inter-semibold"
                          color={link.applications > 0 ? "var(--color-accent-gold)" : "rgba(255,255,255,0.35)"}
                        >
                          {link.applications.toLocaleString("de-DE")}
                        </Text>
                      </Td>

                      {/* Conv.-Rate */}
                      <Td py={3.5} px={4}>
                        {cr !== null ? (
                          <Badge
                            fontSize="xs"
                            px={2}
                            py={0.5}
                            borderRadius="6px"
                            bg={
                              parseFloat(cr) >= 10
                                ? "rgba(34,197,94,0.15)"
                                : parseFloat(cr) >= 5
                                  ? "rgba(212,175,55,0.15)"
                                  : "rgba(255,255,255,0.06)"
                            }
                            color={
                              parseFloat(cr) >= 10
                                ? "rgba(74,222,128,0.90)"
                                : parseFloat(cr) >= 5
                                  ? "rgba(212,175,55,0.90)"
                                  : "rgba(255,255,255,0.40)"
                            }
                            border="none"
                          >
                            {cr} %
                          </Badge>
                        ) : (
                          <Text fontSize="xs" color="rgba(255,255,255,0.25)" className="inter">
                            —
                          </Text>
                        )}
                      </Td>

                      {/* Aktionen */}
                      <Td py={3.5} px={4}>
                        <HStack spacing={1} justify="flex-end">
                          <IconButton
                            aria-label="Link kopieren"
                            icon={<Copy size={14} />}
                            size="xs"
                            variant="ghost"
                            color="rgba(255,255,255,0.35)"
                            _hover={{ color: "rgba(212,175,55,0.80)", bg: "rgba(212,175,55,0.08)" }}
                            borderRadius="7px"
                            onClick={() => copyToClipboard(link.slug)}
                          />
                          <IconButton
                            aria-label="Link löschen"
                            icon={<Trash2 size={14} />}
                            size="xs"
                            variant="ghost"
                            color="rgba(255,255,255,0.25)"
                            _hover={{ color: "rgba(248,113,113,0.80)", bg: "rgba(229,72,77,0.08)" }}
                            borderRadius="7px"
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

      <Text fontSize="xs" color="rgba(255,255,255,0.20)" className="inter" mt={2}>
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
