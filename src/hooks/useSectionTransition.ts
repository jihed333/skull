"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useSectionTransition() {
  const aboutProgressRef = useRef(0);
  const projectsProgressRef = useRef(0);
  const aboutDistRef = useRef(0);
  const projectsDistRef = useRef(0);

  useEffect(() => {
    // FIX: Detect mobile by both pointer AND width — some Android browsers
    // report fine pointer but behave like touch for scroll purposes.
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);

    const about = document.querySelector("#about") as HTMLElement;
    const tech = document.querySelector("#tech-stack") as HTMLElement;
    const projectsWrapper = document.querySelector("#projects-wrapper") as HTMLElement;

    if (!about || !tech) return;

    gsap.set([about, tech], { clearProps: "all" });
    if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });

    gsap.set(about, { position: "relative", zIndex: 1 });
    gsap.set(tech, { position: "relative", zIndex: 10 });
    if (projectsWrapper) gsap.set(projectsWrapper, { position: "relative", zIndex: 1 });

    // FIX: Re-enabled pin on mobile. The original jitter was caused by two
    // WebGL contexts fighting the GPU, not by the pin itself.
    // Now that skull+knight share a single canvas, pin is safe again.
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
      onUpdate: (self) => {
        aboutProgressRef.current = self.progress;
        aboutDistRef.current = self.end - self.start;
      },
    });

    let st2: ScrollTrigger | undefined;
    if (projectsWrapper) {
      st2 = ScrollTrigger.create({
        trigger: tech,
        start: "top top",
        end: "bottom top",
        pinSpacing: false,
        anticipatePin: isMobile ? 0 : 1,
        fastScrollEnd: true,
        preventOverlaps: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          projectsProgressRef.current = self.progress;
          projectsDistRef.current = self.end - self.start;
        },
      });
    }

    // FIX: On mobile, skip the RAF write loop entirely.
    // The translateY transforms applied each frame fight with the browser's
    // own composited scroll layer and cause the visible "trembling".
    // Mobile users get native scroll speed with no transforms = smooth.
    let rafId: number | undefined;

    if (!isMobile && projectsWrapper) {
      const writeFrame = () => {
        if (projectsDistRef.current > 0) {
          const y = -projectsDistRef.current * 0.5 * (1 - projectsProgressRef.current);
          projectsWrapper.style.transform = `translateY(${y.toFixed(2)}px)`;
        }
        rafId = requestAnimationFrame(writeFrame);
      };
      rafId = requestAnimationFrame(writeFrame);
    }

    ScrollTrigger.refresh();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      st1.kill();
      if (st2) st2.kill();
      gsap.set(about, { clearProps: "all" });
      gsap.set(tech, { clearProps: "all" });
      if (projectsWrapper) gsap.set(projectsWrapper, { clearProps: "all" });
    };
  }, []);
}