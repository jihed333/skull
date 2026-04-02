"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    breathe?: boolean;
}

export function GlassCard({
    children,
    className = "",
    hover = true,
    breathe = false,
}: GlassCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Breathing idle animation
    useEffect(() => {
        if (!breathe || !cardRef.current) return;

        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(cardRef.current, {
            scale: 1.005,
            duration: 3,
            ease: "sine.inOut",
        });

        return () => { tl.kill(); };
    }, [breathe]);

    // Magnetic tilt on hover
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!hover || !cardRef.current) return;
            const card = cardRef.current;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            gsap.to(card, {
                rotateX,
                rotateY,
                duration: 0.4,
                ease: "power2.out",
                transformPerspective: 800,
            });

            // Move glow to cursor position
            if (glowRef.current) {
                gsap.to(glowRef.current, {
                    x: x - rect.width / 2,
                    y: y - rect.height / 2,
                    opacity: 1,
                    duration: 0.3,
                });
            }
        },
        [hover]
    );

    const handleMouseEnter = useCallback(() => {
        if (!hover || !cardRef.current) return;
        setIsHovered(true);
        gsap.to(cardRef.current, {
            scale: 1.02,
            borderColor: "rgba(255, 152, 162, 0.25)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(255,152,162,0.08)",
            duration: 0.4,
            ease: "power2.out",
        });
    }, [hover]);

    const handleMouseLeave = useCallback(() => {
        if (!hover || !cardRef.current) return;
        setIsHovered(false);
        gsap.to(cardRef.current, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            borderColor: "rgba(255,255,255,0.06)",
            boxShadow: "none",
            duration: 0.6,
            ease: "power3.out",
        });
        if (glowRef.current) {
            gsap.to(glowRef.current, { opacity: 0, duration: 0.4 });
        }
    }, [hover]);

    return (
        <div
            ref={cardRef}
            className={`glass rounded-2xl p-6 relative overflow-hidden will-change-transform ${className}`}
            style={{ transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Cursor-following glow */}
            {hover && (
                <div
                    ref={glowRef}
                    className="absolute w-40 h-40 rounded-full pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(255,152,162,0.12) 0%, transparent 70%)",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        opacity: 0,
                        filter: "blur(20px)",
                    }}
                />
            )}

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
