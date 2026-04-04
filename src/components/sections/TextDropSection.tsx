"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const TEXT_LINES = [
    "Art is not only",
    "a form of",
    "expression -",
    "it is a way of",
    "discovering",
    "oneself"
];

const IMAGES = [
    { src: "https://bato-web-agency.github.io/bato-shared/img/text-drop/img1.png", top: "12%", left: "4%", width: "26.5vw", opacity: 1, speed: 0.1 },
    { src: "https://bato-web-agency.github.io/bato-shared/img/text-drop/img2.png", top: "29%", right: "10%", width: "26.5vw", opacity: 0.75, speed: 0.2 },
    { src: "https://bato-web-agency.github.io/bato-shared/img/text-drop/img3.png", top: "68%", right: "9.5%", width: "29vw", opacity: 1, speed: 0.15 },
    { src: "https://bato-web-agency.github.io/bato-shared/img/text-drop/img4.png", top: "72%", left: "12%", width: "26.5vw", opacity: 0.75, speed: 0.25 },
];

export const TextDropSection = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const linesRef = useRef<(HTMLDivElement | null)[]>([]);
    const imagesRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Text Line Animations
            linesRef.current.forEach((line) => {
                if (!line) return;
                gsap.fromTo(
                    line,
                    { rotateX: -120, opacity: 0 },
                    {
                        rotateX: 0,
                        opacity: 1,
                        duration: 1.2,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: line,
                            start: "bottom bottom",
                            end: "bottom center",
                            scrub: true,
                        },
                    }
                );
            });

            // Image Reveal Animations
            imagesRef.current.forEach((img, index) => {
                if (!img) return;
                const targetOpacity = IMAGES[index].opacity;
                const speed = IMAGES[index].speed;

                gsap.to(img, {
                    opacity: targetOpacity,
                    y: () => - (1 - speed) * 300, // Parallax effect
                    duration: 0.5,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top center",
                        end: "bottom top",
                        scrub: 1,
                    },
                });
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[150vh] py-32 md:py-48 overflow-hidden bg-black flex flex-col items-center justify-center pointer-events-none"
            style={{ perspective: "2000px" }}
        >
            {/* Background Glows (Matching CodePen theme) */}
            <div className="absolute top-[40%] left-[5%] w-[300px] h-[300px] rounded-full bg-cyan-500/20 blur-[160px] -z-10" />
            <div className="absolute top-[20%] right-[15%] w-[175px] h-[175px] rounded-full bg-cyan-400/20 blur-[100px] -z-10" />

            {/* Floating Images */}
            {IMAGES.map((img, i) => (
                <div
                    key={i}
                    ref={(el) => { imagesRef.current[i] = el; }}
                    className="absolute opacity-0 rounded-lg overflow-hidden"
                    style={{
                        top: img.top,
                        left: img.left,
                        right: img.right,
                        maxWidth: img.width,
                        zIndex: i === 3 ? 20 : 0
                    }}
                >
                    <Image
                        src={img.src}
                        alt={`Artistic image ${i + 1}`}
                        width={600}
                        height={800}
                        className="w-full h-auto object-cover"
                        unoptimized // External Batik URLs usually need this
                    />
                </div>
            ))}

            {/* Rotating Text Lines */}
            <div className="relative z-10 w-full flex flex-col items-center gap-2">
                {TEXT_LINES.map((line, i) => (
                    <div
                        key={i}
                        ref={(el) => { linesRef.current[i] = el; }}
                        className="text-[10vw] md:text-[8vw] font-bold leading-[1.1] text-white tracking-tighter uppercase whitespace-nowrap will-change-transform mix-blend-difference"
                        style={{
                            fontFamily: "var(--font-space-grotesk), sans-serif",
                            transformOrigin: "50% 0",
                            transformStyle: "preserve-3d",
                            backfaceVisibility: "hidden"
                        }}
                    >
                        {line}
                    </div>
                ))}
            </div>
        </section>
    );
};
