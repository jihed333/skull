"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════
  PROJECT — "The Cinematic Split"
  
  Animation concept: The title performs a 
  dramatic horizontal split — the text is masked 
  into two halves (top/bottom) that slide in from 
  opposite directions and lock together.
  
  Subtitle fades in from pure white → final color 
  (like exposing a photograph).
  
  Tags "orbit" in — they start positioned in a 
  circular pattern around a center and snap into 
  their linear position.
  
  Description text reveals with a typewriter-
  style cursor sweep.
  ═══════════════════════════════════════════════
*/

interface ProjectSectionProps {
    index: number;
    title: string;
    subtitle: string;
    description: string;
    tags: string[];
    year: string;
    link?: string;
}

export function ProjectSection({
    index,
    title,
    subtitle,
    description,
    tags,
    year,
    link,
}: ProjectSectionProps) {
    const sectionNum = String(index + 3).padStart(2, "0");
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const tagsRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);
    const numRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            /* ── Section number: Scale up from nothing with rotation ── */
            if (numRef.current) {
                gsap.fromTo(
                    numRef.current,
                    { scale: 3, opacity: 0, rotation: -10, filter: "blur(6px)" },
                    {
                        scale: 1,
                        opacity: 1,
                        rotation: 0,
                        filter: "blur(0px)",
                        duration: 1,
                        ease: "power4.out",
                        scrollTrigger: { trigger: numRef.current, start: "top 85%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── Title: Horizontal split-lock ── */
            if (titleRef.current) {
                const topHalf = titleRef.current.querySelector(".title-top");
                const bottomHalf = titleRef.current.querySelector(".title-bottom");

                if (topHalf && bottomHalf) {
                    const splitTl = gsap.timeline({
                        scrollTrigger: { trigger: titleRef.current, start: "top 82%", toggleActions: "play none none reverse" },
                    });

                    splitTl.fromTo(
                        topHalf,
                        { xPercent: 60, opacity: 0, clipPath: "inset(0 0 50% 0)" },
                        { xPercent: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 1.2, ease: "power4.out" }
                    );
                    splitTl.fromTo(
                        bottomHalf,
                        { xPercent: -60, opacity: 0, clipPath: "inset(50% 0 0 0)" },
                        { xPercent: 0, opacity: 1, clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: "power4.out" },
                        "<0.1"
                    );
                }
            }

            /* ── Subtitle: Exposure fade (white → final color) ── */
            if (subtitleRef.current) {
                gsap.fromTo(
                    subtitleRef.current,
                    { color: "#ffffff", opacity: 0, y: 15 },
                    {
                        color: "",  // revert to CSS
                        opacity: 1,
                        y: 0,
                        duration: 1.5,
                        ease: "power3.out",
                        scrollTrigger: { trigger: subtitleRef.current, start: "top 85%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── Tags: Orbit snap ── */
            if (tagsRef.current) {
                const tagEls = tagsRef.current.querySelectorAll(".tag-orbit");
                const count = tagEls.length;
                tagEls.forEach((tag, i) => {
                    const angle = (i / count) * Math.PI * 2;
                    const radius = 80;
                    gsap.fromTo(
                        tag,
                        {
                            x: Math.cos(angle) * radius,
                            y: Math.sin(angle) * radius,
                            scale: 0.6,
                            opacity: 0,
                            rotation: (angle * 180) / Math.PI,
                        },
                        {
                            x: 0,
                            y: 0,
                            scale: 1,
                            opacity: 1,
                            rotation: 0,
                            duration: 1,
                            delay: i * 0.08,
                            ease: "power4.out",
                            scrollTrigger: { trigger: tagsRef.current, start: "top 85%", toggleActions: "play none none reverse" },
                        }
                    );
                });
            }

            /* ── Description: Cursor sweep reveal ── */
            if (descRef.current && cursorRef.current) {
                const descTl = gsap.timeline({
                    scrollTrigger: { trigger: descRef.current, start: "top 85%", toggleActions: "play none none reverse" },
                });

                descTl.fromTo(
                    descRef.current,
                    { clipPath: "inset(0 100% 0 0)" },
                    { clipPath: "inset(0 0% 0 0)", duration: 1.8, ease: "power2.inOut" }
                );

                // Cursor follows the clip edge
                descTl.fromTo(
                    cursorRef.current,
                    { left: "0%", opacity: 1 },
                    { left: "100%", opacity: 1, duration: 1.8, ease: "power2.inOut" },
                    "<"
                );
                descTl.to(cursorRef.current, { opacity: 0, duration: 0.3 });
            }

            /* ── Meta: Appear with number counter feel ── */
            if (metaRef.current) {
                gsap.fromTo(
                    metaRef.current,
                    { opacity: 0, yPercent: 30 },
                    {
                        opacity: 1,
                        yPercent: 0,
                        duration: 0.8,
                        ease: "power4.out",
                        scrollTrigger: { trigger: metaRef.current, start: "top 90%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── Bottom line: Shimmer from left ── */
            if (lineRef.current) {
                gsap.fromTo(
                    lineRef.current,
                    { scaleX: 0, transformOrigin: "left center" },
                    {
                        scaleX: 1,
                        duration: 1.5,
                        ease: "power4.inOut",
                        scrollTrigger: { trigger: lineRef.current, start: "top 95%", toggleActions: "play none none reverse" },
                    }
                );
            }
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} id={`project-${index + 1}`} className="section-container">
            <div className="max-w-6xl mx-auto">
                {/* Project number — zoom-in */}
                <div ref={numRef} style={{ opacity: 0 }}>
                    <span className="font-mono text-xs tracking-[0.4em] uppercase text-contrast/70">
                        {sectionNum} — Project {index + 1}
                    </span>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
                    {/* Left: Title area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Title: horizontal split-lock */}
                        <h2 ref={titleRef} className="font-display text-display-md font-bold relative">
                            <span className="title-top block bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent" style={{ opacity: 0 }}>{title}</span>
                            <span className="title-bottom block absolute top-0 left-0 w-full bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent" style={{ opacity: 0 }}>
                                {title}
                            </span>
                        </h2>

                        {/* Subtitle: exposure fade */}
                        <p
                            ref={subtitleRef}
                            className="font-display text-display-sm text-grey/40 font-light"
                            style={{ opacity: 0 }}
                        >
                            {subtitle}
                        </p>

                        {/* Tags: orbit snap */}
                        <div ref={tagsRef} className="flex flex-wrap gap-2 pt-2">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="tag-orbit px-3 py-1 text-xs font-mono tracking-wider uppercase border border-accent/20 rounded-full text-accent/70 hover:border-accent/50 hover:text-accent transition-colors will-change-transform"
                                    style={{ opacity: 0 }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right: Description */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description with cursor sweep */}
                        <div className="relative">
                            <div ref={descRef} style={{ clipPath: "inset(0 100% 0 0)" }}>
                                <p className="text-base leading-relaxed text-grey/50">{description}</p>
                            </div>
                            {/* Sweep cursor */}
                            <div
                                ref={cursorRef}
                                className="absolute top-0 w-px h-full bg-accent shadow-[0_0_8px_rgba(255,152,162,0.5)]"
                                style={{ left: "0%", opacity: 0 }}
                            />
                        </div>

                        {/* Year/link */}
                        <div
                            ref={metaRef}
                            className="flex items-center justify-between pt-4 border-t border-grey/10"
                            style={{ opacity: 0 }}
                        >
                            <span className="font-mono text-xs text-grey/30">{year}</span>
                            {link && (
                                <motion.a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`View ${title} project details`}
                                    className="font-mono text-xs text-contrast hover:text-white transition-colors group"
                                    whileHover={{ x: 4 }}
                                >
                                    View Project
                                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                                </motion.a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom line */}
                <div
                    ref={lineRef}
                    className="mt-16 w-full h-px bg-gradient-to-r from-transparent via-silver/10 to-transparent"
                    style={{ transform: "scaleX(0)" }}
                />
            </div>
        </section>
    );
}
