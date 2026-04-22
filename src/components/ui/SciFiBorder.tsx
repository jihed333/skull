import React from 'react';

interface SciFiBorderProps {
  children?: React.ReactNode;
  className?: string;
}

export default function SciFiBorder({ children, className = '' }: SciFiBorderProps) {
  return (
    <div className={`relative w-full max-w-6xl mx-auto aspect-[1.5] bg-transparent overflow-hidden ${className}`}>
      {/* Main SVG Overlay 
        Uses a fixed aspect ratio viewbox (1200x800) to ensure perfect geometry and scaling.
      */}
      <svg 
        viewBox="0 0 1200 800" 
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Background Gradient */}
          <linearGradient id="metal-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2c" />
            <stop offset="25%" stopColor="#151515" />
            <stop offset="50%" stopColor="#2c2c2e" />
            <stop offset="75%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#252527" />
          </linearGradient>

          {/* Pink Accent Gradient (Replaced Gold) */}
          <linearGradient id="pink-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff98a2" />
            <stop offset="20%" stopColor="#ffccd1" />
            <stop offset="50%" stopColor="#e66a78" />
            <stop offset="80%" stopColor="#ffccd1" />
            <stop offset="100%" stopColor="#ff8290" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="glow-strong" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Metal Frame 
          A compound path that draws the outer shape and cuts out the inner screen.
          fill-rule="evenodd" creates the transparent hole in the middle.
        */}
        <path 
          d="
            M 20 40 L 40 20 L 1160 20 L 1180 40 L 1180 760 L 1160 780 L 40 780 L 20 760 Z 
            M 70 85 L 70 675 L 85 690 L 320 690 L 350 730 L 1115 730 L 1130 715 L 1130 85 L 1115 70 L 85 70 Z
          " 
          fill="url(#metal-bg)" 
          fillRule="evenodd" 
          stroke="#000000" 
          strokeWidth="2"
        />

        {/* 2. Edge Bevel Highlights */}
        <path 
          d="M 22 41 L 41 22 L 1159 22 L 1178 41 L 1178 759 L 1159 778 L 41 778 L 22 759 Z" 
          fill="none" 
          stroke="#444" 
          strokeWidth="1" 
          opacity="0.5"
        />

        {/* 3. Outer Pink Line
          Includes the subtle glow layer beneath the solid line.
        */}
        <path 
          d="M 30 45 L 45 30 L 1155 30 L 1170 45 L 1170 755 L 1155 770 L 45 770 L 30 755 Z" 
          fill="none" 
          stroke="url(#pink-line)" 
          strokeWidth="4" 
          filter="url(#glow-subtle)" 
          opacity="0.4" 
        />
        <path 
          d="M 30 45 L 45 30 L 1155 30 L 1170 45 L 1170 755 L 1155 770 L 45 770 L 30 755 Z" 
          fill="none" 
          stroke="url(#pink-line)" 
          strokeWidth="1.5" 
        />

        {/* 4. Inner Pink Line (Screen Outline)
          Notice the specific path at the bottom left to create the asymmetrical step.
        */}
        <path 
          d="M 85 70 L 1115 70 L 1130 85 L 1130 715 L 1115 730 L 350 730 L 320 690 L 85 690 L 70 675 L 70 85 Z" 
          fill="none" 
          stroke="url(#pink-line)" 
          strokeWidth="4" 
          filter="url(#glow-subtle)" 
          opacity="0.4" 
        />
        <path 
          d="M 85 70 L 1115 70 L 1130 85 L 1130 715 L 1115 730 L 350 730 L 320 690 L 85 690 L 70 675 L 70 85 Z" 
          fill="none" 
          stroke="url(#pink-line)" 
          strokeWidth="1.5" 
        />

        {/* 5. Decorative Light Flares 
          Positioned precisely on the top and bottom pink lines.
        */}
        {/* Top Flare */}
        <g transform="translate(1000, 30)">
          <ellipse cx="0" cy="0" rx="80" ry="2" fill="#ffffff" filter="url(#glow-strong)" opacity="0.9" />
          <ellipse cx="0" cy="0" rx="30" ry="1" fill="#ffffff" />
        </g>
        {/* Bottom Flare */}
        <g transform="translate(400, 770)">
          <ellipse cx="0" cy="0" rx="100" ry="2.5" fill="#ffffff" filter="url(#glow-strong)" opacity="0.9" />
          <ellipse cx="0" cy="0" rx="40" ry="1" fill="#ffffff" />
        </g>

        {/* 6. Scratches / Mechanical Tech Lines 
          Subtle vector lines embedded in the metal to replicate texture.
        */}
        <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" fill="none">
          <path d="M 45 250 L 55 260 L 55 300" />
          <path d="M 45 450 L 55 460 L 45 470" />
          <path d="M 1155 180 L 1145 190 L 1145 260" />
          <path d="M 1155 580 L 1145 590 L 1155 600" />
          <path d="M 1100 760 L 1110 750 L 1130 750" />
        </g>

        {/* 7. Top-Right Details (3 Dots) */}
        <circle cx="1080" cy="50" r="1.5" fill="#ff98a2" />
        <circle cx="1090" cy="50" r="1.5" fill="#ff98a2" />
        <circle cx="1100" cy="50" r="1.5" fill="#ff98a2" />

        {/* 8. Top-Left & Bottom-Right Stars */}
        {/* Top-Left Star centered at (57.5, 57.5) */}
        <path d="M 57.5 45 Q 57.5 57.5 70 57.5 Q 57.5 57.5 57.5 70 Q 57.5 57.5 45 57.5 Q 57.5 57.5 57.5 45" fill="url(#pink-line)" />
        {/* Bottom-Right Star centered at (1142.5, 742.5) */}
        <path d="M 1142.5 730 Q 1142.5 742.5 1155 742.5 Q 1142.5 742.5 1142.5 755 Q 1142.5 742.5 1130 742.5 Q 1142.5 742.5 1142.5 730" fill="url(#pink-line)" />

        {/* 9. Typography and Badges
          Text is directly injected to keep sharp resolution at any scale.
        */}
        {/* Left Vertical Text */}
        <text x="55" y="450" fill="#ff98a2" fontFamily="monospace" fontSize="9" fontWeight="bold" transform="rotate(-90 55 450)" letterSpacing="0.4em">
          11SEC 03812
        </text>
        
        {/* Right Vertical Text */}
        <text x="1145" y="480" fill="#ff98a2" fontFamily="monospace" fontSize="9" fontWeight="bold" transform="rotate(90 1145 480)" letterSpacing="0.4em">
          PR REP
        </text>

        {/* Bottom-Left Box "UH08 L" */}
        <g transform="translate(0, 0)">
          <path 
            d="M 75 705 L 175 705 L 180 710 L 180 735 L 175 740 L 75 740 L 70 735 L 70 710 Z" 
            fill="none" 
            stroke="url(#pink-line)" 
            strokeWidth="1.5" 
          />
          <text x="125" y="726.5" fill="#ffccd1" fontFamily="monospace" fontSize="13" fontWeight="bold" textAnchor="middle" letterSpacing="0.2em">
            UH08 L
          </text>
          {/* Dots next to the box */}
          <circle cx="195" cy="723" r="1.5" fill="#ffccd1" />
          <circle cx="205" cy="723" r="1.5" fill="#ffccd1" />
          <circle cx="215" cy="723" r="1.5" fill="#ffccd1" />
        </g>
      </svg>

      {/* Interactive Content Layer 
        Positioned exactly inside the inner frame. The clip-path mathematically perfectly matches 
        the internal cutouts (including the asymmetric bottom-left step), ensuring no content leaks out.
      */}
      <div 
        className="absolute top-[8.75%] bottom-[8.75%] left-[5.833%] right-[5.833%] z-10 pointer-events-auto"
        style={{
          clipPath: `polygon(
            1.41% 0%, 
            98.59% 0%, 
            100% 2.27%, 
            100% 97.73%, 
            98.59% 100%, 
            26.41% 100%, 
            23.58% 93.93%, 
            1.41% 93.93%, 
            0% 91.66%, 
            0% 2.27%
          )`
        }}
      >
        {/* Render the user's application inside the screen - Now fully transparent! */}
        <div className="w-full h-full bg-transparent text-white flex flex-col p-8 overflow-y-auto">
           {children || (
              <div className="w-full h-full flex items-center justify-center text-[#ffccd1] opacity-30 tracking-[0.5em] text-sm md:text-xl font-mono uppercase">
                System Offline
              </div>
           )}
        </div>
      </div>
    </div>
  );
}