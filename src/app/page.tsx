"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { PortraitSection } from "@/components/sections/PortraitSection";
import { TechStackSection } from "@/components/sections/TechStackSection";
import { ProjectSection } from "@/components/sections/ProjectSection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { ScrollingTextSection } from "@/components/sections/ScrollingTextSection";
import { ContactSection } from "@/components/sections/ContactSection";

import { PROJECTS } from "@/constants/content";
import { useSectionTransition } from "@/hooks/useSectionTransition";

const Scene = dynamic(() => import("@/components/canvas/Scene"), {
    ssr: false,
});

export default function Home() {
    const [isLoading, setIsLoading] = useState(true);

    const handleLoadingComplete = useCallback(() => {
        setIsLoading(false);
    }, []);

    const projectsWrapperRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: projectsWrapperRef,
        offset: ["start end", "end start"],
    });

    // Horizontal slide faster
    const bgTextX = useTransform(
        scrollYProgress,
        [0, 0.03, 0.6, 1],
        ["150%", "0%", "-100%", "-150%"]
    );

    // Smooth opacity curve
    const bgTextOpacity = useTransform(
        scrollYProgress,
        [0, 0.05, 0.7, 1],
        [0, 0.06, 0.06, 0]
    );

    useSectionTransition();

    return (
        <>
            {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
            <Scene />

            <main
                className="relative z-10 w-full overflow-x-hidden"
                style={{
                    opacity: isLoading ? 0 : 1,
                    transition: "opacity 0.8s ease",
                    pointerEvents: isLoading ? "none" : "auto",
                }}
            >
                <HeroSection />
                <AboutSection />
                <TechStackSection />

                <div
                    id="projects-wrapper"
                    ref={projectsWrapperRef}
                    className="relative z-[1]"
                >
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="sticky top-[51%] left-0 w-full">
                            <motion.div
                                style={{ x: bgTextX, opacity: bgTextOpacity }}
                                className="whitespace-nowrap select-none"
                            >
                                <span className="font-display text-[18vw] md:text-[22vw] font-black text-white leading-none uppercase tracking-tighter difference-blend">
                                    •••••••• TO THE GLORY ••••••••
                                </span>
                            </motion.div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        {PROJECTS.map((project, i) => (
                            <ProjectSection key={i} index={i} {...project} />
                        ))}

                        <ExperienceSection />
                        <PhilosophySection />
                        <ScrollingTextSection />
                        <PortraitSection />
                        <ContactSection />
                    </div>
                </div>
            </main>
        </>
    );
}