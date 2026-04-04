"use client";

import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./PortraitSection.module.css";


gsap.registerPlugin(ScrollTrigger);

// ─── Noise / grain overlay ───────────────────────────────────────────────────
function GrainOverlay() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[999] opacity-[0.035] mix-blend-overlay"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

// ─── Marquee line ─────────────────────────────────────────────────────────────
function MarqueeLine({ text, speed = 40, reverse = false }: { text: string; speed?: number; reverse?: boolean }) {
  const items = Array(12).fill(text);
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div
        className="inline-flex gap-12"
        style={{
          animationName: reverse ? styles.marqueeRev : styles.marquee,
          animationDuration: `${speed}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear'
        }}
      >
        {items.map((t, i) => (
          <span key={i} className="text-[11px] tracking-[0.4em] uppercase text-white/20 font-light select-none">
            {t}
            <span className="ml-12 text-white/10">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Cursor follower ──────────────────────────────────────────────────────────
function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
    };
    window.addEventListener("mousemove", move);

    let rafId: number;
    const follow = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.08;
      ring.current.y += (pos.current.y - ring.current.y) * 0.08;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`;
      }
      rafId = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed z-[9999] w-2 h-2 rounded-full bg-[#ff98a2] pointer-events-none mix-blend-difference"
        style={{ top: 0, left: 0, willChange: "transform" }}
      />
      <div
        ref={ringRef}
        className="fixed z-[9998] w-10 h-10 rounded-full border border-white/40 pointer-events-none"
        style={{ top: 0, left: 0, willChange: "transform", transition: "width 0.3s, height 0.3s, border-color 0.3s" }}
      />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PortraitSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const xrayMaskRef = useRef<HTMLDivElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const scanlineGlowRef = useRef<HTMLDivElement>(null);
  const titleTopRef = useRef<HTMLDivElement>(null);
  const titleBotRef = useRef<HTMLDivElement>(null);
  const lineLeftRef = useRef<HTMLDivElement>(null);
  const lineRightRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // ── intro counter ──────────────────────────────────────────────────────────
  useEffect(() => {
    let n = 0;
    const iv = setInterval(() => {
      n += Math.floor(Math.random() * 7) + 3;
      if (n >= 100) { n = 100; clearInterval(iv); setLoaded(true); }
      if (counterRef.current) counterRef.current.textContent = String(n).padStart(3, "0");
    }, 40);
    return () => clearInterval(iv);
  }, []);

  // ── GSAP scroll scene ──────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ─── 0. ENTRANCE TIMELINE (Runs once on load) ───
      const entranceTl = gsap.timeline({ delay: 0.3 });

      // Scanline sweep reveal
      entranceTl.fromTo(
        overlayRef.current,
        { scaleY: 1 },
        { scaleY: 0, transformOrigin: "bottom", duration: 1.4, ease: "expo.inOut" }
      );

      // Frame clips open — sharp horizontal slit → full
      entranceTl.fromTo(
        frameRef.current,
        { clipPath: "inset(48% 0% 48% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" },
        "-=0.6"
      );

      // Image scale down from oversized
      entranceTl.fromTo(
        imageRef.current,
        { scale: 1.3 },
        { scale: 1, duration: 2.2, ease: "expo.out" },
        "-=1.6"
      );

      // Lines extend
      entranceTl.fromTo(
        [lineLeftRef.current, lineRightRef.current],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 },
        "-=1"
      );

      // Title letters stagger in
      entranceTl.fromTo(
        `.${styles.portraitChar}`,
        { yPercent: 120, rotateZ: 4 },
        {
          yPercent: 0,
          rotateZ: 0,
          duration: 1,
          ease: "expo.out",
          stagger: { each: 0.03, from: "start" },
        },
        "-=0.8"
      );

      // Meta info
      entranceTl.fromTo(
        metaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      );

      // ─── 1. MASTER SCROLL TIMELINE (pinned) ───
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=150%",        // pin for 150% of viewport height
          pin: true,            // locks the section
          scrub: 1,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Manual style updates for the scanline as fallback
            const pct = self.progress * 100;
            if (scanlineRef.current) {
              scanlineRef.current.style.top = `${pct}%`;
              scanlineRef.current.style.opacity = pct > 1 && pct < 99 ? "1" : "0";
            }
            if (scanlineGlowRef.current) {
              scanlineGlowRef.current.style.top = `${pct}%`;
              scanlineGlowRef.current.style.opacity = pct > 1 && pct < 99 ? "1" : "0";
            }
          }
        },
      });

      // 1. Reveal from top to bottom
      masterTl.fromTo(
        xrayMaskRef.current,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "none" },
        0
      );

      // 2. Parallax Image
      masterTl.to(imageRef.current, {
        yPercent: 12,
        duration: 1,
        ease: "none",
      }, 0);

      // 3. Title split
      masterTl.to(titleTopRef.current, {
        xPercent: -12,
        duration: 1,
        ease: "none"
      }, 0);
      masterTl.to(titleBotRef.current, {
        xPercent: 12,
        duration: 1,
        ease: "none"
      }, 0);

      // 4. Frame skew
      masterTl.to(frameRef.current, {
        rotateZ: 0.8,
        duration: 1,
        ease: "none"
      }, 0);

      // Defer refresh so pin spacing uses committed layout (and after Lenis/ST sync)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Portrait images affect intrinsic layout; refresh pin distances once the page has fully loaded
  useEffect(() => {
    const refresh = () => requestAnimationFrame(() => ScrollTrigger.refresh());
    if (document.readyState === "complete") refresh();
    else window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  // ── char split helper ──────────────────────────────────────────────────────
  const splitChars = (word: string, className?: string) =>
    [...word].map((ch, i) => (
      <span
        key={i}
        className={styles.portraitChar}
      >
        <span className={className}>{ch === " " ? "\u00A0" : ch}</span>
      </span>
    ));

  return (
    <>
      <MagneticCursor />
      <GrainOverlay />

      {/* ── Loading screen ── */}
      <div
        className="fixed inset-0 z-[9990] bg-[#080808] flex flex-col items-center justify-center pointer-events-none"
        style={{
          opacity: loaded ? 0 : 1,
          transition: "opacity 0.6s ease",
          transitionDelay: loaded ? "0.3s" : "0s",
        }}
      >
        <div className="flex items-end gap-3">
          <span
            ref={counterRef}
            className="text-[6vw] font-black tabular-nums text-white"
            style={{ fontVariantNumeric: "tabular-nums", fontFamily: "'Courier New', monospace" }}
          >
            000
          </span>
          <span className="text-sm text-white/30 mb-2 tracking-widest uppercase">Loading</span>
        </div>
        <div className="w-40 h-[1px] bg-white/10 mt-4 overflow-hidden">
          <div
            className="h-full bg-[#ff98a2]"
            style={{ width: loaded ? "100%" : "0%", transition: "width 2s linear" }}
          />
        </div>
      </div>

      {/* ── MAIN SECTION ── */}
      <section
        ref={sectionRef}
        className="relative w-full bg-[#080808]"
        style={{ height: "100dvh" }}
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(255,152,162,0.04) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Grid lines — architectural feel */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-[0.5px] bg-white"
              style={{ left: `${(i + 1) * 100 / 8}%` }}
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-[0.5px] bg-white"
              style={{ top: `${(i + 1) * 100 / 6}%` }}
            />
          ))}
        </div>

        {/* ── STICKY CONTAINER (now pinned via GSAP) ── */}
        <div ref={wrapRef} className="relative h-full overflow-hidden">

          {/* Top marquee */}
          <div className="absolute top-6 left-0 right-0 z-20">
            <MarqueeLine text="JIHED TLILI — ARCHITECT — DESIGNER — VISIONARY — PORTFOLIO 2025" speed={45} />
          </div>

          {/* Bottom marquee */}
          <div className="absolute bottom-6 left-0 right-0 z-20">
            <MarqueeLine
              text="AVAILABLE FOR WORK — BASED IN TUNISIA — OPEN TO GLOBAL PROJECTS"
              speed={38}
              reverse
            />
          </div>

          {/* Corner coordinates */}
          <div className="absolute top-6 left-6 z-30 font-mono text-[10px] tracking-widest text-white/20 leading-relaxed">
            <div>36.8065° N</div>
            <div>10.1815° E</div>
          </div>
          <div className="absolute top-6 right-6 z-30 font-mono text-[10px] tracking-widest text-white/20 text-right leading-relaxed">
            <div>FOLIO</div>
            <div>— 2025</div>
          </div>

          {/* Vertical left label */}
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            <span className="text-[10px] tracking-[0.3em] text-white/20 uppercase">Portrait</span>
            <div className="w-[0.5px] h-12 bg-white/10" />
            <span className="text-[10px] tracking-[0.3em] text-white/20 uppercase font-mono">01</span>
          </div>

          {/* ── IMAGE FRAME ── */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              ref={frameRef}
              className="relative overflow-hidden"
              style={{
                width: "clamp(280px, 42vw, 580px)",
                height: "clamp(380px, 68vh, 780px)",
                clipPath: "inset(48% 0% 48% 0%)",
              }}
            >
              {/* Corner marks */}
              {[
                "top-0 left-0 border-l border-t",
                "top-0 right-0 border-r border-t",
                "bottom-0 left-0 border-l border-b",
                "bottom-0 right-0 border-r border-b",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute z-30 w-5 h-5 border-white/40 pointer-events-none ${cls}`}
                />
              ))}

              {/* ── IMAGE STACK ── */}
              <div ref={imageRef} className="absolute inset-0 will-change-transform">

                {/* Layer 1 — normal photo (always visible, grayscale) */}
                <img
                  src="/jihed.jpg"
                  alt="Portrait"
                  className="absolute inset-0 w-full h-full object-cover grayscale contrast-110 brightness-90"
                  style={{ zIndex: 1 }}
                  onLoad={() => requestAnimationFrame(() => ScrollTrigger.refresh())}
                />

                {/* Layer 2 — xray image, scroll-clipped from top downward */}
                <div
                  ref={xrayMaskRef}
                  className="absolute inset-0 will-change-[clip-path]"
                  style={{
                    clipPath: "inset(0% 0% 100% 0%)",
                    zIndex: 2,
                  }}
                >


                  <img
                    src="/xrayPerfect.png"
                    alt="X-Ray"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      filter: "contrast(1.7) brightness(0.95) saturate(0.85)"
                    }}
                    onLoad={() => requestAnimationFrame(() => ScrollTrigger.refresh())}
                  />

                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,120,140,0.08) 0%, rgba(255,120,140,0.22) 100%)",
                      mixBlendMode: "screen",
                      zIndex: 3
                    }}
                  />

                </div>
                {/* ── SCANLINE — sits exactly at the reveal boundary ── */}
                {/* Outer glow */}
                <div
                  ref={scanlineGlowRef}
                  className="absolute inset-x-0 pointer-events-none"
                  style={{
                    zIndex: 10,
                    top: "0%",
                    opacity: 0,
                    height: "80px",
                    marginTop: "-40px",
                    background:
                      "radial-gradient(ellipse 100% 50% at 50% 50%, rgba(255,152,162,0.18) 0%, transparent 70%)",
                    transition: "opacity 0.1s",
                  }}
                />
                {/* Sharp line */}
                <div
                  ref={scanlineRef}
                  className="absolute inset-x-0 pointer-events-none"
                  style={{
                    zIndex: 11,
                    top: "0%",
                    opacity: 0,
                    height: "1px",
                    background:
                      "linear-gradient(to right, transparent 0%, rgba(255,152,162,0.15) 10%, rgba(255,152,162,0.9) 30%, #ff98a2 50%, rgba(255,152,162,0.9) 70%, rgba(255,152,162,0.15) 90%, transparent 100%)",
                    boxShadow: "0 0 8px 1px rgba(255,152,162,0.5), 0 0 24px 2px rgba(255,152,162,0.2)",
                    transition: "opacity 0.1s",
                  }}
                />
              </div>

              {/* Bottom caption inside frame */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-end px-4 pb-3"
                style={{
                  background:
                    "linear-gradient(to top, rgba(8,8,8,0.7) 0%, transparent 100%)",
                }}
              >
                <span className="font-mono text-[10px] text-white/30 tracking-widest">
                  JT.001
                </span>
                <span className="font-mono text-[10px] text-white/30 tracking-widest">
                  ©2025
                </span>
              </div>
            </div>
          </div>

          {/* ── TITLE LAYER (behind image via mix-blend-difference) ── */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-center mix-blend-difference z-10">

            {/* Top title */}
            <div
              ref={titleTopRef}
              className="pl-[4vw] will-change-transform"
              style={{ lineHeight: 0.82 }}
            >
              <h1
                className="font-black uppercase text-white"
                style={{ fontSize: "clamp(60px, 14vw, 200px)" }}
              >
                {splitChars("THE")}
              </h1>
            </div>

            {/* Bottom title */}
            <div
              ref={titleBotRef}
              className="pr-[4vw] text-right will-change-transform"
              style={{ lineHeight: 0.82 }}
            >
              <h1
                className="font-black uppercase italic text-[#ff98a2]"
                style={{ fontSize: "clamp(44px, 10.5vw, 155px)" }}
              >
                {splitChars("ARCHITECT")}
              </h1>
            </div>
          </div>

          {/* ── Horizontal accent lines ── */}
          <div className="absolute inset-x-0 z-30 pointer-events-none" style={{ top: "50%" }}>
            <div
              ref={lineLeftRef}
              className="absolute left-0 origin-left"
              style={{
                width: "calc(50% - clamp(140px, 21vw, 290px))",
                height: "0.5px",
                background: "linear-gradient(to right, transparent, rgba(255,152,162,0.5))",
                transform: "scaleX(0)",
              }}
            />
            <div
              ref={lineRightRef}
              className="absolute right-0 origin-right"
              style={{
                width: "calc(50% - clamp(140px, 21vw, 290px))",
                height: "0.5px",
                background: "linear-gradient(to left, transparent, rgba(255,152,162,0.5))",
                transform: "scaleX(0)",
              }}
            />
          </div>

          {/* ── Meta info row ── */}
          <div
            ref={metaRef}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-8 opacity-0"
          >
            {[
              { label: "Role", value: "Lead Architect" },
              { label: "Focus", value: "Spatial Design" },
              { label: "Status", value: "Available" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-[9px] tracking-[0.3em] text-white/25 uppercase font-light">{label}</div>
                <div className="text-[11px] tracking-[0.15em] text-white/60 uppercase mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* ── Slide-over reveal overlay ── */}
          <div
            ref={overlayRef}
            className="absolute inset-0 z-40 pointer-events-none"
            style={{ background: "#080808", transformOrigin: "top" }}
          />
        </div>
      </section>
    </>
  );
}