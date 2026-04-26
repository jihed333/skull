"use client";

import React from "react";

/*
  GlobalBackground — bg.webp marble texture
  ──────────────────────────────────────────
  Design goals:
  · Full bleed on every device, zero layout shift
  · Slightly blurred + darkened for legibility
  · Zero JS, zero RAF, no performance cost whatsoever
  · Image is loaded lazily by the browser (fixed bg = separate layer)
  · GPU-composited: only transform/opacity — never triggers layout or paint

  Technique:
  · <img> inside a fixed container instead of CSS background-image
    → gives us Next.js-compatible image URL (/bg.webp in /public)
    → object-fit: cover handles all aspect ratios perfectly
    → will-change: transform promotes to its own GPU layer
  · Two gradient overlays:
    1. A dark vignette that fades the edges to black (cinematic)
    2. A vertical gradient: heavier black at top/bottom, lighter in middle
       so content sections have a readable dark base
  · CSS filter: blur(2px) brightness(0.35) on the img itself
    — blur softens the marble veins so they read as texture, not noise
    — brightness(0.35) makes it dark enough that white text pops
    — these are applied to the img only, not the overlays, keeping
       the gradients crisp and un-blurred
*/

export function GlobalBackground() {
    return (
        <div
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
            aria-hidden="true"
        >
            {/* ── The marble image ── */}
            {/* 
        We use an <img> (not CSS background-image) for two reasons:
        1. It's easier to control filter without affecting the overlays
        2. The browser decodes it in parallel and composites it on the GPU
        
        object-fit: cover + object-position: center handles every
        viewport shape correctly — portrait, landscape, ultra-wide.
        
        No width/height tricks needed: position:absolute + inset:0
        stretches it to fill the fixed container exactly.
      */}
            <img
                src="/bg.webp"
                alt=""
                role="presentation"
                className="absolute inset-0 w-full h-full"
                style={{
                    objectFit: "cover",
                    objectPosition: "center center",
                    // ── Cinematic grading ──
                    // blur(1.5px): softens marble veins → reads as elegant texture
                    // brightness(0.32): dark enough for text contrast on all sections
                    // contrast(1.08): micro-boost so the pink veins stay visible
                    // saturate(0.9): slightly desaturate so pink doesn't fight the accent color
                    filter: "blur(1.5px) brightness(0.12) contrast(1.08) saturate(0.9)",
                    // GPU promote — this image never moves so one composited layer is free
                    willChange: "transform",
                    transform: "translateZ(0)",
                    // Prevent any sub-pixel bleed at edges from the blur
                    margin: "-3px",
                    width: "calc(100% + 6px)",
                    height: "calc(100% + 6px)",
                }}
                // No lazy loading — this is above the fold, critical visual
                loading="eager"
                decoding="async"
            />

            {/* ── Layer 1: Dark vignette (edges → black) ──
          Creates depth: the center of each section is lighter,
          edges recede into darkness. Very cinematic.
      */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
            radial-gradient(
              ellipse 120% 100% at 50% 50%,
              transparent 30%,
              rgba(0, 0, 0, 0.55) 70%,
              rgba(0, 0, 0, 0.88) 100%
            )
          `,
                }}
            />

            {/* ── Layer 2: Vertical gradient ──
          Top and bottom sections (hero, contact) need more darkness.
          Middle stays slightly lighter so the marble hints through.
      */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.72) 0%,
              rgba(0, 0, 0, 0.20) 20%,
              rgba(0, 0, 0, 0.10) 40%,
              rgba(0, 0, 0, 0.10) 60%,
              rgba(0, 0, 0, 0.30) 80%,
              rgba(0, 0, 0, 0.75) 100%
            )
          `,
                }}
            />

            {/* ── Layer 3: Subtle pink accent tint ──
          A barely-visible pink gradient in the center ties the marble's
          natural pink veins to your --color-accent (#ff98a2).
          Opacity is intentionally very low — this is subliminal.
      */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
            radial-gradient(
              ellipse 80% 60% at 50% 50%,
              rgba(255, 152, 162, 0.04) 0%,
              transparent 70%
            )
          `,
                }}
            />
        </div>
    );
}