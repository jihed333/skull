"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroTextProps {
  roles?: string[];
  className?: string;
}

export default function HeroText({
  roles = ["CREATIVE DEVELOPER", "FRONTEND PSYCHOPATH"],
  className = "",
}: HeroTextProps) {
  const [index, setIndex] = useState(0);

  // Automatically switch roles every 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % roles.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [roles.length]);

  const text = roles[index];
  const characters = text.split("");

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="flex items-center whitespace-nowrap"
        >
          {characters.map((char, i) => (
            <div
              key={i}
              className="relative overflow-hidden group"
              style={{ padding: "0 0.02em" }}
            >
              {/* Main Character */}
              <motion.span
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: i * 0.03 + 0.2, duration: 0.6 }}
                className="inline-block"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>

              {/* Top Slice Layer */}
              <motion.span
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "100%", opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.03,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 z-10 pointer-events-none text-[#ff98a2]"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 35%, 0 35%)" }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>

              {/* Middle Slice Layer */}
              <motion.span
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: "-100%", opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.03 + 0.1,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 z-10 pointer-events-none text-white/80"
                style={{ clipPath: "polygon(0 35%, 100% 35%, 100% 65%, 0 65%)" }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>

              {/* Bottom Slice Layer */}
              <motion.span
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "100%", opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.03 + 0.2,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 z-10 pointer-events-none text-[#ff98a2]"
                style={{ clipPath: "polygon(0 65%, 100% 65%, 100% 100%, 0 100%)" }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
