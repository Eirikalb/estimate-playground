import type { BenchmarkRun } from "@/domains/schema";

/**
 * Escape a value for CSV
 * - Wrap in quotes if contains comma, quote, or newline
 * - Double any existing quotes
 */
function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }

  const str = String(value);

  // Check if escaping is needed
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert an array of objects to CSV string
 */
function arrayToCSV(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map(row => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Generate summary CSV - one row per scenario with aggregated metrics
 */
export function generateSummaryCSV(run: BenchmarkRun): string {
  const headers = [
    "Scenario ID",
    "Anchor",
    "Deltas",
    "Distractors",
    "Ground Truth",
    "Tolerance",
    "Mean Prediction",
    "Std Deviation",
    "Error",
    "Absolute Error",
    "Within Tolerance",
    "Rollout Consistency",
    "Status",
  ];

  const rows = run.scenarios.map((scenario) => {
    const result = run.results.find((r) => r.scenarioId === scenario.id);

    return [
      scenario.id,
      scenario.anchor.replace(/_/g, " "),
      scenario.appliedDeltas.join("; "),
      scenario.distractors.join("; "),
      scenario.groundTruth.value,
      scenario.groundTruth.tolerance,
      result?.meanPrediction ?? "",
      result?.stdDeviation ?? "",
      result?.error ?? "",
      result?.absoluteError ?? "",
      result?.withinTolerance ?? "",
      result?.rolloutConsistency ?? "",
      result?.status ?? "pending",
    ];
  });

  return arrayToCSV(headers, rows);
}

/**
 * Generate detailed CSV - one row per rollout
 */
export function generateDetailedCSV(run: BenchmarkRun): string {
  const headers = [
    "Scenario ID",
    "Anchor",
    "Deltas",
    "Distractors",
    "Ground Truth",
    "Tolerance",
    "Rollout Index",
    "Prediction",
    "Error",
    "Absolute Error",
    "Within Tolerance",
    "Latency (ms)",
    "Reasoning Preview",
  ];

  const rows: (string | number | boolean | undefined | null)[][] = [];

  for (const scenario of run.scenarios) {
    const result = run.results.find((r) => r.scenarioId === scenario.id);

    if (!result || result.rollouts.length === 0) {
      // Add a row even if no results yet
      rows.push([
        scenario.id,
        scenario.anchor.replace(/_/g, " "),
        scenario.appliedDeltas.join("; "),
        scenario.distractors.join("; "),
        scenario.groundTruth.value,
        scenario.groundTruth.tolerance,
        0,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }

    result.rollouts.forEach((rollout, index) => {
      const error = rollout.prediction - scenario.groundTruth.value;
      const absoluteError = Math.abs(error);
      const withinTolerance = absoluteError <= scenario.groundTruth.tolerance;

      // Truncate reasoning to first 200 chars for preview
      const reasoningPreview = rollout.reasoning
        ? rollout.reasoning.slice(0, 200).replace(/\n/g, " ") + (rollout.reasoning.length > 200 ? "..." : "")
        : "";

      rows.push([
        scenario.id,
        scenario.anchor.replace(/_/g, " "),
        scenario.appliedDeltas.join("; "),
        scenario.distractors.join("; "),
        scenario.groundTruth.value,
        scenario.groundTruth.tolerance,
        index + 1,
        rollout.prediction,
        Math.round(error * 1000) / 1000,
        Math.round(absoluteError * 1000) / 1000,
        withinTolerance,
        rollout.latencyMs,
        reasoningPreview,
      ]);
    });
  }

  return arrayToCSV(headers, rows);
}

/**
 * Generate a filename for the export
 */
export function generateExportFilename(run: BenchmarkRun, format: "summary" | "detailed"): string {
  const date = new Date(run.timestamp).toISOString().split("T")[0];
  const modelShort = run.model.split("/").pop() || run.model;
  const suffix = format === "detailed" ? "-detailed" : "";
  return `benchmark-${run.id.slice(0, 8)}-${modelShort}${suffix}-${date}.csv`;
}
