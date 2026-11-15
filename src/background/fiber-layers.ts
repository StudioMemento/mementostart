/** Original three ribbons plus two distinct depth/phase placements for the requested five-layer preset. */
export const FIBER_LAYERS = [
  { place: [0, 0, 0, 0], gain: 1, tint: 0 },
  { place: [1.9, -4.6, -0.08, 2.4], gain: 0.5, tint: 0.75 },
  { place: [-1.05, 2.0, 0.12, 4.1], gain: 0.55, tint: 0.35 },
  { place: [-2.4, -2.4, 0.045, 6.5], gain: 0.38, tint: 0.65 },
  { place: [2.2, 3.2, -0.09, 8.1], gain: 0.34, tint: 0.2 },
] as const;
export const layerCount = (value: number) => Math.max(1, Math.min(FIBER_LAYERS.length, Math.round(value) || 1));
