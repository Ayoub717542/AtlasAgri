// Demonstration assumptions shared by the analysis and the economics panels.
// These are screening values for the prototype, not field measurements or
// market quotes. Replace them here when local measurements become available.

// Share of seasonal rainfall assumed to be stored and used by the crop.
// The remainder is lost to runoff, deep drainage and evaporation.
export const EFFECTIVE_RAIN_SHARE = 0.7;

// Share of the net crop water requirement that reaches the root zone.
// The rest is lost in conveyance, application and uniformity losses.
export const IRRIGATION_EFFICIENCY = 0.85;

// Working lower bound for soil organic matter in the demonstration guideline.
// It is not a Moroccan legal threshold or a laboratory rating.
export const OM_TARGET_PCT = 2;

// Share of legume-fixed nitrogen assumed to replace synthetic nitrogen.
// The rest is removed with the crop, immobilised or lost.
export const N_CREDIT_SHARE = 0.3;

// Demonstration cost of one kilogram of fertilizer nitrogen.
// This is an assumption, not a market price.
export const N_PRICE_MAD_PER_KG = 8;

export const roundTo = (value, step) => Math.round(value / step) * step;

export function irrigationGap({ needMm = 0, seasonRainMm = 0 }) {
  const need = Math.max(0, Number(needMm) || 0);
  const rain = Math.max(0, Number(seasonRainMm) || 0);
  const effectiveRainMm = Math.min(need, rain * EFFECTIVE_RAIN_SHARE);
  const netMm = Math.max(0, need - effectiveRainMm);
  const grossMm = netMm / IRRIGATION_EFFICIENCY;

  return {
    needMm: Math.round(need),
    seasonRainMm: Math.round(rain),
    effectiveRainMm: Math.round(effectiveRainMm),
    netMm: Math.round(netMm),
    grossMm: Math.round(grossMm),
    // 1 mm of water over 1 ha = 10 m³/ha.
    m3Ha: roundTo(grossMm * 10, 10),
    effectiveRainShare: EFFECTIVE_RAIN_SHARE,
    irrigationEfficiency: IRRIGATION_EFFICIENCY,
  };
}

// Estimated fertilizer-N equivalent from the extra legume nitrogen in a
// rotation, relative to the current rotation. Never counts a loss as a saving.
export function nitrogenCreditKg(fixedN = 0, currentN = 0) {
  return Math.max(0, (Number(fixedN) || 0) - (Number(currentN) || 0)) * N_CREDIT_SHARE;
}

export function nitrogenSavingsMad(fixedN = 0, currentN = 0) {
  return Math.round(nitrogenCreditKg(fixedN, currentN) * N_PRICE_MAD_PER_KG);
}
