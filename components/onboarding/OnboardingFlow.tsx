"use client";

import { Center, Spinner } from "@chakra-ui/react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isFreeMember } from "@/lib/membership";
import { SkyArchBackground } from "@/components/layout/SkyArchBackground";
import { CodexStep } from "@/components/onboarding/CodexStep";
import { LoginStep } from "@/components/onboarding/LoginStep";
import { UsageAgreementStep } from "@/components/onboarding/UsageAgreementStep";

const easePremium = [0.16, 1, 0.3, 1] as const;

/** Schrittwechsel: seitlich mit Weichzeichnung. */
const stepVariants: Variants = {
  initial: { opacity: 0, x: 36, filter: "blur(14px)" },
  // Kein Rest-Filter: sonst verlieren die Glas-Karten ihren Blur auf das Sternenfeld.
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: { opacity: 0, x: -32, filter: "blur(12px)" },
};

/** Bei `prefers-reduced-motion` nur überblenden. */
const reducedStepVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

type Phase = "loading" | "login" | "codex" | "agreement";

type OnboardingFlowProps = {
  loginFooter?: ReactNode;
};

/** Nächster Schritt nach Session- und Profilprüfung; „dashboard“ = weiterleiten. */
type Resolution = Exclude<Phase, "loading"> | "dashboard";

async function resolveOnboarding(): Promise<Resolution> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "login";
  const { data: profile } = await supabase
    .from("profiles")
    .select("codex_accepted, usage_agreement_accepted, is_paid, membership_tier")
    .eq("id", user.id)
    .single();
  if (isFreeMember(profile)) return "dashboard";
  if (!profile?.codex_accepted) return "codex";
  if (!profile?.usage_agreement_accepted) return "agreement";
  return "dashboard";
}

export function OnboardingFlow({ loginFooter }: OnboardingFlowProps = {}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("loading");

  const applyResolution = useCallback(
    (next: Resolution) => {
      if (next === "dashboard") {
        router.replace("/dashboard");
        return;
      }
      setPhase(next);
    },
    [router],
  );

  /** Nach dem Login: Ladezustand zeigen und erneut prüfen. */
  const resolvePhase = useCallback(async () => {
    setPhase("loading");
    applyResolution(await resolveOnboarding());
  }, [applyResolution]);

  // Beim ersten Rendern steht die Phase schon auf „loading“; State erst im Callback setzen.
  useEffect(() => {
    let cancelled = false;
    void resolveOnboarding().then((next) => {
      if (!cancelled) applyResolution(next);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResolution]);

  return (
    <SkyArchBackground>
      {phase === "loading" ? (
        <Center minH="100vh">
          <Spinner
            size="xl"
            color="var(--cc-gold)"
            emptyColor="rgba(255, 255, 255, 0.08)"
            thickness="3px"
            speed="0.85s"
            label="Wird geladen"
          />
        </Center>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            variants={reduceMotion ? reducedStepVariants : stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.2 : 0.48, ease: easePremium }}
            style={{ minHeight: "100vh" }}
          >
            {phase === "login" && <LoginStep onAuthenticated={resolvePhase} footer={loginFooter} />}
            {phase === "codex" && <CodexStep onCompleted={() => setPhase("agreement")} />}
            {phase === "agreement" && <UsageAgreementStep />}
          </motion.div>
        </AnimatePresence>
      )}
    </SkyArchBackground>
  );
}
