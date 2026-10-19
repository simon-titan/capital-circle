"use client";

import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Maximize2, Play, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { caseStudies, caseStudiesKopf, type CaseStudy } from "@/config/call-funnel";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { funnelModalContentProps, funnelOverlayProps } from "@/components/marketing/funnel-ui";
import { Reveal } from "../landing-ui";
import { akzentZahl, CallSektion, CallSektionsKopf } from "./call-ui";

/**
 * Case Studies auf `/call`.
 *
 * Zwei Kartenarten aus derselben Liste (`caseStudies` in `config/call-funnel.ts`):
 * - **Videokarte** (`videoUrl` gesetzt): Standbild mit Play-Knopf, öffnet ein
 *   Modal mit dem `GlassVideoPlayer` — ohne Autoplay, denn Autoplay ist dort
 *   stumm, und ein Testimonial ohne Ton sagt nichts.
 * - **Bildkarte** (`bild` gesetzt): der Nachweis, groß per Klick.
 *
 * Ein einziges Modal für alle Karten, gespeist aus einem Zustand (gleiche
 * Begründung wie in `NachweisGalerie`). Ist die Liste leer, verschwindet die
 * ganze Sektion — eine Überschrift über nichts wäre schlimmer als keine.
 */
export function CallCaseStudies() {
  const [offen, setOffen] = useState<CaseStudy | null>(null);

  if (caseStudies.length === 0) return null;

  return (
    <CallSektion id="case-studies" labelledBy="case-studies-titel">
      <Stack spacing={{ base: 10, md: 14 }}>
        <CallSektionsKopf
          id="case-studies-titel"
          eyebrow={caseStudiesKopf.eyebrow}
          headline={caseStudiesKopf.headline}
          text={caseStudiesKopf.text}
        />

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 5 }}>
          {caseStudies.map((c, i) => (
            <Reveal key={`${c.name ?? ""}-${c.titel}`} delay={(i % 2) * 90}>
              <CaseKarte c={c} onOeffnen={() => setOffen(c)} />
            </Reveal>
          ))}
        </SimpleGrid>
      </Stack>

      <CaseModal c={offen} onClose={() => setOffen(null)} />
    </CallSektion>
  );
}

function CaseKarte({ c, onOeffnen }: { c: CaseStudy; onOeffnen: () => void }) {
  const istVideo = Boolean(c.videoUrl);
  const vorschau = istVideo ? c.poster : c.bild;
  const titelText = c.titel.replace(/[{}]/g, "");

  return (
    <Box
      as="button"
      type="button"
      className="cc-card"
      w="full"
      textAlign="left"
      onClick={onOeffnen}
      aria-haspopup="dialog"
      aria-label={`${istVideo ? "Video ansehen" : "Nachweis vergrößern"}: ${c.name ? `${c.name}, ` : ""}${titelText}`}
      cursor={istVideo ? "pointer" : "zoom-in"}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      sx={{ "&:hover .cc-case-shot": { transform: "scale(1.03)" }, "@media (prefers-reduced-motion: reduce)": { "&:hover .cc-case-shot": { transform: "none" } } }}
    >
      {/* Vorschau: oben gerundet, eigene Maske, damit die Gold-Kante der Karte sichtbar bleibt. */}
      <Box
        position="relative"
        w="full"
        h={{ base: "220px", md: "280px" }}
        borderTopRadius="11px"
        overflow="hidden"
        bg="rgba(0, 0, 0, 0.25)"
      >
        {vorschau ? (
          <Box className="cc-case-shot" position="absolute" inset={0} transition="transform 500ms var(--cc-ease)">
            <Image
              src={vorschau}
              alt=""
              fill
              sizes="(max-width: 48em) 100vw, 560px"
              style={{ objectFit: "cover", objectPosition: istVideo ? "center" : "top center" }}
              // Poster kommen von Cloudflare Stream, nicht aus `public/` — ohne
              // `unoptimized` müsste jede Stream-Domain in `images.remotePatterns`.
              unoptimized={istVideo}
            />
          </Box>
        ) : (
          <Box position="absolute" inset={0} bgImage="radial-gradient(ellipse 60% 70% at 50% 45%, rgba(212, 176, 128, 0.14), transparent 70%)" />
        )}
        <Box
          aria-hidden
          position="absolute"
          inset={0}
          bg="linear-gradient(180deg, transparent 58%, rgba(24, 29, 34, 0.9) 100%)"
          pointerEvents="none"
        />
        {istVideo ? (
          <Flex aria-hidden position="absolute" inset={0} align="center" justify="center">
            <Flex
              w={{ base: "56px", md: "64px" }}
              h={{ base: "56px", md: "64px" }}
              borderRadius="full"
              align="center"
              justify="center"
              bg="var(--cc-gold)"
              bgImage="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              boxShadow="0 0 36px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              transition="transform 220ms var(--cc-ease)"
              sx={{ "button:hover &": { transform: "scale(1.07)" } }}
            >
              <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />
            </Flex>
          </Flex>
        ) : (
          <Flex
            aria-hidden
            position="absolute"
            top={3}
            right={3}
            w="34px"
            h="34px"
            align="center"
            justify="center"
            borderRadius="full"
            bg="var(--cc-bg-raised)"
            border="1px solid var(--cc-line-strong)"
            color="var(--cc-text-soft)"
            backdropFilter="blur(10px)"
          >
            <Maximize2 size={15} strokeWidth={1.75} />
          </Flex>
        )}
      </Box>

      <Stack spacing={1.5} p={{ base: 5, md: 6 }} pt={{ base: 4, md: 5 }}>
        {c.name ? (
          <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
            {c.name}
          </Text>
        ) : null}
        <Text fontSize="15px" lineHeight={1.55} color="var(--cc-text-2)">
          {akzentZahl(c.titel)}
        </Text>
      </Stack>
    </Box>
  );
}

