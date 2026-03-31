"use client";

import {
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Switch,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Eye, EyeOff, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  isAdmin: boolean;
  isPaid: boolean;
  codexAccepted: boolean;
  discordUsername: string | null;
  createdAt: string;
};

const fieldStyles = {
  bg: "rgba(255,255,255,0.06)",
  borderColor: "whiteAlpha.300",
  color: "gray.100",
  _placeholder: { color: "gray.500" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
} as const;

export function AdminMembersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Formular-State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formStatus, setFormStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const json = (await res.json()) as { ok?: boolean; users?: UserRow[] };
    if (json.ok && json.users) setUsers(json.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async () => {
    if (!email.trim() || !password.trim()) return;
    setCreating(true);
    setFormStatus(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, isAdmin, isPaid }),
    });
    const json = (await res.json()) as { ok?: boolean; user?: UserRow; error?: string };
    setCreating(false);
    if (!json.ok) {
      setFormStatus({ msg: json.error ?? "Fehler beim Anlegen.", ok: false });
      return;
    }
    setFormStatus({ msg: `Nutzer ${email} erfolgreich angelegt.`, ok: true });
    setEmail("");
    setPassword("");
    setFullName("");
    setIsAdmin(false);
    setIsPaid(false);
    void load();
  };

  const togglePaid = async (user: UserRow) => {
    const next = !user.isPaid;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isPaid: next } : u)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, updates: { is_paid: next } }),
    });
  };

  const toggleAdmin = async (user: UserRow) => {
    const next = !user.isAdmin;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isAdmin: next } : u)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, updates: { is_admin: next } }),
    });
  };

  const confirmDelete = (user: UserRow) => {
    setDeleteTarget(user);
    onDeleteOpen();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { ok?: boolean };
    setDeleting(false);
    if (json.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      onDeleteClose();
      setDeleteTarget(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      !search.trim() ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Stack spacing={8}>
      {/* ── Nutzer anlegen ── */}
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
            <UserPlus size={20} color="var(--chakra-colors-blue-300)" />
            <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
              Neuen Nutzer anlegen
            </Text>
          </HStack>
          <Text fontSize="sm" className="inter" color="gray.400">
            Nutzer wird direkt mit bestätigter E-Mail angelegt — kein Bestätigungs-Link nötig.
          </Text>
        </Box>

        <Divider borderColor="whiteAlpha.150" />

        <Stack spacing={4} direction={{ base: "column", md: "row" }} flexWrap="wrap">
          <FormControl flex={1} minW="240px">
            <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
              E-Mail-Adresse *
            </FormLabel>
            <Input
              type="email"
              placeholder="nutzer@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...fieldStyles}
            />
          </FormControl>

          <FormControl flex={1} minW="240px">
            <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
              Passwort * (min. 8 Zeichen)
            </FormLabel>
            <InputGroup>
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Sicheres Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...fieldStyles}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                  size="sm"
                  variant="ghost"
                  color="gray.400"
                  icon={showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  onClick={() => setShowPw((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl flex={1} minW="200px">
            <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
              Vollständiger Name (optional)
            </FormLabel>
            <Input
              placeholder="Max Mustermann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              {...fieldStyles}
            />
          </FormControl>
        </Stack>

        <HStack spacing={8} flexWrap="wrap">
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel mb={0} className="inter" fontSize="sm" color="gray.200" mr={3}>
              Paid-Mitglied
            </FormLabel>
            <Switch size="lg" colorScheme="blue" isChecked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel mb={0} className="inter" fontSize="sm" color="gray.200" mr={3}>
              Admin-Rechte
            </FormLabel>
            <Switch size="lg" colorScheme="orange" isChecked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          </FormControl>
        </HStack>

        <HStack>
          <Button
            size="md"
            colorScheme="blue"
            leftIcon={<UserPlus size={18} />}
            onClick={() => void createUser()}
            isLoading={creating}
            isDisabled={!email.trim() || !password.trim() || password.length < 8}
          >
            Nutzer anlegen
          </Button>
        </HStack>

        {formStatus && (
          <Text fontSize="sm" className="inter" color={formStatus.ok ? "green.300" : "red.300"}>
            {formStatus.msg}
          </Text>
        )}
      </Stack>

      {/* ── Mitglieder-Tabelle ── */}
      <Stack spacing={4}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Box>
            <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
              Alle Mitglieder
            </Text>
            <Text fontSize="sm" className="inter" color="gray.400" mt={0.5}>
              {loading ? "Wird geladen…" : `${users.length} Nutzer gesamt`}
            </Text>
          </Box>
          <Input
            placeholder="Suche nach E-Mail, Name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxW="300px"
            size="sm"
            {...fieldStyles}
          />
        </HStack>

        <Box
          borderRadius="16px"
          borderWidth="1px"
          borderColor="whiteAlpha.150"
          overflow="hidden"
          bg="rgba(0,0,0,0.2)"
        >
          {/* Tabellen-Header */}
          <HStack
            px={4}
            py={3}
            borderBottom="1px solid rgba(255,255,255,0.07)"
            bg="rgba(255,255,255,0.03)"
            spacing={4}
            display={{ base: "none", lg: "flex" }}
          >
            {["E-Mail / Name", "Paid", "Admin", "Codex", "Discord", "Registriert", ""].map((h) => (
              <Text
                key={h}
                flex={h === "E-Mail / Name" ? 1 : undefined}
                w={h === "" ? "40px" : h === "Registriert" ? "110px" : "70px"}
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
              Mitglieder werden geladen…
            </Text>
          ) : filtered.length === 0 ? (
            <Text px={4} py={6} fontSize="sm" color="gray.400" className="inter">
              Keine Mitglieder gefunden.
            </Text>
          ) : (
            filtered.map((user) => (
              <HStack
                key={user.id}
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
                    {user.email}
                  </Text>
                  {user.fullName || user.username ? (
                    <Text fontSize="xs" className="inter" color="gray.500" noOfLines={1}>
                      {user.fullName ?? user.username}
                    </Text>
                  ) : null}
                </Stack>

                {/* Paid */}
                <Box w={{ base: "auto", lg: "70px" }}>
                  <Switch
                    size="md"
                    colorScheme="blue"
                    isChecked={user.isPaid}
                    onChange={() => void togglePaid(user)}
                  />
                </Box>

                {/* Admin */}
                <Box w={{ base: "auto", lg: "70px" }}>
                  <Switch
                    size="md"
                    colorScheme="orange"
                    isChecked={user.isAdmin}
                    onChange={() => void toggleAdmin(user)}
                  />
                </Box>

                {/* Codex */}
                <Box w={{ base: "auto", lg: "70px" }}>
                  <Badge
                    colorScheme={user.codexAccepted ? "green" : "gray"}
                    variant="subtle"
                    fontSize="xs"
                    className="inter"
                  >
                    {user.codexAccepted ? "Ja" : "Nein"}
                  </Badge>
                </Box>

                {/* Discord */}
                <Text
                  w={{ base: "auto", lg: "70px" }}
                  fontSize="xs"
                  className="inter"
                  color="gray.400"
                  noOfLines={1}
                >
                  {user.discordUsername ?? "—"}
                </Text>

                {/* Registriert */}
                <Text
                  w={{ base: "auto", lg: "110px" }}
                  fontSize="xs"
                  className="jetbrains-mono"
                  color="gray.500"
                  flexShrink={0}
                >
                  {new Date(user.createdAt).toLocaleDateString("de-DE")}
                </Text>

                {/* Löschen */}
                <Box w={{ base: "auto", lg: "40px" }} textAlign="right">
                  <IconButton
                    aria-label="Nutzer löschen"
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    icon={<Trash2 size={16} />}
                    onClick={() => confirmDelete(user)}
                  />
                </Box>
              </HStack>
            ))
          )}
        </Box>
      </Stack>

      {/* ── Löschen-Bestätigung ── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent
          bg="rgba(10,11,14,0.97)"
          border="1px solid rgba(255,255,255,0.09)"
          borderRadius="24px"
          mx={4}
        >
          <ModalHeader className="radley-regular" fontWeight={400} color="red.300">
            Nutzer löschen
          </ModalHeader>
          <ModalBody>
            <Text className="inter" fontSize="sm" color="gray.300">
              Soll der Nutzer{" "}
              <Text as="span" fontWeight={600} color="gray.100">
                {deleteTarget?.email}
              </Text>{" "}
              wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onDeleteClose}>
              Abbrechen
            </Button>
            <Button
              colorScheme="red"
              variant="solid"
              onClick={() => void doDelete()}
              isLoading={deleting}
            >
              Endgültig löschen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
