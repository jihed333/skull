"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth, buttery spring physics for the outer ring
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Hide native cursor completely on desktop
    document.documentElement.classList.add("hide-native-cursor");

    const moveCursor = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);

    // Magnetic snap logic based on ANY clickable element
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName && target.tagName.toLowerCase() === "a") ||
        (target.tagName && target.tagName.toLowerCase() === "button") ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("magnetic")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleMouseOver);
      document.documentElement.classList.remove("hide-native-cursor");
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler); // fallback for older browsers
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  if (isMobile) {
    return null; // Do not show on mobile
  }

  return (
    <>
      {/* Inner Dot */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[99999]"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: "difference",
          opacity: isVisible ? 1 : 0
        }}
      />
      {/* Outer physics-driven ring */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 border border-white/40 rounded-full pointer-events-none z-[99999] flex items-center justify-center font-mono text-[8px] uppercase tracking-widest text-white backdrop-blur-sm"
        animate={{
          width: isHovered ? 64 : 32,
          height: isHovered ? 64 : 32,
          opacity: isVisible ? (isHovered ? 1 : 0.6) : 0,
          background: isHovered ? "rgba(255,255,255,0.05)" : "transparent"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: isHovered ? "difference" : "normal"
        }}
      >
        <motion.span
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.5 }}
          className="whitespace-nowrap mix-blend-difference"
        >
          View
        </motion.span>
      </motion.div>
    </>
  );
}
