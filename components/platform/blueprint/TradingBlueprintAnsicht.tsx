"use client";

import { Alert, AlertIcon, Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowRight, Check, CirclePlay, Download, Lock } from "lucide-react";
import NextLink from "next/link";
import { PageHeader } from "@/components/journal/PageHeader";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { BLUEPRINT_DOWNLOAD_PFAD, blueprintTexte as t } from "@/config/free-bereich";
import { TRAINING_VIDEOS_PFAD } from "@/config/training";
import { BlueprintCover } from "./BlueprintCover";

export type TradingBlueprintAnsichtProps = {
  untertitel: string;
  beschreibung: string;
  pdf: { groesse: string | null } | null;
  /** `null` = keine Videoanleitung hinterlegt; `{ src: null }` = hinterlegt, aber gerade nicht abspielbar. */
  video: { src: string | null; poster: string | null } | null;
  dateiFehler: boolean;
  /** Free-Konto ohne abgeschlossenen kostenlosen Kurs: kein Download, kein Video (`ladeBlueprintFreigabe`). */
  sperre?: { gesehen: number; gesamt: number } | null;
};

/**
 * `/trading-blueprint` — für alle angemeldeten Konten: Beschreibung, Download
 * und die Videoanleitung. Außerhalb des Dashboards, deshalb im vollen
 * Gold-Look (Hero-Karte); die neutrale Ausnahme gilt nur für `/dashboard`.
 */
export function TradingBlueprintAnsicht({ untertitel, beschreibung, pdf, video, dateiFehler, sperre = null }: TradingBlueprintAnsichtProps) {
  return (
    <Box>
      <PageHeader title={t.titel} subtitle={untertitel} />

      {dateiFehler ? (
        <Alert status="warning" borderRadius="var(--cc-radius-lg)" mb={6} bg="rgba(212, 176, 128, 0.08)" color="var(--cc-text)">
          <AlertIcon color="var(--cc-gold-light)" />
          <Text fontSize="14px">{t.dateiFehlt}</Text>
        </Alert>
      ) : null}

      <Flex
        className="cc-card cc-card--hero cc-rise"
        p={{ base: 6, md: 8 }}
        gap={{ base: 6, md: 10 }}
        direction={{ base: "column", md: "row" }}
        align={{ base: "center", md: "center" }}
      >
        <BlueprintCover breite={200} />
        <Stack spacing={5} flex="1" minW={0} w="100%">
          <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="60ch">
            {beschreibung}
          </Text>
          <Stack as="ul" spacing={2.5} listStyleType="none">
            {t.punkte.map((p) => (
              <HStack as="li" key={p} spacing={3} align="flex-start">
                <Box color="var(--cc-gold-light)" mt="3px" flexShrink={0}>
                  <Check size={16} strokeWidth={2.2} aria-hidden />
                </Box>
                <Text fontSize="15px" color="var(--cc-text-soft)">
                  {p}
                </Text>
              </HStack>
            ))}
          </Stack>
          <Stack spacing={2} align="flex-start" pt={1}>
            {sperre ? (
              <Stack spacing={3} w="100%" p={4} borderRadius="10px" border="1px solid var(--cc-line-strong)" bg="rgba(255, 255, 255, 0.02)">
                <HStack spacing={2.5} color="var(--cc-text)">
                  <Lock size={17} strokeWidth={1.8} aria-hidden />
                  <Text fontSize="15px" fontWeight={600}>
                    {t.gesperrtTitel}
                  </Text>
                </HStack>
                <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
                  {t.gesperrtText}
                </Text>
                <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)">
                  {t.gesperrtStand(sperre.gesehen, sperre.gesamt)}
                </Text>
                <Button as={NextLink} href={TRAINING_VIDEOS_PFAD} variant="gold" alignSelf="flex-start" rightIcon={<ArrowRight size={17} strokeWidth={2} />}>
                  {t.gesperrtKnopf}
                </Button>
              </Stack>
            ) : pdf ? (
              <>
                <Button as="a" href={BLUEPRINT_DOWNLOAD_PFAD} variant="gold" leftIcon={<Download size={18} strokeWidth={2} />}>
                  {t.herunterladen}
                </Button>
                <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)">
                  PDF{pdf.groesse ? ` · ${pdf.groesse}` : ""}
                </Text>
              </>
            ) : (
              <>
                <Button variant="line" isDisabled leftIcon={<Download size={18} strokeWidth={2} />}>
                  {t.inKuerze}
                </Button>
                <Text fontSize="13px" color="var(--cc-text-3)" maxW="52ch">
                  {t.inKuerzeText}
                </Text>
              </>
            )}
          </Stack>
        </Stack>
      </Flex>

      {video && !sperre ? (
        <Box as="section" id="video" aria-labelledby="blueprint-video" mt={{ base: 10, md: 14 }} scrollMarginTop="80px" className="cc-rise">
          <HStack spacing={3} mb={2}>
            <Box color="var(--cc-gold-light)">
              <CirclePlay size={22} strokeWidth={1.6} aria-hidden />
            </Box>
            <Text as="h2" id="blueprint-video" fontSize={{ base: "20px", md: "22px" }} fontWeight={600} color="var(--cc-text)">
              {t.videoTitel}
            </Text>
          </HStack>
          <Text fontSize="15px" color="var(--cc-text-2)" mb={5}>
            {t.videoText}
          </Text>
          {video.src ? (
            <Box className="cc-card" overflow="hidden" p={0}>
              <GlassVideoPlayer src={video.src} poster={video.poster ?? undefined} />
            </Box>
          ) : (
            <Text fontSize="14px" color="var(--cc-text-2)">
              {t.videoNichtVerfuegbar}
            </Text>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
