export interface ThinkingConfig {
  enableKwargs: Record<string, any>;
  disableKwargs?: Record<string, any>;
  sendReasoningEffort?: boolean;
  includeReasoningEffortInKwargs?: boolean;
}

export interface NimModelEntry {
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
  thinkingConfig?: ThinkingConfig;
}

// Skip patterns to filter out non-chat models (embedding, safety guards, detectors, and specialized APIs)
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
  /starcoder2/,
  // Non-chat APIs
  /speaker/,
  /detector/,
  /usdcode/,
  /usdvalidate/,
  /bevformer/,
  /sparsedrive/,
  /studiovoice/
];

export function shouldSkipModel(modelId: string): boolean {
  const lowerId = modelId.toLowerCase();
  return SKIP_PATTERNS.some((pattern) => pattern.test(lowerId));
}

export function makeDisplayName(modelId: string, parsedName?: string): string {
  const baseName = parsedName || modelId.split("/")[1] || modelId;

  // Normalize lower-case with hyphens (e.g., "sarvam-m" -> "Sarvam M")
  if (/^[a-z0-9-]+$/.test(baseName)) {
    return baseName
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Remove possible colon prefixes (e.g., "Mistral: Mixtral..." -> "Mixtral...")
  const cleanName = baseName.includes(":") ? baseName.split(":")[1].trim() : baseName;

  return cleanName;
}
