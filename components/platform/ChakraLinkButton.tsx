"use client";

import { Button, type ButtonProps } from "@chakra-ui/react";
import Link from "next/link";

type ChakraLinkButtonProps = Omit<ButtonProps, "as"> & {
  href: string;
};

/** Chakra-Button als Next-Link — nur in Client-Komponenten (nicht `as={Link}` aus RSC). */
export function ChakraLinkButton({ href, children, ...props }: ChakraLinkButtonProps) {
  return (
    <Button as={Link} href={href} {...props}>
      {children}
    </Button>
  );
}
