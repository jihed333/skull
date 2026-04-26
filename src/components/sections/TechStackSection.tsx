"use client";

import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlassCard } from "@/components/ui/GlassCard";
import { TECH_STACK } from "@/constants/content";

import Silk from "@/components/ui/Silk";

gsap.registerPlugin(ScrollTrigger);

export function TechStackSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Track viewport for conditional rendering
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Label flip animation
            if (labelRef.current) {
                const chars = labelRef.current.querySelectorAll(".lbl-char");
                gsap.fromTo(
                    chars,
                    { rotateX: -90, opacity: 0, transformOrigin: "bottom center" },
                    {
                        rotateX: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.03,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: labelRef.current,
                            start: "top 85%",
                            toggleActions: "play none none reverse",
                        },
                    }
                );
            }

            // Title slot machine drop
            if (titleRef.current) {
                const words = titleRef.current.querySelectorAll(".slot-word");
                words.forEach((word, i) => {
                    gsap.fromTo(
                        word,
                        { yPercent: -120, opacity: 0, rotateX: 40 },
                        {
                            yPercent: 0,
                            opacity: 1,
                            rotateX: 0,
                            duration: 0.9,
                            delay: i * 0.18,
                            ease: "bounce.out",
                            scrollTrigger: {
                                trigger: titleRef.current,
                                start: "top 80%",
                                toggleActions: "play none none reverse",
                            },
                        }
                    );
                });
            }

            // Cards — use matchMedia for desktop vs mobile animations
            if (gridRef.current) {
                const mm = gsap.matchMedia();

                // Desktop: full 3D diagonal wave
                mm.add("(min-width: 768px)", () => {
                    const cards = gridRef.current!.querySelectorAll(".tech-card");
                    const sorted = Array.from(cards).map((card, i) => {
                        const cols = window.innerWidth >= 1024 ? 4 : 2;
                        const row = Math.floor(i / cols);
                        const col = i % cols;
                        return { el: card, diag: row + col };
                    });
                    sorted.sort((a, b) => a.diag - b.diag);

                    sorted.forEach((item, i) => {
                        gsap.fromTo(
                            item.el,
                            {
                                y: 50,
                                x: -30,
                                rotateY: -12,
                                rotateX: 8,
                                opacity: 0,
                                scale: 0.92,
                            },
                            {
                                y: 0,
                                x: 0,
                                rotateY: 0,
                                rotateX: 0,
                                opacity: 1,
                                scale: 1,
                                duration: 1,
                                delay: i * 0.1,
                                ease: "power4.out",
                                scrollTrigger: {
                                    trigger: gridRef.current,
                                    start: "top 78%",
                                    toggleActions: "play none none reverse",
                                },
                            }
                        );
                    });
                });

                // Mobile: simple fade-up, no 3D rotation (prevents clipping)
                mm.add("(max-width: 767px)", () => {
                    const cards = gridRef.current!.querySelectorAll(".tech-card");
                    cards.forEach((card, i) => {
                        gsap.fromTo(
                            card,
                            { y: 30, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.7,
                                delay: i * 0.06,
                                ease: "power3.out",
                                scrollTrigger: {
                                    trigger: gridRef.current,
                                    start: "top 85%",
                                    toggleActions: "play none none reverse",
                                },
                            }
                        );
                    });
                });
            }
        }, sectionRef);

        return () => {
            ctx.revert();
        };
    }, []);

    const labelText = "02 — Tech Stack";
    const titleWords = [
        { text: "Tools of", gradient: false },
        { text: "the Craft", gradient: true },
    ];

    return (
        <section
            ref={sectionRef}
            id="tech-stack"
            className="section-container min-h-0 relative mt-20 pb-0 overflow-hidden curvy-section border-y border-white/10 bg-black"
            style={{
                // Flatten the extreme curvature on mobile
                borderRadius: isMobile ? "24px" : "50% / 5vw",
            }}
        >
            {/* Silk Background — reduced intensity on mobile */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                <Silk
                    speed={isMobile ? 3 : 5}
                    scale={isMobile ? 0.8 : 1}
                    color="#ffffff"
                    noiseIntensity={isMobile ? 1.0 : 1.5}
                    rotation={0}
                />
            </div>

            <div className="max-w-6xl mx-auto relative z-10 py-10 px-1 sm:px-0">
                {/* Label — airport board flip */}
                <div className="mb-4" style={{ perspective: "600px" }}>
                    <div ref={labelRef} className="font-mono text-xs tracking-[0.4em] uppercase text-contrast/70">
                        {labelText.split("").map((ch, i) => (
                            <span key={i} className="lbl-char inline-block">
                                {ch === " " ? "\u00A0" : ch}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Title — slot machine reel */}
                <h2
                    ref={titleRef}
                    className="font-display text-display-lg font-bold mb-8 md:mb-16"
                    style={{ perspective: isMobile ? "400px" : "800px" }}
                >
                    {titleWords.map((line, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <br />}
                            <span
                                className={`slot-word inline-block overflow-hidden ${line.gradient ? "text-gradient" : ""}`}
                            >
                                {line.text}
                            </span>
                        </React.Fragment>
                    ))}
                </h2>

                {/* Grid — diagonal wave (desktop) / fade-up (mobile) */}
                <div
                    ref={gridRef}
                    role="list"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                    style={{ perspective: isMobile ? "none" : "1200px" }}
                >
                    {TECH_STACK.map((tech) => (
                        <div
                            key={tech.name}
                            role="listitem"
                            className="tech-card"
                            style={{ transformOrigin: "left center" }}
                        >
                            <GlassCard className="h-full group cursor-default">
                                <div className="space-y-3">
                                    <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-contrast/50">
                                        {tech.category}
                                    </span>
                                    <h3 className="font-display text-lg sm:text-xl font-semibold text-secondary group-hover:text-white transition-colors">
                                        {tech.name}
                                    </h3>
                                    <p className="text-sm text-grey/40">{tech.description}</p>
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}