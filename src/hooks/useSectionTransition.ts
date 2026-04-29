"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useSectionTransition() {
  // Refs to store live progress values — written in onUpdate (no DOM), read in RAF
  const aboutProgressRef = useRef(0);
  const projectsProgressRef = useRef(0);
  const aboutDistRef = useRef(0);
  const projectsDistRef = useRef(0);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;

    const about = document.querySelector("#about") as HTMLElement;
    const tech = document.querySelector("#tech-stack") as HTMLElement;
    const projectsWrapper = document.querySelector("#projects-wrapper") as HTMLElement;

    if (!about || !tech) return;

    // ── Clean slate ──
    gsap.set([about, tech], { clearProps: "all" });
    if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });

    gsap.set(about, { position: "relative", zIndex: 1 });
    gsap.set(tech,  { position: "relative", zIndex: 10 });
    if (projectsWrapper) gsap.set(projectsWrapper, { position: "relative", zIndex: 1 });

    // ── ST1: Pin About (desktop) / parallax (mobile) ──
    const st1 = ScrollTrigger.create({
      trigger: about,
      start: "center center",
      endTrigger: tech,
      end: "top top",
      pin: !isMobile,
      pinSpacing: false,
      anticipatePin: 1,
      fastScrollEnd: true,
      preventOverlaps: true,
      invalidateOnRefresh: true,
      // FIX: Only update a ref here — zero DOM writes on the scroll thread
      onUpdate: (self) => {
        if (isMobile) {
          aboutProgressRef.current = self.progress;
          aboutDistRef.current = self.end - self.start;
        }
      },
    });

    // ── ST2: Projects parallax rise ──
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
        // FIX: Only update a ref here — zero DOM writes on the scroll thread
        onUpdate: (self) => {
          projectsProgressRef.current = self.progress;
          projectsDistRef.current = self.end - self.start;
        },
      });
    }

    // ── RAF write loop: ONE place that writes transforms, once per frame ──
    // This batches all DOM mutations into a single style pass per frame,
    // eliminating the layout-thrash caused by writing inside onUpdate.
    let rafId: number;
    const writeFrame = () => {
      if (isMobile && aboutDistRef.current > 0) {
        const y = aboutDistRef.current * 0.85 * aboutProgressRef.current;
        about.style.transform = `translateY(${y}px)`;
      }
      if (projectsWrapper && projectsDistRef.current > 0) {
        const y = -projectsDistRef.current * 0.5 * (1 - projectsProgressRef.current);
        projectsWrapper.style.transform = `translateY(${y}px)`;
      }
      rafId = requestAnimationFrame(writeFrame);
    };
    rafId = requestAnimationFrame(writeFrame);

    ScrollTrigger.refresh();

    return () => {
      cancelAnimationFrame(rafId);
      st1.kill();
      if (st2) st2.kill();
      gsap.set(about, { clearProps: "all" });
      gsap.set(tech,  { clearProps: "all" });
      if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });
    };
  }, []);
}
