import { Box } from "@chakra-ui/react";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { TopBarDynamic, TradingViewDynamic } from "@/components/platform/PlatformShell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformBackground>
      <Box minH="100vh" data-platform>
        <TopBarDynamic />
        <TradingViewDynamic />
        <Box as="main" maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} pb={12} pt={{ base: 6, md: 8 }}>
          {children}
        </Box>
      </Box>
    </PlatformBackground>
  );
}
