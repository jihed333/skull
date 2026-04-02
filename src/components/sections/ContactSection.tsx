"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PERSONAL_INFO } from "@/constants/content";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════
  CONTACT — "The Magnetic Vortex"
  
  Animation concept: Title characters start in a 
  circular orbit around the center and spiral 
  inward to their correct positions — like a 
  vortex pulling them in.
  
  Description materialises letter-by-letter in 
  a wave, each character arriving with a slight 
  vertical offset creating a ripple.
  
  CTA has true magnetic hover — the button pulls 
  toward your cursor with elastic physics.
  
  Social links rise from hidden strips below 
  their containers.
  
  Footer line expands from center with a glow 
  pulse at the origin.
  ═══════════════════════════════════════════════
*/

export function ContactSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLParagraphElement>(null);
    const ctaRef = useRef<HTMLAnchorElement>(null);
    const socialsRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const glowDotRef = useRef<HTMLDivElement>(null);

    /* ── Magnetic CTA ── */
    const handleCTAMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!ctaRef.current) return;
        const rect = ctaRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(ctaRef.current, { x: x * 0.25, y: y * 0.25, duration: 0.4, ease: "power2.out" });
    }, []);

    const handleCTAMouseLeave = useCallback(() => {
        if (!ctaRef.current) return;
        gsap.to(ctaRef.current, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            /* ── Label: Vertical uncover ── */
            if (labelRef.current) {
                gsap.fromTo(
                    labelRef.current,
                    { clipPath: "inset(100% 0 0 0)", opacity: 0 },
                    {
                        clipPath: "inset(0% 0 0 0)",
                        opacity: 1,
                        duration: 0.8,
                        ease: "power4.out",
                        scrollTrigger: { trigger: labelRef.current, start: "top 85%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── Title: Vortex spiral-in ── */
            if (titleRef.current) {
                const chars = titleRef.current.querySelectorAll(".vortex-char");
                const count = chars.length;
                chars.forEach((char, i) => {
                    const angle = (i / count) * Math.PI * 4; // two full rotations
                    const radius = 150 + (i / count) * 100;
                    gsap.fromTo(
                        char,
                        {
                            x: Math.cos(angle) * radius,
                            y: Math.sin(angle) * radius,
                            rotation: (angle * 180) / Math.PI,
                            scale: 0.3,
                            opacity: 0,
                            filter: "blur(4px)",
                        },
                        {
                            x: 0,
                            y: 0,
                            rotation: 0,
                            scale: 1,
                            opacity: 1,
                            filter: "blur(0px)",
                            duration: 1.4,
                            delay: i * 0.025,
                            ease: "power4.out",
                            scrollTrigger: { trigger: titleRef.current, start: "top 80%", toggleActions: "play none none reverse" },
                        }
                    );
                });
            }

            /* ── Description: Wave ripple ── */
            if (descRef.current) {
                const chars = descRef.current.querySelectorAll(".desc-char");
                gsap.fromTo(
                    chars,
                    { opacity: 0, y: 15 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.03,
                        stagger: 0.012,
                        ease: "none",
                        scrollTrigger: { trigger: descRef.current, start: "top 82%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── CTA: Scale + glow entrance ── */
            if (ctaRef.current) {
                gsap.fromTo(
                    ctaRef.current,
                    { scale: 0.7, opacity: 0, filter: "blur(8px)" },
                    {
                        scale: 1,
                        opacity: 1,
                        filter: "blur(0px)",
                        duration: 1,
                        ease: "back.out(1.4)",
                        scrollTrigger: { trigger: ctaRef.current, start: "top 88%", toggleActions: "play none none reverse" },
                    }
                );
            }

            /* ── Social links: Strip reveal ── */
            if (socialsRef.current) {
                const links = socialsRef.current.querySelectorAll(".social-strip");
                links.forEach((link, i) => {
                    gsap.fromTo(
                        link,
                        { yPercent: 100, opacity: 0 },
                        {
                            yPercent: 0,
                            opacity: 1,
                            duration: 0.7,
                            delay: i * 0.12,
                            ease: "power4.out",
                            scrollTrigger: { trigger: socialsRef.current, start: "top 90%", toggleActions: "play none none reverse" },
                        }
                    );
                });
            }

            /* ── Footer: Center-outward expand + glow ── */
            if (footerRef.current) {
                const line = footerRef.current.querySelector(".footer-line");
                const text = footerRef.current.querySelector(".footer-text");

                if (line) {
                    gsap.fromTo(
                        line,
                        { scaleX: 0 },
                        {
                            scaleX: 1,
                            duration: 1.5,
                            ease: "power4.inOut",
                            scrollTrigger: { trigger: footerRef.current, start: "top 100%", toggleActions: "play none none reverse" },
                        }
                    );
                }
                if (glowDotRef.current) {
                    gsap.fromTo(
                        glowDotRef.current,
                        { scale: 0, opacity: 0 },
                        {
                            scale: 1,
                            opacity: 1,
                            duration: 0.6,
                            ease: "power3.out",
                            scrollTrigger: { trigger: footerRef.current, start: "top 100%", toggleActions: "play none none reverse" },
                            onComplete: () => {
                                gsap.to(glowDotRef.current!, { scale: 0, opacity: 0, duration: 0.8, delay: 0.5 });
                            },
                        }
                    );
                }
                if (text) {
                    gsap.fromTo(
                        text,
                        { opacity: 0, y: 8 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.8,
                            delay: 0.5,
                            ease: "power3.out",
                            scrollTrigger: { trigger: footerRef.current, start: "top 100%", toggleActions: "play none none reverse" },
                        }
                    );
                }
            }
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    /* ── Helper: split text for vortex ── */
    const titleLines = [
        { text: "Let's Create", gradient: false },
        { text: "Together", gradient: true },
    ];

    const descText = "Have a project in mind? Let's make some noise.";

    return (
        <section ref={sectionRef} id="contact" className="section-container h-[100dvh] min-h-0 relative items-center justify-center text-center overflow-hidden">
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 md:gap-8 pb-10">
                {/* Label — vertical uncover */}
                <div ref={labelRef} style={{ opacity: 0 }}>
                    <span className="font-mono text-xs tracking-[0.4em] uppercase text-contrast/70">
                        08 — Contact
                    </span>
                </div>

                {/* Title — vortex spiral */}
                <h2 ref={titleRef} className="font-display text-display-lg font-bold">
                    {titleLines.map((line, li) => (
                        <React.Fragment key={li}>
                            {li > 0 && <br />}
                            <span className={line.gradient ? "text-gradient" : ""}>
                                {line.text.split("").map((ch, ci) => (
                                    <span
                                        key={`${li}-${ci}`}
                                        className="vortex-char inline-block will-change-transform"
                                        style={{ opacity: 0 }}
                                    >
                                        {ch === " " ? "\u00A0" : ch}
                                    </span>
                                ))}
                            </span>
                        </React.Fragment>
                    ))}
                </h2>

                {/* Description — wave ripple */}
                <p ref={descRef} className="text-lg text-grey/50 max-w-lg">
                    {descText.split("").map((ch, i) => (
                        <span key={i} className="desc-char inline-block" style={{ opacity: 0 }}>
                            {ch === " " ? "\u00A0" : ch}
                        </span>
                    ))}
                </p>

                {/* CTA — magnetic hover */}
                <motion.a
                    ref={ctaRef}
                    href={`mailto:${PERSONAL_INFO.email}`}
                    aria-label={`Send an email to ${PERSONAL_INFO.email}`}
                    className="relative inline-flex items-center gap-3 px-10 py-5 mt-4 group will-change-transform"
                    onMouseMove={handleCTAMouseMove}
                    onMouseLeave={handleCTAMouseLeave}
                    style={{ opacity: 0 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="absolute inset-0 glass-strong rounded-2xl glow-accent" />
                    <div className="absolute inset-0 rounded-2xl border border-contrast/30 group-hover:border-contrast/60 transition-colors" />
                    <span className="relative font-display text-lg font-semibold text-white">Get in Touch</span>
                    <motion.span
                        className="relative text-contrast"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        →
                    </motion.span>
                </motion.a>

                {/* Social links — strip reveal */}
                <div ref={socialsRef} className="flex gap-8 mt-8">
                    <div className="overflow-hidden">
                        <motion.a
                            href={`https://github.com/${PERSONAL_INFO.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-strip block font-mono text-xs tracking-wider uppercase text-grey/30 hover:text-contrast transition-colors"
                            style={{ opacity: 0 }}
                            whileHover={{ y: -2 }}
                        >
                            GitHub
                        </motion.a>
                    </div>
                    <div className="overflow-hidden">
                        <motion.a
                            href="#"
                            aria-label="LinkedIn Profile"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-strip block font-mono text-xs tracking-wider uppercase text-grey/30 hover:text-contrast transition-colors"
                            style={{ opacity: 0 }}
                            whileHover={{ y: -2 }}
                        >
                            LinkedIn
                        </motion.a>
                    </div>
                </div>

            </div>

            {/* Footer — absolute bottom positioned */}
            <div ref={footerRef} className="absolute bottom-6 lg:bottom-10 left-0 w-full px-6 flex flex-col items-center">
                {/* Glow dot at center */}
                <div
                    ref={glowDotRef}
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent/40 blur-sm"
                    style={{ opacity: 0 }}
                />
                <div className="footer-line h-px w-full max-w-4xl mx-auto bg-grey/10 origin-center" style={{ transform: "scaleX(0)" }} />
                <div className="footer-text pt-6" style={{ opacity: 0 }}>
                    <p className="font-mono text-[10px] text-grey/40 tracking-wider">
                        © {new Date().getFullYear()} — Designed & Built with obsessive attention to detail by {PERSONAL_INFO.name}
                    </p>
                </div>
            </div>
        </section>
    );
}
