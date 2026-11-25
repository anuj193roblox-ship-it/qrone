// Print size rule of thumb: a code should be about a tenth as wide as the distance it's scanned from.
// Pure, so it has a test. All lengths in centimetres.
export const CM_PER_INCH = 2.54;
export const DISTANCE = { min: 15, max: 500 }; // cm

export function printSize(distanceCm) {
  const d = Math.min(DISTANCE.max, Math.max(DISTANCE.min, Number(distanceCm) || DISTANCE.min));
  const minimum = Math.max(2, d / 10);
  const recommended = Math.max(2.5, d / 8);
  // The blank border needs about 4 squares of the pattern on every side: roughly 15% of the code's width.
  const border = recommended * 0.15;
  return { distance: d, minimum, recommended, border };
}

// 1 decimal under 10, whole numbers above, so "2.5 cm" and "31 cm" both read naturally.
export const round = (n) => (n < 10 ? Math.round(n * 10) / 10 : Math.round(n));
export const toInches = (cm) => cm / CM_PER_INCH;
