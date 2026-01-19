"use client";

import { useEffect, useState, use, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  ScatterChart,
  Scatter,
  ComposedChart,
  Line,
} from "recharts";
import type { BenchmarkRun, Scenario, ScenarioResult, DomainConfig } from "@/domains/schema";
import { calculateScenarioDifficulty } from "@/lib/evaluator";
import { formatCostCompact } from "@/lib/pricing";

// Helper to format duration
function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const durationMs = end - start;
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
}

// Helper function to generate Gaussian curve data
function generateGaussianData(
  mean: number,
  stdDev: number,
  min: number,
  max: number,
  points: number = 100
): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = [];
  const step = (max - min) / points;
  
  // If stdDev is 0 or very small, create a spike at the mean
  if (stdDev < 0.001) {
    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      const y = Math.abs(x - mean) < step ? 1 : 0;
      data.push({ x: Number(x.toFixed(3)), y });
    }
  } else {
    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
        Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      data.push({ x: Number(x.toFixed(3)), y });
    }
  }
  
  // Normalize to max height of 1
  const maxY = Math.max(...data.map(d => d.y));
  if (maxY > 0) {
    return data.map(d => ({ x: d.x, y: d.y / maxY }));
  }
  return data;
}

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<{
    scenario: Scenario;
    result: ScenarioResult;
  } | null>(null);

  const fetchRun = useCallback(() => {
    fetch(`/api/runs/${resolvedParams.id}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.error) {
          router.push("/");
        } else {
          setRun(data);
          // Fetch domain config for difficulty calculations
          if (data.domainId && !domainConfig) {
            try {
              const domainRes = await fetch(`/api/domains?id=${encodeURIComponent(data.domainId)}`);
              if (domainRes.ok) {
                const { config } = await domainRes.json();
                if (config) setDomainConfig(config);
              }
            } catch (e) {
              console.error("Failed to load domain config:", e);
            }
          }
          // Update selected scenario if it exists
          if (selectedScenario) {
            const updatedResult = data.results.find(
              (r: ScenarioResult) => r.scenarioId === selectedScenario.scenario.id
            );
            if (updatedResult) {
              setSelectedScenario({
                scenario: selectedScenario.scenario,
                result: updatedResult,
              });
            }
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/");
      });
  }, [resolvedParams.id, router, selectedScenario, domainConfig]);

  // Initial fetch
  useEffect(() => {
    fetchRun();
  }, [resolvedParams.id]); // Only depend on id for initial fetch

  // Auto-refresh while run is in progress (either generating narratives or running)
  useEffect(() => {
    if (!run || (run.status !== "running" && run.status !== "generating_narratives")) return;

    const intervalId = setInterval(fetchRun, 1000);
    return () => clearInterval(intervalId);
  }, [run?.status, fetchRun]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this run?")) return;

    await fetch(`/api/runs/${resolvedParams.id}`, { method: "DELETE" });
    router.push("/");
  };

  // Generate distribution chart data for selected scenario
  const distributionData = useMemo(() => {
    if (!selectedScenario || selectedScenario.result.rollouts.length < 1) {
      return { gaussian: [], predictions: [], groundTruth: 0, mean: 0 };
    }
    
    const predictions = selectedScenario.result.rollouts.map(r => r.prediction);
    const groundTruth = selectedScenario.scenario.groundTruth.value;
    const mean = selectedScenario.result.meanPrediction;
    const stdDev = selectedScenario.result.stdDeviation;
    
    // Calculate range for the chart
    const allValues = [...predictions, groundTruth, mean];
    const minVal = Math.min(...allValues) - 0.5;
    const maxVal = Math.max(...allValues) + 0.5;
    
    // Generate Gaussian curve
    const gaussian = generateGaussianData(mean, stdDev || 0.1, minVal, maxVal, 80);
    
    // Count predictions at each value for the scatter plot
    const predictionCounts: Record<string, number> = {};
    predictions.forEach(p => {
      const key = p.toFixed(2);
      predictionCounts[key] = (predictionCounts[key] || 0) + 1;
    });
    
    // Create scatter data with y-offset for stacking
    const predictionData: { x: number; y: number; label: string }[] = [];
    const processedCounts: Record<string, number> = {};
    
    predictions.forEach((p) => {
      const key = p.toFixed(2);
      const currentIndex = processedCounts[key] || 0;
      processedCounts[key] = currentIndex + 1;
      
      // Stack dots vertically - base at 0.08, increment by 0.12 for each stacked dot
      predictionData.push({
        x: Number(key),
        y: 0.08 + currentIndex * 0.12,
        label: `${p.toFixed(2)}%`,
      });
    });
    
    return { gaussian, predictions: predictionData, groundTruth, mean, minVal, maxVal };
  }, [selectedScenario]);

  if (loading) {
    return (
      <div className="container max-w-screen-2xl py-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container max-w-screen-2xl py-6">
        <div className="text-muted-foreground">Run not found</div>
      </div>
    );
  }

  const getErrorColor = (error: number) => {
    const absError = Math.abs(error);
    if (absError <= 0.15) return "text-emerald-400";
    if (absError <= 0.35) return "text-amber-400";
    return "text-red-400";
  };

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 80) return "text-emerald-400";
    if (hitRate >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getConsistencyColor = (std: number) => {
    if (std <= 0.1) return "text-emerald-400";
    if (std <= 0.25) return "text-amber-400";
    return "text-red-400";
  };

  const getDifficultyColor = (score: number) => {
    if (score < 30) return "text-emerald-400";
    if (score < 60) return "text-amber-400";
    return "text-red-400";
  };

  // Check if this run has multiple rollouts
  const hasMultipleRollouts = run.rolloutsPerScenario > 1 || 
    run.results.some(r => r.rollouts && r.rollouts.length > 1);

  // Group scenarios with their results
  const scenarioResults = run.scenarios.map((scenario) => ({
    scenario,
    result: run.results.find((r) => r.scenarioId === scenario.id)!,
  }));

  // Calculate progress
  const completedScenarios = run.results.filter(
    (r) => r.status === "completed" || r.status === "failed"
  ).length;
  const totalScenarios = run.scenarios.length;
  const progressPct = totalScenarios > 0 ? (completedScenarios / totalScenarios) * 100 : 0;

  // Get status badge styling
  const getStatusBadge = () => {
    switch (run.status) {
      case "generating_narratives":
        return (
          <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse">
            <span className="mr-1.5">●</span>
            Generating Narratives ({run.narrativesGenerated || 0}/{run.narrativesTotal || totalScenarios})
          </Badge>
        );
      case "running":
        return (
          <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse">
            <span className="mr-1.5">●</span>
            Running ({completedScenarios}/{totalScenarios})
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-500/40">
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-screen-2xl py-6">
      {/* Header - More Compact */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-7 px-2">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Run Details</h1>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="font-mono text-xs">
              {run.model.split("/").pop()}
            </Badge>
            <span>•</span>
            <span className="capitalize">{run.promptStrategy.replace(/-/g, " ")}</span>
            {hasMultipleRollouts && (
              <>
                <span>•</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {run.rolloutsPerScenario}x rollouts
                </Badge>
              </>
            )}
            <span>•</span>
            <span>
              {new Date(run.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {run.startedAt && (
              <>
                <span>•</span>
                <span className="font-mono text-xs">
                  ⏱ {formatDuration(run.startedAt, run.completedAt)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                Export ↓
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/api/runs/${resolvedParams.id}/export?format=csv`;
                }}
              >
                Export Summary CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/api/runs/${resolvedParams.id}/export?format=csv&detailed=true`;
                }}
              >
                Export Detailed CSV (All Rollouts)
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Export PDF Report (Coming Soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive" size="sm" className="h-7" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Progress Bar for Running Runs */}
      {run.status === "generating_narratives" && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Generating property narratives with {run.narrativeModel || "LLM"}...</span>
            <span>{run.narrativesGenerated || 0} / {run.narrativesTotal || totalScenarios}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${((run.narrativesGenerated || 0) / (run.narrativesTotal || totalScenarios)) * 100}%` }}
            />
          </div>
        </div>
      )}
      {run.status === "running" && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Running evaluations...</span>
            <span>{completedScenarios} / {totalScenarios}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics Summary - Compact Version */}
      {run.aggregateMetrics ? (
        <div className={`grid gap-2 mb-4 ${hasMultipleRollouts ? "grid-cols-9" : "grid-cols-6"}`}>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">Hit Rate</div>
            <div className={`text-lg font-mono font-bold ${getHitRateColor(run.aggregateMetrics.hitRate)}`}>
              {run.aggregateMetrics.hitRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">RMSE</div>
            <div className="text-lg font-mono font-bold">
              {run.aggregateMetrics.rmse.toFixed(3)}
            </div>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">Mean Error</div>
            <div className="text-lg font-mono font-bold">
              {run.aggregateMetrics.meanError > 0 ? "+" : ""}
              {run.aggregateMetrics.meanError.toFixed(3)}
            </div>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">Directional</div>
            <div className="text-lg font-mono font-bold">
              {run.aggregateMetrics.directionalAccuracy !== undefined
                ? `${run.aggregateMetrics.directionalAccuracy.toFixed(0)}%`
                : "—"}
            </div>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className="text-lg font-mono font-bold">
              {run.aggregateMetrics.avgLatencyMs}ms
            </div>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2">
            <div className="text-xs text-muted-foreground">Cost</div>
            <div className="text-lg font-mono font-bold">
              {run.aggregateMetrics.totalCost !== undefined
                ? formatCostCompact(run.aggregateMetrics.totalCost)
                : "—"}
            </div>
          </div>
          {hasMultipleRollouts && (
            <>
              <div className="bg-card border rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Avg σ</div>
                <div className={`text-lg font-mono font-bold ${getConsistencyColor(run.aggregateMetrics.avgStdDeviation || 0)}`}>
                  {run.aggregateMetrics.avgStdDeviation?.toFixed(3) || "—"}
                </div>
              </div>
              <div className="bg-card border rounded-lg px-3 py-2">
                <div className="text-xs text-muted-foreground">Consistency</div>
                <div className="text-lg font-mono font-bold">
                  {run.aggregateMetrics.avgConsistency?.toFixed(0) || "—"}%
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mb-4 text-sm text-muted-foreground italic">
          Metrics will appear when the run completes...
        </div>
      )}

      {/* Main Content with Resizable Panels */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-[600px] rounded-lg border">
        {/* Scenarios Panel */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full flex flex-col">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="font-semibold">Scenarios ({run.scenarios.length})</h3>
              <p className="text-xs text-muted-foreground">Click a row to see details</p>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead className="w-[140px]">Anchor</TableHead>
                    <TableHead>Deltas</TableHead>
                    <TableHead className="w-[50px]">Diff.</TableHead>
                    <TableHead className="w-[70px]">Truth</TableHead>
                    <TableHead className="w-[70px]">{hasMultipleRollouts ? "Mean" : "Pred"}</TableHead>
                    {hasMultipleRollouts && <TableHead className="w-[60px]">σ</TableHead>}
                    <TableHead className="w-[70px]">Error</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarioResults.map(({ scenario, result }) => {
                    const isPending = result.status === "pending";
                    const isRunning = result.status === "running";
                    const isFailed = result.status === "failed";
                    
                    return (
                      <TableRow
                        key={scenario.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedScenario?.scenario.id === scenario.id ? "bg-muted" : ""
                        } ${isPending ? "opacity-40" : ""} ${isRunning ? "bg-amber-500/5" : ""}`}
                        onClick={() => setSelectedScenario({ scenario, result })}
                      >
                        <TableCell className="text-center">
                          {isPending && <span className="text-muted-foreground text-xs">○</span>}
                          {isRunning && <span className="text-amber-400 animate-pulse">●</span>}
                          {result.status === "completed" && <span className="text-emerald-400">●</span>}
                          {isFailed && <span className="text-red-400">●</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {scenario.anchor.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {scenario.appliedDeltas.slice(0, 2).map((d) => (
                              <Badge key={d} variant="outline" className="text-[10px] px-1 py-0">
                                {d.replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {scenario.appliedDeltas.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                +{scenario.appliedDeltas.length - 2}
                              </Badge>
                            )}
                            {scenario.distractors.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                🎭
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`font-mono text-xs ${getDifficultyColor(calculateScenarioDifficulty(scenario, domainConfig ?? undefined).score)}`}>
                          {calculateScenarioDifficulty(scenario, domainConfig ?? undefined).score}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {scenario.groundTruth.value.toFixed(2)}%
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {isPending || isRunning ? "—" : `${result.meanPrediction.toFixed(2)}%`}
                        </TableCell>
                        {hasMultipleRollouts && (
                          <TableCell className={`font-mono text-xs ${!isPending && !isRunning ? getConsistencyColor(result.stdDeviation) : ""}`}>
                            {isPending || isRunning ? "—" : result.stdDeviation.toFixed(3)}
                          </TableCell>
                        )}
                        <TableCell className={`font-mono text-xs ${!isPending && !isRunning ? getErrorColor(result.error) : ""}`}>
                          {isPending || isRunning ? "—" : `${result.error > 0 ? "+" : ""}${result.error.toFixed(3)}`}
                        </TableCell>
                        <TableCell>
                          {isPending && <span className="text-muted-foreground">—</span>}
                          {isRunning && <span className="text-amber-400 animate-pulse">⋯</span>}
                          {result.status === "completed" && result.withinTolerance && (
                            <span className="text-emerald-400">✓</span>
                          )}
                          {result.status === "completed" && !result.withinTolerance && (
                            <span className="text-red-400">✗</span>
                          )}
                          {isFailed && <span className="text-red-400">!</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Detail Panel */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full overflow-auto">
            {selectedScenario ? (
              <div className="p-4 space-y-4">
                {/* 1. Distribution Graph */}
                {selectedScenario.result.rollouts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Prediction Distribution</h4>
                      <span className="text-xs text-muted-foreground">
                        {selectedScenario.result.rollouts.length} predictions
                      </span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height={160}>
                        <ComposedChart
                          data={distributionData.gaussian}
                          margin={{ top: 20, right: 30, left: 30, bottom: 25 }}
                        >
                          <XAxis 
                            dataKey="x" 
                            type="number"
                            domain={[distributionData.minVal || 'auto', distributionData.maxVal || 'auto']}
                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            axisLine={{ stroke: '#52525b' }}
                            tickLine={{ stroke: '#52525b' }}
                          />
                          <YAxis hide domain={[0, 1.3]} />
                          
                          {/* Gaussian curve - subtle fill */}
                          <Area
                            type="monotone"
                            dataKey="y"
                            stroke="#71717a"
                            strokeWidth={1.5}
                            fill="#3f3f46"
                            fillOpacity={0.6}
                          />
                          
                          {/* Tolerance range shading */}
                          <ReferenceLine
                            x={selectedScenario.scenario.groundTruth.value - selectedScenario.scenario.groundTruth.tolerance}
                            stroke="#22c55e"
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            strokeDasharray="2 2"
                          />
                          <ReferenceLine
                            x={selectedScenario.scenario.groundTruth.value + selectedScenario.scenario.groundTruth.tolerance}
                            stroke="#22c55e"
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            strokeDasharray="2 2"
                          />
                          
                          {/* Ground truth line */}
                          <ReferenceLine
                            x={distributionData.groundTruth}
                            stroke="#22c55e"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            label={{
                              value: "Target",
                              position: "top",
                              fontSize: 10,
                              fill: "#22c55e",
                              offset: 5,
                            }}
                          />
                          
                          {/* Mean line */}
                          <ReferenceLine
                            x={distributionData.mean}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            label={{
                              value: "Mean",
                              position: "top",
                              fontSize: 10,
                              fill: "#f59e0b",
                              offset: 5,
                            }}
                          />
                          
                          {/* Individual predictions as scatter points - stacked */}
                          <Scatter
                            data={distributionData.predictions}
                            dataKey="y"
                            fill="#818cf8"
                            stroke="#4f46e5"
                            strokeWidth={1.5}
                            shape={(props: unknown) => {
                              const p = props as { cx: number; cy: number };
                              return (
                                <circle
                                  cx={p.cx}
                                  cy={p.cy}
                                  r={7}
                                  fill="#818cf8"
                                  stroke="#4f46e5"
                                  strokeWidth={2}
                                />
                              );
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      
                      {/* Legend */}
                      <div className="flex items-center justify-center gap-6 text-xs mt-2 pt-2 border-t border-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-0.5 bg-emerald-500 border-dashed" />
                          <span className="text-zinc-400">Target ({distributionData.groundTruth.toFixed(2)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-0.5 bg-amber-500" />
                          <span className="text-zinc-400">Mean ({distributionData.mean.toFixed(2)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-600" />
                          <span className="text-zinc-400">Predictions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status and timing for pending/running scenarios */}
                {(selectedScenario.result.status === "pending" || selectedScenario.result.status === "running") && (
                  <div className={`p-3 rounded-lg border ${
                    selectedScenario.result.status === "running" 
                      ? "bg-amber-500/10 border-amber-500/30" 
                      : "bg-muted/30 border-muted"
                  }`}>
                    <div className="flex items-center gap-2">
                      {selectedScenario.result.status === "running" ? (
                        <>
                          <span className="text-amber-400 animate-pulse">●</span>
                          <span className="text-sm font-medium text-amber-400">Running...</span>
                          {selectedScenario.result.startedAt && (
                            <span className="text-xs text-muted-foreground ml-auto font-mono">
                              {formatDuration(selectedScenario.result.startedAt)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground">○</span>
                          <span className="text-sm text-muted-foreground">Waiting...</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Stats Numbers - only show when completed */}
                {selectedScenario.result.status === "completed" && (
                  <div className={`grid gap-2 ${hasMultipleRollouts && selectedScenario.result.rollouts.length > 1 ? "grid-cols-6" : "grid-cols-5"}`}>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-center">
                      <div className="text-[10px] text-emerald-400">Target</div>
                      <div className="font-mono text-sm font-bold text-emerald-400">
                        {selectedScenario.scenario.groundTruth.value.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-center">
                      <div className="text-[10px] text-amber-400">Mean</div>
                      <div className="font-mono text-sm font-bold text-amber-400">
                        {selectedScenario.result.meanPrediction.toFixed(2)}%
                      </div>
                    </div>
                    <div className={`p-2 rounded text-center ${
                      selectedScenario.result.withinTolerance
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    }`}>
                      <div className="text-[10px] text-muted-foreground">Error</div>
                      <div className={`font-mono text-sm font-bold ${getErrorColor(selectedScenario.result.error)}`}>
                        {selectedScenario.result.error > 0 ? "+" : ""}{selectedScenario.result.error.toFixed(3)}%
                      </div>
                    </div>
                    {hasMultipleRollouts && selectedScenario.result.rollouts.length > 1 && (
                      <>
                        <div className="bg-muted/50 p-2 rounded text-center">
                          <div className="text-[10px] text-muted-foreground">σ</div>
                          <div className={`font-mono text-sm font-bold ${getConsistencyColor(selectedScenario.result.stdDeviation)}`}>
                            {selectedScenario.result.stdDeviation.toFixed(3)}
                          </div>
                        </div>
                        <div className="bg-muted/50 p-2 rounded text-center">
                          <div className="text-[10px] text-muted-foreground">In Tol.</div>
                          <div className="font-mono text-sm font-bold">
                            {selectedScenario.result.rolloutConsistency.toFixed(0)}%
                          </div>
                        </div>
                      </>
                    )}
                    {(!hasMultipleRollouts || selectedScenario.result.rollouts.length <= 1) && (
                      <>
                        <div className="bg-muted/50 p-2 rounded text-center">
                          <div className="text-[10px] text-muted-foreground">Tolerance</div>
                          <div className="font-mono text-sm">
                            ±{selectedScenario.scenario.groundTruth.tolerance}%
                          </div>
                        </div>
                        <div className="bg-muted/50 p-2 rounded text-center">
                          <div className="text-[10px] text-muted-foreground">Latency</div>
                          <div className="font-mono text-sm">
                            {selectedScenario.result.rollouts[0]?.latencyMs || 0}ms
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Timing info */}
                {selectedScenario.result.startedAt && selectedScenario.result.completedAt && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Duration: {formatDuration(selectedScenario.result.startedAt, selectedScenario.result.completedAt)}
                  </div>
                )}

                {/* 3. Collapsible Rollouts - only show when there are results */}
                {selectedScenario.result.rollouts.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    Reasoning Traces ({selectedScenario.result.rollouts.length})
                  </h4>
                  <Accordion type="single" collapsible className="space-y-1">
                    {selectedScenario.result.rollouts.map((rollout, i) => {
                      const error = rollout.prediction - selectedScenario.scenario.groundTruth.value;
                      const withinTol = Math.abs(error) <= selectedScenario.scenario.groundTruth.tolerance;
                      
                      return (
                        <AccordionItem 
                          key={i} 
                          value={`rollout-${i}`}
                          className="border rounded-lg bg-muted/20 px-3"
                        >
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                                <span className={`font-mono text-sm font-bold ${getErrorColor(error)}`}>
                                  {rollout.prediction.toFixed(2)}%
                                </span>
                                <span className={`text-xs ${withinTol ? "text-emerald-400" : "text-red-400"}`}>
                                  ({error > 0 ? "+" : ""}{error.toFixed(3)}%)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {rollout.latencyMs}ms
                                </span>
                                {withinTol ? (
                                  <span className="text-emerald-400 text-xs">✓</span>
                                ) : (
                                  <span className="text-red-400 text-xs">✗</span>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="text-sm leading-relaxed text-muted-foreground bg-background/50 p-3 rounded">
                              {rollout.reasoning || "No reasoning provided"}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
                )}

                {/* Collapsible Rendered Prompt */}
                {selectedScenario.result.renderedPrompt && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <span className="transition-transform group-open:rotate-90">▶</span>
                      Prompt Sent to Model
                    </summary>
                    <pre className="mt-2 bg-muted/30 p-3 rounded text-xs whitespace-pre-wrap font-mono max-h-[300px] overflow-auto border">
                      {selectedScenario.result.renderedPrompt}
                    </pre>
                  </details>
                )}

                <Separator />

                {/* 4. Property Context and Ground Truth Calculation */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">Property Context</h4>
                    <pre className="bg-muted/30 p-2 rounded text-xs whitespace-pre-wrap font-mono">
                      {selectedScenario.scenario.contextDescription}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">Ground Truth Calculation</h4>
                    <pre className="bg-muted/30 p-2 rounded text-xs whitespace-pre-wrap font-mono">
                      {selectedScenario.scenario.groundTruth.calculation}
                    </pre>
                  </div>

                  {/* Twin Info */}
                  {selectedScenario.scenario.twinId && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                      <div className="text-xs font-medium text-blue-400">Twin Scenario</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Delta changed: <span className="font-mono">{selectedScenario.scenario.twinDeltaChanged}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a scenario to view details
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Prompt Template - Collapsible */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          View Prompt Template Used
        </summary>
        <pre className="mt-2 bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono max-h-[200px] overflow-auto">
          {run.promptTemplate}
        </pre>
      </details>
    </div>
  );
}
