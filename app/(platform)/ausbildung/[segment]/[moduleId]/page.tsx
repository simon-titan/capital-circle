import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ segment: string; moduleId: string }>;
};

/** @deprecated Alte URL /ausbildung/{kursSlug}/{modulId} — Weiterleitung auf flache Route. */
export default async function LegacyModuleRedirect({ params }: PageProps) {
  const { moduleId } = await params;
  redirect(`/ausbildung/${encodeURIComponent(moduleId)}`);
}
