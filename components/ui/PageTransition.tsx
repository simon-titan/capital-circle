"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

const MotionDiv = motion.div;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </MotionDiv>
  );
}
