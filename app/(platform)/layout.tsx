import { Box } from "@chakra-ui/react";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { TradingViewMarketSummary } from "@/components/platform/TradingViewMarketSummary";
import { TopBar } from "@/components/platform/TopBar";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformBackground>
      <Box minH="100vh" data-platform>
        <TopBar />
        <TradingViewMarketSummary />
        <Box as="main" maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} pb={12} pt={{ base: 6, md: 8 }}>
          {children}
        </Box>
      </Box>
    </PlatformBackground>
  );
}
