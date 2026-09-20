"use client";

import type { ReactNode } from "react";
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import {
  TrendingUp,
  Trophy,
  BookOpen,
  Clock,
  HelpCircle,
  XCircle,
  BarChart3,
  Flame,
  FileX,
  Dumbbell,
  Rocket,
  Brain,
  ArrowRight,
} from "lucide-react";
import { landingConfig } from "@/config/landing-config";
import { Accent, CardRail, DisplayHeading, Eyebrow, OfferCard, Reveal } from "./landing-ui";

const CARD_HEADER_ICONS: Record<string, ReactNode> = {
  Student: <BookOpen size={22} strokeWidth={1.5} />,
  TrendUp: <TrendingUp size={22} strokeWidth={1.5} />,
  Trophy: <Trophy size={22} strokeWidth={1.5} />,
};

const BULLET_ICONS: Record<string, ReactNode> = {
  Clock: <Clock size={15} strokeWidth={1.75} />,
  HelpCircle: <HelpCircle size={15} strokeWidth={1.75} />,
  XCircle: <XCircle size={15} strokeWidth={1.75} />,
  BarChart3: <BarChart3 size={15} strokeWidth={1.75} />,
  Flame: <Flame size={15} strokeWidth={1.75} />,
  FileX: <FileX size={15} strokeWidth={1.75} />,
  Dumbbell: <Dumbbell size={15} strokeWidth={1.75} />,
  Rocket: <Rocket size={15} strokeWidth={1.75} />,
  Brain: <Brain size={15} strokeWidth={1.75} />,
};

function Gold({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-gold-light)" fontWeight={600}>
      {children}
    </Box>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return (
    <Box as="span" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Box>
  );
}

export function StatsAndTargetSection({ onApply }: { onApply: () => void }) {
  const { targetGroups, product } = landingConfig;

  return (
    <Box as="section" aria-labelledby="target-title" w="100%" py={{ base: 16, md: 24 }} px={{ base: 4, md: 8, lg: 12 }}>
      <Box maxW="1200px" mx="auto">
        {/* Kopf */}
        <Reveal>
          <Stack spacing={4} align="center" textAlign="center" mb={{ base: 10, md: 14 }}>
            <Eyebrow>Wen wählen wir aus?</Eyebrow>
            <DisplayHeading id="target-title">
              Wen wählen wir für den{" "}
              <Box as="br" display={{ base: "none", md: "block" }} />
              <Accent>{product.name}</Accent> aus?
            </DisplayHeading>
            <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="540px">
              Nicht jeder bekommt einen Platz. Wir schauen genau hin und entscheiden bewusst.
            </Text>
          </Stack>
        </Reveal>

        {/* Karten — mobil wischbar, ab md dreispaltig */}
        <Reveal delay={80}>
          <CardRail label="Zielgruppen">
            {targetGroups.map((group, i) => (
              <OfferCard
                key={group.title}
                index={i}
                icon={CARD_HEADER_ICONS[group.iconName] ?? <TrendingUp size={22} strokeWidth={1.5} />}
                title={group.title}
                description={group.description}
                bullets={group.bullets.map((b) => ({
                  text: b.text,
                  icon: BULLET_ICONS[b.icon] ?? <ArrowRight size={15} strokeWidth={1.75} />,
                }))}
                ctaLabel={group.cta}
                onApply={onApply}
                headMinH="132px"
              />
            ))}
          </CardRail>
        </Reveal>

        {/* Abschluss: Bewerbungsaufforderung als Hero-Karte */}
        <Reveal mt={{ base: 12, md: 20 }}>
          <Box className="cc-card cc-card--hero" px={{ base: 6, md: 12 }} py={{ base: 9, md: 12 }} textAlign="center">
            <Box
              display="inline-flex"
              alignItems="center"
              px={3}
              py={1}
              mb={6}
              borderRadius="full"
              bg="var(--cc-gold-wash)"
              border="1px solid var(--cc-gold-line)"
              boxShadow="0 0 18px rgba(212, 176, 128, 0.14)"
            >
              <Text as="span" fontSize="12px" fontWeight={600} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
                Deine Chance
              </Text>
            </Box>

            <Stack
              spacing={4}
              maxW="620px"
              mx="auto"
              mb={{ base: 0, md: 8 }}
              fontSize={{ base: "16px", md: "18px" }}
              lineHeight={1.75}
              color="var(--cc-text-2)"
            >
              <Text>
                Du hast die Seite gelesen. Du weißt was <Gold>Capital Circle</Gold> ist und <Strong>was es nicht ist</Strong>.
              </Text>
              <Text>
                Wenn du erkennst dass du <Strong>einer der drei Trader</Strong> bist, <Gold>dann bewirb dich jetzt</Gold>.
              </Text>
              <Text>
                <Gold>Emre</Gold> liest jede Bewerbung <Strong>persönlich</Strong>. <Gold>Nicht jeder wird angenommen</Gold>.
              </Text>
            </Stack>

            {/* Button — nur Desktop (mobil: fester Balken) */}
            <Button
              variant="gold"
              size="lg"
              h="52px"
              px={8}
              fontSize="16px"
              display={{ base: "none", md: "inline-flex" }}
              rightIcon={<ArrowRight size={16} strokeWidth={2.25} />}
              onClick={onApply}
            >
              Jetzt bewerben
            </Button>
          </Box>
        </Reveal>
      </Box>
    </Box>
  );
}
