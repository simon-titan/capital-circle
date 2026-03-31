import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: "'Radley', serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  colors: {
    brand: {
      bg: "#080808",
      bgSecondary: "#0f0f0f",
      textPrimary: "#f0f0f0",
      /** @deprecated Nutze brand.500 — gleicher Gold-Ton wie DESIGN.json */
      accentBlue: "#D4AF37",
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#E8C547",
      500: "#D4AF37",
      600: "#B8860B",
      700: "#A67C00",
      800: "#92400E",
      900: "#78350F",
    },
  },
  radii: {
    card: "12px",
    button: "8px",
    modal: "24px",
  },
  styles: {
    global: {
      body: {
        bg: "brand.bg",
        color: "brand.textPrimary",
        fontOpticalSizing: "auto",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontFamily: "'Inter', sans-serif",
        borderRadius: "button",
      },
    },
  },
});
