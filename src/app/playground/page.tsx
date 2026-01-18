"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { PromptTemplate, Scenario, ScenarioResult, RolloutResult, TestSet } from "@/domains/schema";
import { AVAILABLE_MODELS } from "@/lib/openrouter";

interface PlaygroundRollout {
  prediction: number;
  reasoning: string;
  latencyMs: number;
  rawResponse: string;
}

interface PlaygroundResult {
  scenario: Scenario;
  renderedPrompt: string;
  result?: ScenarioResult;
  rollouts?: PlaygroundRollout[];
}

export default function Playground() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [testSets, setTestSets] = useState<Array<Omit<TestSet, 'scenarios'>>>([]);

  // State with defaults (will be hydrated from localStorage after mount)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customTemplate, setCustomTemplate] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-4o-mini");
  const [useTestSet, setUseTestSet] = useState<boolean>(true);
  const [selectedTestSet, setSelectedTestSet] = useState<string>("");
  const [scenarioCount, setScenarioCount] = useState<number>(5);
  const [rolloutsPerScenario, setRolloutsPerScenario] = useState<number>(3);
  const [seed, setSeed] = useState<number>(Date.now());
  const [useNarrativeDescriptions, setUseNarrativeDescriptions] = useState<boolean>(true);
  const [narrativeModel, setNarrativeModel] = useState<string>("openai/gpt-4o-mini");

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    // Load saved settings from localStorage
    const savedTemplate = localStorage.getItem('playground_template');
    const savedModel = localStorage.getItem('playground_model');
    const savedUseTestSet = localStorage.getItem('playground_useTestSet');
    const savedTestSet = localStorage.getItem('playground_testSet');
    const savedScenarioCount = localStorage.getItem('playground_scenarioCount');
    const savedRollouts = localStorage.getItem('playground_rollouts');
    const savedNarratives = localStorage.getItem('playground_narratives');
    const savedNarrativeModel = localStorage.getItem('playground_narrativeModel');

    if (savedTemplate) setSelectedTemplate(savedTemplate);
    if (savedModel) setSelectedModel(savedModel);
    if (savedUseTestSet !== null) setUseTestSet(savedUseTestSet !== 'false');
    if (savedTestSet) setSelectedTestSet(savedTestSet);
    if (savedScenarioCount) setScenarioCount(parseInt(savedScenarioCount));
    if (savedRollouts) setRolloutsPerScenario(parseInt(savedRollouts));
    if (savedNarratives !== null) setUseNarrativeDescriptions(savedNarratives !== 'false');
    if (savedNarrativeModel) setNarrativeModel(savedNarrativeModel);

    setIsHydrated(true);

    // Load templates
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        if (data.length > 0 && !savedTemplate) {
          setSelectedTemplate(data[0].id);
          setCustomTemplate(data[0].template);
        }
      });

    // Load test sets
    fetch("/api/test-sets")
      .then((res) => res.json())
      .then((data) => {
        setTestSets(data);
        if (data.length > 0 && !savedTestSet) {
          setSelectedTestSet(data[0].name);
        }
      })
      .catch((err) => console.error("Failed to load test sets:", err));
  }, []);

  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplate);
    if (template) {
      setCustomTemplate(template.template);
    }
  }, [selectedTemplate, templates]);

  // Save settings to localStorage when they change (after hydration)
  useEffect(() => {
    if (isHydrated && selectedTemplate) {
      localStorage.setItem('playground_template', selectedTemplate);
    }
  }, [selectedTemplate, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_model', selectedModel);
    }
  }, [selectedModel, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_useTestSet', String(useTestSet));
    }
  }, [useTestSet, isHydrated]);

  useEffect(() => {
    if (isHydrated && selectedTestSet) {
      localStorage.setItem('playground_testSet', selectedTestSet);
    }
  }, [selectedTestSet, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_scenarioCount', String(scenarioCount));
    }
  }, [scenarioCount, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_rollouts', String(rolloutsPerScenario));
    }
  }, [rolloutsPerScenario, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_narratives', String(useNarrativeDescriptions));
    }
  }, [useNarrativeDescriptions, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('playground_narrativeModel', narrativeModel);
    }
  }, [narrativeModel, isHydrated]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: "real-estate-yield",
          promptTemplate: customTemplate,
          seed,
          useNarrativeDescription: useNarrativeDescriptions,
          narrativeModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || "Error generating preview");
      }
    } catch (error) {
      alert("Error: " + (error instanceof Error ? error.message : "Unknown"));
    }
    setPreviewLoading(false);
  };

  const handleRunSingle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: "real-estate-yield",
          model: selectedModel,
          promptTemplate: customTemplate,
          scenario: result?.scenario,
          rolloutsPerScenario,
          seed,
          useNarrativeDescription: useNarrativeDescriptions,
          narrativeModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || "Error running scenario");
      }
    } catch (error) {
      alert("Error: " + (error instanceof Error ? error.message : "Unknown"));
    }
    setLoading(false);
  };

  const handleRunBenchmark = async (stayOnPage = false) => {
    setRunningBenchmark(true);
    setLastRunId(null);
    try {
      const requestBody: any = {
        model: selectedModel,
        promptTemplate: customTemplate,
        promptTemplateId: selectedTemplate,
        rolloutsPerScenario,
      };

      if (useTestSet && selectedTestSet) {
        // Use test set
        requestBody.testSetName = selectedTestSet;
      } else {
        // Generate scenarios
        requestBody.domainId = "real-estate-yield";
        requestBody.scenarioCount = scenarioCount;
        requestBody.generateTwins = true;
        requestBody.seed = seed;
        requestBody.useNarrativeDescriptions = useNarrativeDescriptions;
        requestBody.narrativeModel = narrativeModel;
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (res.ok) {
        setLastRunId(data.id);
        if (!stayOnPage) {
          router.push(`/runs/${data.id}`);
        }
      } else {
        alert(data.error || "Error running benchmark");
      }
    } catch (error) {
      alert("Error: " + (error instanceof Error ? error.message : "Unknown"));
    }
    setRunningBenchmark(false);
  };

  const getErrorColor = (error: number) => {
    const absError = Math.abs(error);
    if (absError <= 0.15) return "text-emerald-400";
    if (absError <= 0.35) return "text-amber-400";
    return "text-red-400";
  };

  const getConsistencyColor = (std: number) => {
    if (std <= 0.1) return "text-emerald-400";
    if (std <= 0.25) return "text-amber-400";
    return "text-red-400";
  };

  const selectedTestSetData = testSets.find(ts => ts.name === selectedTestSet);
  const effectiveScenarioCount = useTestSet && selectedTestSetData
    ? selectedTestSetData.scenarioCount
    : scenarioCount * 2; // *2 for twins
  const totalApiCalls = effectiveScenarioCount * rolloutsPerScenario;
  const narrativeCalls = useTestSet ? 0 : (useNarrativeDescriptions ? scenarioCount * 2 : 0);

  return (
    <div className="container max-w-screen-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground mt-2">
          Experiment with prompt templates and run benchmarks with fixed test sets or generated scenarios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Model & Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Select model and prompt strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="font-medium">{model.name}</span>
                        <span className="text-muted-foreground ml-2">
                          ({model.provider})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Prompt Template
                </label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Test Set Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Use Test Set</label>
                    <p className="text-xs text-muted-foreground">
                      Use fixed scenarios from a test set instead of generating new ones
                    </p>
                  </div>
                  <button
                    onClick={() => setUseTestSet(!useTestSet)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useTestSet ? "bg-blue-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useTestSet ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {useTestSet && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Test Set
                    </label>
                    <Select value={selectedTestSet} onValueChange={setSelectedTestSet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a test set..." />
                      </SelectTrigger>
                      <SelectContent>
                        {testSets.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No test sets available
                          </div>
                        ) : (
                          testSets.map((testSet) => (
                            <SelectItem key={testSet.name} value={testSet.name}>
                              <div className="flex flex-col">
                                <span className="font-medium">{testSet.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {testSet.scenarioCount} scenarios • v{testSet.version}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedTestSetData && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedTestSetData.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Rollouts - always visible */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rollouts per Scenario
                  <span className="text-muted-foreground text-xs ml-1">(1-10)</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={rolloutsPerScenario}
                  onChange={(e) => setRolloutsPerScenario(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Multiple rollouts enable variance estimation
                </p>
              </div>

              {!useTestSet && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Scenarios
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={scenarioCount}
                    onChange={(e) => setScenarioCount(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Seed</label>
                  <Input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || Date.now())}
                  />
                </div>
              </div>

              {/* Narrative Generation Toggle (only when not using test set) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">LLM-Generated Narratives</label>
                    <p className="text-xs text-muted-foreground">
                      Use AI to generate rich property prospectus descriptions
                    </p>
                  </div>
                  <button
                    onClick={() => setUseNarrativeDescriptions(!useNarrativeDescriptions)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useNarrativeDescriptions ? "bg-purple-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useNarrativeDescriptions ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                
                {useNarrativeDescriptions && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Narrative Model
                    </label>
                    <Select value={narrativeModel} onValueChange={setNarrativeModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.filter(m => 
                          m.id.includes("gpt-4o-mini") || 
                          m.id.includes("gemini") || 
                          m.id.includes("claude")
                        ).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <span className="font-medium">{model.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
                </>
              )}

              {/* Info boxes */}
              {useTestSet && selectedTestSetData && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <span className="text-blue-400">
                    Using fixed testset: <strong>{effectiveScenarioCount} scenarios</strong> already generated.
                    {selectedTestSetData.useNarrativeDescriptions && (
                      <span className="ml-1">(with narratives)</span>
                    )}
                  </span>
                </div>
              )}

              {!useTestSet && rolloutsPerScenario > 1 && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">
                    Running {rolloutsPerScenario} rollouts per scenario enables variance estimation.
                    {totalApiCalls > 20 && (
                      <span className="text-amber-400 ml-1">
                        ({totalApiCalls} total API calls)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {!useTestSet && useNarrativeDescriptions && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm">
                  <span className="text-purple-400">
                    Narrative generation will add ~{narrativeCalls} LLM calls before evaluation.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Template Editor</CardTitle>
              <CardDescription>
                Edit the Mustache template. Use {`{{scenario.contextDescription}}`} for
                the property details and {`{{#facts.NAME}}{{{content}}}{{/facts.NAME}}`}{" "}
                for expert facts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Enter your Mustache template..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Results */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    disabled={previewLoading}
                  >
                    {previewLoading
                      ? (useNarrativeDescriptions ? "Generating Narrative..." : "Generating...")
                      : (useNarrativeDescriptions ? "Generate Preview (+ Narrative)" : "Generate Preview")}
                  </Button>
                  <Button
                    onClick={handleRunSingle}
                    variant="secondary"
                    disabled={loading || !result?.scenario}
                  >
                    {loading
                      ? `Running ${rolloutsPerScenario} rollout${rolloutsPerScenario > 1 ? "s" : ""}...`
                      : `Run ${rolloutsPerScenario > 1 ? `${rolloutsPerScenario} Rollouts` : "Single Scenario"}`}
                  </Button>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                  <Button
                    onClick={() => handleRunBenchmark(false)}
                    disabled={runningBenchmark || (useTestSet && !selectedTestSet)}
                    className="flex-1"
                  >
                    {runningBenchmark
                      ? `Starting benchmark...`
                      : useTestSet
                        ? `Run Benchmark (${totalApiCalls} calls)`
                        : `Run Benchmark (${narrativeCalls + totalApiCalls} calls)`}
                  </Button>
                  <Button
                    onClick={() => handleRunBenchmark(true)}
                    disabled={runningBenchmark || (useTestSet && !selectedTestSet)}
                    variant="outline"
                  >
                    Run & Stay
                  </Button>
                </div>

                {lastRunId && !runningBenchmark && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm flex items-center justify-between">
                    <span className="text-emerald-400">
                      ✓ Benchmark started
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/runs/${lastRunId}`)}
                      >
                        View Run
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRunBenchmark(true)}
                        disabled={useTestSet && !selectedTestSet}
                      >
                        Run Another
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scenario">
                  <TabsList className="mb-4">
                    <TabsTrigger value="scenario">Scenario</TabsTrigger>
                    <TabsTrigger value="prompt">Rendered Prompt</TabsTrigger>
                    {result.result && (
                      <TabsTrigger value="response">LLM Response</TabsTrigger>
                    )}
                    {result.rollouts && result.rollouts.length > 1 && (
                      <TabsTrigger value="rollouts">Rollouts ({result.rollouts.length})</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="scenario" className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Property Context</h4>
                      <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                        {result.scenario.contextDescription}
                      </pre>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Ground Truth</h4>
                        <div className="bg-muted p-4 rounded-lg font-mono">
                          <div className="text-2xl font-bold text-emerald-400">
                            {result.scenario.groundTruth.value.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tolerance: ±{result.scenario.groundTruth.tolerance}%
                          </div>
                        </div>
                      </div>

                      {result.result && (
                        <div>
                          <h4 className="font-medium mb-2">
                            {result.result.rollouts.length > 1 ? "Mean Prediction" : "Prediction"}
                          </h4>
                          <div className="bg-muted p-4 rounded-lg font-mono">
                            <div
                              className={`text-2xl font-bold ${getErrorColor(
                                result.result.error
                              )}`}
                            >
                              {result.result.meanPrediction.toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Error: {result.result.error > 0 ? "+" : ""}
                              {result.result.error.toFixed(3)}%
                              {result.result.withinTolerance && (
                                <Badge className="ml-2 bg-emerald-500/20 text-emerald-400">
                                  Within tolerance
                                </Badge>
                              )}
                            </div>
                            {result.result.rollouts.length > 1 && (
                              <div className="text-xs mt-2 pt-2 border-t border-border">
                                <span className={getConsistencyColor(result.result.stdDeviation)}>
                                  σ = {result.result.stdDeviation.toFixed(3)}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  Range: {result.result.minPrediction.toFixed(2)} - {result.result.maxPrediction.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Ground Truth Calculation</h4>
                      <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                        {result.scenario.groundTruth.calculation}
                      </pre>
                    </div>

                    {result.scenario.distractors.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Distractors Included</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {result.scenario.distractors.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="prompt">
                    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono max-h-[600px] overflow-auto">
                      {result.renderedPrompt}
                    </pre>
                  </TabsContent>

                  {result.result && (
                    <TabsContent value="response" className="space-y-4">
                      {result.rollouts && result.rollouts.length > 0 && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Avg Latency: {Math.round(
                              result.rollouts.reduce((s, r) => s + r.latencyMs, 0) / result.rollouts.length
                            )}ms
                          </span>
                          {result.rollouts.length > 1 && (
                            <span>
                              Total Rollouts: {result.rollouts.length}
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">Raw Response</h4>
                        <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono max-h-[300px] overflow-auto">
                          {result.rollouts?.[0]?.rawResponse || "No response"}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Parsed Reasoning</h4>
                        <p className="text-sm text-muted-foreground">
                          {result.result.rollouts[0]?.reasoning || "No reasoning"}
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  {result.rollouts && result.rollouts.length > 1 && (
                    <TabsContent value="rollouts" className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        Individual predictions from {result.rollouts.length} rollouts
                      </div>
                      <div className="space-y-3">
                        {result.rollouts.map((rollout, i) => (
                          <div key={i} className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Rollout {i + 1}</span>
                              <div className="flex items-center gap-3 text-sm">
                                <span className={`font-mono ${getErrorColor(
                                  rollout.prediction - result.scenario.groundTruth.value
                                )}`}>
                                  {rollout.prediction.toFixed(2)}%
                                </span>
                                <span className="text-muted-foreground">
                                  {rollout.latencyMs}ms
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {rollout.reasoning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
