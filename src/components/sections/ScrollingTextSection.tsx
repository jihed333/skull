"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const text = "Forged in the shadows of innovation, we are a digital atelier meticulously crafting experiences that transcend the ordinary. Our philosophy is rooted in precision, structural integrity, and uncompromising aesthetic standards. We engineer interactive dimensions where form and function coalesce into absolute visual purity. Every interaction is a statement of intent, deliberately designed to shift paradigms and evoke profound engagement.";

const words = text.split(" ");

export function ScrollingTextSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectionRef.current || !textRef.current) return;

        const wordsEls = textRef.current.querySelectorAll(".scroll-word");
        
        // Context for safe cleanup
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "+=250%", // Pins for 2.5x the viewport height
                    pin: true,
                    scrub: 0.75, // Lower value = faster follow, higher = smoother lag
                    anticipatePin: 1,
                },
            });

            // Cinematic staggered reveal
            tl.fromTo(
                wordsEls,
                { 
                    opacity: 0.05, 
                    filter: "blur(15px)",
                    y: 40,
                    scale: 0.85,
                    rotateX: 45,
                },
                {
                    opacity: 1,
                    filter: "blur(0px)",
                    y: 0,
                    scale: 1,
                    rotateX: 0,
                    stagger: 0.15,
                    duration: 1.2,
                    ease: "power3.out",
                }
            );

            // Subtle "outro" - optional, but makes it feel more finished
            tl.to(wordsEls, {
                opacity: 0.3,
                duration: 0.5,
                stagger: 0.05,
                ease: "power2.inOut"
            }, "+=0.2");
            
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative w-full h-screen overflow-hidden bg-transparent z-30"
            style={{ perspective: "1500px" }}
        >
            <div className="absolute inset-0 flex items-center justify-center px-6 md:px-12">
                <div 
                    ref={textRef}
                    className="max-w-[92vw] md:max-w-[85vw] lg:max-w-[75vw] text-center flex flex-wrap justify-center items-center text-[28px] sm:text-4xl md:text-5xl lg:text-[4.25rem] font-light leading-[1.15] tracking-[-0.03em] text-white"
                >
                    {words.map((word, i) => (
                        <span 
                            key={i} 
                            className="scroll-word inline-block mr-[0.25em] mb-[0.1em] will-change-[transform,opacity,filter]"
                        >
                            {word}
                        </span>
                    ))}
                </div>
            </div>
            
            {/* Background Hint / Aura */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </section>
    );
}