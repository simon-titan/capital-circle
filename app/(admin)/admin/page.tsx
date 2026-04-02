import Link from "next/link";
import { Stack, Text } from "@chakra-ui/react";

export default function AdminPage() {
  return (
    <Stack gap={3}>
      <Text fontSize="2xl">Admin Uebersicht</Text>
      <Link href="/admin/kurse">Kurse & Module verwalten</Link>
      <Link href="/admin/quiz">Quiz verwalten</Link>
      <Link href="/admin/events">Events verwalten</Link>
      <Link href="/admin/hausaufgaben">Hausaufgaben verwalten</Link>
      <Link href="/admin/mitglieder">Mitglieder ansehen</Link>
      <Link href="/admin/discord">Discord Übersicht</Link>
      <Link href="/admin/arsenal">Arsenal</Link>
      <Link href="/admin/live-sessions">Live Sessions</Link>
      <Link href="/admin/analysis">Analyse</Link>
    </Stack>
  );
}
