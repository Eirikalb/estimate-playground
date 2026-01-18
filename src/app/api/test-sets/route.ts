import { NextResponse } from "next/server";
import {
  listTestSets,
  loadTestSet,
  saveTestSet,
  loadDomainConfig,
} from "@/lib/storage";
import { generateScenariosWithNarrative, generateScenarios } from "@/lib/generator";
import type { TestSet } from "@/domains/schema";

/**
 * GET /api/test-sets
 * List all test sets (metadata only, without scenarios)
 */
export async function GET() {
  try {
    const testSets = await listTestSets();
    return NextResponse.json(testSets);
  } catch (error) {
    console.error("Error listing test sets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test-sets
 * Create a new test set
 *
 * Body:
 *   - name: Test set name (required)
 *   - description: Description (optional)
 *   - domainId: Domain ID (default: real-estate-yield)
 *   - size: Number of base scenarios (default: 10)
 *   - generateTwins: Generate twin pairs (default: true)
 *   - seed: Random seed (optional)
 *   - useNarrativeDescriptions: Use LLM narratives (default: true)
 *   - narrativeModel: Model for narratives (default: openai/gpt-4o-mini)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      domainId = "real-estate-yield",
      size = 10,
      generateTwins = true,
      seed,
      useNarrativeDescriptions = true,
      narrativeModel = "openai/gpt-4o-mini",
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Check if test set already exists
    const existing = await loadTestSet(name);
    if (existing) {
      return NextResponse.json(
        { error: `Test set "${name}" already exists` },
        { status: 409 }
      );
    }

    // Load domain config
    const domainConfig = await loadDomainConfig(domainId);
    if (!domainConfig) {
      return NextResponse.json(
        { error: `Domain "${domainId}" not found` },
        { status: 404 }
      );
    }

    // Generate scenarios
    let scenarios;
    const actualSeed = seed || Math.floor(Math.random() * 1000000000);

    if (useNarrativeDescriptions) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY not configured" },
          { status: 500 }
        );
      }

      console.log(`Generating ${size} scenarios with LLM narratives...`);
      scenarios = await generateScenariosWithNarrative(domainConfig, {
        count: size,
        generateTwins,
        seed: actualSeed,
        narrativeConfig: { apiKey, model: narrativeModel },
        narrativeModel,
      });
    } else {
      scenarios = generateScenarios(domainConfig, {
        count: size,
        generateTwins,
        seed: actualSeed,
      });
    }

    // Create test set
    const testSet: TestSet = {
      name,
      version: "1.0.0",
      description: description || `Test set with ${scenarios.length} scenarios for ${domainConfig.name}`,
      created: new Date().toISOString(),
      domainId,
      scenarioCount: scenarios.length,
      seed: actualSeed,
      generateTwins,
      useNarrativeDescriptions,
      narrativeModel: useNarrativeDescriptions ? narrativeModel : undefined,
      scenarios,
      changelog: [
        `v1.0.0 (${new Date().toISOString().split('T')[0]}): Initial version`,
      ],
    };

    // Save test set
    await saveTestSet(testSet);

    console.log(`✅ Created test set: ${name} (${scenarios.length} scenarios)`);

    return NextResponse.json(testSet);
  } catch (error) {
    console.error("Error creating test set:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
