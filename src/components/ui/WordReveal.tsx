"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

const PARAGRAPH_WORDS = [
  { text: "Every", accent: false },
  { text: "profound", accent: true },
  { text: "creation", accent: false },
  { text: "begins", accent: false },
  { text: "in", accent: false },
  { text: "the", accent: false },
  { text: "space", accent: true },
  { text: "between", accent: false },
  { text: "restraint", accent: true },
  { text: "and", accent: false },
  { text: "freedom—", accent: false },
  { text: "where", accent: false },
  { text: "the", accent: false },
  { text: "discipline", accent: true },
  { text: "of", accent: false },
  { text: "removal", accent: false },
  { text: "meets", accent: false },
  { text: "the", accent: false },
  { text: "courage", accent: true },
  { text: "to", accent: false },
  { text: "preserve", accent: false },
  { text: "what", accent: false },
  { text: "is", accent: false },
  { text: "essential", accent: true },
  { text: "to", accent: false },
  { text: "the", accent: false },
  { text: "human", accent: false },
  { text: "experience.", accent: false },
];

export function WordRevealSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressLblRef = useRef<HTMLSpanElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const paragraph = paragraphRef.current;
    if (!section || !paragraph) return;

    const ctx = gsap.context(() => {
      const words = paragraph.querySelectorAll<HTMLSpanElement>(".word");
      if (!words.length) return;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        gsap.set(words, { opacity: 1, x: 0, filter: "blur(0px)", scale: 1 });
        if (progressRef.current) progressRef.current.style.width = "100%";
        if (progressLblRef.current) progressLblRef.current.textContent = "100%";
        if (afterRef.current) gsap.set(afterRef.current, { opacity: 1, y: 0 });
        return;
      }

      // ── FIX 17: On mobile, use scroll-triggered fade instead of pinned scrub ──
      // Pinning on mobile (pin: true) causes jitter from URL-bar resize events.
      // On small screens we use a simple ScrollTrigger with toggleActions instead.
      const mobile = isTouchDevice() || window.innerWidth < 768;

      if (mobile) {
        // Simple: reveal all words together when section enters viewport
        gsap.fromTo(
          words,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.04,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
        // Show progress bar immediately
        if (progressRef.current) progressRef.current.style.width = "100%";
        if (progressLblRef.current) progressLblRef.current.textContent = "100%";
        if (afterRef.current) {
          gsap.fromTo(
            afterRef.current,
            { opacity: 0, y: 20 },
            {
              opacity: 1, y: 0, duration: 0.5,
              scrollTrigger: { trigger: afterRef.current, start: "top 85%", toggleActions: "play none none none" },
            }
          );
        }
        return;
      }

      // ── Desktop: original pinned scrub ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 1.35,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const pct = Math.round(self.progress * 100);
            if (progressRef.current) progressRef.current.style.width = `${pct}%`;
            if (progressLblRef.current)
              progressLblRef.current.textContent = String(pct).padStart(2, "0") + "%";
          },
        },
      });

      words.forEach((word, i) => {
        const charLen = word.textContent?.length ?? 6;
        const dur = 0.28 + (charLen / 22) * 0.18;
        tl.fromTo(
          word,
          { opacity: 0, x: 56, filter: "blur(12px)", scale: 0.97 },
          {
            opacity: 1,
            x: 0,
            filter: "blur(0px)",
            scale: 1,
            duration: dur,
            ease: "power3.out",
          },
          i * 0.11
        );
      });

      if (afterRef.current) {
        gsap.fromTo(
          afterRef.current,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: afterRef.current,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative z-[1] mt-24 w-full md:mt-32 lg:mt-40">
      <section
        ref={sectionRef}
        id="manifesto"
        className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-transparent"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 58% 52% at 16% 48%, rgba(255,152,162,0.07) 0%, transparent 58%), radial-gradient(ellipse 42% 55% at 84% 30%, rgba(255,179,189,0.05) 0%, transparent 58%)",
            animation: "manifestoAmbient 18s ease-in-out infinite alternate",
          }}
        />

        <div className="relative z-10 mx-auto w-[90%] max-w-[900px] px-1">
          <div className="mb-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-mercury/40">
            <span className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
            Manifesto
          </div>

          <p
            ref={paragraphRef}
            className="font-display text-[clamp(1.45rem,3.2vw,2.75rem)] font-light leading-[1.34] tracking-[-0.02em] text-ice"
          >
            {PARAGRAPH_WORDS.map(({ text, accent }, i) => (
              <span
                key={i}
                className={`word mr-[0.28em] inline-block will-change-transform ${
                  accent ? "text-gradient" : ""
                }`}
              >
                {text}
              </span>
            ))}
          </p>
        </div>
      </section>
    </div>
  );
}