"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { PERSONAL_INFO } from "@/constants/content";

const ArmillaryCanvas = dynamic(() => import("../canvas/ArmillaryCanvas"), {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-transparent" />,
});

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════
  CONTACT — "The Celestial Armillary"
  
  Split-panel layout:
  • Left: Contact content (label, title, desc, CTA, socials)
  • Right: Armillary amethyst 3D model (hero visual)
  
  Animations preserved from original:
  • Vortex spiral title entrance
  • Wave ripple description
  • Magnetic CTA hover
  • Strip reveal social links
  • Footer line expand + glow dot

  Mobile: Stacks vertically — model behind content
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

    /* ── Form State ── */
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Front-end HTML5 checks catch empty scenarios, but double verify just in case
        if (!email.trim() || !message.trim()) {
            setStatus("error");
            setErrorMessage("Please complete all coordinates before launch.");
            return;
        }

        setStatus("submitting");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, message }),
            });

            if (!res.ok) throw new Error("Delivery interrupted.");
            
            setStatus("success");
            setEmail("");
            setMessage("");
        } catch (error) {
            setStatus("error");
            setErrorMessage("Transmission failed. Please check connection and retry.");
        }
    };

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
        { text: "Let's", gradient: false },
        { text: "Create", gradient: true },
    ];

    const descText = "Have a project in mind? Let's make some noise.";

    return (
        <section
            ref={sectionRef}
            id="contact"
            className="section-container h-[100dvh] min-h-0 relative overflow-hidden z-[150]"
        >
            {/* ── Armillary 3D Model — Full background canvas ── */}
            <ArmillaryCanvas />

            {/* ── Ambient glow behind model area ── */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 65% 50%, rgba(255, 79, 216, 0.06) 0%, transparent 70%)",
                }}
            />

            {/* ── Main content grid ── */}
            <div className="relative z-[200] w-full max-w-7xl mx-auto h-full flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 w-full items-center">
                    
                    {/* ── LEFT PANEL: Contact content ── */}
                    <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 md:gap-8">
                        {/* Label — vertical uncover */}
                        <div ref={labelRef} style={{ opacity: 0 }}>
                            <span className="font-mono text-xs tracking-[0.4em] uppercase text-contrast/70">
                                08 — Contact
                            </span>
                        </div>

                        {/* Title Zone — Morph from Let's Create into Send a Message */}
                        <AnimatePresence mode="wait">
                            {!isFormOpen ? (
                                <motion.h2 
                                    key="title-closed" 
                                    ref={titleRef} 
                                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                    transition={{ duration: 0.4 }}
                                    className="font-display text-display-lg font-bold leading-[1.1]"
                                >
                                    {titleLines.map((line, li) => (
                                        <React.Fragment key={li}>
                                            {li > 0 && <br />}
                                            <span className="inline-block">
                                                {line.text.split("").map((ch, ci) => (
                                                    <span
                                                        key={`${li}-${ci}`}
                                                        className={`vortex-char inline-block will-change-transform ${line.gradient ? "text-[#ff98a2]" : "text-white"}`}
                                                        style={{ opacity: 0 }}
                                                    >
                                                        {ch === " " ? "\u00A0" : ch}
                                                    </span>
                                                ))}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </motion.h2>
                            ) : (
                                <motion.h2 
                                    key="title-open"
                                    initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    className="font-display text-display-lg font-bold leading-[1.1]"
                                >
                                    <span className="block text-white">Send a</span>
                                    <span className="block text-[#ff98a2]">Message</span>
                                </motion.h2>
                            )}
                        </AnimatePresence>

                        {/* Description — wave ripple */}
                        <div className="min-h-[56px] w-full">
                            <AnimatePresence mode="wait">
                                {!isFormOpen ? (
                                    <motion.div key="desc-closed" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                                        <p ref={descRef} className="text-lg text-grey/50 max-w-lg">
                                            {descText.split("").map((ch, i) => (
                                                <span key={i} className="desc-char inline-block" style={{ opacity: 0 }}>
                                                    {ch === " " ? "\u00A0" : ch}
                                                </span>
                                            ))}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.div key="desc-open" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                                        <p className="text-lg text-grey/50 max-w-lg">
                                            All systems online. Input your frequency and I’ll get back to you across the void.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* CTA Button — Toggles Form on the Right */}
                        <motion.div layout className="relative z-[300] mt-4 w-full md:max-w-md lg:max-w-lg">
                            <AnimatePresence mode="wait">
                                {!isFormOpen && (
                                    <motion.button
                                        key="btn-open"
                                        ref={ctaRef as any}
                                        onClick={() => setIsFormOpen(true)}
                                        className="relative inline-flex items-center gap-3 px-10 py-5 group will-change-transform cursor-pointer"
                                        onMouseMove={handleCTAMouseMove as any}
                                        onMouseLeave={handleCTAMouseLeave}
                                        style={{ opacity: 0 }}
                                        whileTap={{ scale: 0.98 }}
                                        exit={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                                    >
                                        <div className="absolute inset-0 glass-strong rounded-2xl glow-armillary" />
                                        <div className="absolute inset-0 rounded-2xl border border-contrast/30 group-hover:border-contrast/60 transition-colors" />
                                        <span className="relative font-display text-lg font-semibold text-white">Get in Touch</span>
                                        <motion.span
                                            className="relative text-contrast"
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            →
                                        </motion.span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Social links — strip reveal */}
                        <div ref={socialsRef} className="relative z-[300] flex gap-8 mt-4">
                            <div className="overflow-hidden">
                                <motion.a
                                    href={`https://github.com/jihed333`}
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
                                    href="https://www.upwork.com/freelancers/~015c88251b0e0ccce5"
                                    aria-label="Upwork Profile"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-strip block font-mono text-xs tracking-wider uppercase text-grey/30 hover:text-contrast transition-colors"
                                    style={{ opacity: 0 }}
                                    whileHover={{ y: -2 }}
                                >
                                    Upwork
                                </motion.a>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL: Contact Form ── */}
                    <div className={`w-full lg:col-span-6 xl:col-span-7 flex justify-center lg:justify-end items-center relative z-[300] pointer-events-none lg:mt-0 ${!isFormOpen ? 'hidden lg:flex' : 'mt-8 flex'}`}>
                        <AnimatePresence>
                            {isFormOpen && (
                                <motion.form
                                    key="form"
                                    initial={{ opacity: 0, x: 40, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 40, scale: 0.95 }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    onSubmit={handleSubmit}
                                    className="glass-strong pointer-events-auto rounded-3xl border border-white/10 p-6 sm:p-10 flex flex-col gap-6 relative overflow-hidden w-full max-w-md lg:max-w-lg lg:mr-8 xl:mr-16"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                    
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors p-2 z-20"
                                        aria-label="Close Form"
                                    >
                                        ✕
                                    </button>
                                    
                                    {status === "success" ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="py-12 flex flex-col items-center justify-center text-center gap-4"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-[#ff98a2]/20 flex items-center justify-center text-[#ff98a2] text-3xl">
                                                ✓
                                            </div>
                                            <p className="font-display text-2xl text-white font-semibold">Message Delivered</p>
                                            <p className="text-grey/60 text-sm">Your frequency has reached the destination. I will respond to your channel shortly.</p>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-2 relative z-10 w-full">
                                                <label htmlFor="email" className="text-xs uppercase tracking-wider text-grey/60 font-mono">Return Coordinates (Email)</label>
                                                <input 
                                                    type="email" 
                                                    id="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    disabled={status === "submitting"}
                                                    placeholder="hologram@galaxy.com"
                                                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#ff98a2]/50 transition-colors"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 relative z-10 w-full">
                                                <label htmlFor="message" className="text-xs uppercase tracking-wider text-grey/60 font-mono">Transmission (Message)</label>
                                                <textarea 
                                                    id="message"
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    required
                                                    rows={5}
                                                    disabled={status === "submitting"}
                                                    placeholder="Describe your vision..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-[#ff98a2]/50 transition-colors resize-none"
                                                />
                                            </div>

                                            {status === "error" && (
                                                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm relative z-10">
                                                    {errorMessage}
                                                </motion.p>
                                            )}

                                            <button 
                                                type="submit" 
                                                disabled={status === "submitting"}
                                                className="relative z-10 mt-2 px-8 py-5 rounded-full font-display font-semibold text-white overflow-hidden group w-full"
                                            >
                                                <div className="absolute inset-0 bg-[#ff98a2]/20 group-hover:bg-[#ff98a2]/30 transition-colors" />
                                                <div className="absolute inset-0 border border-[#ff98a2]/50 rounded-full" />
                                                <span className="relative flex items-center justify-center gap-2">
                                                    {status === "submitting" ? (
                                                        <>
                                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Routing...
                                                        </>
                                                    ) : "Commence Launch Sequence"}
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Footer — absolute bottom positioned ── */}
            <div ref={footerRef} className="absolute bottom-6 lg:bottom-10 left-0 w-full px-6 flex flex-col items-center z-[200]">
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
