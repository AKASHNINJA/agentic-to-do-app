export const MOTION = {
  spring: {
    damping: 16,
    stiffness: 170,
    mass: 0.6,
  },
  sceneFloatMs: 2500,
  sceneDriftMs: 9000,
  listParallaxMax: 20,
  heroParallaxMax: 18,
  heroScaleMin: 0.92,
  cardCompleteMs: 700,
  parallaxFactor: 8,
  gradientShiftMs: 9000,
  momentumDecayPerHour: 1.25,
  focusPulseMs: 60_000,
} as const;
