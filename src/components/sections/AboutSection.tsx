"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PERSONAL_INFO } from "@/constants/content";

gsap.registerPlugin(ScrollTrigger);

/*
  ═══════════════════════════════════════════════
  ABOUT — "The Split Screen Slide"
  
  Animation concept: A horizontal mask split — 
  the section label and heading slide in from the 
  LEFT with a curtain wipe, while the right column 
  content slides in from the RIGHT.
  
  Title words alternate: odd words from left, 
  even words from right, crossing each other 
  mid-screen. Stats count up with an odometer-
  style vertical digit roll.
  
  Unique element: The kinetic divider "charges up" 
  with a traveling light pulse along it.
  ═══════════════════════════════════════════════
*/

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Label: Slide from left with horizontal mask ── */
      if (labelRef.current) {
        gsap.fromTo(
          labelRef.current,
          { xPercent: -100, opacity: 0 },
          {
            xPercent: 0,
            opacity: 1,
            duration: 1,
            ease: "power4.out",
            scrollTrigger: { trigger: labelRef.current, start: "top 85%", toggleActions: "play none none reverse" },
          }
        );
      }

      /* ── Title: Alternating word slide (left/right crossing) ── */
      if (headingRef.current) {
        const words = headingRef.current.querySelectorAll(".about-word");
        words.forEach((word, i) => {
          const fromX = i % 2 === 0 ? -80 : 80;
          gsap.fromTo(
            word,
            {
              x: fromX,
              opacity: 0,
              clipPath: i % 2 === 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)",
            },
            {
              x: 0,
              opacity: 1,
              clipPath: "inset(0 0% 0 0%)",
              duration: 1.2,
              delay: i * 0.15,
              ease: "power4.out",
              scrollTrigger: { trigger: headingRef.current, start: "top 80%", toggleActions: "play none none reverse" },
            }
          );
        });
      }

      /* ── Divider: Scale + traveling light pulse ── */
      if (dividerRef.current && pulseRef.current) {
        const divTl = gsap.timeline({
          scrollTrigger: { trigger: dividerRef.current, start: "top 85%", toggleActions: "play none none reverse" },
        });
        divTl.fromTo(dividerRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: "power4.inOut" });
        divTl.fromTo(
          pulseRef.current,
          { left: "-10%", opacity: 0 },
          { left: "110%", opacity: 1, duration: 1.2, ease: "power2.inOut" },
          "-=0.6"
        );
      }

      /* ── Bio: Vertical blinds reveal (split into lines) ── */
      if (bioRef.current) {
        gsap.fromTo(
          bioRef.current,
          {
            clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)",
            opacity: 0,
          },
          {
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            opacity: 1,
            duration: 1.4,
            ease: "power4.inOut",
            scrollTrigger: { trigger: bioRef.current, start: "top 80%", toggleActions: "play none none reverse" },
          }
        );
      }

      /* ── Stats: Odometer digit roll ── */
      if (statsRef.current) {
        const statItems = statsRef.current.querySelectorAll(".stat-item");
        statItems.forEach((item, i) => {
          const valueEl = item.querySelector(".stat-value") as HTMLElement;
          const labelEl = item.querySelector(".stat-label") as HTMLElement;

          // Value rolls up from below
          gsap.fromTo(
            valueEl,
            { yPercent: 100, opacity: 0, rotateX: -90 },
            {
              yPercent: 0,
              opacity: 1,
              rotateX: 0,
              duration: 1,
              delay: i * 0.2,
              ease: "power4.out",
              scrollTrigger: { trigger: statsRef.current, start: "top 80%", toggleActions: "play none none reverse" },
            }
          );

          // Label fades in after
          gsap.fromTo(
            labelEl,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              delay: 0.3 + i * 0.2,
              ease: "power3.out",
              scrollTrigger: { trigger: statsRef.current, start: "top 80%", toggleActions: "play none none reverse" },
            }
          );
        });
      }

      /* ── CTA: Elastic pop-in ── */
      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "back.out(1.7)",
            scrollTrigger: { trigger: ctaRef.current, start: "top 90%", toggleActions: "play none none reverse" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const headingWords = ["Designing", "with", "Calculated", "Purpose."];

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative w-full bg-transparent py-16 md:py-32 overflow-hidden flex items-center"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-6 space-y-8 md:space-y-12">
            {/* Label — horizontal slide */}
            <div ref={labelRef} className="flex items-center gap-4" style={{ opacity: 0 }}>
              <span className="font-mono text-xs tracking-[0.4em] text-accent font-bold">01/</span>
              <div className="h-px w-12 bg-white/20" />
              <span className="font-mono text-xs uppercase text-white/40">Mindset</span>
            </div>

            {/* Heading — alternating word slide */}
            <h2
              ref={headingRef}
              className="font-display text-5xl md:text-7xl font-bold leading-[1.1] tracking-tighter text-white"
              style={{ perspective: "800px" }}
            >
              {headingWords.map((word, i) => (
                <React.Fragment key={i}>
                  <span
                    className="about-word inline-block mr-[0.3em] overflow-hidden"
                    style={{ opacity: 0 }}
                  >
                    <span className={i === 2 ? "text-gradient italic" : ""}>
                      {word}
                    </span>
                  </span>
                  {i === 1 && <br />}
                </React.Fragment>
              ))}
            </h2>

            {/* Kinetic divider with light pulse */}
            <div className="relative">
              <div
                ref={dividerRef}
                className="h-px w-full bg-gradient-to-r from-accent/50 via-white/10 to-transparent origin-left"
                style={{ transform: "scaleX(0)" }}
              />
              <div
                ref={pulseRef}
                className="absolute top-0 w-8 h-px bg-accent shadow-[0_0_12px_rgba(255,152,162,0.6)]"
                style={{ left: "-10%", opacity: 0 }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 lg:col-start-8 flex flex-col justify-end space-y-8">
            {/* Bio — polygon wipe */}
            <div ref={bioRef} style={{ opacity: 0 }}>
              <p className="font-sans text-xl md:text-2xl leading-relaxed text-white/70 font-light">
                {PERSONAL_INFO.bio}
              </p>
            </div>

            {/* Stats — odometer roll */}
            <div ref={statsRef} className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
              {PERSONAL_INFO.stats.map((stat, i) => (
                <div key={i} className="stat-item overflow-hidden group" style={{ perspective: "600px" }}>
                  <span
                    className="stat-value block font-display text-4xl font-bold text-white group-hover:text-accent transition-colors duration-500"
                    style={{ opacity: 0 }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="stat-label block font-mono text-[10px] uppercase tracking-widest text-white/30 mt-2"
                    style={{ opacity: 0 }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA — elastic pop */}
            <div ref={ctaRef} className="pt-4" style={{ opacity: 0 }}>
              <button className="group flex items-center gap-3 text-white/40 hover:text-white transition-colors">
                <span className="font-mono text-[10px] uppercase tracking-widest">Read Full Story</span>
                <div className="w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-accent transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-0 bottom-0 p-12 overflow-hidden hidden lg:block">
        <div className="w-32 h-32 border border-white/5 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
          <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_15px_rgba(255,152,162,0.5)]" />
        </div>
      </div>
    </section>
  );
}