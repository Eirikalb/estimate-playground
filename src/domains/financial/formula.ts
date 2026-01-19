/**
 * Financial Domain - Growth Rate Formula
 *
 * Implements the formula-based ground truth calculation for revenue growth estimation.
 * This replaces the abstract anchor-delta system with explicit numeric calculations.
 */

import type { ScenarioMetrics, FormulaCoefficients, AnchorMetricRanges } from "../schema";

/**
 * Default formula coefficients for the financial domain
 * These define the exact adjustments for each factor
 */
export const DEFAULT_FORMULA_COEFFICIENTS: FormulaCoefficients = {
  // NRR thresholds and adjustments
  nrr: {
    worldClass: { threshold: 130, adjustment: 15 }, // >= 130%: +15%
    excellent: { threshold: 120, adjustment: 10 }, // >= 120%: +10%
    good: { threshold: 110, adjustment: 5 }, // >= 110%: +5%
    concerning: { threshold: 100, adjustment: -10 }, // < 100%: -10%
    critical: { threshold: 90, adjustment: -20 }, // < 90%: -20%
  },

  // Market adjustments
  marketExpansion: 12, // +12%
  marketContraction: -15, // -15%

  // Sales adjustments
  salesTeamDoubled: 10, // +10%
  salesChallenges: -12, // -12%
  quotaAttainmentThreshold: 50, // Below 50% triggers salesChallenges

  // Macro adjustments
  macroHeadwind: -8, // -8%
  macroTailwind: 6, // +6%

  // Product adjustments
  productLaunch: 8, // +8%
  pricePressure: -6, // -6%
};

/**
 * Base growth rates by anchor type
 * These are the starting points before any adjustments
 */
export const ANCHOR_BASE_RATES: Record<string, number> = {
  // SaaS
  saas_startup_growth: 85,
  saas_scaleup_growth: 55,
  saas_enterprise_growth: 25,

  // E-commerce
  ecommerce_startup: 120,
  ecommerce_scaleup: 45,
  ecommerce_enterprise: 15,

  // Fintech
  fintech_startup: 100,
  fintech_scaleup: 50,
  fintech_enterprise: 20,

  // Healthcare
  healthcare_startup: 70,
  healthcare_scaleup: 35,

  // Manufacturing
  manufacturing_smb: 8,
  manufacturing_enterprise: 4,

  // Retail
  retail_smb: 12,
  retail_enterprise: 5,

  // Consulting
  consulting_smb: 18,
  consulting_enterprise: 8,
};

/**
 * Metric ranges per anchor type
 * Used to generate realistic metrics for each company type
 */
