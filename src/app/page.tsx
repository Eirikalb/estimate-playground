"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BenchmarkRun } from "@/domains/schema";

export default function Dashboard() {
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (hitRate >= 60) return "bg-amber-500/20 text-amber-400";
    return "bg-red-500/20 text-red-400";
  };

  // Aggregate stats (only from completed runs with metrics)
  const completedRuns = runs.filter((r) => r.aggregateMetrics);
  const totalRuns = runs.length;
  const avgHitRate =
    completedRuns.length > 0
      ? completedRuns.reduce((sum, r) => sum + (r.aggregateMetrics?.hitRate ?? 0), 0) / completedRuns.length
      : 0;
  const modelsUsed = new Set(runs.map((r) => r.model)).size;
  const templatesUsed = new Set(runs.map((r) => r.promptStrategy)).size;

  return (
    <div className="container max-w-screen-2xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track and analyze LLM estimation benchmark runs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-4xl font-mono">{totalRuns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Hit Rate</CardDescription>
            <CardTitle className="text-4xl font-mono">
              {avgHitRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Models Tested</CardDescription>
            <CardTitle className="text-4xl font-mono">{modelsUsed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prompt Strategies</CardDescription>
            <CardTitle className="text-4xl font-mono">{templatesUsed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Link href="/playground">
          <Button>
            <span className="mr-2">+</span>
            New Benchmark Run
          </Button>
        </Link>
        <Link href="/compare">
          <Button variant="outline">Compare Results</Button>
        </Link>
      </div>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>
            All benchmark runs sorted by most recent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">No runs yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first benchmark run
              </p>
              <Link href="/playground">
                <Button>Create First Run</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Scenarios</TableHead>
                  <TableHead>Rollouts</TableHead>
                  <TableHead>Hit Rate</TableHead>
                  <TableHead>RMSE</TableHead>
                  <TableHead>Avg σ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {run.status === "running" && (
                          <span className="text-amber-400 animate-pulse">●</span>
                        )}
                        {formatDate(run.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {run.model.split("/").pop()}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {run.promptStrategy.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {run.scenarios.length}
                    </TableCell>
                    <TableCell className="font-mono">
                      {run.rolloutsPerScenario > 1 ? `${run.rolloutsPerScenario}x` : "1"}
                    </TableCell>
                    <TableCell>
                      {run.aggregateMetrics ? (
                        <Badge
                          className={getHitRateColor(run.aggregateMetrics.hitRate)}
                        >
                          {run.aggregateMetrics.hitRate.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {run.aggregateMetrics?.rmse.toFixed(3) ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {run.aggregateMetrics?.avgStdDeviation !== undefined
                        ? run.aggregateMetrics.avgStdDeviation.toFixed(3)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/runs/${run.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
