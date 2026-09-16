import Link from "next/link";
import { Box, Flex, SimpleGrid } from "@chakra-ui/react";
import { ArrowUpRight } from "lucide-react";
import { AdminPageHeader, ADMIN_CARD_CLASS } from "@/components/admin/adminUi";

const links = [
  { href: "/admin/dashboard", label: "Analytics-Dashboard" },
  { href: "/admin/applications", label: "Bewerbungen prüfen" },
  { href: "/admin/ht-applications", label: "High-Ticket Bewerbungen" },
  { href: "/admin/kurse", label: "Kurse & Module verwalten" },
  { href: "/admin/quiz", label: "Quiz verwalten" },
  { href: "/admin/events", label: "Events verwalten" },
  { href: "/admin/hausaufgaben", label: "Hausaufgaben verwalten" },
  { href: "/admin/mitglieder", label: "Mitglieder ansehen" },
  { href: "/admin/discord", label: "Discord Übersicht" },
  { href: "/admin/arsenal", label: "Arsenal" },
  { href: "/admin/live-sessions", label: "Live Sessions" },
  { href: "/admin/analysis", label: "Analyse" },
  { href: "/admin/news", label: "News verwalten" },
  { href: "/admin/tracking", label: "Insight Tracking Links" },
];

export default function AdminPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader title="Admin-Übersicht" />
      <SimpleGrid as="ul" listStyleType="none" columns={{ base: 1, sm: 2, lg: 3 }} spacing={3}>
        {links.map((item) => (
          <Box as="li" key={item.href}>
            {/*
              Link aussen herum statt `as={Link}`: Diese Seite ist eine
              Server-Komponente, und Chakras Flex ist eine Client-Komponente —
              eine Komponente als Prop hinueberzureichen ist eine Funktion ueber
              die Serialisierungsgrenze und laesst das Prerendering scheitern
              ("Functions cannot be passed directly to Client Components").
            */}
            <Link href={item.href} style={{ textDecoration: "none", display: "block" }}>
              <Flex
                className={ADMIN_CARD_CLASS}
                h="56px"
                px={4}
                align="center"
                justify="space-between"
                gap={3}
                fontSize="15px"
                fontWeight={500}
                color="var(--cc-text-soft)"
                _hover={{ color: "var(--cc-text)" }}
              >
                {item.label}
                <Box as="span" color="var(--cc-text-3)" flexShrink={0}>
                  <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
                </Box>
              </Flex>
            </Link>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
