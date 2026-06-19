"use client";

import {
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useState } from "react";
import {
  DISCORD_FUNNEL_QUESTIONS,
} from "@/config/discord-funnel-questions";
import {
  CLOSER_LABELS,
  SOURCE_ORIGIN_LABELS,
  type CloseType,
  type CloserId,
  type LeadPatchBody,
  type LeadRow,
  type MembershipInstallments,
} from "./types";
import {
  ClosedBadge,
  FieldLabel,
  fmtDate,
  MetaBlock,
  MetaPill,
  TagBadge,
  toDateInputValue,
} from "./primitives";

const fieldSx = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.12)",
  color: "var(--color-text-primary)",
} as const;

export function LeadCard({
  lead,
  isOpen,
  onToggle,
  onPatch,
}: {
  lead: LeadRow;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (id: string, body: LeadPatchBody) => void;
}) {
  // lokaler State für Text-/Number-/Date-Felder (commit onBlur/onChange)
  const [product, setProduct] = useState(lead.product ?? "");
  const [revenueEur, setRevenueEur] = useState(
    lead.revenue_cents != null ? String(lead.revenue_cents / 100) : "",
  );
  const [notes, setNotes] = useState(lead.internal_notes ?? "");

  const qualifiedValue =
    lead.qualified === true ? "yes" : lead.qualified === false ? "no" : "offen";
  const isMembership = lead.close_type === "membership";
  const viewCount = lead.video_view_count ?? 0;

  return (
    <Box
      borderRadius="14px"
      border="1px solid rgba(255,255,255,0.09)"
      bg="rgba(255,255,255,0.04)"
      overflow="hidden"
      transition="border-color .2s ease"
      _hover={{ borderColor: "rgba(212,175,55,0.30)" }}
    >
      <HStack
        as="button"
        onClick={onToggle}
        w="full"
        p={4}
        spacing={4}
        align="center"
        justifyContent="space-between"
        textAlign="left"
        _hover={{ bg: "rgba(255,255,255,0.02)" }}
      >
        <Stack spacing={1} flex="1" minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text className="inter-semibold" color="var(--color-text-primary)" noOfLines={1}>
              {lead.name || "(Kein Name)"}
            </Text>
            {lead.utm_source ? <TagBadge>{lead.utm_source}</TagBadge> : null}
            {lead.source_origin ? (
              <TagBadge tone="gold">{SOURCE_ORIGIN_LABELS[lead.source_origin]}</TagBadge>
            ) : null}
            {lead.closer ? <TagBadge tone="gold">{CLOSER_LABELS[lead.closer]}</TagBadge> : null}
          </HStack>
          <Text fontSize="xs" className="inter" color="var(--color-text-secondary)" noOfLines={1}>
            {lead.email}
          </Text>
        </Stack>

        <HStack spacing={3} flexShrink={0} display={{ base: "none", md: "flex" }}>
          {viewCount > 0 ? (
            <Badge
              bg="rgba(212,175,55,0.10)"
              color="var(--color-accent-gold-light, #E8C547)"
              border="1px solid rgba(212,175,55,0.25)"
              borderRadius="full"
              px={2}
              py={0.5}
              textTransform="none"
              className="inter"
            >
              <HStack spacing={1}>
                <Eye size={11} />
                <Text className="jetbrains-mono" fontSize="11px">
                  {viewCount}×
                </Text>
              </HStack>
            </Badge>
          ) : null}
          <MetaPill label="Video" value={`${lead.video_max_percent ?? 0}%`} />
          <MetaPill label="Fragen" value={lead.questions_completed_at ? "✓" : "—"} />
          {lead.calendly_booked_at ? (
            <Badge
              bg="rgba(52,211,153,0.12)"
              color="#34D399"
              border="1px solid rgba(52,211,153,0.3)"
              borderRadius="full"
              px={2}
              py={0.5}
              textTransform="none"
              className="inter"
            >
              Call gebucht
            </Badge>
          ) : null}
          <ClosedBadge closed={lead.closed} />
        </HStack>
        <Box color="var(--color-text-secondary)" flexShrink={0}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box px={5} pb={5} pt={2} borderTop="1px solid rgba(255,255,255,0.06)">
          <Stack spacing={5}>
            {/* Meta-Zeile */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              <MetaBlock label="Telefon" value={lead.phone ?? "—"} />
              <MetaBlock label="Herkunft" value={lead.source_origin ? SOURCE_ORIGIN_LABELS[lead.source_origin] : "—"} />
              <MetaBlock label="UTM Medium" value={lead.utm_medium ?? "—"} />
              <MetaBlock label="UTM Campaign" value={lead.utm_campaign ?? "—"} />
              <MetaBlock label="Erstellt" value={fmtDate(lead.created_at)} />
              <MetaBlock label="Invite gesendet" value={fmtDate(lead.discord_invite_sent_at)} />
              <MetaBlock label="Discord beigetreten" value={fmtDate(lead.discord_joined_at)} />
              <MetaBlock label="Discord-Name" value={lead.discord_username ?? "—"} />
              <MetaBlock label="Call gebucht" value={fmtDate(lead.calendly_booked_at)} />
              <MetaBlock
                label="Video"
                value={`${lead.video_max_percent ?? 0}% · ${lead.video_watch_seconds ?? 0}s · ${viewCount}× Views${lead.video_completed_at ? " · fertig" : ""}`}
              />
              <MetaBlock label="Zuletzt geschaut" value={fmtDate(lead.video_last_watched_at)} />
            </SimpleGrid>

            {/* Antworten */}
            <Stack spacing={3}>
              <Text
                fontSize="xs"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--color-accent-gold)"
                className="inter-semibold"
              >
                Antworten (Closer-Kontext)
              </Text>
              {DISCORD_FUNNEL_QUESTIONS.map((q) => (
                <Stack key={q.id} spacing={1}>
                  <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                    {q.question}
                  </Text>
                  <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                    {lead.answers?.[q.id] ?? "—"}
                  </Text>
                  <Text fontSize="11px" color="#606068" className="inter" fontStyle="italic">
                    Closer sieht: {q.closerNote}
                  </Text>
                </Stack>
              ))}
            </Stack>

            {/* Closer-Management (inline editierbar) */}
            <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="12px" p={4}>
              <Text
                fontSize="xs"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--color-accent-gold)"
                className="inter-semibold"
                mb={3}
              >
                Closer-Management
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stack spacing={1}>
                  <FieldLabel>Closer</FieldLabel>
                  <Select
                    size="sm"
                    value={lead.closer ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, { closer: v === "" ? null : (v as CloserId) });
                    }}
                    className="inter"
                    {...fieldSx}
                  >
                    <option value="">–</option>
                    <option value="kevin">{CLOSER_LABELS.kevin}</option>
                    <option value="simon">{CLOSER_LABELS.simon}</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Qualifiziert</FieldLabel>
                  <Select
                    size="sm"
                    value={qualifiedValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, { qualified: v === "yes" ? true : v === "no" ? false : null });
                    }}
                    className="inter"
                    {...fieldSx}
                  >
                    <option value="offen">Offen</option>
                    <option value="yes">Ja</option>
                    <option value="no">Nein</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>No-Show</FieldLabel>
                  <Button
                    size="sm"
                    onClick={() => onPatch(lead.id, { no_show: !lead.no_show })}
                    bg={lead.no_show ? "rgba(229,72,77,0.18)" : "rgba(255,255,255,0.04)"}
                    color={lead.no_show ? "#FCA5A5" : "var(--color-text-secondary)"}
                    border="1px solid"
                    borderColor={lead.no_show ? "rgba(229,72,77,0.45)" : "rgba(255,255,255,0.12)"}
                    _hover={{ bg: "rgba(255,255,255,0.06)" }}
                    className="inter"
                    justifyContent="flex-start"
                  >
                    {lead.no_show ? "No-Show: Ja" : "No-Show: Nein"}
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    size="sm"
                    value={lead.closed ?? "pending"}
                    onChange={(e) => onPatch(lead.id, { closed: e.target.value as LeadRow["closed"] ?? "pending" })}
                    className="inter"
                    {...fieldSx}
                  >
                    <option value="pending">Pending</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Close-Typ</FieldLabel>
                  <Select
                    size="sm"
                    value={lead.close_type ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, {
                        close_type: v === "" ? null : (v as CloseType),
                        // Raten zurücksetzen, wenn kein Membership mehr.
                        ...(v !== "membership" ? { membership_installments: null } : {}),
                      });
                    }}
                    className="inter"
                    {...fieldSx}
                  >
                    <option value="">–</option>
                    <option value="one_to_one">1:1</option>
                    <option value="membership">Mitgliedschaft</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Raten {isMembership ? "" : "(nur Mitgliedschaft)"}</FieldLabel>
                  <Select
                    size="sm"
                    value={lead.membership_installments != null ? String(lead.membership_installments) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, {
                        membership_installments: v === "" ? null : (Number(v) as MembershipInstallments),
                      });
                    }}
                    isDisabled={!isMembership}
                    opacity={isMembership ? 1 : 0.45}
                    className="inter"
                    {...fieldSx}
                  >
                    <option value="">–</option>
                    <option value="1">1 Rate</option>
                    <option value="2">2 Raten</option>
                    <option value="4">4 Raten</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Abschluss-Datum</FieldLabel>
                  <Input
                    size="sm"
                    type="date"
                    value={toDateInputValue(lead.closed_at)}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, { closed_at: v === "" ? null : v });
                    }}
                    className="inter"
                    {...fieldSx}
                  />
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Produkt</FieldLabel>
                  <Input
                    size="sm"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    onBlur={() => {
                      if (product !== (lead.product ?? "")) onPatch(lead.id, { product: product || null });
                    }}
                    placeholder="z. B. Mentoring"
                    className="inter"
                    {...fieldSx}
                  />
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Revenue (€)</FieldLabel>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={revenueEur}
                    onChange={(e) => setRevenueEur(e.target.value)}
                    onBlur={() => {
                      const cents = revenueEur === "" ? null : Math.round(parseFloat(revenueEur) * 100);
                      if (revenueEur !== "" && (cents === null || Number.isNaN(cents))) return;
                      if (cents !== lead.revenue_cents) onPatch(lead.id, { revenue_cents: cents });
                    }}
                    placeholder="0.00"
                    className="inter jetbrains-mono"
                    {...fieldSx}
                  />
                </Stack>

                <Stack spacing={1} gridColumn={{ md: "1 / -1" }}>
                  <FieldLabel>Interne Notizen</FieldLabel>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => {
                      if (notes !== (lead.internal_notes ?? "")) onPatch(lead.id, { internal_notes: notes || null });
                    }}
                    placeholder="Gesprächsnotizen, nächste Schritte…"
                    minH="90px"
                    className="inter"
                    {...fieldSx}
                  />
                </Stack>
              </SimpleGrid>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
