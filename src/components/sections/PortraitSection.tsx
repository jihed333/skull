"use client";
import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import RoleSwitcher from "@/components/ui/hero-shutter-text";
import styles from "./PortraitSection.module.css";

gsap.registerPlugin(ScrollTrigger);

function MarqueeLine({ text, speed = 40, reverse = false }: { 
  text: string; 
  speed?: number; 
  reverse?: boolean 
}) {
  const items = Array(12).fill(text);
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div 
        className="inline-flex gap-12" 
        style={{
          animationName: reverse ? styles.marqueeRev : styles.marquee,
          animationDuration: `${speed}s`,
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
        }}
      >
        {items.map((t, i) => (
          <span 
            key={i} 
            className="text-[11px] tracking-[0.4em] uppercase text-white/20 font-light select-none"
          >
            {t}
            <span className="ml-12 text-white/10">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PortraitSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const xrayMaskRef = useRef<HTMLDivElement>(null);
  const baseImgRef = useRef<HTMLImageElement>(null);
  const xrayImgRef = useRef<HTMLImageElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const scanlineGlowRef = useRef<HTMLDivElement>(null);
  const titleTopRef = useRef<HTMLDivElement>(null);
  const titleBotRef = useRef<HTMLDivElement>(null);
  const lineLeftRef = useRef<HTMLDivElement>(null);
  const lineRightRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const scrollProgressRef = useRef(0);
  const XRAY_END = 0.82;

  const isMobile = typeof window !== "undefined" 
    ? (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768)
    : false;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance Animation
      const entranceTl = gsap.timeline({ delay: 0.2 });
      
      entranceTl.fromTo(
        overlayRef.current, 
        { scaleY: 1 }, 
        { scaleY: 0, transformOrigin: "bottom", duration: 1.4, ease: "expo.inOut" }
      );

      entranceTl.fromTo(
        frameRef.current, 
        { clipPath: "inset(48% 0% 48% 0%)" }, 
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, 
        "-=0.6"
      );

      entranceTl.fromTo(
        [lineLeftRef.current, lineRightRef.current], 
        { scaleX: 0 }, 
        { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 
        "-=1"
      );

      entranceTl.fromTo(
        titleTopRef.current, 
        { opacity: 0, x: -60, y: -30 }, 
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, 
        "-=0.9"
      );

      entranceTl.fromTo(
        titleBotRef.current, 
        { opacity: 0, x: 60, y: 30 }, 
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, 
        "-=1"
      );

      entranceTl.fromTo(
        roleRef.current, 
        { opacity: 0, x: 30, y: -10 }, 
        { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, 
        "-=0.9"
      );

      entranceTl.fromTo(
        metaRef.current, 
        { opacity: 0, y: 12 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 
        "-=0.4"
      );

      // Main Scroll Timeline
      const masterTl = gsap.timeline({
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

      // Only animate titles on desktop (prevents jitter on mobile)
      if (!isMobile) {
        masterTl.to(titleTopRef.current, { 
          xPercent: -8, 
          yPercent: -4, 
          duration: 1, 
          ease: "none" 
        }, 0);

        masterTl.to(titleBotRef.current, { 
          xPercent: 8, 
          yPercent: 4, 
          duration: 1, 
          ease: "none" 
        }, 0);
      }

      // Refresh ScrollTrigger after everything loads
      requestAnimationFrame(() => {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  // Refresh on load
  useEffect(() => {
    const refresh = () => requestAnimationFrame(() => ScrollTrigger.refresh());
    if (document.readyState === "complete") refresh();
    else window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  // Smooth scanline + xray animation (RAF + minimal DOM reads)
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const p = scrollProgressRef.current;
      const frame = frameRef.current;

      if (frame) {
        const frameH = frame.clientHeight;
        const xrayT = Math.min(p / XRAY_END, 1);
        const clipBottom = (1 - xrayT) * 100;
        const scanY = xrayT * frameH;

        const scanVisible = p > 0.01;
        const opacity = scanVisible ? "1" : "0";

        // X-ray mask
        if (xrayMaskRef.current) {
          xrayMaskRef.current.style.clipPath = `inset(0% 0% ${clipBottom.toFixed(2)}% 0%)`;
        }

        // Scanline
        if (scanlineRef.current) {
          scanlineRef.current.style.transform = `translateY(${scanY.toFixed(2)}px)`;
          scanlineRef.current.style.opacity = opacity;
        }

        // Scanline glow
        if (scanlineGlowRef.current) {
          scanlineGlowRef.current.style.transform = `translateY(${(scanY - 45).toFixed(2)}px)`;
          scanlineGlowRef.current.style.opacity = opacity;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <>
      <section 
        ref={sectionRef} 
        data-portrait-section 
        className="relative w-full bg-[#080808]"
        style={{ height: "100svh" }}   // Important for mobile stability
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(255,152,162,0.04) 0%, transparent 70%)"
            }}
          />
        </div>

        <div className="relative h-full">
          {/* Top Marquee */}
          <div className="absolute top-6 left-0 right-0 z-20">
            <MarqueeLine 
              text="JIHED HAGUI — ARCHITECT — DESIGNER — VISIONARY — PORTFOLIO 2026" 
              speed={45} 
            />
          </div>

          {/* Bottom Marquee */}
          <div className="absolute bottom-6 left-0 right-0 z-20">
            <MarqueeLine 
              text="AVAILABLE FOR WORK — BASED IN TUNISIA — OPEN TO GLOBAL PROJECTS" 
              speed={38} 
              reverse 
            />
          </div>

          {/* Vertical Label (Desktop only) */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-3" 
               style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
            <span className="text-[10px] tracking-[0.3em] text-white/20 uppercase">Portrait</span>
            <div className="w-[0.5px] h-12 bg-white/10" />
            <span className="text-[10px] tracking-[0.3em] text-white/20 uppercase font-mono">01</span>
          </div>

          {/* JIHED Title */}
          <div 
            ref={titleTopRef} 
            className="absolute z-10 pointer-events-auto will-change-transform flex items-center justify-center"
            style={{
              top: "7vh",
              left: "3vw",
              lineHeight: 0.82,
              opacity: 0,
              width: "clamp(80px, 18vw, 350px)",
              height: "clamp(36px, 10vw, 180px)",
            }}
          >
            <TextHoverEffect 
              text="JIHED" 
              viewBox="0 0 350 160" 
              fontSize={140} 
              fontWeight={900} 
            />
          </div>

          {/* HAGUI Title */}
          <div 
            ref={titleBotRef} 
            className="absolute z-10 pointer-events-auto will-change-transform text-right flex items-center justify-end"
            style={{
              bottom: "10vh",
              right: "3vw",
              lineHeight: 0.82,
              opacity: 0,
              width: "clamp(180px, 38vw, 850px)",
              height: "clamp(32px, 9vw, 160px)",
            }}
          >
            <TextHoverEffect 
              text="HAGUI" 
              viewBox="0 0 900 160" 
              fontSize={120} 
              fontWeight={900} 
              fontStyle="italic" 
              textColor="#ff98a2" 
            />
          </div>

          {/* Role */}
          <div 
            ref={roleRef} 
            className="absolute z-20 pointer-events-auto will-change-transform flex items-center justify-end"
            style={{
              top: "9vh",
              right: "4vw",
              opacity: 0,
              gap: "0.75rem",
            }}
          >
            <div 
              style={{ 
                width: "2rem", 
                height: "1px", 
                background: "linear-gradient(to right, transparent, #ff98a2)" 
              }} 
            />
            <span 
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "clamp(10px, 1.1vw, 12px)",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <RoleSwitcher />
            </span>
          </div>

          {/* Portrait Frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="relative"
              style={{
                width: "clamp(260px, 85vw, 580px)",
                height: "clamp(340px, 62svh, 780px)",
              }}
            >
              <div 
                ref={frameRef} 
                data-portrait-frame 
                className="absolute inset-0 overflow-hidden will-change-transform"
                style={{ clipPath: "inset(48% 0% 48% 0%)" }}
              >
                {/* Corner borders */}
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

                <div className="absolute inset-0 will-change-transform bg-black">
                  {/* Base Image */}
                  <img 
                    ref={baseImgRef}
                    src="/jihed.webp" 
                    alt="Portrait" 
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ zIndex: 1 }}
                    onLoad={() => requestAnimationFrame(() => ScrollTrigger.refresh())}
                  />

                  {/* X-Ray Overlay */}
                  <div 
                    ref={xrayMaskRef} 
                    className="absolute inset-0 will-change-[clip-path]"
                    style={{ 
                      clipPath: "inset(0% 0% 100% 0%)", 
                      zIndex: 2 
                    }}
                  >
                    <img 
                      ref={xrayImgRef}
                      src="/xrayPerfect.webp" 
                      alt="X-Ray" 
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        filter: "contrast(1.7) brightness(0.95) saturate(0.85)" 
                      }}
                      onLoad={() => requestAnimationFrame(() => ScrollTrigger.refresh())}
                    />
                  </div>

                  {/* Scanline Glow */}
                  <div 
                    ref={scanlineGlowRef} 
                    className="absolute inset-x-0 pointer-events-none will-change-transform"
                    style={{
                      zIndex: 10,
                      top: 0,
                      opacity: 0,
                      height: "80px",
                      background: "radial-gradient(ellipse 100% 50% at 50% 50%, rgba(255,152,162,0.18) 0%, transparent 70%)",
                    }}
                  />

                  {/* Main Scanline */}
                  <div 
                    ref={scanlineRef} 
                    data-portrait-scanline 
                    className="absolute inset-x-0 pointer-events-none will-change-transform"
                    style={{
                      zIndex: 11,
                      top: 0,
                      opacity: 0,
                      height: "1px",
                      background: "linear-gradient(to right, transparent 0%, rgba(255,152,162,0.15) 10%, rgba(255,152,162,0.9) 30%, #ff98a2 50%, rgba(255,152,162,0.9) 70%, rgba(255,152,162,0.15) 90%, transparent 100%)",
                      boxShadow: "0 0 8px 1px rgba(255,152,162,0.5), 0 0 24px 2px rgba(255,152,162,0.2)",
                    }}
                  />
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-end px-4 pb-3" 
                     style={{ 
                       background: "linear-gradient(to top, rgba(8,8,8,0.7) 0%, transparent 100%)" 
                     }}>
                  <span className="font-mono text-[10px] text-white/30 tracking-widest">JH001</span>
                  <span className="font-mono text-[10px] text-white/30 tracking-widest">©2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accent Lines */}
          <div className="absolute inset-x-0 z-30 pointer-events-none" style={{ top: "50%" }}>
            <div 
              ref={lineLeftRef} 
              className="absolute left-0 origin-left"
              style={{
                width: "calc(50% - clamp(130px, 42.5vw, 290px))",
                height: "0.5px",
                background: "linear-gradient(to right, transparent, rgba(255,152,162,0.5))",
                transform: "scaleX(0)"
              }}
            />
            <div 
              ref={lineRightRef} 
              className="absolute right-0 origin-right"
              style={{
                width: "calc(50% - clamp(130px, 42.5vw, 290px))",
                height: "0.5px",
                background: "linear-gradient(to left, transparent, rgba(255,152,162,0.5))",
                transform: "scaleX(0)"
              }}
            />
          </div>

          {/* Meta Status */}
          <div 
            ref={metaRef} 
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-8 opacity-0"
          >
            <div className="text-center">
              <div className="text-[9px] tracking-[0.3em] text-white/25 uppercase font-light">Status</div>
              <div className="text-[11px] tracking-[0.15em] text-white/60 uppercase mt-0.5">Available</div>
            </div>
          </div>

          {/* Initial Overlay */}
          <div 
            ref={overlayRef} 
            className="absolute inset-0 z-40 pointer-events-none"
            style={{ 
              background: "#080808", 
              transformOrigin: "top" 
            }} 
          />
        </div>
      </section>
    </>
  );
}