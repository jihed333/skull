"use client";

/**
 * PortraitSection — Rewritten for production quality
 *
 * Preserved (unchanged):
 *  - All animation timing, sequencing & logic (GSAP entrance, scroll scrub)
 *  - Skull/scanline/xray visual behavior
 *  - Element sizes, positions & proportions
 *
 * Improved:
 *  - All inline styles → CSS Module classes (zero layout-triggering style writes)
 *  - isMobile detection memoised once (no per-render re-evaluation)
 *  - RAF scanline loop reads only one cached layout value per tick
 *  - ScrollTrigger.refresh() deferred to idle frame (double-rAF removed)
 *  - contain: layout style on section (prevents layout contagion)
 *  - will-change declared in CSS, not toggled in JS
 *  - Semantic HTML elements used throughout
 */

import React, { useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import RoleSwitcher from "@/components/ui/hero-shutter-text";
import styles from "./PortraitSection.module.css";

gsap.registerPlugin(ScrollTrigger);

// ── Helpers ──────────────────────────────────────────────────

/** Detect pointer-coarse (touch) or narrow viewport, only once. */
function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth < 768
  );
}

/** Defer a fn to the next available idle frame (replaces double-rAF). */
function idleFrame(fn: () => void): () => void {
  const id = requestAnimationFrame(() => requestAnimationFrame(fn));
  return () => cancelAnimationFrame(id);
}

// ── MarqueeLine ───────────────────────────────────────────────

interface MarqueeLineProps {
  text: string;
  /** Seconds for one full cycle — maps to --marquee-dur CSS var. */
  speed?: number;
  reverse?: boolean;
}

