"use client";

import React from "react";

export function GlobalBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* 
          Rotating a background image 90 degrees clockwise.
          To ensure full coverage after rotation:
          - We use a square container with dimensions based on the largest viewport side (vmax).
          - We center it and rotate it.
      */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "150vmax", 
          height: "150vmax",
          transform: "translate(-50%, -50%)",
          backgroundImage: "url('/38ba8626-f506-4686-abf1-2196b734528b.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.45, // Subtle presence to stay "clean and perfect"
          filter: "brightness(0.7) contrast(1.1)", // Cinematic grading
        }}
      />
      
      {/* 
          Gradient overlay to ensure smooth transition into the deep blacks 
          and keep the Tech Stack exclusion feeling natural.
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent to-void/80" />
    </div>
  );
}
