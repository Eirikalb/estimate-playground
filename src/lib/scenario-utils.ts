/**
 * Scenario Utilities
 *
 * Shared utility functions for working with scenarios.
 * This module contains only pure functions that can be safely
 * imported by both client and server components.
 */

import type { Scenario } from "@/domains/schema";

/**
 * Get twin pairs from a list of scenarios
 */
export function getTwinPairs(
  scenarios: Scenario[]
): Array<{ original: Scenario; twin: Scenario }> {
  const pairs: Array<{ original: Scenario; twin: Scenario }> = [];
  const seen = new Set<string>();

  for (const scenario of scenarios) {
    if (scenario.twinId && !seen.has(scenario.id) && !seen.has(scenario.twinId)) {
      const twin = scenarios.find((s) => s.id === scenario.twinId);
      if (twin) {
        pairs.push({ original: scenario, twin });
        seen.add(scenario.id);
        seen.add(scenario.twinId);
      }
    }
  }

  return pairs;
}
