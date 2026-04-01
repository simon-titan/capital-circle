"use client";

import dynamic from "next/dynamic";
import type { ModuleLearningClientProps } from "@/components/platform/ModuleLearningClient";

const ModuleLearningClient = dynamic(
  () => import("@/components/platform/ModuleLearningClient").then((m) => m.ModuleLearningClient),
  { ssr: false },
);

export function AusbildungModuleLearningClient(props: ModuleLearningClientProps) {
  return <ModuleLearningClient {...props} />;
}
