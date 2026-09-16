"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
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
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
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
  adminRowProps,
  type AdminTone,
} from "@/components/admin/adminUi";

type AdminRole = "owner" | "admin" | "support" | "editor";

type AdminRow = {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  adminRole: AdminRole | null;
  createdAt: string;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  support: "Support",
  editor: "Editor",
};

/** Owner/Admin in Champagner, übrige Rollen neutral. */
const ROLE_TONE: Record<AdminRole, AdminTone> = {
  owner: "attention",
  admin: "attention",
  support: "neutral",
  editor: "neutral",
};

const headerCellProps = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cc-text-2)",
} as const;

type LoadStatus = "loading" | "ready" | "forbidden";

export function AdminTeamManager() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const loading = status === "loading";
  const forbidden = status === "forbidden";

  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AdminRole>("editor");
  const [adding, setAdding] = useState(false);
  const [formStatus, setFormStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);

  const { isOpen: isRemoveOpen, onOpen: onRemoveOpen, onClose: onRemoveClose } = useDisclosure();
  const [removeTarget, setRemoveTarget] = useState<AdminRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/admin/team");
    if (res.status === 403) {
      setStatus("forbidden");
    } else {
      const json = (await res.json()) as { ok?: boolean; admins?: AdminRow[] };
      if (json.ok && json.admins) setAdmins(json.admins);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addAdmin = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    setFormStatus(null);
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail.trim(), adminRole: addRole }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setAdding(false);
    if (!json.ok) {
      setFormStatus({ msg: json.error ?? "Fehler beim Hinzufügen.", ok: false });
      return;
    }
    setFormStatus({ msg: `${addEmail.trim()} wurde als ${ROLE_LABELS[addRole]} hinzugefügt.`, ok: true });
    setAddEmail("");
    setAddRole("editor");
    void load();
  };

  const changeRole = async (admin: AdminRow, role: AdminRole) => {
    setSavingId(admin.id);
    setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, adminRole: role } : a)));
    await fetch(`/api/admin/team/${admin.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminRole: role }),
    });
    setSavingId(null);
  };

  const confirmRemove = (admin: AdminRow) => {
    setRemoveTarget(admin);
    onRemoveOpen();
  };

  const doRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const res = await fetch(`/api/admin/team/${removeTarget.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: true }),
    });
    const json = (await res.json()) as { ok?: boolean };
    setRemoving(false);
    if (json.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== removeTarget.id));
      onRemoveClose();
      setRemoveTarget(null);
    }
  };

  if (forbidden) {
    return (
      <Alert status="warning" {...adminAlertProps("warning")}>
        <AlertIcon color={adminAlertIconColor("warning")} />
        <Text fontSize="sm" color="var(--cc-text-soft)">
          Nur Owner haben Zugriff auf die Team-Verwaltung. Falls noch niemand die Rolle
          &bdquo;Owner&ldquo; hat, sollte jeder bestehende Admin automatisch Zugriff bekommen — bitte
          Datenbank-Status von <b>profiles.admin_role</b> prüfen.
        </Text>
      </Alert>
    );
  }

  return (
    <Stack spacing={6}>
      {/* ── Admin hinzufügen ── */}
      <Stack spacing={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Box>
          <HStack spacing={2.5} mb={1.5}>
            <Box color="var(--cc-text-2)">
              <UserPlus size={16} strokeWidth={1.75} aria-hidden />
            </Box>
            <AdminCardTitle>Admin hinzufügen</AdminCardTitle>
          </HStack>
          <Text fontSize="sm" color="var(--cc-text-2)">
            Der Nutzer muss bereits existieren (z.B. über die Mitglieder-Seite angelegt worden sein).
          </Text>
        </Box>

        <Divider borderColor="var(--cc-line)" />

        <Stack spacing={4} direction={{ base: "column", md: "row" }} flexWrap="wrap">
          <FormControl flex={1} minW="240px">
            <FormLabel {...adminFormLabelProps}>E-Mail-Adresse</FormLabel>
            <Input
              type="email"
              placeholder="admin@beispiel.de"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              {...adminInputProps}
            />
          </FormControl>

          <FormControl flex={1} minW="200px">
            <FormLabel {...adminFormLabelProps}>Rolle</FormLabel>
            <Select value={addRole} onChange={(e) => setAddRole(e.target.value as AdminRole)} {...adminInputProps}>
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                <option key={r} value={r} style={adminOptionStyle}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <HStack>
          <Button
            size="md"
            variant="gold"
            leftIcon={<UserPlus size={18} />}
            onClick={() => void addAdmin()}
            isLoading={adding}
            isDisabled={!addEmail.trim()}
          >
            Admin hinzufügen
          </Button>
        </HStack>

        {formStatus && (
          <Text fontSize="sm" color={formStatus.ok ? "var(--cc-success)" : "var(--cc-danger)"}>
            {formStatus.msg}
          </Text>
        )}
      </Stack>

      {/* ── Team-Tabelle ── */}
      <Stack spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Box>
          <AdminCardTitle>Team</AdminCardTitle>
          <Text fontSize="sm" color="var(--cc-text-2)" mt={1} className="cc-num">
            {loading ? "Wird geladen…" : `${admins.length} Admin${admins.length === 1 ? "" : "s"}`}
          </Text>
        </Box>

        <Box mx={{ base: -2, md: -3 }}>
          <HStack
            px={3}
            py={2.5}
            borderBottom="1px solid var(--cc-line-strong)"
            spacing={4}
            display={{ base: "none", lg: "flex" }}
          >
            {["E-Mail / Name", "Rolle", "Seit", ""].map((h) => (
              <Text
                key={h}
                flex={h === "E-Mail / Name" ? 1 : undefined}
                w={h === "" ? "48px" : h === "Seit" ? "110px" : "160px"}
                {...headerCellProps}
                textAlign={h === "" ? "right" : "left"}
              >
                {h}
              </Text>
            ))}
          </HStack>

          {loading ? (
            <Text px={3} py={6} fontSize="sm" color="var(--cc-text-2)">
              Team wird geladen…
            </Text>
          ) : admins.length === 0 ? (
            <Text px={3} py={6} fontSize="sm" color="var(--cc-text-2)">
              Keine Admins gefunden.
            </Text>
          ) : (
            admins.map((admin) => {
              const role = admin.adminRole ?? "admin";
              return (
                <HStack
                  key={admin.id}
                  px={3}
                  py={3}
                  spacing={4}
                  align="center"
                  flexDir={{ base: "column", lg: "row" }}
                  {...adminRowProps}
                >
                  <Stack flex={1} spacing={0.5} align="flex-start" minW={0}>
                    <Text fontSize="sm" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                      {admin.email}
                    </Text>
                    {admin.fullName || admin.username ? (
                      <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                        {admin.fullName ?? admin.username}
                      </Text>
                    ) : null}
                  </Stack>

                  <Box w={{ base: "auto", lg: "160px" }}>
                    <HStack spacing={2}>
                      <StatusPill tone={ROLE_TONE[role]} flexShrink={0}>
                        <HStack spacing={1} as="span">
                          <ShieldCheck size={11} aria-hidden />
                          <Text as="span">{ROLE_LABELS[role]}</Text>
                        </HStack>
                      </StatusPill>
                      <Select
                        size="xs"
                        value={role}
                        isDisabled={savingId === admin.id}
                        onChange={(e) => void changeRole(admin, e.target.value as AdminRole)}
                        {...adminInputProps}
                        borderRadius="6px"
                        w="110px"
                      >
                        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                          <option key={r} value={r} style={adminOptionStyle}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </HStack>
                  </Box>

                  <Text
                    w={{ base: "auto", lg: "110px" }}
                    fontSize="xs"
                    className="cc-num"
                    color="var(--cc-text-2)"
                    flexShrink={0}
                  >
                    {new Date(admin.createdAt).toLocaleDateString("de-DE")}
                  </Text>

                  <Box w={{ base: "auto", lg: "48px" }} textAlign="right">
                    <IconButton
                      aria-label="Admin entfernen"
                      size="sm"
                      variant="ghost"
                      color="var(--cc-text-3)"
                      _hover={{ bg: "rgba(248, 113, 113, 0.08)", color: "var(--cc-danger)" }}
                      icon={<Trash2 size={16} />}
                      onClick={() => confirmRemove(admin)}
                    />
                  </Box>
                </HStack>
              );
            })
          )}
        </Box>
      </Stack>

      {/* ── Entfernen-Bestätigung ── */}
      <Modal isOpen={isRemoveOpen} onClose={onRemoveClose} isCentered>
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent {...adminModalProps} mx={4}>
          <ModalHeader {...adminModalHeaderProps}>Admin entfernen</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="var(--cc-text-2)">
              Soll{" "}
              <Text as="span" fontWeight={600} color="var(--cc-text)">
                {removeTarget?.email}
              </Text>{" "}
              wirklich als Admin entfernt werden? Die Person verliert sofort alle Admin-Rechte.
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="var(--cc-text-2)" onClick={onRemoveClose}>
              Abbrechen
            </Button>
            <Button {...adminDangerButtonProps} onClick={() => void doRemove()} isLoading={removing}>
              Endgültig entfernen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
