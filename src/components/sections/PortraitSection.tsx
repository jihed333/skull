"use client";

import React, { useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import RoleSwitcher from "@/components/ui/hero-shutter-text";
import { scanlineState } from "../canvas/scanlineState";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const XRAY_END = 0.82;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1;
const round = (v: number) => Math.round(v * DPR) / DPR;

let _svhInitialised = false;
function initialiseSvhFallback() {
  if (_svhInitialised || typeof window === "undefined") return;
  _svhInitialised = true;
  document.documentElement.style.setProperty("--svh", `${window.innerHeight * 0.01}px`);
}

let _isMobile: boolean | null = null;
function getIsMobile(): boolean {
  if (_isMobile !== null) return _isMobile;
  if (typeof window === "undefined") return false;
  _isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  return _isMobile;
}

function idleFrame(fn: () => void): () => void {
  let outer: number, inner: number;
  outer = requestAnimationFrame(() => { inner = requestAnimationFrame(fn); });
  return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
}

interface MarqueeLineProps { text: string; speed?: number; reverse?: boolean; }
function MarqueeLine({ text, speed = 40, reverse = false }: MarqueeLineProps) {
  const items = useMemo(() => Array<string>(12).fill(text), [text]);
  return (
    <div
      className={`portrait-marqueeTrack ${reverse ? "portrait-marqueeTrack--rev" : "portrait-marqueeTrack--fwd"}`}
      style={{ "--marquee-dur": `${speed}s` } as React.CSSProperties}
    >
      {items.map((label, i) => (
        <span key={i} className="portrait-marqueeItem">
          {label}<span className="portrait-marqueeDot" aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  );
}

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

  const scrollProgressRef = useRef(0);
  const cachedFrameH      = useRef(0);
  const isMobile          = useMemo(getIsMobile, []);

  useEffect(() => { initialiseSvhFallback(); }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const entrance = gsap.timeline({ delay: 0.2 });
      entrance.fromTo(overlayRef.current, { scaleY: 1 }, { scaleY: 0, transformOrigin: "bottom", duration: 1.4, ease: "expo.inOut" });
      entrance.fromTo(frameRef.current, { clipPath: "inset(48% 0% 48% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, "-=0.6");
      entrance.fromTo([lineLeftRef.current, lineRightRef.current], { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, "-=1");
      entrance.fromTo(titleTopRef.current, { opacity: 0, x: -60, y: -30 }, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, "-=0.9");
      entrance.fromTo(titleBotRef.current, { opacity: 0, x: 60, y: 30 }, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, "-=1");
      entrance.fromTo(roleRef.current, { opacity: 0, x: 30, y: -10 }, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: "expo.out" }, "-=0.9");
      entrance.fromTo(metaRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.4");

      const scroll = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top", end: "+=160%",
          pin: true, scrub: true, pinSpacing: true, anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => { scrollProgressRef.current = self.progress; },
        },
      });

      if (!isMobile) {
        scroll.to(titleTopRef.current, { xPercent: -8, yPercent: -4, duration: 1, ease: "none" }, 0);
        scroll.to(titleBotRef.current, { xPercent: 8,  yPercent: 4,  duration: 1, ease: "none" }, 0);
      }

      const cancelIdle = idleFrame(() => ScrollTrigger.refresh());
      return () => cancelIdle();
    }, sectionRef);
    return () => ctx.revert();
  }, [isMobile]);

  useEffect(() => {
    const refresh = () => idleFrame(() => ScrollTrigger.refresh());
    if (document.readyState === "complete") refresh();
    else window.addEventListener("load", refresh, { once: true });
  }, []);

  useEffect(() => {
    if (frameRef.current) {
      cachedFrameH.current = frameRef.current.clientHeight;
      scanlineState.frameH = cachedFrameH.current;
    }
    const ro = new ResizeObserver(() => {
      if (frameRef.current) {
        cachedFrameH.current = frameRef.current.clientHeight;
        scanlineState.frameH = cachedFrameH.current;
      }
    });
    if (frameRef.current) ro.observe(frameRef.current);

    const tick = () => {
      const p     = scrollProgressRef.current;
      const xrayT = Math.min(p / XRAY_END, 1);
      const scanY = round(xrayT * cachedFrameH.current);
      const glowY = round(scanY - 45);
      const clip  = round((1 - xrayT) * 100);
      const opacity = p > 0.01 ? "1" : "0";

      // Write shared state BEFORE style writes so GlobalSkullCanvas
      // reads the correct value in the same gsap.ticker pass.
      scanlineState.scanY   = scanY;
      scanlineState.frameH  = cachedFrameH.current;
      scanlineState.opacity = p > 0.01 ? 1 : 0;

      if (xrayMaskRef.current)
        xrayMaskRef.current.style.clipPath = `inset(0% 0% ${clip}% 0%)`;
      if (scanlineRef.current) {
        scanlineRef.current.style.transform = `translateY(${scanY}px) translateZ(0)`;
        scanlineRef.current.style.opacity   = opacity;
      }
      if (scanlineGlowRef.current) {
        scanlineGlowRef.current.style.transform = `translateY(${glowY}px) translateZ(0)`;
        scanlineGlowRef.current.style.opacity   = opacity;
      }
    };

    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); ro.disconnect(); };
  }, []);

  return (
    <section ref={sectionRef} id="hero" data-portrait-section className="portrait-section" aria-label="Portrait">
      <div className="portrait-bgGlow" aria-hidden="true"><div className="portrait-bgGlowCircle" /></div>
      <div className="portrait-inner">
        <div className="portrait-marqueeRow portrait-marqueeRow--top" aria-hidden="true">
          <MarqueeLine text="JIHED HAGUI — ARCHITECT — DESIGNER — VISIONARY — PORTFOLIO 2026" speed={45} />
        </div>
        <div className="portrait-marqueeRow portrait-marqueeRow--bottom" aria-hidden="true">
          <MarqueeLine text="AVAILABLE FOR WORK — BASED IN TUNISIA — OPEN TO GLOBAL PROJECTS" speed={38} reverse />
        </div>
        <aside className="portrait-verticalLabel" aria-hidden="true">
          <span className="portrait-verticalLabel__text">Portrait</span>
          <div className="portrait-verticalLabel__divider" />
          <span className="portrait-verticalLabel__text font-mono">01</span>
        </aside>
        <div ref={titleTopRef} className="portrait-titleTop">
          <TextHoverEffect text="JIHED" viewBox="0 0 350 160" fontSize={140} fontWeight={900} />
        </div>
        <div ref={titleBotRef} className="portrait-titleBottom">
          <TextHoverEffect text="HAGUI" viewBox="0 0 900 160" fontSize={120} fontWeight={900} fontStyle="italic" textColor="#ff98a2" />
        </div>
        <div ref={roleRef} className="portrait-roleTag">
          <div className="portrait-roleTag__line" aria-hidden="true" />
          <span className="portrait-roleTag__text"><RoleSwitcher /></span>
        </div>
        <div className="portrait-frameOuter">
          <div className="portrait-frameSizer">
            <div ref={frameRef} data-portrait-frame className="portrait-frame">
              <div className="portrait-cornerTL" aria-hidden="true" />
              <div className="portrait-cornerTR" aria-hidden="true" />
              <div className="portrait-cornerBL" aria-hidden="true" />
              <div className="portrait-cornerBR" aria-hidden="true" />
              <div className="portrait-imageStack">
                <img src="/jihed.webp" alt="Jihed Hagui — Portrait" className="portrait-baseImg" onLoad={() => idleFrame(() => ScrollTrigger.refresh())} draggable={false} />
                <div ref={xrayMaskRef} className="portrait-xrayMask">
                  <img src="/xrayPerfect.webp" alt="" aria-hidden="true" className="portrait-xrayImg" onLoad={() => idleFrame(() => ScrollTrigger.refresh())} draggable={false} />
                </div>
                <div ref={scanlineGlowRef} className="portrait-scanlineGlow" aria-hidden="true" />
                <div ref={scanlineRef} data-portrait-scanline className="portrait-scanline" aria-hidden="true" />
              </div>
              <footer className="portrait-frameFooter">
                <span className="portrait-frameFooter__label">JH001</span>
                <span className="portrait-frameFooter__label">©2026</span>
              </footer>
            </div>
          </div>
        </div>
        <div className="portrait-linesRow" aria-hidden="true">
          <div ref={lineLeftRef} className="portrait-lineLeft" />
          <div ref={lineRightRef} className="portrait-lineRight" />
        </div>
        <div ref={metaRef} className="portrait-meta">
          <div className="portrait-metaCell">
            <div className="portrait-metaCell__label">Status</div>
            <div className="portrait-metaCell__value">Available</div>
          </div>
        </div>
        <div ref={overlayRef} className="portrait-overlay" aria-hidden="true" />
      </div>
    </section>
  );
}