/** Video bzw. Nachweis groß. Der Player läuft nur, solange das Modal offen ist. */
function CaseModal({ c, onClose }: { c: CaseStudy | null; onClose: () => void }) {
  const istVideo = Boolean(c?.videoUrl);
  return (
    <Modal isOpen={c !== null} onClose={onClose} size="xl" isCentered>
      <ModalOverlay {...funnelOverlayProps} />
      <ModalContent {...funnelModalContentProps} maxW={istVideo ? "min(960px, 94vw)" : "min(920px, 92vw)"}>
        {c ? (
          <ModalBody p={{ base: 4, md: 6 }}>
            <Flex justify="space-between" align="center" gap={3} mb={3}>
              <Text fontSize="14px" fontWeight={600} color="var(--cc-gold-light)" noOfLines={1} minW={0}>
                {c.name ?? ""}
              </Text>
              <Flex
                as="button"
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                flexShrink={0}
                w="32px"
                h="32px"
                align="center"
                justify="center"
                borderRadius="8px"
                border="1px solid var(--cc-line-strong)"
                bg="rgba(255, 255, 255, 0.02)"
                color="var(--cc-text-2)"
                transition="color 180ms var(--cc-ease), border-color 180ms var(--cc-ease)"
                _hover={{ color: "var(--cc-text)", borderColor: "var(--cc-gold-line)" }}
                _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
              >
                <X size={16} strokeWidth={1.75} />
              </Flex>
            </Flex>

            {istVideo && c.videoUrl ? (
              <GlassVideoPlayer src={c.videoUrl} poster={c.poster} />
            ) : c.bild ? (
              <Box
                as="img"
                src={c.bild}
                alt={`${c.name ? `${c.name}: ` : ""}${c.titel.replace(/[{}]/g, "")}`}
                w="100%"
                maxH="72vh"
                objectFit="contain"
                borderRadius="10px"
                bg="rgba(0, 0, 0, 0.35)"
              />
            ) : null}

            <Text mt={4} fontSize="15px" lineHeight={1.55} color="var(--cc-text-2)" textAlign="center">
              {akzentZahl(c.titel)}
            </Text>
          </ModalBody>
        ) : null}
      </ModalContent>
    </Modal>
  );
}
