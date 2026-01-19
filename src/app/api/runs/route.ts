import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  listBenchmarkRuns,
  saveBenchmarkRun,
  loadDomainConfig,
  loadExpertFacts,
  loadTestSet,
} from "@/lib/storage";
import { generateScenarios } from "@/lib/generator";
import { generateNarrativeDescription, generateFallbackDescriptionSync } from "@/lib/narrative-generator";
import { renderPrompt } from "@/prompts/engine";
import { callOpenRouterMultiple, type OpenRouterConfig } from "@/lib/openrouter";
import {
  evaluateMultipleRollouts,
  calculateAggregateMetrics,
  calculateScenarioDifficulty,
  detectErrorPattern,
  analyzeErrorPatterns,
  calculateDifficultyMetrics,
} from "@/lib/evaluator";
import type { BenchmarkRun, ScenarioResult } from "@/domains/schema";

export async function GET() {
  const runs = await listBenchmarkRuns();
  return NextResponse.json(runs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      testSetName, // NEW: Use scenarios from an existing test set
      domainId,
      model,
      promptTemplate,
      promptTemplateId,
      scenarioCount = 10,
      generateTwins = true,
      rolloutsPerScenario = 1,
      seed,
      useNarrativeDescriptions = true, // Now defaults to true
      narrativeModel = "openai/gpt-4o-mini",
    } = body;

    // Determine if using test set or generating scenarios
    let actualDomainId = domainId;
    let skeletonScenarios;
    let testSetVersion: string | undefined;

    if (testSetName) {
      // Load scenarios from existing test set
      const testSet = await loadTestSet(testSetName);
      if (!testSet) {
        return NextResponse.json(
          { error: `Test set "${testSetName}" not found` },
          { status: 404 }
        );
      }

      skeletonScenarios = testSet.scenarios;
      actualDomainId = testSet.domainId;
      testSetVersion = testSet.version;

      console.log(`Using test set: ${testSetName} (${testSet.scenarioCount} scenarios)`);
    } else {
      // Generate new scenarios
      if (!domainId) {
        return NextResponse.json(
          { error: "domainId is required when not using a test set" },
          { status: 400 }
        );
      }

      // Get API key for potential narrative generation
      const apiKey = process.env.OPENROUTER_API_KEY;

      // Load domain config
      const domainConfig = await loadDomainConfig(domainId);
      if (!domainConfig) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }

      // Generate scenario skeletons (fast, synchronous)
      skeletonScenarios = generateScenarios(domainConfig, {
        count: scenarioCount,
        generateTwins,
        seed,
      });
    }

    // Validate required fields
    if (!model || !promptTemplate) {
      return NextResponse.json(
        { error: "model and promptTemplate are required" },
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
    const domainConfig = await loadDomainConfig(actualDomainId);
    const expertFacts = await loadExpertFacts(actualDomainId);

    if (!domainConfig || !expertFacts) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Create run ID and start time
    const runId = uuidv4();
    const startedAt = new Date().toISOString();

    // Initialize placeholder results
    const initialResults: ScenarioResult[] = skeletonScenarios.map((scenario) => ({
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

    // Create initial run - either generating narratives or running directly
    const shouldGenerateNarratives = !testSetName && useNarrativeDescriptions;

    const run: BenchmarkRun = {
      id: runId,
      timestamp: startedAt,
      domainId: actualDomainId,
      model,
      promptStrategy: promptTemplateId || "custom",
      promptTemplate,
      rolloutsPerScenario: rollouts,
      status: shouldGenerateNarratives ? "generating_narratives" : "running",
      startedAt,
      testSetName, // NEW: Reference to test set if used
      testSetVersion, // NEW: Version of test set if used
      useNarrativeDescriptions,
      narrativeModel: useNarrativeDescriptions ? narrativeModel : undefined,
      narrativesGenerated: shouldGenerateNarratives ? 0 : undefined,
      narrativesTotal: shouldGenerateNarratives ? skeletonScenarios.length : undefined,
      scenarios: skeletonScenarios,
      results: initialResults,
    };

    // Save initial run state
    await saveBenchmarkRun(run);

    // If using narrative descriptions (and not from test set), generate them in parallel batches
    if (shouldGenerateNarratives) {
      console.log(`Generating ${skeletonScenarios.length} scenarios with LLM-based narratives (parallel)...`);
      
      const NARRATIVE_BATCH_SIZE = 5; // Process 5 narratives in parallel
      
      for (let batchStart = 0; batchStart < skeletonScenarios.length; batchStart += NARRATIVE_BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + NARRATIVE_BATCH_SIZE, skeletonScenarios.length);
        const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);
        
        // Generate narratives for this batch in parallel
        const batchPromises = batchIndices.map(async (i) => {
          const scenario = skeletonScenarios[i];
          const narrativeSeed = (seed || Date.now()) + i * 1000;
          
          try {
            const narrative = await generateNarrativeDescription(
              domainConfig,
              scenario.anchor,
              scenario.appliedDeltas,
              scenario.distractors,
              narrativeSeed,
              { apiKey, model: narrativeModel }
            );
            
            return {
              index: i,
              description: narrative.description,
            };
          } catch (error) {
            console.error(`Failed to generate narrative for scenario ${i}:`, error);
            return {
              index: i,
              description: generateFallbackDescriptionSync(
                domainConfig,
                scenario.anchor,
                scenario.appliedDeltas,
                scenario.distractors
              ),
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update scenarios with generated narratives
        for (const result of batchResults) {
          run.scenarios[result.index] = {
            ...skeletonScenarios[result.index],
            contextDescription: result.description,
          };
        }
        
        // Update progress
        run.narrativesGenerated = batchEnd;
        await saveBenchmarkRun(run);
        
        // Small delay between batches to avoid rate limiting
        if (batchEnd < skeletonScenarios.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Generated ${skeletonScenarios.length} scenarios with narratives`);
      
      // Transition to running status
      run.status = "running";
      await saveBenchmarkRun(run);
    }

    // Run scenarios through the LLM in parallel batches
    const config: OpenRouterConfig = {
      apiKey,
      model,
      temperature: 0.3,
    };

    const SCENARIO_BATCH_SIZE = 3; // Process 3 scenarios in parallel (each may have multiple rollouts)

    for (let batchStart = 0; batchStart < run.scenarios.length; batchStart += SCENARIO_BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + SCENARIO_BATCH_SIZE, run.scenarios.length);
      const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);
      
      // Mark scenarios in this batch as running
      const scenarioStartTimes: Record<number, string> = {};
      for (const i of batchIndices) {
        const scenarioStartedAt = new Date().toISOString();
        scenarioStartTimes[i] = scenarioStartedAt;
        run.results[i] = {
          ...run.results[i],
          status: "running",
          startedAt: scenarioStartedAt,
        };
      }
      await saveBenchmarkRun(run);

      // Run this batch of scenarios in parallel
      const batchPromises = batchIndices.map(async (i) => {
        const scenario = run.scenarios[i];
        const scenarioStartedAt = scenarioStartTimes[i];

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
          
          // Calculate additional metrics
          const difficulty = calculateScenarioDifficulty(scenario, domainConfig);
          const errorPattern = detectErrorPattern(scenario, result, domainConfig);
          
          return {
            index: i,
            result: {
              ...result,
              status: "completed" as const,
              startedAt: scenarioStartedAt,
              completedAt: new Date().toISOString(),
              difficulty,
              errorPattern,
            },
          };
        } catch (error) {
          return {
            index: i,
            result: {
              scenarioId: scenario.id,
              status: "failed" as const,
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
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Update results
      for (const { index, result } of batchResults) {
        run.results[index] = result;
      }

      // Save after each batch completes
      await saveBenchmarkRun(run);

      // Small delay between batches to avoid rate limiting
      if (batchEnd < run.scenarios.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Calculate aggregate metrics and mark run as completed
    const completedResults = run.results.filter(r => r.status === "completed" || r.status === "failed");
    const baseMetrics = calculateAggregateMetrics(run.scenarios, completedResults);
    
    // Calculate difficulty and error pattern summaries
    const difficultyMetrics = calculateDifficultyMetrics(run.scenarios, domainConfig);
    const errorPatternSummary = analyzeErrorPatterns(run.scenarios, completedResults, domainConfig);

    run.status = "completed";
    run.completedAt = new Date().toISOString();
    
    // Merge all metrics - baseMetrics is guaranteed to have required fields
    if (baseMetrics) {
      run.aggregateMetrics = {
        ...baseMetrics,
        avgDifficulty: difficultyMetrics.avgDifficulty,
        difficultyDistribution: difficultyMetrics.distribution,
        errorPatternSummary,
      };
    }

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
