"use client";

import {
  Alert,
  AlertIcon,
  Badge,
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

const ROLE_BADGE: Record<AdminRole, { bg: string; color: string; border: string }> = {
  owner: { bg: "rgba(212,175,55,0.18)", color: "#FFD66B", border: "rgba(212,175,55,0.40)" },
  admin: { bg: "rgba(59,130,246,0.14)", color: "#93C5FD", border: "rgba(59,130,246,0.35)" },
  support: { bg: "rgba(132,82,255,0.14)", color: "#C4B5FD", border: "rgba(132,82,255,0.35)" },
  editor: { bg: "rgba(255,255,255,0.06)", color: "#9A9AA4", border: "rgba(255,255,255,0.12)" },
};

const fieldStyles = {
  bg: "rgba(255,255,255,0.06)",
  borderColor: "whiteAlpha.300",
  color: "gray.100",
  _placeholder: { color: "gray.500" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
} as const;

const goldButtonSx = {
  bg: "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)",
  color: "#0a0a0a",
  _hover: { filter: "brightness(1.06)" },
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
      <Alert
        status="warning"
        bg="rgba(212,175,55,0.08)"
        border="1px solid rgba(212,175,55,0.25)"
        borderRadius="14px"
      >
        <AlertIcon color="#E8C547" />
        <Text fontSize="sm" className="inter" color="gray.200">
          Nur Owner haben Zugriff auf die Team-Verwaltung. Falls noch niemand die Rolle
          &bdquo;Owner&ldquo; hat, sollte jeder bestehende Admin automatisch Zugriff bekommen — bitte
          Datenbank-Status von <b>profiles.admin_role</b> prüfen.
        </Text>
      </Alert>
    );
  }

  return (
    <Stack spacing={8}>
      {/* ── Admin hinzufügen ── */}
      <Stack
        spacing={5}
        p={{ base: 4, md: 6 }}
        borderRadius="20px"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="rgba(255,255,255,0.04)"
      >
        <Box>
          <HStack spacing={3} mb={1}>
            <UserPlus size={20} color="#E8C547" />
            <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
              Admin hinzufügen
            </Text>
          </HStack>
          <Text fontSize="sm" className="inter" color="gray.400">
            Der Nutzer muss bereits existieren (z.B. über die Mitglieder-Seite angelegt worden sein).
          </Text>
        </Box>

        <Divider borderColor="whiteAlpha.150" />

        <Stack spacing={4} direction={{ base: "column", md: "row" }} flexWrap="wrap">
          <FormControl flex={1} minW="240px">
            <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
              E-Mail-Adresse
            </FormLabel>
            <Input
              type="email"
              placeholder="admin@beispiel.de"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              {...fieldStyles}
            />
          </FormControl>

          <FormControl flex={1} minW="200px">
            <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
              Rolle
            </FormLabel>
            <Select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as AdminRole)}
              {...fieldStyles}
            >
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                <option key={r} value={r} style={{ background: "#0c0d10" }}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <HStack>
          <Button
            size="md"
            leftIcon={<UserPlus size={18} />}
            onClick={() => void addAdmin()}
            isLoading={adding}
            isDisabled={!addEmail.trim()}
            className="inter-semibold"
            sx={goldButtonSx}
          >
            Admin hinzufügen
          </Button>
        </HStack>

        {formStatus && (
          <Text fontSize="sm" className="inter" color={formStatus.ok ? "green.300" : "red.300"}>
            {formStatus.msg}
          </Text>
        )}
      </Stack>

      {/* ── Team-Tabelle ── */}
      <Stack spacing={4}>
        <Box>
          <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
            Team
          </Text>
          <Text fontSize="sm" className="inter" color="gray.400" mt={0.5}>
            {loading ? "Wird geladen…" : `${admins.length} Admin${admins.length === 1 ? "" : "s"}`}
          </Text>
        </Box>

        <Box
          borderRadius="16px"
          borderWidth="1px"
          borderColor="whiteAlpha.150"
          overflow="hidden"
          bg="rgba(0,0,0,0.2)"
        >
          <HStack
            px={4}
            py={3}
            borderBottom="1px solid rgba(255,255,255,0.07)"
            bg="rgba(255,255,255,0.03)"
            spacing={4}
            display={{ base: "none", lg: "flex" }}
          >
            {["E-Mail / Name", "Rolle", "Seit", ""].map((h) => (
              <Text
                key={h}
                flex={h === "E-Mail / Name" ? 1 : undefined}
                w={h === "" ? "48px" : h === "Seit" ? "110px" : "160px"}
                fontSize="11px"
                className="inter"
                fontWeight={500}
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="gray.600"
                textAlign={h === "" ? "right" : "left"}
              >
                {h}
              </Text>
            ))}
          </HStack>

          {loading ? (
            <Text px={4} py={6} fontSize="sm" color="gray.400" className="inter">
              Team wird geladen…
            </Text>
          ) : admins.length === 0 ? (
            <Text px={4} py={6} fontSize="sm" color="gray.400" className="inter">
              Keine Admins gefunden.
            </Text>
          ) : (
            admins.map((admin) => {
              const role = admin.adminRole ?? "admin";
              const badge = ROLE_BADGE[role];
              return (
                <HStack
                  key={admin.id}
                  px={4}
                  py={3.5}
                  borderBottom="1px solid rgba(255,255,255,0.05)"
                  spacing={4}
                  align="center"
                  transition="background 150ms"
                  _hover={{ bg: "rgba(255,255,255,0.03)" }}
                  flexDir={{ base: "column", lg: "row" }}
                >
                  <Stack flex={1} spacing={0.5} align="flex-start" minW={0}>
                    <Text className="inter" fontSize="sm" fontWeight={500} color="gray.100" noOfLines={1}>
                      {admin.email}
                    </Text>
                    {admin.fullName || admin.username ? (
                      <Text fontSize="xs" className="inter" color="gray.500" noOfLines={1}>
                        {admin.fullName ?? admin.username}
                      </Text>
                    ) : null}
                  </Stack>

                  <Box w={{ base: "auto", lg: "160px" }}>
                    <HStack spacing={2}>
                      <Badge
                        bg={badge.bg}
                        color={badge.color}
                        border={`1px solid ${badge.border}`}
                        borderRadius="6px"
                        fontSize="10px"
                        px={2}
                        py={0.5}
                        className="inter"
                        textTransform="none"
                        flexShrink={0}
                      >
                        <HStack spacing={1}>
                          <ShieldCheck size={11} />
                          <Text as="span">{ROLE_LABELS[role]}</Text>
                        </HStack>
                      </Badge>
                      <Select
                        size="xs"
                        value={role}
                        isDisabled={savingId === admin.id}
                        onChange={(e) => void changeRole(admin, e.target.value as AdminRole)}
                        bg="rgba(255,255,255,0.04)"
                        borderColor="whiteAlpha.200"
                        color="gray.200"
                        className="inter"
                        w="110px"
                      >
                        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                          <option key={r} value={r} style={{ background: "#0c0d10" }}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </HStack>
                  </Box>

                  <Text
                    w={{ base: "auto", lg: "110px" }}
                    fontSize="xs"
                    className="jetbrains-mono"
                    color="gray.500"
                    flexShrink={0}
                  >
                    {new Date(admin.createdAt).toLocaleDateString("de-DE")}
                  </Text>

                  <Box w={{ base: "auto", lg: "48px" }} textAlign="right">
                    <IconButton
                      aria-label="Admin entfernen"
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
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
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent bg="rgba(10,11,14,0.97)" border="1px solid rgba(255,255,255,0.09)" borderRadius="24px" mx={4}>
          <ModalHeader className="radley-regular" fontWeight={400} color="red.300">
            Admin entfernen
          </ModalHeader>
          <ModalBody>
            <Text className="inter" fontSize="sm" color="gray.300">
              Soll{" "}
              <Text as="span" fontWeight={600} color="gray.100">
                {removeTarget?.email}
              </Text>{" "}
              wirklich als Admin entfernt werden? Die Person verliert sofort alle Admin-Rechte.
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onRemoveClose}>
              Abbrechen
            </Button>
            <Button colorScheme="red" variant="solid" onClick={() => void doRemove()} isLoading={removing}>
              Endgültig entfernen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
