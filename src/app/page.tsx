"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BenchmarkRun } from "@/domains/schema";
import { formatCostCompact } from "@/lib/pricing";
import { AVAILABLE_DOMAINS, getShortDomainName } from "@/components/domain-selector";

type SortField = "date" | "hitRate" | "rmse" | "avgStdDev" | "avgConfidence" | "cost";
type SortDirection = "asc" | "desc";

// Default filter state
const DEFAULT_SORT_FIELD: SortField = "date";
const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

export default function Dashboard() {
  const router = useRouter();
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  
  // Filter state - now arrays for multi-select
  const [modelFilters, setModelFilters] = useState<string[]>([]);
  const [strategyFilters, setStrategyFilters] = useState<string[]>([]);
  const [testSetFilter, setTestSetFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/runs")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  
  // Extract unique values for filters
  const uniqueModels = useMemo(() => {
    const models = [...new Set(runs.map((r) => r.model))];
    return models.sort();
  }, [runs]);
  
  const uniqueStrategies = useMemo(() => {
    const strategies = [...new Set(runs.map((r) => r.promptStrategy))];
    return strategies.sort();
  }, [runs]);
  
  const uniqueTestSets = useMemo(() => {
    const testSets = [...new Set(runs.map((r) => r.testSetName).filter(Boolean))] as string[];
    return testSets.sort();
  }, [runs]);
  
  // Filter and sort runs
  const filteredAndSortedRuns = useMemo(() => {
    let filtered = runs;
    
    // Apply filters (multi-select for model and strategy)
    if (modelFilters.length > 0) {
      filtered = filtered.filter((r) => modelFilters.includes(r.model));
    }
    if (strategyFilters.length > 0) {
      filtered = filtered.filter((r) => strategyFilters.includes(r.promptStrategy));
    }
    if (testSetFilter !== "all") {
      if (testSetFilter === "none") {
        filtered = filtered.filter((r) => !r.testSetName);
      } else {
        filtered = filtered.filter((r) => r.testSetName === testSetFilter);
      }
    }
    if (domainFilter !== "all") {
      filtered = filtered.filter((r) => r.domainId === domainFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "date":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case "hitRate":
          const aHitRate = a.aggregateMetrics?.hitRate ?? -1;
          const bHitRate = b.aggregateMetrics?.hitRate ?? -1;
          comparison = aHitRate - bHitRate;
          break;
        case "rmse":
          const aRmse = a.aggregateMetrics?.rmse ?? Infinity;
          const bRmse = b.aggregateMetrics?.rmse ?? Infinity;
          comparison = aRmse - bRmse;
          break;
        case "avgStdDev":
          const aStdDev = a.aggregateMetrics?.avgStdDeviation ?? Infinity;
          const bStdDev = b.aggregateMetrics?.avgStdDeviation ?? Infinity;
          comparison = aStdDev - bStdDev;
          break;
        case "avgConfidence":
          const aConf = a.aggregateMetrics?.avgConfidence ?? -1;
          const bConf = b.aggregateMetrics?.avgConfidence ?? -1;
          comparison = aConf - bConf;
          break;
        case "cost":
          const aCost = a.aggregateMetrics?.totalCost ?? -1;
          const bCost = b.aggregateMetrics?.totalCost ?? -1;
          comparison = aCost - bCost;
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [runs, modelFilters, strategyFilters, testSetFilter, domainFilter, sortField, sortDirection]);
  
  // Toggle sort direction or change field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default directions: date desc, metrics where higher is better (hitRate, confidence) desc, lower is better (rmse, stddev, cost) asc
      setSortDirection(field === "date" || field === "hitRate" || field === "avgConfidence" ? "desc" : "asc");
    }
  };
  
  // Toggle model filter
  const toggleModelFilter = (model: string) => {
    setModelFilters(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };
  
  // Toggle strategy filter
  const toggleStrategyFilter = (strategy: string) => {
    setStrategyFilters(prev => 
      prev.includes(strategy) 
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setModelFilters([]);
    setStrategyFilters([]);
    setTestSetFilter("all");
    setDomainFilter("all");
  };
  
  // Reset to defaults (including sort)
  const resetToDefaults = () => {
    clearFilters();
    setSortField(DEFAULT_SORT_FIELD);
    setSortDirection(DEFAULT_SORT_DIRECTION);
  };
  
  // Check if any filters are active
  const hasActiveFilters = modelFilters.length > 0 || strategyFilters.length > 0 || testSetFilter !== "all" || domainFilter !== "all";
  const hasNonDefaultState = hasActiveFilters || sortField !== DEFAULT_SORT_FIELD || sortDirection !== DEFAULT_SORT_DIRECTION;
  
  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-muted-foreground/50 ml-1">↕</span>;
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  };
  
  // Filter badge component with X button
  const FilterBadge = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </Badge>
  );

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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Benchmark Runs</CardTitle>
                <CardDescription>
                  {filteredAndSortedRuns.length} of {runs.length} runs
                  {hasActiveFilters && " (filtered)"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )}
                {hasNonDefaultState && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={resetToDefaults}
                  >
                    Reset to default
                  </Button>
                )}
              </div>
            </div>
            
            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {modelFilters.map(model => (
                  <FilterBadge 
                    key={model} 
                    label={model.split("/").pop() || model}
                    onRemove={() => toggleModelFilter(model)}
                  />
                ))}
                {strategyFilters.map(strategy => (
                  <FilterBadge 
                    key={strategy} 
                    label={strategy.replace(/-/g, " ")}
                    onRemove={() => toggleStrategyFilter(strategy)}
                  />
                ))}
                {testSetFilter !== "all" && (
                  <FilterBadge 
                    label={testSetFilter === "none" ? "No Test Set" : testSetFilter}
                    onRemove={() => setTestSetFilter("all")}
                  />
                )}
                {domainFilter !== "all" && (
                  <FilterBadge 
                    label={getShortDomainName(domainFilter)}
                    onRemove={() => setDomainFilter("all")}
                  />
                )}
              </div>
            )}
          </div>
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
          ) : filteredAndSortedRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold mb-2">No matching runs</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters
              </p>
              <Button 
                variant="outline"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("date")}
                  >
                    Date<SortIndicator field="date" />
                  </TableHead>
                  <TableHead className="p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-3 w-full h-full hover:bg-muted/50 text-left font-medium text-sm">
                          Model
                          {modelFilters.length > 0 && (
                            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                              {modelFilters.length}
                            </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-50">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Filter by Model</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueModels.map((model) => (
                          <DropdownMenuCheckboxItem
                            key={model}
                            checked={modelFilters.includes(model)}
                            onCheckedChange={() => toggleModelFilter(model)}
                          >
                            {model.split("/").pop()}
                          </DropdownMenuCheckboxItem>
                        ))}
                        {modelFilters.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <button
                              className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                              onClick={() => setModelFilters([])}
                            >
                              Clear model filters
                            </button>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-3 w-full h-full hover:bg-muted/50 text-left font-medium text-sm">
                          Strategy
                          {strategyFilters.length > 0 && (
                            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                              {strategyFilters.length}
                            </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-50">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Filter by Strategy</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueStrategies.map((strategy) => (
                          <DropdownMenuCheckboxItem
                            key={strategy}
                            checked={strategyFilters.includes(strategy)}
                            onCheckedChange={() => toggleStrategyFilter(strategy)}
                          >
                            {strategy.replace(/-/g, " ")}
                          </DropdownMenuCheckboxItem>
                        ))}
                        {strategyFilters.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <button
                              className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                              onClick={() => setStrategyFilters([])}
                            >
                              Clear strategy filters
                            </button>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-3 w-full h-full hover:bg-muted/50 text-left font-medium text-sm">
                          Test Set
                          {testSetFilter !== "all" && (
                            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                              1
                            </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-50">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Filter by Test Set</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={testSetFilter === "all"}
                          onCheckedChange={() => setTestSetFilter("all")}
                        >
                          All Test Sets
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={testSetFilter === "none"}
                          onCheckedChange={() => setTestSetFilter("none")}
                        >
                          No Test Set
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {uniqueTestSets.map((testSet) => (
                          <DropdownMenuCheckboxItem
                            key={testSet}
                            checked={testSetFilter === testSet}
                            onCheckedChange={() => setTestSetFilter(testSet)}
                          >
                            {testSet}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-3 w-full h-full hover:bg-muted/50 text-left font-medium text-sm">
                          Domain
                          {domainFilter !== "all" && (
                            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                              1
                            </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-50">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Filter by Domain</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={domainFilter === "all"}
                          onCheckedChange={() => setDomainFilter("all")}
                        >
                          All Domains
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {AVAILABLE_DOMAINS.map((domain) => (
                          <DropdownMenuCheckboxItem
                            key={domain.id}
                            checked={domainFilter === domain.id}
                            onCheckedChange={() => setDomainFilter(domain.id)}
                          >
                            {domain.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead>Scenarios</TableHead>
                  <TableHead>Rollouts</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("hitRate")}
                  >
                    Hit Rate<SortIndicator field="hitRate" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("rmse")}
                  >
                    RMSE<SortIndicator field="rmse" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("avgStdDev")}
                  >
                    Avg σ<SortIndicator field="avgStdDev" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("avgConfidence")}
                  >
                    Conf.<SortIndicator field="avgConfidence" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("cost")}
                  >
                    Cost<SortIndicator field="cost" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRuns.map((run) => (
                  <TableRow 
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/runs/${run.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {run.status === "generating_narratives" && (
                          <span className="text-purple-400 animate-pulse">●</span>
                        )}
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
                    <TableCell className="text-sm">
                      {run.testSetName ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {run.testSetName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary" className="text-xs">
                        {getShortDomainName(run.domainId)}
                      </Badge>
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
                    <TableCell className="font-mono">
                      {run.aggregateMetrics?.avgConfidence !== undefined
                        ? run.aggregateMetrics.avgConfidence
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {run.aggregateMetrics?.totalCost !== undefined
                        ? formatCostCompact(run.aggregateMetrics.totalCost)
                        : "—"}
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
