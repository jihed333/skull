"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { XRayReveal } from "@/components/ui/XRayReveal";

gsap.registerPlugin(ScrollTrigger);

export function PortraitSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Cinematic reveal
      gsap.fromTo(
        containerRef.current,
        {
          clipPath: "polygon(15% 40%, 85% 40%, 85% 60%, 15% 60%)",
        },
        {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top center",
            end: "center center",
            scrub: 1,
          },
        }
      );

      // Parallax
      gsap.fromTo(
        imageRef.current,
        { scale: 1.15, yPercent: -10 },
        {
          scale: 1,
          yPercent: 10,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full h-[200vh] bg-transparent">
      <div className="sticky top-0 h-[100dvh] flex items-center justify-center overflow-hidden">
        
        {/* IMAGE FRAME */}
        <div
          ref={containerRef}
          className="absolute w-[85vw] md:w-[50vw] h-[60vh] md:h-[75vh] overflow-hidden border border-white/10 shadow-2xl"
        >
          <div ref={imageRef} className="w-full h-full">
            <XRayReveal
              foregroundSrc="/jihed.jpg"
              backgroundSrc="/xrayPerfect.png"
              className="w-full h-full grayscale contrast-125 hover:grayscale-0 transition-all duration-[2000ms]"
              backgroundClassName="object-cover"
              lensSize={140}
              lensFeather={70}
            />
          </div>
        </div>

        {/* TEXT */}
        <div className="absolute inset-0 flex flex-col justify-center pointer-events-none mix-blend-difference">
          <h1 className="text-left pl-[5vw] text-[#ff98a2] font-black uppercase text-[20vw] md:text-[14vw] leading-[0.8]">
            THE
          </h1>
          <h1 className="text-right pr-[5vw] text-white italic font-black uppercase text-[20vw] md:text-[14vw] leading-[0.8]">
            ARCHITECT
          </h1>
        </div>
      </div>
    </section>
  );
}