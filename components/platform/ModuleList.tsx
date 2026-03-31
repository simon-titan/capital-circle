import { Stack, Text } from "@chakra-ui/react";

export function ModuleList({ modules }: { modules: string[] }) {
  return (
    <Stack>
      {modules.map((item) => (
        <Text key={item}>{item}</Text>
      ))}
    </Stack>
  );
}
