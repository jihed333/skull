"use client";

import React, { useRef, useEffect, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  // FIX 18: Don't render or run the cursor RAF on touch devices.
  // The cursor hides the native cursor and adds a mousemove listener +
  // requestAnimationFrame loop on ALL devices — even phones where there's no mouse.
  // This wastes CPU and forces the browser to stay "hot" on touch.
  const [isTouch, setIsTouch] = useState(true); // default true = safe SSR

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (isTouch) return; // skip entirely on touch devices

    document.documentElement.classList.add("hide-native-cursor");

    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
    };
    window.addEventListener("mousemove", move);

    let rafId: number;
    const follow = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.08;
      ring.current.y += (pos.current.y - ring.current.y) * 0.08;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`;
      }
      rafId = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("hide-native-cursor");
    };
  }, [isTouch]);

  if (isTouch) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="fixed z-[99999] w-2 h-2 rounded-full bg-[#ff98a2] pointer-events-none"
        style={{ top: 0, left: 0, willChange: "transform", pointerEvents: "none" }}
      />
      <div
        ref={ringRef}
        className="fixed z-[99998] w-10 h-10 rounded-full border border-[#ff98a2]/40 pointer-events-none"
        style={{ top: 0, left: 0, willChange: "transform", transition: "width 0.3s, height 0.3s, border-color 0.3s", pointerEvents: "none" }}
      />
    </>
  );
}