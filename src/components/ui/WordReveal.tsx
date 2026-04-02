"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   CinematicText — GSAP split-character reveal
   Characters rise through a clipPath mask with
   subtle rotateX tilt and staggered timing.
   ───────────────────────────────────────────── */

interface CinematicTextProps {
    text: string;
    className?: string;
    delay?: number;
    stagger?: number;
    as?: "h1" | "h2" | "h3" | "span" | "p";
    scrub?: boolean;
}

export function CinematicText({
    text,
    className = "",
    delay = 0,
    stagger = 0.03,
    as: Tag = "span",
    scrub = false,
}: CinematicTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const chars = el.querySelectorAll(".ct-char");
        if (!chars.length) return;

        const tl = gsap.timeline({
            scrollTrigger: scrub
                ? {
                    trigger: el,
                    start: "top 85%",
                    end: "top 40%",
                    scrub: 1,
                }
                : {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                },
            delay: scrub ? 0 : delay,
        });

        tl.fromTo(
            chars,
            {
                y: "110%",
                rotateX: 90,
                opacity: 0,
            },
            {
                y: "0%",
                rotateX: 0,
                opacity: 1,
                duration: 1,
                stagger: stagger,
                ease: "power4.out",
            }
        );

        return () => {
            tl.kill();
        };
    }, [text, delay, stagger, scrub]);

    const words = text.split(" ");

    return (
        <Tag ref={containerRef as React.Ref<any>} className={`inline ${className}`} style={{ perspective: "1000px" }}>
            {words.map((word, wi) => (
                <span key={wi} className="inline-block mr-[0.25em] overflow-hidden" style={{ perspective: "600px" }}>
                    {word.split("").map((char, ci) => (
                        <span
                            key={ci}
                            className="ct-char inline-block will-change-transform"
                            style={{
                                transformOrigin: "bottom center",
                                opacity: 0,
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </span>
            ))}
        </Tag>
    );
}

/* ─────────────────────────────────────────────
   LineWipe — Horizontal clipPath wipe reveal
   ───────────────────────────────────────────── */

interface LineWipeProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "left" | "right";
}

export function LineWipe({
    children,
    className = "",
    delay = 0,
    direction = "left",
}: LineWipeProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const fromClip =
            direction === "left"
                ? "inset(0 100% 0 0)"
                : "inset(0 0 0 100%)";

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse",
            },
            delay,
        });

        tl.fromTo(
            el,
            { clipPath: fromClip, opacity: 0 },
            {
                clipPath: "inset(0 0% 0 0)",
                opacity: 1,
                duration: 1.2,
                ease: "power4.inOut",
            }
        );

        return () => {
            tl.kill();
        };
    }, [delay, direction]);

    return (
        <div ref={ref} className={className} style={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}>
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   StaggerReveal — Orchestrates child reveals
   via GSAP ScrollTrigger with custom stagger
   ───────────────────────────────────────────── */

interface StaggerRevealProps {
    children: React.ReactNode;
    className?: string;
    stagger?: number;
    delay?: number;
    y?: number;
    rotateX?: number;
    selector?: string;
}

export function StaggerReveal({
    children,
    className = "",
    stagger = 0.1,
    delay = 0,
    y = 60,
    rotateX = 10,
    selector = ".sr-item",
}: StaggerRevealProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const items = el.querySelectorAll(selector);
        if (!items.length) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: el,
                start: "top 80%",
                toggleActions: "play none none reverse",
            },
            delay,
        });

        tl.fromTo(
            items,
            {
                y,
                rotateX,
                opacity: 0,
                scale: 0.96,
            },
            {
                y: 0,
                rotateX: 0,
                opacity: 1,
                scale: 1,
                duration: 1,
                stagger,
                ease: "power4.out",
            }
        );

        return () => {
            tl.kill();
        };
    }, [stagger, delay, y, rotateX, selector]);

    return (
        <div ref={ref} className={className} style={{ perspective: "1000px" }}>
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   BlurReveal — Soft opacity + blur → sharp
   ───────────────────────────────────────────── */

interface BlurRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function BlurReveal({
    children,
    className = "",
    delay = 0,
}: BlurRevealProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse",
            },
            delay,
        });

        tl.fromTo(
            el,
            { opacity: 0, filter: "blur(12px)", y: 20 },
            {
                opacity: 1,
                filter: "blur(0px)",
                y: 0,
                duration: 1.2,
                ease: "power3.out",
            }
        );

        return () => {
            tl.kill();
        };
    }, [delay]);

    return (
        <div ref={ref} className={className} style={{ opacity: 0, filter: "blur(12px)" }}>
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   DrawLine — Animated line that draws itself
   ───────────────────────────────────────────── */

interface DrawLineProps {
    className?: string;
    delay?: number;
    direction?: "left" | "center";
}

export function DrawLine({
    className = "",
    delay = 0,
    direction = "left",
}: DrawLineProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none reverse",
            },
            delay,
        });

        tl.fromTo(
            el,
            { scaleX: 0 },
            {
                scaleX: 1,
                duration: 1.5,
                ease: "power4.inOut",
            }
        );

        return () => {
            tl.kill();
        };
    }, [delay, direction]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                transformOrigin: direction === "center" ? "center" : "left",
                transform: "scaleX(0)",
            }}
        />
    );
}

/* ─────────────────────────────────────────────
   CounterReveal — Animated number tick-up
   ───────────────────────────────────────────── */

interface CounterRevealProps {
    value: string;
    className?: string;
    delay?: number;
}

export function CounterReveal({ value, className = "", delay = 0 }: CounterRevealProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        const container = containerRef.current;
        if (!el || !container) return;

        // Extract numeric part
        const numMatch = value.match(/(\d+)/);
        const suffix = value.replace(/\d+/, "");

        if (!numMatch) {
            // No number, just reveal
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: container,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                },
                delay,
            });
            tl.fromTo(
                container,
                { y: "100%", opacity: 0 },
                { y: "0%", opacity: 1, duration: 1, ease: "power4.out" }
            );
            return () => { tl.kill(); };
        }

        const target = parseInt(numMatch[1]);

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: container,
                start: "top 85%",
                toggleActions: "play none none reverse",
            },
            delay,
        });

        tl.fromTo(
            container,
            { y: "100%", opacity: 0 },
            { y: "0%", opacity: 1, duration: 0.8, ease: "power4.out" }
        );

        const counter = { val: 0 };
        tl.to(
            counter,
            {
                val: target,
                duration: 1.5,
                ease: "power2.out",
                onUpdate: () => {
                    if (el) el.textContent = Math.round(counter.val) + suffix;
                },
            },
            "-=0.4"
        );

        return () => {
            tl.kill();
        };
    }, [value, delay]);

    return (
        <div ref={containerRef} className="overflow-hidden" style={{ opacity: 0 }}>
            <span ref={ref} className={className}>
                {value}
            </span>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Legacy wrappers — backward-compatible but
   now powered by GSAP for consistency
   ───────────────────────────────────────────── */

interface WordRevealProps {
    text: string;
    className?: string;
    delay?: number;
    once?: boolean;
}

export function WordReveal({ text, className = "", delay = 0 }: WordRevealProps) {
    return <CinematicText text={text} className={className} delay={delay} />;
}

interface LineRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function LineReveal({ children, className = "", delay = 0 }: LineRevealProps) {
    return <LineWipe delay={delay} className={className}>{children}</LineWipe>;
}

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right";
}

export function FadeIn({ children, className = "", delay = 0 }: FadeInProps) {
    return <BlurReveal delay={delay} className={className}>{children}</BlurReveal>;
}
