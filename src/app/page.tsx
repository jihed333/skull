"use client";

import { useState, useRef, useCallback } from "react";
import { useScroll } from "framer-motion";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { HeroSection } from "@/components/sections/HeroSection";

// --- Static Section Imports ---
import { AboutSection } from "@/components/sections/AboutSection";
import { TechStackSection } from "@/components/sections/TechStackSection";
import { PortraitSection } from "@/components/sections/PortraitSection";
import { ProjectSection } from "@/components/sections/ProjectSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { TextDropSection } from "@/components/sections/TextDropSection";

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
                {/* Hero is always visible above the fold */}
                <HeroSection />

                <div className="mt-24 md:mt-32 lg:mt-40">
                    <AboutSection />
                </div>

                <div className="mt-0">
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

                    <div className="mt-32 md:mt-40 lg:mt-48">
                        <PhilosophySection />
                    </div>

                    <TextDropSection />
                </div>

                {/* Portrait + contact must NOT live inside #projects-wrapper: that node gets a
                    GSAP translateY from useSectionTransition, which turns it into a containing
                    block and breaks ScrollTrigger pin / fixed layering (black viewport glitches). */}
                <div className="relative z-[1] mt-0 w-full">
                    <PortraitSection />
                </div>

                <div className="relative z-[1] mt-0 w-full">
                    <ContactSection />
                </div>
            </main>
        </>
    );
}