"use client";

import { Box, Flex, Grid, GridItem, HStack, Stack, Text } from "@chakra-ui/react";
import { Calendar, CheckCircle2, Clock, Mail, ArrowRight } from "lucide-react";
import NextLink from "next/link";

export interface Step2AppointmentData {
  status: string;
  calendlyBookedAt: string | null;
  calendlyEmailSentAt: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DashboardAppointmentCard({ data }: { data: Step2AppointmentData }) {
  const hasAppointment = Boolean(data.calendlyBookedAt);
  const emailSent = Boolean(data.calendlyEmailSentAt);

  return (
    <Box
      className={hasAppointment ? "appointment-card-glow-booked" : "appointment-card-glow"}
      borderRadius="18px"
      p={{ base: 5, md: 7 }}
      position="relative"
      overflow="hidden"
    >
      {/* Decorative background orb */}
      <Box
        position="absolute"
        top="-40px"
        right="-40px"
        w="220px"
        h="220px"
        borderRadius="full"
        bg={hasAppointment
          ? "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)"
        }
        pointerEvents="none"
        aria-hidden
      />

      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={{ base: 6, md: 8 }}
        alignItems="center"
      >
        {/* Left: Branding & Info */}
        <GridItem>
          <Stack spacing={4}>
            <HStack spacing={3} align="center">
              <Box
                w="48px"
                h="48px"
                borderRadius="14px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
                bg={hasAppointment
                  ? "linear-gradient(145deg, rgba(52,211,153,0.25) 0%, rgba(52,211,153,0.10) 100%)"
                  : "linear-gradient(145deg, rgba(212,175,55,0.30) 0%, rgba(212,175,55,0.12) 100%)"
                }
                border={`1px solid ${hasAppointment ? "rgba(52,211,153,0.45)" : "rgba(212,175,55,0.50)"}`}
                boxShadow={hasAppointment
                  ? "0 0 20px rgba(52,211,153,0.18), inset 0 1px 0 rgba(255,255,255,0.12)"
                  : "0 0 20px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.12)"
                }
              >
                <Calendar
                  size={22}
                  color={hasAppointment ? "#34D399" : "#D4AF37"}
                  strokeWidth={1.75}
                />
              </Box>
              <Box>
                <Text
                  className="inter-medium"
                  fontSize="xs"
                  letterSpacing="0.10em"
                  textTransform="uppercase"
                  color="rgba(255,255,255,0.45)"
                  mb={0.5}
                >
                  Bewerbungsgespräch
                </Text>
                <Text
                  className="radley-regular-italic"
                  fontSize={{ base: "lg", md: "xl" }}
                  color={hasAppointment ? "rgba(52,211,153,0.95)" : "var(--color-accent-gold-light)"}
                  lineHeight={1.25}
                >
                  {hasAppointment ? "Dein Termin steht." : "Dein nächster Schritt."}
                </Text>
              </Box>
            </HStack>

            <Text
              className="inter"
              fontSize="sm"
              color="rgba(245, 236, 210, 0.78)"
              lineHeight="1.7"
              maxW="44ch"
            >
              {hasAppointment
                ? "Wir freuen uns auf dich — sei bitte pünktlich und bereite dich gut vor. Das ist deine erste Chance."
                : "Du hast deine erweiterte Bewerbung eingereicht. Buche jetzt deinen persönlichen Gesprächstermin — das ist deine Chance, Teil des Capital Circle zu werden."}
            </Text>

            {emailSent && (
              <HStack spacing={2}>
                <Mail size={13} color="rgba(255,255,255,0.30)" />
                <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.38)">
                  Termin-Mail gesendet am {fmtDate(data.calendlyEmailSentAt)}
                </Text>
              </HStack>
            )}
          </Stack>
        </GridItem>

        {/* Right: Status & Action */}
        <GridItem>
          <Stack spacing={4}>
            {hasAppointment ? (
              <>
                {/* Booked state */}
                <Box
                  px={5}
                  py={4}
                  borderRadius="16px"
                  bg="rgba(52,211,153,0.07)"
                  border="1px solid rgba(52,211,153,0.22)"
                >
                  <HStack spacing={3} align="flex-start">
                    <Box mt="2px" flexShrink={0}>
                      <CheckCircle2 size={20} color="#34D399" />
                    </Box>
                    <Stack spacing={1}>
                      <Text className="inter-semibold" fontSize="sm" color="#34D399">
                        Termin gebucht
                      </Text>
                      <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.70)" lineHeight="1.5">
                        {fmtDate(data.calendlyBookedAt)}
                      </Text>
                    </Stack>
                  </HStack>
                </Box>

                <Box
                  px={5}
                  py={4}
                  borderRadius="16px"
                  bg="rgba(52,211,153,0.04)"
                  border="1px solid rgba(52,211,153,0.10)"
                >
                  <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.55)" lineHeight="1.65">
                    Bitte erscheine pünktlich und bereite kurz vor, warum du in den Capital Circle möchtest.
                    Wir freuen uns auf dich!
                  </Text>
                </Box>
              </>
            ) : (
              <>
                {/* Pending state */}
                <Box
                  px={5}
                  py={4}
                  borderRadius="16px"
                  bg="rgba(212,175,55,0.06)"
                  border="1px solid rgba(212,175,55,0.16)"
                >
                  <HStack spacing={3}>
                    <Clock size={18} color="rgba(212,175,55,0.70)" style={{ flexShrink: 0 }} />
                    <Stack spacing={0.5}>
                      <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold)">
                        Termin noch ausstehend
                      </Text>
                      <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.50)">
                        Buche deinen persönlichen Termin
                      </Text>
                    </Stack>
                  </HStack>
                </Box>

                <Box
                  as={NextLink}
                  href="/bewerbung/danke"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2.5}
                  px={5}
                  py={4}
                  borderRadius="14px"
                  bg="linear-gradient(135deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)"
                  color="#0a0a0a"
                  fontWeight={600}
                  fontSize="sm"
                  className="inter-semibold"
                  transition="all 200ms ease"
                  _hover={{
                    filter: "brightness(1.07)",
                    boxShadow: "0 0 28px rgba(212, 175, 55, 0.40)",
                    transform: "translateY(-1px)",
                  }}
                  textDecoration="none"
                >
                  <Calendar size={16} strokeWidth={2} />
                  Jetzt Termin buchen
                  <ArrowRight size={15} strokeWidth={2.2} />
                </Box>

                <Flex align="center" gap={2.5} px={1}>
                  <Box w="28px" h="1px" bg="rgba(255,255,255,0.10)" />
                  <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.35)" textAlign="center">
                    kostenlos & verbindlich
                  </Text>
                  <Box w="28px" h="1px" bg="rgba(255,255,255,0.10)" />
                </Flex>
              </>
            )}
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
}
