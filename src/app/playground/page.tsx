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
import type { PromptTemplate, Scenario, ScenarioResult } from "@/domains/schema";
import { AVAILABLE_MODELS } from "@/lib/openrouter";

interface PlaygroundResult {
  scenario: Scenario;
  renderedPrompt: string;
  result?: ScenarioResult;
  rawResponse?: string;
  latencyMs?: number;
}

export default function Playground() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customTemplate, setCustomTemplate] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-4o-mini");
  const [scenarioCount, setScenarioCount] = useState<number>(5);
  const [seed, setSeed] = useState<number>(Date.now());
  
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplate(data[0].id);
          setCustomTemplate(data[0].template);
        }
      });
  }, []);

  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplate);
    if (template) {
      setCustomTemplate(template.template);
    }
  }, [selectedTemplate, templates]);

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
          seed,
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

  const handleRunBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: "real-estate-yield",
          model: selectedModel,
          promptTemplate: customTemplate,
          promptTemplateId: selectedTemplate,
          scenarioCount,
          generateTwins: true,
          seed,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/runs/${data.id}`);
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

  return (
    <div className="container max-w-screen-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground mt-2">
          Experiment with prompt templates and test single scenarios
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Scenario Count
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
              <div className="flex gap-3">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  disabled={previewLoading}
                >
                  {previewLoading ? "Generating..." : "Generate Preview"}
                </Button>
                <Button
                  onClick={handleRunSingle}
                  variant="secondary"
                  disabled={loading || !result?.scenario}
                >
                  {loading ? "Running..." : "Run Single Scenario"}
                </Button>
                <Button
                  onClick={handleRunBenchmark}
                  disabled={runningBenchmark}
                >
                  {runningBenchmark
                    ? `Running ${scenarioCount * 2} scenarios...`
                    : `Run Full Benchmark (${scenarioCount * 2} scenarios)`}
                </Button>
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
                          <h4 className="font-medium mb-2">Prediction</h4>
                          <div className="bg-muted p-4 rounded-lg font-mono">
                            <div
                              className={`text-2xl font-bold ${getErrorColor(
                                result.result.error
                              )}`}
                            >
                              {result.result.prediction.toFixed(2)}%
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Latency: {result.latencyMs}ms</span>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Raw Response</h4>
                        <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                          {result.rawResponse}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Parsed Reasoning</h4>
                        <p className="text-sm text-muted-foreground">
                          {result.result.reasoning}
                        </p>
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

