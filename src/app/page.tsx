"use client";

import { useState, useRef, useCallback } from "react";
import { useScroll } from "framer-motion";

import { LoadingScreen } from "@/components/ui/LoadingScreen";

// --- Static Section Imports ---
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
                {/* Global skull canvas — moved inside main so it shares the stacking context */}
                {!isLoading && <GlobalSkullCanvas />}
                {!isLoading && <Scene />}

                {/* Portrait shell above skull; jihed img clip-path reveals WebGL skull with scan */}
                <div className="relative z-[40] mt-0 w-full">
                    <PortraitSection />
                </div>

                <div className="relative z-[40] mt-24 md:mt-32 lg:mt-40">
                    <AboutSection />
                </div>

                {/* Tech Stack section covers the skull with higher z-index and dark BG */}
                <div className="relative z-[60] mt-0 bg-[#080808]">
                    <TechStackSection />
                </div>

                <div
                    id="projects-wrapper"
                    ref={projectsWrapperRef}
                    className="relative z-[1] mt-32 md:mt-40 lg:mt-48"
                >
                    {PROJECTS.map((project, i) => (
                        <ProjectSection key={i} index={i} {...project} />
                    ))}

                    <div className="mt-32 md:mt-40 lg:mt-48">
                        <ExperienceSection />
                    </div>

                    <div id="philosophy-section" className="mt-12 md:mt-16 lg:mt-24">
                        <PhilosophySection />
                    </div>
                </div>

                {/* Pin + scroll-scrub text — must stay outside #projects-wrapper (see useSectionTransition) */}
                <WordRevealSection />

                {/* Contact must NOT live inside #projects-wrapper to prevent GSAP layering glitches. */}

                <div className="relative z-[150] mt-0 w-full">
                    <ContactSection />
                </div>
            </main>
        </>
    );
}