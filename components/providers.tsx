"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { theme } from "@/theme";
import { EmotionRegistry } from "./emotion-registry";

type ProvidersProps = {
  children: React.ReactNode;
};

/** Emotion-Registry außen: Sie muss auch Chakras globale Styles einsammeln (siehe `emotion-registry.tsx`). */
export function Providers({ children }: ProvidersProps) {
  return (
    <EmotionRegistry>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </EmotionRegistry>
  );
}
