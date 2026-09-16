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
import { adminEmptyProps, adminInputProps, adminOptionStyle } from "@/components/admin/adminUi";
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
          {...adminInputProps}
          icon={<Download size={14} />}
        >
          <option value="placeholder" disabled style={adminOptionStyle}>
            CSV-Export…
          </option>
          {EXPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={adminOptionStyle}>
              {o.label}
            </option>
          ))}
        </Select>
      }
    >
      <Stack spacing={4}>
        <InputGroup maxW="360px">
          <InputLeftElement pointerEvents="none" color="var(--cc-text-3)">
            <Search size={16} />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchSubmit();
            }}
            placeholder="Name oder E-Mail suchen… (Enter)"
            {...adminInputProps}
          />
        </InputGroup>

        {leads.length === 0 ? (
          <Box {...adminEmptyProps}>Keine Leads in dieser Ansicht.</Box>
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
