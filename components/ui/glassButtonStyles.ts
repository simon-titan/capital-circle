/** Gemeinsame Styles für primäre Glass-CTAs (Login, Onboarding). */
export const glassPrimaryButtonProps = {
  variant: "unstyled" as const,
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minH: "44px",
  w: "full",
  fontWeight: "600",
  fontSize: "md",
  borderRadius: "12px",
  color: "#0a0a0a",
  bg: "rgba(212, 175, 55, 0.28)",
  borderWidth: "1px",
  borderColor: "rgba(212, 175, 55, 0.5)",
  backdropFilter: "blur(16px)",
  sx: { WebkitBackdropFilter: "blur(16px)" },
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  _hover: {
    bg: "rgba(212, 175, 55, 0.42)",
    borderColor: "rgba(232, 197, 71, 0.65)",
  },
  _active: {
    bg: "rgba(166, 124, 0, 0.45)",
  },
  _disabled: {
    opacity: 1,
    bg: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.35)",
    cursor: "not-allowed",
  },
};
