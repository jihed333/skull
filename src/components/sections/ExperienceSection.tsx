"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlassCard } from "@/components/ui/GlassCard";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════
  EXPERIENCE — "The Unfolding Scroll"
  
  Animation concept: Title uses a vertical 
  venetian-blind effect — horizontal slices of 
  the text fold open like blinds rotating into view.
  
  Timeline line "draws" as you scroll (scrub-linked).
  
  Cards unfold like pages of a book — they start 
  folded (rotateY: -90) and swing open one by one, 
  each triggered by the timeline reaching them.
  
  Dots "stamp" in with a scaling overshoot.
  ═══════════════════════════════════════════════
*/

const EXPERIENCES = [
    {
        role: "Fullstack Developer",
        company: "MaherDEV",
        period: "Present",
        description:
            "Leading 3D web experiences and interactive installations for global brands. Building performant WebGL visualizations.",
    },
    {
        role: "Frontend Developer",
        company: "Celestial Wave Digital",
        period: "2025",
        description:
            "Developed high-performance React applications with complex animations and real time data visualization.",
    },
    {
        role: "Freelance Web Developer & UI/UX Designer",
        company: "Freelance",
        period: "2024",
        description:
            "Prototyped and built interactive campaigns combining motion design with code.",
    },
    {
        role: "Curious student",
        company: "IMSET",
        period: "2022",
        description:
            "Fullstack development with a focus on pixel-perfect UI implementation and animation systems.",
    },
];

export function ExperienceSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const timelineLineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            /* ── Label: Stagger letter spacing expansion ── */
            if (headerRef.current) {
                const label = headerRef.current.querySelector(".exp-label");
                if (label) {
                    gsap.fromTo(
                        label,
                        { letterSpacing: "0em", opacity: 0, scaleX: 0.7 },
                        {
                            letterSpacing: "0.4em",
                            opacity: 1,
                            scaleX: 1,
                            duration: 1.2,
                            ease: "power4.out",
                            scrollTrigger: { trigger: label, start: "top 85%", toggleActions: "play none none reverse" },
                        }
                    );
                }
            }

            /* ── Title: Venetian blind slices ── */
            if (titleRef.current) {
                const slices = titleRef.current.querySelectorAll(".blind-slice");
                slices.forEach((slice, i) => {
                    gsap.fromTo(
                        slice,
                        { rotateX: -90, opacity: 0, transformOrigin: "top center" },
                        {
                            rotateX: 0,
                            opacity: 1,
                            duration: 0.8,
                            delay: i * 0.12,
                            ease: "power4.out",
                            scrollTrigger: { trigger: titleRef.current, start: "top 80%", toggleActions: "play none none reverse" },
                        }
                    );
                });
            }

            /* ── Timeline line: Scroll-linked draw ── */
            if (timelineLineRef.current) {
                gsap.fromTo(
                    timelineLineRef.current,
                    { scaleY: 0 },
                    {
                        scaleY: 1,
                        ease: "none",
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: "top 50%",
                            end: "bottom 40%",
                            scrub: 1.2,
                        },
                    }
                );
            }

            /* ── Dots: Stamp in with overshoot ── */
            const dots = sectionRef.current?.querySelectorAll(".exp-dot");
            dots?.forEach((dot) => {
                gsap.fromTo(
                    dot,
                    { scale: 0, opacity: 0 },
                    {
                        scale: 1,
                        opacity: 1,
                        duration: 0.5,
                        ease: "back.out(3)",
                        scrollTrigger: { trigger: dot, start: "top 78%", toggleActions: "play none none reverse" },
                    }
                );
            });

            /* ── Cards: Book-page unfold ── */
            const cards = sectionRef.current?.querySelectorAll(".exp-card");
            cards?.forEach((card) => {
                gsap.fromTo(
                    card,
                    {
                        rotateY: -90,
                        opacity: 0,
                        transformOrigin: "left center",
                        scale: 0.9,
                    },
                    {
                        rotateY: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 1.2,
                        ease: "power4.out",
                        scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none reverse" },
                    }
                );
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} id="experience" className="section-container">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div ref={headerRef} className="mb-16 space-y-4">
                    <span
                        className="exp-label font-mono text-xs tracking-[0.4em] uppercase text-contrast/70 block origin-left"
                        style={{ opacity: 0 }}
                    >
                        06 — Experience
                    </span>

                    {/* Title — venetian blinds */}
                    <div ref={titleRef} className="font-display text-display-lg font-bold" style={{ perspective: "800px" }}>
                        <div className="blind-slice overflow-hidden" style={{ opacity: 0 }}>
                            <span className="block">The</span>
                        </div>
                        <div className="blind-slice overflow-hidden" style={{ opacity: 0 }}>
                            <span className="block text-gradient">Journey</span>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Scroll-linked vertical line */}
                    <div
                        ref={timelineLineRef}
                        className="absolute left-0 lg:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-silver/20 to-transparent origin-top"
                        style={{ transform: "scaleY(0)" }}
                    />

                    <div className="space-y-12">
                        {EXPERIENCES.map((exp, i) => (
                            <div key={i} className="relative pl-8 lg:pl-20" style={{ perspective: "1200px" }}>
                                {/* Dot — stamp */}
                                <div className="exp-dot absolute left-0 lg:left-8 top-2 -translate-x-[3px]" style={{ opacity: 0 }}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_rgba(255,152,162,0.5)]" />
                                </div>

                                {/* Card — book unfold */}
                                <div className="exp-card ml-4" style={{ opacity: 0, transformOrigin: "left center" }}>
                                    <GlassCard hover={true}>
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="space-y-2">
                                                <h3 className="font-display text-xl font-semibold text-secondary">
                                                    {exp.role}
                                                </h3>
                                                <p className="font-display text-base text-contrast/70">
                                                    {exp.company}
                                                </p>
                                                <p className="text-sm text-grey/40 leading-relaxed">
                                                    {exp.description}
                                                </p>
                                            </div>
                                            <span className="font-mono text-xs text-grey/30 whitespace-nowrap">
                                                {exp.period}
                                            </span>
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
