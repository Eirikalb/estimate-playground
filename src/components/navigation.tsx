"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BenchmarkRun } from "@/domains/schema";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/playground", label: "Playground" },
  { href: "/compare", label: "Compare" },
];

export function Navigation() {
  const pathname = usePathname();
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Poll for runs every 3 seconds
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch("/api/runs");
        if (res.ok) {
          const data = await res.json();
          setRuns(data);
        }
      } catch (error) {
        console.error("Failed to fetch runs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
    const interval = setInterval(fetchRuns, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get recent runs (up to 3, prioritize running/generating)
  const recentRuns = runs
    .sort((a, b) => {
      // Sort by status priority first (running > generating > completed)
      const statusPriority = (run: BenchmarkRun) => {
        if (run.status === "running") return 3;
        if (run.status === "generating_narratives") return 2;
        if (run.status === "completed") return 1;
        return 0;
      };
      const priorityDiff = statusPriority(b) - statusPriority(a);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, 3);

  const hasRunningJobs = runs.some(
    (r) => r.status === "running" || r.status === "generating_narratives"
  );

  const getStatusColor = (status: string) => {
    if (status === "running") return "text-amber-400";
    if (status === "generating_narratives") return "text-purple-400";
    if (status === "completed") return "text-emerald-400";
    return "text-muted-foreground";
  };

  const getStatusLabel = (status: string) => {
    if (status === "running") return "Running";
    if (status === "generating_narratives") return "Generating";
    if (status === "completed") return "Completed";
    if (status === "failed") return "Failed";
    return status;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center">
          <div className="mr-8 flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-400 to-orange-600" />
            <span className="font-semibold tracking-tight">Estimate Playground</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Run Status Indicator */}
        {!isLoading && runs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors">
              <div className="relative">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    hasRunningJobs
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400"
                  )}
                />
                {hasRunningJobs && (
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {recentRuns.length} run{recentRuns.length !== 1 ? "s" : ""}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Recent Runs
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {recentRuns.map((run) => (
                  <DropdownMenuItem key={run.id} asChild>
                    <Link
                      href={`/runs/${run.id}`}
                      className="flex flex-col items-start gap-1 px-2 py-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {run.model.split("/").pop()}
                        </span>
                        <span className={cn("text-xs", getStatusColor(run.status))}>
                          {getStatusLabel(run.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                        <span className="truncate max-w-[150px]">
                          {run.promptStrategy}
                        </span>
                        {run.testSetName && (
                          <span className="text-blue-400">• {run.testSetName}</span>
                        )}
                        {run.aggregateMetrics && (
                          <span className="text-emerald-400 ml-auto">
                            {run.aggregateMetrics.hitRate.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

