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
import {
  ADMIN_CARD_CLASS,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminDangerButtonProps,
  adminFormLabelProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOptionStyle,
  adminOverlayProps,
  adminSwitchSx,
  adminTableSx,
} from "@/components/admin/adminUi";

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
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps}>
        <ModalHeader pt={6} pb={2} {...adminModalHeaderProps}>
          Neuen Gutschein erstellen
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={4}>
            <FormControl isInvalid={Boolean(errors.code)} isRequired>
              <FormLabel {...adminFormLabelProps}>Code</FormLabel>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. WELCOME10"
                {...adminInputProps}
                className="cc-num"
                letterSpacing="0.04em"
                fontSize="sm"
              />
              <FormErrorMessage color="var(--cc-danger)">{errors.code}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Beschreibung (intern)</FormLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Black-Friday-Aktion"
                {...adminInputProps}
              />
            </FormControl>

            <HStack spacing={4} align="flex-start">
              <FormControl w="140px">
                <FormLabel {...adminFormLabelProps}>Rabatt-Typ</FormLabel>
                <Select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                  {...adminInputProps}
                >
                  <option value="percent" style={adminOptionStyle}>
                    Prozent
                  </option>
                  <option value="fixed" style={adminOptionStyle}>
                    Fixbetrag (€)
                  </option>
                </Select>
              </FormControl>
              <FormControl flex={1} isInvalid={Boolean(errors.discountValue)} isRequired>
                <FormLabel {...adminFormLabelProps}>{discountType === "percent" ? "Prozent" : "Betrag (€)"}</FormLabel>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  {...adminInputProps}
                  className="cc-num"
                />
                <FormErrorMessage color="var(--cc-danger)">{errors.discountValue}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack spacing={4} align="flex-start">
              <FormControl flex={1}>
                <FormLabel {...adminFormLabelProps}>Gültig bis</FormLabel>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  {...adminInputProps}
                  className="cc-num"
                />
                <FormHelperText color="var(--cc-text-3)" fontSize="xs">
                  Leer = unbegrenzt gültig.
                </FormHelperText>
              </FormControl>
              <FormControl flex={1}>
                <FormLabel {...adminFormLabelProps}>Max. Einlösungen</FormLabel>
                <Input
                  type="number"
                  min={1}
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="unbegrenzt"
                  {...adminInputProps}
                  className="cc-num"
                />
              </FormControl>
            </HStack>

            {serverError && (
              <Alert status="error" {...adminAlertProps("error")}>
                <AlertIcon color={adminAlertIconColor("error")} />
                <Text fontSize="sm">{serverError}</Text>
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button variant="ghost" onClick={onClose} color="var(--cc-text-2)">
            Abbrechen
          </Button>
          <Button variant="gold" onClick={handleSubmit} isLoading={saving} loadingText="Erstellen…">
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
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps}>
        <ModalHeader pt={6} pb={2} {...adminModalHeaderProps}>
          Gutschein löschen?
        </ModalHeader>
        <ModalBody pb={2}>
          <Text fontSize="sm" color="var(--cc-text-2)" lineHeight="1.65">
            Der Code{" "}
            <Box as="span" className="cc-num" fontWeight={600} letterSpacing="0.04em" color="var(--cc-gold-light)">
              {coupon?.code}
            </Box>{" "}
            wird auf Stripe deaktiviert (kein Hard-Delete möglich) und aus dieser Liste entfernt.
          </Text>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button variant="ghost" onClick={onClose} color="var(--cc-text-2)">
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
        <Text fontSize="sm" color="var(--cc-text-2)" className="cc-num">
          {coupons.length} Gutschein{coupons.length === 1 ? "" : "e"}
        </Text>
        <Button variant="gold" leftIcon={<Plus size={16} />} onClick={createModal.onOpen} size="sm">
          Neuen Gutschein erstellen
        </Button>
      </HStack>

      {error && (
        <Alert status="error" {...adminAlertProps("error")} mt={4}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      <Box mt={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              Lade Gutscheine…
            </Text>
          </Box>
        ) : coupons.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm" mb={2}>
              Noch keine Gutscheine erstellt.
            </Text>
            <Text color="var(--cc-text-3)" fontSize="xs">
              Erstelle einen Rabattcode. Er ist danach direkt im Stripe-Checkout einlösbar.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Code", "Rabatt", "Gültig bis", "Einlösungen", "Status", "Erstellt", ""].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {coupons.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Stack spacing={0}>
                        <Text
                          fontSize="xs"
                          className="cc-num"
                          fontWeight={600}
                          letterSpacing="0.04em"
                          color="var(--cc-gold-light)"
                          bg="var(--cc-gold-wash)"
                          px={2}
                          py={0.5}
                          borderRadius="6px"
                          border="1px solid rgba(212, 176, 128, 0.22)"
                          display="inline-block"
                          w="fit-content"
                        >
                          {c.code}
                        </Text>
                        {c.description && (
                          <Text fontSize="xs" color="var(--cc-text-3)" mt={1}>
                            {c.description}
                          </Text>
                        )}
                      </Stack>
                    </Td>
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text)">
                        {formatDiscount(c)}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text-2)">
                        {formatDate(c.valid_until)}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text)">
                        {c.times_redeemed ?? "—"}
                        {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Switch
                          isChecked={c.active}
                          isDisabled={togglingId === c.id}
                          onChange={() => toggleActive(c)}
                          sx={adminSwitchSx}
                          size="sm"
                        />
                        <StatusPill tone={c.active ? "success" : "neutral"}>
                          {c.active ? "Aktiv" : "Inaktiv"}
                        </StatusPill>
                      </HStack>
                    </Td>
                    <Td>
                      <Text fontSize="xs" className="cc-num" color="var(--cc-text-3)">
                        {formatDate(c.created_at)}
                      </Text>
                    </Td>
                    <Td>
                      <IconButton
                        aria-label="Löschen"
                        icon={<Trash2 size={14} />}
                        size="xs"
                        variant="ghost"
                        color="var(--cc-text-3)"
                        _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.08)" }}
                        borderRadius="6px"
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

      <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
        Einlösungen werden live von Stripe gezählt (Source of Truth), nicht lokal gespeichert.
      </Text>

      <CreateCouponModal isOpen={createModal.isOpen} onClose={createModal.onClose} onCreated={handleCreated} />
      <DeleteConfirmModal coupon={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
    </>
  );
}
