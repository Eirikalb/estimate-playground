"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import type { BenchmarkRun, Scenario, ScenarioResult, DomainConfig } from "@/domains/schema";
import {
  calculateScenarioDifficulty,
  detectErrorPattern,
  analyzeErrorPatterns,
  calculateDifficultyMetrics,
} from "@/lib/evaluator";

export default function Analysis() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/runs").then((res) => res.json()),
      fetch("/api/domains").then((res) => res.json()),
    ])
      .then(([runsData, domainsData]) => {
        setRuns(runsData);
        setDomains(domainsData);
        // Select most recent completed run by default
        const completedRuns = runsData.filter((r: BenchmarkRun) => r.status === "completed");
        if (completedRuns.length > 0) {
          setSelectedRunId(completedRuns[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId),
    [runs, selectedRunId]
  );

  const domainConfig = useMemo(
    () => domains.find((d) => d.id === selectedRun?.domainId),
    [domains, selectedRun]
  );

  // Calculate analysis data for selected run
  const analysisData = useMemo(() => {
    if (!selectedRun || !selectedRun.aggregateMetrics) return null;

    const completedResults = selectedRun.results.filter((r) => r.status === "completed");
    if (completedResults.length === 0) return null;

    // Get difficulty for each scenario
    const scenarioDifficulties = selectedRun.scenarios.map((scenario) => {
      const result = completedResults.find((r) => r.scenarioId === scenario.id);
      const difficulty = calculateScenarioDifficulty(scenario, domainConfig);
      const errorPattern = result ? detectErrorPattern(scenario, result, domainConfig) : null;
      return {
        scenario,
        result,
        difficulty,
        errorPattern,
      };
    });

    // Calculate error patterns summary
    const errorPatternSummary = analyzeErrorPatterns(
      selectedRun.scenarios,
      completedResults,
      domainConfig
    );

    // Calculate difficulty metrics
    const difficultyMetrics = calculateDifficultyMetrics(selectedRun.scenarios, domainConfig);

    // Group by anchor for anchor bias analysis
    const byAnchor: Record<string, { errors: number[]; predictions: number[]; count: number }> = {};
    for (const { scenario, result } of scenarioDifficulties) {
      if (!result) continue;
      if (!byAnchor[scenario.anchor]) {
        byAnchor[scenario.anchor] = { errors: [], predictions: [], count: 0 };
      }
      byAnchor[scenario.anchor].errors.push(result.error);
      byAnchor[scenario.anchor].predictions.push(result.meanPrediction);
      byAnchor[scenario.anchor].count++;
    }

    const anchorBiasData = Object.entries(byAnchor).map(([anchor, data]) => ({
      anchor: anchor.replace(/_/g, " "),
      avgError: data.errors.reduce((s, e) => s + e, 0) / data.errors.length,
      count: data.count,
    }));

    // Scatter plot: difficulty vs error
    const difficultyVsError = scenarioDifficulties
      .filter((s) => s.result)
      .map((s) => ({
        difficulty: s.difficulty.score,
        error: s.result!.absoluteError,
        anchor: s.scenario.anchor.replace(/_/g, " "),
        withinTolerance: s.result!.withinTolerance,
      }));

    // Error category breakdown
    const errorCategories = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };
    for (const result of completedResults) {
      const absError = result.absoluteError;
      if (absError <= 0.15) errorCategories.excellent++;
      else if (absError <= 0.35) errorCategories.good++;
      else if (absError <= 0.75) errorCategories.fair++;
      else errorCategories.poor++;
    }

    const errorCategoryData = [
      { name: "Excellent", value: errorCategories.excellent, color: "#22c55e" },
      { name: "Good", value: errorCategories.good, color: "#84cc16" },
      { name: "Fair", value: errorCategories.fair, color: "#f59e0b" },
      { name: "Poor", value: errorCategories.poor, color: "#ef4444" },
    ];

    // Error pattern type breakdown
    const patternCounts: Record<string, number> = {};
    for (const { errorPattern } of scenarioDifficulties) {
      if (errorPattern) {
        patternCounts[errorPattern.pattern] = (patternCounts[errorPattern.pattern] || 0) + 1;
      }
    }

    const patternData = Object.entries(patternCounts).map(([pattern, count]) => ({
      pattern: pattern.replace(/_/g, " "),
      count,
      percentage: Math.round((count / completedResults.length) * 100),
    }));

    return {
      scenarioDifficulties,
      errorPatternSummary,
      difficultyMetrics,
      anchorBiasData,
      difficultyVsError,
      errorCategoryData,
      patternData,
      totalScenarios: completedResults.length,
    };
  }, [selectedRun, domainConfig]);

  if (loading) {
    return (
      <div className="container max-w-screen-2xl py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const completedRuns = runs.filter((r) => r.status === "completed" && r.aggregateMetrics);

  if (completedRuns.length === 0) {
    return (
      <div className="container max-w-screen-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Analyze error patterns and scenario difficulty
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No completed runs to analyze yet. Create some benchmark runs first.
          </CardContent>
        </Card>
      </div>
    );
  }

  const getBiasColor = (bias: string) => {
    if (bias === "overestimate") return "text-red-400";
    if (bias === "underestimate") return "text-blue-400";
    return "text-emerald-400";
  };

  const getDifficultyColor = (level: string) => {
    if (level === "trivial" || level === "easy") return "text-emerald-400";
    if (level === "moderate") return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="container max-w-screen-2xl py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Analyze error patterns, scenario difficulty, and systematic biases
          </p>
        </div>
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-[350px]">
            <SelectValue placeholder="Select a run to analyze" />
          </SelectTrigger>
          <SelectContent>
            {completedRuns.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {run.model.split("/").pop()}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="capitalize text-xs">
                    {run.promptStrategy.replace(/-/g, " ")}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-emerald-400 font-mono text-xs">
                    {run.aggregateMetrics?.hitRate.toFixed(0)}%
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRun && analysisData && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Systematic Bias</CardDescription>
                <CardTitle className={`text-2xl capitalize ${getBiasColor(analysisData.errorPatternSummary.systematicBias ?? "neutral")}`}>
                  {analysisData.errorPatternSummary.systematicBias ?? "neutral"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Strength: {analysisData.errorPatternSummary.biasStrength}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Difficulty</CardDescription>
                <CardTitle className={`text-2xl font-mono ${getDifficultyColor(
                  analysisData.difficultyMetrics.avgDifficulty < 30 ? "easy" :
                  analysisData.difficultyMetrics.avgDifficulty < 50 ? "moderate" : "hard"
                )}`}>
                  {analysisData.difficultyMetrics.avgDifficulty}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Scale: 0-100
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Anchor Bias Rate</CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {analysisData.errorPatternSummary.anchorBiasRate ?? 0}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Delta Blindness</CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {analysisData.errorPatternSummary.deltaBlindnessRate ?? 0}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Distractor Influence</CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {analysisData.errorPatternSummary.distractorInfluenceRate ?? 0}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="bias" className="space-y-6">
            <TabsList>
              <TabsTrigger value="bias">Systematic Bias</TabsTrigger>
              <TabsTrigger value="anchor">Anchor Analysis</TabsTrigger>
              <TabsTrigger value="difficulty">Difficulty Analysis</TabsTrigger>
              <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
            </TabsList>

            {/* Systematic Bias Tab */}
            <TabsContent value="bias" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Error Category Breakdown</CardTitle>
                    <CardDescription>
                      Distribution of prediction accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisData.errorCategoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value) => [`${value} scenarios`, "Count"]}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {analysisData.errorCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-emerald-400">Excellent:</span> Error ≤ 0.15%</div>
                        <div><span className="text-lime-400">Good:</span> Error ≤ 0.35%</div>
                        <div><span className="text-amber-400">Fair:</span> Error ≤ 0.75%</div>
                        <div><span className="text-red-400">Poor:</span> Error &gt; 0.75%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bias Direction</CardTitle>
                    <CardDescription>
                      Mean error across all scenarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center h-[300px]">
                    <div className="text-6xl font-mono font-bold mb-4">
                      <span className={getBiasColor(analysisData.errorPatternSummary.systematicBias ?? "neutral")}>
                        {(selectedRun.aggregateMetrics?.meanError ?? 0) > 0 ? "+" : ""}
                        {(selectedRun.aggregateMetrics?.meanError ?? 0).toFixed(3)}%
                      </span>
                    </div>
                    <div className="text-lg capitalize text-muted-foreground">
                      {analysisData.errorPatternSummary.systematicBias === "neutral" 
                        ? "No systematic bias detected"
                        : `Tendency to ${analysisData.errorPatternSummary.systematicBias}`
                      }
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <span>Overestimate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span>Neutral</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                        <span>Underestimate</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Error by Difficulty Level */}
              {analysisData.errorPatternSummary.errorByDifficulty && (
                <Card>
                  <CardHeader>
                    <CardTitle>Average Error by Difficulty Level</CardTitle>
                    <CardDescription>
                      How error changes with scenario complexity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { level: "Trivial", error: analysisData.errorPatternSummary.errorByDifficulty?.trivial ?? 0 },
                            { level: "Easy", error: analysisData.errorPatternSummary.errorByDifficulty?.easy ?? 0 },
                            { level: "Moderate", error: analysisData.errorPatternSummary.errorByDifficulty?.moderate ?? 0 },
                            { level: "Hard", error: analysisData.errorPatternSummary.errorByDifficulty?.hard ?? 0 },
                            { level: "Expert", error: analysisData.errorPatternSummary.errorByDifficulty?.expert ?? 0 },
                          ].filter(d => d.error > 0)}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value) => [`${typeof value === 'number' ? value.toFixed(3) : value}%`, "Avg Error"]}
                          />
                          <Bar dataKey="error" fill="#818cf8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Anchor Analysis Tab */}
            <TabsContent value="anchor" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Error by Anchor Type</CardTitle>
                  <CardDescription>
                    Positive = overestimate, Negative = underestimate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analysisData.anchorBiasData.sort((a, b) => b.avgError - a.avgError)}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => `${v.toFixed(2)}%`}
                        />
                        <YAxis
                          dataKey="anchor"
                          type="category"
                          width={140}
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value, _name, props) => [
                            `${typeof value === 'number' ? value.toFixed(3) : value}% (${(props as { payload?: { count?: number } }).payload?.count ?? 0} scenarios)`,
                            "Avg Error"
                          ]}
                        />
                        <ReferenceLine x={0} stroke="#71717a" strokeWidth={2} />
                        <Bar dataKey="avgError" radius={[0, 4, 4, 0]}>
                          {analysisData.anchorBiasData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.avgError > 0.1 ? "#ef4444" : entry.avgError < -0.1 ? "#3b82f6" : "#22c55e"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anchor Bias Heatmap</CardTitle>
                  <CardDescription>
                    Error magnitude by anchor type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {analysisData.anchorBiasData
                      .sort((a, b) => Math.abs(b.avgError) - Math.abs(a.avgError))
                      .map((anchor) => {
                        const absError = Math.abs(anchor.avgError);
                        const intensity = Math.min(1, absError / 0.5);
                        const bgColor = anchor.avgError > 0.05
                          ? `rgba(239, 68, 68, ${intensity * 0.4})`
                          : anchor.avgError < -0.05
                          ? `rgba(59, 130, 246, ${intensity * 0.4})`
                          : "rgba(34, 197, 94, 0.2)";

                        return (
                          <div
                            key={anchor.anchor}
                            className="p-3 rounded-lg border"
                            style={{ backgroundColor: bgColor }}
                          >
                            <div className="text-sm font-medium capitalize truncate">
                              {anchor.anchor}
                            </div>
                            <div className="text-lg font-mono font-bold">
                              {anchor.avgError > 0 ? "+" : ""}{anchor.avgError.toFixed(3)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {anchor.count} scenario{anchor.count !== 1 ? "s" : ""}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Difficulty Analysis Tab */}
            <TabsContent value="difficulty" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Difficulty Distribution</CardTitle>
                    <CardDescription>
                      Number of scenarios at each difficulty level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { level: "Trivial", count: analysisData.difficultyMetrics.distribution.trivial, color: "#22c55e" },
                            { level: "Easy", count: analysisData.difficultyMetrics.distribution.easy, color: "#84cc16" },
                            { level: "Moderate", count: analysisData.difficultyMetrics.distribution.moderate, color: "#f59e0b" },
                            { level: "Hard", count: analysisData.difficultyMetrics.distribution.hard, color: "#f97316" },
                            { level: "Expert", count: analysisData.difficultyMetrics.distribution.expert, color: "#ef4444" },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {[
                              { color: "#22c55e" },
                              { color: "#84cc16" },
                              { color: "#f59e0b" },
                              { color: "#f97316" },
                              { color: "#ef4444" },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Difficulty vs Error Scatter</CardTitle>
                    <CardDescription>
                      Does higher difficulty lead to larger errors?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            type="number"
                            dataKey="difficulty"
                            name="Difficulty"
                            domain={[0, 100]}
                            stroke="hsl(var(--muted-foreground))"
                            label={{
                              value: "Difficulty Score",
                              position: "bottom",
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <YAxis
                            type="number"
                            dataKey="error"
                            name="Error"
                            stroke="hsl(var(--muted-foreground))"
                            label={{
                              value: "Absolute Error (%)",
                              angle: -90,
                              position: "left",
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value, name) => [
                              name === "Error" && typeof value === 'number' ? `${value.toFixed(3)}%` : value,
                              String(name),
                            ]}
                          />
                          <Scatter data={analysisData.difficultyVsError} name="Scenarios">
                            {analysisData.difficultyVsError.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.withinTolerance ? "#22c55e" : "#ef4444"}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span>Within Tolerance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Outside Tolerance</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Difficulty Factors Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Difficulty Details</CardTitle>
                  <CardDescription>
                    Breakdown of difficulty factors for each scenario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2">Anchor</th>
                          <th className="text-center p-2">Deltas</th>
                          <th className="text-center p-2">Distractors</th>
                          <th className="text-center p-2">Delta Score</th>
                          <th className="text-center p-2">Distractor Load</th>
                          <th className="text-center p-2">Interactions</th>
                          <th className="text-center p-2">Total</th>
                          <th className="text-center p-2">Level</th>
                          <th className="text-center p-2">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.scenarioDifficulties
                          .sort((a, b) => b.difficulty.score - a.difficulty.score)
                          .slice(0, 20)
                          .map(({ scenario, result, difficulty }) => (
                            <tr key={scenario.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono text-xs">
                                {scenario.anchor.replace(/_/g, " ")}
                              </td>
                              <td className="text-center p-2">{scenario.appliedDeltas.length}</td>
                              <td className="text-center p-2">{scenario.distractors.length}</td>
                              <td className="text-center p-2 font-mono">
                                {difficulty.factors.deltaComplexity}
                              </td>
                              <td className="text-center p-2 font-mono">
                                {difficulty.factors.distractorLoad}
                              </td>
                              <td className="text-center p-2 font-mono">
                                {difficulty.factors.interactionEffects}
                              </td>
                              <td className="text-center p-2 font-mono font-bold">
                                {difficulty.score}
                              </td>
                              <td className="text-center p-2">
                                <Badge
                                  variant="outline"
                                  className={getDifficultyColor(difficulty.level)}
                                >
                                  {difficulty.level}
                                </Badge>
                              </td>
                              <td className="text-center p-2 font-mono">
                                {result ? (
                                  <span className={result.withinTolerance ? "text-emerald-400" : "text-red-400"}>
                                    {result.absoluteError.toFixed(3)}
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Error Patterns Tab */}
            <TabsContent value="patterns" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Error Pattern Distribution</CardTitle>
                    <CardDescription>
                      Types of errors detected across scenarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisData.patternData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                          <YAxis
                            dataKey="pattern"
                            type="category"
                            width={150}
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value, _name, props) => [
                              `${value} (${(props as { payload?: { percentage?: number } }).payload?.percentage ?? 0}%)`,
                              "Count"
                            ]}
                          />
                          <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pattern Severity Breakdown</CardTitle>
                    <CardDescription>
                      Severity of detected error patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.scenarioDifficulties
                        .filter(s => s.errorPattern && s.errorPattern.pattern !== "accurate")
                        .sort((a, b) => {
                          const severityOrder = { severe: 0, moderate: 1, minor: 2 };
                          return severityOrder[a.errorPattern!.severity] - severityOrder[b.errorPattern!.severity];
                        })
                        .slice(0, 10)
                        .map(({ scenario, errorPattern }) => (
                          <div
                            key={scenario.id}
                            className={`p-3 rounded-lg border ${
                              errorPattern?.severity === "severe"
                                ? "bg-red-500/10 border-red-500/30"
                                : errorPattern?.severity === "moderate"
                                ? "bg-amber-500/10 border-amber-500/30"
                                : "bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs">
                                {scenario.anchor.replace(/_/g, " ")}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  errorPattern?.severity === "severe"
                                    ? "text-red-400 border-red-400/50"
                                    : errorPattern?.severity === "moderate"
                                    ? "text-amber-400 border-amber-400/50"
                                    : "text-muted-foreground"
                                }
                              >
                                {errorPattern?.severity}
                              </Badge>
                            </div>
                            <div className="text-sm capitalize font-medium">
                              {errorPattern?.pattern.replace(/_/g, " ")}
                            </div>
                            {errorPattern?.details && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {errorPattern.details}
                              </div>
                            )}
                          </div>
                        ))}
                      {analysisData.scenarioDifficulties.filter(s => s.errorPattern?.pattern !== "accurate").length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          All predictions within tolerance - no error patterns detected
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pattern Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>
                    Actionable findings from error pattern analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analysisData.errorPatternSummary.anchorBiasRate !== undefined &&
                      analysisData.errorPatternSummary.anchorBiasRate > 10 && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="font-medium text-amber-400 mb-1">
                          Anchor Bias Detected
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {analysisData.errorPatternSummary.anchorBiasRate}% of predictions are too close to 
                          base anchor values. Consider adding more context about how deltas should modify estimates.
                        </div>
                      </div>
                    )}
                    {analysisData.errorPatternSummary.deltaBlindnessRate !== undefined &&
                      analysisData.errorPatternSummary.deltaBlindnessRate > 10 && (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="font-medium text-red-400 mb-1">
                          Delta Blindness Issue
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {analysisData.errorPatternSummary.deltaBlindnessRate}% of scenarios show failure to 
                          account for adjustment factors. Try emphasizing deltas more clearly in prompts.
                        </div>
                      </div>
                    )}
                    {analysisData.errorPatternSummary.distractorInfluenceRate !== undefined &&
                      analysisData.errorPatternSummary.distractorInfluenceRate > 15 && (
                      <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="font-medium text-purple-400 mb-1">
                          Distractor Vulnerability
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {analysisData.errorPatternSummary.distractorInfluenceRate}% of scenarios with 
                          distractors show large errors. Model may be influenced by irrelevant information.
                        </div>
                      </div>
                    )}
                    {analysisData.errorPatternSummary.systematicBias !== "neutral" && (
                      <div className={`p-4 rounded-lg ${
                        analysisData.errorPatternSummary.systematicBias === "overestimate"
                          ? "bg-red-500/10 border border-red-500/30"
                          : "bg-blue-500/10 border border-blue-500/30"
                      }`}>
                        <div className={`font-medium mb-1 ${
                          analysisData.errorPatternSummary.systematicBias === "overestimate"
                            ? "text-red-400"
                            : "text-blue-400"
                        }`}>
                          Systematic {analysisData.errorPatternSummary.systematicBias === "overestimate" ? "Overestimation" : "Underestimation"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Model consistently {analysisData.errorPatternSummary.systematicBias}s values by 
                          an average of {Math.abs(selectedRun.aggregateMetrics?.meanError ?? 0).toFixed(3)}%. 
                          Consider calibration adjustments or prompt modifications.
                        </div>
                      </div>
                    )}
                    {analysisData.errorPatternSummary.systematicBias === "neutral" &&
                      (analysisData.errorPatternSummary.anchorBiasRate ?? 0) <= 10 &&
                      (analysisData.errorPatternSummary.deltaBlindnessRate ?? 0) <= 10 && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="font-medium text-emerald-400 mb-1">
                          Model Performing Well
                        </div>
                        <div className="text-sm text-muted-foreground">
                          No significant systematic issues detected. Error patterns are within 
                          acceptable ranges and predictions are well-calibrated.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
