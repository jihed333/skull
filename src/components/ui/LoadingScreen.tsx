"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const barTrackRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const curtainLeftRef = useRef<HTMLDivElement>(null);
  const curtainRightRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const exitedRef = useRef(false);

  // ── Entrance animation ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      // Subtitle fades in
      tl.fromTo(
        subtitleRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out" },
        0.9
      );

      // Progress bar track fades in
      tl.fromTo(
        barTrackRef.current,
        { opacity: 0, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: 0.6, ease: "power2.out" },
        1.0
      );

      // Percent fades in
      tl.fromTo(
        percentRef.current,
        { opacity: 0 },
        { opacity: 0.8, duration: 0.4, ease: "power2.out" },
        1.2
      );
    });

    return () => ctx.revert();
  }, []);

  // ── Progress counter ──
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 4000; 

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => triggerExit(), 350);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exit transition ──
  const triggerExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => onComplete(),
    });

    // 1) Fade out text elements
    tl.to(
      [subtitleRef.current, barTrackRef.current, percentRef.current],
      {
        opacity: 0,
        y: -16,
        duration: 0.4,
        ease: "power2.in",
        stagger: 0.04,
      }
    );

    // 2) Video zooms subtly and fades
    tl.to(
      videoContainerRef.current,
      {
        scale: 1.15,
        opacity: 0,
        duration: 0.6,
        ease: "power3.in",
      },
      "-=0.2"
    );

    // 3) Curtain split — two panels slide apart
    tl.to(
      curtainLeftRef.current,
      {
        x: "-100%",
        duration: 0.9,
        ease: "power4.inOut",
      },
      "-=0.3"
    );
    tl.to(
      curtainRightRef.current,
      {
        x: "100%",
        duration: 0.9,
        ease: "power4.inOut",
      },
      "<" // same time as left curtain
    );
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* ── Curtain Panels ── */}
      <div
        ref={curtainLeftRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          background: "#000",
          zIndex: 2,
        }}
      />
      <div
        ref={curtainRightRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          background: "#000",
          zIndex: 2,
        }}
      />

      {/* ── Content layer (sits on top of curtains) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.6rem",
        }}
      >
        {/* ── Video Container ── */}
        <div
          ref={videoContainerRef}
          style={{
            width: "min(72vw, 580px)",
            aspectRatio: "16 / 9",
            borderRadius: "6px",
            overflow: "hidden",
            position: "relative",
            opacity: 1,
          }}
        >
          <video
            src="/202603272234.mp4"
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* ── Subtitle ── */}
        <div
          ref={subtitleRef}
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: "clamp(8px, 1vw, 10px)",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.2)",
            opacity: 0,
          }}
        >
          Loading Experience
        </div>

        {/* ── Progress Bar ── */}
        <div
          ref={barTrackRef}
          style={{
            width: "min(40vw, 280px)",
            height: "1px",
            background: "rgba(255, 255, 255, 0.04)",
            position: "relative",
            overflow: "hidden",
            opacity: 0,
            transformOrigin: "center",
          }}
        >
          <div
            ref={barFillRef}
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, #ff98a2)",
              transition: "width 0.12s linear",
              boxShadow: "0 0 12px rgba(255, 152, 162, 0.4)",
            }}
          />
        </div>

        {/* ── Percentage ── */}
        <div
          ref={percentRef}
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: "9px",
            letterSpacing: "0.15em",
            color: "rgba(255, 152, 162, 0.7)",
            opacity: 0,
          }}
        >
          {Math.round(progress * 100)}%
        </div>
      </div>

      {/* ── Ambient vertical lines for depth ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Left accent line */}
        <div
          style={{
            position: "absolute",
            left: "15%",
            top: 0,
            width: "1px",
            height: "100%",
            background:
              "linear-gradient(to bottom, transparent 20%, rgba(255,152,162,0.04) 50%, transparent 80%)",
          }}
        />
        {/* Right accent line */}
        <div
          style={{
            position: "absolute",
            right: "15%",
            top: 0,
            width: "1px",
            height: "100%",
            background:
              "linear-gradient(to bottom, transparent 20%, rgba(255,152,162,0.04) 50%, transparent 80%)",
          }}
        />
      </div>
    </div>
  );
}
