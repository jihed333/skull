"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useScroll } from "framer-motion";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SectionNav, type NavSection } from "@/components/ui/SectionNav";

import { AboutSection } from "@/components/sections/AboutSection";
import { TechStackSection } from "@/components/sections/TechStackSection";
import { PortraitSection } from "@/components/sections/PortraitSection";
import { ProjectSection } from "@/components/sections/ProjectSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { WordRevealSection } from "@/components/sections/WordRevealSection";
import dynamic from "next/dynamic";
const GlobalSkullCanvas = dynamic(() => import("@/components/canvas/GlobalSkullCanvas").then(mod => mod.GlobalSkullCanvas), { ssr: false });

import { PROJECTS } from "@/constants/content";
import { useSectionTransition } from "@/hooks/useSectionTransition";

// Stable reference — defined outside component so it never triggers re-renders
const NAV_SECTIONS: NavSection[] = [
  { id: "hero",         label: "Home" },
  { id: "about",        label: "About" },
  { id: "tech-stack",   label: "Tech" },
  { id: "project-1",    label: "Projects" },
  { id: "experience",   label: "Experience" },
  { id: "contact",      label: "Contact" },
];

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

      {/* Premium section navigator — hidden during loading */}
      {!isLoading && <SectionNav sections={NAV_SECTIONS} />}

      <main
        className="relative z-10 w-full overflow-x-hidden"
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.8s ease",
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        {/* FIX: Use a single unified canvas for all 3D (Skull + Knight).
            Two WebGL contexts were the #1 cause of mobile jitter.
            We now pass isMobile to GlobalSkullCanvas which handles its own
            internal optimizations (simpler shaders, lower DPR, no shadows). */}
        <GlobalSkullCanvas isMobile={isMobile} />

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