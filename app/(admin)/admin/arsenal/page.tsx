import { Stack, Text } from "@chakra-ui/react";
import { ArsenalManager } from "@/components/admin/ArsenalManager";

export default function AdminArsenalPage() {
  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Arsenal
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Tools, Fremdkapital, eigene Kategorien für Templates/PDFs sowie Datei-Uploads pro Modul/Video.
        </Text>
      </Stack>
      <ArsenalManager />
    </Stack>
  );
}
