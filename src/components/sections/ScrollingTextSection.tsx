"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

const defaultText = "Forged in the shadows of innovation, we are a digital atelier meticulously crafting experiences that transcend the ordinary. Our philosophy is rooted in precision, structural integrity, and uncompromising aesthetic standards. We engineer interactive dimensions where form and function coalesce into absolute visual purity. Every interaction is a statement of intent, deliberately designed to shift paradigms and evoke profound engagement.";

const words = defaultText.split(" ");

function Word({ children, progress, range }: { children: string, progress: MotionValue<number>, range: number[] }) {
    // Opacity fades in quickly at the beginning of the word's range
    // Fade opacity over the first half of the word's movement so it appears smoothly
    const opacity = useTransform(progress, [range[0], range[0] + (range[1] - range[0]) * 0.5], [0, 1]);
    
    // Slighly smaller distance so it doesn't feel like it's flying too fast
    const x = useTransform(progress, range, ["40vw", "0vw"]);

    return (
        <span className="relative inline-block overflow-hidden mr-2 md:mr-3 lg:mr-4 mb-1 md:mb-2">
            <motion.span
                className="inline-block relative font-light text-silver-200"
                style={{ x, opacity }}
            >
                {children}
            </motion.span>
        </span>
    );
}

export function ScrollingTextSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    return (
        <section 
            id="scrolling-text"
            ref={containerRef} 
            className="relative h-[400vh] bg-transparent z-10 w-full pointer-events-none"
        >
            <div className="sticky top-0 h-[100dvh] w-full flex items-center justify-center overflow-hidden px-4">
                <div className="max-w-[95vw] md:max-w-[85vw] lg:max-w-[70vw] mx-auto flex flex-wrap text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-relaxed md:leading-normal tracking-tight">
                    {words.map((word, i) => {
                        // Calculate range for each word.
                        const step = 0.85 / words.length;
                        
                        // Give each word a fixed, longer duration to arrive so the motion feels luxurious
                        const start = i * step;
                        const end = start + 0.15; 

                        return (
                            <Word key={i} progress={scrollYProgress} range={[start, end]}>
                                {word}
                            </Word>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}