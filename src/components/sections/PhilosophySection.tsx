"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";

gsap.registerPlugin(ScrollTrigger);

const ThinkerModel = dynamic(
  () => import("@/components/canvas/ThinkerModel").then((m) => ({ default: m.ThinkerModel })),
  { ssr: false }
);

/*
  ═══════════════════════════════════════════════
  PHILOSOPHY — "The Gravity Drop"
  
  Animation concept: Title words fall from above 
  with realistic gravity — they accelerate 
  downward and bounce on landing with decreasing 
  amplitude (like dropping a ball).
  
  Philosophy cards fan out from a single stacked 
  point — they start overlapping in the center 
  and rotate outward to their grid positions like 
  a poker hand being spread.
  
  Testimonials slide in from below with a 
  perspective tilt, like cards being placed on a 
  table from below.
  
  Section label uses a scramble/decode effect.
  ═══════════════════════════════════════════════
*/

const PHILOSOPHIES = [
  {
    title: "Craft Over Convention",
    text: "Every pixel, every frame, every interaction is an opportunity to delight. I don't settle for 'good enough', I chase the feeling of wonder.",
  },
  {
    title: "Performance is UX",
    text: "A beautiful site that stutters is a broken site. I obsess over frame rates, bundle sizes, and perceived performance.",
  },
  {
    title: "Code as Art",
    text: "The best code reads like poetry, clean, intentional, and expressive. Engineering and aesthetics are not opposites, they're partners.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "One of the most talented creative developers I've worked with. They bring a rare combination of technical excellence and artistic vision.",
    author: "Sarah Chen",
    role: "Design Director, Studio Digital",
  },
  {
    quote:
      "The 3D experience they built for our product launch generated more engagement than any campaign we've ever run.",
    author: "Marcus Rodriguez",
    role: "VP of Marketing, TechCorp",
  },
];

