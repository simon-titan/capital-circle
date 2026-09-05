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
  Select,
  Stack,
  Switch,
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
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Coupon {
  id: string;
  code: string;
  stripe_promotion_code_id: string | null;
  stripe_coupon_id: string | null;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  max_redemptions: number | null;
  active: boolean;
  created_at: string;
  times_redeemed: number | null;
  stripe_active: boolean | null;
}

function formatDiscount(c: Pick<Coupon, "discount_type" | "discount_value">): string {
  return c.discount_type === "percent" ? `${c.discount_value} %` : `${c.discount_value.toFixed(2)} €`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputSx = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.10)",
  color: "var(--color-text-primary)",
  _placeholder: { color: "rgba(255,255,255,0.25)" },
  _hover: { borderColor: "rgba(212,175,55,0.35)" },
  _focus: { borderColor: "rgba(212,175,55,0.60)", boxShadow: "0 0 0 1px rgba(212,175,55,0.40)" },
  borderRadius: "10px",
};

const labelSx = {
  fontSize: "xs",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.55)",
  className: "inter-semibold",
};

/* ── Create Modal ─────────────────────────────────────────────────────────── */

function CreateCouponModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (coupon: Coupon) => void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [validUntil, setValidUntil] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ code?: string; discountValue?: string }>({});

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setDescription("");
      setDiscountType("percent");
      setDiscountValue("10");
      setValidUntil("");
      setMaxRedemptions("");
      setSaving(false);
      setServerError(null);
      setErrors({});
    }
  }, [isOpen]);

  function validate(): boolean {
    const errs: { code?: string; discountValue?: string } = {};
    if (!code.trim()) errs.code = "Code ist erforderlich.";
    const value = Number(discountValue);
    if (!discountValue || Number.isNaN(value) || value <= 0) {
      errs.discountValue = "Rabatt-Höhe muss größer als 0 sein.";
    } else if (discountType === "percent" && value > 100) {
      errs.discountValue = "Prozent darf nicht über 100 liegen.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: Number(discountValue),
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; item?: Coupon };
      if (!json.ok) {
        setServerError(json.error ?? "Fehler beim Erstellen.");
        return;
      }
      if (json.item) onCreated({ ...json.item, times_redeemed: 0, stripe_active: true });
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
        <ModalHeader pt={6} pb={2} fontSize="lg" className="inter-semibold" color="var(--color-text-primary)">
          Neuen Gutschein erstellen
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={4}>
            <FormControl isInvalid={Boolean(errors.code)} isRequired>
              <FormLabel {...labelSx}>Code</FormLabel>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. WELCOME10"
                sx={inputSx}
                fontFamily="JetBrains Mono, monospace"
                fontSize="sm"
              />
              <FormErrorMessage>{errors.code}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel {...labelSx}>Beschreibung (intern)</FormLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Black-Friday-Aktion"
                sx={inputSx}
              />
            </FormControl>

            <HStack spacing={4} align="flex-start">
              <FormControl w="140px">
                <FormLabel {...labelSx}>Rabatt-Typ</FormLabel>
                <Select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                  sx={inputSx}
                >
                  <option value="percent">Prozent</option>
                  <option value="fixed">Fixbetrag (€)</option>
                </Select>
              </FormControl>
              <FormControl flex={1} isInvalid={Boolean(errors.discountValue)} isRequired>
                <FormLabel {...labelSx}>{discountType === "percent" ? "Prozent" : "Betrag (€)"}</FormLabel>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  sx={inputSx}
                />
                <FormErrorMessage>{errors.discountValue}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack spacing={4} align="flex-start">
              <FormControl flex={1}>
                <FormLabel {...labelSx}>Gültig bis</FormLabel>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  sx={inputSx}
                />
                <FormHelperText color="rgba(255,255,255,0.30)" fontSize="xs" className="inter">
                  Leer = unbegrenzt gültig.
                </FormHelperText>
              </FormControl>
              <FormControl flex={1}>
                <FormLabel {...labelSx}>Max. Einlösungen</FormLabel>
                <Input
                  type="number"
                  min={1}
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="unbegrenzt"
                  sx={inputSx}
                />
              </FormControl>
            </HStack>

            {serverError && (
              <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="10px" border="1px solid rgba(229,72,77,0.22)">
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
            Gutschein erstellen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ── Delete Confirm Modal ─────────────────────────────────────────────────── */

function DeleteConfirmModal({
  coupon,
  onClose,
  onDeleted,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!coupon) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean };
      if (json.ok) {
        onDeleted(coupon.id);
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={Boolean(coupon)} onClose={onClose} size="sm" isCentered>
      <ModalOverlay bg="rgba(0,0,0,0.70)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(12,12,16,0.98)"
        border="1px solid rgba(229,72,77,0.18)"
        borderRadius="20px"
        boxShadow="0 24px 80px rgba(0,0,0,0.70)"
      >
        <ModalHeader fontSize="md" className="inter-semibold" color="var(--color-text-primary)" pt={6} pb={2}>
          Gutschein löschen?
        </ModalHeader>
        <ModalBody pb={2}>
          <Text fontSize="sm" color="rgba(255,255,255,0.60)" className="inter" lineHeight="1.65">
            Der Code{" "}
            <Box as="span" fontFamily="JetBrains Mono, monospace" color="var(--color-text-primary)" fontSize="xs">
              {coupon?.code}
            </Box>{" "}
            wird auf Stripe deaktiviert (kein Hard-Delete möglich) und aus dieser Liste entfernt.
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

/* ── Main Component ───────────────────────────────────────────────────────── */

export function AdminGutscheineManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const createModal = useDisclosure();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: Coupon[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setCoupons(json.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreated(coupon: Coupon) {
    setCoupons((prev) => [coupon, ...prev]);
    toast({
      title: "Gutschein erstellt",
      description: `${coupon.code} ist jetzt im Checkout einlösbar.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }

  function handleDeleted(id: string) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Gutschein gelöscht", status: "info", duration: 2500, isClosable: true });
  }

  async function toggleActive(coupon: Coupon) {
    setTogglingId(coupon.id);
    const nextActive = !coupon.active;
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: nextActive } : c)));
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Speichern.");
    } catch (err) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: coupon.active } : c)));
      toast({ title: "Fehler", description: (err as Error).message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
          {coupons.length} Gutschein{coupons.length === 1 ? "" : "e"}
        </Text>
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
          Neuen Gutschein erstellen
        </Button>
      </HStack>

      {error && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px" mt={4}>
          <AlertIcon />
          <Text fontSize="sm" className="inter">{error}</Text>
        </Alert>
      )}

      <Box mt={6} borderRadius="16px" border="1px solid rgba(255,255,255,0.07)" overflow="hidden" bg="rgba(255,255,255,0.02)">
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm">Lade Gutscheine…</Text>
          </Box>
        ) : coupons.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm" mb={2}>
              Noch keine Gutscheine erstellt.
            </Text>
            <Text color="rgba(255,255,255,0.20)" className="inter" fontSize="xs">
              Erstelle einen Rabattcode — er ist danach direkt im Stripe-Checkout einlösbar.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid rgba(255,255,255,0.06)">
                  {["Code", "Rabatt", "Gültig bis", "Einlösungen", "Status", "Erstellt", ""].map((h) => (
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
                {coupons.map((c) => (
                  <Tr
                    key={c.id}
                    borderBottom="1px solid rgba(255,255,255,0.04)"
                    _last={{ borderBottom: "none" }}
                    _hover={{ bg: "rgba(255,255,255,0.025)" }}
                    transition="background 150ms ease"
                  >
                    <Td py={3.5} px={4}>
                      <Stack spacing={0}>
                        <Text
                          fontSize="xs"
                          fontFamily="JetBrains Mono, monospace"
                          color="rgba(212,175,55,0.85)"
                          bg="rgba(212,175,55,0.07)"
                          px={2}
                          py={0.5}
                          borderRadius="6px"
                          border="1px solid rgba(212,175,55,0.15)"
                          display="inline-block"
                          w="fit-content"
                        >
                          {c.code}
                        </Text>
                        {c.description && (
                          <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter" mt={1}>
                            {c.description}
                          </Text>
                        )}
                      </Stack>
                    </Td>
                    <Td py={3.5} px={4}>
                      <Text fontSize="sm" className="jetbrains-mono" color="var(--color-text-primary)">
                        {formatDiscount(c)}
                      </Text>
                    </Td>
                    <Td py={3.5} px={4}>
                      <Text fontSize="sm" className="inter" color="rgba(255,255,255,0.60)">
                        {formatDate(c.valid_until)}
                      </Text>
                    </Td>
                    <Td py={3.5} px={4}>
                      <Text fontSize="sm" className="jetbrains-mono" color="var(--color-text-primary)">
                        {c.times_redeemed ?? "—"}
                        {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                      </Text>
                    </Td>
                    <Td py={3.5} px={4}>
                      <HStack spacing={2}>
                        <Switch
                          isChecked={c.active}
                          isDisabled={togglingId === c.id}
                          onChange={() => toggleActive(c)}
                          colorScheme="yellow"
                          size="sm"
                        />
                        <Badge
                          fontSize="9px"
                          px={2}
                          py={0.5}
                          borderRadius="6px"
                          bg={c.active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)"}
                          color={c.active ? "rgba(74,222,128,0.90)" : "rgba(255,255,255,0.40)"}
                          border="none"
                        >
                          {c.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </HStack>
                    </Td>
                    <Td py={3.5} px={4}>
                      <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter">
                        {formatDate(c.created_at)}
                      </Text>
                    </Td>
                    <Td py={3.5} px={4}>
                      <IconButton
                        aria-label="Löschen"
                        icon={<Trash2 size={14} />}
                        size="xs"
                        variant="ghost"
                        color="rgba(255,255,255,0.25)"
                        _hover={{ color: "rgba(248,113,113,0.80)", bg: "rgba(229,72,77,0.08)" }}
                        borderRadius="7px"
                        onClick={() => setDeleteTarget(c)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Text fontSize="xs" color="rgba(255,255,255,0.20)" className="inter" mt={2}>
        Einlösungen werden live von Stripe gezählt (Source of Truth), nicht lokal gespeichert.
      </Text>

      <CreateCouponModal isOpen={createModal.isOpen} onClose={createModal.onClose} onCreated={handleCreated} />
      <DeleteConfirmModal coupon={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
    </>
  );
}
