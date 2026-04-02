"use client";

import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function AwwwardsHUD() {
  const [timeStr, setTimeStr] = useState("");
  const { scrollY } = useScroll();
  const scrollTracker = useTransform(scrollY, (val) => Math.floor(val).toString().padStart(4, "0"));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + " TN");
    };
    updateTime();
    const intv = setInterval(updateTime, 1000);
    return () => clearInterval(intv);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9990] hidden md:block mix-blend-difference">
      {/* Top Right: Menu trigger (magnetic interactive) */}
      <div className="absolute top-8 right-8 pointer-events-auto">
        <button className="magnetic w-12 h-12 rounded-full border border-white/20 hover:border-white focus:outline-none focus:ring-1 focus:ring-accent flex items-center justify-center group overflow-hidden transition-colors duration-500 backdrop-blur-md bg-white/5">
          <div className="flex flex-col gap-[3px] items-end group-hover:gap-[2px] transition-all duration-300">
             <span className="w-5 h-[2px] bg-white group-hover:w-4 transition-all duration-300"></span>
             <span className="w-3 h-[2px] bg-white group-hover:w-4 transition-all duration-300"></span>
          </div>
        </button>
      </div>

      {/* Bottom Left: Location/Time */}
      <div className="absolute bottom-8 left-8 flex items-center gap-3">
        <div className="w-[6px] h-[6px] rounded-full bg-accent animate-pulse" />
        <span className="font-mono text-[10px] tracking-widest text-white uppercase opacity-70">
          Sousse, Tunisia {timeStr || "00:00:00"}
        </span>
      </div>

      {/* Bottom Right: Scroll Coordinate */}
      <div className="absolute bottom-8 right-8 flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white uppercase opacity-50">SCROLL [Y]</span>
        <motion.span className="font-mono text-[10px] tracking-[0.2em] text-accent">
          {scrollTracker}
        </motion.span>
      </div>
    </div>
  );
}
