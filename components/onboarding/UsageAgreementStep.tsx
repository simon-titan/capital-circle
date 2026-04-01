"use client";

import { Box, Button, Checkbox, Stack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";
import { usageAgreementLeadParagraphs, usageAgreementSections } from "@/components/onboarding/usageAgreementContent";
import { type HTMLChakraProps } from "@chakra-ui/react";

const MotionBox = motion<HTMLChakraProps<"div">>(Box);

/** Rendert *hervorgehobenen* Text als kursiv; `emphasisColor` optional für dezentere Leads. */
function TextWithEmphasis({
  text,
  baseProps,
  emphasisColor = "rgba(253, 230, 138, 0.95)",
}: {
  text: string;
  baseProps: HTMLChakraProps<"p">;
  emphasisColor?: string;
}) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text {...baseProps}>
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <Text as="em" key={i} fontStyle="italic" color={emphasisColor}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </Text>
  );
}

export function UsageAgreementStep() {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const canContinue = useMemo(() => accepted, [accepted]);

  const textProps: HTMLChakraProps<"p"> = {
    fontSize: { base: "sm", md: "md" },
    className: "inter",
    color: "rgba(248, 250, 252, 0.92)",
    lineHeight: "1.6",
  };

  const leadTextProps: HTMLChakraProps<"p"> = {
    fontSize: { base: "xs", md: "sm" },
    className: "inter",
    color: "rgba(240, 240, 242, 0.62)",
    lineHeight: "1.32",
    textAlign: "center",
  };

  const onConfirm = async () => {
    setError(null);
    setSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSaving(false);
      setError("Keine aktive Session gefunden. Bitte erneut einloggen.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        usage_agreement_accepted: true,
        usage_agreement_accepted_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    if (updateError) {
      setSaving(false);
      setError(`Vereinbarung konnte nicht gespeichert werden: ${updateError.message}`);
      return;
    }

    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("usage_agreement_accepted")
      .eq("id", data.user.id)
      .single();

    if (!profileCheck?.usage_agreement_accepted) {
      setSaving(false);
      setError("Profil wurde nicht gefunden. Bitte Migration fuer Profile/RLS pruefen.");
      return;
    }

    setSaving(false);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <Stack
      minH="100dvh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 5 }}
      overflowY={{ base: "auto", md: "hidden" }}
    >
      <Stack
        className="glass-card"
        p={{ base: 6, md: 8 }}
        maxW="800px"
        w="full"
        gap={{ base: 5, md: 6 }}
        borderColor="rgba(255, 255, 255, 0.12)"
        boxShadow="0 8px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
        flexDir="column"
        minH={0}
        h={{ base: "auto", md: "calc(100dvh - 40px)" }}
        maxH={{ base: "none", md: "calc(100dvh - 40px)" }}
        overflow="hidden"
      >
        <MotionBox
          style={{ flexShrink: 0 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Stack spacing={{ base: 4, md: 5 }} align="center" textAlign="center">
            <Box display="flex" justifyContent="center" px={{ base: 1, md: 2 }} w="full">
              <Box position="relative" w="full" maxW={{ base: "280px", sm: "320px", md: "380px" }}>
                <Image
                  src="/logo/logo-agreement.png"
                  alt="Capital Circle Vereinbarung"
                  width={760}
                  height={280}
                  priority
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </Box>
            </Box>
            <Stack spacing={1.5}>
              {usageAgreementLeadParagraphs.map((p) => (
                <TextWithEmphasis
                  key={p}
                  text={p}
                  baseProps={leadTextProps}
                  emphasisColor="rgba(212, 175, 55, 0.55)"
                />
              ))}
            </Stack>
          </Stack>
        </MotionBox>

        <Box
          flex={{ base: "none", md: "1 1 0" }}
          minH={{ base: "auto", md: 0 }}
          maxH={{ base: "min(52vh, 480px)", md: "none" }}
          overflowY="auto"
          borderRadius="16px"
          border="1px solid rgba(255, 255, 255, 0.1)"
          bg="linear-gradient(165deg, rgba(28, 28, 30, 0.72) 0%, rgba(12, 12, 14, 0.78) 100%)"
          backdropFilter="blur(20px) saturate(1.05)"
          sx={{
            WebkitBackdropFilter: "blur(20px) saturate(1.05)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 24px rgba(0, 0, 0, 0.35)",
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255,255,255,0.14)",
              borderRadius: "999px",
            },
          }}
          px={{ base: 4, md: 6 }}
          py={{ base: 4, md: 5 }}
        >
          <Stack spacing={5}>
            {usageAgreementSections.map((section) => (
              <Box key={section.heading}>
                <Text
                  fontSize={{ base: "sm", md: "md" }}
                  fontWeight="700"
                  className="inter-semibold"
                  color="rgba(253, 230, 138, 0.95)"
                  mb={2}
                >
                  {section.heading}
                </Text>
                <Stack spacing={3}>
                  {section.blocks.map((block, bi) => (
                    <TextWithEmphasis
                      key={`${section.heading}-${bi}`}
                      text={block}
                      baseProps={{
                        ...textProps,
                        whiteSpace: "pre-line",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Stack spacing={3} flexShrink={0} w="full">
        <Box
          borderRadius="20px"
          p={{ base: 5, md: 6 }}
          border="2px solid"
          borderColor={accepted ? "rgba(212, 175, 55, 0.55)" : "rgba(255, 255, 255, 0.18)"}
          bg={accepted ? "rgba(212, 175, 55, 0.12)" : "rgba(255, 255, 255, 0.03)"}
          backdropFilter="blur(22px) saturate(1.4)"
          sx={{
            WebkitBackdropFilter: "blur(22px) saturate(1.4)",
            boxShadow: accepted
              ? "0 0 40px rgba(212, 175, 55, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            transition: "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
          }}
        >
          <Checkbox
            isChecked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            colorScheme="brand"
            size="lg"
            w="full"
            flexDirection="column"
            alignItems="center"
            gap={4}
            sx={{
              ".chakra-checkbox__label": {
                marginInlineStart: "0 !important",
                width: "100%",
                textAlign: "center",
              },
              ".chakra-checkbox__control": {
                w: "28px",
                h: "28px",
                borderWidth: "2px",
              },
            }}
          >
            <Stack spacing={2} align="center" maxW="lg" mx="auto">
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="600" className="inter-semibold" color="rgba(248, 250, 252, 0.98)">
                Ich akzeptiere diese Vereinbarung
              </Text>
              <Text fontSize="sm" className="inter" color="rgba(240, 240, 242, 0.55)" lineHeight="1.55">
                Mit dem Haken bestätigst du, den Text gelesen zu haben und an die Bedingungen gebunden zu sein.
              </Text>
            </Stack>
          </Checkbox>
        </Box>

        {error ? (
          <Text fontSize="sm" color="red.300" textAlign="center">
            {error}
          </Text>
        ) : null}
        <Button {...glassPrimaryButtonProps} isDisabled={!canContinue} onClick={onConfirm} isLoading={saving}>
          Zur Plattform
        </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