export const ANCHOR_METRIC_RANGES: Record<string, AnchorMetricRanges> = {
  saas_startup_growth: {
    arr: { min: 0.5, max: 5 }, // $0.5M-$5M
    nrr: { min: 90, max: 150 }, // Wide range for startups
    customerCount: { min: 10, max: 100 },
    acv: { min: 5, max: 100 }, // $5K-$100K
    salesCycleMonths: { min: 1, max: 6 },
  },
  saas_scaleup_growth: {
    arr: { min: 5, max: 50 }, // $5M-$50M
    nrr: { min: 85, max: 140 },
    customerCount: { min: 50, max: 500 },
    acv: { min: 20, max: 500 }, // $20K-$500K
    salesCycleMonths: { min: 3, max: 12 },
    quotaAttainment: { min: 30, max: 95 },
  },
  saas_enterprise_growth: {
    arr: { min: 50, max: 500 }, // $50M-$500M
    nrr: { min: 100, max: 130 },
    customerCount: { min: 200, max: 2000 },
    acv: { min: 100, max: 2000 }, // $100K-$2M
    salesCycleMonths: { min: 6, max: 18 },
    quotaAttainment: { min: 50, max: 90 },
  },
  ecommerce_startup: {
    revenue: { min: 1, max: 10 }, // $1M-$10M
    nrr: { min: 80, max: 120 }, // Customer retention
    customerCount: { min: 1000, max: 50000 },
  },
  ecommerce_scaleup: {
    revenue: { min: 10, max: 100 }, // $10M-$100M
    nrr: { min: 85, max: 125 },
    customerCount: { min: 50000, max: 500000 },
  },
  ecommerce_enterprise: {
    revenue: { min: 100, max: 1000 }, // $100M-$1B
    nrr: { min: 90, max: 115 },
    customerCount: { min: 500000, max: 10000000 },
  },
  fintech_startup: {
    arr: { min: 0, max: 5 }, // Pre-revenue to $5M
    nrr: { min: 95, max: 140 },
    customerCount: { min: 100, max: 10000 },
  },
  fintech_scaleup: {
    arr: { min: 20, max: 100 }, // $20M-$100M
    nrr: { min: 100, max: 135 },
    customerCount: { min: 10000, max: 500000 },
    acv: { min: 0.5, max: 10 }, // $500-$10K for consumer, higher for B2B
  },
  fintech_enterprise: {
    arr: { min: 100, max: 500 }, // $100M-$500M
    nrr: { min: 105, max: 130 },
    customerCount: { min: 100000, max: 5000000 },
  },
  healthcare_startup: {
    arr: { min: 0, max: 5 }, // Pre-revenue to $5M
    nrr: { min: 100, max: 150 }, // Usually high for healthcare
    customerCount: { min: 5, max: 50 }, // Pilot customers
    acv: { min: 50, max: 500 }, // $50K-$500K
  },
  healthcare_scaleup: {
    arr: { min: 5, max: 100 }, // $5M-$100M
    nrr: { min: 110, max: 145 },
    customerCount: { min: 50, max: 500 },
    acv: { min: 100, max: 1000 },
  },
  manufacturing_smb: {
    revenue: { min: 5, max: 50 }, // $5M-$50M
    nrr: { min: 95, max: 130 }, // Contract-based, sticky
    customerCount: { min: 20, max: 200 },
  },
  manufacturing_enterprise: {
    revenue: { min: 100, max: 1000 }, // $100M-$1B
    nrr: { min: 98, max: 120 },
    customerCount: { min: 50, max: 500 },
  },
  retail_smb: {
    revenue: { min: 2, max: 50 }, // $2M-$50M
    customerCount: { min: 5000, max: 100000 },
  },
  retail_enterprise: {
    revenue: { min: 100, max: 5000 }, // $100M-$5B
    customerCount: { min: 100000, max: 10000000 },
  },
  consulting_smb: {
    revenue: { min: 2, max: 20 }, // $2M-$20M
    customerCount: { min: 10, max: 100 },
    acv: { min: 50, max: 500 }, // $50K-$500K per engagement
  },
  consulting_enterprise: {
    revenue: { min: 50, max: 500 }, // $50M-$500M
    customerCount: { min: 100, max: 1000 },
    acv: { min: 200, max: 5000 }, // $200K-$5M per engagement
  },
};

/**
 * Calculate the NRR adjustment based on the NRR value
 */
export function calculateNrrAdjustment(
  nrr: number | undefined,
  coefficients: FormulaCoefficients = DEFAULT_FORMULA_COEFFICIENTS
): number {
  if (nrr === undefined || !coefficients.nrr) return 0;

  const { worldClass, excellent, good, concerning, critical } = coefficients.nrr;

  if (nrr >= worldClass.threshold) return worldClass.adjustment;
  if (nrr >= excellent.threshold) return excellent.adjustment;
  if (nrr >= good.threshold) return good.adjustment;
  if (nrr < critical.threshold) return critical.adjustment;
  if (nrr < concerning.threshold) return concerning.adjustment;

  return 0; // NRR between 100-110% is neutral
}

/**
 * Calculate the growth rate from scenario metrics using the formula
 *
 * Formula:
 * growth = baseRate + nrrAdjustment + marketAdjustment + salesAdjustment + macroAdjustment + productAdjustment
 */
