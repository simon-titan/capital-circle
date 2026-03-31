import { Button, type ButtonProps } from "@chakra-ui/react";

export function GlowButton(props: ButtonProps) {
  return (
    <Button
      bg="linear-gradient(135deg, var(--color-accent-gold-light), var(--color-accent-gold))"
      color="#0a0a0a"
      fontWeight={600}
      _hover={{ boxShadow: "0 0 24px var(--color-accent-glow)" }}
      {...props}
    />
  );
}
