"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function useSectionTransition() {
  useEffect(() => {
    const about = document.querySelector("#about") as HTMLElement;
    const tech = document.querySelector("#tech-stack") as HTMLElement;
    const projectsWrapper = document.querySelector("#projects-wrapper") as HTMLElement;

    if (!about || !tech) return;

    // ── FIX 4: Disable complex pinning on mobile entirely ──
    // GSAP pin-spacer + mobile URL bar = violent jitter. On small screens
    // the cinematic overlay effect is sacrificed for a working experience.
    if (isTouchDevice() || window.innerWidth < 768) {
      // On mobile: just make sure no leftover GSAP transforms affect layout
      gsap.set([about, tech], { clearProps: "all" });
      if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });
      return;
    }

    // ── Desktop only from here ──
    gsap.set([about, tech], { clearProps: "all" });
    if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });

    gsap.set(about, { position: "relative", zIndex: 1 });
    gsap.set(tech,  { position: "relative", zIndex: 10 });
    if (projectsWrapper) gsap.set(projectsWrapper, { position: "relative", zIndex: 1 });

    const st1 = ScrollTrigger.create({
      trigger: about,
      start: "center center",
      endTrigger: tech,
      end: "top top",
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      fastScrollEnd: true,
      preventOverlaps: true,
      invalidateOnRefresh: true,
    });

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
          gsap.set(projectsWrapper, {
            y: -distance * 0.5 * (1 - self.progress),
            overwrite: "auto",
          });
        },
      });
    }

    ScrollTrigger.refresh();

    return () => {
      st1.kill();
      if (st2) st2.kill();
      gsap.set(about, { clearProps: "all" });
      gsap.set(tech,  { clearProps: "all" });
      if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });
    };
  }, []);
}