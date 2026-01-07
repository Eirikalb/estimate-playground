import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  listBenchmarkRuns,
  saveBenchmarkRun,
  loadDomainConfig,
  loadExpertFacts,
} from "@/lib/storage";
import { generateScenarios, generateScenariosWithNarrative } from "@/lib/generator";
import { renderPrompt } from "@/prompts/engine";
import { callOpenRouterMultiple, type OpenRouterConfig } from "@/lib/openrouter";
import { evaluateMultipleRollouts, calculateAggregateMetrics } from "@/lib/evaluator";
import type { BenchmarkRun, ScenarioResult } from "@/domains/schema";

export async function GET() {
  const runs = await listBenchmarkRuns();
  return NextResponse.json(runs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      domainId,
      model,
      promptTemplate,
      promptTemplateId,
      scenarioCount = 10,
      generateTwins = true,
      rolloutsPerScenario = 1,
      seed,
      useNarrativeDescriptions = false,
      narrativeModel,
    } = body;

    // Validate required fields
    if (!domainId || !model || !promptTemplate) {
      return NextResponse.json(
        { error: "domainId, model, and promptTemplate are required" },
        { status: 400 }
      );
    }

    // Validate rollouts (1-10)
    const rollouts = Math.max(1, Math.min(10, rolloutsPerScenario));

    // Get API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Load domain config and facts
    const domainConfig = await loadDomainConfig(domainId);
    const expertFacts = await loadExpertFacts(domainId);

    if (!domainConfig || !expertFacts) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Generate scenarios - use LLM narrative if enabled
    let scenarios;
    if (useNarrativeDescriptions) {
      console.log(`Generating ${scenarioCount} scenarios with LLM-based narratives...`);
      scenarios = await generateScenariosWithNarrative(domainConfig, {
        count: scenarioCount,
        generateTwins,
        seed,
        narrativeConfig: {
          apiKey,
          model: narrativeModel || "openai/gpt-4o-mini",
        },
      });
      console.log(`Generated ${scenarios.length} scenarios with narratives`);
    } else {
      scenarios = generateScenarios(domainConfig, {
        count: scenarioCount,
        generateTwins,
        seed,
      });
    }

    // Create initial run with "running" status and placeholder results
    const runId = uuidv4();
    const startedAt = new Date().toISOString();
    
    // Initialize placeholder results for all scenarios
    const initialResults: ScenarioResult[] = scenarios.map((scenario) => ({
      scenarioId: scenario.id,
      status: "pending" as const,
      rollouts: [],
      meanPrediction: 0,
      stdDeviation: 0,
      minPrediction: 0,
      maxPrediction: 0,
      error: 0,
      absoluteError: 0,
      withinTolerance: false,
      rolloutConsistency: 0,
    }));

    const run: BenchmarkRun = {
      id: runId,
      timestamp: startedAt,
      domainId,
      model,
      promptStrategy: promptTemplateId || "custom",
      promptTemplate,
      rolloutsPerScenario: rollouts,
      status: "running",
      startedAt,
      scenarios,
      results: initialResults,
    };

    // Save the initial run state
    await saveBenchmarkRun(run);

    // Run each scenario through the LLM
    const config: OpenRouterConfig = {
      apiKey,
      model,
      temperature: 0.3,
    };

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const scenarioStartedAt = new Date().toISOString();
      
      // Mark scenario as running
      run.results[i] = {
        ...run.results[i],
        status: "running",
        startedAt: scenarioStartedAt,
      };
      await saveBenchmarkRun(run);

      const prompt = renderPrompt(
        promptTemplate,
        domainConfig,
        expertFacts,
        scenario
      );

      try {
        // Run multiple rollouts for variance estimation
        const llmResults = await callOpenRouterMultiple(prompt, config, rollouts);
        const result = evaluateMultipleRollouts(scenario, llmResults);
        
        // Update with completed result
        run.results[i] = {
          ...result,
          status: "completed",
          startedAt: scenarioStartedAt,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Record failed prediction
        run.results[i] = {
          scenarioId: scenario.id,
          status: "failed",
          startedAt: scenarioStartedAt,
          completedAt: new Date().toISOString(),
          rollouts: [{
            prediction: 0,
            reasoning: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            latencyMs: 0,
          }],
          meanPrediction: 0,
          stdDeviation: 0,
          minPrediction: 0,
          maxPrediction: 0,
          error: scenario.groundTruth.value,
          absoluteError: scenario.groundTruth.value,
          withinTolerance: false,
          rolloutConsistency: 0,
        };
      }

      // Save after each scenario completes
      await saveBenchmarkRun(run);

      // Small delay between scenarios
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Calculate aggregate metrics and mark run as completed
    const completedResults = run.results.filter(r => r.status === "completed" || r.status === "failed");
    const aggregateMetrics = calculateAggregateMetrics(scenarios, completedResults);

    run.status = "completed";
    run.completedAt = new Date().toISOString();
    run.aggregateMetrics = aggregateMetrics;

    await saveBenchmarkRun(run);

    return NextResponse.json(run);
  } catch (error) {
    console.error("Error creating run:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
