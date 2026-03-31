"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Routen mit gemeinsamem „Sky-Arch“-Erlebnis — cinematische Übergänge. */
const IMMERSIVE_PATHS = new Set(["/einsteig"]);

const easePremium = [0.16, 1, 0.3, 1] as const;

const pageVariants = {
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
  },
  exit: {
    opacity: 0,
    y: -32,
    scale: 1.04,
    filter: "blur(12px)",
  },
};

export function ImmersiveRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname ? IMMERSIVE_PATHS.has(pathname) : false;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!immersive || reduceMotion) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        isolation: "isolate",
        overflowX: "hidden",
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
