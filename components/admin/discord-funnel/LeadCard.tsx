"use client";

import {
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
  AdminLabel,
  adminInputProps,
  adminInsetProps,
  adminOptionStyle,
  StatusPill,
} from "@/components/admin/adminUi";
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
      {...adminInsetProps}
      overflow="hidden"
      transition="border-color 150ms var(--cc-ease)"
      _hover={{ borderColor: "var(--cc-line-strong)" }}
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
        transition="background-color 120ms ease"
        _hover={{ bg: "rgba(255, 255, 255, 0.03)" }}
      >
        <Stack spacing={1} flex="1" minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
              {lead.name || "(Kein Name)"}
            </Text>
            {lead.utm_source ? <TagBadge>{lead.utm_source}</TagBadge> : null}
            {lead.source_origin ? (
              <TagBadge tone="gold">{SOURCE_ORIGIN_LABELS[lead.source_origin]}</TagBadge>
            ) : null}
            {lead.closer ? <TagBadge tone="gold">{CLOSER_LABELS[lead.closer]}</TagBadge> : null}
          </HStack>
          <Text fontSize="12px" color="var(--cc-text-2)" noOfLines={1}>
            {lead.email}
          </Text>
        </Stack>

        <HStack spacing={3} flexShrink={0} display={{ base: "none", md: "flex" }}>
          {viewCount > 0 ? (
            <StatusPill tone="neutral">
              <HStack as="span" spacing={1}>
                <Eye size={11} aria-hidden />
                <Text as="span" className="cc-num" fontSize="11px" fontWeight={500}>
                  {viewCount}×
                </Text>
              </HStack>
            </StatusPill>
          ) : null}
          <MetaPill label="Video" value={`${lead.video_max_percent ?? 0}%`} />
          <MetaPill label="Fragen" value={lead.questions_completed_at ? "✓" : "—"} />
          {lead.calendly_booked_at ? <StatusPill tone="success">Call gebucht</StatusPill> : null}
          <ClosedBadge closed={lead.closed} />
        </HStack>
        <Box color="var(--cc-text-2)" flexShrink={0}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box px={5} pb={5} pt={4} borderTop="1px solid var(--cc-line)">
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
              <AdminLabel color="var(--cc-text-soft)">Antworten (Closer-Kontext)</AdminLabel>
              {DISCORD_FUNNEL_QUESTIONS.map((q) => (
                <Stack key={q.id} spacing={1}>
                  <Text fontSize="12px" color="var(--cc-text-2)">
                    {q.question}
                  </Text>
                  <Text fontSize="14px" color="var(--cc-text)">
                    {lead.answers?.[q.id] ?? "—"}
                  </Text>
                  <Text fontSize="12px" color="var(--cc-text-3)">
                    Closer sieht: {q.closerNote}
                  </Text>
                </Stack>
              ))}
            </Stack>

            {/* Closer-Management (inline editierbar) */}
            <Box {...adminInsetProps} p={4}>
              <AdminLabel color="var(--cc-text-soft)" mb={3}>
                Closer-Management
              </AdminLabel>
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
                    {...adminInputProps}
                  >
                    <option value="" style={adminOptionStyle}>–</option>
                    <option value="kevin" style={adminOptionStyle}>{CLOSER_LABELS.kevin}</option>
                    <option value="simon" style={adminOptionStyle}>{CLOSER_LABELS.simon}</option>
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
                    {...adminInputProps}
                  >
                    <option value="offen" style={adminOptionStyle}>Offen</option>
                    <option value="yes" style={adminOptionStyle}>Ja</option>
                    <option value="no" style={adminOptionStyle}>Nein</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>No-Show</FieldLabel>
                  <Button
                    size="sm"
                    variant="line"
                    onClick={() => onPatch(lead.id, { no_show: !lead.no_show })}
                    bg={lead.no_show ? "rgba(248, 113, 113, 0.1)" : "rgba(255, 255, 255, 0.03)"}
                    color={lead.no_show ? "var(--cc-danger)" : "var(--cc-text-2)"}
                    borderColor={lead.no_show ? "rgba(248, 113, 113, 0.35)" : "var(--cc-line-strong)"}
                    fontWeight={400}
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
                    {...adminInputProps}
                  >
                    <option value="pending" style={adminOptionStyle}>Pending</option>
                    <option value="closed_won" style={adminOptionStyle}>Closed Won</option>
                    <option value="closed_lost" style={adminOptionStyle}>Closed Lost</option>
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
                    {...adminInputProps}
                  >
                    <option value="" style={adminOptionStyle}>–</option>
                    <option value="one_to_one" style={adminOptionStyle}>1:1</option>
                    <option value="membership" style={adminOptionStyle}>Mitgliedschaft</option>
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
                    {...adminInputProps}
                  >
                    <option value="" style={adminOptionStyle}>–</option>
                    <option value="1" style={adminOptionStyle}>1 Rate</option>
                    <option value="2" style={adminOptionStyle}>2 Raten</option>
                    <option value="4" style={adminOptionStyle}>4 Raten</option>
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
                    className="cc-num"
                    {...adminInputProps}
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
                    {...adminInputProps}
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
                    className="cc-num"
                    fontWeight={500}
                    {...adminInputProps}
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
                    fontSize="14px"
                    {...adminInputProps}
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
