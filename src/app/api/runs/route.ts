import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  listBenchmarkRuns,
  saveBenchmarkRun,
  loadDomainConfig,
  loadExpertFacts,
} from "@/lib/storage";
import { generateScenarios } from "@/lib/generator";
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

    // Generate scenarios
    const scenarios = generateScenarios(domainConfig, {
      count: scenarioCount,
      generateTwins,
      seed,
    });

    // Run each scenario through the LLM
    const config: OpenRouterConfig = {
      apiKey,
      model,
      temperature: 0.3,
    };

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
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
        results.push(result);
      } catch (error) {
        // Record failed prediction with empty rollouts
        results.push({
          scenarioId: scenario.id,
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
        });
      }

      // Small delay between scenarios
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Calculate aggregate metrics
    const aggregateMetrics = calculateAggregateMetrics(scenarios, results);

    // Create and save the run
    const run: BenchmarkRun = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      domainId,
      model,
      promptStrategy: promptTemplateId || "custom",
      promptTemplate,
      rolloutsPerScenario: rollouts,
      scenarios,
      results,
      aggregateMetrics,
    };

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
