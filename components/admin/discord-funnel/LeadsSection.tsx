"use client";

import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
} from "@chakra-ui/react";
import { Download, Search, Users } from "lucide-react";
import { useState } from "react";
import type { ExportType, LeadPatchBody, LeadRow } from "./types";
import { SectionCard } from "./primitives";
import { LeadCard } from "./LeadCard";

const EXPORT_OPTIONS: { value: ExportType; label: string }[] = [
  { value: "leads", label: "Leads (Detail)" },
  { value: "per_closer", label: "Per Closer (Aggregat)" },
  { value: "per_channel", label: "Per Kanal (Aggregat)" },
  { value: "funnel_summary", label: "Funnel-Summary" },
];

export function LeadsSection({
  leads,
  search,
  setSearch,
  onSearchSubmit,
  onPatch,
  onExport,
}: {
  leads: LeadRow[];
  search: string;
  setSearch: (v: string) => void;
  onSearchSubmit: () => void;
  onPatch: (id: string, body: LeadPatchBody) => void;
  onExport: (type: ExportType) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SectionCard
      title={`Leads (${leads.length})`}
      icon={<Users size={16} />}
      right={
        <Select
          size="sm"
          maxW="220px"
          value="placeholder"
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "placeholder") onExport(v as ExportType);
          }}
          bg="rgba(255,255,255,0.04)"
          borderColor="rgba(255,255,255,0.10)"
          color="var(--color-text-primary)"
          className="inter"
          icon={<Download size={14} />}
        >
          <option value="placeholder" disabled>
            CSV-Export…
          </option>
          {EXPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      }
    >
      <Stack spacing={4}>
        <InputGroup maxW="360px">
          <InputLeftElement pointerEvents="none">
            <Search size={16} color="rgba(255,255,255,0.4)" />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchSubmit();
            }}
            placeholder="Name oder E-Mail suchen… (Enter)"
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.12)"
            _hover={{ borderColor: "rgba(212,175,55,0.4)" }}
            _focus={{
              borderColor: "rgba(212,175,55,0.65)",
              boxShadow: "0 0 0 1px rgba(212,175,55,0.45)",
            }}
            color="var(--color-text-primary)"
            className="inter"
          />
        </InputGroup>

        {leads.length === 0 ? (
          <Box
            py={12}
            textAlign="center"
            color="var(--color-text-secondary)"
            className="inter"
            fontSize="sm"
            border="1px dashed rgba(255,255,255,0.08)"
            borderRadius="12px"
          >
            Keine Leads in dieser Ansicht.
          </Box>
        ) : (
          <Stack spacing={2}>
            {leads.map((lead) => (
              <LeadCard
                key={`${lead.id}:${lead.product ?? ""}:${lead.revenue_cents ?? ""}:${lead.closer ?? ""}:${lead.close_type ?? ""}:${lead.membership_installments ?? ""}:${lead.closed_at ?? ""}:${lead.internal_notes ?? ""}`}
                lead={lead}
                isOpen={expanded.has(lead.id)}
                onToggle={() => toggle(lead.id)}
                onPatch={onPatch}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
