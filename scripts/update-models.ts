import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { shouldSkipModel, makeDisplayName, type NimModelEntry, type ThinkingConfig } from "../src/shared";
import { GENERATED_MODELS_FILE, LOCAL_DATA_DIR, listBackups } from "./utils";

// =============================================================================
// Configurations & URLs
// =============================================================================
const MODELS_DEV_URL = "https://models.dev/api.json";
const OUTPUT_FILE = GENERATED_MODELS_FILE;
const OUTPUT_DIR = dirname(OUTPUT_FILE);

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

// =============================================================================
// Thinking config generator
// =============================================================================

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

// Diff baseline: the highest-version backup saved by `bun run backup-models`.
// Backups are written after the version bump, so the latest one always holds
// the dataset shipped with the latest release.
function getLatestBackupModels(): NimModelEntry[] | null {
  const backups = listBackups();
  if (backups.length === 0) return null;
  const latest = backups[backups.length - 1];
  try {
    console.log(`Comparing changes against latest backup (v${latest.version})...`);
    const content = readFileSync(join(LOCAL_DATA_DIR, latest.file), "utf-8");
    return JSON.parse(content) as NimModelEntry[];
  } catch (e) {
    console.warn("Could not read or parse latest backup models file:", e);
    return null;
  }
}

// =============================================================================
// Main Execution
// =============================================================================
async function main() {
  console.log("Starting NVIDIA adapter configurations sync from models.dev...");

  // 1. Fetch models.dev JSON (public API, no authorization needed)
  console.log("Fetching models database from models.dev...");
  let modelsDevDb: Record<string, ModelsDevProvider> = {};
  try {
    const response = await fetch(MODELS_DEV_URL);
    if (!response.ok) {
      throw new Error(`models.dev response status: ${response.status}`);
    }
    modelsDevDb = await response.json() as Record<string, ModelsDevProvider>;
  } catch (err) {
    console.error("Failed to fetch database from models.dev:", err);
    process.exit(1);
  }

  // Extract nvidia provider metadata
  const nvidiaDevMeta = modelsDevDb["nvidia"]?.models || {};
  const targetModelIds = Object.keys(nvidiaDevMeta);
  console.log(`Fetched models.dev nvidia provider directory containing ${targetModelIds.length} definitions.`);

  // 2. Parse & merge metadata
  const mergedModels: NimModelEntry[] = [];

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
      name: makeDisplayName(id, devMeta?.name),
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

    if (reasoning) {
      const config = getThinkingConfig(id);
      if (config) {
        entry.thinkingConfig = config;
      }
    }

    mergedModels.push(entry);
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

  // Compute diff against the latest version backup, falling back to the
  // existing src/generated/models.json when no backup exists yet
  let oldModels: NimModelEntry[] = [];
  const backupModels = getLatestBackupModels();
  if (backupModels) {
    oldModels = backupModels;
  } else if (existsSync(OUTPUT_FILE)) {
    try {
      const oldData = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
      if (Array.isArray(oldData)) {
        oldModels = oldData;
      } else if (oldData && Array.isArray(oldData.models)) {
        oldModels = oldData.models;
      }
      console.log("Comparing changes against current generated/models.json...");
    } catch (e) {
      console.warn("Could not read or parse existing models.json. Skipping diff calculation.");
    }
  }

  const oldById = new Map(oldModels.map(o => [o.id, o]));
  const newById = new Map(sortedFinalModels.map(n => [n.id, n]));
  const added = sortedFinalModels.filter(n => !oldById.has(n.id));
  const removed = oldModels.filter(o => !newById.has(o.id));
  const changed: { id: string; name: string; changes: string[] }[] = [];

  for (const newM of sortedFinalModels) {
    const oldM = oldById.get(newM.id);
    if (!oldM) continue;

    const changes: string[] = [];
    if (oldM.name !== newM.name) {
      changes.push(`name: "${oldM.name}" -> "${newM.name}"`);
    }
    if (oldM.contextWindow !== newM.contextWindow) {
      changes.push(`contextWindow: ${oldM.contextWindow} -> ${newM.contextWindow}`);
    }
    if (oldM.maxTokens !== newM.maxTokens) {
      changes.push(`maxTokens: ${oldM.maxTokens} -> ${newM.maxTokens}`);
    }
    if (oldM.reasoning !== newM.reasoning) {
      changes.push(`reasoning: ${oldM.reasoning} -> ${newM.reasoning}`);
    }
    if (JSON.stringify(oldM.input) !== JSON.stringify(newM.input)) {
      changes.push(`input: [${oldM.input.join(", ")}] -> [${newM.input.join(", ")}]`);
    }
    if (JSON.stringify(oldM.thinkingConfig) !== JSON.stringify(newM.thinkingConfig)) {
      changes.push(`thinkingConfig: changed`);
    }
    if (oldM.releaseDate !== newM.releaseDate) {
      changes.push(`releaseDate: "${oldM.releaseDate}" -> "${newM.releaseDate}"`);
    }
    if (oldM.lastUpdated !== newM.lastUpdated) {
      changes.push(`lastUpdated: "${oldM.lastUpdated}" -> "${newM.lastUpdated}"`);
    }
    if (changes.length > 0) {
      changed.push({ id: newM.id, name: newM.name, changes });
    }
  }

  if (added.length > 0 || removed.length > 0 || changed.length > 0) {
    console.log("\nModel directory changes detected:");
    if (added.length > 0) {
      console.log(`  Added ${added.length} models:`);
      for (const m of added) {
        console.log(`    - \`${m.id}\` (${m.name})`);
      }
    }
    if (changed.length > 0) {
      console.log(`  Updated ${changed.length} models:`);
      for (const c of changed) {
        console.log(`    - \`${c.id}\` (${c.name}): ${c.changes.join(", ")}`);
      }
    }
    if (removed.length > 0) {
      console.log(`  Removed ${removed.length} models:`);
      for (const m of removed) {
        console.log(`    - \`${m.id}\` (${m.name})`);
      }
    }
  } else {
    console.log("\nNo model metadata changes detected.");
  }

  // 4. Write config JSON directly (overwrite)
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(sortedFinalModels, null, 2), "utf-8");
  console.log(`\nSuccess! Configuration updated and written to: ${OUTPUT_FILE}`);
  console.log(`Processed ${sortedFinalModels.length} models across ${finalCompanyOrder.length} providers.`);
  console.log("Next: update CHANGELOG.md, bump the version in package.json, then run `bun run backup-models`.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
