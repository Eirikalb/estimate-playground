"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import type { BenchmarkRun } from "@/domains/schema";

export default function Compare() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container max-w-screen-2xl py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Filter to only completed runs with metrics
  const completedRuns = runs.filter((r) => r.aggregateMetrics);

  if (completedRuns.length === 0) {
    return (
      <div className="container max-w-screen-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
          <p className="text-muted-foreground mt-2">
            Compare performance across models and prompt strategies
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No completed runs to compare yet. Create some benchmark runs first.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group runs by model
  const byModel = completedRuns.reduce((acc, run) => {
    const model = run.model.split("/").pop() || run.model;
    if (!acc[model]) acc[model] = [];
    acc[model].push(run);
    return acc;
  }, {} as Record<string, BenchmarkRun[]>);

  // Group runs by prompt strategy
  const byStrategy = completedRuns.reduce((acc, run) => {
    if (!acc[run.promptStrategy]) acc[run.promptStrategy] = [];
    acc[run.promptStrategy].push(run);
    return acc;
  }, {} as Record<string, BenchmarkRun[]>);

  // Prepare chart data - model comparison
  const modelChartData = Object.entries(byModel).map(([model, modelRuns]) => ({
    name: model,
    hitRate: modelRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.hitRate ?? 0), 0) / modelRuns.length,
    rmse: modelRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.rmse ?? 0), 0) / modelRuns.length,
    latency: modelRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.avgLatencyMs ?? 0), 0) / modelRuns.length,
    runs: modelRuns.length,
  }));

  // Prepare chart data - strategy comparison
  const strategyChartData = Object.entries(byStrategy).map(([strategy, strategyRuns]) => ({
    name: strategy.replace(/-/g, " "),
    hitRate: strategyRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.hitRate ?? 0), 0) / strategyRuns.length,
    rmse: strategyRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.rmse ?? 0), 0) / strategyRuns.length,
    runs: strategyRuns.length,
  }));

  // Scatter plot data - accuracy vs latency
  const scatterData = completedRuns.map((run) => ({
    x: run.aggregateMetrics?.avgLatencyMs ?? 0,
    y: run.aggregateMetrics?.hitRate ?? 0,
    model: run.model.split("/").pop() || run.model,
    strategy: run.promptStrategy,
    id: run.id,
  }));

  // Color mapping by provider
  const getModelColor = (modelName: string): string => {
    const lowerModel = modelName.toLowerCase();

    // OpenAI models - black/gray
    if (lowerModel.includes('gpt') || lowerModel.includes('openai')) {
      return '#1f1f1f'; // black/dark gray
    }

    // Gemini models - blue
    if (lowerModel.includes('gemini') || lowerModel.includes('google')) {
      return '#4285f4'; // Google blue
    }

    // Claude models - orange
    if (lowerModel.includes('claude') || lowerModel.includes('anthropic') || lowerModel.includes('sonnet') || lowerModel.includes('opus') || lowerModel.includes('haiku')) {
      return '#f97316'; // orange
    }

    // Fallback colors for other providers
    return '#a855f7'; // purple fallback
  };

  const modelColors: Record<string, string> = {};
  Object.keys(byModel).forEach((model) => {
    modelColors[model] = getModelColor(model);
  });

  return (
    <div className="container max-w-screen-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
        <p className="text-muted-foreground mt-2">
          Analyze performance across {completedRuns.length} completed benchmark runs
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-4xl font-mono">{completedRuns.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Models Tested</CardDescription>
            <CardTitle className="text-4xl font-mono">{Object.keys(byModel).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Strategies Tested</CardDescription>
            <CardTitle className="text-4xl font-mono">{Object.keys(byStrategy).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Hit Rate</CardDescription>
            <CardTitle className="text-4xl font-mono text-emerald-400">
              {Math.max(...completedRuns.map((r) => r.aggregateMetrics?.hitRate ?? 0)).toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="strategies">By Strategy</TabsTrigger>
          <TabsTrigger value="scatter">Accuracy vs Latency</TabsTrigger>
          <TabsTrigger value="matrix">Full Matrix</TabsTrigger>
        </TabsList>

        {/* By Model */}
        <TabsContent value="models" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hit Rate by Model</CardTitle>
                <CardDescription>Average percentage within tolerance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
                        {modelChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getModelColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>RMSE by Model</CardTitle>
                <CardDescription>Lower is better</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="rmse" radius={[0, 4, 4, 0]}>
                        {modelChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getModelColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Model Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelChartData
                  .sort((a, b) => b.hitRate - a.hitRate)
                  .map((model, i) => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{i + 1}
                        </span>
                        <div>
                          <h4 className="font-semibold">{model.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {model.runs} run{model.runs !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-right">
                        <div>
                          <p className="text-sm text-muted-foreground">Hit Rate</p>
                          <p className="text-lg font-mono font-semibold text-emerald-400">
                            {model.hitRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">RMSE</p>
                          <p className="text-lg font-mono font-semibold">
                            {model.rmse.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Latency</p>
                          <p className="text-lg font-mono font-semibold">
                            {Math.round(model.latency)}ms
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Strategy */}
        <TabsContent value="strategies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hit Rate by Strategy</CardTitle>
                <CardDescription>Average across all models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strategyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="hitRate" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>RMSE by Strategy</CardTitle>
                <CardDescription>Lower is better</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strategyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="rmse" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scatter Plot */}
        <TabsContent value="scatter">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy vs Latency Trade-off</CardTitle>
              <CardDescription>
                Each point represents a benchmark run. Ideal position: top-left (high accuracy, low latency)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Latency"
                      unit="ms"
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: "Latency (ms)", position: "bottom", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Hit Rate"
                      unit="%"
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: "Hit Rate (%)", angle: -90, position: "left", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value, name) => {
                        if (typeof value === "number") {
                          return [name === "Hit Rate" ? `${value.toFixed(1)}%` : `${value}ms`, name];
                        }
                        return [String(value), name];
                      }}
                      labelFormatter={(label) => {
                        const point = scatterData.find((d) => d.x === label);
                        return point ? `${point.model} / ${point.strategy}` : "";
                      }}
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={modelColors[entry.model] || '#a855f7'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {Object.entries(modelColors).map(([model, color]) => (
                  <div key={model} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm">{model}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Matrix */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Model × Strategy Matrix</CardTitle>
              <CardDescription>
                Hit rate for each combination. Darker green = higher accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">Model</th>
                      {Object.keys(byStrategy).map((strategy) => (
                        <th key={strategy} className="text-center p-2 border-b border-border capitalize">
                          {strategy.replace(/-/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byModel).map(([model, modelRuns]) => (
                      <tr key={model}>
                        <td className="p-2 border-b border-border font-medium">{model}</td>
                        {Object.keys(byStrategy).map((strategy) => {
                          const matchingRun = modelRuns.find((r) => r.promptStrategy === strategy);
                          const hitRate = matchingRun?.aggregateMetrics?.hitRate;
                          
                          return (
                            <td key={strategy} className="text-center p-2 border-b border-border">
                              {hitRate !== undefined ? (
                                <Badge
                                  className="font-mono"
                                  style={{
                                    backgroundColor: `rgba(52, 211, 153, ${hitRate / 100 * 0.6})`,
                                    color: hitRate > 50 ? "white" : "inherit",
                                  }}
                                >
                                  {hitRate.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

