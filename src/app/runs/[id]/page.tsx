"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BenchmarkRun, Scenario, ScenarioResult } from "@/domains/schema";

export default function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<{
    scenario: Scenario;
    result: ScenarioResult;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/runs/${resolvedParams.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          router.push("/");
        } else {
          setRun(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/");
      });
  }, [resolvedParams.id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this run?")) return;

    await fetch(`/api/runs/${resolvedParams.id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="container max-w-screen-2xl py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container max-w-screen-2xl py-8">
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
    if (hitRate >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (hitRate >= 60) return "bg-amber-500/20 text-amber-400";
    return "bg-red-500/20 text-red-400";
  };

  // Group scenarios with their results
  const scenarioResults = run.scenarios.map((scenario) => ({
    scenario,
    result: run.results.find((r) => r.scenarioId === scenario.id)!,
  }));

  // Separate twin pairs
  const twinPairs = scenarioResults.filter(
    (sr) => sr.scenario.twinId && !sr.scenario.twinDeltaChanged?.startsWith("removed")
  );

  return (
    <div className="container max-w-screen-2xl py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Run Details</h1>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Badge variant="secondary" className="font-mono">
              {run.model.split("/").pop()}
            </Badge>
            <span>•</span>
            <span className="capitalize">{run.promptStrategy.replace(/-/g, " ")}</span>
            <span>•</span>
            <span>
              {new Date(run.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete Run
        </Button>
      </div>

      {/* Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hit Rate</CardDescription>
            <CardTitle className="text-3xl font-mono">
              <span className={getHitRateColor(run.aggregateMetrics.hitRate).split(" ")[1]}>
                {run.aggregateMetrics.hitRate.toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>RMSE</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {run.aggregateMetrics.rmse.toFixed(3)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mean Error</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {run.aggregateMetrics.meanError > 0 ? "+" : ""}
              {run.aggregateMetrics.meanError.toFixed(3)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Directional Accuracy</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {run.aggregateMetrics.directionalAccuracy !== undefined
                ? `${run.aggregateMetrics.directionalAccuracy.toFixed(0)}%`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {run.aggregateMetrics.avgLatencyMs}ms
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Scenario List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scenarios ({run.scenarios.length})</CardTitle>
              <CardDescription>
                Click a row to see details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anchor</TableHead>
                    <TableHead>Deltas</TableHead>
                    <TableHead>Truth</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarioResults.map(({ scenario, result }) => (
                    <TableRow
                      key={scenario.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedScenario({ scenario, result })}
                    >
                      <TableCell className="font-mono text-xs">
                        {scenario.anchor.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scenario.appliedDeltas.slice(0, 2).map((d) => (
                            <Badge key={d} variant="outline" className="text-xs">
                              {d.replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {scenario.appliedDeltas.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{scenario.appliedDeltas.length - 2}
                            </Badge>
                          )}
                          {scenario.distractors.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🎭
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {scenario.groundTruth.value.toFixed(2)}%
                      </TableCell>
                      <TableCell className="font-mono">
                        {result.prediction.toFixed(2)}%
                      </TableCell>
                      <TableCell className={`font-mono ${getErrorColor(result.error)}`}>
                        {result.error > 0 ? "+" : ""}
                        {result.error.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {result.withinTolerance ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400">✓</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400">✗</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right - Detail Panel */}
        <div>
          {selectedScenario ? (
            <Card>
              <CardHeader>
                <CardTitle>Scenario Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm">Context</h4>
                  <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">
                    {selectedScenario.scenario.contextDescription}
                  </pre>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Ground Truth</h4>
                    <div className="text-2xl font-mono font-bold text-emerald-400">
                      {selectedScenario.scenario.groundTruth.value.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Prediction</h4>
                    <div
                      className={`text-2xl font-mono font-bold ${getErrorColor(
                        selectedScenario.result.error
                      )}`}
                    >
                      {selectedScenario.result.prediction.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-sm">Calculation</h4>
                  <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">
                    {selectedScenario.scenario.groundTruth.calculation}
                  </pre>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-sm">LLM Reasoning</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedScenario.result.reasoning}
                  </p>
                </div>

                {selectedScenario.scenario.twinId && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-1 text-sm">Twin Info</h4>
                      <p className="text-xs text-muted-foreground">
                        Delta changed: {selectedScenario.scenario.twinDeltaChanged}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a scenario to view details
              </CardContent>
            </Card>
          )}

          {/* Prompt Template */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Prompt Template Used</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono max-h-[300px] overflow-auto">
                {run.promptTemplate}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

