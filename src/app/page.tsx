"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useScroll } from "framer-motion";

import { LoadingScreen } from "@/components/ui/LoadingScreen";

import { AboutSection } from "@/components/sections/AboutSection";
import { TechStackSection } from "@/components/sections/TechStackSection";
import { PortraitSection } from "@/components/sections/PortraitSection";
import { ProjectSection } from "@/components/sections/ProjectSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { WordRevealSection } from "@/components/sections/WordRevealSection";
import { GlobalSkullCanvas } from "@/components/canvas/GlobalSkullCanvas";
import Scene from "@/components/canvas/Scene";

import { PROJECTS } from "@/constants/content";
import { useSectionTransition } from "@/hooks/useSectionTransition";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  // FIX: Detect mobile once on mount — avoids SSR mismatch (hydration error source).
  // Never read window during render; only after mount inside useEffect.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
    );
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const projectsWrapperRef = useRef<HTMLDivElement>(null);

  useScroll({
    target: projectsWrapperRef,
    offset: ["start end", "end start"],
  });

  useSectionTransition();

  return (
    <>
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}

      <main
        className="relative z-10 w-full overflow-x-hidden"
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.8s ease",
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        {/* FIX: Skip Three.js canvases entirely on mobile.
            WebGL + GSAP ScrollTrigger + Lenis all competing for the GPU
            and main thread on a phone = jitter, crashes, client exceptions.
            Mobile gets the portrait photo without the 3D skull overlay. */}
        {!isLoading && !isMobile && <GlobalSkullCanvas />}
        {!isLoading && !isMobile && <Scene />}

        <div className="relative z-[40] mt-0 w-full">
          <PortraitSection />
        </div>

        <div className="relative z-[40] mt-12 md:mt-32 lg:mt-40">
          <AboutSection />
        </div>

        <div className="relative z-[60] mt-0 bg-[#080808]">
          <TechStackSection />
        </div>

        <div
          id="projects-wrapper"
          ref={projectsWrapperRef}
          className="relative z-[1] mt-16 md:mt-40 lg:mt-48"
        >
          {PROJECTS.map((project, i) => (
            <ProjectSection key={i} index={i} {...project} />
          ))}

          <div className="mt-16 md:mt-40 lg:mt-48">
            <ExperienceSection />
          </div>

          <div id="philosophy-section" className="mt-12 md:mt-16 lg:mt-24">
            <PhilosophySection />
          </div>
        </div>

        <WordRevealSection />

        <div className="relative z-[150] mt-0 w-full">
          <ContactSection />
        </div>
      </main>
    </>
  );
}