export function PhilosophySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const testLabelRef = useRef<HTMLSpanElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Label: Text scramble/decode ── */
      if (labelRef.current) {
        const finalText = "07 — Philosophy";
        const chars = "!@#$%^&*()_+-=[]{}|;:,./<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const el = labelRef.current;
        let frame = 0;
        const totalFrames = 30;

        const scrambleTl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
        });

        scrambleTl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        scrambleTl.to({}, {
          duration: 1,
          onUpdate: function () {
            frame++;
            const progress = frame / totalFrames;
            let result = "";
            for (let i = 0; i < finalText.length; i++) {
              if (i < finalText.length * progress) {
                result += finalText[i];
              } else {
                result += chars[Math.floor(Math.random() * chars.length)];
              }
            }
            el.textContent = result;
          },
          onComplete: () => { el.textContent = finalText; },
        });
      }

      /* ── Title: Gravity drop with bounce ── */
      if (titleRef.current) {
        const words = titleRef.current.querySelectorAll(".grav-word");
        words.forEach((word, i) => {
          gsap.fromTo(
            word,
            { y: -200, opacity: 0, scale: 1.1 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1.2,
              delay: i * 0.2,
              ease: "bounce.out",
              scrollTrigger: { trigger: titleRef.current, start: "top 80%", toggleActions: "play none none reverse" },
            }
          );
        });
      }

      /* ── Philosophy cards: Poker fan spread ── */
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".phil-fan");
        const count = cards.length;
        const fanAngle = 8; // degrees per card from center

        cards.forEach((card, i) => {
          const centerIdx = (count - 1) / 2;
          const offset = i - centerIdx;
          gsap.fromTo(
            card,
            {
              rotation: 0,
              x: 0,
              y: 40,
              scale: 0.9,
              opacity: 0,
              zIndex: count - i,
            },
            {
              rotation: offset * fanAngle,
              x: offset * 20,
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 1,
              delay: i * 0.15,
              ease: "power4.out",
              scrollTrigger: { trigger: cardsRef.current, start: "top 78%", toggleActions: "play none none reverse" },
              onComplete: () => {
                // After fan, settle to grid
                gsap.to(card, {
                  rotation: 0,
                  x: 0,
                  duration: 0.6,
                  delay: 0.3,
                  ease: "power3.inOut",
                });
              },
            }
          );
        });
      }

      /* ── Testimonials label ── */
      if (testLabelRef.current) {
        gsap.fromTo(
          testLabelRef.current,
          { clipPath: "inset(0 100% 0 0)", opacity: 0 },
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 1,
            ease: "power4.out",
            scrollTrigger: { trigger: testLabelRef.current, start: "top 88%", toggleActions: "play none none reverse" },
          }
        );
      }

      /* ── Testimonials: Slide up from below with tilt ── */
      if (testimonialsRef.current) {
        const cards = testimonialsRef.current.querySelectorAll(".test-tilt");
        cards.forEach((card, i) => {
          gsap.fromTo(
            card,
            {
              y: 80,
              rotateX: 25,
              opacity: 0,
              scale: 0.95,
              transformOrigin: "bottom center",
            },
            {
              y: 0,
              rotateX: 0,
              opacity: 1,
              scale: 1,
              duration: 1.2,
              delay: i * 0.2,
              ease: "power4.out",
              scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none reverse" },
            }
          );

          // Quote mark: pop in separately
          const qm = card.querySelector(".qm");
          if (qm) {
            gsap.fromTo(
              qm,
              { scale: 0, rotation: -20, opacity: 0 },
              {
                scale: 1,
                rotation: 0,
                opacity: 1,
                duration: 0.7,
                delay: 0.4 + i * 0.2,
                ease: "back.out(2.5)",
                scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none reverse" },
              }
            );
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="philosophy" className="section-container">
      <div className="max-w-6xl mx-auto">
        {/* Header: title left, 3D model right */}
        <div className="mb-16 flex flex-col md:flex-row md:items-center gap-8">

          {/* Left: label + title */}
          <div className="space-y-4 flex-1">
            {/* Label — scramble decode */}
            <span
              ref={labelRef}
              className="font-mono text-xs tracking-[0.4em] uppercase text-contrast/70 block"
              style={{ opacity: 0 }}
            >
              07 — Philosophy
            </span>

            {/* Title — gravity drop bounce */}
            <div ref={titleRef} className="font-display text-display-lg font-bold">
              <span className="grav-word inline-block mr-[0.3em]" style={{ opacity: 0 }}>What</span>
              <span className="grav-word inline-block mr-[0.3em]" style={{ opacity: 0 }}>I</span>
              <br />
              <span className="grav-word inline-block text-gradient" style={{ opacity: 0 }}>Believe</span>
            </div>
          </div>

          {/* Right: 3D Thinker model */}
          <div
            className="w-full md:w-[340px] lg:w-[400px] flex-shrink-0"
            style={{ height: "380px", overflow: "visible" }}
          >
            <ThinkerModel />
          </div>

        </div>

        {/* Philosophy cards — poker fan spread */}
        <div
          ref={cardsRef}
          role="list"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
        >
          {PHILOSOPHIES.map((phil, i) => (
            <div
              key={i}
              role="listitem"
              className="phil-fan glass rounded-2xl p-8 h-full group hover:border-contrast/20 transition-colors will-change-transform"
              style={{ opacity: 0, transformOrigin: "bottom center" }}
            >
              <div className="space-y-4">
                <div className="w-8 h-8 rounded-full bg-contrast/10 flex items-center justify-center">
                  <span className="font-mono text-xs text-contrast">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-secondary">
                  {phil.title}
                </h3>
                <p className="text-sm leading-relaxed text-grey/40">
                  {phil.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="space-y-8">
          <span
            ref={testLabelRef}
            className="font-mono text-xs tracking-[0.3em] uppercase text-grey/30 block"
            style={{ opacity: 0 }}
          >
            What others say
          </span>

          <div
            ref={testimonialsRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            style={{ perspective: "1000px" }}
          >
            {TESTIMONIALS.map((test, i) => (
              <motion.blockquote
                key={i}
                className="test-tilt glass rounded-2xl p-8 relative will-change-transform"
                style={{ opacity: 0, transformOrigin: "bottom center" }}
                whileHover={{ scale: 1.01, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="qm absolute top-6 left-8 text-5xl text-contrast/20 font-serif leading-none"
                  style={{ opacity: 0 }}
                >
                  &ldquo;
                </div>
                <p className="text-base leading-relaxed text-secondary/70 mb-6 pt-6">
                  {test.quote}
                </p>
                <footer className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-contrast/20" />
                  <div>
                    <p className="text-sm font-medium text-secondary">{test.author}</p>
                    <p className="text-xs text-grey/40">{test.role}</p>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}