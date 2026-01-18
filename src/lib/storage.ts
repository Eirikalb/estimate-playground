import { promises as fs } from "fs";
import path from "path";
import type {
  BenchmarkRun,
  DomainConfig,
  ExpertFacts,
  PromptTemplate,
  TestSet,
} from "@/domains/schema";

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_DIR = path.join(DATA_DIR, "runs");
const TEST_SETS_DIR = path.join(DATA_DIR, "test-sets");
const DOMAINS_DIR = path.join(process.cwd(), "src", "domains");
const TEMPLATES_DIR = path.join(process.cwd(), "src", "prompts", "templates");

/**
 * Ensure directories exist
 */
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(RUNS_DIR, { recursive: true });
  await fs.mkdir(TEST_SETS_DIR, { recursive: true });
}

// ============ Benchmark Runs ============

/**
 * Save a benchmark run to disk
 */
export async function saveBenchmarkRun(run: BenchmarkRun): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(RUNS_DIR, `${run.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(run, null, 2));
}

/**
 * Load a benchmark run by ID
 */
export async function loadBenchmarkRun(id: string): Promise<BenchmarkRun | null> {
  try {
    const filePath = path.join(RUNS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as BenchmarkRun;
  } catch {
    return null;
  }
}

/**
 * List all benchmark runs
 */
export async function listBenchmarkRuns(): Promise<BenchmarkRun[]> {
  await ensureDirectories();
  
  try {
    const files = await fs.readdir(RUNS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    
    const runs: BenchmarkRun[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(RUNS_DIR, file), "utf-8");
        runs.push(JSON.parse(content) as BenchmarkRun);
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by timestamp descending (newest first)
    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return runs;
  } catch {
    return [];
  }
}

/**
 * Delete a benchmark run
 */
export async function deleteBenchmarkRun(id: string): Promise<boolean> {
  try {
    const filePath = path.join(RUNS_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============ Domain Configs ============

/**
 * Load a domain config by ID
 */
export async function loadDomainConfig(id: string): Promise<DomainConfig | null> {
  try {
    const filePath = path.join(DOMAINS_DIR, `${id.replace("real-estate-yield", "real-estate")}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as DomainConfig;
  } catch {
    return null;
  }
}

/**
 * Load expert facts for a domain
 */
export async function loadExpertFacts(domainId: string): Promise<ExpertFacts | null> {
  try {
    const filePath = path.join(DOMAINS_DIR, `${domainId.replace("real-estate-yield", "real-estate")}.facts.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ExpertFacts;
  } catch {
    return null;
  }
}

/**
 * List all available domains
 */
export async function listDomains(): Promise<Array<{ id: string; name: string }>> {
  try {
    const files = await fs.readdir(DOMAINS_DIR);
    const configFiles = files.filter(
      (f) => f.endsWith(".json") && !f.includes(".facts.")
    );
    
    const domains: Array<{ id: string; name: string }> = [];
    for (const file of configFiles) {
      try {
        const content = await fs.readFile(path.join(DOMAINS_DIR, file), "utf-8");
        const config = JSON.parse(content) as DomainConfig;
        domains.push({ id: config.id, name: config.name });
      } catch {
        // Skip invalid files
      }
    }
    
    return domains;
  } catch {
    return [];
  }
}

// ============ Prompt Templates ============

/**
 * Load a prompt template by name
 */
export async function loadPromptTemplate(name: string): Promise<string | null> {
  try {
    const filePath = path.join(TEMPLATES_DIR, `${name}.mustache`);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * List all available prompt templates
 */
export async function listPromptTemplates(): Promise<PromptTemplate[]> {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const templateFiles = files.filter((f) => f.endsWith(".mustache"));
    
    const templates: PromptTemplate[] = [];
    for (const file of templateFiles) {
      const name = file.replace(".mustache", "");
      const content = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf-8");
      
      templates.push({
        id: name,
        name: formatTemplateName(name),
        description: getTemplateDescription(name),
        template: content,
      });
    }
    
    return templates;
  } catch {
    return [];
  }
}

/**
 * Save a custom prompt template
 */
export async function savePromptTemplate(
  name: string,
  template: string
): Promise<void> {
  const filePath = path.join(TEMPLATES_DIR, `${name}.mustache`);
  await fs.writeFile(filePath, template);
}

// ============ Helpers ============

function formatTemplateName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getTemplateDescription(name: string): string {
  const descriptions: Record<string, string> = {
    persona: "Full expert persona with all facts and methodology",
    "chain-of-thought": "Structured step-by-step reasoning approach",
    "few-shot": "Learning from examples approach",
    minimal: "Bare minimum context, baseline test",
    "benchmark-only": "Only benchmark ranges, no additional guidance",
  };
  return descriptions[name] ?? "Custom template";
}

// ============ Test Sets ============

/**
 * Save a test set to disk
 */
export async function saveTestSet(testSet: TestSet): Promise<void> {
  await ensureDirectories();
  const filePath = path.join(TEST_SETS_DIR, `${testSet.name}.json`);
  await fs.writeFile(filePath, JSON.stringify(testSet, null, 2));
}

/**
 * Load a test set by name
 */
export async function loadTestSet(name: string): Promise<TestSet | null> {
  try {
    const filePath = path.join(TEST_SETS_DIR, `${name}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as TestSet;
  } catch {
    return null;
  }
}

/**
 * List all test sets (metadata only, without full scenarios)
 */
export async function listTestSets(): Promise<Array<Omit<TestSet, 'scenarios'>>> {
  await ensureDirectories();

  try {
    const files = await fs.readdir(TEST_SETS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const testSets: Array<Omit<TestSet, 'scenarios'>> = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(TEST_SETS_DIR, file), "utf-8");
        const testSet = JSON.parse(content) as TestSet;
        // Omit scenarios to reduce payload size for listing
        const { scenarios, ...metadata } = testSet;
        testSets.push(metadata);
      } catch {
        // Skip invalid files
      }
    }

    // Sort by created date descending (newest first)
    testSets.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return testSets;
  } catch {
    return [];
  }
}

/**
 * Delete a test set
 */
export async function deleteTestSet(name: string): Promise<boolean> {
  try {
    const filePath = path.join(TEST_SETS_DIR, `${name}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

