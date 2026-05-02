"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const subtitleRef = useRef<HTMLDivElement>(null);
  const barTrackRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLDivElement>(null);
  
  const panel1Ref = useRef<HTMLDivElement>(null);
  const panel2Ref = useRef<HTMLDivElement>(null);

  const { progress: trueProgress } = useProgress();
  const [visualProgress, setVisualProgress] = useState(0);
  const exitedRef = useRef(false);

  // ── Entrance animation ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.fromTo(
        subtitleRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out" }
      );

      tl.fromTo(
        barTrackRef.current,
        { opacity: 0, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: 0.6, ease: "power2.out" },
        "-=0.4"
      );

      tl.fromTo(
        percentRef.current,
        { opacity: 0 },
        { opacity: 0.8, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );
    });

    return () => ctx.revert();
  }, []);

  // ── Progress counter (dynamic interpolation) ──
  useEffect(() => {
    // We animate visualProgress to match trueProgress smoothly
    let obj = { val: visualProgress };
    
    gsap.to(obj, {
      val: trueProgress,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        setVisualProgress(obj.val);
      },
    });

    // When we actually hit 100 on the true progress, we wait briefly then exit
    if (trueProgress >= 100 && !exitedRef.current) {
      // Small pause so the user sees "100%"
      setTimeout(() => triggerExit(), 400); 
    }
  }, [trueProgress]);

  // Fallback in case there's no 3D loading (trueProgress stays 0 or jumps immediately)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // If after 5 seconds the progress is still extremely low or hasn't triggered,
      // we force complete to avoid getting stuck if something fails or is cached.
      if (!exitedRef.current && trueProgress >= 100) {
        triggerExit();
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [trueProgress]);


  // ── Exit transition ──
  const triggerExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => onComplete(),
    });

    // 1. Text elements fly up & fade
    tl.to(
      [subtitleRef.current, barTrackRef.current, percentRef.current],
      {
        opacity: 0,
        y: -20,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.in",
      }
    );

    // 2. The multi-layer wipe using clipPath
    tl.to(
      panel1Ref.current,
      {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 1.2,
        ease: "expo.inOut",
      },
      "-=0.2"
    );

    tl.to(
      panel2Ref.current,
      {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 1.2,
        ease: "expo.inOut",
      },
      "<0.1"
    );

  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        // Removed visibility: hidden so it shows instantly on first paint
      }}
    >
      {/* Accent panel (underneath main panel) */}
      <div
        ref={panel2Ref}
        style={{
          position: "absolute",
          inset: 0,
          background: "#1a0f12", // dark red/pink tint for the secondary wipe
          zIndex: 1,
          clipPath: "inset(0% 0% 0% 0%)",
        }}
      />

      {/* Main panel */}
      <div
        ref={panel1Ref}
        style={{
          position: "absolute",
          inset: 0,
          background: "#050505",
          zIndex: 2,
          clipPath: "inset(0% 0% 0% 0%)",
        }}
      >
        {/* ── Ambient vertical lines ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
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

        {/* ── Content layer ── */}
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
              style={{
                width: `${visualProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, transparent, #ff98a2)",
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
            {Math.round(visualProgress)}%
          </div>
        </div>
      </div>
    </div>
  );
}