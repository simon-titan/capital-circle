"use client";

import { Icon } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { FaApple, FaGoogle } from "react-icons/fa6";

type BrandIconProps = {
  boxSize?: string | number;
};

/** Google-„G“ einfarbig in Textfarbe — Fremdmarken stehen neutral (DESIGN.md). */
export function GoogleCalendarBrandIcon({ boxSize = "18px" }: BrandIconProps) {
  return <Icon as={FaGoogle as IconType} boxSize={boxSize} color="currentColor" aria-hidden />;
}

/** Apple-Logo für Kalender-Export (.ics). */
export function AppleBrandIcon({ boxSize = "18px" }: BrandIconProps) {
  return <Icon as={FaApple as IconType} boxSize={boxSize} color="currentColor" aria-hidden />;
}
