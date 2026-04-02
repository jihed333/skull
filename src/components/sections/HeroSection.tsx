"use client";

import React, { useEffect, useState } from "react";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import RoleSwitcher from "@/components/ui/hero-shutter-text";

export function HeroSection() {
  const [scrollProgress, setScrollProgress] = useState(0);

  /* Scroll progress for fade/vertical drift */
  useEffect(() => {
    const handleScroll = () => {
      const p = Math.max(0, Math.min(1, window.scrollY / window.innerHeight));
      setScrollProgress(p);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Cinematic fade */
  const fadeStart = 0.35;
  const fadeEnd = 0.78;
  let textOpacity = 1;
  if (scrollProgress > fadeEnd) textOpacity = 0;
  else if (scrollProgress > fadeStart) {
    const t = (scrollProgress - fadeStart) / (fadeEnd - fadeStart);
    textOpacity = 1 - t * t * t;
  }

  const translateY = scrollProgress * -60; // subtle vertical drift

  return (
    <section id="hero" className="relative overflow-hidden min-h-[100dvh] w-full">
      {/* ── Name + Role Container ── */}
      <div
        className="absolute left-0 top-0 h-full flex items-center"
        style={{
          width: "clamp(280px, 80vw, 760px)",
          paddingLeft: "clamp(1rem, 5vw, 8rem)",
          paddingRight: "1rem",
          transform: `translateY(${translateY}px)`,
          opacity: textOpacity,
          willChange: "transform, opacity",
          transition: "opacity 0.05s linear",
          zIndex: 20,
          pointerEvents: textOpacity > 0.05 ? "auto" : "none",
        }}
      >
        <div className="flex flex-col gap-3 w-full" style={{ userSelect: "none" }}>
          {/* Name */}
          <div
            style={{
              width: "100%",
              height: "clamp(80px, 12vw, 160px)",
            }}
          >
            <TextHoverEffect text="Jihed Hagui" duration={0.5} />
          </div>

          {/* Role with cinematic staggered animation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "0.5rem",
              paddingLeft: "0.15rem",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "1px",
                background: "linear-gradient(to right, #ff98a2, transparent)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "clamp(9px, 1.1vw, 12px)",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                display: "inline-block",
              }}
            >
              <RoleSwitcher />
            </span>
          </div>
        </div>
      </div>

      {/* ── Scroll Cue ── */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          opacity: textOpacity * 0.7,
          transform: `translateX(-50%) translateY(${translateY * 0.3}px)`,
          willChange: "opacity, transform",
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: "9px",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          Scroll
        </span>

        <div
          style={{
            width: "1px",
            height: "36px",
            background:
              "linear-gradient(to bottom, rgba(255,152,162,0.5), transparent)",
            animation: "pulse 2.2s ease-in-out infinite",
          }}
        />
      </div>
    </section>
  );
}