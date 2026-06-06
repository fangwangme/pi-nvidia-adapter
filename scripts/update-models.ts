import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// =============================================================================
// Configurations & URLs
// =============================================================================
const MODELS_DEV_URL = "https://models.dev/api.json";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "../src/generated");
const OUTPUT_FILE = join(OUTPUT_DIR, "models.json");

// =============================================================================
// Interface Definitions
// =============================================================================
interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  reasoning?: boolean;
  release_date?: string;
  last_updated?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

interface ModelsDevProvider {
  id: string;
  models: Record<string, ModelsDevModel>;
}

interface NimModelEntry {
  id: string;
  name: string;
  company: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  contextWindow: number;
  maxTokens: number;
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  compat?: Record<string, any>;
  releaseDate?: string;
  lastUpdated?: string;
}

// Embedded / non-chat models to skip
const SKIP_PATTERNS = [
  /embed/,
  /clip/,
  /streampetr/,
  /vila/,
  /neva-/,
  /retriever/,
  /reward/,
  /safety/,
  /guard/,
  /deplot/,
  /paligemma/,
  /translate/,
  /kosmos-2/,
  /fuyu-8b/,
  /starcoder2/
];

function shouldSkipModel(modelId: string): boolean {
  const lowerId = modelId.toLowerCase();
  return SKIP_PATTERNS.some((pattern) => pattern.test(lowerId));
}

function makeDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  const name = parts[parts.length - 1];
  return name
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Thinking config generator
// =============================================================================
interface ThinkingConfig {
  enableKwargs: Record<string, any>;
  disableKwargs?: Record<string, any>;
  sendReasoningEffort?: boolean;
  includeReasoningEffortInKwargs?: boolean;
}

function getThinkingConfig(modelId: string): ThinkingConfig | undefined {
  const id = modelId.toLowerCase();

  if (id.includes("deepseek") && id.includes("v4")) {
    return {
      enableKwargs: { thinking: true },
      disableKwargs: { thinking: false },
      includeReasoningEffortInKwargs: true,
    };
  }

  if (id.includes("deepseek") && (id.includes("v3") || id.includes("r1"))) {
    return {
      enableKwargs: { thinking: true },
      disableKwargs: { thinking: false },
    };
  }

  if (id.includes("glm")) {
    return {
      enableKwargs: { enable_thinking: true, clear_thinking: false },
      disableKwargs: { enable_thinking: false },
    };
  }

  if (id.includes("kimi") || id.includes("moonshot")) {
    return {
      enableKwargs: { thinking: true },
      disableKwargs: { thinking: false },
      sendReasoningEffort: true,
    };
  }

  if (id.includes("qwen") || id.includes("qwq")) {
    return {
      enableKwargs: { enable_thinking: true },
      disableKwargs: { enable_thinking: false },
    };
  }

  if (id.includes("phi")) {
    return {
      enableKwargs: { enable_thinking: true },
      disableKwargs: { enable_thinking: false },
    };
  }

  if (id.includes("nemotron")) {
    return {
      enableKwargs: { thinking: true },
      disableKwargs: { thinking: false },
    };
  }

  if (id.includes("magistral")) {
    return {
      enableKwargs: { enable_thinking: true },
      disableKwargs: { enable_thinking: false },
    };
  }

  return {
    enableKwargs: { enable_thinking: true },
    disableKwargs: { enable_thinking: false },
  };
}

