// Shared mutable state — written by PortraitSection ticker,
// read by GlobalSkullCanvas ticker. Same frame, zero drift.
export const scanlineState = {
  scanY:   0,  // px from top of portrait frame
  frameH:  0,  // cached portrait frame height
  opacity: 0,
};