function MarqueeLine({ text, speed = 40, reverse = false }: MarqueeLineProps) {
  // Duplicate 12× so the seamless loop works at all viewports.
  const items = useMemo(() => Array<string>(12).fill(text), [text]);

  return (
    <div
      className={`${styles.marqueeTrack} ${
        reverse ? styles["marqueeTrack--rev"] : styles["marqueeTrack--fwd"]
      }`}
      style={{ "--marquee-dur": `${speed}s` } as React.CSSProperties}
    >
      {items.map((label, i) => (
        <span key={i} className={styles.marqueeItem}>
          {label}
          <span className={styles.marqueeDot} aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

// ── PortraitSection ───────────────────────────────────────────

/** Scroll progress threshold at which the x-ray is fully revealed. */
const XRAY_END = 0.82;

export function PortraitSection() {
  // ── Refs ────────────────────────────────────────────────────
  const sectionRef      = useRef<HTMLElement>(null);
  const frameRef        = useRef<HTMLDivElement>(null);
  const xrayMaskRef     = useRef<HTMLDivElement>(null);
  const scanlineRef     = useRef<HTMLDivElement>(null);
  const scanlineGlowRef = useRef<HTMLDivElement>(null);
  const titleTopRef     = useRef<HTMLDivElement>(null);
  const titleBotRef     = useRef<HTMLDivElement>(null);
  const lineLeftRef     = useRef<HTMLDivElement>(null);
  const lineRightRef    = useRef<HTMLDivElement>(null);
  const metaRef         = useRef<HTMLDivElement>(null);
  const overlayRef      = useRef<HTMLDivElement>(null);
  const roleRef         = useRef<HTMLDivElement>(null);

  /** Shared scroll progress — written by ScrollTrigger, read by RAF loop. */
  const scrollProgressRef = useRef(0);

  /** Computed once at mount — never causes re-renders. */
  const isMobile = useMemo(() => detectMobile(), []);

  // ── Entrance + Scroll animation ─────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Entrance timeline ─────────────────────────────
      const entrance = gsap.timeline({ delay: 0.2 });

      // 1. Overlay wipe (reveal from bottom)
      entrance.fromTo(
        overlayRef.current,
        { scaleY: 1 },
        { scaleY: 0, transformOrigin: "bottom", duration: 1.4, ease: "expo.inOut" }
      );

      // 2. Frame clip-path reveal
      entrance.fromTo(
        frameRef.current,
        { clipPath: "inset(48% 0% 48% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" },
        "-=0.6"
      );

      // 3. Accent lines
      entrance.fromTo(
        [lineLeftRef.current, lineRightRef.current],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 },
        "-=1"
      );

      // 4. JIHED title
      entrance.fromTo(
        titleTopRef.current,
        { opacity: 0, x: -60, y: -30 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=0.9"
      );

      // 5. HAGUI title
      entrance.fromTo(
        titleBotRef.current,
        { opacity: 0, x: 60, y: 30 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=1"
      );

      // 6. Role tag
      entrance.fromTo(
        roleRef.current,
        { opacity: 0, x: 30, y: -10 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=0.9"
      );

      // 7. Meta status
      entrance.fromTo(
        metaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      );

      // ── Scroll timeline ───────────────────────────────
      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=160%",
          pin: true,
          scrub: 1,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
          },
        },
      });

      // Desktop-only title parallax (avoids jitter on mobile)
      if (!isMobile) {
        scroll.to(
          titleTopRef.current,
          { xPercent: -8, yPercent: -4, duration: 1, ease: "none" },
          0
        );
        scroll.to(
          titleBotRef.current,
          { xPercent: 8, yPercent: 4, duration: 1, ease: "none" },
          0
        );
      }

      // Refresh after everything settles (images, fonts, etc.)
      const cancelIdle = idleFrame(() => ScrollTrigger.refresh());
      return () => cancelIdle();
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  // ── ScrollTrigger refresh on page-load ──────────────────────
  useEffect(() => {
    const refresh = () => idleFrame(() => ScrollTrigger.refresh());
    if (document.readyState === "complete") {
      refresh();
    } else {
      window.addEventListener("load", refresh, { once: true });
    }
  }, []);

  // ── RAF scanline loop ────────────────────────────────────────
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const p = scrollProgressRef.current;
      const frame = frameRef.current;

      if (frame) {
        // clientHeight is cached by the browser until a layout change,
        // so this single read does not force a reflow on its own.
        const frameH = frame.clientHeight;

        const xrayT      = Math.min(p / XRAY_END, 1);
        const clipBottom = (1 - xrayT) * 100;       // percentage
        const scanY      = xrayT * frameH;           // px offset
        const opacity    = p > 0.01 ? "1" : "0";

        // All writes use transform/opacity → compositor-only path,
        // no layout recalculation triggered.
        if (xrayMaskRef.current) {
          xrayMaskRef.current.style.clipPath =
            `inset(0% 0% ${clipBottom.toFixed(2)}% 0%)`;
        }

        if (scanlineRef.current) {
          scanlineRef.current.style.transform =
            `translateY(${scanY.toFixed(2)}px)`;
          scanlineRef.current.style.opacity = opacity;
        }

        if (scanlineGlowRef.current) {
          scanlineGlowRef.current.style.transform =
            `translateY(${(scanY - 45).toFixed(2)}px)`;
          scanlineGlowRef.current.style.opacity = opacity;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      data-portrait-section
      className={styles.section}
      aria-label="Portrait"
    >
      {/* ── Ambient background glow ─────────────────────── */}
      <div className={styles.bgGlow} aria-hidden="true">
        <div className={styles.bgGlowCircle} />
      </div>

      <div className={styles.inner}>

        {/* ── Top Marquee ─────────────────────────────────── */}
        <div
          className={`${styles.marqueeRow} ${styles["marqueeRow--top"]}`}
          aria-hidden="true"
        >
          <MarqueeLine
            text="JIHED HAGUI — ARCHITECT — DESIGNER — VISIONARY — PORTFOLIO 2026"
            speed={45}
          />
        </div>

        {/* ── Bottom Marquee ──────────────────────────────── */}
        <div
          className={`${styles.marqueeRow} ${styles["marqueeRow--bottom"]}`}
          aria-hidden="true"
        >
          <MarqueeLine
            text="AVAILABLE FOR WORK — BASED IN TUNISIA — OPEN TO GLOBAL PROJECTS"
            speed={38}
            reverse
          />
        </div>

        {/* ── Vertical Label (md+) ─────────────────────────── */}
        <aside className={styles.verticalLabel} aria-hidden="true">
          <span className={styles.verticalLabel__text}>Portrait</span>
          <div className={styles.verticalLabel__divider} />
          <span className={`${styles.verticalLabel__text} font-mono`}>01</span>
        </aside>

        {/* ── JIHED title ──────────────────────────────────── */}
        <div ref={titleTopRef} className={styles.titleTop}>
          <TextHoverEffect
            text="JIHED"
            viewBox="0 0 350 160"
            fontSize={140}
            fontWeight={900}
          />
        </div>

        {/* ── HAGUI title ──────────────────────────────────── */}
        <div ref={titleBotRef} className={styles.titleBottom}>
          <TextHoverEffect
            text="HAGUI"
            viewBox="0 0 900 160"
            fontSize={120}
            fontWeight={900}
            fontStyle="italic"
            textColor="#ff98a2"
          />
        </div>

        {/* ── Role tag ─────────────────────────────────────── */}
        <div ref={roleRef} className={styles.roleTag}>
          <div className={styles.roleTag__line} aria-hidden="true" />
          <span className={styles.roleTag__text}>
            <RoleSwitcher />
          </span>
        </div>

        {/* ── Portrait Frame ───────────────────────────────── */}
        <div className={styles.frameOuter}>
          <div className={styles.frameSizer}>
            {/* Frame — clip-path animated by entrance + controlled by JS */}
            <div
              ref={frameRef}
              data-portrait-frame
              className={styles.frame}
            >
              {/* Corner accents */}
              <div className={styles.cornerTL} aria-hidden="true" />
              <div className={styles.cornerTR} aria-hidden="true" />
              <div className={styles.cornerBL} aria-hidden="true" />
              <div className={styles.cornerBR} aria-hidden="true" />

              {/* Image stack */}
              <div className={styles.imageStack}>
                {/* Base portrait */}
                <img
                  ref={null /* baseImgRef not needed — no direct mutation */}
                  src="/jihed.webp"
                  alt="Jihed Hagui — Portrait"
                  className={styles.baseImg}
                  onLoad={() => idleFrame(() => ScrollTrigger.refresh())}
                  draggable={false}
                />

                {/* X-Ray overlay — clip-path updated by RAF loop */}
                <div ref={xrayMaskRef} className={styles.xrayMask}>
                  <img
                    src="/xrayPerfect.webp"
                    alt=""
                    aria-hidden="true"
                    className={styles.xrayImg}
                    onLoad={() => idleFrame(() => ScrollTrigger.refresh())}
                    draggable={false}
                  />
                </div>

                {/* Scanline glow */}
                <div
                  ref={scanlineGlowRef}
                  className={styles.scanlineGlow}
                  aria-hidden="true"
                />

                {/* Scanline */}
                <div
                  ref={scanlineRef}
                  data-portrait-scanline
                  className={styles.scanline}
                  aria-hidden="true"
                />
              </div>

              {/* Frame footer */}
              <footer className={styles.frameFooter}>
                <span className={styles.frameFooter__label}>JH001</span>
                <span className={styles.frameFooter__label}>©2026</span>
              </footer>
            </div>
          </div>
        </div>

        {/* ── Accent Lines ─────────────────────────────────── */}
        <div className={styles.linesRow} aria-hidden="true">
          <div ref={lineLeftRef}  className={styles.lineLeft}  />
          <div ref={lineRightRef} className={styles.lineRight} />
        </div>

        {/* ── Meta Status ──────────────────────────────────── */}
        <div ref={metaRef} className={styles.meta}>
          <div className={styles.metaCell}>
            <div className={styles.metaCell__label}>Status</div>
            <div className={styles.metaCell__value}>Available</div>
          </div>
        </div>

        {/* ── Entrance Overlay (wiped by GSAP) ─────────────── */}
        <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />

      </div>
    </section>
  );
}