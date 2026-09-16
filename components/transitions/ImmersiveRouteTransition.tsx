"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";

/** Routen mit gemeinsamem Einstiegserlebnis (Sternenfeld-Grund) — cinematische Übergänge. */
const IMMERSIVE_PATHS = new Set(["/einsteig"]);

const easePremium = [0.16, 1, 0.3, 1] as const;

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.93,
    filter: "blur(16px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    // Kein Rest-Filter: sonst wird der Wrapper Containing Block für `fixed`-Ebenen (Sternenfeld).
    transitionEnd: { filter: "none" },
  },
  exit: {
    opacity: 0,
    y: -32,
    scale: 1.04,
    filter: "blur(12px)",
  },
};

/** Bei `prefers-reduced-motion` ohne Animation (`useReducedMotion` reagiert live auf die Einstellung). */
export function ImmersiveRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname ? IMMERSIVE_PATHS.has(pathname) : false;
  const reduceMotion = useReducedMotion();

  if (!immersive || reduceMotion) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        isolation: "isolate",
        overflowX: "clip",
        background: "var(--cc-bg)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.62,
            ease: easePremium,
          }}
          style={{
            minHeight: "100vh",
            width: "100%",
            transformOrigin: "50% 40%",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