// =============================================================================
// Main Execution
// =============================================================================
async function main() {
  console.log("🚀 Starting NVIDIA adapter configurations sync from models.dev...");

  // 1. Fetch models.dev JSON (public API, no authorization needed)
  console.log("📡 Fetching models database from models.dev...");
  let modelsDevDb: Record<string, ModelsDevProvider> = {};
  try {
    const response = await fetch(MODELS_DEV_URL);
    if (!response.ok) {
      throw new Error(`models.dev response status: ${response.status}`);
    }
    modelsDevDb = await response.json() as Record<string, ModelsDevProvider>;
  } catch (err) {
    console.error("❌ Failed to fetch database from models.dev:", err);
    process.exit(1);
  }

  // Extract nvidia provider metadata
  const nvidiaDevMeta = modelsDevDb["nvidia"]?.models || {};
  const targetModelIds = Object.keys(nvidiaDevMeta);
  console.log(`✓ Fetched models.dev nvidia provider directory containing ${targetModelIds.length} definitions.`);

  // 2. Parse & merge metadata
  const mergedModels: NimModelEntry[] = [];
  const thinkingConfigs: Record<string, ThinkingConfig> = {};

  for (const id of targetModelIds) {
    if (shouldSkipModel(id)) continue;

    const devMeta = nvidiaDevMeta[id];

    // reasoning check
    let reasoning = false;
    if (devMeta && typeof devMeta.reasoning === "boolean") {
      reasoning = devMeta.reasoning;
    } else {
      const lowerId = id.toLowerCase();
      reasoning = lowerId.includes("r1") ||
                  lowerId.includes("reasoning") ||
                  lowerId.includes("thinking") ||
                  lowerId.includes("qwq") ||
                  (lowerId.includes("glm") && !lowerId.includes("glm4.7"));
    }

    // modality check (vision support)
    let isVision = false;
    if (devMeta?.modalities?.input) {
      isVision = devMeta.modalities.input.includes("image");
    } else {
      const lowerId = id.toLowerCase();
      isVision = lowerId.includes("vision") || lowerId.includes("-vl") || lowerId.includes("multimodal");
    }

    // context window & max output tokens
    let contextWindow = 4096;
    if (devMeta?.limit?.context) {
      contextWindow = devMeta.limit.context;
    } else {
      contextWindow = 128000;
      if (id.includes("1m") || id.includes("1024k")) contextWindow = 1048576;
      else if (id.includes("8k")) contextWindow = 8192;
      else if (id.includes("32k")) contextWindow = 32768;
      else if (id.includes("64k")) contextWindow = 65536;
      else if (id.includes("4096") || id.includes("4k")) contextWindow = 4096;
      else if (id.includes("llama3-")) contextWindow = 8192;
    }

    let maxTokens = 4096;
    if (devMeta?.limit?.output) {
      maxTokens = devMeta.limit.output;
    } else {
      maxTokens = Math.min(4096, contextWindow);
      if (contextWindow >= 128000) maxTokens = 16384;
    }

    const compat: Record<string, any> = {
      supportsReasoningEffort: false,
      supportsDeveloperRole: false,
      maxTokensField: "max_tokens",
    };

    if (id.startsWith("mistralai/")) {
      compat.requiresToolResultName = true;
      compat.requiresThinkingAsText = true;
      compat.requiresMistralToolIds = true;
    }

    const entry: NimModelEntry = {
      id,
      name: devMeta?.name || makeDisplayName(id),
      company: id.split("/")[0] || "other",
      reasoning,
      input: isVision ? ["text", "image"] : ["text"],
      contextWindow,
      maxTokens,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      compat,
      releaseDate: devMeta?.release_date,
      lastUpdated: devMeta?.last_updated,
    };

    mergedModels.push(entry);

    if (reasoning) {
      const config = getThinkingConfig(id);
      if (config) {
        thinkingConfigs[id] = config;
      }
    }
  }

  // 3. Group by Company and Rank
  const getCompany = (modelId: string): string => {
    return modelId.split("/")[0] || "other";
  };

  const groups: Record<string, NimModelEntry[]> = {};
  for (const model of mergedModels) {
    const company = getCompany(model.id);
    if (!groups[company]) groups[company] = [];
    groups[company].push(model);
  }

  const getFreshnessDate = (m: NimModelEntry): string => {
    return m.releaseDate || m.lastUpdated || "1970-01-01";
  };

  for (const company of Object.keys(groups)) {
    groups[company].sort((a, b) => {
      const dateA = getFreshnessDate(a);
      const dateB = getFreshnessDate(b);
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.id.localeCompare(b.id);
    });
  }

  const featuredCompanies = ["moonshotai", "z-ai", "deepseek-ai"];
  const otherCompanies = Object.keys(groups)
    .filter((c) => !featuredCompanies.includes(c))
    .sort((a, b) => a.localeCompare(b));

  const finalCompanyOrder = [...featuredCompanies.filter((c) => groups[c]), ...otherCompanies];

  const sortedFinalModels: NimModelEntry[] = [];
  for (const company of finalCompanyOrder) {
    const list = groups[company] || [];
    sortedFinalModels.push(...list);
  }

  const jsonOutput = {
    models: sortedFinalModels,
    thinkingConfigs: thinkingConfigs,
  };

  // 4. Write config JSON directly (overwrite)
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(jsonOutput, null, 2), "utf-8");
  console.log(`\n🎉 Success! Configuration updated and written to: ${OUTPUT_FILE}`);
  console.log(`🔢 Processed ${sortedFinalModels.length} models across ${finalCompanyOrder.length} providers.`);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
