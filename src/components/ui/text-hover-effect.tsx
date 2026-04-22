"use client";

import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";

export const TextHoverEffect = ({
    text,
    duration = 0.4,
    opacity = 1,
    onReady,
    viewBox = "0 0 700 160",
    fontSize = 64,
    fontWeight = 700,
    fontStyle = "normal",
    textColor = "rgba(255,255,255,0.95)",
}: {
    text: string;
    duration?: number;
    opacity?: number;
    onReady?: () => void;
    viewBox?: string;
    fontSize?: number | string;
    fontWeight?: number | string;
    fontStyle?: string;
    textColor?: string;
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const maskGradientRef = useRef<SVGRadialGradientElement>(null);
    const animatedTextRef = useRef<SVGTextElement>(null);

    const [cursor, setCursor] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);
    const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

    /* ── Intro stroke animation ── */
    useEffect(() => {
        if (!animatedTextRef.current) return;

        // Added repeat and yoyo to make the appear animation loop infinitely
        const tl = gsap.timeline({
            repeat: -1,
            repeatDelay: 2, // Wait 2 seconds before repeating/reversing
            yoyo: true,
            onComplete: onReady
        });

        tl.fromTo(
            animatedTextRef.current,
            { strokeDashoffset: 1200, strokeDasharray: 1200 },
            {
                strokeDashoffset: 0,
                strokeDasharray: 1200,
                duration: 5.2,
                ease: "power4.inOut",
            }
        )

            /* subtle cinematic scale */
            .fromTo(
                svgRef.current,
                { scale: 0.98 },
                {
                    scale: 1,
                    duration: 0.8,
                    ease: "power3.out",
                },
                "-=0.8"
            );

        return () => {
            tl.kill();
        };
    }, [onReady]);

    /* Track mouse */
    const updateCursorPosition = (x: number, y: number) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();

        const newPosition = {
            cx: `${((x - rect.left) / rect.width) * 100}%`,
            cy: `${((y - rect.top) / rect.height) * 100}%`,
        };

        setMaskPosition(newPosition);

        if (maskGradientRef.current) {
            gsap.to(maskGradientRef.current, {
                attr: newPosition,
                duration,
                ease: "power2.out",
            });
        }
    };

    useEffect(() => {
        updateCursorPosition(cursor.x, cursor.y);
    }, [cursor]);

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseMove={(e) =>
                setCursor({ x: e.clientX, y: e.clientY })
            }
            className="select-none"
            style={{ opacity }}
        >
            <defs>
                <linearGradient
                    id="textGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    {hovered && (
                        <>
                            <stop offset="0%" stopColor="#b0b0b0" />
                            <stop offset="28%" stopColor="#ff98a2" />
                            <stop offset="52%" stopColor="#ffd6e0" />
                            <stop offset="76%" stopColor="#aaccff" />
                            <stop offset="100%" stopColor="#d0d0d0" />
                        </>
                    )}
                </linearGradient>

                <radialGradient
                    id="revealMask"
                    ref={maskGradientRef}
                    gradientUnits="userSpaceOnUse"
                    r="32%"
                    cx={maskPosition.cx}
                    cy={maskPosition.cy}
                >
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="black" />
                </radialGradient>

                <mask id="textMask">
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="url(#revealMask)"
                    />
                </mask>
            </defs>

            {[0, 1, 2].map((_, idx) => (
                <text
                    key={idx}
                    ref={idx === 1 ? animatedTextRef : undefined}
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    strokeWidth={idx === 2 ? "0.35" : "0.3"}
                    className="fill-transparent"
                    stroke={
                        idx === 0 || idx === 1
                            ? textColor
                            : "url(#textGradient)"
                    }
                    mask={idx === 2 ? "url(#textMask)" : undefined}
                    style={{
                        fontSize: fontSize,
                        fontFamily:
                            "var(--font-space-grotesk), Helvetica, sans-serif",
                        fontWeight: fontWeight,
                        fontStyle: fontStyle,
                        letterSpacing: "0.04em",
                        opacity: idx === 0 && !hovered ? 0 : idx === 0 ? 0.35 : 1,
                        transition: idx === 0 ? "opacity 0.6s ease" : "none",
                    }}
                >
                    {text}
                </text>
            ))}
        </svg>
    );
};