"use client";

import { motion } from "motion/react";
import { SPRINGS } from "@/components/game/springs";

// A headline whose words pop in one after another.
export function PopHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h1 className="font-display text-5xl leading-[1.05] font-bold text-ink-900 sm:text-7xl" aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...SPRINGS.bouncy, delay: 0.1 + i * 0.12 }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}
