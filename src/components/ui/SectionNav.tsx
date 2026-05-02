"use client";

/**
 * SectionNav — Minimal Grok-style vertical navigator
 *
 * Design:
 *  - Small vertical dashes (not dots, not pills)
 *  - Active: longer dash + pink glow, no jarring color change
 *  - Hover: section label slides in from the right
 *  - No container, no border, no glass, no numbers
 *  - Sits flush against the right edge, ultra-unobtrusive
 *
 * Performance:
 *  - GSAP ticker for scroll-spy (no scroll listener overhead)
 *  - GPU-only: transform + opacity only, no layout properties
 *  - memo() on every sub-component to prevent cascade re-renders
 */

import { useEffect, useRef, useState, useCallback, memo } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NavSection {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: NavSection[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SCROLL_DURATION = 1.0;
const TICK_THROTTLE   = 16; // ms — caps read to ~60fps

// ─── Single dash item ─────────────────────────────────────────────────────────
interface DashProps {
  section: NavSection;
  isActive: boolean;
  onClick: (id: string) => void;
}

const Dash = memo(function Dash({ section, isActive, onClick }: DashProps) {
  const lineRef  = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);

  // ── Active state animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!lineRef.current) return;

    if (isActive) {
      gsap.to(lineRef.current, {
        width: 22,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });
    } else {
      gsap.to(lineRef.current, {
        width: 10,
        opacity: hovered ? 0.55 : 0.2,
        duration: 0.35,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    }
  }, [isActive, hovered]);

  // ── Hover label ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!labelRef.current) return;

    if (hovered) {
      gsap.fromTo(
        labelRef.current,
        { opacity: 0, x: 6 },
        { opacity: 1, x: 0, duration: 0.22, ease: "power2.out", overwrite: "auto" }
      );
    } else {
      gsap.to(labelRef.current, {
        opacity: 0,
        x: 6,
        duration: 0.18,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
  }, [hovered]);

  const handlePointerEnter = useCallback(() => setHovered(true),  []);
  const handlePointerLeave = useCallback(() => setHovered(false), []);
  const handleClick        = useCallback(() => onClick(section.id), [onClick, section.id]);

  return (
    <button
      aria-label={`Go to ${section.label}`}
      aria-current={isActive ? "true" : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{
        // Reset
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        // Layout — right-aligned row
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        // Touch target (min 44px)
        minHeight: 44,
        minWidth: 44,
      }}
    >
      {/* Label — only visible on hover */}
      <span
        ref={labelRef}
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: isActive ? "rgba(255,152,162,0.9)" : "rgba(255,255,255,0.55)",
          opacity: 0,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          willChange: "opacity, transform",
        }}
      >
        {section.label}
      </span>

      {/* The dash */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: 2,
          width: 32, // outer hit area
        }}
      >
        {/* Glow — only on active */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              right: 0,
              width: 22,
              height: 8,
              borderRadius: 4,
              background: "rgba(255,152,162,0.25)",
              filter: "blur(4px)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* The animated line */}
        <div
          ref={lineRef}
          style={{
            position: "absolute",
            right: 0,
            height: 2,
            width: 10,               // GSAP animates this
            borderRadius: 2,
            background: isActive
              ? "linear-gradient(90deg, rgba(255,152,162,0.4) 0%, #ff98a2 100%)"
              : "rgba(255,255,255,0.35)",
            opacity: 0.2,
            willChange: "width, opacity",
            transition: "background 0.3s ease",
          }}
        />
      </div>
    </button>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
export const SectionNav = memo(function SectionNav({ sections }: SectionNavProps) {
  const [activeIndex, setActiveIndex]   = useState(0);
  const wrapperRef                      = useRef<HTMLDivElement>(null);
  const lastTickRef                     = useRef(0);
  const isNavigatingRef                 = useRef(false);

  // ── Scroll spy via GSAP ticker ────────────────────────────────────────────
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id));

    const tick = (time: number) => {
      if (time - lastTickRef.current < TICK_THROTTLE) return;
      lastTickRef.current = time;
      if (isNavigatingRef.current) return;

      const mid = window.scrollY + window.innerHeight * 0.45;
      let best = 0, bestDist = Infinity;

      els.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const elMid = window.scrollY + r.top + r.height * 0.5;
        const dist  = Math.abs(mid - elMid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });

      setActiveIndex((prev) => prev !== best ? best : prev);
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [sections]);

  // ── Click navigation ───────────────────────────────────────────────────────
  const handleClick = useCallback((id: string) => {
    const el  = document.getElementById(id);
    const idx = sections.findIndex((s) => s.id === id);
    if (!el) return;

    isNavigatingRef.current = true;
    if (idx !== -1) setActiveIndex(idx);

    gsap.to(window, {
      scrollTo: { y: el, offsetY: 0 },
      duration: SCROLL_DURATION,
      ease: "power3.out",
      onComplete: () => {
        setTimeout(() => { isNavigatingRef.current = false; }, 150);
      },
    });
  }, [sections]);

  // ── Entrance ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(
      wrapperRef.current,
      { opacity: 0, x: 12 },
      { opacity: 1, x: 0, duration: 1.0, ease: "power3.out", delay: 1.0 }
    );
  }, []);

  return (
    <nav
      ref={wrapperRef}
      aria-label="Section navigation"
      style={{
        position: "fixed",
        right: "clamp(12px, 2vw, 24px)",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "clamp(2px, 0.8vh, 6px)",
        opacity: 0,            // GSAP handles entrance
        willChange: "opacity, transform",
      }}
    >
      {sections.map((section, i) => (
        <Dash
          key={section.id}
          section={section}
          isActive={i === activeIndex}
          onClick={handleClick}
        />
      ))}
    </nav>
  );
});
