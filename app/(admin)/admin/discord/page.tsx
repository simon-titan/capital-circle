import { Box, Heading } from "@chakra-ui/react";
import { AdminDiscordManager } from "@/components/admin/AdminDiscordManager";

export default function AdminDiscordPage() {
  return (
    <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Heading
        as="h1"
        className="radley-regular"
        fontWeight={400}
        fontSize={{ base: "2xl", md: "3xl" }}
        color="whiteAlpha.950"
        mb={8}
      >
        Discord Übersicht
      </Heading>
      <AdminDiscordManager />
    </Box>
  );
}
