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
