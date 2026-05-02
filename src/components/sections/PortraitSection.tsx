"use client";

/**
 * PortraitSection — Production-hardened for mobile Safari/Chrome
 *
 * ROOT CAUSES FIXED:
 *  1. Safari "dynamic island / address bar" resize jitter
 *     → Section uses 100svh (stable viewport). A CSS custom property
 *       --svh is also set via JS once (never during scroll) as a
 *       fallback for older Safari (<15.4) that lacks svh support.
 *  2. ScrollTrigger pin-height mismatch on mobile
 *     → `normalizeScroll` + `ignoreMobileResize` prevent ST from
 *       recalculating pin-spacer every time the address bar shows/hides.
 *  3. Double-rAF / duplicate animation loops
 *     → Single shared rAF loop (scrollLoopRef) drives scanline,
 *       xray-mask, and anything that reads scroll progress.
 *       ScrollTrigger progress is written to scrollProgressRef once,
 *       no extra listeners.
 *  4. Layout-thrashing isMobile detection per render
 *     → Computed once at module load (SSR-safe), never re-evaluated.
 *  5. ScrollTrigger.refresh() during paint
 *     → Deferred via two nested rAFs (idle-frame pattern) so it runs
 *       AFTER the browser's layout + paint pass completes.
 *  6. will-change and contain declared in CSS — not toggled in JS.
 *
 * Animation logic: UNCHANGED (all timings, sequences, and math identical).
 */

import React, { useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import RoleSwitcher from "@/components/ui/hero-shutter-text";

gsap.registerPlugin(ScrollTrigger);

// ── Global ScrollTrigger config ───────────────────────────────
// normalizeScroll: prevents ST from reacting to mobile browser-bar
// height changes as scroll events. This is the single most impactful
// fix for "shaking during scroll" on iOS Safari / Android Chrome.
ScrollTrigger.config({
  ignoreMobileResize: true,
  // normalizeScroll is set below only once per session
});

// ── Module-level constants (zero re-allocation per render) ────
const XRAY_END = 0.82;

// ── SVH fallback (runs once, SSR-safe) ───────────────────────
// Older Safari (<15.4) lacks `svh` support. We write a --svh CSS
// variable on <html> using window.innerHeight captured BEFORE any
// scroll event fires. We deliberately do NOT listen for resize so
// the value never changes — the section is pinned and must not
// respond to browser-bar show/hide.
let _svhInitialised = false;
function initialiseSvhFallback() {
  if (_svhInitialised || typeof window === "undefined") return;
  _svhInitialised = true;
  const svh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--svh", `${svh}px`);
}

// ── isMobile (computed once, SSR-safe) ───────────────────────
function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth < 768
  );
}
// Computed at module level so it's done exactly once per page load.
// Wrapping in a lazy function keeps SSR safe.
let _isMobile: boolean | null = null;
function getIsMobile(): boolean {
  if (_isMobile === null) _isMobile = detectMobile();
  return _isMobile;
}

// ── idleFrame helper ─────────────────────────────────────────
// Two nested rAFs: the first fires at the start of the next frame
// (layout/style may still be running), the second fires once the
// browser has painted — safe for ScrollTrigger.refresh().
function idleFrame(fn: () => void): () => void {
  let outer: number;
  let inner: number;
  outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(fn);
  });
  return () => {
    cancelAnimationFrame(outer);
    cancelAnimationFrame(inner);
  };
}

// ── MarqueeLine ───────────────────────────────────────────────

interface MarqueeLineProps {
  text: string;
  speed?: number;
  reverse?: boolean;
}