export function calculateGrowthRate(
  anchorKey: string,
  metrics: ScenarioMetrics,
  coefficients: FormulaCoefficients = DEFAULT_FORMULA_COEFFICIENTS
): { value: number; calculation: string } {
  const baseRate = ANCHOR_BASE_RATES[anchorKey];
  if (baseRate === undefined) {
    throw new Error(`Unknown anchor: ${anchorKey}`);
  }

  const adjustments: { name: string; value: number }[] = [];
  let total = baseRate;

  // NRR adjustment
  const nrrAdj = calculateNrrAdjustment(metrics.nrr, coefficients);
  if (nrrAdj !== 0) {
    adjustments.push({
      name: `NRR ${metrics.nrr}% adjustment`,
      value: nrrAdj,
    });
    total += nrrAdj;
  }

  // Market expansion
  if (metrics.marketExpansion && coefficients.marketExpansion) {
    adjustments.push({
      name: "Market expansion",
      value: coefficients.marketExpansion,
    });
    total += coefficients.marketExpansion;
  }

  // Market contraction
  if (metrics.marketContraction && coefficients.marketContraction) {
    adjustments.push({
      name: "Market contraction",
      value: coefficients.marketContraction,
    });
    total += coefficients.marketContraction;
  }

  // Sales team growth
  if (metrics.salesTeamGrowth && metrics.salesTeamGrowth >= 100 && coefficients.salesTeamDoubled) {
    adjustments.push({
      name: "Sales team doubled",
      value: coefficients.salesTeamDoubled,
    });
    total += coefficients.salesTeamDoubled;
  }

  // Sales challenges (low quota attainment)
  if (
    metrics.quotaAttainment !== undefined &&
    coefficients.quotaAttainmentThreshold &&
    metrics.quotaAttainment < coefficients.quotaAttainmentThreshold &&
    coefficients.salesChallenges
  ) {
    adjustments.push({
      name: `Sales challenges (${metrics.quotaAttainment}% quota attainment)`,
      value: coefficients.salesChallenges,
    });
    total += coefficients.salesChallenges;
  }

  // Macro environment
  if (metrics.macroEnvironment === "headwind" && coefficients.macroHeadwind) {
    adjustments.push({
      name: "Macro headwind",
      value: coefficients.macroHeadwind,
    });
    total += coefficients.macroHeadwind;
  }
  if (metrics.macroEnvironment === "tailwind" && coefficients.macroTailwind) {
    adjustments.push({
      name: "Macro tailwind",
      value: coefficients.macroTailwind,
    });
    total += coefficients.macroTailwind;
  }

  // Product launch
  if (metrics.productLaunchImminent && coefficients.productLaunch) {
    adjustments.push({
      name: "Product launch imminent",
      value: coefficients.productLaunch,
    });
    total += coefficients.productLaunch;
  }

  // Price pressure
  if (metrics.pricePressure && coefficients.pricePressure) {
    adjustments.push({
      name: "Price pressure",
      value: coefficients.pricePressure,
    });
    total += coefficients.pricePressure;
  }

  // Build calculation string
  const calcParts = [`Base (${anchorKey}): ${baseRate}%`];
  for (const adj of adjustments) {
    const sign = adj.value >= 0 ? "+" : "";
    calcParts.push(`${adj.name}: ${sign}${adj.value}%`);
  }
  calcParts.push(`Final: ${total.toFixed(2)}%`);

  return {
    value: total,
    calculation: calcParts.join("\n"),
  };
}

/**
 * Generate random metrics for an anchor type within defined ranges
 */
export function generateMetricsForAnchor(
  anchorKey: string,
  random: () => number = Math.random
): ScenarioMetrics {
  const ranges = ANCHOR_METRIC_RANGES[anchorKey];
  if (!ranges) {
    return {}; // No ranges defined, return empty metrics
  }

  const metrics: ScenarioMetrics = {};

  // Helper to generate value within range
  const inRange = (range: { min: number; max: number } | undefined): number | undefined => {
    if (!range) return undefined;
    return range.min + random() * (range.max - range.min);
  };

  // Generate metrics from ranges
  if (ranges.arr) {
    metrics.arr = Math.round(inRange(ranges.arr)! * 10) / 10; // Round to 1 decimal
  }
  if (ranges.revenue) {
    metrics.revenue = Math.round(inRange(ranges.revenue)! * 10) / 10;
  }
  if (ranges.nrr) {
    metrics.nrr = Math.round(inRange(ranges.nrr)!); // Round to integer
  }
  if (ranges.grossRetention) {
    metrics.grossRetention = Math.round(inRange(ranges.grossRetention)!);
  }
  if (ranges.customerCount) {
    metrics.customerCount = Math.round(inRange(ranges.customerCount)!);
  }
  if (ranges.acv) {
    metrics.acv = Math.round(inRange(ranges.acv)!);
  }
  if (ranges.salesCycleMonths) {
    metrics.salesCycleMonths = Math.round(inRange(ranges.salesCycleMonths)!);
  }
  if (ranges.quotaAttainment) {
    metrics.quotaAttainment = Math.round(inRange(ranges.quotaAttainment)!);
  }
  if (ranges.industryGrowth) {
    metrics.industryGrowth = Math.round(inRange(ranges.industryGrowth)! * 10) / 10;
  }

  return metrics;
}

