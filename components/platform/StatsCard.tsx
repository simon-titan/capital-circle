import { Text } from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";

export function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard>
      <Text className="dm-sans" opacity={0.8}>
        {label}
      </Text>
      <Text mt={2} fontSize="xl" className="jetbrains-mono">
        {value}
      </Text>
    </GlassCard>
  );
}
