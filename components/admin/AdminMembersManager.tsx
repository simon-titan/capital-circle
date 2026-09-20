"use client";

import {
  Box,
  Button,
  Checkbox,
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
import { Download, Eye, EyeOff, FileText, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  ADMIN_TONES,
  AdminCardTitle,
  StatusPill,
  adminCardPadding,
  adminDangerButtonProps,
  adminFormLabelProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
  adminRowProps,
  adminSwitchSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import { AdminLifetimeOfferPanel } from "./AdminLifetimeOfferPanel";
import { UserTierOverrideModal, type Tier } from "./UserTierOverrideModal";

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
  membershipTier: Tier;
  accessUntil: string | null;
  applicationStatus: "pending" | "approved" | "rejected" | null;
  /** Freischalt-Gruppe fuer das Lifetime-Angebot (071); null = keine. */
  lifetimeOfferGroup: string | null;
};

/** Tier-Pill: Free neutral, zahlende Tiers grün, High-Ticket in Champagner. */
const TIER_BADGE: Record<Tier, { tone: AdminTone; label: string }> = {
  free: { tone: "neutral", label: "Free" },
  monthly: { tone: "success", label: "Monatlich" },
  quarterly: { tone: "success", label: "Quartal" },
  yearly: { tone: "success", label: "Jährlich" },
  lifetime: { tone: "success", label: "Lifetime" },
  ht_1on1: { tone: "attention", label: "1on1" },
};

const iconButtonNeutral = {
  variant: "ghost",
  color: "var(--cc-text-2)",
  _hover: { bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" },
} as const;

const headerCellProps = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cc-text-2)",
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

  const { isOpen: isTierOpen, onOpen: onTierOpen, onClose: onTierClose } = useDisclosure();
  const [tierTarget, setTierTarget] = useState<UserRow | null>(null);

  const [gdprLoadingId, setGdprLoadingId] = useState<string | null>(null);

  // Sammelaktion Lifetime-Freischaltung. Die Auswahl haelt IDs, nicht Zeilen —
  // die Liste wird nach jeder Aktion neu geladen und die Objekte waeren dann
  // veraltet.
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [gruppenName, setGruppenName] = useState("");
  const [gruppeLaeuft, setGruppeLaeuft] = useState(false);

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

  const openTier = (user: UserRow) => {
    setTierTarget(user);
    onTierOpen();
  };

  const exportCsv = () => {
    window.open("/api/admin/users/export", "_blank");
  };

  const auswahlUmschalten = (id: string) => {
    setAuswahl((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Gruppe fuer die Auswahl setzen oder entfernen.
   *
   * `gruppe === null` loescht die Freischaltung. Die Liste wird danach neu
   * geladen statt lokal fortgeschrieben: Der Server normiert den Namen
   * (getrimmt, auf 64 Zeichen gekuerzt), und eine optimistische Anzeige wuerde
   * sonst etwas anderes zeigen als das, was in der Datenbank steht.
   */
  const gruppeSetzen = async (gruppe: string | null) => {
    if (auswahl.size === 0) return;
    setGruppeLaeuft(true);
    const res = await fetch("/api/admin/users/lifetime-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [...auswahl], group: gruppe }),
    });
    const json = (await res.json()) as { ok?: boolean; updated?: number; error?: string };
    setGruppeLaeuft(false);
    if (!json.ok) {
      setFormStatus({ msg: json.error ?? "Freischaltung fehlgeschlagen.", ok: false });
      return;
    }
    setFormStatus({
      msg: gruppe
        ? `${json.updated} Mitglied(er) der Gruppe „${gruppe}“ zugeordnet.`
        : `Freischaltung fuer ${json.updated} Mitglied(er) entfernt.`,
      ok: true,
    });
    setAuswahl(new Set());
    void load();
  };

  const exportGdpr = async (user: UserRow) => {
    setGdprLoadingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/gdpr-export`, { method: "POST" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setFormStatus({ msg: json?.error ?? "DSGVO-Auskunft konnte nicht erzeugt werden.", ok: false });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsgvo-auskunft_${user.email}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGdprLoadingId(null);
    }
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

  const alleGefiltertGewaehlt = filtered.length > 0 && filtered.every((u) => auswahl.has(u.id));

  return (
    <Stack spacing={6}>
      {/* ── Lifetime-Freischaltung ── */}
      <AdminLifetimeOfferPanel />

      {/* ── Nutzer anlegen ── */}
      <Stack spacing={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Box>
          <HStack spacing={2.5} mb={1.5}>
            <Box color="var(--cc-text-2)">
              <UserPlus size={16} strokeWidth={1.75} aria-hidden />
            </Box>
            <AdminCardTitle>Neuen Nutzer anlegen</AdminCardTitle>
          </HStack>
          <Text fontSize="sm" color="var(--cc-text-2)">
            Nutzer wird direkt mit bestätigter E-Mail angelegt. Kein Bestätigungs-Link nötig.
          </Text>
        </Box>

        <Divider borderColor="var(--cc-line)" />

        <Stack spacing={4} direction={{ base: "column", md: "row" }} flexWrap="wrap">
          <FormControl flex={1} minW="240px">
            <FormLabel {...adminFormLabelProps}>E-Mail-Adresse *</FormLabel>
            <Input
              type="email"
              placeholder="nutzer@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...adminInputProps}
            />
          </FormControl>

          <FormControl flex={1} minW="240px">
            <FormLabel {...adminFormLabelProps}>Passwort * (min. 8 Zeichen)</FormLabel>
            <InputGroup>
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Sicheres Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...adminInputProps}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                  size="sm"
                  {...iconButtonNeutral}
                  icon={showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  onClick={() => setShowPw((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl flex={1} minW="200px">
            <FormLabel {...adminFormLabelProps}>Vollständiger Name (optional)</FormLabel>
            <Input
              placeholder="Max Mustermann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              {...adminInputProps}
            />
          </FormControl>
        </Stack>

        <HStack spacing={8} flexWrap="wrap">
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel mb={0} fontSize="sm" color="var(--cc-text-soft)" mr={3}>
              Paid-Mitglied
            </FormLabel>
            <Switch size="lg" sx={adminSwitchSx} isChecked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel mb={0} fontSize="sm" color="var(--cc-text-soft)" mr={3}>
              Admin-Rechte
            </FormLabel>
            <Switch size="lg" sx={adminSwitchSx} isChecked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          </FormControl>
        </HStack>

        <HStack>
          <Button
            size="md"
            variant="gold"
            leftIcon={<UserPlus size={18} />}
            onClick={() => void createUser()}
            isLoading={creating}
            isDisabled={!email.trim() || !password.trim() || password.length < 8}
          >
            Nutzer anlegen
          </Button>
        </HStack>

        {formStatus && (
          <Text fontSize="sm" color={formStatus.ok ? "var(--cc-success)" : "var(--cc-danger)"}>
            {formStatus.msg}
          </Text>
        )}
      </Stack>

      {/* ── Mitglieder-Tabelle ── */}
      <Stack spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Box>
            <AdminCardTitle>Alle Mitglieder</AdminCardTitle>
            <Text fontSize="sm" color="var(--cc-text-2)" mt={1} className="cc-num">
              {loading ? "Wird geladen…" : `${users.length} Nutzer gesamt`}
            </Text>
          </Box>
          <HStack spacing={3}>
            <Input
              placeholder="Suche nach E-Mail, Name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxW="300px"
              size="sm"
              {...adminInputProps}
            />
            <Button size="sm" variant="line" leftIcon={<Download size={14} />} onClick={exportCsv} flexShrink={0}>
              CSV exportieren
            </Button>
          </HStack>
        </HStack>

        {auswahl.size > 0 ? (
          <HStack
            px={3}
            py={2.5}
            borderRadius="8px"
            border="1px solid var(--cc-gold-line)"
            bg="var(--cc-gold-wash)"
            flexWrap="wrap"
            gap={3}
          >
            <Text fontSize="sm" color="var(--cc-text)" className="cc-num">
              {auswahl.size} ausgewählt
            </Text>
            <Input
              placeholder="Gruppenname, z. B. whop-import-2026"
              value={gruppenName}
              onChange={(e) => setGruppenName(e.target.value)}
              size="sm"
              maxW="280px"
              {...adminInputProps}
            />
            <Button
              size="sm"
              variant="gold"
              isLoading={gruppeLaeuft}
              isDisabled={!gruppenName.trim()}
              onClick={() => void gruppeSetzen(gruppenName.trim())}
            >
              Lifetime freischalten
            </Button>
            <Button size="sm" variant="line" isLoading={gruppeLaeuft} onClick={() => void gruppeSetzen(null)}>
              Freischaltung entfernen
            </Button>
            <Button size="sm" variant="ghost" color="var(--cc-text-2)" onClick={() => setAuswahl(new Set())}>
              Auswahl aufheben
            </Button>
          </HStack>
        ) : null}

        <Box mx={{ base: -2, md: -3 }}>
          {/* Tabellen-Header */}
          <HStack
            px={3}
            py={2.5}
            borderBottom="1px solid var(--cc-line-strong)"
            spacing={4}
            display={{ base: "none", lg: "flex" }}
          >
            <Checkbox
              colorScheme="brand"
              borderColor="var(--cc-line-strong)"
              isChecked={alleGefiltertGewaehlt}
              isIndeterminate={!alleGefiltertGewaehlt && filtered.some((u) => auswahl.has(u.id))}
              onChange={(e) =>
                setAuswahl(e.target.checked ? new Set(filtered.map((u) => u.id)) : new Set())
              }
              aria-label="Alle sichtbaren Mitglieder auswählen"
              flexShrink={0}
            />
            {["E-Mail / Name", "Tier", "Paid", "Admin", "Codex", "Discord", "Registriert", ""].map(
              (h) => (
                <Text
                  key={h}
                  flex={h === "E-Mail / Name" ? 1 : undefined}
                  w={
                    h === ""
                      ? "76px"
                      : h === "Registriert"
                        ? "110px"
                        : h === "Tier"
                          ? "100px"
                          : "70px"
                  }
                  {...headerCellProps}
                  textAlign={h === "" ? "right" : "left"}
                >
                  {h}
                </Text>
              ),
            )}
          </HStack>

          {loading ? (
            <Text px={3} py={6} fontSize="sm" color="var(--cc-text-2)">
              Mitglieder werden geladen…
            </Text>
          ) : filtered.length === 0 ? (
            <Text px={3} py={6} fontSize="sm" color="var(--cc-text-2)">
              Keine Mitglieder gefunden.
            </Text>
          ) : (
            filtered.map((user) => {
              const tier = TIER_BADGE[user.membershipTier];
              const tone = ADMIN_TONES[tier.tone];
              return (
                <HStack
                  key={user.id}
                  px={3}
                  py={3}
                  spacing={4}
                  align="center"
                  flexDir={{ base: "column", lg: "row" }}
                  {...adminRowProps}
                >
                  <Checkbox
                    colorScheme="brand"
                    borderColor="var(--cc-line-strong)"
                    isChecked={auswahl.has(user.id)}
                    onChange={() => auswahlUmschalten(user.id)}
                    aria-label={`${user.email} auswählen`}
                    flexShrink={0}
                    alignSelf={{ base: "flex-start", lg: "center" }}
                  />
                  <Stack flex={1} spacing={0.5} align="flex-start" minW={0}>
                    <Text fontSize="sm" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                      {user.email}
                    </Text>
                    {user.fullName || user.username ? (
                      <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                        {user.fullName ?? user.username}
                      </Text>
                    ) : null}
                    {user.lifetimeOfferGroup ? (
                      <StatusPill tone="attention">Lifetime: {user.lifetimeOfferGroup}</StatusPill>
                    ) : null}
                  </Stack>

                  {/* Tier */}
                  <Box w={{ base: "auto", lg: "100px" }}>
                    <Button
                      size="xs"
                      variant="line"
                      onClick={() => openTier(user)}
                      leftIcon={<ShieldCheck size={12} />}
                      bg={tone.bg}
                      color={tone.color}
                      borderColor={tone.border}
                      borderRadius="full"
                      fontWeight={500}
                      _hover={{ bg: tone.bg, borderColor: "var(--cc-gold-line)", filter: "brightness(1.1)" }}
                    >
                      {tier.label}
                    </Button>
                  </Box>

                  {/* Paid */}
                  <Box w={{ base: "auto", lg: "70px" }}>
                    <Switch
                      size="md"
                      sx={adminSwitchSx}
                      isChecked={user.isPaid}
                      onChange={() => void togglePaid(user)}
                    />
                  </Box>

                  {/* Admin */}
                  <Box w={{ base: "auto", lg: "70px" }}>
                    <Switch
                      size="md"
                      sx={adminSwitchSx}
                      isChecked={user.isAdmin}
                      onChange={() => void toggleAdmin(user)}
                    />
                  </Box>

                  {/* Codex */}
                  <Box w={{ base: "auto", lg: "70px" }}>
                    <StatusPill tone={user.codexAccepted ? "success" : "neutral"}>
                      {user.codexAccepted ? "Ja" : "Nein"}
                    </StatusPill>
                  </Box>

                  {/* Discord */}
                  <Text w={{ base: "auto", lg: "70px" }} fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                    {user.discordUsername ?? "—"}
                  </Text>

                  {/* Registriert */}
                  <Text
                    w={{ base: "auto", lg: "110px" }}
                    fontSize="xs"
                    className="cc-num"
                    color="var(--cc-text-2)"
                    flexShrink={0}
                  >
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </Text>

                  {/* Aktionen */}
                  <Box w={{ base: "auto", lg: "76px" }} textAlign="right">
                    <HStack spacing={1} justify="flex-end">
                      <IconButton
                        aria-label="DSGVO-Auskunft erzeugen"
                        title="DSGVO-Auskunft erzeugen"
                        size="sm"
                        {...iconButtonNeutral}
                        icon={<FileText size={16} />}
                        isLoading={gdprLoadingId === user.id}
                        onClick={() => void exportGdpr(user)}
                      />
                      <IconButton
                        aria-label="Nutzer löschen"
                        size="sm"
                        variant="ghost"
                        color="var(--cc-text-3)"
                        _hover={{ bg: "rgba(248, 113, 113, 0.08)", color: "var(--cc-danger)" }}
                        icon={<Trash2 size={16} />}
                        onClick={() => confirmDelete(user)}
                      />
                    </HStack>
                  </Box>
                </HStack>
              );
            })
          )}
        </Box>
      </Stack>

      {/* ── Tier-Override ── */}
      <UserTierOverrideModal
        isOpen={isTierOpen}
        onClose={onTierClose}
        user={
          tierTarget
            ? { id: tierTarget.id, email: tierTarget.email, fullName: tierTarget.fullName }
            : null
        }
        initial={
          tierTarget
            ? {
                membership_tier: tierTarget.membershipTier,
                access_until: tierTarget.accessUntil,
                is_paid: tierTarget.isPaid,
              }
            : null
        }
        onSaved={(next) => {
          if (!tierTarget) return;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === tierTarget.id
                ? {
                    ...u,
                    membershipTier: next.membership_tier,
                    accessUntil: next.access_until,
                    isPaid: next.is_paid,
                  }
                : u,
            ),
          );
          setTierTarget((prev) =>
            prev
              ? {
                  ...prev,
                  membershipTier: next.membership_tier,
                  accessUntil: next.access_until,
                  isPaid: next.is_paid,
                }
              : prev,
          );
        }}
      />

      {/* ── Löschen-Bestätigung ── */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent {...adminModalProps} mx={4}>
          <ModalHeader {...adminModalHeaderProps}>Nutzer löschen</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="var(--cc-text-2)">
              Soll der Nutzer{" "}
              <Text as="span" fontWeight={600} color="var(--cc-text)">
                {deleteTarget?.email}
              </Text>{" "}
              wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="var(--cc-text-2)" onClick={onDeleteClose}>
              Abbrechen
            </Button>
            <Button {...adminDangerButtonProps} onClick={() => void doDelete()} isLoading={deleting}>
              Endgültig löschen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