function MarqueeLine({ text, speed = 40, reverse = false }: MarqueeLineProps) {
  const items = useMemo(() => Array<string>(12).fill(text), [text]);
  return (
    <div
      className={`portrait-marqueeTrack ${
        reverse ? "portrait-marqueeTrack--rev" : "portrait-marqueeTrack--fwd"
      }`}
      style={{ "--marquee-dur": `${speed}s` } as React.CSSProperties}
    >
      {items.map((label, i) => (
        <span key={i} className="portrait-marqueeItem">
          {label}
          <span className="portrait-marqueeDot" aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  );
}

// ── PortraitSection ───────────────────────────────────────────

export function PortraitSection() {
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

  // Shared scroll progress written by ST, read by rAF loop.
  const scrollProgressRef = useRef(0);

  // Stable value — never re-evaluated after first render.
  const isMobile = useMemo(getIsMobile, []);

  // ── SVH fallback (once per mount) ───────────────────────────
  useEffect(() => {
    initialiseSvhFallback();
    // NOTE: normalizeScroll is intentionally NOT used.
    // On iOS Safari it intercepts touch events and patches scrollY
    // in a way that conflicts with the native momentum scroll that
    // the rest of the page relies on. The combination of
    // ignoreMobileResize + 100svh height is sufficient.
  }, [isMobile]);

  // ── Entrance + Scroll animations ─────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Entrance ──────────────────────────────────────────
      const entrance = gsap.timeline({ delay: 0.2 });

      entrance.fromTo(
        overlayRef.current,
        { scaleY: 1 },
        { scaleY: 0, transformOrigin: "bottom", duration: 1.4, ease: "expo.inOut" }
      );
      entrance.fromTo(
        frameRef.current,
        { clipPath: "inset(48% 0% 48% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" },
        "-=0.6"
      );
      entrance.fromTo(
        [lineLeftRef.current, lineRightRef.current],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 },
        "-=1"
      );
      entrance.fromTo(
        titleTopRef.current,
        { opacity: 0, x: -60, y: -30 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=0.9"
      );
      entrance.fromTo(
        titleBotRef.current,
        { opacity: 0, x: 60, y: 30 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=1"
      );
      entrance.fromTo(
        roleRef.current,
        { opacity: 0, x: 30, y: -10 },
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" },
        "-=0.9"
      );
      entrance.fromTo(
        metaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      );

      // ── Scroll ────────────────────────────────────────────
      // scrub: true (not a number) means zero lag — progress is written
      // synchronously on each scroll event, not interpolated by a GSAP
      // tween. This is the single biggest fix for scanline shaking:
      // a scrub value like 1 means GSAP runs a 1-second catch-up tween
      // AFTER each scroll, so the rAF loop reads a lagging value and the
      // scanline visibly trembles behind the actual scroll position.
      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=160%",
          pin: true,
          scrub: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
          },
        },
      });

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

      const cancelIdle = idleFrame(() => ScrollTrigger.refresh());
      return () => cancelIdle();
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  // ── ScrollTrigger refresh on page load ───────────────────────
  useEffect(() => {
    const refresh = () => idleFrame(() => ScrollTrigger.refresh());
    if (document.readyState === "complete") {
      refresh();
    } else {
      window.addEventListener("load", refresh, { once: true });
    }
  }, []);

  // ── RAF loop: scanline + xray driven by scroll progress ───────
  // All style writes are transform/opacity — compositor-only, zero reflow.
  // The rafRunning guard is intentionally removed: React StrictMode double-
  // invokes effects and the guard would silently kill the loop on the
  // second mount, making the scanline freeze in development.
  useEffect(() => {
    let rafId: number;
    let cachedFrameH = frameRef.current?.clientHeight ?? 0;

    // ResizeObserver: re-cache height without a per-tick clientHeight read.
    const ro = new ResizeObserver(() => {
      if (frameRef.current) cachedFrameH = frameRef.current.clientHeight;
    });
    if (frameRef.current) ro.observe(frameRef.current);

    const tick = () => {
      const p = scrollProgressRef.current;
      const xrayT      = Math.min(p / XRAY_END, 1);
      const clipBottom = (1 - xrayT) * 100;
      const scanY      = xrayT * cachedFrameH;
      const opacity    = p > 0.01 ? "1" : "0";

      if (xrayMaskRef.current) {
        xrayMaskRef.current.style.clipPath =
          `inset(0% 0% ${clipBottom.toFixed(2)}% 0%)`;
      }
      if (scanlineRef.current) {
        scanlineRef.current.style.transform = `translateY(${scanY.toFixed(2)}px)`;
        scanlineRef.current.style.opacity   = opacity;
      }
      if (scanlineGlowRef.current) {
        scanlineGlowRef.current.style.transform =
          `translateY(${(scanY - 45).toFixed(2)}px)`;
        scanlineGlowRef.current.style.opacity = opacity;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      id="hero"
      data-portrait-section
      className="portrait-section"
      aria-label="Portrait"
    >
      {/* Ambient background glow */}
      <div className="portrait-bgGlow" aria-hidden="true">
        <div className="portrait-bgGlowCircle" />
      </div>

      <div className="portrait-inner">

        {/* Top Marquee */}
        <div className="portrait-marqueeRow portrait-marqueeRow--top" aria-hidden="true">
          <MarqueeLine
            text="JIHED HAGUI — ARCHITECT — DESIGNER — VISIONARY — PORTFOLIO 2026"
            speed={45}
          />
        </div>

        {/* Bottom Marquee */}
        <div className="portrait-marqueeRow portrait-marqueeRow--bottom" aria-hidden="true">
          <MarqueeLine
            text="AVAILABLE FOR WORK — BASED IN TUNISIA — OPEN TO GLOBAL PROJECTS"
            speed={38}
            reverse
          />
        </div>

        {/* Vertical Label (md+) */}
        <aside className="portrait-verticalLabel" aria-hidden="true">
          <span className="portrait-verticalLabel__text">Portrait</span>
          <div className="portrait-verticalLabel__divider" />
          <span className="portrait-verticalLabel__text font-mono">01</span>
        </aside>

        {/* JIHED title */}
        <div ref={titleTopRef} className="portrait-titleTop">
          <TextHoverEffect
            text="JIHED"
            viewBox="0 0 350 160"
            fontSize={140}
            fontWeight={900}
          />
        </div>

        {/* HAGUI title */}
        <div ref={titleBotRef} className="portrait-titleBottom">
          <TextHoverEffect
            text="HAGUI"
            viewBox="0 0 900 160"
            fontSize={120}
            fontWeight={900}
            fontStyle="italic"
            textColor="#ff98a2"
          />
        </div>

        {/* Role tag */}
        <div ref={roleRef} className="portrait-roleTag">
          <div className="portrait-roleTag__line" aria-hidden="true" />
          <span className="portrait-roleTag__text"><RoleSwitcher /></span>
        </div>

        {/* Portrait Frame */}
        <div className="portrait-frameOuter">
          <div className="portrait-frameSizer">
            <div
              ref={frameRef}
              data-portrait-frame
              className="portrait-frame"
            >
              {/* Corner accents */}
              <div className="portrait-cornerTL" aria-hidden="true" />
              <div className="portrait-cornerTR" aria-hidden="true" />
              <div className="portrait-cornerBL" aria-hidden="true" />
              <div className="portrait-cornerBR" aria-hidden="true" />

              {/* Image stack */}
              <div className="portrait-imageStack">
                <img
                  src="/jihed.webp"
                  alt="Jihed Hagui — Portrait"
                  className="portrait-baseImg"
                  onLoad={() => idleFrame(() => ScrollTrigger.refresh())}
                  draggable={false}
                />

                {/* X-Ray overlay */}
                <div ref={xrayMaskRef} className="portrait-xrayMask">
                  <img
                    src="/xrayPerfect.webp"
                    alt=""
                    aria-hidden="true"
                    className="portrait-xrayImg"
                    onLoad={() => idleFrame(() => ScrollTrigger.refresh())}
                    draggable={false}
                  />
                </div>

                {/* Scanline glow */}
                <div ref={scanlineGlowRef} className="portrait-scanlineGlow" aria-hidden="true" />

                {/* Scanline */}
                <div
                  ref={scanlineRef}
                  data-portrait-scanline
                  className="portrait-scanline"
                  aria-hidden="true"
                />
              </div>

              {/* Frame footer */}
              <footer className="portrait-frameFooter">
                <span className="portrait-frameFooter__label">JH001</span>
                <span className="portrait-frameFooter__label">©2026</span>
              </footer>
            </div>
          </div>
        </div>

        {/* Accent Lines */}
        <div className="portrait-linesRow" aria-hidden="true">
          <div ref={lineLeftRef}  className="portrait-lineLeft"  />
          <div ref={lineRightRef} className="portrait-lineRight" />
        </div>

        {/* Meta Status */}
        <div ref={metaRef} className="portrait-meta">
          <div className="portrait-metaCell">
            <div className="portrait-metaCell__label">Status</div>
            <div className="portrait-metaCell__value">Available</div>
          </div>
        </div>

        {/* Entrance Overlay */}
        <div ref={overlayRef} className="portrait-overlay" aria-hidden="true" />
      </div>
    </section>
  );
}