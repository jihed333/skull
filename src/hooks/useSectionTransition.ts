"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useSectionTransition() {
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    
    const about = document.querySelector("#about") as HTMLElement;
    const tech = document.querySelector("#tech-stack") as HTMLElement;
    const projectsWrapper = document.querySelector("#projects-wrapper") as HTMLElement;

    if (!about || !tech) return;

    // ── Clean slate ──
    gsap.set([about, tech], { clearProps: "all" });
    if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });

    // Tech Stack sits on top visually as it scrolls over the pinned About
    gsap.set(about, { position: "relative", zIndex: 1 });
    gsap.set(tech,  { position: "relative", zIndex: 10 });
    if (projectsWrapper) gsap.set(projectsWrapper, { position: "relative", zIndex: 1 });

    // ══════════════════════════════════════════════════════
    // ST1 — Pin the About section at center-screen
    //
    // About is pinned the moment its CENTER hits viewport
    // center. It stays frozen there while the user scrolls
    // until the TOP of TechStack reaches the top of the
    // viewport — at which point About unpins and the
    // TechStack fully covers it.
    //
    // pinSpacing: false  →  no extra height is injected,
    //             so TechStack sits immediately below About
    //             in the document flow and slides up naturally.
    // ══════════════════════════════════════════════════════
    const st1 = ScrollTrigger.create({
      trigger: about,
      start: "center center",   // pin fires when About's center = viewport center
      endTrigger: tech,
      end: "top top",
      pin: !isMobile,           // DISABLING PIN ON MOBILE fixes the jitter!
      pinSpacing: false,
      anticipatePin: 1,
      fastScrollEnd: true,
      preventOverlaps: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (isMobile) {
          const distance = self.end - self.start;
          // Move About downwards at 85% of scroll speed to create a smooth parallax overlap
          // This avoids the severe jitter of native GSAP pinning on mobile browsers.
          gsap.set(about, {
            y: distance * 0.85 * self.progress,
            overwrite: "auto",
          });
        }
      },
    });

    // ══════════════════════════════════════════════════════
    // ST2 — Projects parallax rise
    //
    // As TechStack scrolls away, projects-wrapper starts
    // offset below center and glides smoothly upward.
    // ══════════════════════════════════════════════════════
    let st2: ScrollTrigger | undefined;
    if (projectsWrapper) {
      st2 = ScrollTrigger.create({
        trigger: tech,
        start: "top top",
        end: "bottom top",
        pinSpacing: false,
        anticipatePin: 1,
        fastScrollEnd: true,
        preventOverlaps: true,
        invalidateOnRefresh: true,

        onUpdate: (self) => {
          const distance = self.end - self.start;
          // Parallax: starts at –50 % offset, smoothly reaches 0
          gsap.set(projectsWrapper, {
            y: -distance * 0.5 * (1 - self.progress),
            overwrite: "auto",
          });
        },
      });
    }

    ScrollTrigger.refresh();

    // ── Cleanup ──
    return () => {
      st1.kill();
      if (st2) st2.kill();
      gsap.set(about, { clearProps: "all" });
      gsap.set(tech,  { clearProps: "all" });
      if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });
    };
  }, []);
}