/**
 * Apply delta modifiers to metrics
 * This translates abstract delta names to concrete metric changes
 */
export function applyDeltasToMetrics(
  metrics: ScenarioMetrics,
  deltaKeys: string[],
  anchorKey: string
): ScenarioMetrics {
  const result = { ...metrics };
  const ranges = ANCHOR_METRIC_RANGES[anchorKey];

  for (const deltaKey of deltaKeys) {
    switch (deltaKey) {
      case "strong_nrr":
        // Set NRR to world-class range (130-150%)
        result.nrr = 130 + Math.random() * 20;
        result.nrr = Math.round(result.nrr);
        break;

      case "weak_nrr":
        // Set NRR to critical range (75-89%)
        result.nrr = 75 + Math.random() * 14;
        result.nrr = Math.round(result.nrr);
        break;

      case "market_expansion":
        result.marketExpansion = true;
        break;

      case "market_contraction":
        result.marketContraction = true;
        break;

      case "strong_sales_team":
        result.salesTeamGrowth = 100 + Math.random() * 100; // 100-200% growth
        result.salesTeamGrowth = Math.round(result.salesTeamGrowth);
        break;

      case "sales_challenges":
        // Set quota attainment below threshold
        result.quotaAttainment = 20 + Math.random() * 25; // 20-45%
        result.quotaAttainment = Math.round(result.quotaAttainment);
        break;

      case "product_innovation":
        result.productLaunchImminent = true;
        break;

      case "product_stagnation":
        result.productLaunchImminent = false;
        break;

      case "economic_tailwind":
        result.macroEnvironment = "tailwind";
        break;

      case "economic_headwind":
        result.macroEnvironment = "headwind";
        break;

      case "price_increase":
        result.pricePressure = false;
        break;

      case "price_pressure":
        result.pricePressure = true;
        break;
    }
  }

  return result;
}

/**
 * Format metrics for display in narrative prompt
 */
export function formatMetricsForPrompt(metrics: ScenarioMetrics): string {
  const lines: string[] = [];

  if (metrics.arr !== undefined) {
    lines.push(`- Annual Recurring Revenue (ARR): $${metrics.arr}M`);
  }
  if (metrics.revenue !== undefined) {
    lines.push(`- Annual Revenue: $${metrics.revenue}M`);
  }
  if (metrics.nrr !== undefined) {
    lines.push(`- Net Revenue Retention (NRR): ${metrics.nrr}%`);
  }
  if (metrics.grossRetention !== undefined) {
    lines.push(`- Gross Retention: ${metrics.grossRetention}%`);
  }
  if (metrics.customerCount !== undefined) {
    lines.push(`- Customer Count: ${metrics.customerCount.toLocaleString()}`);
  }
  if (metrics.acv !== undefined) {
    lines.push(`- Average Contract Value (ACV): $${metrics.acv}K`);
  }
  if (metrics.salesCycleMonths !== undefined) {
    lines.push(`- Sales Cycle: ${metrics.salesCycleMonths} months`);
  }
  if (metrics.quotaAttainment !== undefined) {
    lines.push(`- Sales Quota Attainment: ${metrics.quotaAttainment}%`);
  }
  if (metrics.salesTeamGrowth !== undefined) {
    lines.push(`- Sales Team Growth (YoY): ${metrics.salesTeamGrowth}%`);
  }
  if (metrics.marketExpansion) {
    lines.push(`- Currently expanding into new geographic markets`);
  }
  if (metrics.marketContraction) {
    lines.push(`- Recently exited or consolidated geographic markets`);
  }
  if (metrics.macroEnvironment === "headwind") {
    lines.push(`- Industry facing macroeconomic pressure`);
  }
  if (metrics.macroEnvironment === "tailwind") {
    lines.push(`- Industry benefiting from macroeconomic tailwinds`);
  }
  if (metrics.productLaunchImminent) {
    lines.push(`- Major product launch or platform expansion imminent`);
  }
  if (metrics.pricePressure) {
    lines.push(`- Facing pricing pressure from competition`);
  }

  return lines.join("\n");
}
