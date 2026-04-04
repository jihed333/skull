"use client";

import React, { useRef, useState, forwardRef } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate, useTransform } from "framer-motion";
import Image from "next/image";

export interface XRayRevealProps {
  foregroundSrc: string;
  backgroundSrc: string;
  className?: string;
  backgroundClassName?: string;
  lensSize?: number;
  lensFeather?: number;
}

export const XRayReveal = forwardRef<HTMLDivElement, XRayRevealProps>(({
  foregroundSrc,
  backgroundSrc,
  className = "",
  backgroundClassName = "object-cover",
  lensSize = 140,
  lensFeather = 60,
}, forwardedRef) => {
  const localRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Mouse absolute tracking
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // Springs for buttery smooth mouse pursuit
  const springTracking = { damping: 30, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(mouseX, springTracking);
  const smoothY = useSpring(mouseY, springTracking);

  // Mask physics that expand when clicked/pressed
  const currentLensSize = isPressed ? lensSize * 1.5 : lensSize;
  const currentFeather = isPressed ? lensFeather * 1.5 : lensFeather;
  const dynamicSize = useSpring(currentLensSize, { bounce: 0, duration: 400 });
  const dynamicFeather = useSpring(currentFeather, { bounce: 0, duration: 400 });
  
  // Cleanly bind complex math into a reactive Framer Transform so the template string never breaks
  const dynamicTotal = useTransform(() => dynamicSize.get() + dynamicFeather.get());

  const maskImage = useMotionTemplate`radial-gradient(circle ${dynamicSize}px at ${smoothX}px ${smoothY}px, black 0%, transparent ${dynamicTotal}px)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = (forwardedRef as React.RefObject<HTMLDivElement>)?.current || localRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  return (
    <div
      ref={(node) => {
        (localRef as any).current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={`relative overflow-hidden group cursor-none ${className}`}
    >
      {/* 
        ==============================
        [ BASE ] FOREGROUND LAYER 
        ============================== 
      */}
      <motion.div
        className="block w-full h-full relative select-none"
        animate={{ scale: isHovered ? 1.03 : 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        initial={false}
      >
        <Image
          src={foregroundSrc}
          alt="Foreground"
          fill
          className="object-cover transition-all duration-[1200ms] ease-out"
          sizes="(max-width: 768px) 85vw, 50vw"
          priority={false}
        />
      </motion.div>

      {/* 
        ==============================
        [ ABYSS ] X-RAY MASK LAYER 
        ============================== 
      */}
      <motion.div
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{
          WebkitMaskImage: maskImage,
          maskImage: maskImage,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Static Position Wrapper (Parallax Disabled) */}
        <motion.div
          className="w-full h-full absolute inset-0"
          animate={{
            scale: isPressed ? 1.08 : (isHovered ? 1.04 : 1),
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          initial={false}
        >
          {/* Original generated colors (No filter) */}
          <div className="relative w-full h-full">
            <Image
              src={backgroundSrc}
              alt="X-Ray Background"
              fill
              className={`block mix-blend-screen pointer-events-none ${backgroundClassName}`}
              sizes="(max-width: 768px) 85vw, 50vw"
            />
          </div>
          {/* Subtle noise over the bones for realism */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        </motion.div>

        {/* Outer void darkening slightly on press simulating scanner intensity */}
        <motion.div 
          className="absolute inset-0 bg-black pointer-events-none mix-blend-overlay"
          animate={{ opacity: isPressed ? 0.3 : 0 }}
        />
      </motion.div>

      {/* 
        ==============================
        [ HUD ] AWWWARDS TARGETING RING 
        ============================== 
      */}
      <motion.div
        className="absolute pointer-events-none z-20 mix-blend-difference flex items-center justify-center"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
          opacity: isHovered ? 1 : 0,
        }}
      >
        {/* Outer dashed spinning ring */}
        <motion.div
          animate={{ rotate: isPressed ? 180 : 360 }}
          transition={{ repeat: Infinity, duration: isPressed ? 4 : 20, ease: "linear" }}
          className="absolute w-[120px] h-[120px] rounded-full border border-white/10"
          style={{ borderStyle: "dashed", opacity: isHovered ? 1 : 0 }}
        />
        
        {/* Inner glassmorphic scanning rim */}
        <motion.div
          className="absolute rounded-full border border-white/20 backdrop-blur-[2px]"
          animate={{
            width: isPressed ? 110 : 80,
            height: isPressed ? 110 : 80,
          }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
        >
          {/* 4 Architectural Crosshairs attached to the glass rim */}
          <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[1px] h-[10px] bg-white/40" />
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[1px] h-[10px] bg-white/40" />
          <div className="absolute top-1/2 -left-[5px] -translate-y-1/2 w-[10px] h-[1px] bg-white/40" />
          <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-[10px] h-[1px] bg-white/40" />
        </motion.div>

        {/* Microscopic center targeting dot */}
        <div className="absolute w-[2px] h-[2px] bg-white rounded-full opacity-60" />

      </motion.div>
    </div>
  );
});

XRayReveal.displayName = "XRayReveal";