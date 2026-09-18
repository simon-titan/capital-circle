import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  // v3.2: Inter für alles — auch Überschriften und Zahlen (tabellarische Ziffern über `.cc-num`).
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'Inter', system-ui, sans-serif",
  },
  colors: {
    // v3.2 „Champagner auf Graphit“ (DESIGN.md) — brand.500 = --cc-gold
    brand: {
      // = --cc-bg. Chakra setzt daraus `body { background }` und überschreibt
      // damit die Regel aus globals.css — der Wert muss hier mitgezogen werden,
      // sonst steht der Seitengrund heller als der Himmel darüber.
      bg: "#0f1317",
      bgSecondary: "#151a1e",
      textPrimary: "#f2f3f5",
      /** @deprecated Nutze brand.500 */
      accentBlue: "#D4B080",
      // Chakra nimmt im Dark Mode meist Stufe 200 (Switch, Checkbox, Tabs) — daher = --cc-gold-light.
      50: "#FBF6EF",
      100: "#F3E4CC",
      200: "#E8C094",
      300: "#DEB98A",
      400: "#D9B485",
      500: "#D4B080",
      600: "#B8935F",
      700: "#9A7A4C",
      800: "#6E5736",
      900: "#4A3B25",
    },
  },
  radii: {
    card: "12px",
    button: "8px",
    modal: "24px",
  },
  shadows: {
    // Fokus-Ring (Chakra `_focusVisible: { boxShadow: "outline" }`) in Brand-Gold statt Chakra-Blau.
    outline: "0 0 0 2px rgba(212, 176, 128, 0.75)",
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
    // Chakra-Standardfarbe Blau → Champagner, wo kein colorScheme gesetzt ist.
    Switch: { defaultProps: { colorScheme: "brand" } },
    Checkbox: { defaultProps: { colorScheme: "brand" } },
    Radio: { defaultProps: { colorScheme: "brand" } },
    Progress: { defaultProps: { colorScheme: "brand" } },
    Slider: { defaultProps: { colorScheme: "brand" } },
    Tabs: { defaultProps: { colorScheme: "brand" } },
    /** Toasts (Alert „solid“): Graphit-Panel, Status nur über das Icon (Grün/Rot semantisch, sonst Champagner). */
    Alert: {
      variants: {
        solid: (props: { colorScheme?: string }) => {
          const tone =
            props.colorScheme === "green"
              ? "var(--cc-success)"
              : props.colorScheme === "red"
                ? "var(--cc-danger)"
                : "var(--cc-gold)";
          return {
            container: {
              bg: "var(--cc-panel-solid)",
              color: "var(--cc-text)",
              border: "1px solid",
              borderColor: "var(--cc-line-strong)",
              borderRadius: "10px",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
            },
            icon: { color: tone },
            spinner: { color: tone },
          };
        },
      },
    },
    Button: {
      baseStyle: {
        fontFamily: "'Inter', sans-serif",
        borderRadius: "button",
      },
      variants: {
        /** Die Hauptaktion: Gold-Verlauf mit Glow (DESIGN.md). */
        gold: {
          bg: "var(--cc-gold)",
          bgImage: "var(--cc-gold-grad)",
          color: "var(--cc-on-gold)",
          fontWeight: 600,
          borderRadius: "8px",
          boxShadow: "0 6px 18px rgba(212, 176, 128, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
          transition: "transform 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease), filter 180ms var(--cc-ease)",
          _hover: {
            filter: "brightness(1.06)",
            transform: "translateY(-1px)",
            boxShadow: "0 0 26px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
            _disabled: { filter: "none", transform: "none" },
          },
          _active: { transform: "translateY(0)", filter: "brightness(0.96)" },
        },
        /** Sekundäre Aktion: Haarlinie, beim Hover mit Gold-Kante. */
        line: {
          bg: "rgba(255, 255, 255, 0.02)",
          color: "var(--cc-text)",
          border: "1px solid",
          borderColor: "var(--cc-line-strong)",
          fontWeight: 500,
          borderRadius: "8px",
          transition: "background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
          _hover: {
            bg: "rgba(212, 176, 128, 0.06)",
            borderColor: "var(--cc-gold-line)",
            boxShadow: "0 0 18px rgba(212, 176, 128, 0.12)",
          },
          _active: { bg: "rgba(212, 176, 128, 0.1)" },
        },
      },
    },
  },
});
