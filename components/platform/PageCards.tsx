"use client";

import dynamic from "next/dynamic";
import type {
  AnalysisPostRow,
  ArsenalAttachmentListItem,
  ArsenalCardRow,
} from "@/lib/server-data";
import type { ArsenalBrowserAccent } from "@/components/platform/ArsenalAttachmentsBrowser";
import type { ArsenalCardsAccent } from "@/components/platform/ArsenalCardsSection";

const AnalysisFeed = dynamic(
  () => import("@/components/platform/AnalysisFeed").then((m) => m.AnalysisFeed),
  { ssr: false },
);

const ArsenalAttachmentsBrowser = dynamic(
  () => import("@/components/platform/ArsenalAttachmentsBrowser").then((m) => m.ArsenalAttachmentsBrowser),
  { ssr: false },
);

const ArsenalCardsSection = dynamic(
  () => import("@/components/platform/ArsenalCardsSection").then((m) => m.ArsenalCardsSection),
  { ssr: false },
);

const CodexReferenceView = dynamic(
  () => import("@/components/platform/CodexReferenceView").then((m) => m.CodexReferenceView),
  { ssr: false },
);

export function PageAnalysisFeed({ posts }: { posts: AnalysisPostRow[] }) {
  return <AnalysisFeed posts={posts} />;
}

export function PageArsenalAttachmentsBrowser({
  items,
  title,
  subtitle,
  accentColor,
}: {
  items: ArsenalAttachmentListItem[];
  title: string;
  subtitle: string;
  accentColor?: ArsenalBrowserAccent;
}) {
  return <ArsenalAttachmentsBrowser items={items} title={title} subtitle={subtitle} accentColor={accentColor} />;
}

export function PageArsenalCardsSection({
  cards,
  emptyLabel,
  accentColor,
}: {
  cards: ArsenalCardRow[];
  emptyLabel?: string;
  accentColor?: ArsenalCardsAccent;
}) {
  return <ArsenalCardsSection cards={cards} emptyLabel={emptyLabel} accentColor={accentColor} />;
}

export function PageCodexReferenceView() {
  return <CodexReferenceView />;
}
