"use client";

import { Icon } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { FaApple } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";

type BrandIconProps = {
  boxSize?: string | number;
};

/** Klassisches Google-„G“ (farbig), kein Produkt-Icon. */
export function GoogleCalendarBrandIcon({ boxSize = "18px" }: BrandIconProps) {
  return <Icon as={FcGoogle as IconType} boxSize={boxSize} aria-hidden />;
}

/** Apple-Logo für Kalender-Export (.ics). */
export function AppleBrandIcon({ boxSize = "18px" }: BrandIconProps) {
  return <Icon as={FaApple as IconType} boxSize={boxSize} color="currentColor" aria-hidden />;
}
