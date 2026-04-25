"use client";

import { Center, Spinner } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkyArchBackground } from "@/components/layout/SkyArchBackground";
import { CodexStep } from "@/components/onboarding/CodexStep";
import { IntroVideoStep } from "@/components/onboarding/IntroVideoStep";
import { LoginStep } from "@/components/onboarding/LoginStep";
import { UsageAgreementStep } from "@/components/onboarding/UsageAgreementStep";

const easePremium = [0.16, 1, 0.3, 1] as const;

type Phase = "loading" | "login" | "codex" | "intro" | "agreement";

type OnboardingFlowProps = {
  loginFooter?: ReactNode;
};

export function OnboardingFlow({ loginFooter }: OnboardingFlowProps = {}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");

  const resolvePhase = useCallback(async () => {
    setPhase("loading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("codex_accepted, intro_video_watched, usage_agreement_accepted")
      .eq("id", user.id)
      .single();
    if (!profile?.codex_accepted) {
      setPhase("codex");
      return;
    }
    if (!profile?.intro_video_watched) {
      setPhase("intro");
      return;
    }
    if (!profile?.usage_agreement_accepted) {
      setPhase("agreement");
      return;
    }
    router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    void resolvePhase();
  }, [resolvePhase]);

  return (
    <SkyArchBackground>
      {phase === "loading" ? (
        <Center minH="100vh">
          <Spinner size="xl" color="brand.400" thickness="3px" speed="0.85s" />
        </Center>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: 36, filter: "blur(14px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -32, filter: "blur(12px)" }}
            transition={{ duration: 0.48, ease: easePremium }}
            style={{ minHeight: "100vh" }}
          >
            {phase === "login" && <LoginStep onAuthenticated={resolvePhase} footer={loginFooter} />}
            {phase === "codex" && <CodexStep onCompleted={() => setPhase("intro")} />}
            {phase === "intro" && <IntroVideoStep onCompleted={() => setPhase("agreement")} />}
            {phase === "agreement" && <UsageAgreementStep />}
          </motion.div>
        </AnimatePresence>
      )}
    </SkyArchBackground>
  );
}
